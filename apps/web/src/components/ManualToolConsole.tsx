import React, { useState } from 'react';
import { executeToolCall } from '../tools/handlers.js';
import { Terminal, Play, ChevronDown, ChevronUp } from 'lucide-react';

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
    <div className="bg-white rounded-xl overflow-hidden border border-zinc-200/90 shadow-xs text-xs">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-3.5 py-2.5 bg-white hover:bg-zinc-50 transition-colors font-medium text-zinc-700"
      >
        <div className="flex items-center gap-2">
          <Terminal className="w-3.5 h-3.5 text-zinc-600" />
          <span>Manual Tool Console (Dev / Test)</span>
        </div>
        {isOpen ? <ChevronUp className="w-4 h-4 text-zinc-400" /> : <ChevronDown className="w-4 h-4 text-zinc-400" />}
      </button>

      {isOpen && (
        <div className="p-3 bg-zinc-50/60 border-t border-zinc-200 space-y-3">
          {/* Quick Preset Buttons */}
          <div>
            <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider block mb-1.5">
              Quick Test Sequences:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {PRESETS.map((p) => (
                <button
                  key={p.label}
                  onClick={() => handleSelectPreset(p)}
                  className="px-2 py-1 rounded bg-white hover:bg-zinc-100 border border-zinc-200/90 text-[11px] text-zinc-700 font-medium shadow-xs transition-colors"
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Form */}
          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-1">
              <label className="text-[10px] font-medium text-zinc-500 block mb-1">Tool Name</label>
              <input
                type="text"
                value={toolName}
                onChange={(e) => setToolName(e.target.value)}
                className="w-full px-2 py-1.5 rounded bg-white border border-zinc-200 text-zinc-800 font-mono text-xs focus:outline-none focus:border-zinc-900"
              />
            </div>
            <div className="col-span-2 flex items-end">
              <button
                onClick={handleRun}
                disabled={isExecuting}
                className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white font-medium shadow-xs transition-colors disabled:opacity-50"
              >
                <Play className="w-3 h-3 fill-current" />
                <span>{isExecuting ? 'Executing...' : 'Run Tool'}</span>
              </button>
            </div>
          </div>

          <div>
            <label className="text-[10px] font-medium text-zinc-500 block mb-1">Arguments JSON</label>
            <textarea
              value={rawJson}
              onChange={(e) => setRawJson(e.target.value)}
              rows={4}
              className="w-full p-2 rounded bg-white border border-zinc-200 font-mono text-[11px] text-zinc-700 focus:outline-none focus:border-zinc-900"
            />
          </div>

          {lastOutput && (
            <div>
              <span className="text-[10px] font-medium text-zinc-500 block mb-1">Result:</span>
              <pre className="p-2 rounded bg-zinc-950 border border-zinc-800 font-mono text-[10px] text-emerald-400 overflow-x-auto max-h-24">
                <code>{lastOutput}</code>
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
