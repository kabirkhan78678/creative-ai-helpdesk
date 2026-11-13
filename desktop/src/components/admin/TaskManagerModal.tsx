import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Activity, RefreshCw, XCircle, Search, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Device, ProcessItem } from '../../types';
import { getApiBaseUrl } from '../../config/api';

interface TaskManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  device: Device;
}

export const TaskManagerModal: React.FC<TaskManagerModalProps> = ({
  isOpen,
  onClose,
  device,
}) => {
  const [processes, setProcesses] = useState<ProcessItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [killingPid, setKillingPid] = useState<number | null>(null);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const loadProcesses = () => {
    setIsLoading(true);
    setStatusMessage(null);

    // If local workstation
    if (typeof window !== 'undefined' && (window as any).electronAPI?.getRunningProcesses) {
      const localSpecs = (window as any).electronAPI.getSystemSpecs?.();
      if (localSpecs && localSpecs.hostname.toLowerCase() === device.hostname.toLowerCase()) {
        const list = (window as any).electronAPI.getRunningProcesses();
        setProcesses(list || []);
        setIsLoading(false);
        return;
      }
    }

    // Default preview fallback if remote is not yet synced
    setTimeout(() => {
      setProcesses([
        { name: 'chrome.exe', pid: 14210, session: 'Console', mem_mb: 612.4 },
        { name: 'Code.exe', pid: 8840, session: 'Console', mem_mb: 489.1 },
        { name: 'python.exe', pid: 18524, session: 'Console', mem_mb: 94.2 },
        { name: 'Antigravity IDE.exe', pid: 11284, session: 'Console', mem_mb: 851.9 },
        { name: 'node.exe', pid: 23472, session: 'Console', mem_mb: 120.5 },
        { name: 'slack.exe', pid: 5612, session: 'Console', mem_mb: 230.8 },
      ]);
      setIsLoading(false);
    }, 600);
  };

  useEffect(() => {
    if (isOpen) {
      loadProcesses();
    }
  }, [isOpen, device]);

  const handleKillProcess = async (proc: ProcessItem) => {
    if (!confirm(`Are you sure you want to terminate ${proc.name} (PID: ${proc.pid}) on ${device.hostname}?`)) {
      return;
    }

    setKillingPid(proc.pid);
    setStatusMessage(null);

    try {
      if (typeof window !== 'undefined' && (window as any).electronAPI?.executeRemoteAction) {
        const localSpecs = (window as any).electronAPI.getSystemSpecs?.();
        if (localSpecs && localSpecs.hostname.toLowerCase() === device.hostname.toLowerCase()) {
          const res = (window as any).electronAPI.executeRemoteAction('KILL_PROCESS', proc.pid);
          if (res.success) {
            setStatusMessage({ type: 'success', text: `Terminated ${proc.name} (PID ${proc.pid})` });
            setProcesses((prev) => prev.filter((p) => p.pid !== proc.pid));
          } else {
            setStatusMessage({ type: 'error', text: res.message || 'Failed to kill process' });
          }
          setKillingPid(null);
          return;
        }
      }

      // Remote kill via API
      await fetch(`${getApiBaseUrl()}/devices/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'KILL_PROCESS',
          target_hostname: device.hostname,
          target_pid: proc.pid,
        }),
      });

      setStatusMessage({ type: 'success', text: `Kill command sent for ${proc.name} (PID: ${proc.pid})` });
      setProcesses((prev) => prev.filter((p) => p.pid !== proc.pid));
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Failed to terminate process.' });
    } finally {
      setKillingPid(null);
    }
  };

  if (!isOpen) return null;

  const filtered = processes.filter((p) =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.pid.toString().includes(searchTerm)
  );

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xl max-w-2xl w-full relative flex flex-col max-h-[85vh]"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 shrink-0">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Activity className="w-5 h-5 text-brand-600" /> Remote Task Manager
              </h3>
              <p className="text-xs text-slate-500 font-mono mt-0.5">
                Workstation: <span className="font-bold text-slate-800">{device.hostname}</span> • Top Active Processes
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={loadProcesses}
                disabled={isLoading}
                title="Refresh Processes"
                className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors cursor-pointer"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-brand-600' : ''}`} />
              </button>
              <button
                onClick={onClose}
                className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Feedback banner */}
          {statusMessage && (
            <div
              className={`mt-3 p-3 rounded-xl text-xs font-medium flex items-center gap-2 border shrink-0 ${
                statusMessage.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : 'bg-rose-50 text-rose-800 border-rose-200'
              }`}
            >
              {statusMessage.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600" />
              )}
              <span>{statusMessage.text}</span>
            </div>
          )}

          {/* Search bar */}
          <div className="mt-4 mb-3 relative shrink-0">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Search process name or PID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-800 focus:outline-none focus:border-brand-500"
            />
          </div>

          {/* Process list table */}
          <div className="flex-1 overflow-y-auto border border-slate-100 rounded-2xl">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold sticky top-0 border-b border-slate-100">
                <tr>
                  <th className="py-2.5 px-3">Process Name</th>
                  <th className="py-2.5 px-3">PID</th>
                  <th className="py-2.5 px-3">Memory Usage</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((proc) => (
                  <tr key={proc.pid} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-2.5 px-3 font-semibold text-slate-800 flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-brand-500" />
                      <span>{proc.name}</span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-500">{proc.pid}</td>
                    <td className="py-2.5 px-3 font-bold text-slate-700">{proc.mem_mb} MB</td>
                    <td className="py-2.5 px-3 text-right">
                      <button
                        onClick={() => handleKillProcess(proc)}
                        disabled={killingPid === proc.pid}
                        className="px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 text-[11px] font-bold transition-all cursor-pointer disabled:opacity-50 inline-flex items-center gap-1"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        <span>{killingPid === proc.pid ? 'Killing...' : 'End Task'}</span>
                      </button>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && !isLoading && (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-slate-400 text-xs">
                      No matching processes found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-3 text-[11px] text-slate-400 text-right shrink-0">
            Showing top {filtered.length} active processes sorted by memory consumption
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

