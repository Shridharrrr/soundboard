import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildApp } from './index.js';
import type { FastifyInstance } from 'fastify';
import type { QueryResultSuccess, QueryResultError } from '@vd/shared';

describe('Phase 4: Server API Routes & Query Pipeline', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /api/health returns ok: true', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/health',
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ ok: true });
  });

  it('GET /api/schema returns complete metadata, tools, and prompts', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/schema',
    });
    expect(res.statusCode).toBe(200);
    const json = res.json();
    expect(json.as_of).toBe('2026-09-29');
    expect(json.metrics).toHaveProperty('revenue');
    expect(json.dimensions).toHaveProperty('region');
    expect(json.tools.length).toBeGreaterThanOrEqual(9);
    expect(json.system_prompt).toContain('You are a voice analytics assistant');
    expect(json.greeting).toContain('Ask me for any chart');
  });

  it('POST /api/query: revenue by region, Q3 2026, compare to previous_year -> Southeast delta between +10% and +14%', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/query',
      payload: {
        metric: 'revenue',
        group_by: 'region',
        time_range: { quarter: 3, year: 2026 },
        compare_to: 'previous_year',
        filters: [],
      },
    });

    expect(res.statusCode).toBe(200);
    const result = res.json() as QueryResultSuccess;
    expect(result.ok).toBe(true);
    expect(result.columns).toContain('grp');
    expect(result.columns).toContain('value');
    expect(result.columns).toContain('comparison_value');

    // Find Southeast row
    const seRow = result.rows.find(r => r.grp === 'Southeast');
    expect(seRow).toBeDefined();
    expect(seRow?.value).toBeDefined();
    expect(seRow?.comparison_value).toBeDefined();

    const val = Number(seRow!.value);
    const compVal = Number(seRow!.comparison_value);
    const deltaPct = ((val - compVal) / compVal) * 100;

    expect(deltaPct).toBeGreaterThanOrEqual(10.0);
    expect(deltaPct).toBeLessThanOrEqual(14.0);
  });

  it('POST /api/query: rejects unsupported combination (group_by + granularity + comparison)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/query',
      payload: {
        metric: 'revenue',
        group_by: 'region',
        time_granularity: 'month',
        compare_to: 'previous_year',
        time_range: { preset: 'this_year' },
      },
    });

    expect(res.statusCode).toBe(200);
    const result = res.json() as QueryResultError;
    expect(result.ok).toBe(false);
    expect(result.error_code).toBe('unsupported_combination');
  });

  it('POST /api/query: rejects unknown metric', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/query',
      payload: {
        metric: 'churn_rate',
        time_range: { preset: 'this_year' },
      },
    });

    expect(res.statusCode).toBe(200);
    const result = res.json() as QueryResultError;
    expect(result.ok).toBe(false);
    expect(result.error_code).toBe('unknown_metric');
    expect(result.available).toContain('revenue');
  });

  it('POST /api/query: returns ambiguous_value for ambiguous filter', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/query',
      payload: {
        metric: 'revenue',
        filters: [{ dimension: 'region', values: ['south'] }],
        time_range: { preset: 'this_year' },
      },
    });

    expect(res.statusCode).toBe(200);
    const result = res.json() as QueryResultError;
    expect(result.ok).toBe(false);
    expect(result.error_code).toBe('ambiguous_value');
    expect(result.candidates).toContain('Southeast');
    expect(result.candidates).toContain('Southwest');
  });
});
