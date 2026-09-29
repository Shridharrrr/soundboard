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

export interface DashboardItem {
  id: string;
  title: string;
  description?: string;
  createdAt: number;
  updatedAt: number;
  charts: ChartSpec[];
  global_filters: Filter[];
  last_touched: string | null;
  history: DashboardSnapshot[];
  cachedResults: Record<string, QueryResultSuccess>;
}

export interface DashboardStoreState {
  // Multi-Dashboard Collections
  dashboards: DashboardItem[];
  activeDashboardId: string;

  // Active Dashboard Properties
  charts: ChartSpec[];
  global_filters: Filter[];
  last_touched: string | null;
  as_of: string;
  history: DashboardSnapshot[];
  cachedResults: Record<string, QueryResultSuccess>;
  loadingCharts: Record<string, boolean>;
  highlightedChartId: string | null;
  activePropertyHighlight: { chartId: string; property: string } | null;

  // Multi-Dashboard Management Actions
  createDashboard: (title: string, description?: string, initialCharts?: ChartSpec[]) => string;
  switchDashboard: (dashboardId: string) => boolean;
  renameDashboard: (dashboardId: string, title: string, description?: string) => boolean;
  deleteDashboard: (dashboardId: string) => boolean;
  duplicateDashboard: (dashboardId: string) => string;

  // Active Dashboard Pure Actions
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
  moveChart: (chartId: string, direction: 'left' | 'right') => boolean;
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

const STORAGE_KEY = 'justtalk_dashboards_v2';

const DEFAULT_INITIAL_DASHBOARD: DashboardItem = {
  id: 'dash-main',
  title: 'Executive Overview',
  description: 'Primary conversational analytics dashboard',
  createdAt: Date.now(),
  updatedAt: Date.now(),
  charts: [],
  global_filters: [],
  last_touched: null,
  history: [],
  cachedResults: {},
};

function loadPersistedState(): { dashboards: DashboardItem[]; activeId: string } {
  if (typeof window === 'undefined' || !window.localStorage) {
    return {
      dashboards: [{ ...DEFAULT_INITIAL_DASHBOARD }],
      activeId: DEFAULT_INITIAL_DASHBOARD.id,
    };
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed.dashboards) && parsed.dashboards.length > 0) {
        const activeId =
          parsed.activeId && parsed.dashboards.some((d: any) => d.id === parsed.activeId)
            ? parsed.activeId
            : parsed.dashboards[0].id;
        return {
          dashboards: parsed.dashboards,
          activeId,
        };
      }
    }
  } catch (err) {
    console.warn('Failed to load dashboards from localStorage:', err);
  }

  return {
    dashboards: [{ ...DEFAULT_INITIAL_DASHBOARD }],
    activeId: DEFAULT_INITIAL_DASHBOARD.id,
  };
}

function persistState(dashboards: DashboardItem[], activeId: string) {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ dashboards, activeId })
    );
  } catch (err) {
    console.warn('Failed to save dashboards to localStorage:', err);
  }
}

const initialPersisted = loadPersistedState();
const initialActive =
  initialPersisted.dashboards.find(d => d.id === initialPersisted.activeId) ||
  initialPersisted.dashboards[0];

