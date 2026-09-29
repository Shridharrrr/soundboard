import { create } from 'zustand';
import type {
  ChartSpec,
  Filter,
  ChartType,
  TimeRange,
  CompareTo,
  QueryResultSuccess,
  Granularity,
} from '@vd/shared';
import { resolveAutoChartType, getEffectiveChartQuery } from '@vd/shared';

export interface DashboardSnapshot {
  charts: ChartSpec[];
  global_filters: Filter[];
  last_touched: string | null;
}

export interface DashboardStoreState {
  charts: ChartSpec[];
  global_filters: Filter[];
  last_touched: string | null;
  as_of: string;
  history: DashboardSnapshot[];
  cachedResults: Record<string, QueryResultSuccess>;
  loadingCharts: Record<string, boolean>;
  highlightedChartId: string | null;
  activePropertyHighlight: { chartId: string; property: string } | null;

  // Actions
  setAsOf: (asOf: string) => void;
  addChart: (spec: Partial<ChartSpec> & { metric: string }) => { ok: boolean; chart_id: string; title: string };
  updateChart: (params: {
    chart_id?: string;
    metric?: string;
    group_by?: string;
    time_granularity?: string;
    time_range?: TimeRange;
    filters?: Filter[];
    compare_to?: CompareTo;
    chart_type?: ChartType;
    title?: string;
  }) => { ok: boolean; chart_id?: string; title?: string; error_code?: string };
  removeChart: (chartId?: string) => { ok: boolean; error_code?: string };
  setGlobalFilter: (dimension: string, values: string[]) => void;
  clearGlobalFilters: () => void;
  clearDashboard: () => void;
  undo: () => boolean;
  setChartResult: (chartId: string, result: QueryResultSuccess) => void;
  setChartLoading: (chartId: string, loading: boolean) => void;
  setHighlightedChart: (chartId: string | null, property?: string) => void;
}

const MAX_HISTORY = 20;

let nextChartCounter = 1;

export function generateChartTitle(spec: Partial<ChartSpec>): string {
  const metricName = spec.metric ? spec.metric.charAt(0).toUpperCase() + spec.metric.slice(1) : 'Metrics';
  let title = metricName;

  if (spec.group_by) {
    title += ` by ${spec.group_by}`;
  } else if (spec.time_granularity) {
    title += ` (${spec.time_granularity}ly)`;
  }

  if (spec.filters && spec.filters.length > 0) {
    const filterDesc = spec.filters.map(f => `${f.values.join('/')}`).join(', ');
    title += ` · ${filterDesc}`;
  }

  if (spec.compare_to && spec.compare_to !== 'none') {
    title += ` vs ${spec.compare_to === 'previous_year' ? 'prev year' : 'prev period'}`;
  }

  return title;
}

