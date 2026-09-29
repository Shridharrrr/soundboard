import React, { useState, useEffect } from 'react';
import { useDashboardStore, type DashboardItem } from '../store/dashboard.js';
import { X, Edit3, Trash2, Check, AlertTriangle } from 'lucide-react';

interface EditDashboardModalProps {
  isOpen: boolean;
  dashboard: DashboardItem | null;
  onClose: () => void;
}

export const EditDashboardModal: React.FC<EditDashboardModalProps> = ({
  isOpen,
  dashboard,
  onClose,
}) => {
  const store = useDashboardStore();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);

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

  useEffect(() => {
    if (dashboard) {
      setTitle(dashboard.title);
      setDescription(dashboard.description || '');
      setShowConfirmDelete(false);
    }
  }, [dashboard]);

  if (!isOpen || !dashboard) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    store.renameDashboard(dashboard.id, title, description);
    onClose();
  };

  const handleDelete = () => {
    store.deleteDashboard(dashboard.id);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-zinc-950/45 backdrop-blur-xs p-4 sm:p-6 flex min-h-screen items-center justify-center animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="relative bg-white rounded-2xl border border-zinc-200 shadow-2xl w-full max-w-md my-auto flex flex-col max-h-[min(90vh,600px)] overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-100 flex items-center justify-between shrink-0 bg-white">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-zinc-900 text-white flex items-center justify-center shadow-xs flex-shrink-0">
              <Edit3 className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-display font-semibold text-sm text-zinc-950">Dashboard Settings</h2>
              <p className="text-xs text-zinc-500">Edit details or remove dashboard</p>
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

        {/* Form Body */}
        <form onSubmit={handleSave} className="flex flex-col flex-1 overflow-hidden">
          <div className="p-6 space-y-4 overflow-y-auto flex-1">
            <div>
              <label className="block text-xs font-semibold text-zinc-800 mb-1.5">
                Dashboard Name
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-white border border-zinc-200 text-xs text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-900 focus:border-zinc-900 shadow-xs transition-colors"
              />
            </div>

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
                placeholder="Add optional context..."
                className="w-full px-3.5 py-2 rounded-xl bg-white border border-zinc-200 text-xs text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-900 focus:border-zinc-900 shadow-xs transition-colors"
              />
            </div>

            {/* Delete Danger Zone */}
            <div className="pt-3 border-t border-zinc-100">
              {showConfirmDelete ? (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl space-y-2">
                  <div className="flex items-center gap-2 text-rose-800 text-xs font-medium">
                    <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                    <span>Are you sure you want to delete this dashboard?</span>
                  </div>
                  <p className="text-[11px] text-rose-700">
                    All {dashboard.charts.length} charts inside this dashboard will be removed.
                  </p>
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={handleDelete}
                      className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-medium shadow-xs transition-colors"
                    >
                      Yes, Delete
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowConfirmDelete(false)}
                      className="px-3 py-1.5 rounded-lg border border-zinc-200 bg-white text-zinc-700 text-xs hover:bg-zinc-50 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-zinc-500">Need to remove this dashboard?</span>
                  <button
                    type="button"
                    onClick={() => setShowConfirmDelete(true)}
                    className="inline-flex items-center gap-1.5 text-xs text-rose-600 hover:text-rose-700 font-medium px-2 py-1 rounded-lg hover:bg-rose-50 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete</span>
                  </button>
                </div>
              )}
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
              <Check className="w-3.5 h-3.5" />
              <span>Save Changes</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
