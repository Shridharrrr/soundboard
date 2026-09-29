import React, { useState, useRef, useEffect } from 'react';
import { useDashboardStore, type DashboardItem } from '../store/dashboard.js';
import {
  Layout,
  ChevronDown,
  Plus,
  Check,
  MoreVertical,
  Edit2,
  Copy,
  Trash2,
  FolderOpen,
} from 'lucide-react';
import { CreateDashboardModal } from './CreateDashboardModal.js';
import { EditDashboardModal } from './EditDashboardModal.js';

export const DashboardSwitcher: React.FC = () => {
  const store = useDashboardStore();
  const [isOpen, setIsOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingDashboard, setEditingDashboard] = useState<DashboardItem | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const activeDashboard =
    store.dashboards.find(d => d.id === store.activeDashboardId) ||
    store.dashboards[0];

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleSelectDashboard = (id: string) => {
    store.switchDashboard(id);
    setIsOpen(false);
  };

  const handleDuplicate = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    store.duplicateDashboard(id);
  };

  const handleOpenEdit = (e: React.MouseEvent, dash: DashboardItem) => {
    e.stopPropagation();
    setEditingDashboard(dash);
    setIsOpen(false);
  };

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (store.dashboards.length > 1) {
      store.deleteDashboard(id);
    } else {
      alert('You must have at least one dashboard.');
    }
  };

  return (
    <>
      <div className="relative inline-block" ref={dropdownRef}>
        {/* Trigger Button */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-zinc-200/90 bg-white hover:bg-zinc-50 hover:border-zinc-300 text-xs font-medium text-zinc-900 shadow-xs transition-all active:scale-[0.98]"
        >
          <div className="w-4 h-4 rounded bg-zinc-900 flex items-center justify-center text-white flex-shrink-0">
            <Layout className="w-2.5 h-2.5" />
          </div>

          <span className="font-semibold text-xs tracking-tight max-w-[140px] sm:max-w-[180px] truncate">
            {activeDashboard?.title || 'Dashboards'}
          </span>

          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-zinc-100 text-zinc-500 border border-zinc-200">
            {store.charts.length} {store.charts.length === 1 ? 'chart' : 'charts'}
          </span>

          <ChevronDown
            className={`w-3.5 h-3.5 text-zinc-400 transition-transform duration-150 ${
              isOpen ? 'rotate-180' : ''
            }`}
          />
        </button>

        {/* Dropdown Popover */}
        {isOpen && (
          <div className="absolute left-0 mt-1.5 w-72 sm:w-80 rounded-2xl bg-white border border-zinc-200 shadow-xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
            {/* Popover Header */}
            <div className="p-3 bg-zinc-50/70 border-b border-zinc-100 flex items-center justify-between">
              <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">
                My Dashboards ({store.dashboards.length})
              </span>
              <button
                onClick={() => {
                  setIsCreateOpen(true);
                  setIsOpen(false);
                }}
                className="inline-flex items-center gap-1 text-[11px] font-medium text-zinc-900 hover:text-black bg-white px-2 py-0.5 rounded-md border border-zinc-200 hover:border-zinc-300 shadow-xs transition-colors"
              >
                <Plus className="w-3 h-3" />
                <span>New</span>
              </button>
            </div>

            {/* Dashboard List */}
            <div className="max-h-64 overflow-y-auto divide-y divide-zinc-100 p-1">
              {store.dashboards.map((dash) => {
                const isActive = dash.id === store.activeDashboardId;
                const chartCount = dash.charts?.length || 0;

                return (
                  <div
                    key={dash.id}
                    onClick={() => handleSelectDashboard(dash.id)}
                    className={`group flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition-colors ${
                      isActive
                        ? 'bg-zinc-100/90 text-zinc-950 font-medium'
                        : 'hover:bg-zinc-50 text-zinc-700'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <div
                        className={`w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 ${
                          isActive
                            ? 'bg-zinc-900 text-white'
                            : 'bg-zinc-100 text-zinc-500 group-hover:text-zinc-900'
                        }`}
                      >
                        {isActive ? (
                          <Check className="w-3 h-3 stroke-[2.5]" />
                        ) : (
                          <FolderOpen className="w-3 h-3" />
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="text-xs truncate font-medium">{dash.title}</p>
                        <p className="text-[10px] text-zinc-400 font-mono">
                          {chartCount} {chartCount === 1 ? 'chart' : 'charts'}
                        </p>
                      </div>
                    </div>

                    {/* Actions Menu */}
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        title="Edit Details"
                        onClick={(e) => handleOpenEdit(e, dash)}
                        className="p-1 rounded text-zinc-400 hover:text-zinc-700 hover:bg-zinc-200/60 transition-colors"
                      >
                        <Edit2 className="w-3 h-3" />
                      </button>

                      <button
                        title="Duplicate"
                        onClick={(e) => handleDuplicate(e, dash.id)}
                        className="p-1 rounded text-zinc-400 hover:text-zinc-700 hover:bg-zinc-200/60 transition-colors"
                      >
                        <Copy className="w-3 h-3" />
                      </button>

                      {store.dashboards.length > 1 && (
                        <button
                          title="Delete Dashboard"
                          onClick={(e) => handleDelete(e, dash.id)}
                          className="p-1 rounded text-zinc-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Popover Footer */}
            <div className="p-2 border-t border-zinc-100 bg-zinc-50/40">
              <button
                onClick={() => {
                  setIsCreateOpen(true);
                  setIsOpen(false);
                }}
                className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium text-zinc-700 hover:text-zinc-950 hover:bg-zinc-100 border border-dashed border-zinc-200 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create New Dashboard</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      <CreateDashboardModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
      />

      <EditDashboardModal
        isOpen={Boolean(editingDashboard)}
        dashboard={editingDashboard}
        onClose={() => setEditingDashboard(null)}
      />
    </>
  );
};
