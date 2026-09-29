import { z } from 'zod';

export const MetricFormatSchema = z.enum(['currency', 'integer', 'decimal', 'percent']);
export type MetricFormat = z.infer<typeof MetricFormatSchema>;

export const MetricDefinitionSchema = z.object({
  label: z.string(),
  sql: z.string(),
  format: MetricFormatSchema,
  synonyms: z.array(z.string()).default([]),
});
export type MetricDefinition = z.infer<typeof MetricDefinitionSchema>;

export const DimensionDefinitionSchema = z.object({
  label: z.string(),
  column: z.string(),
  values: z.array(z.string()),
  synonyms: z.record(z.string(), z.array(z.string())).default({}),
});
export type DimensionDefinition = z.infer<typeof DimensionDefinitionSchema>;

export const GranularitySchema = z.enum(['day', 'week', 'month', 'quarter']);
export type Granularity = z.infer<typeof GranularitySchema>;

export const SemanticLayerSchema = z.object({
  source: z.string(),
  time_column: z.string(),
  metrics: z.record(z.string(), MetricDefinitionSchema),
  dimensions: z.record(z.string(), DimensionDefinitionSchema),
  granularities: z.array(GranularitySchema),
  default_breakout_order: z.array(z.string()),
});
export type SemanticLayer = z.infer<typeof SemanticLayerSchema>;
