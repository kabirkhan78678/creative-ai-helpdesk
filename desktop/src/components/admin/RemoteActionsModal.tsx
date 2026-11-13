import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Lock, RotateCcw, Trash2, Wifi, Activity, AlertCircle, CheckCircle2, ShieldAlert } from 'lucide-react';
import { Device } from '../../types';
import { getApiBaseUrl } from '../../config/api';

interface RemoteActionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  device: Device;
  onOpenTaskManager: (device: Device) => void;
}

export const RemoteActionsModal: React.FC<RemoteActionsModalProps> = ({
  isOpen,
  onClose,
  device,
  onOpenTaskManager,
}) => {
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  if (!isOpen) return null;

  const handleAction = async (action: 'LOCK' | 'RESTART' | 'CLEAN_TEMP' | 'FLUSH_DNS') => {
    setLoadingAction(action);
    setFeedback(null);

    try {
      // 1. If executing on the current local machine directly via Electron
      if (typeof window !== 'undefined' && (window as any).electronAPI?.executeRemoteAction) {
        const localSpecs = (window as any).electronAPI.getSystemSpecs?.();
        if (localSpecs && localSpecs.hostname.toLowerCase() === device.hostname.toLowerCase()) {
          const res = (window as any).electronAPI.executeRemoteAction(action);
          if (res.success) {
            setFeedback({ type: 'success', message: res.message || 'Action executed successfully.' });
          } else {
            setFeedback({ type: 'error', message: res.message || 'Action execution failed.' });
          }
          setLoadingAction(null);
          return;
        }
      }

      // 2. Dispatch across network to employee's PC via Backend WebSocket Hub
      const res = await fetch(`${getApiBaseUrl()}/devices/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          target_hostname: device.hostname,
          target_device_id: device.id,
        }),
      });

      if (res.ok) {
        setFeedback({
          type: 'success',
          message: `Remote command [${action}] dispatched to ${device.hostname}.`,
        });
      } else {
        setFeedback({ type: 'error', message: 'Failed to dispatch command to device.' });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Network error occurred.' });
    } finally {
      setLoadingAction(null);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xl max-w-md w-full relative"
        >
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Activity className="w-5 h-5 text-brand-600" /> Remote IT Toolkit
              </h3>
              <p className="text-xs text-slate-500 font-mono mt-0.5">
                Target: <span className="font-bold text-slate-700">{device.hostname}</span> ({device.ip_address})
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {feedback && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              className={`mt-4 p-3 rounded-2xl text-xs font-medium flex items-center gap-2 border ${
                feedback.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : 'bg-rose-50 text-rose-800 border-rose-200'
              }`}
            >
              {feedback.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              )}
              <span>{feedback.message}</span>
            </motion.div>
          )}

          <div className="grid grid-cols-2 gap-3 mt-5">
            {/* Lock */}
            <button
              onClick={() => handleAction('LOCK')}
              disabled={!!loadingAction}
              className="p-4 rounded-2xl bg-slate-50 hover:bg-slate-100 border border-slate-200/80 hover:border-brand-200 flex flex-col items-center text-center transition-all group cursor-pointer"
            >
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                <Lock className="w-5 h-5" />
              </div>
              <span className="text-xs font-bold text-slate-800">Lock Screen</span>
              <span className="text-[10px] text-slate-400 mt-0.5">Secure workstation</span>
            </button>

            {/* Restart */}
            <button
              onClick={() => handleAction('RESTART')}
              disabled={!!loadingAction}
              className="p-4 rounded-2xl bg-slate-50 hover:bg-slate-100 border border-slate-200/80 hover:border-brand-200 flex flex-col items-center text-center transition-all group cursor-pointer"
            >
              <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                <RotateCcw className="w-5 h-5" />
              </div>
              <span className="text-xs font-bold text-slate-800">Restart PC</span>
              <span className="text-[10px] text-slate-400 mt-0.5">15-sec countdown</span>
            </button>

            {/* Clean Temp */}
            <button
              onClick={() => handleAction('CLEAN_TEMP')}
              disabled={!!loadingAction}
              className="p-4 rounded-2xl bg-slate-50 hover:bg-slate-100 border border-slate-200/80 hover:border-brand-200 flex flex-col items-center text-center transition-all group cursor-pointer"
            >
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                <Trash2 className="w-5 h-5" />
              </div>
              <span className="text-xs font-bold text-slate-800">Clean Junk</span>
              <span className="text-[10px] text-slate-400 mt-0.5">Free disk temp files</span>
            </button>

            {/* Flush DNS */}
            <button
              onClick={() => handleAction('FLUSH_DNS')}
              disabled={!!loadingAction}
              className="p-4 rounded-2xl bg-slate-50 hover:bg-slate-100 border border-slate-200/80 hover:border-brand-200 flex flex-col items-center text-center transition-all group cursor-pointer"
            >
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                <Wifi className="w-5 h-5" />
              </div>
              <span className="text-xs font-bold text-slate-800">Flush DNS</span>
              <span className="text-[10px] text-slate-400 mt-0.5">Reset network cache</span>
            </button>
          </div>

          {/* Task Manager button */}
          <div className="mt-4 pt-4 border-t border-slate-100">
            <button
              onClick={() => {
                onClose();
                onOpenTaskManager(device);
              }}
              className="w-full py-2.5 px-4 rounded-xl bg-brand-50 hover:bg-brand-100 border border-brand-200 text-brand-700 font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <Activity className="w-4 h-4 text-brand-600" />
              <span>Open Remote Process Manager (Task Manager)</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

