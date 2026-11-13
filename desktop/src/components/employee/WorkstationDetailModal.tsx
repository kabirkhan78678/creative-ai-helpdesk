import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Monitor,
  X,
  Cpu,
  HardDrive,
  Database,
  Wifi,
  ShieldCheck,
  ShieldAlert,
  Activity,
  Layers,
  Sparkles,
  Gauge,
  PlusCircle,
  MessageSquare,
  Clock,
  RefreshCw,
  Terminal,
  Laptop,
  CheckCircle2,
  AlertTriangle,
  Zap
} from 'lucide-react';
import { Device, User, ProcessItem } from '../../types';

interface WorkstationDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  device: Device | null;
  currentUser: User;
  onOpenSelfHealing: () => void;
  onOpenSpeedTest: () => void;
  onOpenRaiseTicket: () => void;
  onOpenChat: () => void;
}

export const WorkstationDetailModal: React.FC<WorkstationDetailModalProps> = ({
  isOpen,
  onClose,
  device,
  currentUser,
  onOpenSelfHealing,
  onOpenSpeedTest,
  onOpenRaiseTicket,
  onOpenChat,
}) => {
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'PROCESSES' | 'NETWORK' | 'HARDWARE'>('OVERVIEW');
  const [processes, setProcesses] = useState<ProcessItem[]>([]);
  const [isLoadingProcesses, setIsLoadingProcesses] = useState(false);

  // Load real running processes if in Electron
  useEffect(() => {
    if (!isOpen) return;
    if (typeof window !== 'undefined' && (window as any).electronAPI?.getRunningProcesses) {
      setIsLoadingProcesses(true);
      try {
        const procs = (window as any).electronAPI.getRunningProcesses();
        if (Array.isArray(procs)) {
          setProcesses(procs.slice(0, 15));
        }
      } catch (e) {
        console.error('Error fetching processes:', e);
      } finally {
        setIsLoadingProcesses(false);
      }
    }
  }, [isOpen]);

  if (!isOpen || !device) return null;

  const totalRam = device.total_ram_gb || 16;
  const usedRam = device.used_ram_gb || 8;
  const ramPct = Math.round((usedRam / totalRam) * 100);
  const freeRam = Math.max(0, totalRam - usedRam).toFixed(1);

  const totalDisk = device.total_storage_gb || 256;
  const usedDisk = device.used_storage_gb || Math.round(totalDisk * (device.storage_usage_pct / 100));
  const diskPct = Math.round(device.storage_usage_pct || 40);
  const freeDisk = Math.max(0, totalDisk - usedDisk).toFixed(1);

  const cpuPct = Math.round(device.cpu_usage_pct || 15);

  const isMac = (device.os_name || '').toLowerCase().includes('mac');
  const isWindows = (device.os_name || '').toLowerCase().includes('win');

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-md">
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 15 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 15 }}
          className="bg-white w-full max-w-5xl h-[92vh] rounded-3xl flex flex-col border border-slate-200 shadow-2xl overflow-hidden relative"
        >
          {/* Top Banner Header */}
          <div className="p-6 border-b border-slate-200 bg-linear-to-r from-slate-50 via-white to-slate-50 flex items-center justify-between shrink-0 select-none">
            <div className="flex items-center space-x-4">
              <div className="w-14 h-14 rounded-2xl bg-brand-600 text-white flex items-center justify-center shadow-md shadow-brand-500/20">
                <Monitor className="w-7 h-7" />
              </div>
              <div>
                <div className="flex items-center gap-2.5">
                  <h2 className="text-xl font-black text-slate-900 tracking-tight">
                    {device.hostname}
                  </h2>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold font-mono bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    LIVE WORKSTATION
                  </span>
                  <span className="text-xs font-bold px-2.5 py-0.5 rounded-lg bg-slate-100 text-slate-700 border border-slate-200 font-mono">
                    {device.ip_address}
                  </span>
                </div>
                <p className="text-xs text-slate-500 font-medium mt-1">
                  Assigned User: <strong className="text-slate-800">{currentUser.full_name}</strong> ({currentUser.employee_code}) • {currentUser.department} • {currentUser.designation || 'Staff'}
                </p>
              </div>
            </div>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="w-10 h-10 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Quick Action Navigation Toolbar */}
          <div className="px-6 py-3 bg-white border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0 select-none">
            {/* View Tabs */}
            <div className="flex space-x-1.5 bg-slate-100 p-1 rounded-2xl border border-slate-200">
              <button
                onClick={() => setActiveTab('OVERVIEW')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'OVERVIEW'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Hardware Overview
              </button>
              <button
                onClick={() => setActiveTab('PROCESSES')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'PROCESSES'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Layers className="w-3.5 h-3.5 text-indigo-600" />
                <span>Running Tasks ({processes.length || 'Live'})</span>
              </button>
              <button
                onClick={() => setActiveTab('NETWORK')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'NETWORK'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Wifi className="w-3.5 h-3.5 text-purple-600" />
                <span>Network & Wi-Fi</span>
              </button>
              <button
                onClick={() => setActiveTab('HARDWARE')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'HARDWARE'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Cpu className="w-3.5 h-3.5 text-brand-600" />
                <span>Specs Sheet</span>
              </button>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center space-x-2">
              <button
                onClick={() => {
                  onClose();
                  onOpenSelfHealing();
                }}
                className="px-3.5 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs flex items-center space-x-1.5 border border-emerald-200 transition-all cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                <span>Fix My PC</span>
              </button>
              <button
                onClick={() => {
                  onClose();
                  onOpenSpeedTest();
                }}
                className="px-3.5 py-2 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-800 font-bold text-xs flex items-center space-x-1.5 border border-purple-200 transition-all cursor-pointer"
              >
                <Gauge className="w-3.5 h-3.5 text-purple-600" />
                <span>Speed Test</span>
              </button>
              <button
                onClick={() => {
                  onClose();
                  onOpenRaiseTicket();
                }}
                className="px-3.5 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs flex items-center space-x-1.5 shadow-sm transition-all cursor-pointer"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>Raise Ticket</span>
              </button>
              <button
                onClick={() => {
                  onClose();
                  onOpenChat();
                }}
                className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center space-x-1.5 border border-slate-200 transition-all cursor-pointer"
              >
                <MessageSquare className="w-3.5 h-3.5 text-slate-500" />
                <span>IT Chat</span>
              </button>
            </div>
          </div>

          {/* Modal Main Content Body */}
          <div className="flex-1 p-6 overflow-y-auto space-y-6 bg-slate-50/50">
            {/* TAB 1: OVERVIEW */}
            {activeTab === 'OVERVIEW' && (
              <>
                {/* 4 Live Hardware KPI Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* CPU Card */}
                  <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="w-10 h-10 rounded-2xl bg-brand-50 border border-brand-100 flex items-center justify-center text-brand-600">
                        <Cpu className="w-5 h-5" />
                      </div>
                      <span className="text-xl font-black text-slate-900 font-mono">
                        {cpuPct}%
                      </span>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900">CPU Processor Load</p>
                      <p className="text-[11px] text-slate-500 truncate" title={device.cpu_model}>
                        {device.cpu_model}
                      </p>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          cpuPct > 80 ? 'bg-rose-500' : cpuPct > 50 ? 'bg-amber-500' : 'bg-brand-600'
                        }`}
                        style={{ width: `${Math.min(cpuPct, 100)}%` }}
                      />
                    </div>
                  </div>

                  {/* RAM Memory Card */}
                  <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                        <HardDrive className="w-5 h-5" />
                      </div>
                      <span className="text-xl font-black text-slate-900 font-mono">
                        {ramPct}%
                      </span>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900">RAM Memory Used</p>
                      <p className="text-[11px] text-slate-500 font-mono">
                        {usedRam.toFixed(1)} GB / {totalRam.toFixed(1)} GB ({freeRam} GB Free)
                      </p>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          ramPct > 85 ? 'bg-rose-500' : 'bg-indigo-500'
                        }`}
                        style={{ width: `${Math.min(ramPct, 100)}%` }}
                      />
                    </div>
                  </div>

                  {/* Disk Storage Card */}
                  <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="w-10 h-10 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
                        <Database className="w-5 h-5" />
                      </div>
                      <span className="text-xl font-black text-slate-900 font-mono">
                        {diskPct}%
                      </span>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900">Storage ({isWindows ? 'C: Drive' : 'Main SSD'})</p>
                      <p className="text-[11px] text-slate-500 font-mono">
                        {usedDisk.toFixed(1)} GB / {totalDisk.toFixed(1)} GB ({freeDisk} GB Free)
                      </p>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          diskPct > 90 ? 'bg-rose-500' : 'bg-emerald-500'
                        }`}
                        style={{ width: `${Math.min(diskPct, 100)}%` }}
                      />
                    </div>
                  </div>

                  {/* Network Latency Card */}
                  <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="w-10 h-10 rounded-2xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600">
                        <Wifi className="w-5 h-5" />
                      </div>
                      <span className="text-xl font-black text-purple-700 font-mono">
                        {device.ping_ms || 15}ms
                      </span>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900">Network Latency (Ping)</p>
                      <p className="text-[11px] text-slate-500 font-mono truncate">
                        Wi-Fi: {device.wifi_ssid || 'Office LAN'}
                      </p>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-purple-500 rounded-full"
                        style={{ width: `${Math.min(100, Math.max(15, (device.ping_ms || 15) * 2))}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* System Identity & Detailed Specifications Section */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Left Specs Container */}
                  <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
                    <div className="flex items-center space-x-3 pb-3 border-b border-slate-100">
                      <Laptop className="w-5 h-5 text-brand-600" />
                      <h3 className="text-sm font-bold text-slate-900">
                        System Identity & Operating System
                      </h3>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-xs font-mono">
                      <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 space-y-1">
                        <span className="text-slate-400 block text-[10px] uppercase font-bold">Workstation Hostname</span>
                        <span className="font-bold text-slate-900 text-sm">{device.hostname}</span>
                      </div>
                      <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 space-y-1">
                        <span className="text-slate-400 block text-[10px] uppercase font-bold">OS Platform</span>
                        <span className="font-bold text-slate-800 truncate block">{device.os_name}</span>
                      </div>
                      <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 space-y-1">
                        <span className="text-slate-400 block text-[10px] uppercase font-bold">Kernel / Build Version</span>
                        <span className="font-bold text-slate-700 truncate block">{device.os_version || 'N/A'}</span>
                      </div>
                      <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 space-y-1">
                        <span className="text-slate-400 block text-[10px] uppercase font-bold">Agent Engine Version</span>
                        <span className="font-bold text-emerald-700">v{device.agent_version || '1.0.0'} (Active)</span>
                      </div>
                    </div>

                    <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100 space-y-2 text-xs font-mono">
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">CPU Full Specifications</span>
                      <p className="text-slate-800 font-bold leading-relaxed">{device.cpu_model}</p>
                    </div>

                    {device.has_usb_connected && (
                      <div className="flex items-center justify-between text-amber-800 bg-amber-50 p-3 rounded-2xl border border-amber-200 text-xs">
                        <span className="flex items-center gap-2 font-bold">
                          <ShieldAlert className="w-4 h-4 text-amber-600" />
                          Removable USB Drive Attached:
                        </span>
                        <span className="font-mono font-bold bg-white px-2 py-0.5 rounded-md border border-amber-300">
                          {device.usb_devices || 'External Drive'}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Right Specs Container: Network & Fleet Connection */}
                  <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
                    <div className="flex items-center space-x-3 pb-3 border-b border-slate-100">
                      <Wifi className="w-5 h-5 text-purple-600" />
                      <h3 className="text-sm font-bold text-slate-900">
                        Network Adapter & Fleet Sync
                      </h3>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-xs font-mono">
                      <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 space-y-1">
                        <span className="text-slate-400 block text-[10px] uppercase font-bold">Local IP Address</span>
                        <span className="font-bold text-brand-700 text-sm">{device.ip_address}</span>
                      </div>
                      <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 space-y-1">
                        <span className="text-slate-400 block text-[10px] uppercase font-bold">Physical MAC Address</span>
                        <span className="font-bold text-slate-800 text-sm truncate block">{device.mac_address}</span>
                      </div>
                      <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 space-y-1">
                        <span className="text-slate-400 block text-[10px] uppercase font-bold">Connected Wi-Fi SSID</span>
                        <span className="font-bold text-purple-800">{device.wifi_ssid || 'CTI_JIO'}</span>
                      </div>
                      <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 space-y-1">
                        <span className="text-slate-400 block text-[10px] uppercase font-bold">Gateway Ping Latency</span>
                        <span className="font-bold text-emerald-700">{device.ping_ms || 15} ms (Fast)</span>
                      </div>
                    </div>

                    <div className="bg-emerald-50/70 p-4 rounded-2xl border border-emerald-200/80 flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-xl bg-emerald-500 text-white flex items-center justify-center">
                          <CheckCircle2 className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-emerald-900">
                            Health Status: OPTIMAL (Healthy)
                          </h4>
                          <p className="text-[11px] text-emerald-700 font-medium">
                            Hardware telemetry streaming every 4 seconds to central server.
                          </p>
                        </div>
                      </div>
                      <span className="text-xs font-mono font-bold text-emerald-800 bg-white px-2.5 py-1 rounded-lg border border-emerald-300">
                        98 / 100
                      </span>
                    </div>

                    <div className="pt-2 flex gap-3">
                      <button
                        onClick={() => {
                          onClose();
                          onOpenSelfHealing();
                        }}
                        className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center space-x-2 shadow-xs transition-all cursor-pointer"
                      >
                        <Sparkles className="w-4 h-4" />
                        <span>Run 1-Click Fix My PC</span>
                      </button>
                      <button
                        onClick={() => {
                          onClose();
                          onOpenSpeedTest();
                        }}
                        className="flex-1 py-2.5 px-4 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs flex items-center justify-center space-x-2 shadow-xs transition-all cursor-pointer"
                      >
                        <Gauge className="w-4 h-4" />
                        <span>Measure Internet Speed</span>
                      </button>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* TAB 2: RUNNING TASKS & PROCESS MANAGER */}
            {activeTab === 'PROCESSES' && (
              <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center space-x-3">
                    <Layers className="w-5 h-5 text-indigo-600" />
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">
                        Top Running Tasks & Memory Usage
                      </h3>
                      <p className="text-xs text-slate-500">
                        Active applications and background processes on this workstation
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-mono text-slate-400">
                    Live Process Counter: {processes.length} Active
                  </span>
                </div>

                {isLoadingProcesses ? (
                  <div className="text-center py-12 space-y-3">
                    <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
                    <p className="text-xs font-mono text-slate-500">Reading task list from workstation OS...</p>
                  </div>
                ) : processes.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs font-mono">
                      <thead>
                        <tr className="border-b border-slate-200 text-slate-400 uppercase text-[10px]">
                          <th className="py-2.5 px-3">Process Name</th>
                          <th className="py-2.5 px-3">PID</th>
                          <th className="py-2.5 px-3">Session</th>
                          <th className="py-2.5 px-3 text-right">Memory (MB)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {processes.map((proc, idx) => (
                          <tr key={`${proc.pid}-${idx}`} className="hover:bg-slate-50 transition-colors">
                            <td className="py-2.5 px-3 font-bold text-slate-800 flex items-center gap-2">
                              <Terminal className="w-3.5 h-3.5 text-slate-400" />
                              <span>{proc.name}</span>
                            </td>
                            <td className="py-2.5 px-3 text-slate-500">{proc.pid}</td>
                            <td className="py-2.5 px-3 text-slate-500">{proc.session || 'Console'}</td>
                            <td className="py-2.5 px-3 text-right font-bold text-indigo-700">
                              {proc.mem_mb.toFixed(1)} MB
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-10 bg-slate-50 rounded-2xl border border-slate-100 text-xs text-slate-500 font-mono space-y-2">
                    <Terminal className="w-8 h-8 text-slate-400 mx-auto" />
                    <p>Process details are available when running the native desktop client.</p>
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: NETWORK & WI-FI */}
            {activeTab === 'NETWORK' && (
              <div className="space-y-6">
                <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <div className="flex items-center space-x-3">
                      <Wifi className="w-5 h-5 text-purple-600" />
                      <h3 className="text-sm font-bold text-slate-900">
                        Network Interface & Diagnostics
                      </h3>
                    </div>
                    <button
                      onClick={() => {
                        onClose();
                        onOpenSpeedTest();
                      }}
                      className="px-3.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs flex items-center space-x-1.5 shadow-xs cursor-pointer"
                    >
                      <Gauge className="w-3.5 h-3.5" />
                      <span>Launch Full Speed Test</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-mono">
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-1">
                      <span className="text-slate-400 text-[10px] uppercase font-bold block">Wi-Fi Network SSID</span>
                      <span className="text-base font-black text-slate-900">{device.wifi_ssid || 'CTI_JIO'}</span>
                      <p className="text-[11px] text-slate-500">Connected to 5GHz Office Wi-Fi</p>
                    </div>

                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-1">
                      <span className="text-slate-400 text-[10px] uppercase font-bold block">LAN IP Address</span>
                      <span className="text-base font-black text-brand-700">{device.ip_address}</span>
                      <p className="text-[11px] text-slate-500">Static / DHCP Subnet</p>
                    </div>

                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-1">
                      <span className="text-slate-400 text-[10px] uppercase font-bold block">Gateway Ping Latency</span>
                      <span className="text-base font-black text-emerald-600">{device.ping_ms || 15} ms</span>
                      <p className="text-[11px] text-emerald-700 font-semibold">Low Jitter & Zero Packet Loss</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 4: COMPLETE HARDWARE SPECS SHEET */}
            {activeTab === 'HARDWARE' && (
              <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
                <div className="flex items-center space-x-3 pb-3 border-b border-slate-100">
                  <Monitor className="w-5 h-5 text-brand-600" />
                  <h3 className="text-sm font-bold text-slate-900">
                    Comprehensive Hardware Profile & Telemetry Audit
                  </h3>
                </div>

                <div className="space-y-3 text-xs font-mono">
                  <div className="flex justify-between py-2 border-b border-slate-100">
                    <span className="text-slate-500">Workstation Machine Name:</span>
                    <span className="font-bold text-slate-900">{device.hostname}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-slate-100">
                    <span className="text-slate-500">Processor (CPU):</span>
                    <span className="font-bold text-slate-900">{device.cpu_model}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-slate-100">
                    <span className="text-slate-500">Total Installed RAM:</span>
                    <span className="font-bold text-slate-900">{device.total_ram_gb.toFixed(1)} GB DDR4/DDR5</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-slate-100">
                    <span className="text-slate-500">Current RAM In-Use:</span>
                    <span className="font-bold text-indigo-700">{device.used_ram_gb.toFixed(1)} GB ({ramPct}%)</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-slate-100">
                    <span className="text-slate-500">Primary Hard Drive Storage:</span>
                    <span className="font-bold text-slate-900">{totalDisk.toFixed(1)} GB High-Speed NVMe/SSD</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-slate-100">
                    <span className="text-slate-500">Free Storage Space Remaining:</span>
                    <span className="font-bold text-emerald-700">{freeDisk} GB Free Space</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-slate-100">
                    <span className="text-slate-500">Operating System Release:</span>
                    <span className="font-bold text-slate-900">{device.os_name} ({device.os_version})</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-slate-100">
                    <span className="text-slate-500">Network MAC Address:</span>
                    <span className="font-bold text-slate-700">{device.mac_address}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-slate-100">
                    <span className="text-slate-500">Local Wi-Fi SSID:</span>
                    <span className="font-bold text-brand-700">{device.wifi_ssid || 'CTI_JIO'}</span>
                  </div>
                  <div className="flex justify-between py-2">
                    <span className="text-slate-500">Fleet Telemetry Heartbeat:</span>
                    <span className="font-bold text-emerald-700 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                      Active Synchronized (&lt; 4s interval)
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
