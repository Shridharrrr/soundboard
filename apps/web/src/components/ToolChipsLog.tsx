import React from 'react';
import type { ToolChip } from '../voice/client.js';
import { CheckCircle2, AlertCircle, Loader2, Wrench } from 'lucide-react';

interface ToolChipsLogProps {
  chips: ToolChip[];
}

export const ToolChipsLog: React.FC<ToolChipsLogProps> = ({ chips }) => {
  if (chips.length === 0) {
    return (
      <div className="flex items-center justify-center p-3 text-xs text-slate-500 italic bg-dark-850/40 rounded-lg border border-slate-800/40">
        Tool execution log will appear here
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1.5 max-h-36 overflow-y-auto pr-1">
      {chips.map((chip) => {
        let statusIcon = <Loader2 className="w-3.5 h-3.5 text-indigo-400 animate-spin flex-shrink-0" />;
        let statusBadge = (
          <span className="text-[10px] text-indigo-300 font-mono bg-indigo-500/10 px-1.5 py-0.5 rounded border border-indigo-500/20">
            running
          </span>
        );
        let chipBg = 'bg-dark-850/80 border-slate-800';

        if (chip.status === 'done') {
          statusIcon = <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />;
          statusBadge = (
            <span className="text-[10px] text-emerald-300 font-mono bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
              applied
            </span>
          );
          chipBg = 'bg-emerald-950/20 border-emerald-900/40';
        } else if (chip.status === 'error') {
          statusIcon = <AlertCircle className="w-3.5 h-3.5 text-rose-400 flex-shrink-0" />;
          statusBadge = (
            <span className="text-[10px] text-rose-300 font-mono bg-rose-500/10 px-1.5 py-0.5 rounded border border-rose-500/20">
              {chip.errorCode || 'error'}
            </span>
          );
          chipBg = 'bg-rose-950/20 border-rose-900/40';
        }

        return (
          <div
            key={chip.id}
            className={`flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg border text-xs transition-all ${chipBg}`}
          >
            <div className="flex items-center gap-2 min-w-0">
              {statusIcon}
              <div className="truncate">
                <span className="font-semibold text-slate-200">{chip.name}</span>
                {chip.argsSummary && (
                  <span className="text-slate-400 ml-1.5 font-mono text-[11px] truncate">
                    · {chip.argsSummary}
                  </span>
                )}
              </div>
            </div>
            {statusBadge}
          </div>
        );
      })}
    </div>
  );
};