export const useDashboardStore = create<DashboardStoreState>((set, get) => ({
  charts: [],
  global_filters: [],
  last_touched: null,
  as_of: '2026-09-29',
  history: [],
  cachedResults: {},
  loadingCharts: {},
  highlightedChartId: null,
  activePropertyHighlight: null,

  setAsOf: (asOf: string) => set({ as_of: asOf }),

  addChart: (spec) => {
    const state = get();
    const id = spec.id || `c${nextChartCounter++}`;
    const chartType = resolveAutoChartType(spec);
    const title = spec.title || generateChartTitle({ ...spec, chart_type: chartType });

    const newChart: ChartSpec = {
      id,
      title,
      metric: spec.metric,
      group_by: spec.group_by,
      time_granularity: spec.time_granularity as Granularity | undefined,
      time_range: spec.time_range || { preset: 'this_year' },
      filters: spec.filters || [],
      compare_to: spec.compare_to || 'none',
      chart_type: chartType,
    };

    const snapshot: DashboardSnapshot = {
      charts: [...state.charts],
      global_filters: [...state.global_filters],
      last_touched: state.last_touched,
    };

    set({
      charts: [...state.charts, newChart],
      last_touched: id,
      highlightedChartId: id,
      history: [snapshot, ...state.history].slice(0, MAX_HISTORY),
    });

    return { ok: true, chart_id: id, title };
  },

  updateChart: (params) => {
    const state = get();
    const targetId = params.chart_id === 'last' || !params.chart_id ? state.last_touched : params.chart_id;

    if (!targetId) {
      return { ok: false, error_code: 'no_chart' };
    }

    const existingIdx = state.charts.findIndex(c => c.id === targetId);
    if (existingIdx === -1) {
      return { ok: false, error_code: 'no_chart' };
    }

    const snapshot: DashboardSnapshot = {
      charts: [...state.charts],
      global_filters: [...state.global_filters],
      last_touched: state.last_touched,
    };

    const curr = state.charts[existingIdx];
    const updated: ChartSpec = {
      ...curr,
      metric: params.metric !== undefined ? params.metric : curr.metric,
      group_by:
        params.group_by !== undefined
          ? params.group_by === ''
            ? undefined
            : params.group_by
          : curr.group_by,
      time_granularity:
        params.time_granularity !== undefined
          ? params.time_granularity === ''
            ? undefined
            : (params.time_granularity as Granularity)
          : curr.time_granularity,
      time_range: params.time_range !== undefined ? params.time_range : curr.time_range,
      filters: params.filters !== undefined ? params.filters : curr.filters,
      compare_to: params.compare_to !== undefined ? params.compare_to : curr.compare_to,
      chart_type: params.chart_type !== undefined ? params.chart_type : curr.chart_type,
    };

    if (params.title) {
      updated.title = params.title;
    } else if (!params.title && (params.metric || params.group_by !== undefined || params.time_granularity !== undefined || params.filters || params.compare_to)) {
      updated.title = generateChartTitle(updated);
    }

    const newCharts = [...state.charts];
    newCharts[existingIdx] = updated;

    let propertyHighlight = '';
    if (params.time_granularity) propertyHighlight = 'granularity';
    else if (params.filters) propertyHighlight = 'filters';
    else if (params.compare_to) propertyHighlight = 'comparison';
    else if (params.group_by) propertyHighlight = 'group_by';

    set({
      charts: newCharts,
      last_touched: targetId,
      highlightedChartId: targetId,
      activePropertyHighlight: propertyHighlight ? { chartId: targetId, property: propertyHighlight } : null,
      history: [snapshot, ...state.history].slice(0, MAX_HISTORY),
    });

    return { ok: true, chart_id: targetId, title: updated.title };
  },

  removeChart: (chartId) => {
    const state = get();
    const targetId = chartId === 'last' || !chartId ? state.last_touched : chartId;

    if (!targetId) {
      return { ok: false, error_code: 'no_chart' };
    }

    const existingIdx = state.charts.findIndex(c => c.id === targetId);
    if (existingIdx === -1) {
      return { ok: false, error_code: 'no_chart' };
    }

    const snapshot: DashboardSnapshot = {
      charts: [...state.charts],
      global_filters: [...state.global_filters],
      last_touched: state.last_touched,
    };

    const newCharts = state.charts.filter(c => c.id !== targetId);
    const newLast = newCharts.length > 0 ? newCharts[newCharts.length - 1].id : null;

    set({
      charts: newCharts,
      last_touched: newLast,
      history: [snapshot, ...state.history].slice(0, MAX_HISTORY),
    });

    return { ok: true };
  },

  setGlobalFilter: (dimension, values) => {
    const state = get();
    const snapshot: DashboardSnapshot = {
      charts: [...state.charts],
      global_filters: [...state.global_filters],
      last_touched: state.last_touched,
    };

    const remaining = state.global_filters.filter(
      f => f.dimension.toLowerCase() !== dimension.toLowerCase()
    );

    set({
      global_filters: [...remaining, { dimension, values }],
      history: [snapshot, ...state.history].slice(0, MAX_HISTORY),
    });
  },

  clearGlobalFilters: () => {
    const state = get();
    const snapshot: DashboardSnapshot = {
      charts: [...state.charts],
      global_filters: [...state.global_filters],
      last_touched: state.last_touched,
    };

    set({
      global_filters: [],
      history: [snapshot, ...state.history].slice(0, MAX_HISTORY),
    });
  },

  clearDashboard: () => {
    const state = get();
    const snapshot: DashboardSnapshot = {
      charts: [...state.charts],
      global_filters: [...state.global_filters],
      last_touched: state.last_touched,
    };

    set({
      charts: [],
      global_filters: [],
      last_touched: null,
      history: [snapshot, ...state.history].slice(0, MAX_HISTORY),
    });
  },

  undo: () => {
    const state = get();
    if (state.history.length === 0) return false;

    const [previous, ...rest] = state.history;
    set({
      charts: previous.charts,
      global_filters: previous.global_filters,
      last_touched: previous.last_touched,
      history: rest,
    });
    return true;
  },

  setChartResult: (chartId, result) => {
    set(s => ({
      cachedResults: { ...s.cachedResults, [chartId]: result },
      loadingCharts: { ...s.loadingCharts, [chartId]: false },
    }));
  },

  setChartLoading: (chartId, loading) => {
    set(s => ({
      loadingCharts: { ...s.loadingCharts, [chartId]: loading },
    }));
  },

  setHighlightedChart: (chartId, property) => {
    set({
      highlightedChartId: chartId,
      activePropertyHighlight: chartId && property ? { chartId, property } : null,
    });
  },
}));
