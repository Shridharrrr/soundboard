import React from 'react';
import { Mic, BarChart3, ArrowRight } from 'lucide-react';

interface EmptyStateProps {
  onSelectPrompt: (phrase: string) => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ onSelectPrompt }) => {
  const examplePhrases = [
    {
      title: 'Regional Breakdown',
      phrase: 'Show revenue by region for Q3',
      description: 'Regional performance with Q3 2026 data',
    },
    {
      title: 'Time Series Trend',
      phrase: 'Show orders monthly for Electronics',
      description: 'Monthly order volume through 2026',
    },
    {
      title: 'Year-over-Year Comparison',
      phrase: 'Compare revenue by category to last year',
      description: 'Category performance vs previous year',
    },
  ];

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center max-w-xl mx-auto my-auto">
      <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-brand-600/30 to-cyan-500/20 border border-brand-500/30 flex items-center justify-center mb-6 glow-brand">
        <Mic className="w-8 h-8 text-brand-400" />
      </div>

      <h2 className="text-xl font-bold text-slate-100 mb-2">Talk to Your Data</h2>
      <p className="text-sm text-slate-400 mb-8 max-w-md">
        Speak naturally into your microphone or try one of the prompt templates below to build and refine live dashboards.
      </p>

      <div className="w-full flex flex-col gap-2.5">
        {examplePhrases.map((item) => (
          <button
            key={item.phrase}
            onClick={() => onSelectPrompt(item.phrase)}
            className="w-full group flex items-center justify-between p-3.5 rounded-xl border border-slate-800 bg-dark-850/80 hover:bg-dark-800 hover:border-brand-500/40 text-left transition-all duration-200"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-dark-800 border border-slate-700/60 text-brand-400 group-hover:text-cyan-400 transition-colors">
                <BarChart3 className="w-4 h-4" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-200 group-hover:text-brand-300 transition-colors">
                  &ldquo;{item.phrase}&rdquo;
                </p>
                <p className="text-xs text-slate-500">{item.description}</p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-600 group-hover:text-brand-400 group-hover:translate-x-0.5 transition-all" />
          </button>
        ))}
      </div>
    </div>
  );
};
