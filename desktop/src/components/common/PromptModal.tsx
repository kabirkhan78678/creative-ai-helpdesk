import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldAlert, Check, X } from 'lucide-react';
import { RemoteSessionPrompt } from '../../types';
import { useWebSocket } from '../../context/WebSocketContext';
import { getApiBaseUrl } from '../../config/api';

interface PromptModalProps {
  prompt: RemoteSessionPrompt;
  onClose: () => void;
  onGrantAccess?: (prompt: RemoteSessionPrompt) => void;
}

export const PromptModal: React.FC<PromptModalProps> = ({ prompt, onClose, onGrantAccess }) => {
  const { sendEvent } = useWebSocket();

  const handleDecision = (approved: boolean) => {
    try {
      sendEvent('REMOTE_SESSION_RESPONSE', {
        session_id: prompt.session_id,
        target_admin_id: prompt.admin_id,
        approved
      });
      if (approved && onGrantAccess) {
        onGrantAccess(prompt);
      }
    } catch (e) {
      console.error(e);
    }
    onClose();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="white-modal max-w-md w-full rounded-3xl p-6 border border-slate-200 shadow-modal relative overflow-hidden"
        >
          <div className="flex items-center space-x-3.5 mb-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
              <ShieldAlert className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Incoming Remote Request
              </h3>
              <p className="text-xs font-mono font-bold text-brand-700">
                SESSION CODE: {prompt.session_code}
              </p>
            </div>
          </div>

          <p className="text-xs text-slate-600 leading-relaxed mb-6 bg-slate-50 p-3.5 rounded-2xl border border-slate-100 font-medium">
            IT Administrator <strong className="text-brand-700 font-bold">{prompt.admin_name || 'IT Support Engineer'}</strong> is requesting remote screen view to assist and troubleshoot your workstation.
          </p>

          <div className="flex space-x-3">
            <button
              onClick={() => handleDecision(false)}
              className="flex-1 py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-rose-50 border border-slate-200 hover:border-rose-200 text-slate-700 hover:text-rose-600 font-bold text-xs flex items-center justify-center space-x-2 transition-all cursor-pointer"
            >
              <X className="w-4 h-4" />
              <span>Decline</span>
            </button>
            <button
              onClick={() => handleDecision(true)}
              className="flex-1 py-2.5 px-4 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs flex items-center justify-center space-x-2 shadow-sm transition-all cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>Grant Access</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
