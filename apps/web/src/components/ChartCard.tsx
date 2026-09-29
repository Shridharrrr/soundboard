import React, { useState } from 'react';
import type { ChartSpec, QueryResultSuccess } from '@vd/shared';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  Code,
  Trash2,
  Filter as FilterIcon,
  Sparkles,
  Calendar,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ChartCardProps {
  chart: ChartSpec;
  result?: QueryResultSuccess;
  loading?: boolean;
  isHighlighted?: boolean;
  highlightedProperty?: string;
  onRemove: (id: string) => void;
}

const PALETTE = ['#6366f1', '#06b6d4', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#14b8a6', '#f43f5e'];

function formatMetricValue(val: number | string | null | undefined, format?: string): string {
  if (val === null || val === undefined) return '-';
  const num = Number(val);
  if (isNaN(num)) return String(val);

  if (format === 'currency') {
    if (Math.abs(num) >= 1_000_000) return `$${(num / 1_000_000).toFixed(2)}M`;
    if (Math.abs(num) >= 1_000) return `$${(num / 1_000).toFixed(1)}k`;
    return `$${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  if (format === 'percent') {
    return `${num.toFixed(1)}%`;
  }
  return num.toLocaleString('en-US');
}

export const ChartCard: React.FC<ChartCardProps> = ({
  chart,
  result,
  loading = false,
  isHighlighted = false,
  highlightedProperty,
  onRemove,
}) => {
  const [showSql, setShowSql] = useState(false);

  const deltaPct = result?.insight_facts?.delta_pct;
  const isPositiveDelta = deltaPct !== undefined && deltaPct >= 0;

  // Prepare chart data rows
  const rawRows = result?.rows || [];
  const chartData = rawRows.map(r => ({
    name: r.period || r.grp || 'Total',
    value: r.value !== null && r.value !== undefined ? Number(r.value) : 0,
    comparison_value:
      r.comparison_value !== null && r.comparison_value !== undefined
        ? Number(r.comparison_value)
        : undefined,
  }));

  const hasComparison = chartData.some(d => d.comparison_value !== undefined);
  const metricFormat = result?.metric?.format;

  // Render chart body
  const renderChartGraphic = () => {
    if (loading) {
      return (
        <div className="h-64 flex flex-col items-center justify-center gap-2">
          <div className="w-8 h-8 rounded-full border-2 border-brand-500 border-t-transparent animate-spin" />
          <span className="text-xs text-slate-400">Loading data...</span>
        </div>
      );
    }

    if (chartData.length === 0) {
      return (
        <div className="h-64 flex items-center justify-center text-xs text-slate-500 italic">
          No records matched the current query criteria
        </div>
      );
    }

    switch (chart.chart_type) {
      case 'donut':
        return (
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie
                data={chartData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={85}
                paddingAngle={4}
              >
                {chartData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={PALETTE[index % PALETTE.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ backgroundColor: '#141824', borderColor: '#232b40', borderRadius: '8px' }}
                formatter={(val: any) => [formatMetricValue(val, metricFormat), result?.metric?.label || 'Value']}
              />
              <Legend wrapperStyle={{ fontSize: '11px', color: '#94a3b8' }} />
            </PieChart>
          </ResponsiveContainer>
        );

      case 'area':
        return (
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id={`grad-${chart.id}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.6} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f293d" vertical={false} />
              <XAxis dataKey="name" stroke="#64748b" tick={{ fontSize: 11 }} />
              <YAxis stroke="#64748b" tick={{ fontSize: 11 }} tickFormatter={v => formatMetricValue(v, metricFormat)} />
              <Tooltip
                contentStyle={{ backgroundColor: '#141824', borderColor: '#232b40', borderRadius: '8px' }}
                formatter={(val: any) => [formatMetricValue(val, metricFormat), result?.metric?.label || 'Value']}
              />
              {hasComparison && <Legend wrapperStyle={{ fontSize: '11px', color: '#94a3b8' }} />}
              <Area type="monotone" dataKey="value" stroke="#818cf8" strokeWidth={2} fillOpacity={1} fill={`url(#grad-${chart.id})`} name={result?.metric?.label || 'Current'} />
              {hasComparison && (
                <Area type="monotone" dataKey="comparison_value" stroke="#06b6d4" strokeDasharray="4 4" strokeWidth={2} fillOpacity={0} name="Comparison" />
              )}
            </AreaChart>
          </ResponsiveContainer>
        );

      case 'line':
        return (
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f293d" vertical={false} />
              <XAxis dataKey="name" stroke="#64748b" tick={{ fontSize: 11 }} />
              <YAxis stroke="#64748b" tick={{ fontSize: 11 }} tickFormatter={v => formatMetricValue(v, metricFormat)} />
              <Tooltip
                contentStyle={{ backgroundColor: '#141824', borderColor: '#232b40', borderRadius: '8px' }}
                formatter={(val: any) => [formatMetricValue(val, metricFormat), result?.metric?.label || 'Value']}
              />
              <Legend wrapperStyle={{ fontSize: '11px', color: '#94a3b8' }} />
              <Line type="monotone" dataKey="value" stroke="#818cf8" strokeWidth={2.5} dot={{ r: 3, fill: '#818cf8' }} activeDot={{ r: 6 }} name={result?.metric?.label || 'Current'} />
              {hasComparison && (
                <Line type="monotone" dataKey="comparison_value" stroke="#06b6d4" strokeWidth={2} strokeDasharray="4 4" dot={{ r: 2, fill: '#06b6d4' }} name="Comparison" />
              )}
            </LineChart>
          </ResponsiveContainer>
        );

      case 'bar':
      case 'stacked_bar':
      default:
        return (
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f293d" vertical={false} />
              <XAxis dataKey="name" stroke="#64748b" tick={{ fontSize: 11 }} />
              <YAxis stroke="#64748b" tick={{ fontSize: 11 }} tickFormatter={v => formatMetricValue(v, metricFormat)} />
              <Tooltip
                contentStyle={{ backgroundColor: '#141824', borderColor: '#232b40', borderRadius: '8px' }}
                formatter={(val: any) => [formatMetricValue(val, metricFormat), result?.metric?.label || 'Value']}
              />
              {hasComparison && <Legend wrapperStyle={{ fontSize: '11px', color: '#94a3b8' }} />}
              <Bar dataKey="value" fill="#6366f1" radius={[4, 4, 0, 0]} name={result?.metric?.label || 'Current'} />
              {hasComparison && (
                <Bar dataKey="comparison_value" fill="#06b6d4" opacity={0.7} radius={[4, 4, 0, 0]} name="Comparison" />
              )}
            </BarChart>
          </ResponsiveContainer>
        );
    }
  };

  // Generate plain English insight line
  const renderInsightText = () => {
    if (!result?.insight_facts) return null;
    const f = result.insight_facts;
    const parts: string[] = [];

    if (f.delta_pct !== undefined) {
      parts.push(`${deltaPct! >= 0 ? '+' : ''}${f.delta_pct}% vs comparison`);
    }

    if (f.top_group && f.top_group_share) {
      parts.push(`Top: ${f.top_group} (${f.top_group_share}% of total)`);
    }

    if (f.peak_period) {
      parts.push(`Peak: ${f.peak_period}`);
    }

    if (parts.length === 0) {
      parts.push(`Total: ${formatMetricValue(f.total, metricFormat)}`);
    }

    return parts.join(' · ');
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.25 }}
      className={`glass-panel rounded-xl p-4 flex flex-col gap-3 relative transition-all duration-300 ${
        isHighlighted ? 'border-brand-500 shadow-[0_0_20px_rgba(99,102,241,0.25)]' : 'border-slate-800'
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col gap-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-dark-750 text-slate-400 border border-slate-700/50">
              {chart.id}
            </span>
            <h3 className="font-semibold text-sm text-slate-100 truncate">{chart.title}</h3>
          </div>

          {/* Metadata Chips */}
          <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-400 mt-0.5">
            {chart.time_granularity && (
              <span
                className={`px-2 py-0.5 rounded-full border ${
                  highlightedProperty === 'granularity'
                    ? 'bg-brand-500/20 text-brand-300 border-brand-400 animate-pulse'
                    : 'bg-dark-800 border-slate-700/60'
                }`}
              >
                {chart.time_granularity}ly
              </span>
            )}

            {chart.group_by && (
              <span
                className={`px-2 py-0.5 rounded-full border ${
                  highlightedProperty === 'group_by'
                    ? 'bg-brand-500/20 text-brand-300 border-brand-400 animate-pulse'
                    : 'bg-dark-800 border-slate-700/60'
                }`}
              >
                by {chart.group_by}
              </span>
            )}

            {chart.filters.map(f => (
              <span
                key={f.dimension}
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border ${
                  highlightedProperty === 'filters'
                    ? 'bg-brand-500/20 text-brand-300 border-brand-400 animate-pulse'
                    : 'bg-dark-800 border-slate-700/60'
                }`}
              >
                <FilterIcon className="w-2.5 h-2.5 text-brand-400" />
                {f.dimension}: {f.values.join('/')}
              </span>
            ))}

            {chart.compare_to !== 'none' && (
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border ${
                  highlightedProperty === 'comparison'
                    ? 'bg-cyan-500/20 text-cyan-300 border-cyan-400 animate-pulse'
                    : 'bg-dark-800 border-slate-700/60 text-cyan-400'
                }`}
              >
                <Calendar className="w-2.5 h-2.5" />
                vs {chart.compare_to === 'previous_year' ? 'prev year' : 'prev period'}
              </span>
            )}
          </div>
        </div>

        {/* Action Controls & Delta Badge */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {deltaPct !== undefined && (
            <div
              className={`flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full border ${
                isPositiveDelta
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                  : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
              }`}
            >
              {isPositiveDelta ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              <span>{isPositiveDelta ? `+${deltaPct}%` : `${deltaPct}%`}</span>
            </div>
          )}

          <button
            onClick={() => setShowSql(!showSql)}
            title="Toggle SQL"
            className={`p-1.5 rounded-md border text-xs transition-colors ${
              showSql
                ? 'bg-brand-500/20 border-brand-500/40 text-brand-300'
                : 'bg-dark-800 border-slate-700/60 text-slate-400 hover:text-slate-200'
            }`}
          >
            <Code className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => onRemove(chart.id)}
            title="Remove chart"
            className="p-1.5 rounded-md bg-dark-800 border border-slate-700/60 text-slate-400 hover:text-rose-400 hover:border-rose-500/40 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* SQL Block Toggle */}
      <AnimatePresence>
        {showSql && result?.sql && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <pre className="p-2.5 rounded-lg bg-dark-900 border border-slate-800 text-[11px] font-mono text-cyan-300/90 overflow-x-auto selection:bg-brand-600">
              <code>{result.sql}</code>
            </pre>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Chart Graphic */}
      <div className="mt-1">{renderChartGraphic()}</div>

      {/* Footer Insight */}
      <div className="flex items-center gap-1.5 text-xs text-slate-400 pt-2 border-t border-slate-800/80">
        <Sparkles className="w-3.5 h-3.5 text-brand-400 flex-shrink-0" />
        <span className="truncate">{renderInsightText() || 'Generating insights...'}</span>
      </div>
    </motion.div>
  );
};
