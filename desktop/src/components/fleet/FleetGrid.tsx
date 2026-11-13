import React, { useState } from 'react';
import { Search, RefreshCw, Server, Download, FileSpreadsheet } from 'lucide-react';
import { Device } from '../../types';
import { DeviceCard } from './DeviceCard';

interface FleetGridProps {
  devices: Device[];
  onInitiateRemote: (device: Device) => void;
  onOpenChat: (device: Device) => void;
  onRefresh: () => void;
  onOpenRemoteActions?: (device: Device) => void;
  isLoading: boolean;
}

export const FleetGrid: React.FC<FleetGridProps> = ({
  devices,
  onInitiateRemote,
  onOpenChat,
  onRefresh,
  onOpenRemoteActions,
  isLoading,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ONLINE' | 'OFFLINE'>('ALL');

  const handleExportCSV = () => {
    const headers = [
      'Hostname',
      'Assigned Employee',
      'Employee Code',
      'Department',
      'Designation',
      'IP Address',
      'MAC Address',
      'OS Platform',
      'Processor',
      'Total RAM (GB)',
      'Used RAM (GB)',
      'Total Disk (GB)',
      'Used Disk (GB)',
      'Disk Used %',
      'Wi-Fi Network',
      'Ping (ms)',
      'USB Connected',
      'Online Status',
    ];

    const rows = devices.map((d) => [
      `"${d.hostname}"`,
      `"${d.assigned_user ? d.assigned_user.full_name : 'Unassigned'}"`,
      `"${d.assigned_user ? d.assigned_user.employee_code : 'N/A'}"`,
      `"${d.assigned_user ? d.assigned_user.department : 'N/A'}"`,
      `"${d.assigned_user?.designation || 'Staff'}"`,
      `"${d.ip_address}"`,
      `"${d.mac_address}"`,
      `"${d.os_name}"`,
      `"${d.cpu_model}"`,
      d.total_ram_gb.toFixed(1),
      d.used_ram_gb.toFixed(1),
      (d.total_storage_gb || 237.2).toFixed(1),
      (d.used_storage_gb || ((d.total_storage_gb || 237.2) * (d.storage_usage_pct / 100))).toFixed(1),
      `${d.storage_usage_pct.toFixed(0)}%`,
      `"${d.wifi_ssid || 'CTI_JIO'}"`,
      d.ping_ms || 15,
      d.has_usb_connected ? `"YES (${d.usb_devices || 'Plugged'})"` : '"NO"',
      d.is_online ? '"ONLINE"' : '"OFFLINE"',
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `CreativeAI_Workstation_Fleet_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredDevices = devices.filter((d) => {
    const matchesSearch =
      d.hostname.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.ip_address.includes(searchTerm) ||
      (d.assigned_user && d.assigned_user.full_name.toLowerCase().includes(searchTerm.toLowerCase()));

    if (statusFilter === 'ONLINE') return matchesSearch && d.is_online;
    if (statusFilter === 'OFFLINE') return matchesSearch && !d.is_online;
    return matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Control Toolbar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        {/* Search */}
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search hostname, IP, or user..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-brand-600 transition-all font-medium"
          />
        </div>

        {/* Actions & Filters */}
        <div className="flex items-center space-x-2.5 w-full sm:w-auto justify-end flex-wrap gap-y-2">
          {/* Export CSV Audit Report */}
          <button
            onClick={handleExportCSV}
            title="Download CSV Inventory Audit Report"
            className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 font-bold text-xs flex items-center space-x-1.5 transition-all cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-slate-600" />
            <span>Export CSV Report</span>
          </button>

          <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200/60 text-xs font-semibold">
            <button
              onClick={() => setStatusFilter('ALL')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                statusFilter === 'ALL'
                  ? 'bg-white text-brand-700 shadow-sm font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All ({devices.length})
            </button>
            <button
              onClick={() => setStatusFilter('ONLINE')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                statusFilter === 'ONLINE'
                  ? 'bg-white text-emerald-700 shadow-sm font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Online ({devices.filter(d => d.is_online).length})
            </button>
            <button
              onClick={() => setStatusFilter('OFFLINE')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                statusFilter === 'OFFLINE'
                  ? 'bg-white text-slate-800 shadow-sm font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Offline ({devices.filter(d => !d.is_online).length})
            </button>
          </div>

          <button
            onClick={onRefresh}
            title="Refresh Telemetry"
            className="p-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 rounded-xl transition-all cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-brand-600' : ''}`} />
          </button>
        </div>
      </div>

      {/* Grid */}
      {filteredDevices.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-3xl border border-slate-200">
          <Server className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h4 className="text-base font-bold text-slate-700">No matching workstations</h4>
          <p className="text-xs text-slate-400 mt-1">Adjust search parameters</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredDevices.map((device) => (
            <DeviceCard
              key={device.id}
              device={device}
              onInitiateRemote={onInitiateRemote}
              onOpenChat={onOpenChat}
              onOpenRemoteActions={onOpenRemoteActions}
            />
          ))}
        </div>
      )}
    </div>
  );
};
