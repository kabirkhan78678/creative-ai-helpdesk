import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Shield, User, Lock, ArrowRight, AlertCircle, CheckCircle2, Laptop, Settings, Sparkles, Wifi } from 'lucide-react';
import logoSvg from '../../assets/logo.svg';
import { User as UserType } from '../../types';
import { getApiBaseUrl, getServerHost, setServerHost } from '../../config/api';
import { ServerSettingsModal } from '../common/ServerSettingsModal';

interface LoginScreenProps {
  onLoginSuccess: (user: UserType) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
  const [roleMode, setRoleMode] = useState<'ADMIN' | 'EMPLOYEE'>('ADMIN');
  const [usernameOrEmail, setUsernameOrEmail] = useState('admin@company.com');
  const [password, setPassword] = useState('admin123');
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [currentHost, setCurrentHost] = useState(getServerHost());
  const [isAutoDiscovered, setIsAutoDiscovered] = useState(false);

  // Automatic Zero-Config Server Detection when opening app on another PC
  useEffect(() => {
    let isMounted = true;
    const runAutoConnect = async () => {
      // 1. Check if current host is already reachable
      try {
        const host = getServerHost();
        const pingUrl = host.startsWith('http') ? host : `http://${host}:8000/`;
        const pingRes = await fetch(pingUrl, { method: 'GET' }).catch(() => null);
        if (pingRes && pingRes.ok) return; // current host is active!
      } catch (_) {}

      // 2. If not reachable (e.g. running on another PC with default localhost), auto-detect Central Server!
      if (typeof window !== 'undefined' && (window as any).electronAPI?.discoverServerIp) {
        try {
          const found = await (window as any).electronAPI.discoverServerIp();
          if (found && found.ip && isMounted) {
            setServerHost(found.ip);
            setCurrentHost(found.ip);
            setIsAutoDiscovered(true);
          }
        } catch (_) {}
      }
    };
    runAutoConnect();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleModeSwitch = (mode: 'ADMIN' | 'EMPLOYEE') => {
    setRoleMode(mode);
    setErrorMsg('');
    if (mode === 'ADMIN') {
      setUsernameOrEmail('admin@company.com');
      setPassword('admin123');
    } else {
      setUsernameOrEmail('alex.m@company.com');
      setPassword('user123');
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setIsLoading(true);

    try {
      const res = await fetch(`${getApiBaseUrl()}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username_or_email: usernameOrEmail.trim(),
          password: password,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || 'Login failed. Please check credentials.');
      }

      // Check role authorization
      if (roleMode === 'ADMIN' && data.user.role === 'EMPLOYEE') {
        throw new Error('This account is an Employee account. Please switch to Employee Login.');
      }

      localStorage.setItem('creative_ai_user', JSON.stringify(data.user));
      onLoginSuccess(data.user);
    } catch (err: any) {
      setErrorMsg(err.message || 'Unable to connect to IT backend.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100/70 flex items-center justify-center p-6 select-none font-sans">
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-md bg-white rounded-3xl border border-slate-200/80 shadow-modal p-8 space-y-6"
      >
        {/* Brand Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center p-3 bg-slate-900 rounded-2xl shadow-md mx-auto">
            <img src={logoSvg} alt="Creative AI" className="h-7 w-auto object-contain" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900">
              Creative AI
            </h1>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Internal IT Management & Helpdesk Suite
            </p>
          </div>
        </div>

        {/* Role Selector Tabs */}
        <div className="flex bg-slate-100 p-1.5 rounded-2xl border border-slate-200/60">
          <button
            type="button"
            onClick={() => handleModeSwitch('ADMIN')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
              roleMode === 'ADMIN'
                ? 'bg-white text-brand-700 shadow-sm border border-slate-200/60'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Shield className="w-4 h-4 text-brand-600" />
            <span>IT Admin / Tech</span>
          </button>
          <button
            type="button"
            onClick={() => handleModeSwitch('EMPLOYEE')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
              roleMode === 'EMPLOYEE'
                ? 'bg-white text-brand-700 shadow-sm border border-slate-200/60'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <User className="w-4 h-4 text-brand-600" />
            <span>Employee Portal</span>
          </button>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-2xl text-xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              {roleMode === 'ADMIN' ? 'Admin Username or Email' : 'Employee Username (Code) or Email'}
            </label>
            <div className="relative">
              <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                required
                placeholder={roleMode === 'ADMIN' ? 'admin@company.com' : 'EMP-102 or email@company.com'}
                value={usernameOrEmail}
                onChange={(e) => setUsernameOrEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:bg-white focus:border-brand-600 focus:ring-2 focus:ring-brand-100 transition-all font-medium"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Account Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:bg-white focus:border-brand-600 focus:ring-2 focus:ring-brand-100 transition-all font-medium"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 px-4 rounded-xl bg-brand-600 hover:bg-brand-700 active:bg-brand-800 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer disabled:opacity-50"
          >
            <span>{isLoading ? 'Verifying Credentials...' : `Log in to ${roleMode === 'ADMIN' ? 'Admin Console' : 'Employee Portal'}`}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Quick Demo Pre-fill Pills */}
        <div className="pt-2 border-t border-slate-100 space-y-3">
          <div>
            <p className="text-[11px] font-semibold text-slate-400 mb-2 text-center uppercase tracking-wider">
              Quick Demo Autofill
            </p>
            <div className="flex flex-wrap gap-2 justify-center">
              <button
                type="button"
                onClick={() => {
                  setRoleMode('ADMIN');
                  setUsernameOrEmail('admin@company.com');
                  setPassword('admin123');
                }}
                className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium border border-slate-200 transition-colors"
              >
                Admin (admin123)
              </button>
              <button
                type="button"
                onClick={() => {
                  setRoleMode('ADMIN');
                  setUsernameOrEmail('tech@company.com');
                  setPassword('tech123');
                }}
                className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium border border-slate-200 transition-colors"
              >
                Tech (tech123)
              </button>
              <button
                type="button"
                onClick={() => {
                  setRoleMode('EMPLOYEE');
                  setUsernameOrEmail('alex.m@company.com');
                  setPassword('user123');
                }}
                className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium border border-slate-200 transition-colors"
              >
                Alex (user123)
              </button>
            </div>
          </div>

          {/* Auto-Discovered Notification Banner */}
          {isAutoDiscovered && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between shadow-xs"
            >
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Auto-Connected Central Server: <strong className="font-mono">{currentHost}</strong></span>
              </div>
              <span className="text-[10px] font-bold bg-emerald-200/60 text-emerald-900 px-2 py-0.5 rounded-full">
                Zero-Config
              </span>
            </motion.div>
          )}

          {/* Network Host Settings Pill */}
          <div className="flex items-center justify-between bg-slate-50 px-3 py-2 rounded-xl border border-slate-200 text-xs">
            <span className="text-slate-500 font-medium flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${isAutoDiscovered ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
              Server: <strong className="font-mono text-slate-800">{currentHost}</strong>
              {isAutoDiscovered && (
                <span className="text-[10px] text-emerald-700 font-bold bg-emerald-100 px-1.5 py-0.2 rounded border border-emerald-200">
                  Auto
                </span>
              )}
            </span>
            <button
              type="button"
              onClick={() => setIsSettingsOpen(true)}
              className="text-brand-600 hover:text-brand-700 font-bold flex items-center gap-1 cursor-pointer"
            >
              <Settings className="w-3.5 h-3.5" />
              <span>Change IP</span>
            </button>
          </div>
        </div>

        <ServerSettingsModal
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          onHostSaved={() => setCurrentHost(getServerHost())}
        />
      </motion.div>
    </div>
  );
};

