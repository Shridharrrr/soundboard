import React, { useState, useEffect } from 'react';
import { useDashboardStore } from '../store/dashboard.js';
import type { ChartSpec, ChartType, CompareTo, Granularity } from '@vd/shared';
import {
  X,
  Plus,
  BarChart3,
  TrendingUp,
  PieChart as PieChartIcon,
  Calendar,
  Sparkles,
  Sliders,
  ArrowRight,
  Check,
  CheckCircle2,
  DollarSign,
  ShoppingCart,
  Users,
  Package,
  Layers,
} from 'lucide-react';

interface AddComponentModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface PresetComponent {
  id: string;
  category: 'Revenue' | 'Trends' | 'Benchmarking' | 'Customers';
  title: string;
  description: string;
  metric: string;
  group_by?: string;
  time_granularity?: Granularity;
  time_range: { preset: any };
  compare_to: CompareTo;
  chart_type: ChartType;
  icon: React.FC<{ className?: string }>;
}

const PRESET_COMPONENTS: PresetComponent[] = [
  // Revenue & Sales Breakdowns
  {
    id: 'rev-reg-q3',
    category: 'Revenue',
    title: 'Q3 Revenue by Region',
    description: 'Regional sales distribution across Southeast, Northeast, Midwest, and West.',
    metric: 'revenue',
    group_by: 'region',
    time_range: { preset: 'this_quarter' },
    compare_to: 'none',
    chart_type: 'bar',
    icon: BarChart3,
  },
  {
    id: 'rev-cat-share',
    category: 'Revenue',
    title: 'Revenue Share by Category',
    description: 'Product category sales contribution for the current fiscal year.',
    metric: 'revenue',
    group_by: 'category',
    time_range: { preset: 'this_year' },
    compare_to: 'none',
    chart_type: 'donut',
    icon: PieChartIcon,
  },
  {
    id: 'rev-channel-bar',
    category: 'Revenue',
    title: 'Revenue by Channel',
    description: 'Breakdown across Web, Mobile App, Retail Store, and Marketplace.',
    metric: 'revenue',
    group_by: 'channel',
    time_range: { preset: 'this_quarter' },
    compare_to: 'none',
    chart_type: 'bar',
    icon: DollarSign,
  },

  // Trends & Time Series
  {
    id: 'ord-monthly-trend',
    category: 'Trends',
    title: 'Monthly Order Volume (2026)',
    description: '12-month order volume trajectory and seasonal purchasing momentum.',
    metric: 'orders',
    time_granularity: 'month',
    time_range: { preset: 'this_year' },
    compare_to: 'none',
    chart_type: 'area',
    icon: TrendingUp,
  },
  {
    id: 'rev-weekly-trend',
    category: 'Trends',
    title: 'Weekly Revenue Trajectory',
    description: 'Weekly sales velocity for Q3 2026 to track pacing against targets.',
    metric: 'revenue',
    time_granularity: 'week',
    time_range: { preset: 'this_quarter' },
    compare_to: 'none',
    chart_type: 'area',
    icon: Calendar,
  },
  {
    id: 'units-daily-trend',
    category: 'Trends',
    title: 'Daily Units Sold (Last 30 Days)',
    description: 'Daily warehouse inventory burn and item sales volume velocity.',
    metric: 'units',
    time_granularity: 'day',
    time_range: { preset: 'last_30_days' },
    compare_to: 'none',
    chart_type: 'line',
    icon: Package,
  },

  // Benchmarking & YoY
  {
    id: 'rev-cat-yoy',
    category: 'Benchmarking',
    title: 'Category Performance vs Previous Year',
    description: 'Side-by-side YoY revenue growth comparison across product lines.',
    metric: 'revenue',
    group_by: 'category',
    time_range: { preset: 'this_quarter' },
    compare_to: 'previous_year',
    chart_type: 'line',
    icon: TrendingUp,
  },
  {
    id: 'aov-channel-bench',
    category: 'Benchmarking',
    title: 'Average Order Value by Channel',
    description: 'Basket size economics comparison between online and retail channels.',
    metric: 'aov',
    group_by: 'channel',
    time_range: { preset: 'this_year' },
    compare_to: 'none',
    chart_type: 'bar',
    icon: ShoppingCart,
  },

  // Customers & Segments
  {
    id: 'cust-region-dist',
    category: 'Customers',
    title: 'Unique Customers by Region',
    description: 'Geographic distribution of distinct purchasing customer accounts.',
    metric: 'customers',
    group_by: 'region',
    time_range: { preset: 'this_quarter' },
    compare_to: 'none',
    chart_type: 'bar',
    icon: Users,
  },
];

