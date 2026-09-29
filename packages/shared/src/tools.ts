import { z } from 'zod';
import { FilterSchema, TimeRangeSchema, CompareToSchema } from './query.js';
import { ChartTypeSchema } from './chart.js';

export const AddChartArgsSchema = z.object({
  metric: z.string(),
  group_by: z.string().optional(),
  time_granularity: z.enum(['day', 'week', 'month', 'quarter']).optional(),
  time_range: TimeRangeSchema.optional(),
  filters: z.array(FilterSchema).optional(),
  compare_to: CompareToSchema.optional(),
  chart_type: ChartTypeSchema.optional(),
  title: z.string().optional(),
});
export type AddChartArgs = z.infer<typeof AddChartArgsSchema>;

export const UpdateChartArgsSchema = z.object({
  chart_id: z.string().optional().default('last'),
  metric: z.string().optional(),
  group_by: z.string().optional(),
  time_granularity: z.string().optional(),
  time_range: TimeRangeSchema.optional(),
  filters: z.array(FilterSchema).optional(),
  compare_to: CompareToSchema.optional(),
  chart_type: ChartTypeSchema.optional(),
  title: z.string().optional(),
});
export type UpdateChartArgs = z.infer<typeof UpdateChartArgsSchema>;

export const RemoveChartArgsSchema = z.object({
  chart_id: z.string().optional().default('last'),
});
export type RemoveChartArgs = z.infer<typeof RemoveChartArgsSchema>;

export const SetGlobalFilterArgsSchema = z.object({
  dimension: z.string(),
  values: z.array(z.string()),
});
export type SetGlobalFilterArgs = z.infer<typeof SetGlobalFilterArgsSchema>;

export const ExportDashboardArgsSchema = z.object({
  title: z.string().optional(),
});
export type ExportDashboardArgs = z.infer<typeof ExportDashboardArgsSchema>;

export interface AssemblyAIToolDefinition {
  type: 'function';
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
}

/**
 * Builds the dynamic AssemblyAI tool definitions using the schema metrics & dimensions.
 */
