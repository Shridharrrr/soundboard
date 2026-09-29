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
import { LandingPage } from './components/LandingPage.js';
import { CreateDashboardModal } from './components/CreateDashboardModal.js';
import { AddComponentModal } from './components/AddComponentModal.js';
import { KpiRibbon } from './components/KpiRibbon.js';
import { fetchQuery, fetchSchema, exportMetabase } from './lib/api.js';
import { getEffectiveChartQuery } from '@vd/shared';
import {
  Mic,
  MicOff,
  Send,
  Sparkles,
  AlertTriangle,
  Play,
  Square,
  BarChart2,
  ArrowLeft,
  Plus,
} from 'lucide-react';
import { AnimatePresence } from 'framer-motion';

export const App: React.FC = () => {
  const store = useDashboardStore();

  const [currentView, setCurrentView] = useState<'landing' | 'app'>(() => {
    return window.location.hash === '#/app' ? 'app' : 'landing';
  });
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
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isAddComponentOpen, setIsAddComponentOpen] = useState(false);

  const voiceClientRef = useRef<VoiceClient | null>(null);

  // Automatically fetch missing queries for charts in the active dashboard
  useEffect(() => {
    store.charts.forEach(chart => {
      if (!store.cachedResults[chart.id] && !store.loadingCharts[chart.id]) {
        store.setChartLoading(chart.id, true);
        const query = getEffectiveChartQuery(chart, store.global_filters);
        fetchQuery(query)
          .then(res => {
            if (res.ok) {
              store.setChartResult(chart.id, res);
            }
          })
          .catch(err => {
            console.error('[App] Failed to load chart query:', err);
          })
          .finally(() => {
            store.setChartLoading(chart.id, false);
          });
      }
    });
  }, [store.charts, store.global_filters, store.activeDashboardId]);

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

  const handleSendText = (e?: React.FormEvent, overrideText?: string) => {
    e?.preventDefault();
    const val = (overrideText !== undefined ? overrideText : textInput).trim();
    if (!val) return;
    setTextInput('');

    if (voiceClientRef.current) {
      voiceClientRef.current.sendTextMessage(val);
    }
  };

  const handleSelectPromptPhrase = (phrase: string) => {
    setTextInput(phrase);
    handleSendText(undefined, phrase);
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

  useEffect(() => {
    const handleHashChange = () => {
      setCurrentView(window.location.hash === '#/app' ? 'app' : 'landing');
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const handleLaunchApp = (promptPhrase?: string) => {
    setCurrentView('app');
    window.location.hash = '#/app';
    if (promptPhrase) {
      setTimeout(() => {
        handleSelectPromptPhrase(promptPhrase);
      }, 100);
    }
  };

  const handleReturnToLanding = () => {
    setCurrentView('landing');
    window.location.hash = '#/';
  };

  const currentLevel = voiceState === 'Speaking' ? outputLevel : micLevel;

  if (currentView === 'landing') {
    return (
      <>
        <LandingPage
          onLaunchApp={handleLaunchApp}
          onCreateDashboard={() => {
            setCurrentView('app');
            window.location.hash = '#/app';
            setIsCreateModalOpen(true);
          }}
        />
        <CreateDashboardModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
        />
      </>
    );
  }

  return (
    <div className="flex h-screen w-full bg-[#fafafa] text-zinc-900 overflow-hidden font-sans">
      {/* LEFT COLUMN: Voice Session, Waveform, Transcript, Tools */}
      <aside className="w-[370px] flex-shrink-0 bg-white border-r border-zinc-200/90 flex flex-col justify-between p-4 gap-3 shadow-xs">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
          <div className="flex items-center gap-2">
            <button
              onClick={handleReturnToLanding}
              title="Back to Overview"
              className="p-1.5 rounded-lg border border-zinc-200 bg-white hover:bg-zinc-100 text-zinc-600 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
            </button>
            <div className="w-6 h-6 rounded-md bg-zinc-900 flex items-center justify-center shadow-xs">
              <BarChart2 className="w-3.5 h-3.5 text-white" />
            </div>
            <div>
              <h1 className="font-semibold text-xs tracking-tight text-zinc-900 leading-tight">
                Talk to Your Data
              </h1>
              <p className="text-[10px] text-zinc-400 font-medium">AssemblyAI Voice Agent</p>
            </div>
          </div>

          <StatePill state={voiceState} />
        </div>

        {/* Error notification banner */}
        {errorMessage && (
          <div className="flex items-start gap-2 p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs">
            <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5 text-rose-600" />
            <div className="flex-1">
              <p className="font-medium text-[11px]">Notice</p>
              <p className="text-[11px] text-rose-700 leading-tight mt-0.5">{errorMessage}</p>
            </div>
            <button
              onClick={() => setErrorMessage(null)}
              className="text-rose-500 hover:text-rose-800 text-xs"
            >
              ✕
            </button>
          </div>
        )}

        {/* Waveform Visualizer */}
        <Waveform level={currentLevel} state={voiceState} />

        {/* Live Conversation Transcript */}
        <div className="flex-1 flex flex-col min-h-0 bg-zinc-50/70 rounded-xl border border-zinc-200/80 overflow-hidden">
          <div className="px-3 py-1.5 bg-white border-b border-zinc-200/80 text-[11px] font-medium text-zinc-500 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-3 h-3 text-zinc-500" />
              <span>Transcript</span>
            </div>
            <span className="text-[10px] text-zinc-400 font-mono">24 kHz PCM</span>
          </div>
          <TranscriptLog entries={transcripts} />
        </div>

        {/* Tool Chips Log */}
        <div className="flex flex-col gap-1">
          <span className="text-[11px] font-medium text-zinc-500 px-1">Tool Execution</span>
          <ToolChipsLog chips={toolChips} />
        </div>

        {/* Text Input Fallback & Action Controls */}
        <div className="flex flex-col gap-2 pt-2 border-t border-zinc-100">
          <form onSubmit={handleSendText} className="relative flex items-center">
            <input
              type="text"
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder={voiceState === 'Idle' ? 'Type a question or command...' : 'Speak or type here...'}
              className="w-full pl-3 pr-10 py-2 rounded-lg bg-white border border-zinc-200 text-xs text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-900 focus:border-zinc-900 shadow-xs"
            />
            <button
              type="submit"
              disabled={!textInput.trim()}
              className="absolute right-1.5 p-1.5 rounded-md bg-zinc-900 hover:bg-zinc-800 text-white disabled:opacity-30 disabled:pointer-events-none transition-colors"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>

          {/* Start/Stop & Mute Buttons */}
          <div className="flex items-center gap-2">
            {voiceState === 'Idle' ? (
              <button
                onClick={handleStartVoice}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-medium shadow-xs transition-all active:scale-[0.98]"
              >
                <Play className="w-3 h-3 fill-current" />
                <span>Start Voice</span>
              </button>
            ) : (
              <button
                onClick={handleStopVoice}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-medium shadow-xs transition-all active:scale-[0.98]"
              >
                <Square className="w-3 h-3 fill-current" />
                <span>Stop Session</span>
              </button>
            )}

            <button
              onClick={handleToggleMute}
              disabled={voiceState === 'Idle'}
              title="Toggle Mic (Space)"
              className={`px-3 py-2 rounded-lg border text-xs font-medium flex items-center gap-1.5 shadow-xs transition-all active:scale-[0.98] ${
                isMuted
                  ? 'bg-rose-50 border-rose-200 text-rose-700'
                  : 'bg-white border-zinc-200 text-zinc-700 hover:bg-zinc-50'
              } disabled:opacity-40 disabled:pointer-events-none`}
            >
              {isMuted ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
              <span>{isMuted ? 'Muted' : 'Mute'}</span>
            </button>
          </div>

          {/* Dev Manual Tool Console */}
          <ManualToolConsole />
        </div>
      </aside>

      {/* RIGHT MAIN AREA: Top Bar & Dashboard Grid */}
      <main className="flex-1 flex flex-col min-w-0 bg-[#fafafa] overflow-y-auto">
        <header className="sticky top-0 z-10 p-4 bg-[#fafafa]/90 backdrop-blur-md border-b border-zinc-200/60">
          <GlobalFilterBar
            filters={store.global_filters}
            canUndo={store.history.length > 0}
            hasMetabase={hasMetabase}
            onAddComponent={() => setIsAddComponentOpen(true)}
            onUndo={() => store.undo()}
            onClearDashboard={() => store.clearDashboard()}
            onClearFilters={() => store.clearGlobalFilters()}
            onExportMetabase={handleExportMetabase}
          />
        </header>

        <section className="flex-1 p-6">
          {store.charts.length === 0 ? (
            <EmptyState
              onSelectPrompt={handleSelectPromptPhrase}
              onAddComponent={() => setIsAddComponentOpen(true)}
              onCreateDashboard={() => setIsCreateModalOpen(true)}
            />
          ) : (
            <div className="max-w-[1600px] mx-auto space-y-4">
              {/* Executive KPI Ribbon */}
              <KpiRibbon
                onAddMetricChart={(metric) => {
                  store.addChart({
                    metric,
                    group_by: 'region',
                    time_range: { preset: 'this_quarter' },
                    chart_type: 'bar',
                  });
                }}
              />

              {/* Section Header */}
              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center gap-2.5">
                  <h3 className="font-display font-semibold text-sm text-zinc-950">
                    Visual Analytics & Drilldowns
                  </h3>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-600 border border-zinc-200/80">
                    {store.charts.length} {store.charts.length === 1 ? 'component' : 'components'}
                  </span>
                </div>

                <button
                  onClick={() => setIsAddComponentOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-200 bg-white hover:bg-zinc-50 hover:border-zinc-300 text-xs font-medium text-zinc-800 shadow-2xs transition-colors"
                >
                  <Plus className="w-3.5 h-3.5 text-zinc-600" />
                  <span>Add Component</span>
                </button>
              </div>

              {/* Dynamic Grid */}
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                <AnimatePresence>
                  {store.charts.map((chart, index) => (
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
                      canMoveLeft={index > 0}
                      canMoveRight={index < store.charts.length - 1}
                      onMoveLeft={() => store.moveChart(chart.id, 'left')}
                      onMoveRight={() => store.moveChart(chart.id, 'right')}
                      onSelect={() => store.setHighlightedChart(chart.id)}
                      onRemove={(id) => store.removeChart(id)}
                    />
                  ))}
                </AnimatePresence>

                {/* Quick Add Component Tile */}
                <div
                  onClick={() => setIsAddComponentOpen(true)}
                  className="rounded-xl border border-dashed border-zinc-200 hover:border-zinc-400 bg-white/50 hover:bg-white p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all min-h-[300px] group shadow-2xs"
                >
                  <div className="w-10 h-10 rounded-xl bg-zinc-50 border border-zinc-200 shadow-2xs flex items-center justify-center text-zinc-500 group-hover:bg-zinc-900 group-hover:text-white group-hover:scale-105 transition-all mb-3">
                    <Plus className="w-5 h-5" />
                  </div>
                  <p className="text-xs font-semibold text-zinc-900 group-hover:text-black">
                    Add Another Component
                  </p>
                  <p className="text-[11px] text-zinc-400 mt-1 max-w-xs">
                    Choose from curated analytics catalog or build custom query
                  </p>
                </div>
              </div>
            </div>
          )}
        </section>
      </main>

      {/* Modals */}
      <CreateDashboardModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
      />

      <AddComponentModal
        isOpen={isAddComponentOpen}
        onClose={() => setIsAddComponentOpen(false)}
      />
    </div>
  );
};
