import { z } from 'zod';
import { GranularitySchema, MetricFormatSchema } from './semantic.js';

export const PresetTimeRangeSchema = z.object({
  preset: z.enum([
    'last_7_days',
    'last_30_days',
    'last_90_days',
    'this_month',
    'last_month',
    'this_quarter',
    'last_quarter',
    'this_year',
    'last_year',
    'year_to_date',
  ]),
});

export const QuarterTimeRangeSchema = z.object({
  quarter: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]),
  year: z.number().int(),
});

export const CustomTimeRangeSchema = z.object({
  start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD'),
  end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD'),
});

export const TimeRangeSchema = z.union([
  PresetTimeRangeSchema,
  QuarterTimeRangeSchema,
  CustomTimeRangeSchema,
]);
export type TimeRange = z.infer<typeof TimeRangeSchema>;

export const FilterSchema = z.object({
  dimension: z.string(),
  values: z.array(z.string()),
});
export type Filter = z.infer<typeof FilterSchema>;

export const CompareToSchema = z.enum(['none', 'previous_period', 'previous_year']);
export type CompareTo = z.infer<typeof CompareToSchema>;

export const QueryRequestSchema = z.object({
  metric: z.string(),
  group_by: z.string().optional(),
  time_granularity: GranularitySchema.optional(),
  time_range: TimeRangeSchema.default({ preset: 'this_year' }),
  filters: z.array(FilterSchema).default([]),
  compare_to: CompareToSchema.default('none'),
});
export type QueryRequest = z.infer<typeof QueryRequestSchema>;

export const InsightFactsSchema = z.object({
  total: z.number(),
  comparison_total: z.number().optional(),
  delta_pct: z.number().optional(),
  top_group: z.string().optional(),
  top_group_share: z.number().optional(),
  peak_period: z.string().optional(),
  trough_period: z.string().optional(),
});
export type InsightFacts = z.infer<typeof InsightFactsSchema>;

export const QueryResultSuccessSchema = z.object({
  ok: z.literal(true),
  columns: z.array(z.string()),
  rows: z.array(z.record(z.string(), z.union([z.string(), z.number(), z.null()]))),
  resolved: z.object({
    time_range: z.object({
      start: z.string(),
      end_inclusive: z.string(),
    }),
    comparison_range: z
      .object({
        start: z.string(),
        end_inclusive: z.string(),
      })
      .optional(),
    filters: z.array(FilterSchema),
  }),
  sql: z.string(),
  insight_facts: InsightFactsSchema,
  metric: z.object({
    id: z.string(),
    label: z.string(),
    format: MetricFormatSchema,
  }),
});
export type QueryResultSuccess = z.infer<typeof QueryResultSuccessSchema>;

export const QueryResultErrorSchema = z.object({
  ok: z.literal(false),
  error_code: z.enum([
    'unknown_metric',
    'ambiguous_value',
    'value_not_found',
    'unsupported_combination',
    'query_failed',
    'no_chart',
  ]),
  message: z.string(),
  dimension: z.string().optional(),
  input: z.string().optional(),
  candidates: z.array(z.string()).optional(),
  valid_values: z.array(z.string()).optional(),
  available: z.array(z.string()).optional(),
});
export type QueryResultError = z.infer<typeof QueryResultErrorSchema>;

export const QueryResultSchema = z.union([QueryResultSuccessSchema, QueryResultErrorSchema]);
export type QueryResult = z.infer<typeof QueryResultSchema>;
