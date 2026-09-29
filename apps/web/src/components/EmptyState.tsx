import React from 'react';
import {
  Mic,
  BarChart3,
  TrendingUp,
  Calendar,
  ArrowRight,
  LayoutTemplate,
  Plus,
  Sparkles,
  PieChart,
} from 'lucide-react';
import { useDashboardStore } from '../store/dashboard.js';

interface EmptyStateProps {
  onSelectPrompt: (phrase: string) => void;
  onAddComponent?: () => void;
  onCreateDashboard?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  onSelectPrompt,
  onAddComponent,
  onCreateDashboard,
}) => {
  const store = useDashboardStore();

  const handleAddStarterPack = (packType: 'executive' | 'category') => {
    if (packType === 'executive') {
      store.addChart({
        title: 'Q3 Revenue by Region',
        metric: 'revenue',
        group_by: 'region',
        time_range: { preset: 'this_quarter' },
        chart_type: 'bar',
      });
      store.addChart({
        title: 'Monthly Order Volume (2026)',
        metric: 'orders',
        time_granularity: 'month',
        time_range: { preset: 'this_year' },
        chart_type: 'area',
      });
    } else {
      store.addChart({
        title: 'Revenue Share by Category',
        metric: 'revenue',
        group_by: 'category',
        time_range: { preset: 'this_year' },
        chart_type: 'donut',
      });
      store.addChart({
        title: 'Category Performance vs Previous Year',
        metric: 'revenue',
        group_by: 'category',
        time_range: { preset: 'this_quarter' },
        compare_to: 'previous_year',
        chart_type: 'line',
      });
    }
  };

  const examplePhrases = [
    {
      title: 'Regional Breakdown',
      phrase: 'Show revenue by region for Q3',
      description: 'Regional performance with Q3 2026 data',
      icon: BarChart3,
    },
    {
      title: 'Time Series Trend',
      phrase: 'Show orders monthly for Electronics',
      description: 'Monthly order volume through 2026',
      icon: Calendar,
    },
    {
      title: 'Year-over-Year Comparison',
      phrase: 'Compare revenue by category to last year',
      description: 'Category performance vs previous year',
      icon: TrendingUp,
    },
  ];

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center max-w-2xl mx-auto my-auto">
      {/* Icon */}
      <div className="w-12 h-12 rounded-2xl bg-zinc-900 text-white flex items-center justify-center mb-5 shadow-xs">
        <Mic className="w-5 h-5" />
      </div>

      {/* Header */}
      <h2 className="text-2xl font-normal font-serif text-zinc-950 tracking-[-0.015em] mb-2">
        Build Your Intelligent Dashboard
      </h2>
      <p className="text-xs text-zinc-500 mb-6 max-w-md leading-relaxed">
        Speak questions to stream live metrics, select pre-built intelligent components, or quick-add curated starter suites.
      </p>

      {/* Primary Actions */}
      <div className="flex flex-wrap items-center justify-center gap-3 mb-8 w-full max-w-md">
        {onAddComponent && (
          <button
            onClick={onAddComponent}
            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-medium shadow-xs transition-all active:scale-[0.98]"
          >
            <Plus className="w-4 h-4" />
            <span>Add Component</span>
          </button>
        )}

        <button
          onClick={() => handleAddStarterPack('executive')}
          className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white hover:bg-zinc-50 border border-zinc-200 text-zinc-800 text-xs font-medium shadow-2xs transition-colors"
        >
          <Sparkles className="w-3.5 h-3.5 text-zinc-600" />
          <span>Load Executive Suite</span>
        </button>
      </div>

      {/* Voice Prompt Suggestions */}
      <div className="w-full flex flex-col gap-2 max-w-lg text-left">
        <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1 text-center">
          Or Spoken Quick-Start Queries
        </span>
        {examplePhrases.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.phrase}
              onClick={() => onSelectPrompt(item.phrase)}
              className="w-full group flex items-center justify-between p-3 rounded-xl border border-zinc-200/90 bg-white hover:border-zinc-300 hover:shadow-subtle transition-all duration-150 active:scale-[0.99]"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-7 h-7 rounded-lg bg-zinc-100 flex items-center justify-center text-zinc-600 group-hover:text-zinc-900 group-hover:bg-zinc-200/60 transition-colors flex-shrink-0">
                  <Icon className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0 flex-1 truncate">
                  <p className="text-xs font-medium text-zinc-900 group-hover:text-black transition-colors truncate">
                    &ldquo;{item.phrase}&rdquo;
                  </p>
                  <p className="text-[11px] text-zinc-400 truncate">{item.description}</p>
                </div>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-zinc-400 group-hover:text-zinc-800 group-hover:translate-x-0.5 transition-all flex-shrink-0 ml-2" />
            </button>
          );
        })}
      </div>

      {/* Starter Template Option */}
      {onCreateDashboard && (
        <div className="mt-6 pt-4 border-t border-zinc-200/80 w-full max-w-lg flex items-center justify-center">
          <button
            onClick={onCreateDashboard}
            className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-900 font-medium px-3 py-1.5 rounded-lg border border-zinc-200/80 bg-white hover:bg-zinc-50 transition-colors shadow-2xs"
          >
            <LayoutTemplate className="w-3.5 h-3.5 text-zinc-500" />
            <span>Create new dashboard from layout templates</span>
          </button>
        </div>
      )}
    </div>
  );
};
