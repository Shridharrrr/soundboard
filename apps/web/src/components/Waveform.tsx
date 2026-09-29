import React from 'react';
import type { VoiceState } from '../voice/client.js';

interface WaveformProps {
  level: number; // 0 to 1
  state: VoiceState;
}

export const Waveform: React.FC<WaveformProps> = ({ level, state }) => {
  const barCount = 18;
  const isListening = state === 'Listening';
  const isSpeaking = state === 'Speaking';
  const isActive = isListening || isSpeaking;

  return (
    <div className="flex items-center justify-center gap-1 h-8 px-2 py-1 bg-dark-850/80 rounded-lg border border-slate-800/80">
      {Array.from({ length: barCount }).map((_, i) => {
        // Curve factor so center bars are taller
        const distFromCenter = Math.abs(i - barCount / 2) / (barCount / 2);
        const curve = 1 - distFromCenter * 0.5;

        // Add slight pseudo-random variation based on level
        const pseudoRand = 0.7 + (Math.sin(i * 1.5 + Date.now() / 150) + 1) * 0.15;
        const currentHeight = isActive
          ? Math.max(12, Math.min(100, (level * 100 * curve * pseudoRand)))
          : 12;

        const barColor = isListening
          ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.4)]'
          : isSpeaking
          ? 'bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.4)]'
          : 'bg-slate-700/50';

        return (
          <div
            key={i}
            className={`w-1 rounded-full transition-all duration-75 ${barColor}`}
            style={{
              height: `${currentHeight}%`,
            }}
          />
        );
      })}
    </div>
  );
};
