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
  Code2,
  Trash2,
  Filter as FilterIcon,
  Sparkles,
  Calendar,
  ArrowLeft,
  ArrowRight,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ChartCardProps {
  chart: ChartSpec;
  result?: QueryResultSuccess;
  loading?: boolean;
  isHighlighted?: boolean;
  highlightedProperty?: string;
  canMoveLeft?: boolean;
  canMoveRight?: boolean;
  onMoveLeft?: () => void;
  onMoveRight?: () => void;
  onSelect?: () => void;
  onRemove: (id: string) => void;
}

const PALETTE = ['#18181b', '#4f46e5', '#0284c7', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#64748b'];

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
  canMoveLeft = false,
  canMoveRight = false,
  onMoveLeft,
  onMoveRight,
  onSelect,
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

  // Render chart body in sleek light theme
  const renderChartGraphic = () => {
    if (loading) {
      return (
        <div className="h-60 flex flex-col items-center justify-center gap-2">
          <div className="w-6 h-6 rounded-full border-2 border-zinc-900 border-t-transparent animate-spin" />
          <span className="text-[11px] text-zinc-400">Loading data...</span>
        </div>
      );
    }

    if (chartData.length === 0) {
      return (
        <div className="h-60 flex items-center justify-center text-xs text-zinc-400 italic">
          No records matched the current query criteria
        </div>
      );
    }

    switch (chart.chart_type) {
      case 'donut':
        return (
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie
                data={chartData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={85}
                paddingAngle={3}
              >
                {chartData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={PALETTE[index % PALETTE.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: '#ffffff',
                  borderColor: '#e4e4e7',
                  borderRadius: '8px',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
                  fontSize: '11px',
                  color: '#18181b',
                }}
                formatter={(val: any) => [formatMetricValue(val, metricFormat), result?.metric?.label || 'Value']}
              />
              <Legend wrapperStyle={{ fontSize: '11px', color: '#71717a' }} />
            </PieChart>
          </ResponsiveContainer>
        );

      case 'area':
        return (
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id={`grad-${chart.id}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#18181b" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#18181b" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" vertical={false} />
              <XAxis dataKey="name" stroke="#a1a1aa" tick={{ fontSize: 11 }} tickLine={false} axisLine={{ stroke: '#e4e4e7' }} />
              <YAxis stroke="#a1a1aa" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={v => formatMetricValue(v, metricFormat)} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#ffffff',
                  borderColor: '#e4e4e7',
                  borderRadius: '8px',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
                  fontSize: '11px',
                  color: '#18181b',
                }}
                formatter={(val: any) => [formatMetricValue(val, metricFormat), result?.metric?.label || 'Value']}
              />
              {hasComparison && <Legend wrapperStyle={{ fontSize: '11px', color: '#71717a' }} />}
              <Area type="monotone" dataKey="value" stroke="#18181b" strokeWidth={2} fillOpacity={1} fill={`url(#grad-${chart.id})`} name={result?.metric?.label || 'Current'} />
              {hasComparison && (
                <Area type="monotone" dataKey="comparison_value" stroke="#0284c7" strokeDasharray="4 4" strokeWidth={2} fillOpacity={0} name="Comparison" />
              )}
            </AreaChart>
          </ResponsiveContainer>
        );

      case 'line':
        return (
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" vertical={false} />
              <XAxis dataKey="name" stroke="#a1a1aa" tick={{ fontSize: 11 }} tickLine={false} axisLine={{ stroke: '#e4e4e7' }} />
              <YAxis stroke="#a1a1aa" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={v => formatMetricValue(v, metricFormat)} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#ffffff',
                  borderColor: '#e4e4e7',
                  borderRadius: '8px',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
                  fontSize: '11px',
                  color: '#18181b',
                }}
                formatter={(val: any) => [formatMetricValue(val, metricFormat), result?.metric?.label || 'Value']}
              />
              <Legend wrapperStyle={{ fontSize: '11px', color: '#71717a' }} />
              <Line type="monotone" dataKey="value" stroke="#18181b" strokeWidth={2.25} dot={{ r: 3, fill: '#18181b' }} activeDot={{ r: 5 }} name={result?.metric?.label || 'Current'} />
              {hasComparison && (
                <Line type="monotone" dataKey="comparison_value" stroke="#0284c7" strokeWidth={2} strokeDasharray="4 4" dot={{ r: 2, fill: '#0284c7' }} name="Comparison" />
              )}
            </LineChart>
          </ResponsiveContainer>
        );

      case 'bar':
      case 'stacked_bar':
      default:
        return (
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" vertical={false} />
              <XAxis dataKey="name" stroke="#a1a1aa" tick={{ fontSize: 11 }} tickLine={false} axisLine={{ stroke: '#e4e4e7' }} />
              <YAxis stroke="#a1a1aa" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={v => formatMetricValue(v, metricFormat)} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#ffffff',
                  borderColor: '#e4e4e7',
                  borderRadius: '8px',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
                  fontSize: '11px',
                  color: '#18181b',
                }}
                formatter={(val: any) => [formatMetricValue(val, metricFormat), result?.metric?.label || 'Value']}
              />
              {hasComparison && <Legend wrapperStyle={{ fontSize: '11px', color: '#71717a' }} />}
              <Bar dataKey="value" fill="#18181b" radius={[4, 4, 0, 0]} name={result?.metric?.label || 'Current'} />
              {hasComparison && (
                <Bar dataKey="comparison_value" fill="#0284c7" opacity={0.8} radius={[4, 4, 0, 0]} name="Comparison" />
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
      layout
      layoutId={chart.id}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{
        layout: { type: 'spring', damping: 26, stiffness: 280 },
        opacity: { duration: 0.2 },
      }}
      onClick={onSelect}
      className={`bg-white rounded-xl p-4 flex flex-col gap-3 relative transition-colors duration-200 border cursor-pointer select-none ${
        isHighlighted
          ? 'border-zinc-900 shadow-md ring-2 ring-zinc-900/10'
          : 'border-zinc-200/90 shadow-xs hover:shadow-subtle hover:border-zinc-300'
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono font-medium uppercase tracking-wider px-1.5 py-0.5 rounded bg-zinc-100 text-zinc-500 border border-zinc-200">
              {chart.id}
            </span>
            <h3 className="font-semibold text-xs text-zinc-900 truncate tracking-tight">
              {chart.title}
            </h3>
          </div>

          {/* Metadata Chips */}
          <div className="flex flex-wrap items-center gap-1 text-[11px] text-zinc-500 mt-0.5">
            {chart.time_granularity && (
              <span
                className={`px-2 py-0.5 rounded-full border transition-all ${
                  highlightedProperty === 'granularity'
                    ? 'bg-zinc-900 text-white border-zinc-900'
                    : 'bg-zinc-50 border-zinc-200 text-zinc-600'
                }`}
              >
                {chart.time_granularity}ly
              </span>
            )}

            {chart.group_by && (
              <span
                className={`px-2 py-0.5 rounded-full border transition-all ${
                  highlightedProperty === 'group_by'
                    ? 'bg-zinc-900 text-white border-zinc-900'
                    : 'bg-zinc-50 border-zinc-200 text-zinc-600'
                }`}
              >
                by {chart.group_by}
              </span>
            )}

            {chart.filters.map(f => (
              <span
                key={f.dimension}
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border transition-all ${
                  highlightedProperty === 'filters'
                    ? 'bg-zinc-900 text-white border-zinc-900'
                    : 'bg-zinc-50 border-zinc-200 text-zinc-600'
                }`}
              >
                <FilterIcon className="w-2.5 h-2.5 text-zinc-400" />
                {f.dimension}: {f.values.join('/')}
              </span>
            ))}

            {chart.compare_to !== 'none' && (
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border transition-all ${
                  highlightedProperty === 'comparison'
                    ? 'bg-zinc-900 text-white border-zinc-900'
                    : 'bg-sky-50 border-sky-200 text-sky-700'
                }`}
              >
                <Calendar className="w-2.5 h-2.5" />
                vs {chart.compare_to === 'previous_year' ? 'prev year' : 'prev period'}
              </span>
            )}
          </div>
        </div>

        {/* Action Controls & Delta Badge */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {/* Shifting Buttons */}
          {(canMoveLeft || canMoveRight) && (
            <div
              className="flex items-center rounded-lg border border-zinc-200 bg-white p-0.5 shadow-2xs mr-1"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={onMoveLeft}
                disabled={!canMoveLeft}
                title="Shift left / earlier"
                className="p-1 rounded text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 disabled:opacity-25 disabled:pointer-events-none transition-colors"
              >
                <ArrowLeft className="w-3 h-3" />
              </button>
              <div className="w-px h-3 bg-zinc-200" />
              <button
                type="button"
                onClick={onMoveRight}
                disabled={!canMoveRight}
                title="Shift right / later"
                className="p-1 rounded text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 disabled:opacity-25 disabled:pointer-events-none transition-colors"
              >
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          )}

          {deltaPct !== undefined && (
            <div
              className={`flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full border ${
                isPositiveDelta
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-rose-50 text-rose-700 border-rose-200'
              }`}
            >
              {isPositiveDelta ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              <span>{isPositiveDelta ? `+${deltaPct}%` : `${deltaPct}%`}</span>
            </div>
          )}

          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowSql(!showSql);
            }}
            title="Inspect compiled SQL"
            className={`p-1.5 rounded-lg border text-xs transition-colors ${
              showSql
                ? 'bg-zinc-900 border-zinc-900 text-white'
                : 'bg-white border-zinc-200 text-zinc-500 hover:text-zinc-900 hover:bg-zinc-50'
            }`}
          >
            <Code2 className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              onRemove(chart.id);
            }}
            title="Remove chart"
            className="p-1.5 rounded-lg border border-zinc-200 bg-white text-zinc-400 hover:text-rose-600 hover:border-rose-200 hover:bg-rose-50/50 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* SQL Drawer */}
      <AnimatePresence>
        {showSql && result?.sql && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="relative group">
              <pre className="p-3 rounded-lg bg-zinc-950 text-zinc-300 font-mono text-[11px] leading-relaxed overflow-x-auto border border-zinc-800">
                <code>{result.sql}</code>
              </pre>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Chart Graphic */}
      <div className="mt-1">{renderChartGraphic()}</div>

      {/* Footer Insight */}
      <div className="flex items-center gap-1.5 text-xs text-zinc-600 pt-2.5 border-t border-zinc-100">
        <Sparkles className="w-3.5 h-3.5 text-zinc-400 flex-shrink-0" />
        <span className="truncate">{renderInsightText() || 'Generating insights...'}</span>
      </div>
    </motion.div>
  );
};