const METRIC_OPTIONS = [
  { value: 'revenue', label: 'Revenue ($)', format: 'currency' },
  { value: 'orders', label: 'Order Count', format: 'integer' },
  { value: 'aov', label: 'Average Order Value ($)', format: 'currency' },
  { value: 'customers', label: 'Unique Customers', format: 'integer' },
  { value: 'units', label: 'Units Sold', format: 'integer' },
];

const DIMENSION_OPTIONS = [
  { value: '', label: 'None (Overall Aggregate)' },
  { value: 'region', label: 'Region (5 regions)' },
  { value: 'category', label: 'Product Category (8 categories)' },
  { value: 'channel', label: 'Sales Channel (4 channels)' },
];

const GRANULARITY_OPTIONS: Array<{ value: '' | Granularity; label: string }> = [
  { value: '', label: 'None (Categorical / Total)' },
  { value: 'day', label: 'Daily' },
  { value: 'week', label: 'Weekly' },
  { value: 'month', label: 'Monthly' },
  { value: 'quarter', label: 'Quarterly' },
];

const TIME_RANGE_OPTIONS = [
  { value: 'this_quarter', label: 'This Quarter (Q3 2026)' },
  { value: 'this_year', label: 'This Year (2026)' },
  { value: 'last_30_days', label: 'Last 30 Days' },
  { value: 'last_month', label: 'Last Month' },
  { value: 'last_quarter', label: 'Last Quarter' },
  { value: 'year_to_date', label: 'Year to Date' },
];

const CHART_TYPES: Array<{ value: ChartType; label: string; icon: React.FC<{ className?: string }> }> = [
  { value: 'bar', label: 'Bar Chart', icon: BarChart3 },
  { value: 'line', label: 'Line Trend', icon: TrendingUp },
  { value: 'area', label: 'Area Trajectory', icon: Calendar },
  { value: 'donut', label: 'Donut Breakdown', icon: PieChartIcon },
];

