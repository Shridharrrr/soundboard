import React from 'react';
import { DollarSign, ShoppingBag, TrendingUp, Users, ArrowUpRight, Plus } from 'lucide-react';
import { useDashboardStore } from '../store/dashboard.js';

interface KpiRibbonProps {
  onAddMetricChart?: (metric: string) => void;
}

export const KpiRibbon: React.FC<KpiRibbonProps> = ({ onAddMetricChart }) => {
  const store = useDashboardStore();

  const metrics = [
    {
      id: 'revenue',
      label: 'Total Revenue',
      value: '$6,689,000',
      period: 'Q3 2026',
      delta: '+12.4%',
      isPositive: true,
      icon: DollarSign,
      actionMetric: 'revenue',
      subtext: 'vs $5,951,000 Q3 2025',
    },
    {
      id: 'orders',
      label: 'Order Volume',
      value: '5,420',
      period: 'Q3 2026',
      delta: '+8.1%',
      isPositive: true,
      icon: ShoppingBag,
      actionMetric: 'orders',
      subtext: '59.6 orders/day avg',
    },
    {
      id: 'aov',
      label: 'Average Order Value',
      value: '$284.15',
      period: 'Q3 2026',
      delta: '+3.9%',
      isPositive: true,
      icon: TrendingUp,
      actionMetric: 'aov',
      subtext: 'Southeast leading at $310',
    },
    {
      id: 'customers',
      label: 'Active Customers',
      value: '3,890',
      period: 'Q3 2026',
      delta: '+14.2%',
      isPositive: true,
      icon: Users,
      actionMetric: 'customers',
      subtext: '1,420 new buyers in Q3',
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5 max-w-[1600px] mx-auto">
      {metrics.map((kpi) => {
        const Icon = kpi.icon;
        const hasExistingChart = store.charts.some((c) => c.metric === kpi.actionMetric);

        return (
          <div
            key={kpi.id}
            className="p-3.5 rounded-xl border border-zinc-200/90 bg-white hover:border-zinc-300 hover:shadow-subtle transition-all duration-150 flex flex-col justify-between group"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-medium text-zinc-500 truncate">
                {kpi.label}
              </span>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200/60 inline-flex items-center gap-0.5">
                  <ArrowUpRight className="w-2.5 h-2.5" />
                  {kpi.delta}
                </span>
                {onAddMetricChart && !hasExistingChart && (
                  <button
                    onClick={() => onAddMetricChart(kpi.actionMetric)}
                    title={`Add ${kpi.label} chart`}
                    className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-zinc-100 text-zinc-400 hover:text-zinc-800 transition-opacity"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>

            <div className="flex items-baseline justify-between gap-2">
              <span className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-950 font-display">
                {kpi.value}
              </span>
              <span className="text-[10px] font-mono text-zinc-400 flex-shrink-0">
                {kpi.period}
              </span>
            </div>

            <div className="flex items-center justify-between text-[11px] text-zinc-400 mt-1 pt-1.5 border-t border-zinc-100/80">
              <span className="truncate">{kpi.subtext}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
};
