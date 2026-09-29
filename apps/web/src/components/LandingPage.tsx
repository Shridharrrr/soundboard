import React, { useState } from 'react';
import {
  Mic,
  BarChart3,
  TrendingUp,
  Calendar,
  Bot,
  ArrowRight,
  ShieldCheck,
  Zap,
  Terminal,
  RotateCcw,
  CheckCircle2,
  ExternalLink,
  Code2,
  Layers,
  Cpu,
  Database,
  Sliders,
  ChevronRight,
  Volume2,
  Check,
  ChevronDown,
  LineChart as LineChartIcon,
  PieChart as PieChartIcon,
  Plus,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';

interface LandingPageProps {
  onLaunchApp: (initialPrompt?: string) => void;
  onCreateDashboard?: () => void;
}

// Interactive Hero Simulation Data
interface DemoScenario {
  id: string;
  badge: string;
  userPrompt: string;
  agentResponse: string;
  chartType: 'bar' | 'area' | 'line' | 'donut';
  sql: string;
  insight: string;
  data: Array<{ name: string; value: number; comparison?: number }>;
}

const DEMO_SCENARIOS: DemoScenario[] = [
  {
    id: 'region-q3',
    badge: '1. Regional Distribution',
    userPrompt: 'Show revenue by region for Q3',
    agentResponse: 'Here is Q3 2026 revenue across all four regions. Southeast is leading at $2.41M, accounting for 36% of total sales.',
    chartType: 'bar',
    sql: `SELECT d.region AS grp, SUM(f.revenue) AS value\nFROM analytics.fact_orders f\nJOIN analytics.dim_geography d ON f.geo_id = d.geo_id\nWHERE f.order_date >= '2026-07-01' AND f.order_date <= '2026-09-30'\nGROUP BY d.region ORDER BY value DESC;`,
    insight: 'Total Q3 Revenue: $6.69M · Top region: Southeast ($2.41M · 36%)',
    data: [
      { name: 'Southeast', value: 2412500 },
      { name: 'Northeast', value: 1780400 },
      { name: 'Midwest', value: 1421000 },
      { name: 'West', value: 1076100 },
    ],
  },
  {
    id: 'filter-se',
    badge: '2. Drilldown by Category',
    userPrompt: 'Break out Southeast by category',
    agentResponse: 'Filtering to Southeast and grouping by category. Electronics generated $1.08M, followed by Apparel at $684k.',
    chartType: 'donut',
    sql: `SELECT c.category AS grp, SUM(f.revenue) AS value\nFROM analytics.fact_orders f\nJOIN analytics.dim_geography d ON f.geo_id = d.geo_id\nJOIN analytics.dim_product c ON f.product_id = c.product_id\nWHERE d.region = 'Southeast' AND f.order_date >= '2026-07-01'\nGROUP BY c.category ORDER BY value DESC;`,
    insight: 'Southeast Breakdown · Electronics: $1.08M (45%) · Apparel: $684k (28%)',
    data: [
      { name: 'Electronics', value: 1084200 },
      { name: 'Apparel', value: 684100 },
      { name: 'Home & Kitchen', value: 412200 },
      { name: 'Books', value: 232000 },
    ],
  },
  {
    id: 'trend-weekly',
    badge: '3. Weekly Granularity',
    userPrompt: 'Switch to weekly trend',
    agentResponse: 'Updated time granularity to weekly for Q3 2026. Weekly revenue peaked at $580k during the week of August 11.',
    chartType: 'area',
    sql: `SELECT DATE_TRUNC('week', f.order_date)::date AS period, SUM(f.revenue) AS value\nFROM analytics.fact_orders f\nWHERE f.order_date >= '2026-07-01' AND f.order_date <= '2026-09-30'\nGROUP BY period ORDER BY period ASC;`,
    insight: '13-Week Trajectory · Peak period: Aug 11 ($580.4k) · Average: $514.6k/wk',
    data: [
      { name: 'W27 (Jul 6)', value: 482000 },
      { name: 'W28 (Jul 13)', value: 504000 },
      { name: 'W29 (Jul 20)', value: 495000 },
      { name: 'W30 (Jul 27)', value: 521000 },
      { name: 'W31 (Aug 3)', value: 540000 },
      { name: 'W32 (Aug 10)', value: 580400 },
      { name: 'W33 (Aug 17)', value: 535000 },
      { name: 'W34 (Aug 24)', value: 512000 },
      { name: 'W35 (Aug 31)', value: 529000 },
      { name: 'W36 (Sep 7)', value: 490000 },
      { name: 'W37 (Sep 14)', value: 502000 },
      { name: 'W38 (Sep 21)', value: 499000 },
    ],
  },
  {
    id: 'compare-yoy',
    badge: '4. Compare with Prior Year',
    userPrompt: 'Compare revenue by category to last year',
    agentResponse: 'Comparing Q3 2026 performance with Q3 2025. Total revenue is up +12.4% year-over-year, driven by Electronics (+18.2%).',
    chartType: 'line',
    sql: `SELECT c.category AS grp, SUM(f.revenue) AS value, SUM(comp.revenue) AS comparison_value\nFROM analytics.fact_orders f\nJOIN analytics.dim_product c ON f.product_id = c.product_id\nLEFT JOIN analytics.fact_orders comp ON comp.product_id = f.product_id\n  AND comp.order_date = f.order_date - INTERVAL '1 year'\nWHERE f.order_date >= '2026-07-01' AND f.order_date <= '2026-09-30'\nGROUP BY c.category;`,
    insight: '+12.4% overall growth YoY · Electronics: +18.2% · Apparel: +8.5%',
    data: [
      { name: 'Electronics', value: 2950000, comparison: 2495000 },
      { name: 'Apparel', value: 1840000, comparison: 1695000 },
      { name: 'Home & Kitchen', value: 1180000, comparison: 1090000 },
      { name: 'Books', value: 720000, comparison: 680000 },
    ],
  },
];

const BENCHMARK_CATEGORIES = [
  { name: 'Basic Requests', count: '8/8', pass: '100%', desc: 'Single metrics, group by, date presets (this quarter, monthly).' },
  { name: 'Follow-ups & Edits', count: '6/6', pass: '100%', desc: 'Granularity changes, dimension additions without wiping state.' },
  { name: 'Conversational Corrections', count: '4/4', pass: '100%', desc: '"No, weekly not monthly", "actually make that a donut chart".' },
  { name: 'Dimension Breakouts', count: '3/3', pass: '100%', desc: 'Filter selected segment and pivot group by another dimension.' },
  { name: 'Ambiguity & Synonyms', count: '3/3', pass: '100%', desc: 'Maps "the south", "SE", "the store" cleanly to valid semantic values.' },
  { name: 'Out-of-Scope Refusal', count: '3/3', pass: '100%', desc: 'Gracefully refuses unknown tables, stock prices, or raw mutations.' },
  { name: 'State Controls & Undo', count: '3/3', pass: '100%', desc: '"Undo last action", "clear dashboard", "clear filters" stack rollbacks.' },
];

const CURATED_PROMPTS = [
  {
    category: 'Exploration',
    prompt: 'Show revenue by region for Q3',
    description: 'Generates a clean bar chart with Q3 2026 performance across all four regions.',
    badge: 'Popular',
  },
  {
    category: 'Time Series',
    prompt: 'Show orders monthly for Electronics',
    description: 'Visualizes monthly order volume throughout 2026 specifically for electronics.',
    badge: 'Trend',
  },
  {
    category: 'Benchmarking',
    prompt: 'Compare revenue by category to last year',
    description: 'Computes period-over-period comparison with automated percentage deltas.',
    badge: 'Comparison',
  },
  {
    category: 'Drilldown',
    prompt: 'Break out Southeast by category',
    description: 'Applies Southeast region filter and splits revenue across product categories.',
    badge: 'Drilldown',
  },
  {
    category: 'Correction',
    prompt: 'Actually make that a donut chart',
    description: 'Seamlessly morphs chart visualization type while preserving current filters.',
    badge: 'Correction',
  },
  {
    category: 'Multi-Turn',
    prompt: 'Switch to weekly granularity and filter to West',
    description: 'Applies composite modifications to the active chart in a single natural sentence.',
    badge: 'Advanced',
  },
];

const DONUT_COLORS = ['#18181b', '#4f46e5', '#0284c7', '#10b981'];

export const LandingPage: React.FC<LandingPageProps> = ({ onLaunchApp, onCreateDashboard }) => {
  const [activeScenario, setActiveScenario] = useState<DemoScenario>(DEMO_SCENARIOS[0]);
  const [showSql, setShowSql] = useState(false);
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  const formatCurrency = (val: number) => {
    if (val >= 1_000_000) return `$${(val / 1_000_000).toFixed(2)}M`;
    if (val >= 1_000) return `$${(val / 1_000).toFixed(1)}k`;
    return `$${val.toLocaleString()}`;
  };

  const renderDemoChart = () => {
    switch (activeScenario.chartType) {
      case 'donut':
        return (
          <ResponsiveContainer width="100%" height={230}>
            <PieChart>
              <Pie
                data={activeScenario.data}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={85}
                paddingAngle={4}
              >
                {activeScenario.data.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={DONUT_COLORS[index % DONUT_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: '#ffffff',
                  borderColor: '#e4e4e7',
                  borderRadius: '8px',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
                  fontSize: '11px',
                  color: '#18181b',
                }}
                formatter={(val: any) => [formatCurrency(Number(val)), 'Revenue']}
              />
            </PieChart>
          </ResponsiveContainer>
        );

      case 'area':
        return (
          <ResponsiveContainer width="100%" height={230}>
            <AreaChart data={activeScenario.data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="demoGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#18181b" stopOpacity={0.18} />
                  <stop offset="95%" stopColor="#18181b" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" vertical={false} />
              <XAxis dataKey="name" stroke="#a1a1aa" tick={{ fontSize: 10 }} tickLine={false} axisLine={{ stroke: '#e4e4e7' }} />
              <YAxis stroke="#a1a1aa" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={(v) => formatCurrency(v)} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#ffffff',
                  borderColor: '#e4e4e7',
                  borderRadius: '8px',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
                  fontSize: '11px',
                  color: '#18181b',
                }}
                formatter={(val: any) => [formatCurrency(Number(val)), 'Revenue']}
              />
              <Area type="monotone" dataKey="value" stroke="#18181b" strokeWidth={2} fillOpacity={1} fill="url(#demoGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        );

      case 'line':
        return (
          <ResponsiveContainer width="100%" height={230}>
            <LineChart data={activeScenario.data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" vertical={false} />
              <XAxis dataKey="name" stroke="#a1a1aa" tick={{ fontSize: 10 }} tickLine={false} axisLine={{ stroke: '#e4e4e7' }} />
              <YAxis stroke="#a1a1aa" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={(v) => formatCurrency(v)} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#ffffff',
                  borderColor: '#e4e4e7',
                  borderRadius: '8px',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
                  fontSize: '11px',
                  color: '#18181b',
                }}
                formatter={(val: any) => [formatCurrency(Number(val)), 'Revenue']}
              />
              <Line type="monotone" dataKey="value" stroke="#18181b" strokeWidth={2.2} dot={{ r: 3, fill: '#18181b' }} name="Q3 2026" />
              <Line type="monotone" dataKey="comparison" stroke="#0284c7" strokeWidth={2} strokeDasharray="4 4" dot={{ r: 2.5, fill: '#0284c7' }} name="Q3 2025" />
            </LineChart>
          </ResponsiveContainer>
        );

      case 'bar':
      default:
        return (
          <ResponsiveContainer width="100%" height={230}>
            <BarChart data={activeScenario.data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" vertical={false} />
              <XAxis dataKey="name" stroke="#a1a1aa" tick={{ fontSize: 10 }} tickLine={false} axisLine={{ stroke: '#e4e4e7' }} />
              <YAxis stroke="#a1a1aa" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={(v) => formatCurrency(v)} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#ffffff',
                  borderColor: '#e4e4e7',
                  borderRadius: '8px',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
                  fontSize: '11px',
                  color: '#18181b',
                }}
                formatter={(val: any) => [formatCurrency(Number(val)), 'Revenue']}
              />
              <Bar dataKey="value" fill="#18181b" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        );
    }
  };

  return (
    <div className="min-h-screen bg-[#fafafa] text-zinc-900 font-sans selection:bg-zinc-900 selection:text-white">
      {/* 1. TOP STICKY NAVIGATION BAR */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-zinc-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-zinc-900 flex items-center justify-center shadow-xs">
              <BarChart3 className="w-4 h-4 text-white" />
            </div>
            <div className="flex items-center gap-3">
              <span className="font-display font-semibold text-sm tracking-tight text-zinc-950">
                Soundboard
              </span>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-6 text-xs font-medium text-zinc-600">
            <a href="#features" className="hover:text-zinc-950 transition-colors">Features</a>
            <a href="#interactive-demo" className="hover:text-zinc-950 transition-colors">Live Simulation</a>
            <a href="#architecture" className="hover:text-zinc-950 transition-colors">Architecture</a>
            <a href="#benchmarks" className="hover:text-zinc-950 transition-colors">30/30 Benchmarks</a>
            <a href="#prompts" className="hover:text-zinc-950 transition-colors">Prompt Gallery</a>
          </nav>

          <div className="flex items-center gap-2.5">
            <a
              href="https://github.com/shridharm/justtalk"
              target="_blank"
              rel="noreferrer"
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-200 text-xs font-medium text-zinc-700 hover:bg-zinc-50 transition-colors"
            >
              <Code2 className="w-3.5 h-3.5 text-zinc-500" />
              <span>GitHub</span>
            </a>

            <button
              onClick={() => onLaunchApp()}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-medium shadow-xs transition-all active:scale-[0.98]"
            >
              <Mic className="w-3.5 h-3.5" />
              <span>Launch Studio</span>
              <ArrowRight className="w-3 h-3 text-zinc-400" />
            </button>
          </div>
        </div>
      </header>

      {/* 2. HERO SECTION */}
      <section className="relative pt-16 pb-20 sm:pt-24 sm:pb-28 overflow-hidden bg-grid-pattern border-b border-zinc-200/60">
        {/* Subtle radial ambient glow for depth */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[680px] h-[320px] bg-gradient-to-b from-zinc-200/40 via-zinc-100/20 to-transparent blur-3xl pointer-events-none -z-10 rounded-full" />
        <div className="max-w-5xl mx-auto px-4 sm:px-6 text-center">
          {/* Headline: Premium Editorial Instrument Serif (3 lines) */}
          <h1 className="font-serif text-4xl sm:text-5xl md:text-6xl lg:text-[4.25rem] font-normal tracking-[-0.025em] text-zinc-950 leading-[1.1] sm:leading-[1.05] mb-6 max-w-3xl mx-auto pt-6">
            <span className="block">Talk to your data.</span>
            <span className="block">Watch dashboards build</span>
            <span className="block italic text-zinc-400 font-normal">at the speed of voice.</span>
          </h1>

          {/* Subtitle */}
          <p className="max-w-xl mx-auto text-base sm:text-lg text-zinc-600 leading-relaxed font-normal mb-10">
            Speak naturally to your live business metrics. Full-duplex streaming voice with instant visual analytics and zero SQL hallucination.
          </p>

          {/* Hero CTAs: Streamlined to 2 clean actions */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 mb-14">
            <button
              onClick={() => onLaunchApp()}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white font-medium text-sm shadow-card hover:shadow-card-hover transition-all active:scale-[0.98]"
            >
              <Mic className="w-4 h-4" />
              <span>Launch Voice Dashboard</span>
              <ArrowRight className="w-4 h-4 text-zinc-400" />
            </button>

            <a
              href="#interactive-demo"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-white hover:bg-zinc-50 border border-zinc-200 text-zinc-800 font-medium text-sm shadow-xs transition-colors"
            >
              <Zap className="w-4 h-4 text-zinc-500" />
              <span>Try Live Simulation</span>
            </a>
          </div>

          {/* Stats Bar */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto pt-6 border-t border-zinc-200/80">
            <div className="p-3 bg-white/70 rounded-xl border border-zinc-200/70 shadow-xs">
              <p className="text-2xl font-bold text-zinc-900 tracking-tight">&lt; 100ms</p>
              <p className="text-xs text-zinc-500 font-medium mt-0.5">Execution Latency</p>
            </div>
            <div className="p-3 bg-white/70 rounded-xl border border-zinc-200/70 shadow-xs">
              <p className="text-2xl font-bold text-emerald-600 tracking-tight">100%</p>
              <p className="text-xs text-zinc-500 font-medium mt-0.5">30/30 Eval Score</p>
            </div>
            <div className="p-3 bg-white/70 rounded-xl border border-zinc-200/70 shadow-xs">
              <p className="text-2xl font-bold text-zinc-900 tracking-tight">150,146</p>
              <p className="text-xs text-zinc-500 font-medium mt-0.5">Seeded Fact Orders</p>
            </div>
            <div className="p-3 bg-white/70 rounded-xl border border-zinc-200/70 shadow-xs">
              <p className="text-2xl font-bold text-zinc-900 tracking-tight">0%</p>
              <p className="text-xs text-zinc-500 font-medium mt-0.5">SQL Hallucinations</p>
            </div>
          </div>
        </div>
      </section>

      {/* 3. INTERACTIVE HERO SIMULATION ("THE LIVING PREVIEW") */}
      <section id="interactive-demo" className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
            Interactive Product Demo
          </span>
          <h2 className="font-serif text-2xl sm:text-3xl md:text-4xl font-normal text-zinc-950 tracking-[-0.015em] mt-1.5">
            Test the conversational <span className="italic text-zinc-400">turn-taking engine</span>
          </h2>
          <p className="text-xs sm:text-sm text-zinc-600 mt-2">
            Click any conversational command below to watch the voice client, semantic compiler, and live chart adapt in real-time.
          </p>
        </div>

        {/* Demo Selector Tabs */}
        <div className="flex flex-wrap items-center justify-center gap-2 mb-6">
          {DEMO_SCENARIOS.map((sc) => (
            <button
              key={sc.id}
              onClick={() => setActiveScenario(sc)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                activeScenario.id === sc.id
                  ? 'bg-zinc-900 text-white border-zinc-900 shadow-xs'
                  : 'bg-white text-zinc-600 border-zinc-200 hover:bg-zinc-50 hover:text-zinc-900'
              }`}
            >
              {sc.badge}
            </button>
          ))}
        </div>

        {/* Floating App Preview Card */}
        <div className="rounded-2xl border border-zinc-200/90 bg-white shadow-card overflow-hidden">
          {/* Card Window Header */}
          <div className="px-4 py-3 bg-zinc-50 border-b border-zinc-200/80 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-rose-400" />
              <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
              <span className="text-xs font-mono text-zinc-400 ml-2">live-session · assemblyai-voice-agent</span>
            </div>

            <button
              onClick={() => onLaunchApp(activeScenario.userPrompt)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-zinc-900 hover:bg-zinc-800 text-white text-[11px] font-medium shadow-xs transition-colors"
            >
              <span>Open in Live Studio</span>
              <ArrowRight className="w-3 h-3 text-zinc-400" />
            </button>
          </div>

          {/* Card Inner Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[420px]">
            {/* Left 4 cols: Conversational Stream & Waveform */}
            <div className="lg:col-span-5 p-5 border-b lg:border-b-0 lg:border-r border-zinc-200/80 bg-zinc-50/40 flex flex-col justify-between gap-4">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-xs font-semibold text-zinc-900">Streaming Voice Log</span>
                  </div>
                  <span className="text-[10px] font-mono text-zinc-400">24 kHz PCM</span>
                </div>

                {/* Animated Voice Waveform Bar */}
                <div className="flex items-center justify-center gap-1 h-8 px-3 py-1 bg-white rounded-lg border border-zinc-200/80 shadow-xs mb-4">
                  {Array.from({ length: 24 }).map((_, i) => (
                    <div
                      key={i}
                      className="w-[2px] rounded-full bg-zinc-900 animate-pulse"
                      style={{
                        height: `${Math.max(20, Math.sin(i * 0.7) * 90)}%`,
                        animationDelay: `${i * 45}ms`,
                      }}
                    />
                  ))}
                </div>

                {/* Conversation Bubbles */}
                <div className="space-y-3">
                  {/* User Bubble */}
                  <div className="flex flex-col items-end">
                    <span className="text-[10px] text-zinc-400 font-medium mr-1 mb-0.5">Spoken Query</span>
                    <div className="max-w-[90%] px-3.5 py-2 rounded-2xl bg-zinc-900 text-white text-xs shadow-xs rounded-tr-xs">
                      &ldquo;{activeScenario.userPrompt}&rdquo;
                    </div>
                  </div>

                  {/* Agent Bubble */}
                  <div className="flex flex-col items-start">
                    <div className="flex items-center gap-1 ml-1 mb-0.5">
                      <Bot className="w-3 h-3 text-zinc-600" />
                      <span className="text-[10px] text-zinc-500 font-medium">Ivy (AssemblyAI Agent)</span>
                    </div>
                    <div className="max-w-[92%] px-3.5 py-2.5 rounded-2xl bg-white text-zinc-800 text-xs border border-zinc-200 shadow-xs rounded-tl-xs leading-relaxed">
                      {activeScenario.agentResponse}
                    </div>
                  </div>
                </div>
              </div>

              {/* Tool Execution Badge */}
              <div className="pt-3 border-t border-zinc-200/80">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-zinc-500 font-mono">Tool: execute_query</span>
                  <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 text-[10px] font-mono">
                    <Check className="w-2.5 h-2.5" /> applied
                  </span>
                </div>
              </div>
            </div>

            {/* Right 7 cols: Real Recharts Graphic + Compiled SQL */}
            <div className="lg:col-span-7 p-6 flex flex-col justify-between bg-white">
              <div>
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div>
                    <h3 className="font-semibold text-sm text-zinc-900">
                      {activeScenario.userPrompt}
                    </h3>
                    <p className="text-xs text-zinc-500 mt-0.5">{activeScenario.insight}</p>
                  </div>

                  <button
                    onClick={() => setShowSql(!showSql)}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border text-xs font-mono transition-colors ${
                      showSql
                        ? 'bg-zinc-900 text-white border-zinc-900'
                        : 'bg-white border-zinc-200 text-zinc-600 hover:bg-zinc-50'
                    }`}
                  >
                    <Code2 className="w-3 h-3" />
                    <span>{showSql ? 'Hide SQL' : 'Show SQL'}</span>
                  </button>
                </div>

                {/* SQL Drawer */}
                {showSql && (
                  <div className="mb-4">
                    <pre className="p-3 rounded-lg bg-zinc-950 text-zinc-300 font-mono text-[11px] leading-relaxed border border-zinc-800 overflow-x-auto">
                      <code>{activeScenario.sql}</code>
                    </pre>
                  </div>
                )}

                {/* Render Simulated Recharts Graphic */}
                <div className="mt-2">{renderDemoChart()}</div>
              </div>

              {/* Footer Insight Pill */}
              <div className="flex items-center gap-1.5 text-xs text-zinc-500 pt-3 border-t border-zinc-100 mt-4">
                <TrendingUp className="w-3.5 h-3.5 text-zinc-400 flex-shrink-0" />
                <span className="truncate">{activeScenario.insight}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. CORE ARCHITECTURE PILLARS (LINEAR / VERCEL STYLE) */}
      <section id="features" className="py-20 bg-white border-y border-zinc-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mb-14">
            <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
              Engineering Architecture
            </span>
            <h2 className="font-serif text-2xl sm:text-3xl md:text-4xl font-normal text-zinc-950 tracking-[-0.015em] mt-1.5">
              Built for speed, accuracy, and <span className="italic text-zinc-400">zero hallucination</span>
            </h2>
            <p className="text-sm text-zinc-600 mt-2">
              Every voice turn is engineered from first principles for low-latency streaming and deterministic database safety.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Feature 1 */}
            <div className="p-6 rounded-2xl border border-zinc-200/90 bg-[#fafafa] shadow-xs hover:shadow-subtle hover:border-zinc-300 transition-all">
              <div className="w-9 h-9 rounded-xl bg-zinc-900 text-white flex items-center justify-center mb-4 shadow-xs">
                <Volume2 className="w-4 h-4" />
              </div>
              <h3 className="font-semibold text-base text-zinc-900 mb-2">
                Full-Duplex 24 kHz Streaming
              </h3>
              <p className="text-xs text-zinc-600 leading-relaxed">
                Direct WebSocket connection to AssemblyAI Voice Agent API with sub-second turn-taking, acoustic noise suppression, and natural conversational barge-in interruption.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="p-6 rounded-2xl border border-zinc-200/90 bg-[#fafafa] shadow-xs hover:shadow-subtle hover:border-zinc-300 transition-all">
              <div className="w-9 h-9 rounded-xl bg-zinc-900 text-white flex items-center justify-center mb-4 shadow-xs">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <h3 className="font-semibold text-base text-zinc-900 mb-2">
                Zero SQL Hallucination
              </h3>
              <p className="text-xs text-zinc-600 leading-relaxed">
                The LLM never writes raw SQL. User queries compile deterministically through an allowlisted YAML semantic layer with strict parameter binding and synonym resolution.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="p-6 rounded-2xl border border-zinc-200/90 bg-[#fafafa] shadow-xs hover:shadow-subtle hover:border-zinc-300 transition-all">
              <div className="w-9 h-9 rounded-xl bg-zinc-900 text-white flex items-center justify-center mb-4 shadow-xs">
                <Zap className="w-4 h-4" />
              </div>
              <h3 className="font-semibold text-base text-zinc-900 mb-2">
                Client-Side Optimistic UI
              </h3>
              <p className="text-xs text-zinc-600 leading-relaxed">
                Tool dispatch executes directly in the browser runtime. Charts render and mutate in milliseconds before the conversational voice agent even finishes speaking.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="p-6 rounded-2xl border border-zinc-200/90 bg-[#fafafa] shadow-xs hover:shadow-subtle hover:border-zinc-300 transition-all">
              <div className="w-9 h-9 rounded-xl bg-zinc-900 text-white flex items-center justify-center mb-4 shadow-xs">
                <RotateCcw className="w-4 h-4" />
              </div>
              <h3 className="font-semibold text-base text-zinc-900 mb-2">
                Multi-Turn Memory & Corrections
              </h3>
              <p className="text-xs text-zinc-600 leading-relaxed">
                Say &ldquo;no, weekly not monthly&rdquo;, &ldquo;break that out by category&rdquo;, or &ldquo;compare to last year&rdquo;. The dashboard edits in place without wiping your state.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="p-6 rounded-2xl border border-zinc-200/90 bg-[#fafafa] shadow-xs hover:shadow-subtle hover:border-zinc-300 transition-all">
              <div className="w-9 h-9 rounded-xl bg-zinc-900 text-white flex items-center justify-center mb-4 shadow-xs">
                <Database className="w-4 h-4" />
              </div>
              <h3 className="font-semibold text-base text-zinc-900 mb-2">
                PostgreSQL & Embedded PGlite
              </h3>
              <p className="text-xs text-zinc-600 leading-relaxed">
                Connects to standard PostgreSQL 16 with a read-only role or runs seamlessly offline with in-browser embedded WASM PGlite across 150,146 seeded records.
              </p>
            </div>

            {/* Feature 6 */}
            <div className="p-6 rounded-2xl border border-zinc-200/90 bg-[#fafafa] shadow-xs hover:shadow-subtle hover:border-zinc-300 transition-all">
              <div className="w-9 h-9 rounded-xl bg-zinc-900 text-white flex items-center justify-center mb-4 shadow-xs">
                <ExternalLink className="w-4 h-4" />
              </div>
              <h3 className="font-semibold text-base text-zinc-900 mb-2">
                Native Metabase BI Export
              </h3>
              <p className="text-xs text-zinc-600 leading-relaxed">
                Export dashboards to your enterprise Metabase instance with a single voice command. Charts are transformed into native parameterized SQL cards with one click.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 5. EVALUATION HARNESS BENCHMARK PROOF (30/30 PASSED) */}
      <section id="benchmarks" className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mb-12">
          <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
            Evaluation Suite & Correctness
          </span>
          <h2 className="font-serif text-2xl sm:text-3xl md:text-4xl font-normal text-zinc-950 tracking-[-0.015em] mt-1.5">
            100% pass rate across <span className="italic text-zinc-400">30 conversational benchmarks</span>
          </h2>
          <p className="text-sm text-zinc-600 mt-2">
            Automated regression harness tests edge cases, spoken ambiguity, multi-turn follow-ups, and out-of-scope refusals.
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-zinc-200/90 shadow-card overflow-hidden">
          <div className="px-6 py-4 bg-zinc-50/80 border-b border-zinc-200/80 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span className="text-xs font-semibold text-zinc-900">
                Evaluation Benchmark Results · 30 Scenarios Verified
              </span>
            </div>
            <div className="flex items-center gap-3 text-xs font-mono text-zinc-500">
              <span>Median: 74ms</span>
              <span>·</span>
              <span>P95: 215ms</span>
              <span>·</span>
              <span className="text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                100% Passed
              </span>
            </div>
          </div>

          <div className="divide-y divide-zinc-100">
            {BENCHMARK_CATEGORIES.map((cat, idx) => (
              <div
                key={cat.name}
                className="px-6 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-zinc-50/50 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <span className="text-xs font-mono text-zinc-400 w-4 mt-0.5">{idx + 1}.</span>
                  <div>
                    <span className="text-xs font-medium text-zinc-900">{cat.name}</span>
                    <p className="text-[11px] text-zinc-500 mt-0.5">{cat.desc}</p>
                  </div>
                </div>

                <div className="flex items-center gap-4 ml-7 sm:ml-0 flex-shrink-0">
                  <span className="text-xs font-mono text-zinc-600">{cat.count} passed</span>
                  <span className="text-xs font-mono font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    {cat.pass}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 6. CURATED PROMPT GALLERY */}
      <section id="prompts" className="py-20 bg-white border-y border-zinc-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
              Prompt Library
            </span>
            <h2 className="font-serif text-2xl sm:text-3xl md:text-4xl font-normal text-zinc-950 tracking-[-0.015em] mt-1.5">
              Spoken queries you can try right now
            </h2>
            <p className="text-sm text-zinc-600 mt-2">
              Click any query below to launch into the live studio with that prompt pre-staged.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {CURATED_PROMPTS.map((item) => (
              <div
                key={item.prompt}
                onClick={() => onLaunchApp(item.prompt)}
                className="group p-5 rounded-2xl border border-zinc-200/90 bg-[#fafafa] hover:bg-white hover:border-zinc-300 hover:shadow-subtle cursor-pointer transition-all duration-150 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 bg-zinc-100 px-2 py-0.5 rounded border border-zinc-200">
                      {item.category}
                    </span>
                    <span className="text-[10px] font-medium text-zinc-400 group-hover:text-zinc-700 transition-colors">
                      {item.badge}
                    </span>
                  </div>
                  <h4 className="text-xs font-semibold text-zinc-900 group-hover:text-black leading-snug">
                    &ldquo;{item.prompt}&rdquo;
                  </h4>
                  <p className="text-[11px] text-zinc-500 mt-1.5 leading-relaxed">
                    {item.description}
                  </p>
                </div>

                <div className="flex items-center gap-1 text-[11px] font-medium text-zinc-900 group-hover:text-black pt-4 border-t border-zinc-200/60 mt-4 transition-colors">
                  <span>Try in Studio</span>
                  <ArrowRight className="w-3 h-3 text-zinc-400 group-hover:text-zinc-900 group-hover:translate-x-0.5 transition-all" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 7. ARCHITECTURE WORKFLOW FLOW */}
      <section id="architecture" className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mb-12">
          <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
            Technical Flow
          </span>
          <h2 className="font-serif text-2xl sm:text-3xl md:text-4xl font-normal text-zinc-950 tracking-[-0.015em] mt-1.5">
            How natural voice turns into live visual metrics
          </h2>
          <p className="text-sm text-zinc-600 mt-2">
            A secure 4-stage pipeline that eliminates raw LLM query hallucination.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="p-5 rounded-xl bg-white border border-zinc-200/90 shadow-xs relative">
            <span className="text-xs font-mono font-semibold text-zinc-400">01</span>
            <h3 className="font-semibold text-sm text-zinc-900 mt-2">Audio Capture</h3>
            <p className="text-xs text-zinc-500 mt-1 leading-relaxed">
              Browser records 24 kHz mono PCM16 audio and streams chunks directly over WebSocket.
            </p>
          </div>

          <div className="p-5 rounded-xl bg-white border border-zinc-200/90 shadow-xs relative">
            <span className="text-xs font-mono font-semibold text-zinc-400">02</span>
            <h3 className="font-semibold text-sm text-zinc-900 mt-2">AssemblyAI Agent</h3>
            <p className="text-xs text-zinc-500 mt-1 leading-relaxed">
              Speech-to-speech engine interprets intent, handles interruptions, and dispatches tool calls.
            </p>
          </div>

          <div className="p-5 rounded-xl bg-white border border-zinc-200/90 shadow-xs relative">
            <span className="text-xs font-mono font-semibold text-zinc-400">03</span>
            <h3 className="font-semibold text-sm text-zinc-900 mt-2">YAML Compiler</h3>
            <p className="text-xs text-zinc-500 mt-1 leading-relaxed">
              Strict semantic validator compiles structured AST into parameterized SQL with zero injection.
            </p>
          </div>

          <div className="p-5 rounded-xl bg-white border border-zinc-200/90 shadow-xs relative">
            <span className="text-xs font-mono font-semibold text-zinc-400">04</span>
            <h3 className="font-semibold text-sm text-zinc-900 mt-2">Optimistic Render</h3>
            <p className="text-xs text-zinc-500 mt-1 leading-relaxed">
              Zustand store mutates in &lt;100ms; Recharts renders responsive cards while Ivy speaks the insight.
            </p>
          </div>
        </div>
      </section>

      {/* 8. FINAL CALL TO ACTION */}
      <section className="py-20 bg-zinc-950 text-white relative overflow-hidden">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center relative z-10">
          <div className="w-12 h-12 rounded-2xl bg-white/10 text-white flex items-center justify-center mx-auto mb-6 backdrop-blur-sm border border-white/10">
            <Mic className="w-6 h-6" />
          </div>
          <h2 className="font-serif text-3xl sm:text-4xl md:text-5xl font-normal tracking-[-0.02em] mb-4">
            Ready to talk to your <span className="font-serif italic text-zinc-400">data?</span>
          </h2>
          <p className="text-zinc-400 text-sm sm:text-base max-w-xl mx-auto mb-8 leading-relaxed">
            Experience the future of business intelligence. Speak your questions and watch live dashboards assemble before your eyes.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={() => onLaunchApp()}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-white hover:bg-zinc-100 text-zinc-950 font-medium text-sm shadow-md transition-all active:scale-[0.98]"
            >
              <Mic className="w-4 h-4 text-zinc-900" />
              <span>Launch Live Dashboard</span>
              <ArrowRight className="w-4 h-4 text-zinc-500" />
            </button>
            <a
              href="https://github.com/shridharm/justtalk"
              target="_blank"
              rel="noreferrer"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 font-medium text-sm border border-white/10 transition-colors"
            >
              <Code2 className="w-4 h-4" />
              <span>Explore GitHub Repository</span>
            </a>
          </div>
        </div>
      </section>

      {/* 9. FOOTER */}
      <footer className="py-8 bg-[#fafafa] border-t border-zinc-200/80 text-xs text-zinc-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded bg-zinc-900 flex items-center justify-center text-white text-[10px] font-bold">
              S
            </div>
            <span className="font-semibold text-zinc-900">Soundboard</span>
            <span className="text-zinc-300">·</span>
            <span>Conversational Voice Analytics</span>
          </div>

          <div className="flex items-center gap-6">
            <a href="#features" className="hover:text-zinc-900 transition-colors">Features</a>
            <a href="#benchmarks" className="hover:text-zinc-900 transition-colors">Benchmarks</a>
            <a href="#prompts" className="hover:text-zinc-900 transition-colors">Prompts</a>
            <a href="https://www.assemblyai.com" target="_blank" rel="noreferrer" className="hover:text-zinc-900 transition-colors">AssemblyAI</a>
          </div>
        </div>
      </footer>
    </div>
  );
};
