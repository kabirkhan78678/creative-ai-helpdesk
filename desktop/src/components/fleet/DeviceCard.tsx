import React from 'react';
import { motion } from 'framer-motion';
import { Monitor, Cpu, HardDrive, Database, MessageSquare, Play, Wrench, Wifi, ShieldAlert, AlertTriangle } from 'lucide-react';
import { Device } from '../../types';

interface DeviceCardProps {
  device: Device;
  onInitiateRemote: (device: Device) => void;
  onOpenChat: (device: Device) => void;
  onOpenRemoteActions?: (device: Device) => void;
}

export const DeviceCard: React.FC<DeviceCardProps> = ({
  device,
  onInitiateRemote,
  onOpenChat,
  onOpenRemoteActions,
}) => {
  const isHighCpu = device.cpu_usage_pct >= 85;
  const isLowStorage = device.storage_usage_pct >= 90;
  const hasCriticalIssue = isHighCpu || isLowStorage;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.2 }}
      className={`bg-white rounded-3xl p-5 border shadow-sm hover:shadow-md transition-all duration-300 relative overflow-hidden flex flex-col justify-between ${
        hasCriticalIssue ? 'border-amber-300 ring-2 ring-amber-100' : 'border-slate-200'
      }`}
    >
      {/* Top Accent */}
      <div 
        className={`absolute top-0 left-0 right-0 h-1 transition-all ${
          hasCriticalIssue
            ? 'bg-amber-500'
            : device.is_online
            ? 'bg-emerald-500'
            : 'bg-slate-300'
        }`} 
      />

      <div>
        {/* Header */}
        <div className="flex items-start justify-between mb-3.5">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-700">
              <Monitor className="w-5 h-5 text-brand-600" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-bold text-slate-900 text-sm tracking-tight">
                  {device.hostname}
                </h3>
                <span className={`w-2 h-2 rounded-full ${
                  device.is_online ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'
                }`} />
              </div>
              <p className="text-xs font-semibold text-brand-700 mt-0.5">
                {device.assigned_user ? device.assigned_user.full_name : 'Unassigned'}
              </p>
            </div>
          </div>

          <div className="flex flex-col items-end gap-1">
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
              device.is_online
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-slate-100 text-slate-500 border-slate-200'
            }`}>
              {device.is_online ? 'ONLINE' : 'OFFLINE'}
            </span>

            {isLowStorage && (
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-rose-50 border border-rose-200 text-rose-700 flex items-center gap-0.5">
                <AlertTriangle className="w-2.5 h-2.5" /> Low Disk
              </span>
            )}
          </div>
        </div>

        {/* Specs Box */}
        <div className="bg-slate-50 rounded-2xl p-3 border border-slate-100 space-y-1.5 text-xs font-mono text-slate-600 mb-4">
          <div className="flex justify-between items-center text-[11px]">
            <span className="text-slate-400">IP ADDR:</span>
            <span className="text-slate-800 font-semibold">{device.ip_address}</span>
          </div>
          <div className="flex justify-between items-center text-[11px]">
            <span className="text-slate-400">MAC:</span>
            <span className="text-slate-700">{device.mac_address}</span>
          </div>
          <div className="flex justify-between items-center text-[11px]">
            <span className="text-slate-400">OS:</span>
            <span className="text-slate-800 font-medium truncate max-w-[160px]">{device.os_name}</span>
          </div>
          <div className="flex justify-between items-center text-[11px] pt-1 border-t border-slate-200/50">
            <span className="text-slate-400 flex items-center gap-1">
              <Wifi className="w-3 h-3 text-brand-600" /> WI-FI:
            </span>
            <span className="text-brand-700 font-bold">{device.wifi_ssid || 'CTI_JIO'} ({device.ping_ms || 15}ms)</span>
          </div>
          {device.has_usb_connected && (
            <div className="flex justify-between items-center text-[10px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 font-bold">
              <span className="flex items-center gap-1">
                <ShieldAlert className="w-3 h-3 text-amber-600" /> USB DRIVE:
              </span>
              <span>{device.usb_devices || 'Attached'}</span>
            </div>
          )}
        </div>

        {/* Live Gauges */}
        <div className="space-y-3 mb-5">
          {/* CPU */}
          <div>
            <div className="flex justify-between items-center text-[11px] font-mono text-slate-500 mb-1">
              <span className="flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5 text-brand-600" /> CPU Load
              </span>
              <span className={`font-bold ${device.cpu_usage_pct > 80 ? 'text-amber-600' : 'text-slate-800'}`}>
                {device.cpu_usage_pct.toFixed(1)}%
              </span>
            </div>
            <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <motion.div
                className={`h-full ${device.cpu_usage_pct > 80 ? 'bg-amber-500' : 'bg-brand-600'}`}
                animate={{ width: `${Math.min(device.cpu_usage_pct, 100)}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
          </div>

          {/* RAM */}
          <div>
            <div className="flex justify-between items-center text-[11px] font-mono text-slate-500 mb-1">
              <span className="flex items-center gap-1.5">
                <HardDrive className="w-3.5 h-3.5 text-indigo-600" /> RAM ({device.used_ram_gb.toFixed(1)}/{device.total_ram_gb.toFixed(1)} GB)
              </span>
              <span className="font-bold text-slate-800">
                {((device.used_ram_gb / (device.total_ram_gb || 1)) * 100).toFixed(0)}%
              </span>
            </div>
            <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-indigo-500"
                animate={{ width: `${Math.min((device.used_ram_gb / (device.total_ram_gb || 1)) * 100, 100)}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
          </div>

          {/* Storage Disk */}
          <div>
            <div className="flex justify-between items-center text-[11px] font-mono text-slate-500 mb-1">
              <span className="flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5 text-emerald-600" /> Disk ({device.used_storage_gb ? device.used_storage_gb.toFixed(1) : ((device.total_storage_gb || 256) * (device.storage_usage_pct / 100)).toFixed(1)}/{device.total_storage_gb ? device.total_storage_gb.toFixed(1) : '237.2'} GB)
              </span>
              <span className="font-bold text-slate-800">
                {device.storage_usage_pct.toFixed(0)}%
              </span>
            </div>
            <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <motion.div
                className={`h-full ${device.storage_usage_pct > 90 ? 'bg-rose-500' : 'bg-emerald-500'}`}
                animate={{ width: `${Math.min(device.storage_usage_pct, 100)}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Buttons */}
      <div className="flex items-center space-x-2 pt-3 border-t border-slate-100">
        <button
          onClick={() => onInitiateRemote(device)}
          disabled={!device.is_online}
          className="flex-1 py-2 px-3 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold font-mono flex items-center justify-center space-x-1.5 shadow-sm transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <Play className="w-3.5 h-3.5 fill-current" />
          <span>REMOTE DESK</span>
        </button>

        {onOpenRemoteActions && (
          <button
            onClick={() => onOpenRemoteActions(device)}
            title="Remote IT Toolkit (Lock, Restart, Clean)"
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 transition-all cursor-pointer"
          >
            <Wrench className="w-4 h-4 text-slate-600" />
          </button>
        )}

        <button
          onClick={() => onOpenChat(device)}
          title="Direct IT Chat"
          className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 transition-all cursor-pointer"
        >
          <MessageSquare className="w-4 h-4" />
        </button>
      </div>
    </motion.div>
  );
};
