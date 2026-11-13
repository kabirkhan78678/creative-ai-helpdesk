import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Monitor, Activity, Users, Shield, Megaphone } from 'lucide-react';
import { User, Device, Ticket, TicketStatus, RemoteSessionPrompt } from './types';
import { Header } from './components/common/Header';
import { FleetGrid } from './components/fleet/FleetGrid';
import { TicketCenter } from './components/tickets/TicketCenter';
import { EmployeeManager } from './components/admin/EmployeeManager';
import { EmployeePortal } from './components/employee/EmployeePortal';
import { LiveChatModal } from './components/chat/LiveChatModal';
import { RemoteDesktopModal } from './components/remote/RemoteDesktopModal';
import { PromptModal } from './components/common/PromptModal';
import { LoginScreen } from './components/auth/LoginScreen';
import { AnnouncementBanner } from './components/common/AnnouncementBanner';
import { BroadcastModal } from './components/admin/BroadcastModal';
import { RemoteActionsModal } from './components/admin/RemoteActionsModal';
import { TaskManagerModal } from './components/admin/TaskManagerModal';
import { useWebSocket } from './context/WebSocketContext';
import { getApiBaseUrl } from './config/api';
import { autoEnrollCurrentPC } from './services/deviceEnrollment';

interface AppContentProps {
  currentUser: User | null;
  onLoginSuccess: (user: User) => void;
  onLogout: () => void;
  onUpdateUser?: (user: User) => void;
}

export const AppContent: React.FC<AppContentProps> = ({
  currentUser,
  onLoginSuccess,
  onLogout,
  onUpdateUser,
}) => {
  if (!currentUser) {
    return <LoginScreen onLoginSuccess={onLoginSuccess} />;
  }

  return (
    <AuthenticatedApp
      currentUser={currentUser}
      onLogout={onLogout}
      onUpdateUser={onUpdateUser || onLoginSuccess}
    />
  );
};

interface AuthenticatedAppProps {
  currentUser: User;
  onLogout: () => void;
  onUpdateUser: (user: User) => void;
}

