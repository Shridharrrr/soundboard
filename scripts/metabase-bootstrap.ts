import { config } from '../apps/server/src/config.js';
import fs from 'fs';
import path from 'path';

async function bootstrapMetabase() {
  if (!config.METABASE_URL) {
    console.log('[Metabase Bootstrap] METABASE_URL is not set. Skipping bootstrap.');
    return;
  }

  const baseUrl = config.METABASE_URL.replace(/\/$/, '');
  console.log(`[Metabase Bootstrap] Connecting to Metabase at ${baseUrl}...`);

  // 1. Check setup status
  let sessionToken = '';
  try {
    const statusRes = await fetch(`${baseUrl}/api/session/properties`);
    const statusData = (await statusRes.json()) as any;

    if (statusData['has-user-setup'] === false) {
      console.log('[Metabase Bootstrap] Metabase is fresh. Initializing admin user...');
      const setupTokenRes = await fetch(`${baseUrl}/api/session/properties`);
      const setupTokenData = (await setupTokenRes.json()) as any;
      const setupToken = setupTokenData['setup-token'];

      const initRes = await fetch(`${baseUrl}/api/setup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: setupToken,
          user: {
            first_name: 'Admin',
            last_name: 'User',
            email: config.METABASE_USER,
            password: config.METABASE_PASSWORD,
          },
          prefs: {
            site_name: 'Voice Dashboards Metabase',
            allow_tracking: false,
          },
        }),
      });

      if (!initRes.ok) {
        throw new Error(`Failed initial setup: ${await initRes.text()}`);
      }

      const initData = (await initRes.json()) as { id: string };
      sessionToken = initData.id;
    } else {
      console.log('[Metabase Bootstrap] Logging into Metabase...');
      const loginRes = await fetch(`${baseUrl}/api/session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: config.METABASE_USER,
          password: config.METABASE_PASSWORD,
        }),
      });

      if (!loginRes.ok) {
        throw new Error(`Login failed: ${await loginRes.text()}`);
      }

      const loginData = (await loginRes.json()) as { id: string };
      sessionToken = loginData.id;
    }

    // 2. Check if Analytics database is already connected
    const dbsRes = await fetch(`${baseUrl}/api/database`, {
      headers: { 'X-Metabase-Session': sessionToken },
    });
    const dbs = (await dbsRes.json()) as Array<{ id: number; name: string }>;
    let analyticsDb = dbs.find(d => d.name === 'Analytics');

    if (!analyticsDb) {
      console.log('[Metabase Bootstrap] Adding PostgreSQL Analytics database...');
      const addDbRes = await fetch(`${baseUrl}/api/database`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Metabase-Session': sessionToken,
        },
        body: JSON.stringify({
          name: 'Analytics',
          engine: 'postgres',
          details: {
            host: 'postgres',
            port: 5432,
            db: 'analytics',
            user: 'postgres',
            password: 'postgres',
            ssl: false,
          },
        }),
      });

      if (!addDbRes.ok) {
        throw new Error(`Failed to add database: ${await addDbRes.text()}`);
      }

      analyticsDb = (await addDbRes.json()) as { id: number; name: string };
    }

    console.log(`[Metabase Bootstrap] Metabase database ID: ${analyticsDb.id}`);

    // Update .env with METABASE_DB_ID
    const envPath = path.resolve(process.cwd(), '.env');
    if (fs.existsSync(envPath)) {
      let envContent = fs.readFileSync(envPath, 'utf8');
      if (envContent.includes('METABASE_DB_ID=')) {
        envContent = envContent.replace(/METABASE_DB_ID=.*/, `METABASE_DB_ID=${analyticsDb.id}`);
      } else {
        envContent += `\nMETABASE_DB_ID=${analyticsDb.id}\n`;
      }
      fs.writeFileSync(envPath, envContent);
      console.log('[Metabase Bootstrap] Updated .env with METABASE_DB_ID.');
    }
  } catch (err) {
    console.error('[Metabase Bootstrap Error]', err);
  }
}

bootstrapMetabase();
