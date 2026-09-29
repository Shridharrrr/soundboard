import Fastify from 'fastify';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import fastifyStatic from '@fastify/static';
import path from 'path';
import fs from 'fs';
import { config } from './config.js';
import { schemaRoutes } from './routes/schema.js';
import { queryRoutes } from './routes/query.js';
import { tokenRoutes } from './routes/token.js';
import { exportRoutes } from './routes/export.js';
import { getDbClient, initDbSchema } from './db.js';

export async function buildApp() {
  const fastify = Fastify({
    logger: {
      level: config.NODE_ENV === 'test' ? 'silent' : 'info',
    },
  });

  await fastify.register(cors, {
    origin: true, // Allow all in dev, production handles reverse proxy
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  });

  await fastify.register(rateLimit, {
    global: false, // Per-route rate limiting
  });

  // Health check
  fastify.get('/api/health', async () => ({ ok: true }));

  // API Routes
  await fastify.register(schemaRoutes);
  await fastify.register(queryRoutes);
  await fastify.register(tokenRoutes);
  await fastify.register(exportRoutes);

  // Serve static web build if present
  const staticPaths = [
    path.resolve(process.cwd(), 'apps/web/dist'),
    path.resolve(process.cwd(), '../web/dist'),
    path.resolve(process.cwd(), 'dist/web'),
  ];
  const staticPath = staticPaths.find(p => fs.existsSync(p));

  if (staticPath) {
    await fastify.register(fastifyStatic, {
      root: staticPath,
      wildcard: false,
    });

    fastify.setNotFoundHandler(async (request, reply) => {
      if (request.raw.url && request.raw.url.startsWith('/api')) {
        return reply.status(404).send({ ok: false, error: 'Endpoint not found' });
      }
      return reply.sendFile('index.html');
    });
  }

  return fastify;
}

async function start() {
  try {
    const app = await buildApp();
    const dbClient = await getDbClient();
    await initDbSchema(dbClient);

    await app.listen({ port: config.PORT, host: '0.0.0.0' });
    console.log(`\x1b[32m[Server] Running on http://localhost:${config.PORT}\x1b[0m`);
  } catch (err) {
    console.error('[Server Error]', err);
    process.exit(1);
  }
}

if (process.argv[1]?.endsWith('index.ts') || process.argv[1]?.endsWith('index.js')) {
  start();
}
