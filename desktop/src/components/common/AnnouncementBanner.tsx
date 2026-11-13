import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Megaphone, X, AlertTriangle, ShieldAlert, Info } from 'lucide-react';
import { Announcement } from '../../types';
import { getApiBaseUrl } from '../../config/api';
import { useWebSocket } from '../../context/WebSocketContext';

interface AnnouncementBannerProps {
  onRefresh?: () => void;
}

export const AnnouncementBanner: React.FC<AnnouncementBannerProps> = () => {
  const { addListener } = useWebSocket();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [dismissedIds, setDismissedIds] = useState<number[]>([]);

  useEffect(() => {
    // Initial fetch once on load
    const fetchAnnouncements = async () => {
      try {
        const res = await fetch(`${getApiBaseUrl()}/announcements`);
        if (res.ok) {
          const data = await res.json();
          setAnnouncements(data);
        }
      } catch (_) {}
    };

    fetchAnnouncements();

    // Listen for real-time broadcast announcements over WebSocket (Zero polling!)
    const unsub = addListener('BROADCAST_ANNOUNCEMENT', (newAnn: Announcement) => {
      setAnnouncements((prev) => {
        if (prev.some((a) => a.id === newAnn.id)) return prev;
        return [newAnn, ...prev];
      });
    });

    return () => unsub();
  }, [addListener]);

  const activeItems = announcements.filter((a) => !dismissedIds.includes(a.id));
  if (activeItems.length === 0) return null;

  const current = activeItems[0];

  const getStyle = (priority: string) => {
    switch (priority) {
      case 'CRITICAL':
        return {
          bg: 'bg-rose-50 border-rose-200 text-rose-900',
          badge: 'bg-rose-600 text-white',
          icon: <ShieldAlert className="w-4 h-4 text-rose-600" />,
        };
      case 'WARNING':
        return {
          bg: 'bg-amber-50 border-amber-200 text-amber-900',
          badge: 'bg-amber-600 text-white',
          icon: <AlertTriangle className="w-4 h-4 text-amber-600" />,
        };
      default:
        return {
          bg: 'bg-blue-50 border-blue-200 text-blue-900',
          badge: 'bg-brand-600 text-white',
          icon: <Megaphone className="w-4 h-4 text-brand-600" />,
        };
    }
  };

  const style = getStyle(current.priority);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className={`w-full p-3 px-4 rounded-2xl border ${style.bg} flex items-center justify-between shadow-xs mb-4`}
      >
        <div className="flex items-center space-x-3 overflow-hidden">
          <div className="shrink-0">{style.icon}</div>
          <div className="flex items-center space-x-2 text-xs truncate">
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${style.badge} uppercase tracking-wider`}>
              {current.priority}
            </span>
            <span className="font-bold">{current.title}:</span>
            <span className="font-medium opacity-90 truncate">{current.message}</span>
          </div>
        </div>

        <button
          onClick={() => setDismissedIds((prev) => [...prev, current.id])}
          className="p-1 rounded-lg hover:bg-black/5 opacity-60 hover:opacity-100 transition-opacity shrink-0 ml-2"
          title="Dismiss Notice"
        >
          <X className="w-4 h-4" />
        </button>
      </motion.div>
    </AnimatePresence>
  );
};

