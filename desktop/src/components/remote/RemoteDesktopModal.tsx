import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Maximize2,
  Minimize2,
  Radio,
  Activity,
  X,
  Lock,
  RotateCcw,
  Trash2,
  Wifi,
  AlertCircle,
  CheckCircle2,
  Monitor,
  ShieldAlert,
} from 'lucide-react';
import { Device, User } from '../../types';
import { useWebSocket } from '../../context/WebSocketContext';
import { getApiBaseUrl } from '../../config/api';

interface RemoteDesktopModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetDevice: Device | null;
  currentUser: User;
}

export const RemoteDesktopModal: React.FC<RemoteDesktopModalProps> = ({
  isOpen,
  onClose,
  targetDevice,
  currentUser,
}) => {
  const { sendEvent, addListener } = useWebSocket();
  const [sessionStatus, setSessionStatus] = useState<'REQUESTING' | 'LIVE' | 'DENIED' | 'ENDED'>('REQUESTING');
  const [sessionCode, setSessionCode] = useState<string>('');
  const [liveFrame, setLiveFrame] = useState<string | null>(null);
  const [latency, setLatency] = useState<number>(12);
  const [fps, setFps] = useState<number>(5);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [mouseLog, setMouseLog] = useState<string>('Ready');
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  const frameCountRef = useRef(0);
  const imageContainerRef = useRef<HTMLDivElement | null>(null);

  // 1. Initiate Remote Session Request via Pure WebSocket
  useEffect(() => {
    if (!isOpen || !targetDevice) return;

    setSessionStatus('REQUESTING');
    setLiveFrame(null);
    frameCountRef.current = 0;

    // Send pure WebSocket initiate event (Zero HTTP request overhead)
    sendEvent('REMOTE_SESSION_INITIATE', {
      admin_id: currentUser.id,
      employee_id: targetDevice.assigned_user_id || 0,
      device_id: targetDevice.id,
      target_hostname: targetDevice.hostname,
    });
  }, [isOpen, targetDevice, currentUser.id, sendEvent]);

  // 2. Listen for Real-Time Screen Frames, Code & Responses from Employee PC
  useEffect(() => {
    if (!isOpen) return;

    // Listen for created session code
    const unsubCreated = addListener('REMOTE_SESSION_CREATED', (data: any) => {
      if (data?.session_code) {
        setSessionCode(data.session_code);
      }
    });

    // Listen for incoming desktop video frames
    const unsubFrames = addListener('REMOTE_SCREEN_FRAME', (data: any) => {
      if (data && data.frame) {
        setLiveFrame(data.frame);
        setSessionStatus('LIVE');
        frameCountRef.current += 1;

        if (data.timestamp) {
          const currentLatency = Math.max(4, Date.now() - data.timestamp);
          setLatency(currentLatency);
        }
      }
    });

    // Listen for employee approval/denial
    const unsubResponse = addListener('REMOTE_SESSION_RESPONSE', (data: any) => {
      if (data.approved) {
        setSessionStatus('LIVE');
      } else {
        setSessionStatus('DENIED');
      }
    });

    // Listen for session stop
    const unsubStop = addListener('REMOTE_DESK_STOP', () => {
      setSessionStatus('ENDED');
    });

    return () => {
      unsubCreated();
      unsubFrames();
      unsubResponse();
      unsubStop();
    };
  }, [isOpen, addListener]);

  // 3. Dynamic FPS Calculator
  useEffect(() => {
    if (sessionStatus !== 'LIVE') return;
    const interval = setInterval(() => {
      setFps(frameCountRef.current);
      frameCountRef.current = 0;
    }, 1000);
    return () => clearInterval(interval);
  }, [sessionStatus]);

  // 4. Handle Mouse Moves & Clicks on Remote Screen
  const handleMouseMove = (e: React.MouseEvent<HTMLImageElement>) => {
    if (!imageContainerRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const normX = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const normY = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));

    const pixelX = Math.round(normX * 1920);
    const pixelY = Math.round(normY * 1080);
    setMouseLog(`X: ${pixelX} | Y: ${pixelY}`);

    sendEvent('REMOTE_INPUT_COMMAND', {
      type: 'MOUSE_MOVE',
      normX,
      normY,
      pixelX,
      pixelY,
      target_hostname: targetDevice?.hostname,
      target_user_id: targetDevice?.assigned_user_id,
    });
  };

  const handleMouseClick = (e: React.MouseEvent<HTMLImageElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const normX = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const normY = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));

    sendEvent('REMOTE_INPUT_COMMAND', {
      type: 'MOUSE_CLICK',
      normX,
      normY,
      target_hostname: targetDevice?.hostname,
      target_user_id: targetDevice?.assigned_user_id,
    });
  };

  // 5. In-Session Remote Actions Shortcut (Pure WebSocket Dispatch)
  const handleQuickAction = (action: 'LOCK' | 'RESTART' | 'CLEAN_TEMP' | 'FLUSH_DNS') => {
    if (!targetDevice) return;
    setActionFeedback(`Sending ${action}...`);
    sendEvent('REMOTE_ACTION_REQUEST', {
      action,
      target_hostname: targetDevice.hostname,
      target_device_id: targetDevice.id,
      target_user_id: targetDevice.assigned_user_id,
    });
    setTimeout(() => setActionFeedback(`✓ Command ${action} Dispatched`), 200);
    setTimeout(() => setActionFeedback(null), 3500);
  };

  const handleDisconnect = () => {
    sendEvent('REMOTE_DESK_STOP', {
      target_hostname: targetDevice?.hostname,
      admin_id: currentUser.id,
    });
    onClose();
  };

  if (!isOpen || !targetDevice) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-md">
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className={`bg-white w-full ${
            isFullscreen ? 'h-screen max-w-none rounded-none' : 'max-w-6xl h-[90vh] rounded-3xl'
          } flex flex-col border border-slate-200 overflow-hidden shadow-2xl relative`}
        >
          {/* Top Bar Header */}
          <div className="h-14 bg-white border-b border-slate-200 px-5 flex items-center justify-between select-none shrink-0">
            <div className="flex items-center space-x-3">
              <span
                className={`w-3 h-3 rounded-full ${
                  sessionStatus === 'LIVE'
                    ? 'bg-emerald-500 animate-pulse shadow-sm shadow-emerald-400'
                    : sessionStatus === 'REQUESTING'
                    ? 'bg-amber-500 animate-ping'
                    : 'bg-rose-500'
                }`}
              />
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <span>Remote Desktop:</span>
                  <span className="font-mono text-brand-700 bg-brand-50 px-2 py-0.5 rounded-md border border-brand-100">
                    {targetDevice.hostname}
                  </span>
                  {targetDevice.assigned_user && (
                    <span className="text-xs font-semibold text-slate-500">
                      ({targetDevice.assigned_user.full_name})
                    </span>
                  )}
                </h3>
                <p className="text-[10px] text-slate-400 font-mono">
                  {targetDevice.ip_address} • Wi-Fi: {targetDevice.wifi_ssid || 'LAN'} • CODE: {sessionCode || '...'}{' '}
                  • 1280x720 HD
                </p>
              </div>
            </div>

            {/* Live Telemetry Badge in Header */}
            {sessionStatus === 'LIVE' && (
              <div className="hidden md:flex items-center space-x-3 bg-slate-50 px-3 py-1 rounded-xl border border-slate-200 text-xs font-mono">
                <span className="text-emerald-700 font-bold flex items-center gap-1">
                  <Activity className="w-3.5 h-3.5 text-emerald-600" />
                  {fps} FPS
                </span>
                <span className="text-slate-300">•</span>
                <span className="text-brand-700 font-bold">{latency}ms Latency</span>
                <span className="text-slate-300">•</span>
                <span className="text-slate-500">{mouseLog}</span>
              </div>
            )}

            {/* Quick Action Buttons in Top Bar */}
            <div className="flex items-center space-x-2">
              {sessionStatus === 'LIVE' && (
                <div className="hidden lg:flex items-center space-x-1.5 bg-slate-100/70 p-1 rounded-xl border border-slate-200">
                  <button
                    onClick={() => handleQuickAction('LOCK')}
                    title="Lock Workstation"
                    className="p-1.5 rounded-lg hover:bg-white text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
                  >
                    <Lock className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleQuickAction('CLEAN_TEMP')}
                    title="Clean Junk Files"
                    className="p-1.5 rounded-lg hover:bg-white text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleQuickAction('FLUSH_DNS')}
                    title="Flush DNS"
                    className="p-1.5 rounded-lg hover:bg-white text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
                  >
                    <Wifi className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleQuickAction('RESTART')}
                    title="Restart PC (15-sec warning)"
                    className="p-1.5 rounded-lg hover:bg-white text-rose-600 hover:text-rose-700 transition-colors cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {actionFeedback && (
                <span className="text-[11px] font-bold text-brand-700 bg-brand-50 px-2 py-1 rounded-lg border border-brand-100 font-mono animate-fade-in">
                  {actionFeedback}
                </span>
              )}

              <button
                onClick={() => setIsFullscreen(!isFullscreen)}
                className="p-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 transition-all cursor-pointer"
                title="Toggle Fullscreen"
              >
                {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>
              <button
                onClick={handleDisconnect}
                className="px-3.5 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs border border-rose-200 transition-all cursor-pointer"
              >
                Disconnect
              </button>
            </div>
          </div>

          {/* Main Remote Display Area */}
          <div
            ref={imageContainerRef}
            className="flex-1 bg-slate-950 relative flex items-center justify-center overflow-hidden select-none"
          >
            {/* Case 1: Waiting for Employee to Approve */}
            {sessionStatus === 'REQUESTING' && (
              <div className="text-center py-12 px-6 max-w-md bg-white/5 border border-white/10 rounded-3xl backdrop-blur-md space-y-4 text-white">
                <div className="w-16 h-16 rounded-3xl bg-brand-500/10 border border-brand-500/20 mx-auto flex items-center justify-center text-brand-400 shadow-inner">
                  <Radio className="w-8 h-8 animate-pulse text-brand-400" />
                </div>
                <div>
                  <h4 className="text-base font-bold tracking-tight">
                    Waiting for Employee Approval...
                  </h4>
                  <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                    A remote assistance prompt has appeared on{' '}
                    <strong className="text-white font-mono">{targetDevice.hostname}</strong>.
                    Once the employee clicks <span className="text-emerald-400 font-bold">"Grant Access"</span>, their screen will stream live here.
                  </p>
                </div>
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/10 text-xs font-mono text-slate-300">
                  <span>Session Code:</span>
                  <span className="font-bold text-brand-400">{sessionCode || 'GENERATING'}</span>
                </div>
              </div>
            )}

            {/* Case 2: Employee Declined */}
            {sessionStatus === 'DENIED' && (
              <div className="text-center py-10 px-6 max-w-sm bg-white rounded-3xl border border-rose-200 space-y-3 shadow-xl">
                <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 mx-auto">
                  <AlertCircle className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-bold text-slate-900">
                  Request Declined by Employee
                </h4>
                <p className="text-xs text-slate-500">
                  The user on {targetDevice.hostname} chose not to share their screen at this time.
                </p>
                <button
                  onClick={onClose}
                  className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-black transition-all cursor-pointer"
                >
                  Close Window
                </button>
              </div>
            )}

            {/* Case 3: Session Terminated / Ended */}
            {sessionStatus === 'ENDED' && (
              <div className="text-center py-10 px-6 max-w-sm bg-white rounded-3xl border border-slate-200 space-y-3 shadow-xl">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600 mx-auto">
                  <Monitor className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-bold text-slate-900">
                  Remote Session Ended
                </h4>
                <p className="text-xs text-slate-500">
                  The remote screen streaming session with {targetDevice.hostname} was disconnected.
                </p>
                <button
                  onClick={onClose}
                  className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-black transition-all cursor-pointer"
                >
                  Done
                </button>
              </div>
            )}

            {/* Case 4: LIVE REAL SCREEN DISPLAY */}
            {sessionStatus === 'LIVE' && (
              <div className="w-full h-full relative flex items-center justify-center overflow-hidden">
                {liveFrame ? (
                  <img
                    src={liveFrame}
                    alt={`Live Screen of ${targetDevice.hostname}`}
                    onMouseMove={handleMouseMove}
                    onClick={handleMouseClick}
                    className="w-full h-full object-contain cursor-crosshair select-none"
                    draggable={false}
                  />
                ) : (
                  <div className="text-center space-y-3 text-white">
                    <div className="w-10 h-10 border-3 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto" />
                    <p className="text-xs font-mono text-slate-300">
                      Receiving live screen buffer from {targetDevice.hostname}...
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
