import React from 'react';
import { Wifi, WifiOff, Bell, User as UserIcon, LogOut, Activity, Megaphone } from 'lucide-react';
import logoSvg from '../../assets/logo.svg';
import { User } from '../../types';
import { useWebSocket } from '../../context/WebSocketContext';

interface HeaderProps {
  currentUser: User;
  onLogout: () => void;
  onlineCount: number;
  totalDevices: number;
  criticalTicketsCount: number;
  onOpenBroadcast?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentUser,
  onLogout,
  onlineCount,
  totalDevices,
  criticalTicketsCount,
  onOpenBroadcast,
}) => {
  const { isConnected } = useWebSocket();

  return (
    <header className="h-16 border-b border-slate-200/80 bg-white flex items-center justify-between px-6 sticky top-0 z-40 select-none shadow-sm">
      {/* Brand & Logo */}
      <div className="flex items-center space-x-3.5">
        <div className="h-10 px-3 bg-slate-900 rounded-2xl flex items-center justify-center shadow-sm">
          <img src={logoSvg} alt="Creative AI" className="h-5 w-auto object-contain" />
        </div>
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-base font-black tracking-tight text-slate-900">
              Creative AI
            </h1>
            <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
              IT HELPDESK
            </span>
          </div>
          <p className="text-[11px] text-slate-400 font-medium">Enterprise Management Suite</p>
        </div>
      </div>

      {/* Real-time KPIs & Telemetry */}
      <div className="hidden md:flex items-center space-x-4 text-xs">
        {/* WebSocket Stream Badge */}
        <div className="flex items-center space-x-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
          {isConnected ? (
            <>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="font-mono text-slate-700 font-semibold flex items-center gap-1.5 text-[11px]">
                <Wifi className="w-3.5 h-3.5 text-emerald-600" /> SYNC LIVE
              </span>
            </>
          ) : (
            <>
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
              <span className="font-mono text-rose-600 font-semibold flex items-center gap-1.5 text-[11px]">
                <WifiOff className="w-3.5 h-3.5" /> RECONNECTING
              </span>
            </>
          )}
        </div>

        {/* Fleet Online KPI */}
        <div className="flex items-center space-x-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 text-[11px]">
          <Activity className="w-3.5 h-3.5 text-brand-600" />
          <span className="text-slate-500 font-medium">Fleet:</span>
          <span className="font-bold text-slate-800 font-mono">
            {onlineCount}/{totalDevices} Online
          </span>
        </div>

        {/* Critical Tickets Alert */}
        {criticalTicketsCount > 0 && (
          <div className="flex items-center space-x-1.5 bg-rose-50 px-3 py-1.5 rounded-xl border border-rose-200 text-rose-700 text-[11px] font-bold animate-pulse">
            <Bell className="w-3.5 h-3.5" />
            <span>{criticalTicketsCount} CRITICAL</span>
          </div>
        )}
      </div>

      {/* User Profile & Logout */}
      <div className="flex items-center space-x-3.5">
        {(currentUser.role === 'ADMIN' || currentUser.role === 'TECHNICIAN') && onOpenBroadcast && (
          <button
            onClick={onOpenBroadcast}
            title="Broadcast Announcement to all Employees"
            className="py-2 px-3 rounded-xl bg-brand-50 hover:bg-brand-100 border border-brand-200 text-brand-700 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
          >
            <Megaphone className="w-3.5 h-3.5 text-brand-600" />
            <span className="hidden md:inline">Broadcast</span>
          </button>
        )}

        <div className="text-right hidden sm:block">
          <p className="text-xs font-bold text-slate-900">{currentUser.full_name}</p>
          <p className="text-[11px] text-brand-700 font-semibold font-mono">
            {currentUser.role} • {currentUser.department}
          </p>
        </div>

        <button
          onClick={onLogout}
          title="Sign out of account"
          className="p-2.5 rounded-xl bg-slate-50 hover:bg-rose-50 border border-slate-200 hover:border-rose-200 text-slate-600 hover:text-rose-600 transition-all cursor-pointer flex items-center gap-1 text-xs font-semibold"
        >
          <LogOut className="w-4 h-4" />
          <span className="hidden sm:inline">Logout</span>
        </button>
      </div>
    </header>
  );
};
