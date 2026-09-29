import React from 'react';
import type { Filter } from '@vd/shared';
import { Undo2, Trash, ExternalLink, Filter as FilterIcon, X } from 'lucide-react';

interface GlobalFilterBarProps {
  filters: Filter[];
  canUndo: boolean;
  hasMetabase: boolean;
  onUndo: () => void;
  onClearDashboard: () => void;
  onClearFilters: () => void;
  onExportMetabase: () => void;
}

export const GlobalFilterBar: React.FC<GlobalFilterBarProps> = ({
  filters,
  canUndo,
  hasMetabase,
  onUndo,
  onClearDashboard,
  onClearFilters,
  onExportMetabase,
}) => {
  return (
    <div className="glass-panel rounded-xl px-4 py-3 flex items-center justify-between gap-4">
      {/* Global Filter Chips */}
      <div className="flex items-center gap-2 flex-wrap min-w-0">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 mr-1">
          <FilterIcon className="w-3.5 h-3.5 text-brand-400" />
          <span>Global Filters:</span>
        </div>

        {filters.length === 0 ? (
          <span className="text-xs text-slate-500 italic">None active</span>
        ) : (
          <>
            {filters.map((f) => (
              <span
                key={f.dimension}
                className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-brand-500/10 border border-brand-500/30 text-brand-300 font-medium"
              >
                <span>{f.dimension}: {f.values.join(', ')}</span>
              </span>
            ))}
            <button
              onClick={onClearFilters}
              title="Clear all global filters"
              className="text-xs text-slate-400 hover:text-rose-400 p-1 rounded transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <button
          onClick={onUndo}
          disabled={!canUndo}
          title="Undo last action"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-700/80 bg-dark-800 text-xs font-medium text-slate-300 hover:text-white hover:border-slate-600 disabled:opacity-40 disabled:pointer-events-none transition-colors"
        >
          <Undo2 className="w-3.5 h-3.5" />
          <span>Undo</span>
        </button>

        <button
          onClick={onClearDashboard}
          title="Clear all charts"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-700/80 bg-dark-800 text-xs font-medium text-slate-300 hover:text-rose-400 hover:border-rose-500/40 transition-colors"
        >
          <Trash className="w-3.5 h-3.5" />
          <span>Clear</span>
        </button>

        {hasMetabase && (
          <button
            onClick={onExportMetabase}
            title="Export dashboard to Metabase"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-brand-500/30 bg-brand-500/15 text-xs font-semibold text-brand-300 hover:bg-brand-500/25 hover:border-brand-500/50 transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Export to Metabase</span>
          </button>
        )}
      </div>
    </div>
  );
};
