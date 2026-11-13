import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Megaphone, Send, AlertTriangle, Info, ShieldAlert } from 'lucide-react';
import { getApiBaseUrl } from '../../config/api';
import { User } from '../../types';

interface BroadcastModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  onAnnouncementCreated?: () => void;
}

export const BroadcastModal: React.FC<BroadcastModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onAnnouncementCreated,
}) => {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [priority, setPriority] = useState<'INFO' | 'WARNING' | 'CRITICAL'>('INFO');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) return;

    setIsSubmitting(true);
    try {
      const res = await fetch(`${getApiBaseUrl()}/announcements`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          message: message.trim(),
          priority,
          created_by_id: currentUser.id,
        }),
      });

      if (res.ok) {
        setTitle('');
        setMessage('');
        onAnnouncementCreated?.();
        onClose();
      }
    } catch (err) {
      console.error('Failed to post announcement:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xl max-w-lg w-full relative"
        >
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Megaphone className="w-5 h-5 text-brand-600" /> Broadcast Company Announcement
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Pops up instantly on all connected employee workstation screens
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="mt-5 space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Announcement Priority
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setPriority('INFO')}
                  className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border transition-all cursor-pointer ${
                    priority === 'INFO'
                      ? 'bg-blue-50 text-blue-700 border-blue-300 shadow-xs'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <Info className="w-3.5 h-3.5" />
                  <span>General Info</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPriority('WARNING')}
                  className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border transition-all cursor-pointer ${
                    priority === 'WARNING'
                      ? 'bg-amber-50 text-amber-700 border-amber-300 shadow-xs'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>Warning</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPriority('CRITICAL')}
                  className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border transition-all cursor-pointer ${
                    priority === 'CRITICAL'
                      ? 'bg-rose-50 text-rose-700 border-rose-300 shadow-xs'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <ShieldAlert className="w-3.5 h-3.5" />
                  <span>Critical Alert</span>
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Notice Title
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Scheduled Network Maintenance at 6:00 PM"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-brand-500 font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Announcement Message
              </label>
              <textarea
                required
                rows={4}
                placeholder="Write the message that all employees will see..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-brand-500 font-medium resize-none"
              />
            </div>

            <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !title.trim() || !message.trim()}
                className="px-5 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs flex items-center space-x-2 shadow-sm transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{isSubmitting ? 'Broadcasting...' : 'Broadcast to All PCs'}</span>
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

