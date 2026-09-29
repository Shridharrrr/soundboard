import React, { useEffect, useRef } from 'react';
import type { TranscriptEntry } from '../voice/client.js';
import { Bot, MessageSquare } from 'lucide-react';

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
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-zinc-400">
        <div className="w-10 h-10 rounded-full bg-zinc-100 flex items-center justify-center mb-3">
          <MessageSquare className="w-5 h-5 text-zinc-400" />
        </div>
        <p className="text-xs font-medium text-zinc-600">Conversation stream</p>
        <p className="text-[11px] text-zinc-400 mt-1 max-w-[200px]">
          Start voice or type below to interact with your live dashboard
        </p>
      </div>
    );
  }

  return (
    <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-3 p-3 text-xs pr-1.5">
      {entries.map((entry) => {
        const isUser = entry.role === 'user';

        return (
          <div
            key={entry.id}
            className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
          >
            <div className="flex items-center gap-1.5 mb-1 px-1">
              {isUser ? (
                <span className="text-[11px] font-medium text-zinc-500">You</span>
              ) : (
                <div className="flex items-center gap-1">
                  <Bot className="w-3 h-3 text-zinc-700" />
                  <span className="text-[11px] font-medium text-zinc-700">Ivy (Assistant)</span>
                </div>
              )}
            </div>

            <div
              className={`max-w-[92%] px-3.5 py-2.5 rounded-2xl text-xs leading-relaxed transition-all ${
                isUser
                  ? 'bg-zinc-900 text-white rounded-tr-xs shadow-xs'
                  : 'bg-white text-zinc-800 rounded-tl-xs border border-zinc-200/90 shadow-xs'
              }`}
            >
              {entry.text || <span className="italic text-zinc-400">...</span>}
              {!entry.isFinal && (
                <span
                  className={`inline-block w-1.5 h-3 ml-1 animate-pulse align-middle ${
                    isUser ? 'bg-zinc-400' : 'bg-zinc-800'
                  }`}
                />
              )}
              {entry.interrupted && (
                <span className="inline-block ml-2 text-[10px] font-mono px-1 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200">
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
