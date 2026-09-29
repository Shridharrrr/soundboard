import React, { useState, useEffect, useRef } from 'react';
import { useDashboardStore } from './store/dashboard.js';
import {
  VoiceClient,
  type VoiceState,
  type TranscriptEntry,
  type ToolChip,
} from './voice/client.js';
import { StatePill } from './components/StatePill.js';
import { Waveform } from './components/Waveform.js';
import { ToolChipsLog } from './components/ToolChipsLog.js';
import { TranscriptLog } from './components/TranscriptLog.js';
import { ChartCard } from './components/ChartCard.js';
import { GlobalFilterBar } from './components/GlobalFilterBar.js';
import { EmptyState } from './components/EmptyState.js';
import { ManualToolConsole } from './components/ManualToolConsole.js';
import { fetchSchema, exportMetabase } from './lib/api.js';
import {
  Mic,
  MicOff,
  Send,
  Sparkles,
  AlertTriangle,
  Play,
  Square,
  HelpCircle,
} from 'lucide-react';
import { AnimatePresence } from 'framer-motion';

export const App: React.FC = () => {
  const store = useDashboardStore();

  const [voiceState, setVoiceState] = useState<VoiceState>('Idle');
  const [transcripts, setTranscripts] = useState<TranscriptEntry[]>([]);
  const [toolChips, setToolChips] = useState<ToolChip[]>([]);
  const [micLevel, setMicLevel] = useState(0);
  const [outputLevel, setOutputLevel] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [textInput, setTextInput] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [hasMetabase, setHasMetabase] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const voiceClientRef = useRef<VoiceClient | null>(null);

  // Initialize Voice Client and check backend schema/metabase
  useEffect(() => {
    fetchSchema()
      .then(schema => {
        store.setAsOf(schema.as_of);
        setHasMetabase(schema.tools.some((t: any) => t.name === 'export_dashboard'));
      })
      .catch(err => {
        console.warn('Initial schema fetch failed:', err);
      });

    const client = new VoiceClient({
      onStateChange: (state) => setVoiceState(state),
      onTranscriptUpdate: (entries) => setTranscripts(entries),
      onToolChipAdd: (chip) => setToolChips(prev => [chip, ...prev].slice(0, 20)),
      onToolChipUpdate: (id, update) => {
        setToolChips(prev => prev.map(c => (c.id === id ? { ...c, ...update } : c)));
      },
      onError: (msg) => setErrorMessage(msg),
      onMicLevel: (lvl) => setMicLevel(lvl),
      onOutputLevel: (lvl) => setOutputLevel(lvl),
    });

    voiceClientRef.current = client;

    // Spacebar to mute shortcut
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && (e.target as HTMLElement).tagName !== 'INPUT' && (e.target as HTMLElement).tagName !== 'TEXTAREA') {
        if (voiceClientRef.current && voiceClientRef.current.getState() !== 'Idle') {
          e.preventDefault();
          const nextMute = voiceClientRef.current.toggleMute();
          setIsMuted(nextMute);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      client.disconnect();
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const handleStartVoice = async () => {
    setErrorMessage(null);
    if (!voiceClientRef.current) return;
    await voiceClientRef.current.connect();
  };

  const handleStopVoice = () => {
    voiceClientRef.current?.disconnect();
  };

  const handleToggleMute = () => {
    if (!voiceClientRef.current) return;
    const next = voiceClientRef.current.toggleMute();
    setIsMuted(next);
  };

  const handleSendText = (e: React.FormEvent) => {
    e.preventDefault();
    if (!textInput.trim()) return;

    const val = textInput.trim();
    setTextInput('');

    if (voiceClientRef.current && voiceClientRef.current.getState() !== 'Idle') {
      voiceClientRef.current.sendTextMessage(val);
    } else {
      // Offline fallback: prompt user to start voice or use manual tool console
      setTranscripts(prev => [
        ...prev,
        { id: `u-${Date.now()}`, role: 'user', text: val, isFinal: true },
        {
          id: `a-${Date.now()}`,
          role: 'agent',
          text: 'Voice agent is currently idle. Click "Start Voice" above to talk live, or use the Manual Tool Console below to run dashboard tools without an AssemblyAI API session.',
          isFinal: true,
        },
      ]);
    }
  };

  const handleSelectPromptPhrase = (phrase: string) => {
    setTextInput(phrase);
    if (voiceClientRef.current && voiceClientRef.current.getState() !== 'Idle') {
      voiceClientRef.current.sendTextMessage(phrase);
    } else {
      handleSendText({ preventDefault: () => {} } as any);
    }
  };

  const handleExportMetabase = async () => {
    setIsExporting(true);
    try {
      const res = await exportMetabase('Voice Dashboard', store.charts);
      if (res.ok && res.url) {
        window.open(res.url, '_blank');
      } else {
        alert(res.error || 'Failed to export dashboard to Metabase');
      }
    } catch (err) {
      alert(`Metabase export failed: ${err}`);
    } finally {
      setIsExporting(false);
    }
  };

  const currentLevel = voiceState === 'Speaking' ? outputLevel : micLevel;

  return (
    <div className="flex h-screen w-full bg-dark-900 text-slate-100 overflow-hidden font-sans">
      {/* LEFT COLUMN: Voice Session, Waveform, Transcript, Tools */}
      <aside className="w-[380px] flex-shrink-0 bg-dark-850 border-r border-slate-800 flex flex-col justify-between p-4 gap-3">
        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-brand-600 to-cyan-500 flex items-center justify-center shadow-md">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-sm tracking-tight text-white leading-tight">
                Talk to Your Data
              </h1>
              <p className="text-[10px] text-slate-400 font-medium">AssemblyAI Voice Agent</p>
            </div>
          </div>

          <StatePill state={voiceState} />
        </div>

        {/* Error notification banner if any */}
        {errorMessage && (
          <div className="flex items-start gap-2 p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
            <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold">Notice</p>
              <p className="text-[11px] text-rose-300/90 leading-tight mt-0.5">{errorMessage}</p>
            </div>
            <button
              onClick={() => setErrorMessage(null)}
              className="text-rose-400 hover:text-white text-xs"
            >
              ✕
            </button>
          </div>
        )}

        {/* Waveform Visualizer */}
        <Waveform level={currentLevel} state={voiceState} />

        {/* Live Conversation Transcript */}
        <div className="flex-1 flex flex-col min-h-0 bg-dark-900/60 rounded-xl border border-slate-800/80 overflow-hidden">
          <div className="px-3 py-1.5 bg-dark-800/60 border-b border-slate-800 text-[11px] font-semibold text-slate-400 flex items-center justify-between">
            <span>Live Transcript</span>
            <span className="text-[10px] text-slate-500 font-mono">24 kHz PCM</span>
          </div>
          <TranscriptLog entries={transcripts} />
        </div>

        {/* Tool Chips Log */}
        <div className="flex flex-col gap-1">
          <span className="text-[11px] font-semibold text-slate-400 px-1">Tool Execution</span>
          <ToolChipsLog chips={toolChips} />
        </div>

        {/* Text Input Fallback & Action Controls */}
        <div className="flex flex-col gap-2 pt-2 border-t border-slate-800/80">
          <form onSubmit={handleSendText} className="relative flex items-center">
            <input
              type="text"
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder={voiceState === 'Idle' ? 'Type a command or test phrase...' : 'Speak or type here...'}
              className="w-full pl-3 pr-10 py-2 rounded-lg bg-dark-900 border border-slate-800 focus:outline-none focus:border-brand-500 text-xs text-slate-200 placeholder:text-slate-500"
            />
            <button
              type="submit"
              disabled={!textInput.trim()}
              className="absolute right-1.5 p-1.5 rounded-md bg-brand-600 hover:bg-brand-500 text-white disabled:opacity-30 disabled:pointer-events-none transition-colors"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>

          {/* Start/Stop & Mute Buttons */}
          <div className="flex items-center gap-2">
            {voiceState === 'Idle' ? (
              <button
                onClick={handleStartVoice}
                className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white text-xs font-semibold shadow-lg shadow-brand-500/20 transition-all"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Start Voice</span>
              </button>
            ) : (
              <button
                onClick={handleStopVoice}
                className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shadow-lg shadow-rose-600/20 transition-all"
              >
                <Square className="w-3.5 h-3.5 fill-current" />
                <span>Stop Session</span>
              </button>
            )}

            <button
              onClick={handleToggleMute}
              disabled={voiceState === 'Idle'}
              title="Toggle Mic (Space)"
              className={`px-3 py-2 rounded-lg border text-xs font-medium flex items-center gap-1.5 transition-colors ${
                isMuted
                  ? 'bg-rose-500/20 border-rose-500/40 text-rose-300'
                  : 'bg-dark-800 border-slate-700/80 text-slate-300 hover:text-white'
              } disabled:opacity-40 disabled:pointer-events-none`}
            >
              {isMuted ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
              <span>{isMuted ? 'Muted' : 'Mute'}</span>
            </button>
          </div>

          {/* Dev Manual Tool Console Drawer */}
          <ManualToolConsole />
        </div>
      </aside>

      {/* RIGHT MAIN AREA: Top Bar & Dashboard Grid */}
      <main className="flex-1 flex flex-col min-w-0 bg-dark-900 overflow-y-auto">
        <header className="sticky top-0 z-10 p-4 bg-dark-900/90 backdrop-blur-md border-b border-slate-800/80">
          <GlobalFilterBar
            filters={store.global_filters}
            canUndo={store.history.length > 0}
            hasMetabase={hasMetabase}
            onUndo={() => store.undo()}
            onClearDashboard={() => store.clearDashboard()}
            onClearFilters={() => store.clearGlobalFilters()}
            onExportMetabase={handleExportMetabase}
          />
        </header>

        <section className="flex-1 p-6">
          {store.charts.length === 0 ? (
            <EmptyState onSelectPrompt={handleSelectPromptPhrase} />
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 max-w-[1600px] mx-auto">
              <AnimatePresence>
                {store.charts.map((chart) => (
                  <ChartCard
                    key={chart.id}
                    chart={chart}
                    result={store.cachedResults[chart.id]}
                    loading={Boolean(store.loadingCharts[chart.id])}
                    isHighlighted={store.highlightedChartId === chart.id}
                    highlightedProperty={
                      store.activePropertyHighlight?.chartId === chart.id
                        ? store.activePropertyHighlight.property
                        : undefined
                    }
                    onRemove={(id) => store.removeChart(id)}
                  />
                ))}
              </AnimatePresence>
            </div>
          )}
        </section>
      </main>
    </div>
  );
};
