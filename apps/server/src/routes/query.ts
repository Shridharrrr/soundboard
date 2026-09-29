import type { FastifyPluginAsync } from 'fastify';
import { QueryRequestSchema, type QueryResult } from '@vd/shared';
import { loadSemanticLayer } from '../semantic/load.js';
import { resolveFilters } from '../semantic/resolve.js';
import { resolveTimeRange, getComparisonRange } from '../semantic/time.js';
import { compileSql } from '../semantic/compile.js';
import { computeInsightFacts, type RowData } from '../semantic/insight.js';
import { getDbClient } from '../db.js';
import { config } from '../config.js';

export const queryRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.post<{ Body: unknown }>('/api/query', async (request, reply): Promise<QueryResult> => {
    const parseResult = QueryRequestSchema.safeParse(request.body);
    if (!parseResult.success) {
      reply.status(400);
      return {
        ok: false,
        error_code: 'query_failed',
        message: `Invalid query request body: ${parseResult.error.message}`,
      };
    }

    const queryReq = parseResult.data;
    const semantic = loadSemanticLayer();

    // 1. Metric check
    const metricKey = Object.keys(semantic.metrics).find(
      m => m.toLowerCase() === queryReq.metric.toLowerCase()
    );

    if (!metricKey) {
      return {
        ok: false,
        error_code: 'unknown_metric',
        message: `Unknown metric "${queryReq.metric}".`,
        available: Object.keys(semantic.metrics),
      };
    }
    const metricDef = semantic.metrics[metricKey];

    // 2. Reject unsupported combinations
    if (queryReq.compare_to !== 'none' && queryReq.group_by && queryReq.time_granularity) {
      return {
        ok: false,
        error_code: 'unsupported_combination',
        message: 'Comparison works with either a breakdown or a time series, not both.',
      };
    }

    // 3. Resolve filters
    const filterResolution = resolveFilters(queryReq.filters, semantic);
    if (!filterResolution.ok) {
      return filterResolution;
    }
    const resolvedFilters = filterResolution.filters;

    // 4. Resolve time range
    const timeRange = resolveTimeRange(queryReq.time_range, config.AS_OF_DATE);

    // Dimension map
    const dimMap: Record<string, string> = {};
    for (const [k, d] of Object.entries(semantic.dimensions)) {
      dimMap[k.toLowerCase()] = d.column;
    }

    let dimCol: string | undefined;
    let normalizedGroupBy: string | undefined;
    if (queryReq.group_by && queryReq.group_by.trim() !== '') {
      normalizedGroupBy = Object.keys(semantic.dimensions).find(
        d => d.toLowerCase() === queryReq.group_by!.toLowerCase()
      );
      if (normalizedGroupBy) {
        dimCol = semantic.dimensions[normalizedGroupBy].column;
      }
    }

    // 5. Compile primary SQL
    const primaryCompiled = compileSql({
      metricId: metricKey,
      metricDef,
      timeColumn: semantic.time_column,
      sourceTable: semantic.source,
      timeRange,
      groupBy: normalizedGroupBy,
      dimensionColumn: dimCol,
      timeGranularity: queryReq.time_granularity,
      resolvedFilters,
      dimensionColumnMap: dimMap,
    });

    try {
      const client = await getDbClient(false);
      const baseResult = await client.query<RowData>(primaryCompiled.sql, primaryCompiled.params);
      let rows: RowData[] = baseResult.rows;

      // 6. Handle comparison if requested
      const compRange = getComparisonRange(timeRange, queryReq.compare_to);
      if (compRange) {
        const compCompiled = compileSql({
          metricId: metricKey,
          metricDef,
          timeColumn: semantic.time_column,
          sourceTable: semantic.source,
          timeRange: compRange,
          groupBy: normalizedGroupBy,
          dimensionColumn: dimCol,
          timeGranularity: queryReq.time_granularity,
          resolvedFilters,
          dimensionColumnMap: dimMap,
        });

        const compResult = await client.query<RowData>(compCompiled.sql, compCompiled.params);
        const compRows = compResult.rows;

        if (normalizedGroupBy) {
          // Categorical comparison: merge by group key
          const compMap = new Map<string, number>();
          for (const cr of compRows) {
            if (cr.grp !== undefined && cr.grp !== null) {
              compMap.set(String(cr.grp), Number(cr.value) || 0);
            }
          }
          rows = rows.map(r => ({
            ...r,
            comparison_value: r.grp ? compMap.get(String(r.grp)) ?? 0 : null,
          }));
        } else if (queryReq.time_granularity) {
          // Time series: ordinal alignment (nth bucket to nth bucket)
          rows = rows.map((r, idx) => ({
            ...r,
            comparison_value: compRows[idx]?.value !== undefined ? Number(compRows[idx].value) : null,
          }));
        } else {
          // Single scalar
          if (rows.length > 0) {
            rows[0] = {
              ...rows[0],
              comparison_value: compRows[0]?.value !== undefined ? Number(compRows[0].value) : null,
            };
          }
        }
      }

      // 7. Calculate insight facts
      const insight_facts = computeInsightFacts(rows, metricKey);

      const columns = [...primaryCompiled.columns];
      if (compRange && !columns.includes('comparison_value')) {
        columns.push('comparison_value');
      }

      return {
        ok: true,
        columns,
        rows: rows as Array<Record<string, string | number | null>>,
        resolved: {
          time_range: {
            start: timeRange.start,
            end_inclusive: timeRange.end_inclusive,
          },
          comparison_range: compRange
            ? {
                start: compRange.start,
                end_inclusive: compRange.end_inclusive,
              }
            : undefined,
          filters: resolvedFilters,
        },
        sql: primaryCompiled.displaySql,
        insight_facts,
        metric: {
          id: metricKey,
          label: metricDef.label,
          format: metricDef.format,
        },
      };
    } catch (err) {
      request.log.error(err, '[Query Execution Error]');
      return {
        ok: false,
        error_code: 'query_failed',
        message: 'The database query failed or exceeded execution timeout.',
      };
    }
  });
};
