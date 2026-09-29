import React, { useState, useEffect } from 'react';
import { useDashboardStore } from '../store/dashboard.js';
import type { ChartSpec } from '@vd/shared';
import {
  X,
  Layout,
  BarChart3,
  TrendingUp,
  Sparkles,
  ArrowRight,
  CheckCircle2,
} from 'lucide-react';

interface CreateDashboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated?: (dashboardId: string) => void;
}

interface TemplateOption {
  id: string;
  name: string;
  description: string;
  icon: React.FC<{ className?: string }>;
  charts: ChartSpec[];
}

const TEMPLATES: TemplateOption[] = [
  {
    id: 'blank',
    name: 'Blank Canvas (Voice First)',
    description: 'Clean workspace ready for your spoken questions and real-time visualization.',
    icon: Sparkles,
    charts: [],
  },
  {
    id: 'executive',
    name: 'Executive Sales Pulse',
    description: 'Pre-loads Q3 regional revenue breakdown and 2026 monthly order trajectory.',
    icon: BarChart3,
    charts: [
      {
        id: 'c1',
        title: 'Q3 Revenue by Region',
        metric: 'revenue',
        group_by: 'region',
        time_range: { preset: 'this_quarter' },
        filters: [],
        compare_to: 'none',
        chart_type: 'bar',
      },
      {
        id: 'c2',
        title: 'Monthly Order Volume (2026)',
        metric: 'orders',
        time_granularity: 'month',
        time_range: { preset: 'this_year' },
        filters: [],
        compare_to: 'none',
        chart_type: 'area',
      },
    ],
  },
  {
    id: 'category',
    name: 'Category & YoY Benchmarking',
    description: 'Pre-loads product category share and year-over-year revenue growth comparison.',
    icon: TrendingUp,
    charts: [
      {
        id: 'c1',
        title: 'Revenue Share by Category',
        metric: 'revenue',
        group_by: 'category',
        time_range: { preset: 'this_year' },
        filters: [],
        compare_to: 'none',
        chart_type: 'donut',
      },
      {
        id: 'c2',
        title: 'Category Performance vs Previous Year',
        metric: 'revenue',
        group_by: 'category',
        time_range: { preset: 'this_quarter' },
        filters: [],
        compare_to: 'previous_year',
        chart_type: 'line',
      },
    ],
  },
];

export const CreateDashboardModal: React.FC<CreateDashboardModalProps> = ({
  isOpen,
  onClose,
  onCreated,
}) => {
  const store = useDashboardStore();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<string>('blank');

  // Handle ESC key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setTitle('');
      setDescription('');
      setSelectedTemplate('blank');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    const finalTitle = title.trim() || `Dashboard #${store.dashboards.length + 1}`;
    const tmpl = TEMPLATES.find(t => t.id === selectedTemplate);
    const initialCharts = tmpl ? tmpl.charts : [];

    const newId = store.createDashboard(finalTitle, description, initialCharts);
    onClose();
    onCreated?.(newId);
  };

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-zinc-950/45 backdrop-blur-xs p-4 sm:p-6 flex min-h-screen items-center justify-center animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="relative bg-white rounded-2xl border border-zinc-200 shadow-2xl w-full max-w-lg my-auto flex flex-col max-h-[min(90vh,680px)] overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-100 flex items-center justify-between shrink-0 bg-white">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-zinc-900 text-white flex items-center justify-center shadow-xs flex-shrink-0">
              <Layout className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-display font-semibold text-sm text-zinc-950">Create New Dashboard</h2>
              <p className="text-xs text-zinc-500">Add a dedicated workspace to organize metrics</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            title="Close (Esc)"
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body - Scrollable if screen height is constrained */}
        <form onSubmit={handleCreate} className="flex flex-col flex-1 overflow-hidden">
          <div className="p-6 space-y-4 overflow-y-auto flex-1">
            {/* Dashboard Name */}
            <div>
              <label className="block text-xs font-semibold text-zinc-800 mb-1.5">
                Dashboard Name
              </label>
              <input
                type="text"
                required
                autoFocus
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Q3 Sales & Regional Pulse"
                className="w-full px-3.5 py-2 rounded-xl bg-white border border-zinc-200 text-xs text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-900 focus:border-zinc-900 shadow-xs transition-colors"
              />
            </div>

            {/* Description */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-zinc-800">
                  Description
                </label>
                <span className="text-[11px] text-zinc-400">Optional</span>
              </div>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g. Executive weekly check-in dashboard"
                className="w-full px-3.5 py-2 rounded-xl bg-white border border-zinc-200 text-xs text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-900 focus:border-zinc-900 shadow-xs transition-colors"
              />
            </div>

            {/* Starter Template Selection */}
            <div>
              <label className="block text-xs font-semibold text-zinc-800 mb-2">
                Starter Layout
              </label>
              <div className="space-y-2">
                {TEMPLATES.map((tmpl) => {
                  const Icon = tmpl.icon;
                  const isSelected = selectedTemplate === tmpl.id;
                  return (
                    <div
                      key={tmpl.id}
                      onClick={() => {
                        setSelectedTemplate(tmpl.id);
                        if (!title && tmpl.id !== 'blank') {
                          setTitle(tmpl.name);
                        }
                      }}
                      className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-zinc-50/80 border-zinc-900 shadow-xs ring-1 ring-zinc-900/10'
                          : 'bg-white border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50/40'
                      }`}
                    >
                      <div
                        className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors ${
                          isSelected ? 'bg-zinc-900 text-white' : 'bg-zinc-100 text-zinc-600'
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className={`text-xs font-medium ${isSelected ? 'text-zinc-950 font-semibold' : 'text-zinc-800'}`}>
                            {tmpl.name}
                          </span>
                          <div className="flex items-center gap-1.5">
                            {tmpl.charts.length > 0 ? (
                              <span className="text-[10px] font-mono text-zinc-600 bg-zinc-100 px-1.5 py-0.5 rounded border border-zinc-200/60">
                                {tmpl.charts.length} charts
                              </span>
                            ) : (
                              <span className="text-[10px] font-mono text-zinc-400 bg-zinc-50 px-1.5 py-0.5 rounded">
                                Empty
                              </span>
                            )}
                            {isSelected && (
                              <CheckCircle2 className="w-3.5 h-3.5 text-zinc-900" />
                            )}
                          </div>
                        </div>
                        <p className="text-[11px] text-zinc-500 mt-0.5 leading-relaxed">
                          {tmpl.description}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="px-6 py-3.5 border-t border-zinc-100 flex items-center justify-end gap-2.5 shrink-0 bg-zinc-50/80">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-zinc-200 bg-white text-xs font-medium text-zinc-700 hover:bg-zinc-50 hover:text-zinc-900 transition-colors shadow-2xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-medium shadow-xs transition-all active:scale-[0.98]"
            >
              <span>Create Dashboard</span>
              <ArrowRight className="w-3.5 h-3.5 text-zinc-400" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