export function buildAssemblyAITools(options: {
  metricKeys: string[];
  dimensionKeys: string[];
  hasMetabase: boolean;
}): AssemblyAIToolDefinition[] {
  const tools: AssemblyAIToolDefinition[] = [
    {
      type: 'function',
      name: 'describe_schema',
      description: 'Describes available metrics, dimensions, values, and granularities for asking questions about the dataset.',
      parameters: {
        type: 'object',
        properties: {},
      },
    },
    {
      type: 'function',
      name: 'add_chart',
      description: 'Creates a new chart card on the live dashboard with the specified metric, breakdown or time series.',
      parameters: {
        type: 'object',
        properties: {
          metric: {
            type: 'string',
            enum: options.metricKeys,
            description: 'The metric to query (e.g. revenue, orders, aov, customers, units).',
          },
          group_by: {
            type: 'string',
            enum: options.dimensionKeys,
            description: 'Categorical dimension to group by (e.g. region, category, channel). Never a time dimension.',
          },
          time_granularity: {
            type: 'string',
            enum: ['day', 'week', 'month', 'quarter'],
            description: 'Time bucket granularity for a time-series line/area chart.',
          },
          time_range: {
            type: 'object',
            description: 'Time range specification: preset (e.g. this_quarter, last_month, this_year, last_year) or quarter/year or start/end.',
            properties: {
              preset: {
                type: 'string',
                enum: [
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
                ],
              },
              quarter: { type: 'integer', enum: [1, 2, 3, 4] },
              year: { type: 'integer' },
              start: { type: 'string', description: 'YYYY-MM-DD' },
              end: { type: 'string', description: 'YYYY-MM-DD' },
            },
          },
          filters: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                dimension: { type: 'string', enum: options.dimensionKeys },
                values: { type: 'array', items: { type: 'string' } },
              },
              required: ['dimension', 'values'],
            },
          },
          compare_to: {
            type: 'string',
            enum: ['none', 'previous_period', 'previous_year'],
            description: 'Compare against previous period or previous year.',
          },
          chart_type: {
            type: 'string',
            enum: ['bar', 'line', 'area', 'stacked_bar', 'donut'],
            description: 'Intelligently select the best visualization: "donut" for category share/distribution; "area" for monthly/quarterly volume trajectories; "line" for multi-period comparisons (YoY) and daily/weekly trends; "bar" for regional/channel rankings and comparisons. Respect explicit user preference.',
          },
          title: {
            type: 'string',
            description: 'Optional human-readable title for the chart card.',
          },
        },
        required: ['metric'],
      },
    },
    {
      type: 'function',
      name: 'update_chart',
      description: 'Updates an existing chart card (defaults to most recently touched chart). Use for follow-ups like "make it weekly", "as a bar chart", "compare to last year", "break out Southeast".',
      parameters: {
        type: 'object',
        properties: {
          chart_id: {
            type: 'string',
            description: 'ID of chart to update, e.g. "c1", "c2", or "last" (default).',
          },
          metric: { type: 'string', enum: options.metricKeys },
          group_by: {
            type: 'string',
            description: 'Dimension to group by, or empty string "" to clear grouping.',
          },
          time_granularity: {
            type: 'string',
            description: 'Time granularity (day, week, month, quarter), or empty string "" to clear time series.',
          },
          time_range: {
            type: 'object',
            properties: {
              preset: { type: 'string' },
              quarter: { type: 'integer' },
              year: { type: 'integer' },
              start: { type: 'string' },
              end: { type: 'string' },
            },
          },
          filters: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                dimension: { type: 'string' },
                values: { type: 'array', items: { type: 'string' } },
              },
              required: ['dimension', 'values'],
            },
          },
          compare_to: { type: 'string', enum: ['none', 'previous_period', 'previous_year'] },
          chart_type: { type: 'string', enum: ['bar', 'line', 'area', 'stacked_bar', 'donut'] },
          title: { type: 'string' },
        },
      },
    },
    {
      type: 'function',
      name: 'remove_chart',
      description: 'Removes a chart from the dashboard.',
      parameters: {
        type: 'object',
        properties: {
          chart_id: { type: 'string', description: 'ID of chart to remove, or "last".' },
        },
      },
    },
    {
      type: 'function',
      name: 'set_global_filter',
      description: 'Applies a global filter across all charts on the dashboard for a specific dimension.',
      parameters: {
        type: 'object',
        properties: {
          dimension: { type: 'string', enum: options.dimensionKeys },
          values: { type: 'array', items: { type: 'string' } },
        },
        required: ['dimension', 'values'],
      },
    },
    {
      type: 'function',
      name: 'clear_global_filters',
      description: 'Clears all global filters from the dashboard.',
      parameters: {
        type: 'object',
        properties: {},
      },
    },
    {
      type: 'function',
      name: 'undo',
      description: 'Reverts the last state-changing action on the dashboard.',
      parameters: {
        type: 'object',
        properties: {},
      },
    },
    {
      type: 'function',
      name: 'clear_dashboard',
      description: 'Removes all charts and clears all filters on the dashboard.',
      parameters: {
        type: 'object',
        properties: {},
      },
    },
    {
      type: 'function',
      name: 'get_dashboard_state',
      description: 'Returns the current state of all charts and filters on the dashboard.',
      parameters: {
        type: 'object',
        properties: {},
      },
    },
  ];

  if (options.hasMetabase) {
    tools.push({
      type: 'function',
      name: 'export_dashboard',
      description: 'Exports the current dashboard to Metabase as native SQL cards and returns the URL.',
      parameters: {
        type: 'object',
        properties: {
          title: { type: 'string', description: 'Title for the Metabase dashboard' },
        },
      },
    });
  }

  return tools;
}
