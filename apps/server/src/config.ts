import { z } from 'zod';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Look for .env in current dir, or repo root
const envPaths = [
  path.resolve(process.cwd(), '.env'),
  path.resolve(process.cwd(), '../../.env'),
];

for (const p of envPaths) {
  if (fs.existsSync(p)) {
    dotenv.config({ path: p });
    break;
  }
}

const envSchema = z.object({
  ASSEMBLYAI_API_KEY: z.string().default(''),
  DATABASE_URL: z.string().default('postgres://postgres:postgres@localhost:5432/analytics'),
  DATABASE_URL_RO: z.string().default('postgres://voice_ro:voice_ro@localhost:5432/analytics'),
  AS_OF_DATE: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD').default('2026-09-29'),
  PORT: z.coerce.number().default(3001),
  METABASE_URL: z.string().optional().default(''),
  METABASE_USER: z.string().email().optional().default('admin@example.com'),
  METABASE_PASSWORD: z.string().optional().default('ChangeMe-12345'),
  METABASE_DB_ID: z.string().optional().default(''),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
});

export type Config = z.infer<typeof envSchema>;

let parsedConfig: Config;

try {
  parsedConfig = envSchema.parse(process.env);
} catch (error) {
  if (error instanceof z.ZodError) {
    const details = error.errors.map(e => `  - ${e.path.join('.')}: ${e.message}`).join('\n');
    console.error(`\x1b[31m[Config Error] Invalid environment configuration:\n${details}\x1b[0m`);
  }
  throw error;
}

export const config = parsedConfig;
