import pg, { type QueryResultRow } from 'pg';
import { PGlite } from '@electric-sql/pglite';
import { config } from './config.js';
import fs from 'fs';
import path from 'path';

const { Pool } = pg;

export interface DBClient {
  query<T extends QueryResultRow = QueryResultRow>(text: string, params?: unknown[]): Promise<{ rows: T[] }>;
  close(): Promise<void>;
}

let activeClient: DBClient | null = null;
let isPGliteActive = false;

export function isUsingPGlite(): boolean {
  return isPGliteActive;
}

/**
 * Creates or returns the database client.
 * Attempts PostgreSQL connection first; if unreachable (e.g. Docker not started),
 * seamlessly uses PGlite with on-disk persistence at `.pglite_data`.
 */
export async function getDbClient(admin = false): Promise<DBClient> {
  if (activeClient) {
    return activeClient;
  }

  const url = admin ? config.DATABASE_URL : config.DATABASE_URL_RO;
  const pool = new Pool({
    connectionString: url,
    statement_timeout: 5000,
    connectionTimeoutMillis: 1500,
  });

  try {
    const client = await pool.connect();
    client.release();
    activeClient = {
      async query<T extends QueryResultRow = any>(text: string, params?: unknown[]) {
        return pool.query<T>(text, params);
      },
      async close() {
        await pool.end();
        activeClient = null;
      },
    };
    isPGliteActive = false;
    return activeClient;
  } catch (_err) {
    console.warn(`[DB] Could not connect to Postgres at ${url}. Falling back to embedded PGlite.`);
    await pool.end().catch(() => {});

    const pglitePath = path.resolve(process.cwd(), '.pglite_data');
    const pglite = new PGlite(pglitePath);
    await pglite.waitReady;

    activeClient = {
      async query<T extends QueryResultRow = any>(text: string, params?: unknown[]) {
        const res = await pglite.query<T>(text, params);
        return { rows: res.rows };
      },
      async close() {
        await pglite.close();
        activeClient = null;
      },
    };
    isPGliteActive = true;
    return activeClient;
  }
}

/**
 * Initializes database schema using db/init.sql if not initialized
 */
export async function initDbSchema(client: DBClient): Promise<void> {
  const statements = [
    'CREATE SCHEMA IF NOT EXISTS analytics',
    `CREATE TABLE IF NOT EXISTS analytics.orders_raw (
      order_id bigint PRIMARY KEY,
      order_date date NOT NULL,
      customer_id int NOT NULL,
      region text NOT NULL,
      category text NOT NULL,
      channel text NOT NULL,
      units int NOT NULL,
      amount numeric(12,2) NOT NULL
    )`,
    'CREATE INDEX IF NOT EXISTS idx_orders_order_date ON analytics.orders_raw (order_date)',
    'CREATE OR REPLACE VIEW analytics.fact_orders AS SELECT * FROM analytics.orders_raw',
  ];

  for (const stmt of statements) {
    try {
      await client.query(stmt);
    } catch (e) {
      console.error('[DB Init Error]', e);
    }
  }
}
