import React from 'react';
import type { ToolChip } from '../voice/client.js';
import { Check, AlertCircle, Loader2 } from 'lucide-react';

interface ToolChipsLogProps {
  chips: ToolChip[];
}

export const ToolChipsLog: React.FC<ToolChipsLogProps> = ({ chips }) => {
  if (chips.length === 0) {
    return (
      <div className="flex items-center justify-center p-2.5 text-[11px] text-zinc-400 italic bg-white rounded-lg border border-zinc-200/80">
        Tool execution events will appear here
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1.5 max-h-36 overflow-y-auto pr-1">
      {chips.map((chip) => {
        let statusBadge = (
          <span className="inline-flex items-center gap-1 text-[10px] text-zinc-600 font-mono bg-zinc-100 px-1.5 py-0.5 rounded border border-zinc-200">
            <Loader2 className="w-2.5 h-2.5 animate-spin" />
            <span>running</span>
          </span>
        );
        let chipBorder = 'border-zinc-200/90';

        if (chip.status === 'done') {
          statusBadge = (
            <span className="inline-flex items-center gap-1 text-[10px] text-emerald-700 font-mono bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
              <Check className="w-2.5 h-2.5" />
              <span>applied</span>
            </span>
          );
          chipBorder = 'border-zinc-200';
        } else if (chip.status === 'error') {
          statusBadge = (
            <span className="inline-flex items-center gap-1 text-[10px] text-rose-700 font-mono bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">
              <AlertCircle className="w-2.5 h-2.5" />
              <span>{chip.errorCode || 'error'}</span>
            </span>
          );
          chipBorder = 'border-rose-200';
        }

        return (
          <div
            key={chip.id}
            className={`flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg bg-white border text-xs shadow-xs transition-all ${chipBorder}`}
          >
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="font-medium text-zinc-900 text-[11px] truncate">{chip.name}</span>
              {chip.argsSummary && (
                <span className="text-zinc-500 font-mono text-[10px] truncate max-w-[140px]">
                  · {chip.argsSummary}
                </span>
              )}
            </div>
            {statusBadge}
          </div>
        );
      })}
    </div>
  );
};
