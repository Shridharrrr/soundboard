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
          bg: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400',
          dot: 'bg-emerald-400 shadow-[0_0_10px_#34d399] animate-pulse',
          label: 'Listening',
        };
      case 'Thinking':
        return {
          bg: 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400',
          dot: 'bg-indigo-400 shadow-[0_0_10px_#818cf8] animate-ping',
          label: 'Thinking...',
        };
      case 'Speaking':
        return {
          bg: 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400',
          dot: 'bg-cyan-400 shadow-[0_0_10px_#22d3ee] animate-pulse',
          label: 'Speaking',
        };
      case 'Interrupted':
        return {
          bg: 'bg-rose-500/15 border-rose-500/40 text-rose-400',
          dot: 'bg-rose-400 shadow-[0_0_12px_#f43f5e] animate-bounce',
          label: 'Interrupted',
        };
      case 'Connecting':
        return {
          bg: 'bg-amber-500/10 border-amber-500/30 text-amber-400',
          dot: 'bg-amber-400 shadow-[0_0_10px_#fbbf24] animate-spin',
          label: 'Connecting...',
        };
      case 'Idle':
      default:
        return {
          bg: 'bg-slate-800/60 border-slate-700/40 text-slate-400',
          dot: 'bg-slate-500',
          label: 'Idle',
        };
    }
  };

  const style = getPillStyle();

  return (
    <div
      className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium border backdrop-blur-sm transition-all duration-300 ${style.bg}`}
    >
      <span className={`w-2 h-2 rounded-full transition-colors duration-300 ${style.dot}`} />
      <span>{style.label}</span>
    </div>
  );
};