export const useDashboardStore = create<DashboardStoreState>((set, get) => ({
  dashboards: initialPersisted.dashboards,
  activeDashboardId: initialActive.id,

  charts: initialActive.charts || [],
  global_filters: initialActive.global_filters || [],
  last_touched: initialActive.last_touched || null,
  as_of: '2026-09-29',
  history: initialActive.history || [],
  cachedResults: initialActive.cachedResults || {},
  loadingCharts: {},
  highlightedChartId: null,
  activePropertyHighlight: null,

  setAsOf: (asOf: string) => set({ as_of: asOf }),

  // Multi-Dashboard Actions
  createDashboard: (title: string, description?: string, initialCharts?: ChartSpec[]) => {
    const state = get();
    const newId = `dash-${Date.now()}`;
    const newDash: DashboardItem = {
      id: newId,
      title: title.trim() || 'Untitled Dashboard',
      description: description?.trim() || '',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      charts: initialCharts || [],
      global_filters: [],
      last_touched: initialCharts && initialCharts.length > 0 ? initialCharts[0].id : null,
      history: [],
      cachedResults: {},
    };

    const updatedDashboards = [newDash, ...state.dashboards];
    set({
      dashboards: updatedDashboards,
      activeDashboardId: newId,
      charts: newDash.charts,
      global_filters: [],
      last_touched: newDash.last_touched,
      history: [],
      cachedResults: {},
      loadingCharts: {},
      highlightedChartId: null,
      activePropertyHighlight: null,
    });
    persistState(updatedDashboards, newId);
    return newId;
  },

  switchDashboard: (dashboardId: string) => {
    const state = get();
    const target = state.dashboards.find(d => d.id === dashboardId);
    if (!target) return false;

    set({
      activeDashboardId: target.id,
      charts: target.charts || [],
      global_filters: target.global_filters || [],
      last_touched: target.last_touched || null,
      history: target.history || [],
      cachedResults: target.cachedResults || {},
      loadingCharts: {},
      highlightedChartId: null,
      activePropertyHighlight: null,
    });
    persistState(state.dashboards, target.id);
    return true;
  },

  renameDashboard: (dashboardId: string, title: string, description?: string) => {
    const state = get();
    const targetIdx = state.dashboards.findIndex(d => d.id === dashboardId);
    if (targetIdx === -1) return false;

    const updatedDashboards = [...state.dashboards];
    updatedDashboards[targetIdx] = {
      ...updatedDashboards[targetIdx],
      title: title.trim() || updatedDashboards[targetIdx].title,
      description: description !== undefined ? description.trim() : updatedDashboards[targetIdx].description,
      updatedAt: Date.now(),
    };

    set({ dashboards: updatedDashboards });
    persistState(updatedDashboards, state.activeDashboardId);
    return true;
  },

  deleteDashboard: (dashboardId: string) => {
    const state = get();
    let updated = state.dashboards.filter(d => d.id !== dashboardId);
    if (updated.length === 0) {
      const fallback: DashboardItem = {
        id: `dash-${Date.now()}`,
        title: 'New Dashboard',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        charts: [],
        global_filters: [],
        last_touched: null,
        history: [],
        cachedResults: {},
      };
      updated = [fallback];
    }

    const nextActive = updated.some(d => d.id === state.activeDashboardId)
      ? state.activeDashboardId
      : updated[0].id;
    const target = updated.find(d => d.id === nextActive) || updated[0];

    set({
      dashboards: updated,
      activeDashboardId: target.id,
      charts: target.charts || [],
      global_filters: target.global_filters || [],
      last_touched: target.last_touched || null,
      history: target.history || [],
      cachedResults: target.cachedResults || {},
      loadingCharts: {},
      highlightedChartId: null,
      activePropertyHighlight: null,
    });
    persistState(updated, target.id);
    return true;
  },

  duplicateDashboard: (dashboardId: string) => {
    const state = get();
    const target = state.dashboards.find(d => d.id === dashboardId);
    if (!target) return '';

    const newId = `dash-${Date.now()}`;
    const duplicated: DashboardItem = {
      ...target,
      id: newId,
      title: `${target.title} (Copy)`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      charts: (target.charts || []).map(c => ({ ...c, id: `c${nextChartCounter++}` })),
      cachedResults: { ...target.cachedResults },
    };

    const updatedDashboards = [duplicated, ...state.dashboards];
    set({
      dashboards: updatedDashboards,
      activeDashboardId: newId,
      charts: duplicated.charts,
      global_filters: [...duplicated.global_filters],
      last_touched: duplicated.last_touched,
      history: [],
      cachedResults: duplicated.cachedResults,
      loadingCharts: {},
      highlightedChartId: null,
      activePropertyHighlight: null,
    });
    persistState(updatedDashboards, newId);
    return newId;
  },

  // Active Dashboard CRUD Actions
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

    const newCharts = [...state.charts, newChart];
    const newHistory = [snapshot, ...state.history].slice(0, MAX_HISTORY);

    const updatedDashboards = state.dashboards.map(d => {
      if (d.id === state.activeDashboardId) {
        return {
          ...d,
          charts: newCharts,
          last_touched: id,
          history: newHistory,
          updatedAt: Date.now(),
        };
      }
      return d;
    });

    set({
      charts: newCharts,
      last_touched: id,
      highlightedChartId: id,
      history: newHistory,
      dashboards: updatedDashboards,
    });

    persistState(updatedDashboards, state.activeDashboardId);
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

    const newHistory = [snapshot, ...state.history].slice(0, MAX_HISTORY);

    const updatedDashboards = state.dashboards.map(d => {
      if (d.id === state.activeDashboardId) {
        return {
          ...d,
          charts: newCharts,
          last_touched: targetId,
          history: newHistory,
          updatedAt: Date.now(),
        };
      }
      return d;
    });

    set({
      charts: newCharts,
      last_touched: targetId,
      highlightedChartId: targetId,
      activePropertyHighlight: propertyHighlight ? { chartId: targetId, property: propertyHighlight } : null,
      history: newHistory,
      dashboards: updatedDashboards,
    });

    persistState(updatedDashboards, state.activeDashboardId);
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
    const newHistory = [snapshot, ...state.history].slice(0, MAX_HISTORY);

    const updatedDashboards = state.dashboards.map(d => {
      if (d.id === state.activeDashboardId) {
        return {
          ...d,
          charts: newCharts,
          last_touched: newLast,
          history: newHistory,
          updatedAt: Date.now(),
        };
      }
      return d;
    });

    set({
      charts: newCharts,
      last_touched: newLast,
      history: newHistory,
      dashboards: updatedDashboards,
    });

    persistState(updatedDashboards, state.activeDashboardId);
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
    const newFilters = [...remaining, { dimension, values }];
    const newHistory = [snapshot, ...state.history].slice(0, MAX_HISTORY);

    const updatedDashboards = state.dashboards.map(d => {
      if (d.id === state.activeDashboardId) {
        return {
          ...d,
          global_filters: newFilters,
          history: newHistory,
          updatedAt: Date.now(),
        };
      }
      return d;
    });

    set({
      global_filters: newFilters,
      history: newHistory,
      dashboards: updatedDashboards,
    });

    persistState(updatedDashboards, state.activeDashboardId);
  },

  clearGlobalFilters: () => {
    const state = get();
    const snapshot: DashboardSnapshot = {
      charts: [...state.charts],
      global_filters: [...state.global_filters],
      last_touched: state.last_touched,
    };

    const newHistory = [snapshot, ...state.history].slice(0, MAX_HISTORY);
    const updatedDashboards = state.dashboards.map(d => {
      if (d.id === state.activeDashboardId) {
        return {
          ...d,
          global_filters: [],
          history: newHistory,
          updatedAt: Date.now(),
        };
      }
      return d;
    });

    set({
      global_filters: [],
      history: newHistory,
      dashboards: updatedDashboards,
    });

    persistState(updatedDashboards, state.activeDashboardId);
  },

  clearDashboard: () => {
    const state = get();
    const snapshot: DashboardSnapshot = {
      charts: [...state.charts],
      global_filters: [...state.global_filters],
      last_touched: state.last_touched,
    };

    const newHistory = [snapshot, ...state.history].slice(0, MAX_HISTORY);
    const updatedDashboards = state.dashboards.map(d => {
      if (d.id === state.activeDashboardId) {
        return {
          ...d,
          charts: [],
          global_filters: [],
          last_touched: null,
          history: newHistory,
          updatedAt: Date.now(),
        };
      }
      return d;
    });

    set({
      charts: [],
      global_filters: [],
      last_touched: null,
      history: newHistory,
      dashboards: updatedDashboards,
    });

    persistState(updatedDashboards, state.activeDashboardId);
  },

  undo: () => {
    const state = get();
    if (state.history.length === 0) return false;

    const [previous, ...rest] = state.history;
    const updatedDashboards = state.dashboards.map(d => {
      if (d.id === state.activeDashboardId) {
        return {
          ...d,
          charts: previous.charts,
          global_filters: previous.global_filters,
          last_touched: previous.last_touched,
          history: rest,
          updatedAt: Date.now(),
        };
      }
      return d;
    });

    set({
      charts: previous.charts,
      global_filters: previous.global_filters,
      last_touched: previous.last_touched,
      history: rest,
      dashboards: updatedDashboards,
    });

    persistState(updatedDashboards, state.activeDashboardId);
    return true;
  },

  setChartResult: (chartId, result) => {
    const state = get();
    const newCached = { ...state.cachedResults, [chartId]: result };
    const updatedDashboards = state.dashboards.map(d => {
      if (d.id === state.activeDashboardId) {
        return {
          ...d,
          cachedResults: newCached,
          updatedAt: Date.now(),
        };
      }
      return d;
    });

    set({
      cachedResults: newCached,
      loadingCharts: { ...state.loadingCharts, [chartId]: false },
      dashboards: updatedDashboards,
    });

    persistState(updatedDashboards, state.activeDashboardId);
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

  moveChart: (chartId, direction) => {
    const state = get();
    const idx = state.charts.findIndex(c => c.id === chartId);
    if (idx === -1) return false;

    const targetIdx = direction === 'left' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= state.charts.length) return false;

    const newCharts = [...state.charts];
    const temp = newCharts[idx];
    newCharts[idx] = newCharts[targetIdx];
    newCharts[targetIdx] = temp;

    const updatedDashboards = state.dashboards.map(d => {
      if (d.id === state.activeDashboardId) {
        return {
          ...d,
          charts: newCharts,
          updatedAt: Date.now(),
        };
      }
      return d;
    });

    set({
      charts: newCharts,
      dashboards: updatedDashboards,
      last_touched: chartId,
      highlightedChartId: chartId,
    });

    persistState(updatedDashboards, state.activeDashboardId);
    return true;
  },
}));
