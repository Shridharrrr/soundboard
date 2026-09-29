import React from 'react';
import type { VoiceState } from '../voice/client.js';

interface WaveformProps {
  level: number; // 0 to 1
  state: VoiceState;
}

export const Waveform: React.FC<WaveformProps> = ({ level, state }) => {
  const barCount = 20;
  const isListening = state === 'Listening';
  const isSpeaking = state === 'Speaking';
  const isActive = isListening || isSpeaking;

  return (
    <div className="flex items-center justify-center gap-1 h-9 px-3 py-1.5 bg-white rounded-lg border border-zinc-200/80 shadow-xs">
      {Array.from({ length: barCount }).map((_, i) => {
        // Taper bars toward the edges like modern voice indicators
        const distFromCenter = Math.abs(i - (barCount - 1) / 2) / ((barCount - 1) / 2);
        const curve = Math.cos(distFromCenter * (Math.PI / 2.5));

        const pseudoRand = 0.75 + (Math.sin(i * 1.8 + Date.now() / 120) + 1) * 0.15;
        const currentHeight = isActive
          ? Math.max(15, Math.min(100, level * 100 * curve * pseudoRand))
          : 15;

        const barColor = isListening
          ? 'bg-emerald-500'
          : isSpeaking
          ? 'bg-zinc-900'
          : 'bg-zinc-200';

        return (
          <div
            key={i}
            className={`w-[2.5px] rounded-full transition-all duration-75 ${barColor}`}
            style={{
              height: `${currentHeight}%`,
            }}
          />
        );
      })}
    </div>
  );
};
