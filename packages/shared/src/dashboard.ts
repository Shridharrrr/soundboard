import { z } from 'zod';
import { ChartSpecSchema, type ChartSpec } from './chart.js';
import { FilterSchema, type Filter, type QueryRequest } from './query.js';

export const DashboardStateSchema = z.object({
  charts: z.array(ChartSpecSchema),
  global_filters: z.array(FilterSchema),
  last_touched: z.string().nullable(),
  as_of: z.string(),
});
export type DashboardState = z.infer<typeof DashboardStateSchema>;

/**
 * Computes the effective query request for a chart by merging
 * its own filters with global filters (chart's own filter wins on same dimension).
 */
export function getEffectiveChartQuery(chart: ChartSpec, globalFilters: Filter[]): QueryRequest {
  const chartDimSet = new Set(chart.filters.map(f => f.dimension.toLowerCase()));
  const mergedFilters = [
    ...chart.filters,
    ...globalFilters.filter(gf => !chartDimSet.has(gf.dimension.toLowerCase())),
  ];

  return {
    metric: chart.metric,
    group_by: chart.group_by,
    time_granularity: chart.time_granularity,
    time_range: chart.time_range,
    filters: mergedFilters,
    compare_to: chart.compare_to,
  };
}
