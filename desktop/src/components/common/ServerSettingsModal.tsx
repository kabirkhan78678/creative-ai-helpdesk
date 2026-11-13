import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Settings, Server, Check, X, Wifi, AlertCircle, RefreshCw, Sparkles, Radio } from 'lucide-react';
import { getServerHost, setServerHost } from '../../config/api';

interface ServerSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onHostSaved?: () => void;
}

export const ServerSettingsModal: React.FC<ServerSettingsModalProps> = ({
  isOpen,
  onClose,
  onHostSaved,
}) => {
  const [hostInput, setHostInput] = useState(getServerHost());
  const [testStatus, setTestStatus] = useState<{ loading: boolean; success?: boolean; msg?: string } | null>(null);
  const [isScanning, setIsScanning] = useState(false);

  if (!isOpen) return null;

  const handleAutoDetect = async () => {
    setIsScanning(true);
    setTestStatus({ loading: true, msg: 'Scanning local Wi-Fi for Central Server beacon...' });

    try {
      if (typeof window !== 'undefined' && (window as any).electronAPI?.discoverServerIp) {
        const found = await (window as any).electronAPI.discoverServerIp();
        if (found && found.ip) {
          setHostInput(found.ip);
          setTestStatus({
            loading: false,
            success: true,
            msg: `✓ Auto-Discovered Central Server at ${found.ip}:8000 (${found.source})!`,
          });
          setIsScanning(false);
          return;
        }
      }

      // Web probe fallback
      const candidates = ['192.168.29.69', 'localhost'];
      for (const cand of candidates) {
        try {
          const res = await fetch(`http://${cand}:8000/api/v1/auth/health`);
          if (res.ok) {
            setHostInput(cand);
            setTestStatus({
              loading: false,
              success: true,
              msg: `✓ Auto-Discovered Central Server at ${cand}:8000!`,
            });
            setIsScanning(false);
            return;
          }
        } catch (_) {}
      }

      setTestStatus({
        loading: false,
        success: false,
        msg: 'Could not auto-detect server on this Wi-Fi. Please ensure Central Server is active.',
      });
    } catch (err: any) {
      setTestStatus({
        loading: false,
        success: false,
        msg: 'Auto-discovery timed out. Please check network connection.',
      });
    } finally {
      setIsScanning(false);
    }
  };

  const handleTestConnection = async () => {
    setTestStatus({ loading: true });
    let target = hostInput.trim() || 'localhost';
    let testUrl = target;
    if (!testUrl.startsWith('http://') && !testUrl.startsWith('https://')) {
      testUrl = `http://${testUrl}:8000/`;
    } else {
      testUrl = `${testUrl.replace(/\/+$/, '')}/`;
    }

    try {
      const res = await fetch(testUrl, { method: 'GET' });
      if (res.ok) {
        setTestStatus({ loading: false, success: true, msg: 'Cloud Relay is ONLINE! Connected successfully.' });
      } else {
        setTestStatus({ loading: false, success: false, msg: `Server responded with HTTP status ${res.status}.` });
      }
    } catch (err: any) {
      setTestStatus({ loading: false, success: false, msg: `Could not reach ${testUrl}. Check URL or network.` });
    }
  };

  const handleSave = () => {
    setServerHost(hostInput);
    if (onHostSaved) onHostSaved();
    onClose();
    window.location.reload();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="white-modal max-w-md w-full rounded-3xl p-6 relative overflow-hidden"
        >
          {/* Header */}
          <div className="flex justify-between items-center pb-4 border-b border-slate-100 mb-5">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-2xl bg-brand-50 border border-brand-100 flex items-center justify-center text-brand-600">
                <Server className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Server Network Settings
                </h3>
                <p className="text-xs text-slate-500">
                  Zero-Config Auto-Discovery & Cloud Relay
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-700"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-4">
            {/* 1-Click Auto-Discovery Card */}
            <div className="bg-linear-to-r from-brand-50 via-purple-50 to-emerald-50 rounded-2xl p-4 border border-brand-100 flex items-center justify-between gap-3">
              <div className="space-y-0.5">
                <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-brand-600" />
                  Auto-Detect Server on Wi-Fi
                </h4>
                <p className="text-[11px] text-slate-600">
                  Automatically finds central server without typing any IP
                </p>
              </div>
              <button
                type="button"
                onClick={handleAutoDetect}
                disabled={isScanning}
                className="px-3.5 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer disabled:opacity-50 shrink-0"
              >
                <Radio className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin' : ''}`} />
                <span>{isScanning ? 'Scanning...' : 'Auto-Detect'}</span>
              </button>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Central Server IP / Hostname
              </label>
              <div className="relative">
                <Server className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="e.g. 192.168.29.69 or localhost"
                  value={hostInput}
                  onChange={(e) => {
                    setHostInput(e.target.value);
                    setTestStatus(null);
                  }}
                  className="w-full pl-10 pr-24 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-mono font-medium focus:outline-none focus:bg-white focus:border-brand-600"
                />
                <button
                  type="button"
                  onClick={handleTestConnection}
                  disabled={testStatus?.loading || isScanning}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 px-2.5 py-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-700 text-[11px] font-bold transition-all disabled:opacity-50 cursor-pointer"
                >
                  {testStatus?.loading ? 'Testing...' : 'Test Ping'}
                </button>
              </div>
            </div>

            {testStatus && (
              <div className={`p-3 rounded-xl text-xs flex items-start gap-2 ${
                testStatus.success
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : 'bg-rose-50 text-rose-800 border border-rose-200'
              }`}>
                {testStatus.success ? <Check className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" /> : <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />}
                <span>{testStatus.msg}</span>
              </div>
            )}

            <div className="pt-3 flex justify-end space-x-2 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-black text-white font-bold text-xs shadow-sm transition-all cursor-pointer"
              >
                Save & Connect
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

