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
 * Auto-resolves chart type if not specified:
 * - time series (has time_granularity) -> 'line'
 * - categorical (has group_by, no time_granularity) -> 'bar'
 * - single value -> 'bar'
 */
export function resolveAutoChartType(req: Partial<QueryRequest> & { chart_type?: ChartType }): ChartType {
  if (req.chart_type) return req.chart_type;
  if (req.time_granularity) return 'line';
  return 'bar';
}
