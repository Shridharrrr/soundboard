import { useDashboardStore } from '../store/dashboard.js';
import { fetchQuery, fetchSchema, exportMetabase } from '../lib/api.js';
import { getEffectiveChartQuery, type QueryRequest, type ChartSpec } from '@vd/shared';

export interface ToolExecutionResponse {
  result: string;
  is_error: boolean;
}

export async function executeToolCall(
  name: string,
  rawArgs: Record<string, unknown>
): Promise<ToolExecutionResponse> {
  const store = useDashboardStore.getState();

  try {
    switch (name) {
      case 'describe_schema': {
        const schema = await fetchSchema();
        return {
          result: JSON.stringify({
            ok: true,
            metrics: Object.keys(schema.metrics),
            dimensions: schema.dimensions,
            granularities: schema.granularities,
          }),
          is_error: false,
        };
      }

      case 'add_chart': {
        const metric = String(rawArgs.metric || '');
        const groupBy = rawArgs.group_by ? String(rawArgs.group_by) : undefined;
        const granularity = rawArgs.time_granularity ? String(rawArgs.time_granularity) : undefined;
        const timeRange = (rawArgs.time_range as any) || { preset: 'this_year' };
        const filters = (rawArgs.filters as any) || [];
        const compareTo = (rawArgs.compare_to as any) || 'none';
        const chartType = rawArgs.chart_type as any;
        const title = rawArgs.title ? String(rawArgs.title) : undefined;

        // 1. Run query first to validate & get insights
        const queryReq: QueryRequest = {
          metric,
          group_by: groupBy,
          time_granularity: granularity as any,
          time_range: timeRange,
          filters,
          compare_to: compareTo,
        };

        const queryResult = await fetchQuery(queryReq);
        if (!queryResult.ok) {
          return {
            result: JSON.stringify(queryResult),
            is_error: false, // normal dialogue response as required by spec
          };
        }

        // 2. Add chart to state
        const added = store.addChart({
          metric,
          group_by: groupBy,
          time_granularity: granularity as any,
          time_range: timeRange,
          filters,
          compare_to: compareTo,
          chart_type: chartType,
          title,
        });

        store.setChartResult(added.chart_id, queryResult);

        const currentCharts = useDashboardStore.getState().charts;
        return {
          result: JSON.stringify({
            ok: true,
            chart_id: added.chart_id,
            title: added.title,
            insight_facts: queryResult.insight_facts,
            dashboard: currentCharts.map(c => ({ id: c.id, title: c.title })),
          }),
          is_error: false,
        };
      }

      case 'update_chart': {
        const rawChartId = rawArgs.chart_id ? String(rawArgs.chart_id) : 'last';
        const targetId = rawChartId === 'last' ? store.last_touched : rawChartId;

        if (!targetId) {
          return {
            result: JSON.stringify({
              ok: false,
              error_code: 'no_chart',
              message: 'There are no charts on the dashboard to update.',
            }),
            is_error: false,
          };
        }

        const existingChart = store.charts.find(c => c.id === targetId);
        if (!existingChart) {
          return {
            result: JSON.stringify({
              ok: false,
              error_code: 'no_chart',
              message: `Chart with ID "${targetId}" not found.`,
            }),
            is_error: false,
          };
        }

        // Build potential updated spec to query
        const metric = rawArgs.metric !== undefined ? String(rawArgs.metric) : existingChart.metric;
        const groupBy =
          rawArgs.group_by !== undefined
            ? String(rawArgs.group_by) === ''
              ? undefined
              : String(rawArgs.group_by)
            : existingChart.group_by;
        const granularity =
          rawArgs.time_granularity !== undefined
            ? String(rawArgs.time_granularity) === ''
              ? undefined
              : (String(rawArgs.time_granularity) as any)
            : existingChart.time_granularity;
        const timeRange =
          rawArgs.time_range !== undefined ? (rawArgs.time_range as any) : existingChart.time_range;
        const filters =
          rawArgs.filters !== undefined ? (rawArgs.filters as any) : existingChart.filters;
        const compareTo =
          rawArgs.compare_to !== undefined ? (rawArgs.compare_to as any) : existingChart.compare_to;

        const effectiveQuery: QueryRequest = getEffectiveChartQuery(
          {
            ...existingChart,
            metric,
            group_by: groupBy,
            time_granularity: granularity,
            time_range: timeRange,
            filters,
            compare_to: compareTo,
          },
          store.global_filters
        );

        const queryResult = await fetchQuery(effectiveQuery);
        if (!queryResult.ok) {
          return {
            result: JSON.stringify(queryResult),
            is_error: false,
          };
        }

        const updated = store.updateChart({
          chart_id: targetId,
          metric,
          group_by: rawArgs.group_by !== undefined ? String(rawArgs.group_by) : undefined,
          time_granularity:
            rawArgs.time_granularity !== undefined ? String(rawArgs.time_granularity) : undefined,
          time_range: rawArgs.time_range as any,
          filters: rawArgs.filters as any,
          compare_to: rawArgs.compare_to as any,
          chart_type: rawArgs.chart_type as any,
          title: rawArgs.title ? String(rawArgs.title) : undefined,
        });

        store.setChartResult(targetId, queryResult);

        const currentCharts = useDashboardStore.getState().charts;
        return {
          result: JSON.stringify({
            ok: true,
            chart_id: targetId,
            title: updated.title,
            insight_facts: queryResult.insight_facts,
            dashboard: currentCharts.map(c => ({ id: c.id, title: c.title })),
          }),
          is_error: false,
        };
      }

      case 'remove_chart': {
        const rawChartId = rawArgs.chart_id ? String(rawArgs.chart_id) : 'last';
        const res = store.removeChart(rawChartId);
        if (!res.ok) {
          return {
            result: JSON.stringify({
              ok: false,
              error_code: 'no_chart',
              message: 'No chart found to remove.',
            }),
            is_error: false,
          };
        }
        const currentCharts = useDashboardStore.getState().charts;
        return {
          result: JSON.stringify({
            ok: true,
            dashboard: currentCharts.map(c => ({ id: c.id, title: c.title })),
          }),
          is_error: false,
        };
      }

      case 'set_global_filter': {
        const dim = String(rawArgs.dimension || '');
        const vals = (rawArgs.values as string[]) || [];
        store.setGlobalFilter(dim, vals);

        // Refetch all active charts
        const currentCharts = useDashboardStore.getState().charts;
        const currentGlobal = useDashboardStore.getState().global_filters;

        for (const chart of currentCharts) {
          const eff = getEffectiveChartQuery(chart, currentGlobal);
          fetchQuery(eff).then(res => {
            if (res.ok) store.setChartResult(chart.id, res);
          });
        }

        return {
          result: JSON.stringify({
            ok: true,
            filters: currentGlobal,
          }),
          is_error: false,
        };
      }

      case 'clear_global_filters': {
        store.clearGlobalFilters();
        const currentCharts = useDashboardStore.getState().charts;
        for (const chart of currentCharts) {
          const eff = getEffectiveChartQuery(chart, []);
          fetchQuery(eff).then(res => {
            if (res.ok) store.setChartResult(chart.id, res);
          });
        }
        return {
          result: JSON.stringify({ ok: true }),
          is_error: false,
        };
      }

      case 'undo': {
        const undone = store.undo();
        const currentCharts = useDashboardStore.getState().charts;
        const currentGlobal = useDashboardStore.getState().global_filters;
        if (undone) {
          for (const chart of currentCharts) {
            const eff = getEffectiveChartQuery(chart, currentGlobal);
            fetchQuery(eff).then(res => {
              if (res.ok) store.setChartResult(chart.id, res);
            });
          }
        }
        return {
          result: JSON.stringify({
            ok: undone,
            dashboard: currentCharts.map(c => ({ id: c.id, title: c.title })),
          }),
          is_error: false,
        };
      }

      case 'clear_dashboard': {
        store.clearDashboard();
        return {
          result: JSON.stringify({ ok: true }),
          is_error: false,
        };
      }

      case 'get_dashboard_state': {
        const state = useDashboardStore.getState();
        return {
          result: JSON.stringify({
            charts: state.charts.map(c => ({
              id: c.id,
              title: c.title,
              metric: c.metric,
              group_by: c.group_by,
              time_granularity: c.time_granularity,
              time_range: c.time_range,
              filters: c.filters,
              compare_to: c.compare_to,
              chart_type: c.chart_type,
            })),
            global_filters: state.global_filters,
            last_touched: state.last_touched,
          }),
          is_error: false,
        };
      }

      case 'export_dashboard': {
        const title = rawArgs.title ? String(rawArgs.title) : 'Voice Analytics Dashboard';
        const res = await exportMetabase(title, store.charts);
        return {
          result: JSON.stringify(res),
          is_error: !res.ok,
        };
      }

      default:
        return {
          result: JSON.stringify({ ok: false, error: `Unrecognized tool "${name}"` }),
          is_error: true,
        };
    }
  } catch (err) {
    console.error(`Tool execution exception for ${name}:`, err);
    return {
      result: JSON.stringify({ ok: false, error: String(err) }),
      is_error: true,
    };
  }
}
