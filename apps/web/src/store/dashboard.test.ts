import { describe, it, expect, beforeEach } from 'vitest';
import { useDashboardStore } from './dashboard.js';

describe('Phase 5: Dashboard Store Reducer & Tool Sequences', () => {
  beforeEach(() => {
    useDashboardStore.getState().clearDashboard();
  });

  it('covers all pure reducer actions: addChart, updateChart, removeChart, setGlobalFilter, clearGlobalFilters, undo', () => {
    const store = useDashboardStore.getState();

    // 1. Add chart
    const addRes = store.addChart({
      metric: 'revenue',
      group_by: 'region',
      time_range: { preset: 'this_quarter' },
    });
    expect(addRes.ok).toBe(true);
    expect(useDashboardStore.getState().charts.length).toBe(1);
    expect(useDashboardStore.getState().last_touched).toBe(addRes.chart_id);

    // 2. Update chart
    const updateRes = store.updateChart({
      chart_id: 'last',
      filters: [{ dimension: 'region', values: ['Southeast'] }],
      group_by: 'category',
    });
    expect(updateRes.ok).toBe(true);
    const updated = useDashboardStore.getState().charts[0];
    expect(updated.group_by).toBe('category');
    expect(updated.filters[0].values).toEqual(['Southeast']);

    // 3. Set global filter
    store.setGlobalFilter('channel', ['Web']);
    expect(useDashboardStore.getState().global_filters.length).toBe(1);
    expect(useDashboardStore.getState().global_filters[0].values).toEqual(['Web']);

    // 4. Clear global filters
    store.clearGlobalFilters();
    expect(useDashboardStore.getState().global_filters.length).toBe(0);

    // 5. Remove chart
    const removeRes = store.removeChart('last');
    expect(removeRes.ok).toBe(true);
    expect(useDashboardStore.getState().charts.length).toBe(0);

    // 6. Undo
    const undoRes = store.undo();
    expect(undoRes).toBe(true);
    expect(useDashboardStore.getState().charts.length).toBe(1);
  });

  it('runs Phase 5 required 5-step tool sequence exactly', () => {
    const store = useDashboardStore.getState();

    // Step 1: add revenue by region this_quarter
    const s1 = store.addChart({
      metric: 'revenue',
      group_by: 'region',
      time_range: { preset: 'this_quarter' },
    });
    expect(s1.ok).toBe(true);
    let chart = useDashboardStore.getState().charts[0];
    expect(chart.metric).toBe('revenue');
    expect(chart.group_by).toBe('region');
    expect(chart.time_range).toEqual({ preset: 'this_quarter' });

    // Step 2: update to Southeast filter + group_by category
    const s2 = store.updateChart({
      chart_id: 'last',
      filters: [{ dimension: 'region', values: ['Southeast'] }],
      group_by: 'category',
    });
    expect(s2.ok).toBe(true);
    chart = useDashboardStore.getState().charts[0];
    expect(chart.filters[0].values).toEqual(['Southeast']);
    expect(chart.group_by).toBe('category');

    // Step 3: update granularity week with group_by cleared
    const s3 = store.updateChart({
      chart_id: 'last',
      time_granularity: 'week',
      group_by: '', // cleared
    });
    expect(s3.ok).toBe(true);
    chart = useDashboardStore.getState().charts[0];
    expect(chart.time_granularity).toBe('week');
    expect(chart.group_by).toBeUndefined();

    // Step 4: compare previous_year
    const s4 = store.updateChart({
      chart_id: 'last',
      compare_to: 'previous_year',
    });
    expect(s4.ok).toBe(true);
    chart = useDashboardStore.getState().charts[0];
    expect(chart.compare_to).toBe('previous_year');

    // Step 5: undo twice
    expect(store.undo()).toBe(true); // Reverts step 4
    chart = useDashboardStore.getState().charts[0];
    expect(chart.compare_to).toBe('none');

    expect(store.undo()).toBe(true); // Reverts step 3
    chart = useDashboardStore.getState().charts[0];
    expect(chart.group_by).toBe('category');
    expect(chart.time_granularity).toBeUndefined();
  });

  it('handles multi-dashboard creation, switching, renaming, duplication, and deletion', () => {
    const store = useDashboardStore.getState();

    // 1. Create new dashboard
    const newId = store.createDashboard('Finance Overview', 'Financial metrics tracking');
    expect(newId).toBeDefined();
    expect(useDashboardStore.getState().activeDashboardId).toBe(newId);
    expect(useDashboardStore.getState().charts.length).toBe(0);

    // 2. Add chart to this new dashboard
    store.addChart({ metric: 'revenue', group_by: 'channel' });
    expect(useDashboardStore.getState().charts.length).toBe(1);

    // 3. Rename dashboard
    const renameOk = store.renameDashboard(newId, 'Global Revenue 2026', 'Updated description');
    expect(renameOk).toBe(true);
    const renamed = useDashboardStore.getState().dashboards.find(d => d.id === newId);
    expect(renamed?.title).toBe('Global Revenue 2026');

    // 4. Duplicate dashboard
    const dupId = store.duplicateDashboard(newId);
    expect(dupId).toBeDefined();
    expect(useDashboardStore.getState().activeDashboardId).toBe(dupId);
    expect(useDashboardStore.getState().charts.length).toBe(1);

    // 5. Delete duplicated dashboard
    const deleteOk = store.deleteDashboard(dupId);
    expect(deleteOk).toBe(true);
    expect(useDashboardStore.getState().dashboards.some(d => d.id === dupId)).toBe(false);
  });
});
