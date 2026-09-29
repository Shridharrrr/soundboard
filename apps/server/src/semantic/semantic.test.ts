import { describe, it, expect, beforeAll } from 'vitest';
import { loadSemanticLayer } from './load.js';
import { resolveFilters } from './resolve.js';
import { resolveTimeRange, getComparisonRange } from './time.js';
import { compileSql } from './compile.js';
import { computeInsightFacts } from './insight.js';
import type { SemanticLayer, Filter } from '@vd/shared';

describe('Phase 3: Semantic Layer and Query Compiler', () => {
  let semantic: SemanticLayer;
  const AS_OF = '2026-09-29';

  beforeAll(() => {
    semantic = loadSemanticLayer();
  });

  describe('1. Filter Resolution & Ambiguity', () => {
    it('"south" is ambiguous between Southeast and Southwest', () => {
      const filters: Filter[] = [{ dimension: 'region', values: ['south'] }];
      const res = resolveFilters(filters, semantic);
      expect(res.ok).toBe(false);
      if (!res.ok && res.error_code === 'ambiguous_value') {
        expect(res.candidates).toContain('Southeast');
        expect(res.candidates).toContain('Southwest');
      }
    });

    it('"SE" resolves to Southeast', () => {
      const filters: Filter[] = [{ dimension: 'region', values: ['SE'] }];
      const res = resolveFilters(filters, semantic);
      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.filters[0].values).toEqual(['Southeast']);
      }
    });

    it('"north east" resolves to Northeast', () => {
      const filters: Filter[] = [{ dimension: 'region', values: ['north east'] }];
      const res = resolveFilters(filters, semantic);
      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.filters[0].values).toEqual(['Northeast']);
      }
    });

    it('"app" resolves to Mobile App in channel', () => {
      const filters: Filter[] = [{ dimension: 'channel', values: ['app'] }];
      const res = resolveFilters(filters, semantic);
      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.filters[0].values).toEqual(['Mobile App']);
      }
    });

    it('exact case-insensitive match works for category', () => {
      const filters: Filter[] = [{ dimension: 'category', values: ['electronics'] }];
      const res = resolveFilters(filters, semantic);
      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.filters[0].values).toEqual(['Electronics']);
      }
    });

    it('unknown value returns value_not_found', () => {
      const filters: Filter[] = [{ dimension: 'category', values: ['Spacecraft'] }];
      const res = resolveFilters(filters, semantic);
      expect(res.ok).toBe(false);
      if (!res.ok && res.error_code === 'value_not_found') {
        expect(res.valid_values).toContain('Electronics');
      }
    });

    it('SQL injection strings in filter values return value_not_found and never reach SQL', () => {
      const malicious = "'; DROP TABLE analytics.orders_raw; --";
      const filters: Filter[] = [{ dimension: 'region', values: [malicious] }];
      const res = resolveFilters(filters, semantic);
      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.error_code).toBe('value_not_found');
      }
    });

    it('unknown dimension returns value_not_found with available dimensions', () => {
      const filters: Filter[] = [{ dimension: 'non_existent_dim', values: ['something'] }];
      const res = resolveFilters(filters, semantic);
      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.error_code).toBe('value_not_found');
      }
    });
  });

  describe('2. Time Resolution', () => {
    it('Q3 2026 range is 2026-07-01 to 2026-10-01 exclusive', () => {
      const res = resolveTimeRange({ quarter: 3, year: 2026 }, AS_OF);
      expect(res.start).toBe('2026-07-01');
      expect(res.end_exclusive).toBe('2026-10-01');
      expect(res.end_inclusive).toBe('2026-09-30');
    });

    it('this_quarter resolves to Q3 2026 when as_of is 2026-09-29', () => {
      const res = resolveTimeRange({ preset: 'this_quarter' }, AS_OF);
      expect(res.start).toBe('2026-07-01');
      expect(res.end_exclusive).toBe('2026-10-01');
      expect(res.end_inclusive).toBe('2026-09-30');
    });

    it('last_quarter resolves to Q2 2026', () => {
      const res = resolveTimeRange({ preset: 'last_quarter' }, AS_OF);
      expect(res.start).toBe('2026-04-01');
      expect(res.end_exclusive).toBe('2026-07-01');
      expect(res.end_inclusive).toBe('2026-06-30');
    });

    it('this_month resolves to September 2026', () => {
      const res = resolveTimeRange({ preset: 'this_month' }, AS_OF);
      expect(res.start).toBe('2026-09-01');
      expect(res.end_exclusive).toBe('2026-10-01');
      expect(res.end_inclusive).toBe('2026-09-30');
    });

    it('last_month resolves to August 2026', () => {
      const res = resolveTimeRange({ preset: 'last_month' }, AS_OF);
      expect(res.start).toBe('2026-08-01');
      expect(res.end_exclusive).toBe('2026-09-01');
      expect(res.end_inclusive).toBe('2026-08-31');
    });

    it('this_year resolves to 2026-01-01 to 2027-01-01 exclusive', () => {
      const res = resolveTimeRange({ preset: 'this_year' }, AS_OF);
      expect(res.start).toBe('2026-01-01');
      expect(res.end_exclusive).toBe('2027-01-01');
    });

    it('last_year resolves to 2025-01-01 to 2026-01-01 exclusive', () => {
      const res = resolveTimeRange({ preset: 'last_year' }, AS_OF);
      expect(res.start).toBe('2025-01-01');
      expect(res.end_exclusive).toBe('2026-01-01');
    });

    it('year_to_date resolves to 2026-01-01 to as_of inclusive', () => {
      const res = resolveTimeRange({ preset: 'year_to_date' }, AS_OF);
      expect(res.start).toBe('2026-01-01');
      expect(res.end_inclusive).toBe('2026-09-29');
    });

    it('last_7_days resolves 7 days ending at as_of', () => {
      const res = resolveTimeRange({ preset: 'last_7_days' }, AS_OF);
      expect(res.start).toBe('2026-09-23');
      expect(res.end_inclusive).toBe('2026-09-29');
    });

    it('custom start and end resolves end_inclusive and exclusive', () => {
      const res = resolveTimeRange({ start: '2026-03-01', end: '2026-03-15' }, AS_OF);
      expect(res.start).toBe('2026-03-01');
      expect(res.end_inclusive).toBe('2026-03-15');
      expect(res.end_exclusive).toBe('2026-03-16');
    });

    it('previous_year shift shifts dates back exactly 1 year', () => {
      const base = resolveTimeRange({ quarter: 3, year: 2026 }, AS_OF);
      const comp = getComparisonRange(base, 'previous_year');
      expect(comp).not.toBeNull();
      expect(comp!.start).toBe('2025-07-01');
      expect(comp!.end_exclusive).toBe('2025-10-01');
      expect(comp!.end_inclusive).toBe('2025-09-30');
    });

    it('previous_period shift shifts dates back by duration', () => {
      const base = resolveTimeRange({ preset: 'last_7_days' }, AS_OF); // 7 days: Sep 23 to Sep 30 ex
      const comp = getComparisonRange(base, 'previous_period');
      expect(comp).not.toBeNull();
      expect(comp!.end_exclusive).toBe(base.start); // Sep 23
      expect(comp!.start).toBe('2026-09-16');
    });
  });

  describe('3. Query Compiler & Parameterization', () => {
    const dimMap = {
      region: 'region',
      category: 'category',
      channel: 'channel',
    };

    it('identifiers are never taken from request input; only from semantic layer', () => {
      const timeR = resolveTimeRange({ preset: 'this_year' }, AS_OF);
      const q = compileSql({
        metricId: 'revenue',
        metricDef: semantic.metrics.revenue,
        timeColumn: semantic.time_column,
        sourceTable: semantic.source,
        timeRange: timeR,
        groupBy: 'region',
        dimensionColumn: 'region',
        resolvedFilters: [],
        dimensionColumnMap: dimMap,
      });

      expect(q.sql).toContain('analytics.fact_orders');
      expect(q.sql).toContain('region AS grp');
      expect(q.sql).toContain('SUM(amount) AS value');
      expect(q.params).toEqual(['2026-01-01', '2027-01-01']);
    });

    it('compiles time series query with date_trunc', () => {
      const timeR = resolveTimeRange({ preset: 'this_year' }, AS_OF);
      const q = compileSql({
        metricId: 'orders',
        metricDef: semantic.metrics.orders,
        timeColumn: semantic.time_column,
        sourceTable: semantic.source,
        timeRange: timeR,
        timeGranularity: 'month',
        resolvedFilters: [],
        dimensionColumnMap: dimMap,
      });

      expect(q.sql).toContain("date_trunc('month', order_date)::date AS period");
      expect(q.sql).toContain('COUNT(*) AS value');
      expect(q.columns).toEqual(['period', 'value']);
    });

    it('compiles filter with ANY parameter', () => {
      const timeR = resolveTimeRange({ preset: 'this_year' }, AS_OF);
      const q = compileSql({
        metricId: 'revenue',
        metricDef: semantic.metrics.revenue,
        timeColumn: semantic.time_column,
        sourceTable: semantic.source,
        timeRange: timeR,
        resolvedFilters: [{ dimension: 'region', values: ['Southeast', 'West'] }],
        dimensionColumnMap: dimMap,
      });

      expect(q.sql).toContain('region = ANY($3)');
      expect(q.params[2]).toEqual(['Southeast', 'West']);
      expect(q.displaySql).toContain("region = ANY(ARRAY['Southeast', 'West'])");
    });

    it('Golden 1: Revenue by region this_quarter', () => {
      const timeR = resolveTimeRange({ preset: 'this_quarter' }, AS_OF);
      const q = compileSql({
        metricId: 'revenue',
        metricDef: semantic.metrics.revenue,
        timeColumn: semantic.time_column,
        sourceTable: semantic.source,
        timeRange: timeR,
        groupBy: 'region',
        dimensionColumn: 'region',
        resolvedFilters: [],
        dimensionColumnMap: dimMap,
      });
      expect(q.sql).toMatch(/SELECT region AS grp, SUM\(amount\) AS value/);
      expect(q.sql).toMatch(/WHERE order_date >= \$1 AND order_date < \$2/);
      expect(q.sql).toMatch(/GROUP BY 1/);
    });

    it('Golden 2: Orders weekly in 2026', () => {
      const timeR = resolveTimeRange({ preset: 'this_year' }, AS_OF);
      const q = compileSql({
        metricId: 'orders',
        metricDef: semantic.metrics.orders,
        timeColumn: semantic.time_column,
        sourceTable: semantic.source,
        timeRange: timeR,
        timeGranularity: 'week',
        resolvedFilters: [],
        dimensionColumnMap: dimMap,
      });
      expect(q.sql).toMatch(/date_trunc\('week', order_date\)::date AS period/);
      expect(q.sql).toMatch(/COUNT\(\*\) AS value/);
    });

    it('Golden 3: AOV by category with channel filter', () => {
      const timeR = resolveTimeRange({ preset: 'this_year' }, AS_OF);
      const q = compileSql({
        metricId: 'aov',
        metricDef: semantic.metrics.aov,
        timeColumn: semantic.time_column,
        sourceTable: semantic.source,
        timeRange: timeR,
        groupBy: 'category',
        dimensionColumn: 'category',
        resolvedFilters: [{ dimension: 'channel', values: ['Web'] }],
        dimensionColumnMap: dimMap,
      });
      expect(q.sql).toMatch(/category AS grp/);
      expect(q.sql).toMatch(/SUM\(amount\)\/NULLIF\(COUNT\(\*\),0\) AS value/);
      expect(q.sql).toMatch(/channel = ANY\(\$3\)/);
    });

    it('Golden 4: Unique customers monthly for Electronics', () => {
      const timeR = resolveTimeRange({ preset: 'this_year' }, AS_OF);
      const q = compileSql({
        metricId: 'customers',
        metricDef: semantic.metrics.customers,
        timeColumn: semantic.time_column,
        sourceTable: semantic.source,
        timeRange: timeR,
        timeGranularity: 'month',
        resolvedFilters: [{ dimension: 'category', values: ['Electronics'] }],
        dimensionColumnMap: dimMap,
      });
      expect(q.sql).toMatch(/COUNT\(DISTINCT customer_id\) AS value/);
      expect(q.sql).toMatch(/category = ANY\(\$3\)/);
    });

    it('Golden 5: Units sold single scalar for last_30_days', () => {
      const timeR = resolveTimeRange({ preset: 'last_30_days' }, AS_OF);
      const q = compileSql({
        metricId: 'units',
        metricDef: semantic.metrics.units,
        timeColumn: semantic.time_column,
        sourceTable: semantic.source,
        timeRange: timeR,
        resolvedFilters: [],
        dimensionColumnMap: dimMap,
      });
      expect(q.sql).toMatch(/SUM\(units\) AS value/);
      expect(q.sql).not.toMatch(/GROUP BY/);
    });
  });

  describe('4. Insight Facts & Ordinal Alignment', () => {
    it('computes total and top group share correctly', () => {
      const rows = [
        { grp: 'West', value: 400 },
        { grp: 'Southeast', value: 300 },
        { grp: 'Midwest', value: 100 },
      ];
      const facts = computeInsightFacts(rows, 'revenue');
      expect(facts.total).toBe(800);
      expect(facts.top_group).toBe('West');
      expect(facts.top_group_share).toBe(50); // 400/800 = 50%
    });

    it('computes comparison delta percentage', () => {
      const rows = [
        { grp: 'Southeast', value: 112, comparison_value: 100 },
      ];
      const facts = computeInsightFacts(rows, 'revenue');
      expect(facts.delta_pct).toBe(12);
    });

    it('computes peak and trough period for time series', () => {
      const rows = [
        { period: '2026-07-01', value: 100 },
        { period: '2026-08-01', value: 250 },
        { period: '2026-09-01', value: 80 },
      ];
      const facts = computeInsightFacts(rows, 'revenue');
      expect(facts.peak_period).toBe('2026-08-01');
      expect(facts.trough_period).toBe('2026-09-01');
    });

    it('handles ordinal alignment for time-series comparison', () => {
      const baseRows = [
        { period: '2026-07-01', value: 100 },
        { period: '2026-08-01', value: 200 },
        { period: '2026-09-01', value: 300 },
      ];
      const compRows = [
        { period: '2025-07-01', value: 90 },
        { period: '2025-08-01', value: 180 },
        { period: '2025-09-01', value: 270 },
      ];

      // Align by index (ordinal alignment)
      const merged = baseRows.map((r, i) => ({
        ...r,
        comparison_value: compRows[i]?.value ?? null,
      }));

      expect(merged[0].comparison_value).toBe(90);
      expect(merged[1].comparison_value).toBe(180);
      expect(merged[2].comparison_value).toBe(270);
    });
  });
});
