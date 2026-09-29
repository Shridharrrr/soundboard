import { z } from 'zod';
import { QueryRequestSchema, type QueryRequest } from './query.js';

export const ChartTypeSchema = z.enum(['bar', 'line', 'area', 'stacked_bar', 'donut']);
export type ChartType = z.infer<typeof ChartTypeSchema>;

export const ChartSpecSchema = QueryRequestSchema.extend({
  id: z.string(),
  title: z.string(),
  chart_type: ChartTypeSchema,
});
export type ChartSpec = z.infer<typeof ChartSpecSchema>;

/**
 * Auto-resolves the optimal chart type if not specified:
 * - multi-period comparisons (compare_to active) -> 'line'
 * - monthly/quarterly trends (continuous volume trajectory) -> 'area'
 * - daily/weekly time series -> 'line'
 * - category breakdown (share of product categories) -> 'donut'
 * - regional/channel comparisons -> 'bar'
 * - default -> 'bar'
 */
export function resolveAutoChartType(req: Partial<QueryRequest> & { chart_type?: ChartType }): ChartType {
  if (req.chart_type) return req.chart_type;

  // Comparison to previous year or previous period is best visualized as a line
  if (req.compare_to && req.compare_to !== 'none') {
    return 'line';
  }

  // Time series volume / trajectory
  if (req.time_granularity) {
    if (req.time_granularity === 'month' || req.time_granularity === 'quarter') {
      return 'area';
    }
    return 'line';
  }

  // Category composition/distribution is best visualized as a donut
  if (req.group_by === 'category') {
    return 'donut';
  }

  return 'bar';
}
