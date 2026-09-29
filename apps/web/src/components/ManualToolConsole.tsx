import React, { useState } from 'react';
import { executeToolCall } from '../tools/handlers.js';
import { Terminal, Play, ChevronDown, ChevronUp, Copy } from 'lucide-react';

interface ManualToolConsoleProps {
  onExecuted?: () => void;
}

const PRESETS = [
  {
    label: '1. Add Revenue by Region (Q3)',
    name: 'add_chart',
    args: {
      metric: 'revenue',
      group_by: 'region',
      time_range: { preset: 'this_quarter' },
      chart_type: 'bar',
    },
  },
  {
    label: '2. Filter Southeast & Group by Category',
    name: 'update_chart',
    args: {
      chart_id: 'last',
      filters: [{ dimension: 'region', values: ['Southeast'] }],
      group_by: 'category',
    },
  },
  {
    label: '3. Weekly Granularity (Clear Group)',
    name: 'update_chart',
    args: {
      chart_id: 'last',
      time_granularity: 'week',
      group_by: '',
    },
  },
  {
    label: '4. Compare to Previous Year',
    name: 'update_chart',
    args: {
      chart_id: 'last',
      compare_to: 'previous_year',
    },
  },
  {
    label: '5. Undo Last Action',
    name: 'undo',
    args: {},
  },
];

export const ManualToolConsole: React.FC<ManualToolConsoleProps> = ({ onExecuted }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [toolName, setToolName] = useState('add_chart');
  const [rawJson, setRawJson] = useState(JSON.stringify(PRESETS[0].args, null, 2));
  const [lastOutput, setLastOutput] = useState<string | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);

  const handleRun = async () => {
    setIsExecuting(true);
    try {
      const parsedArgs = JSON.parse(rawJson);
      const res = await executeToolCall(toolName, parsedArgs);
      setLastOutput(res.result);
      onExecuted?.();
    } catch (err) {
      setLastOutput(JSON.stringify({ ok: false, error: String(err) }, null, 2));
    } finally {
      setIsExecuting(false);
    }
  };

  const handleSelectPreset = (preset: typeof PRESETS[0]) => {
    setToolName(preset.name);
    setRawJson(JSON.stringify(preset.args, null, 2));
  };

  return (
    <div className="glass-panel rounded-xl overflow-hidden border border-slate-800 text-xs">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-3.5 py-2.5 bg-dark-850 hover:bg-dark-800 transition-colors font-medium text-slate-300"
      >
        <div className="flex items-center gap-2">
          <Terminal className="w-3.5 h-3.5 text-brand-400" />
          <span>Manual Tool Console (Dev / Demo)</span>
        </div>
        {isOpen ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
      </button>

      {isOpen && (
        <div className="p-3 bg-dark-900 border-t border-slate-800 space-y-3">
          {/* Quick Preset Buttons */}
          <div>
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">
              Quick Test Sequences:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {PRESETS.map((p) => (
                <button
                  key={p.label}
                  onClick={() => handleSelectPreset(p)}
                  className="px-2 py-1 rounded bg-dark-800 hover:bg-brand-600/20 hover:border-brand-500/40 border border-slate-700/60 text-[11px] text-slate-300 transition-colors"
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Form */}
          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-1">
              <label className="text-[11px] text-slate-400 block mb-1">Tool Name</label>
              <input
                type="text"
                value={toolName}
                onChange={(e) => setToolName(e.target.value)}
                className="w-full px-2 py-1.5 rounded bg-dark-800 border border-slate-700 text-slate-100 font-mono text-xs focus:outline-none focus:border-brand-500"
              />
            </div>
            <div className="col-span-2 flex items-end">
              <button
                onClick={handleRun}
                disabled={isExecuting}
                className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded bg-brand-600 hover:bg-brand-500 text-white font-medium transition-colors disabled:opacity-50"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>{isExecuting ? 'Executing...' : 'Run Tool'}</span>
              </button>
            </div>
          </div>

          <div>
            <label className="text-[11px] text-slate-400 block mb-1">Arguments JSON</label>
            <textarea
              value={rawJson}
              onChange={(e) => setRawJson(e.target.value)}
              rows={4}
              className="w-full p-2 rounded bg-dark-850 border border-slate-800 font-mono text-[11px] text-slate-200 focus:outline-none focus:border-brand-500"
            />
          </div>

          {lastOutput && (
            <div>
              <span className="text-[11px] text-slate-400 block mb-1">Result:</span>
              <pre className="p-2 rounded bg-dark-850 border border-slate-800 font-mono text-[10px] text-emerald-400/90 overflow-x-auto max-h-24">
                <code>{lastOutput}</code>
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
