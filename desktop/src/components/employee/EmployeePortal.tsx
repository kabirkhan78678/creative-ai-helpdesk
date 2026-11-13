import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Monitor, PlusCircle, MessageSquare, Clock, Cpu, HardDrive, Database, Edit3, CheckCircle2, Sparkles, Wifi, ShieldAlert, Image as ImageIcon, X, Gauge } from 'lucide-react';
import { User, Device, Ticket, TicketCategory, SpeedTestResult } from '../../types';
import { RaiseTicketModal } from '../tickets/RaiseTicketModal';
import { ProfileSetupModal } from './ProfileSetupModal';
import { SelfHealingModal } from './SelfHealingModal';
import { SpeedTestModal } from './SpeedTestModal';
import { WorkstationDetailModal } from './WorkstationDetailModal';

interface EmployeePortalProps {
  currentUser: User;
  devices: Device[];
  tickets: Ticket[];
  onOpenChatWithAdmin: () => void;
  onRefresh: () => void;
  onProfileUpdated?: (user: User) => void;
}

export const EmployeePortal: React.FC<EmployeePortalProps> = ({
  currentUser,
  devices,
  tickets,
  onOpenChatWithAdmin,
  onRefresh,
  onProfileUpdated,
}) => {
  const [isRaiseModalOpen, setIsRaiseModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isSelfHealingOpen, setIsSelfHealingOpen] = useState(false);
  const [isSpeedTestOpen, setIsSpeedTestOpen] = useState(false);
  const [isWorkstationModalOpen, setIsWorkstationModalOpen] = useState(false);
  const [prefilledTicket, setPrefilledTicket] = useState<{
    title: string;
    description: string;
    category: TicketCategory;
  } | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // Find assigned PC for this employee
  const myDevice = devices.find((d) => d.assigned_user_id === currentUser.id);

  // Filter tickets raised by this employee
  const myTickets = tickets.filter((t) => t.creator_id === currentUser.id);

  const handleReportSpeedIssue = (speedResult: SpeedTestResult) => {
    setPrefilledTicket({
      title: `Slow Internet Speed on ${speedResult.wifiSsid || 'Office Wi-Fi'} (${speedResult.downloadMbps} Mbps)`,
      description: `Automated Speed Diagnostics Report:\n• Download Speed: ${speedResult.downloadMbps} Mbps\n• Upload Speed: ${speedResult.uploadMbps} Mbps\n• Latency: ${speedResult.pingMs} ms (Jitter: ${speedResult.jitterMs} ms)\n• Network: ${speedResult.wifiSsid || 'Office Wi-Fi'}\n• Quality: ${speedResult.qualityLabel}\n\nPlease check office router / Wi-Fi bandwidth congestion.`,
      category: 'NETWORK',
    });
    setIsRaiseModalOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-brand-700 bg-brand-50 border border-brand-100 px-3 py-1 rounded-full uppercase tracking-wider">
              Employee Self-Service Desk
            </span>
            {myDevice && (
              <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full font-mono">
                Auto-Linked PC: {myDevice.hostname}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 mt-2">
            <h2 className="text-xl font-black text-slate-900">
              Welcome, {currentUser.full_name}
            </h2>
            <button
              onClick={() => setIsProfileModalOpen(true)}
              title="Edit Profile / Designation"
              className="p-1.5 rounded-lg text-slate-400 hover:text-brand-600 hover:bg-brand-50 transition-colors cursor-pointer"
            >
              <Edit3 className="w-4 h-4" />
            </button>
          </div>

          <p className="text-xs text-slate-500 mt-0.5 font-medium">
            Username: <span className="font-mono font-bold text-slate-700">{currentUser.employee_code}</span> • Department: <span className="font-semibold text-slate-700">{currentUser.department}</span> • Role/Designation: <span className="font-semibold text-brand-700">{currentUser.designation || 'Staff'}</span>
          </p>
        </div>

        <div className="flex items-center space-x-2.5 w-full md:w-auto justify-end flex-wrap gap-y-2">
          {/* One-Click Speed Test Button */}
          <button
            onClick={() => setIsSpeedTestOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-800 font-bold text-xs flex items-center space-x-1.5 border border-purple-200 transition-all cursor-pointer shadow-xs"
          >
            <Gauge className="w-3.5 h-3.5 text-purple-600" />
            <span>Speed Test</span>
          </button>

          {/* One-Click Fix My PC Self-Healing Button */}
          <button
            onClick={() => setIsSelfHealingOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs flex items-center space-x-1.5 border border-emerald-200 transition-all cursor-pointer shadow-xs"
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
            <span>Fix My PC</span>
          </button>

          <button
            onClick={() => setIsProfileModalOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center space-x-1.5 border border-slate-200 transition-all cursor-pointer"
          >
            <Edit3 className="w-3.5 h-3.5 text-slate-500" />
            <span>Edit Profile</span>
          </button>

          <button
            onClick={onOpenChatWithAdmin}
            className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center space-x-2 border border-slate-200 transition-all cursor-pointer"
          >
            <MessageSquare className="w-4 h-4 text-slate-500" />
            <span>IT Chat</span>
          </button>

          <button
            onClick={() => setIsRaiseModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs flex items-center space-x-2 shadow-sm transition-all cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Raise Ticket</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: My Workstation Auto-Detected Specs */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
            <div
              onClick={() => setIsWorkstationModalOpen(true)}
              className="flex items-center justify-between cursor-pointer group hover:bg-slate-50/80 -m-2 p-2 rounded-2xl transition-all"
              title="Click to open Full Workstation Page"
            >
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-brand-50 border border-brand-100 flex items-center justify-center text-brand-600 group-hover:bg-brand-600 group-hover:text-white transition-all shadow-xs">
                  <Monitor className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm group-hover:text-brand-600 transition-colors flex items-center gap-1.5">
                    <span>My Workstation</span>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-brand-50 text-brand-700 border border-brand-100">
                      Full View ↗
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500">
                    Live Hardware Profile & Specs
                  </p>
                </div>
              </div>

              {myDevice && (
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                  myDevice.is_online
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-slate-100 text-slate-500 border-slate-200'
                }`}>
                  {myDevice.is_online ? 'ACTIVE' : 'OFFLINE'}
                </span>
              )}
            </div>

            {myDevice ? (
              <div className="space-y-4">
                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 space-y-2 text-xs font-mono">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Hostname:</span>
                    <span className="font-bold text-slate-800">{myDevice.hostname}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">IP Address:</span>
                    <span className="font-medium text-slate-700">{myDevice.ip_address}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">MAC Address:</span>
                    <span className="text-slate-700">{myDevice.mac_address}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">OS Platform:</span>
                    <span className="font-medium text-slate-700 truncate max-w-[150px]">{myDevice.os_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Processor:</span>
                    <span className="text-slate-800 font-medium truncate max-w-[150px]">{myDevice.cpu_model}</span>
                  </div>
                  <div className="flex justify-between items-center pt-1 border-t border-slate-200/60">
                    <span className="text-slate-400">Wi-Fi Network:</span>
                    <span className="font-bold text-brand-700 flex items-center gap-1">
                      <Wifi className="w-3.5 h-3.5" />
                      {myDevice.wifi_ssid || 'CTI_JIO'} ({myDevice.ping_ms || 15}ms)
                    </span>
                  </div>

                  <button
                    onClick={() => setIsSpeedTestOpen(true)}
                    className="w-full mt-1.5 py-1.5 px-3 rounded-xl bg-purple-50 hover:bg-purple-100 border border-purple-200 text-purple-800 font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-xs"
                  >
                    <Gauge className="w-3.5 h-3.5 text-purple-600" />
                    <span>Run Speed Test</span>
                  </button>
                  {myDevice.has_usb_connected && (
                    <div className="flex justify-between items-center text-amber-700 bg-amber-50 p-1.5 rounded-lg border border-amber-200">
                      <span className="flex items-center gap-1 font-bold">
                        <ShieldAlert className="w-3.5 h-3.5 text-amber-600" /> USB Drive:
                      </span>
                      <span className="font-mono text-[11px] font-bold">{myDevice.usb_devices || 'Connected'}</span>
                    </div>
                  )}
                </div>

                {/* Gauges */}
                <div className="space-y-3.5 pt-2">
                  <div>
                    <div className="flex justify-between text-xs font-mono text-slate-500 mb-1">
                      <span className="flex items-center gap-1.5"><Cpu className="w-3.5 h-3.5 text-brand-600" /> CPU Load</span>
                      <span className="font-bold text-slate-800">{myDevice.cpu_usage_pct.toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-brand-600 rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(myDevice.cpu_usage_pct, 100)}%` }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs font-mono text-slate-500 mb-1">
                      <span className="flex items-center gap-1.5"><HardDrive className="w-3.5 h-3.5 text-indigo-600" /> Memory (RAM)</span>
                      <span className="font-bold text-slate-800">{myDevice.used_ram_gb.toFixed(1)} / {myDevice.total_ram_gb.toFixed(1)} GB <span className="text-slate-400 font-normal">({((myDevice.used_ram_gb / (myDevice.total_ram_gb || 1)) * 100).toFixed(0)}%)</span></span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-indigo-500 rounded-full transition-all duration-500"
                        style={{ width: `${Math.min((myDevice.used_ram_gb / (myDevice.total_ram_gb || 1)) * 100, 100)}%` }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs font-mono text-slate-500 mb-1">
                      <span className="flex items-center gap-1.5"><Database className="w-3.5 h-3.5 text-emerald-600" /> Disk Storage (C:)</span>
                      <span className="font-bold text-slate-800">
                        {myDevice.used_storage_gb ? myDevice.used_storage_gb.toFixed(1) : ((myDevice.total_storage_gb || 256) * (myDevice.storage_usage_pct / 100)).toFixed(1)} / {myDevice.total_storage_gb ? myDevice.total_storage_gb.toFixed(1) : '237.2'} GB <span className="text-slate-400 font-normal">({myDevice.storage_usage_pct.toFixed(0)}%)</span>
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(myDevice.storage_usage_pct, 100)}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Open Full Workstation Page Button */}
                <button
                  onClick={() => setIsWorkstationModalOpen(true)}
                  className="w-full mt-3 py-2.5 px-3 rounded-2xl bg-slate-900 hover:bg-black text-white font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm"
                >
                  <Monitor className="w-4 h-4" />
                  <span>Open Full Workstation Page</span>
                </button>
              </div>
            ) : (
              <div className="text-center py-6 bg-slate-50 rounded-2xl border border-slate-100 text-xs text-slate-500">
                Detecting local hardware specs...
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Support Tickets History */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">
                  My Support Tickets ({myTickets.length})
                </h3>
                <p className="text-xs text-slate-500">
                  Track status of submitted technical issues
                </p>
              </div>

              <button
                onClick={() => setIsRaiseModalOpen(true)}
                className="text-xs font-bold text-brand-600 hover:text-brand-700 cursor-pointer"
              >
                + New Ticket
              </button>
            </div>

            {myTickets.length === 0 ? (
              <div className="text-center py-12 bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
                <p className="text-xs font-bold text-slate-700">No active support tickets</p>
                <p className="text-[11px] text-slate-400">Workstation running normally. Click "Raise Ticket" if you need assistance.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {myTickets.map((t) => (
                  <div
                    key={t.id}
                    className="p-4 bg-slate-50/70 hover:bg-slate-50 border border-slate-200/80 rounded-2xl transition-all space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-mono font-bold text-brand-700">
                          {t.ticket_number}
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded border bg-white border-slate-200 text-slate-600">
                          {t.category}
                        </span>
                        {t.attachment_image && (
                          <button
                            onClick={() => setPreviewImage(t.attachment_image || null)}
                            className="text-[10px] font-bold px-2 py-0.5 rounded border bg-brand-50 border-brand-200 text-brand-700 flex items-center gap-1 cursor-pointer"
                          >
                            <ImageIcon className="w-3 h-3" />
                            <span>Screenshot</span>
                          </button>
                        )}
                      </div>

                      <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                        t.status === 'RESOLVED'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : t.status === 'IN_PROGRESS'
                          ? 'bg-blue-50 text-blue-700 border-blue-200'
                          : 'bg-amber-50 text-amber-700 border-amber-200'
                      }`}>
                        {t.status}
                      </span>
                    </div>

                    <h4 className="text-sm font-bold text-slate-900">{t.title}</h4>
                    <p className="text-xs text-slate-600 leading-relaxed">{t.description}</p>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 text-[11px] text-slate-400 font-mono">
                      <span>Submitted: {new Date(t.created_at).toLocaleDateString()}</span>
                      {t.assigned_tech ? (
                        <span className="text-brand-600 font-semibold">Assigned: {t.assigned_tech.full_name}</span>
                      ) : (
                        <span className="text-slate-400">Awaiting Tech Assignment</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <RaiseTicketModal
        isOpen={isRaiseModalOpen}
        onClose={() => {
          setIsRaiseModalOpen(false);
          setPrefilledTicket(null);
        }}
        devices={devices}
        currentUserId={currentUser.id}
        onTicketCreated={onRefresh}
        initialTitle={prefilledTicket?.title}
        initialDescription={prefilledTicket?.description}
        initialCategory={prefilledTicket?.category}
      />

      <SpeedTestModal
        isOpen={isSpeedTestOpen}
        onClose={() => setIsSpeedTestOpen(false)}
        activeSsid={myDevice?.wifi_ssid || 'CTI_JIO'}
        activeIp={myDevice?.ip_address || '127.0.0.1'}
        onReportIssue={handleReportSpeedIssue}
      />

      <ProfileSetupModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        currentUser={currentUser}
        onProfileUpdated={(updated) => {
          if (onProfileUpdated) onProfileUpdated(updated);
          onRefresh();
        }}
      />

      <SelfHealingModal
        isOpen={isSelfHealingOpen}
        onClose={() => setIsSelfHealingOpen(false)}
        onFinished={onRefresh}
      />

      <WorkstationDetailModal
        isOpen={isWorkstationModalOpen}
        onClose={() => setIsWorkstationModalOpen(false)}
        device={myDevice || null}
        currentUser={currentUser}
        onOpenSelfHealing={() => setIsSelfHealingOpen(true)}
        onOpenSpeedTest={() => setIsSpeedTestOpen(true)}
        onOpenRaiseTicket={() => setIsRaiseModalOpen(true)}
        onOpenChat={onOpenChatWithAdmin}
      />

      {/* Screenshot Viewer Modal */}
      {previewImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-4 max-w-3xl w-full border border-slate-200 shadow-2xl relative">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100 mb-3">
              <h4 className="text-xs font-bold text-slate-800">Attached Error Screenshot</h4>
              <button
                onClick={() => setPreviewImage(null)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <img src={previewImage} alt="Error Full View" className="w-full max-h-[75vh] object-contain rounded-xl" />
          </div>
        </div>
      )}
    </div>
  );
};
