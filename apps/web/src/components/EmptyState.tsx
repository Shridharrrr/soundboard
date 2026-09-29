import React from 'react';
import { Mic, BarChart3, TrendingUp, Calendar, ArrowRight } from 'lucide-react';

interface EmptyStateProps {
  onSelectPrompt: (phrase: string) => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ onSelectPrompt }) => {
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
    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center max-w-lg mx-auto my-auto">
      {/* Icon */}
      <div className="w-12 h-12 rounded-2xl bg-zinc-900 text-white flex items-center justify-center mb-5 shadow-xs">
        <Mic className="w-5 h-5" />
      </div>

      {/* Header */}
      <h2 className="text-lg font-semibold text-zinc-900 tracking-tight mb-1.5">
        Talk to Your Data
      </h2>
      <p className="text-xs text-zinc-500 mb-6 max-w-sm leading-relaxed">
        Speak naturally into your microphone or click one of the suggested prompts below to build your live dashboard.
      </p>

      {/* Prompt Cards */}
      <div className="w-full flex flex-col gap-2.5">
        {examplePhrases.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.phrase}
              onClick={() => onSelectPrompt(item.phrase)}
              className="w-full group flex items-center justify-between p-3.5 rounded-xl border border-zinc-200/90 bg-white hover:border-zinc-300 hover:shadow-subtle text-left transition-all duration-150 active:scale-[0.99]"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-zinc-100 flex items-center justify-center text-zinc-600 group-hover:text-zinc-900 group-hover:bg-zinc-200/60 transition-colors flex-shrink-0">
                  <Icon className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-medium text-zinc-900 group-hover:text-black transition-colors">
                    &ldquo;{item.phrase}&rdquo;
                  </p>
                  <p className="text-[11px] text-zinc-400 mt-0.5">{item.description}</p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-zinc-400 group-hover:text-zinc-800 group-hover:translate-x-0.5 transition-all flex-shrink-0" />
            </button>
          );
        })}
      </div>
    </div>
  );
};