export const AddComponentModal: React.FC<AddComponentModalProps> = ({
  isOpen,
  onClose,
}) => {
  const store = useDashboardStore();
  const [activeTab, setActiveTab] = useState<'catalog' | 'custom'>('catalog');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [addedIds, setAddedIds] = useState<Record<string, boolean>>({});

  // Custom Builder State
  const [customMetric, setCustomMetric] = useState('revenue');
  const [customDimension, setCustomDimension] = useState('region');
  const [customGranularity, setCustomGranularity] = useState<'' | Granularity>('');
  const [customTimeRange, setCustomTimeRange] = useState('this_quarter');
  const [customCompareTo, setCustomCompareTo] = useState<CompareTo>('none');
  const [customChartType, setCustomChartType] = useState<ChartType>('bar');
  const [customTitle, setCustomTitle] = useState('');

  // Handle ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleAddPreset = (preset: PresetComponent) => {
    store.addChart({
      metric: preset.metric,
      group_by: preset.group_by,
      time_granularity: preset.time_granularity,
      time_range: preset.time_range,
      compare_to: preset.compare_to,
      chart_type: preset.chart_type,
      title: preset.title,
    });

    setAddedIds((prev) => ({ ...prev, [preset.id]: true }));
    setTimeout(() => {
      setAddedIds((prev) => ({ ...prev, [preset.id]: false }));
    }, 1800);
  };

  const handleCreateCustom = (e: React.FormEvent) => {
    e.preventDefault();
    store.addChart({
      metric: customMetric,
      group_by: customDimension || undefined,
      time_granularity: customGranularity || undefined,
      time_range: { preset: customTimeRange as any },
      compare_to: customCompareTo,
      chart_type: customChartType,
      title: customTitle.trim() || undefined,
    });
    onClose();
  };

  const categories = ['All', 'Revenue', 'Trends', 'Benchmarking', 'Customers'];
  const filteredPresets = PRESET_COMPONENTS.filter(
    (p) => selectedCategory === 'All' || p.category === selectedCategory
  );

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-zinc-950/45 backdrop-blur-xs p-4 sm:p-6 flex min-h-screen items-center justify-center animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="relative bg-white rounded-2xl border border-zinc-200 shadow-2xl w-full max-w-2xl my-auto flex flex-col max-h-[min(90vh,760px)] overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-zinc-100 flex items-center justify-between shrink-0 bg-white">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-zinc-900 text-white flex items-center justify-center shadow-xs flex-shrink-0">
              <Plus className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-display font-semibold text-sm text-zinc-950">Add Dashboard Component</h2>
              <p className="text-xs text-zinc-500">Select pre-built intelligent modules or design a custom metric query</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            title="Close (Esc)"
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="px-6 pt-3 pb-2 border-b border-zinc-100 bg-zinc-50/50 flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-1.5 p-1 bg-zinc-200/60 rounded-xl">
            <button
              onClick={() => setActiveTab('catalog')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === 'catalog'
                  ? 'bg-white text-zinc-950 shadow-xs'
                  : 'text-zinc-600 hover:text-zinc-950'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-zinc-700" />
              <span>Intelligent Catalog</span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-zinc-100 text-zinc-600">
                {PRESET_COMPONENTS.length}
              </span>
            </button>
            <button
              onClick={() => setActiveTab('custom')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === 'custom'
                  ? 'bg-white text-zinc-950 shadow-xs'
                  : 'text-zinc-600 hover:text-zinc-950'
              }`}
            >
              <Sliders className="w-3.5 h-3.5 text-zinc-700" />
              <span>Custom Metric Builder</span>
            </button>
          </div>

          <span className="text-xs text-zinc-400 hidden sm:inline-block font-mono">
            {store.charts.length} charts on dashboard
          </span>
        </div>

        {/* Modal Body */}
        {activeTab === 'catalog' ? (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Category Filter Pills */}
            <div className="px-6 py-2.5 border-b border-zinc-100 flex items-center gap-1.5 overflow-x-auto shrink-0 bg-white">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                    selectedCategory === cat
                      ? 'bg-zinc-900 text-white shadow-2xs'
                      : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200/70 hover:text-zinc-950'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Catalog Grid */}
            <div className="p-6 overflow-y-auto flex-1 space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {filteredPresets.map((preset) => {
                  const Icon = preset.icon;
                  const isAdded = Boolean(addedIds[preset.id]);

                  return (
                    <div
                      key={preset.id}
                      className="p-4 rounded-xl border border-zinc-200 bg-white hover:border-zinc-300 hover:shadow-subtle transition-all flex flex-col justify-between group"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2.5">
                          <div className="w-7 h-7 rounded-lg bg-zinc-100 text-zinc-800 flex items-center justify-center flex-shrink-0 group-hover:bg-zinc-900 group-hover:text-white transition-colors">
                            <Icon className="w-3.5 h-3.5" />
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-600 uppercase border border-zinc-200/80">
                              {preset.chart_type}
                            </span>
                            <span className="text-[10px] text-zinc-400 font-medium">
                              {preset.category}
                            </span>
                          </div>
                        </div>

                        <h3 className="font-semibold text-xs text-zinc-950 mb-1 leading-snug">
                          {preset.title}
                        </h3>
                        <p className="text-[11px] text-zinc-500 leading-relaxed">
                          {preset.description}
                        </p>
                      </div>

                      <div className="pt-3.5 mt-3 border-t border-zinc-100 flex items-center justify-between">
                        <span className="text-[11px] font-mono text-zinc-400">
                          {preset.time_range.preset.replace(/_/g, ' ')}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleAddPreset(preset)}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium shadow-2xs transition-all active:scale-[0.97] ${
                            isAdded
                              ? 'bg-emerald-600 text-white'
                              : 'bg-zinc-900 hover:bg-zinc-800 text-white'
                          }`}
                        >
                          {isAdded ? (
                            <>
                              <Check className="w-3.5 h-3.5" />
                              <span>Added!</span>
                            </>
                          ) : (
                            <>
                              <Plus className="w-3.5 h-3.5" />
                              <span>Add Component</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          /* Custom Builder Tab */
          <form onSubmit={handleCreateCustom} className="flex-1 flex flex-col overflow-hidden">
            <div className="p-6 space-y-4 overflow-y-auto flex-1">
              {/* Optional Custom Title */}
              <div>
                <label className="block text-xs font-semibold text-zinc-800 mb-1.5">
                  Component Title <span className="text-zinc-400 font-normal">(Auto-generated if empty)</span>
                </label>
                <input
                  type="text"
                  value={customTitle}
                  onChange={(e) => setCustomTitle(e.target.value)}
                  placeholder="e.g. Northeast Regional Electronics Performance"
                  className="w-full px-3.5 py-2 rounded-xl bg-white border border-zinc-200 text-xs text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-900 focus:border-zinc-900 shadow-xs"
                />
              </div>

              {/* Metric & Dimension Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-800 mb-1.5">
                    Metric
                  </label>
                  <select
                    value={customMetric}
                    onChange={(e) => setCustomMetric(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-zinc-200 text-xs text-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900 shadow-xs"
                  >
                    {METRIC_OPTIONS.map((m) => (
                      <option key={m.value} value={m.value}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-800 mb-1.5">
                    Group By Dimension
                  </label>
                  <select
                    value={customDimension}
                    onChange={(e) => {
                      setCustomDimension(e.target.value);
                      if (e.target.value && customGranularity) {
                        setCustomGranularity('');
                      }
                    }}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-zinc-200 text-xs text-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900 shadow-xs"
                  >
                    {DIMENSION_OPTIONS.map((d) => (
                      <option key={d.value} value={d.value}>
                        {d.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Time Granularity & Range Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-800 mb-1.5">
                    Time Granularity <span className="text-zinc-400 font-normal">(For trends)</span>
                  </label>
                  <select
                    value={customGranularity}
                    onChange={(e) => {
                      const val = e.target.value as '' | Granularity;
                      setCustomGranularity(val);
                      if (val) {
                        setCustomChartType(val === 'month' ? 'area' : 'line');
                      }
                    }}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-zinc-200 text-xs text-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900 shadow-xs"
                  >
                    {GRANULARITY_OPTIONS.map((g) => (
                      <option key={g.value} value={g.value}>
                        {g.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-800 mb-1.5">
                    Time Window
                  </label>
                  <select
                    value={customTimeRange}
                    onChange={(e) => setCustomTimeRange(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-zinc-200 text-xs text-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900 shadow-xs"
                  >
                    {TIME_RANGE_OPTIONS.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Chart Type Selector */}
              <div>
                <label className="block text-xs font-semibold text-zinc-800 mb-2">
                  Visualization Type
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {CHART_TYPES.map((ct) => {
                    const Icon = ct.icon;
                    const isSelected = customChartType === ct.value;
                    return (
                      <button
                        key={ct.value}
                        type="button"
                        onClick={() => setCustomChartType(ct.value)}
                        className={`p-2.5 rounded-xl border text-center flex flex-col items-center gap-1.5 transition-all ${
                          isSelected
                            ? 'bg-zinc-900 text-white border-zinc-900 shadow-xs ring-1 ring-zinc-900/10'
                            : 'bg-white border-zinc-200 text-zinc-700 hover:border-zinc-300 hover:bg-zinc-50'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        <span className="text-[11px] font-medium">{ct.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Compare To */}
              <div>
                <label className="block text-xs font-semibold text-zinc-800 mb-1.5">
                  Period Comparison
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: 'none', label: 'No Comparison' },
                    { value: 'previous_period', label: 'Prior Period' },
                    { value: 'previous_year', label: 'Previous Year (YoY)' },
                  ].map((comp) => (
                    <button
                      key={comp.value}
                      type="button"
                      onClick={() => setCustomCompareTo(comp.value as CompareTo)}
                      className={`py-2 px-2.5 rounded-xl border text-xs font-medium transition-all ${
                        customCompareTo === comp.value
                          ? 'bg-zinc-900 text-white border-zinc-900 shadow-xs'
                          : 'bg-white border-zinc-200 text-zinc-700 hover:bg-zinc-50'
                      }`}
                    >
                      {comp.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Custom Builder Footer */}
            <div className="px-6 py-3.5 border-t border-zinc-100 flex items-center justify-end gap-2.5 shrink-0 bg-zinc-50/80">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl border border-zinc-200 bg-white text-xs font-medium text-zinc-700 hover:bg-zinc-50 transition-colors shadow-2xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-medium shadow-xs transition-all active:scale-[0.98]"
              >
                <span>Add to Dashboard</span>
                <ArrowRight className="w-3.5 h-3.5 text-zinc-400" />
              </button>
            </div>
          </form>
        )}

        {/* Catalog Footer */}
        {activeTab === 'catalog' && (
          <div className="px-6 py-3.5 border-t border-zinc-100 flex items-center justify-between shrink-0 bg-zinc-50/80">
            <span className="text-[11px] text-zinc-500">
              Click &ldquo;Add Component&rdquo; to add modules instantly to your current view.
            </span>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-medium shadow-xs transition-all active:scale-[0.98]"
            >
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