const AuthenticatedApp: React.FC<AuthenticatedAppProps> = ({
  currentUser,
  onLogout,
  onUpdateUser,
}) => {
  const [activeTab, setActiveTab] = useState<'FLEET' | 'HELPDESK' | 'EMPLOYEES'>('FLEET');
  const [devices, setDevices] = useState<Device[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Modals state
  const [remoteDevice, setRemoteDevice] = useState<Device | null>(null);
  const [chatRecipient, setChatRecipient] = useState<User | null>(null);
  const [chatTicketId, setChatTicketId] = useState<number | null>(null);
  const [isBroadcastOpen, setIsBroadcastOpen] = useState(false);
  const [actionDevice, setActionDevice] = useState<Device | null>(null);
  const [taskManagerDevice, setTaskManagerDevice] = useState<Device | null>(null);

  const { addListener, sendEvent, activeRemotePrompt, dismissRemotePrompt } = useWebSocket();

  // Screen streaming state for Employee side
  const [isSharingScreen, setIsSharingScreen] = useState(false);
  const [activeStreamingPrompt, setActiveStreamingPrompt] = useState<RemoteSessionPrompt | null>(null);
  const streamIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isCapturingRef = useRef<boolean>(false);

  // Start Streaming Screen frames (Employee side)
  const startScreenStream = useCallback(
    (prompt: RemoteSessionPrompt) => {
      setIsSharingScreen(true);
      setActiveStreamingPrompt(prompt);

      if (streamIntervalRef.current) {
        clearInterval(streamIntervalRef.current);
      }

      const captureAndSend = async () => {
        if (isCapturingRef.current) return;
        isCapturingRef.current = true;
        try {
          let frame: string | null = null;
          if (typeof window !== 'undefined' && (window as any).electronAPI?.captureScreenFrame) {
            frame = await (window as any).electronAPI.captureScreenFrame();
          } else if (typeof window !== 'undefined' && (window as any).electronAPI?.takeScreenshot) {
            frame = await (window as any).electronAPI.takeScreenshot();
          }

          if (frame) {
            const localSpecs = (window as any).electronAPI?.getSystemSpecs?.();
            sendEvent('REMOTE_SCREEN_FRAME', {
              session_id: prompt.session_id,
              session_code: prompt.session_code,
              target_admin_id: prompt.admin_id,
              hostname: localSpecs?.hostname || 'Workstation',
              frame,
              timestamp: Date.now(),
            });
          }
        } catch (err) {
          console.error('Screen stream frame capture failed:', err);
        } finally {
          isCapturingRef.current = false;
        }
      };

      // Send first frame immediately
      captureAndSend();

      // Loop every 180ms (~5.5 FPS for smooth LAN Wi-Fi transmission)
      streamIntervalRef.current = setInterval(captureAndSend, 180);
    },
    [sendEvent]
  );

  // Stop Streaming Screen frames
  const stopScreenStream = useCallback(() => {
    if (streamIntervalRef.current) {
      clearInterval(streamIntervalRef.current);
      streamIntervalRef.current = null;
    }
    setIsSharingScreen(false);
    if (activeStreamingPrompt) {
      sendEvent('REMOTE_DESK_STOP', {
        session_id: activeStreamingPrompt.session_id,
        target_admin_id: activeStreamingPrompt.admin_id,
      });
      setActiveStreamingPrompt(null);
    }
  }, [activeStreamingPrompt, sendEvent]);

  const isAdminOrTech = currentUser.role === 'ADMIN' || currentUser.role === 'TECHNICIAN';

  // Load Workstations Fleet
  const loadFleet = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`${getApiBaseUrl()}/devices`);
      if (res.ok) {
        const data = await res.json();
        setDevices(data);
      }
    } catch (err) {
      console.error('Fleet fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load Tickets
  const loadTickets = useCallback(async () => {
    try {
      const res = await fetch(`${getApiBaseUrl()}/tickets`);
      if (res.ok) {
        const data = await res.json();
        setTickets(data);
      }
    } catch (err) {
      console.error('Tickets fetch error:', err);
    }
  }, []);

  useEffect(() => {
    // Auto-detect and register this PC's hardware config into MySQL and bind to current user
    autoEnrollCurrentPC(currentUser).then(() => {
      loadFleet();
    });
    loadTickets();
  }, [currentUser, loadFleet, loadTickets]);

  // Periodic Live Telemetry Stream via pure WebSocket (Zero repeated HTTP hits)
  useEffect(() => {
    if (!currentUser) return;
    const interval = setInterval(() => {
      if (typeof window !== 'undefined' && (window as any).electronAPI?.getLiveTelemetry) {
        try {
          const telemetry = (window as any).electronAPI.getLiveTelemetry();
          if (telemetry && telemetry.hostname) {
            // Pure WebSocket event stream - no HTTP polling/hitting!
            sendEvent('TELEMETRY_STREAM', telemetry);
            setDevices((prev) =>
              prev.map((d) =>
                d.hostname === telemetry.hostname
                  ? {
                      ...d,
                      cpu_usage_pct: telemetry.cpu_usage_pct,
                      used_ram_gb: telemetry.used_ram_gb,
                      total_ram_gb: telemetry.total_ram_gb,
                      storage_usage_pct: telemetry.storage_usage_pct,
                      total_storage_gb: telemetry.total_storage_gb,
                      used_storage_gb: telemetry.used_storage_gb,
                      wifi_ssid: telemetry.wifi_ssid,
                      ping_ms: telemetry.ping_ms,
                      has_usb_connected: telemetry.has_usb_connected,
                      usb_devices: telemetry.usb_devices,
                    }
                  : d
              )
            );
          }
        } catch (_) {}
      }
    }, 4000);
    return () => clearInterval(interval);
  }, [currentUser, sendEvent]);

  // WebSocket Live Listeners
  useEffect(() => {
    const unsubTelemetry = addListener('DEVICE_TELEMETRY_UPDATE', (updatedTelemetry) => {
      setDevices((prev) =>
        prev.map((d) => (d.id === updatedTelemetry.id ? { ...d, ...updatedTelemetry } : d))
      );
    });

    const unsubEnrolled = addListener('DEVICE_ENROLLED', (newDev: Device) => {
      setDevices((prev) => {
        const exists = prev.some((d) => d.id === newDev.id);
        if (exists) {
          return prev.map((d) => (d.id === newDev.id ? { ...d, ...newDev } : d));
        }
        return [newDev, ...prev];
      });
    });

    const unsubTicketCreated = addListener('TICKET_CREATED', (newTicket: Ticket) => {
      setTickets((prev) => [newTicket, ...prev]);
    });

    const unsubTicketUpdated = addListener('TICKET_UPDATED', (updatedTicket: Ticket) => {
      setTickets((prev) =>
        prev.map((t) => (t.id === updatedTicket.id ? { ...t, ...updatedTicket } : t))
      );
    });

    // Remote Actions listener on Employee Workstations
    const unsubRemoteAction = addListener('REMOTE_ACTION_DISPATCH', async (data: any) => {
      if (typeof window !== 'undefined' && (window as any).electronAPI?.executeRemoteAction) {
        const localSpecs = (window as any).electronAPI.getSystemSpecs?.();
        if (localSpecs && data.target_hostname && localSpecs.hostname.toLowerCase() === data.target_hostname.toLowerCase()) {
          console.log('[Remote Action Dispatch Received]:', data.action);
          const result = (window as any).electronAPI.executeRemoteAction(data.action, data.target_pid);
          try {
            // Relay result back to admin via WebSocket
            sendEvent('REMOTE_ACTION_RESULT', {
              hostname: localSpecs.hostname,
              action: data.action,
              result,
            });
          } catch (_) {}
        }
      }
    });

    // Remote Desktop Stop listener
    const unsubDeskStop = addListener('REMOTE_DESK_STOP', () => {
      if (streamIntervalRef.current) {
        clearInterval(streamIntervalRef.current);
        streamIntervalRef.current = null;
      }
      setIsSharingScreen(false);
      setActiveStreamingPrompt(null);
    });

    return () => {
      unsubTelemetry();
      unsubEnrolled();
      unsubTicketCreated();
      unsubTicketUpdated();
      unsubRemoteAction();
      unsubDeskStop();
      if (streamIntervalRef.current) {
        clearInterval(streamIntervalRef.current);
      }
    };
  }, [addListener]);

  const handleUpdateTicketStatus = async (ticketId: number, status: TicketStatus) => {
    try {
      await fetch(`${getApiBaseUrl()}/tickets/${ticketId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      loadTickets();
    } catch (e) {
      console.error(e);
    }
  };

  const handleOpenChat = (device: Device) => {
    if (device.assigned_user) {
      setChatRecipient(device.assigned_user);
      setChatTicketId(null);
    }
  };

  const handleOpenChatWithUser = (userId: number, ticketId: number) => {
    const foundDevice = devices.find((d) => d.assigned_user_id === userId);
    if (foundDevice && foundDevice.assigned_user) {
      setChatRecipient(foundDevice.assigned_user);
    } else {
      setChatRecipient({
        id: userId,
        employee_code: `EMP-${userId}`,
        full_name: `Employee #${userId}`,
        email: `emp${userId}@company.com`,
        role: 'EMPLOYEE',
        department: 'Operations',
      });
    }
    setChatTicketId(ticketId);
  };

  const handleOpenChatWithAdmin = () => {
    setChatRecipient({
      id: 1,
      employee_code: 'ADM-001',
      full_name: 'IT Support Admin',
      email: 'admin@company.com',
      role: 'ADMIN',
      department: 'IT Infrastructure',
    });
    setChatTicketId(null);
  };

  const onlineDevicesCount = devices.filter((d) => d.is_online).length;
  const criticalTicketsCount = tickets.filter(
    (t) => t.priority === 'CRITICAL' && t.status !== 'RESOLVED' && t.status !== 'CLOSED'
  ).length;

  return (
    <div className="h-screen bg-slate-50 text-slate-800 flex flex-col font-sans select-none overflow-hidden">
      {/* Top Header */}
      <Header
        currentUser={currentUser}
        onLogout={onLogout}
        onlineCount={onlineDevicesCount}
        totalDevices={devices.length}
        criticalTicketsCount={criticalTicketsCount}
        onOpenBroadcast={() => setIsBroadcastOpen(true)}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto p-6 space-y-5 overflow-y-auto">
        {/* Company Broadcast Announcement Banner */}
        <AnnouncementBanner />

        {isAdminOrTech ? (
          <>
            {/* Admin Tabs */}
            <div className="flex space-x-2 border-b border-slate-200/80 pb-3">
              <button
                onClick={() => setActiveTab('FLEET')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 cursor-pointer ${
                  activeTab === 'FLEET'
                    ? 'bg-brand-600 text-white shadow-sm'
                    : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200'
                }`}
              >
                <Monitor className="w-4 h-4" />
                <span>Workstation Fleet ({devices.length})</span>
              </button>

              <button
                onClick={() => setActiveTab('HELPDESK')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 cursor-pointer ${
                  activeTab === 'HELPDESK'
                    ? 'bg-brand-600 text-white shadow-sm'
                    : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200'
                }`}
              >
                <Activity className="w-4 h-4" />
                <span>Helpdesk Tickets ({tickets.length})</span>
              </button>

              <button
                onClick={() => setActiveTab('EMPLOYEES')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 cursor-pointer ${
                  activeTab === 'EMPLOYEES'
                    ? 'bg-brand-600 text-white shadow-sm'
                    : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200'
                }`}
              >
                <Users className="w-4 h-4" />
                <span>Employee Accounts</span>
              </button>
            </div>

            {/* Admin Views */}
            {activeTab === 'FLEET' && (
              <FleetGrid
                devices={devices}
                onInitiateRemote={(d) => setRemoteDevice(d)}
                onOpenChat={handleOpenChat}
                onRefresh={loadFleet}
                onOpenRemoteActions={(d) => setActionDevice(d)}
                isLoading={isLoading}
              />
            )}

            {activeTab === 'HELPDESK' && (
              <TicketCenter
                tickets={tickets}
                devices={devices}
                currentUserId={currentUser.id}
                onUpdateStatus={handleUpdateTicketStatus}
                onOpenChatWithUser={handleOpenChatWithUser}
                onRefresh={loadTickets}
              />
            )}

            {activeTab === 'EMPLOYEES' && (
              <EmployeeManager
                devices={devices}
                onRefreshDevices={loadFleet}
              />
            )}
          </>
        ) : (
          /* Employee Portal View */
          <EmployeePortal
            currentUser={currentUser}
            devices={devices}
            tickets={tickets}
            onOpenChatWithAdmin={handleOpenChatWithAdmin}
            onRefresh={loadTickets}
            onProfileUpdated={(updated) => onUpdateUser(updated)}
          />
        )}
      </main>

      {/* Global Modals */}
      <RemoteDesktopModal
        isOpen={!!remoteDevice}
        onClose={() => setRemoteDevice(null)}
        targetDevice={remoteDevice}
        currentUser={currentUser}
      />

      <LiveChatModal
        isOpen={!!chatRecipient}
        onClose={() => {
          setChatRecipient(null);
          setChatTicketId(null);
        }}
        currentUser={currentUser}
        recipientUser={chatRecipient}
        linkedTicketId={chatTicketId}
      />

      {activeRemotePrompt && (
        <PromptModal
          prompt={activeRemotePrompt}
          onClose={dismissRemotePrompt}
          onGrantAccess={(p) => startScreenStream(p)}
        />
      )}

      {/* Floating Active Screen Share Badge for Employee */}
      {isSharingScreen && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900/95 text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center space-x-4 border border-rose-500/40 backdrop-blur-md">
          <div className="flex items-center space-x-2.5">
            <span className="w-3 h-3 rounded-full bg-rose-500 animate-ping" />
            <span className="text-xs font-semibold">
              Live Screen Sharing Active with IT Support
            </span>
          </div>
          <button
            onClick={stopScreenStream}
            className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition-colors cursor-pointer shadow-sm"
          >
            Stop Sharing
          </button>
        </div>
      )}

      {/* Broadcast Modal for Admin */}
      <BroadcastModal
        isOpen={isBroadcastOpen}
        onClose={() => setIsBroadcastOpen(false)}
        currentUser={currentUser}
      />

      {/* Remote IT Actions Modal */}
      {actionDevice && (
        <RemoteActionsModal
          isOpen={!!actionDevice}
          onClose={() => setActionDevice(null)}
          device={actionDevice}
          onOpenTaskManager={(d) => setTaskManagerDevice(d)}
        />
      )}

      {/* Remote Task Manager Modal */}
      {taskManagerDevice && (
        <TaskManagerModal
          isOpen={!!taskManagerDevice}
          onClose={() => setTaskManagerDevice(null)}
          device={taskManagerDevice}
        />
      )}
    </div>
  );
};

export const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem('creative_ai_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const handleLoginSuccess = (user: User) => {
    setCurrentUser(user);
  };

  const handleLogout = () => {
    localStorage.removeItem('creative_ai_user');
    setCurrentUser(null);
  };

  return (
    <AppContent
      key={currentUser ? currentUser.id : 'guest'}
      currentUser={currentUser}
      onLoginSuccess={handleLoginSuccess}
      onLogout={handleLogout}
      onUpdateUser={handleLoginSuccess}
    />
  );
};
