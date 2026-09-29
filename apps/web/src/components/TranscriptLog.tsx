import React, { useEffect, useRef } from 'react';
import type { TranscriptEntry } from '../voice/client.js';
import { User, Sparkles } from 'lucide-react';

interface TranscriptLogProps {
  entries: TranscriptEntry[];
}

export const TranscriptLog: React.FC<TranscriptLogProps> = ({ entries }) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [entries]);

  if (entries.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-slate-500 text-sm">
        <Sparkles className="w-8 h-8 text-slate-600 mb-2 opacity-60" />
        <p className="font-medium text-slate-400">Live conversation will stream here</p>
        <p className="text-xs text-slate-600 mt-1">Start voice or type below to begin</p>
      </div>
    );
  }

  return (
    <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-3 p-3 text-sm pr-1">
      {entries.map((entry) => {
        const isUser = entry.role === 'user';

        return (
          <div
            key={entry.id}
            className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
          >
            <div className="flex items-center gap-1.5 mb-1 px-1">
              {isUser ? (
                <>
                  <span className="text-[11px] font-semibold text-brand-400">You</span>
                  <User className="w-3 h-3 text-brand-400" />
                </>
              ) : (
                <>
                  <Sparkles className="w-3 h-3 text-cyan-400" />
                  <span className="text-[11px] font-semibold text-cyan-400">Ivy (Assistant)</span>
                </>
              )}
            </div>

            <div
              className={`max-w-[90%] px-3.5 py-2.5 rounded-2xl leading-relaxed text-sm transition-all duration-200 ${
                isUser
                  ? 'bg-brand-600/20 text-slate-100 rounded-tr-xs border border-brand-500/30'
                  : 'bg-dark-800 text-slate-200 rounded-tl-xs border border-slate-700/60 shadow-sm'
              }`}
            >
              {entry.text || <span className="italic text-slate-500">...</span>}
              {!entry.isFinal && (
                <span className="inline-block w-1.5 h-3.5 ml-1 bg-brand-400/80 animate-pulse align-middle" />
              )}
              {entry.interrupted && (
                <span className="inline-block ml-2 text-[10px] uppercase font-mono px-1 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
                  interrupted
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
