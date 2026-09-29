import React from 'react';
import type { VoiceState } from '../voice/client.js';

interface StatePillProps {
  state: VoiceState;
}

export const StatePill: React.FC<StatePillProps> = ({ state }) => {
  const getPillStyle = () => {
    switch (state) {
      case 'Listening':
        return {
          wrapper: 'bg-emerald-50 text-emerald-800 border-emerald-200/80',
          dot: 'bg-emerald-500 ring-2 ring-emerald-300/50',
          ping: true,
          label: 'Listening',
        };
      case 'Thinking':
        return {
          wrapper: 'bg-indigo-50 text-indigo-800 border-indigo-200/80',
          dot: 'bg-indigo-500 ring-2 ring-indigo-300/50',
          ping: true,
          label: 'Thinking',
        };
      case 'Speaking':
        return {
          wrapper: 'bg-blue-50 text-blue-800 border-blue-200/80',
          dot: 'bg-blue-500 ring-2 ring-blue-300/50',
          ping: false,
          label: 'Speaking',
        };
      case 'Interrupted':
        return {
          wrapper: 'bg-rose-50 text-rose-800 border-rose-200/80',
          dot: 'bg-rose-500 ring-2 ring-rose-300/50',
          ping: false,
          label: 'Interrupted',
        };
      case 'Connecting':
        return {
          wrapper: 'bg-amber-50 text-amber-800 border-amber-200/80',
          dot: 'bg-amber-500',
          ping: false,
          label: 'Connecting',
        };
      case 'Idle':
      default:
        return {
          wrapper: 'bg-zinc-100/90 text-zinc-600 border-zinc-200/80',
          dot: 'bg-zinc-400',
          ping: false,
          label: 'Idle',
        };
    }
  };

  const style = getPillStyle();

  return (
    <div
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border shadow-xs transition-all duration-200 select-none ${style.wrapper}`}
    >
      <span className="relative flex h-2 w-2">
        {style.ping && (
          <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${style.dot}`} />
        )}
        <span className={`relative inline-flex rounded-full h-2 w-2 ${style.dot}`} />
      </span>
      <span className="tracking-tight">{style.label}</span>
    </div>
  );
};
