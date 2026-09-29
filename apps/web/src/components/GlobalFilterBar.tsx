import React from 'react';
import type { Filter } from '@vd/shared';
import { Undo2, Trash2, ExternalLink, Filter as FilterIcon, X } from 'lucide-react';
import { DashboardSwitcher } from './DashboardSwitcher.js';

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
    <div className="bg-white border border-zinc-200/90 rounded-xl px-4 py-2 flex items-center justify-between gap-4 shadow-xs">
      {/* Left: Dashboard Switcher + Global Filter Chips */}
      <div className="flex items-center gap-3 flex-wrap min-w-0">
        <DashboardSwitcher />

        <div className="h-4 w-px bg-zinc-200/90 hidden sm:block" />

        <div className="flex items-center gap-1.5 text-xs font-medium text-zinc-500 mr-1">
          <FilterIcon className="w-3.5 h-3.5 text-zinc-700" />
          <span>Filters:</span>
        </div>

        {filters.length === 0 ? (
          <span className="text-xs text-zinc-400">None active</span>
        ) : (
          <div className="flex items-center gap-1.5 flex-wrap">
            {filters.map((f) => (
              <span
                key={f.dimension}
                className="inline-flex items-center gap-1.5 text-xs px-2.5 py-0.5 rounded-md bg-zinc-100 border border-zinc-200 text-zinc-800 font-medium"
              >
                <span>{f.dimension}: {f.values.join(', ')}</span>
              </span>
            ))}
            <button
              onClick={onClearFilters}
              title="Clear all global filters"
              className="text-xs text-zinc-400 hover:text-zinc-700 p-1 rounded transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Right: Action Buttons */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <button
          onClick={onUndo}
          disabled={!canUndo}
          title="Undo last action"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-200 bg-white text-xs font-medium text-zinc-700 hover:bg-zinc-50 hover:text-zinc-900 shadow-xs disabled:opacity-40 disabled:pointer-events-none transition-all active:scale-[0.98]"
        >
          <Undo2 className="w-3.5 h-3.5" />
          <span>Undo</span>
        </button>

        <button
          onClick={onClearDashboard}
          title="Clear all charts"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-200 bg-white text-xs font-medium text-zinc-600 hover:text-rose-600 hover:border-rose-200 hover:bg-rose-50/50 shadow-xs transition-all active:scale-[0.98]"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>Clear</span>
        </button>

        {hasMetabase && (
          <button
            onClick={onExportMetabase}
            title="Export dashboard to Metabase"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-medium shadow-xs transition-all active:scale-[0.98]"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Export to Metabase</span>
          </button>
        )}
      </div>
    </div>
  );
};
