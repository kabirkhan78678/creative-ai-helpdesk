import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UserPlus, UserCheck, Key, Trash2, Mail, Briefcase, Building, Shield, Check, X, Search, RefreshCw } from 'lucide-react';
import { User, Device } from '../../types';
import { getApiBaseUrl } from '../../config/api';

interface EmployeeManagerProps {
  devices: Device[];
  onRefreshDevices: () => void;
}

export const EmployeeManager: React.FC<EmployeeManagerProps> = ({ devices, onRefreshDevices }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Form State for creating employee credential
  const [fullName, setFullName] = useState('');
  const [employeeCode, setEmployeeCode] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [department, setDepartment] = useState('Core Engineering');
  const [designation, setDesignation] = useState('');
  const [role, setRole] = useState<'EMPLOYEE' | 'TECHNICIAN'>('EMPLOYEE');
  const [selectedDeviceId, setSelectedDeviceId] = useState<number | ''>('');
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const loadUsers = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`${getApiBaseUrl()}/auth/users`);
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      }
    } catch (err) {
      console.error('Failed to load users:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleCreateEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMsg(null);

    try {
      // 1. Create User Credential in MySQL
      const res = await fetch(`${getApiBaseUrl()}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employee_code: employeeCode.trim(),
          full_name: fullName.trim(),
          email: email.trim(),
          password: password,
          department: department.trim(),
          designation: designation.trim() || 'Team Member',
          role: role,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || 'Could not register employee.');
      }

      // 2. Assign PC Workstation if selected
      if (selectedDeviceId) {
        await fetch(`${getApiBaseUrl()}/devices/${selectedDeviceId}/assign/${data.id}`, {
          method: 'PUT',
        });
        onRefreshDevices();
      }

      setStatusMsg({ type: 'success', text: `Credentials created successfully for ${fullName}!` });
      // Reset form
      setFullName('');
      setEmployeeCode('');
      setEmail('');
      setPassword('');
      setDesignation('');
      setSelectedDeviceId('');
      loadUsers();

      setTimeout(() => {
        setIsModalOpen(false);
        setStatusMsg(null);
      }, 1200);
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Registration failed.' });
    }
  };

  const handleDeleteUser = async (userId: number, name: string) => {
    if (!window.confirm(`Are you sure you want to revoke credentials and delete account for ${name}?`)) return;
    try {
      const res = await fetch(`${getApiBaseUrl()}/auth/users/${userId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (res.ok) {
        setStatusMsg({ type: 'success', text: `Account for ${name} was revoked and deleted successfully.` });
        loadUsers();
        onRefreshDevices();
        setTimeout(() => setStatusMsg(null), 4000);
      } else {
        setStatusMsg({ type: 'error', text: data.detail || 'Could not delete employee account.' });
        setTimeout(() => setStatusMsg(null), 5000);
      }
    } catch (e: any) {
      console.error(e);
      setStatusMsg({ type: 'error', text: e.message || 'Network error while deleting employee account.' });
      setTimeout(() => setStatusMsg(null), 5000);
    }
  };

  const filteredUsers = users.filter((u) =>
    u.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.employee_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.department.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search employee, username, department..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-brand-600 transition-all font-medium"
          />
        </div>

        <div className="flex items-center space-x-3 w-full sm:w-auto justify-end">
          <button
            onClick={loadUsers}
            title="Refresh Users"
            className="p-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 rounded-xl transition-all"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-brand-600' : ''}`} />
          </button>

          <button
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs flex items-center space-x-2 shadow-sm transition-all"
          >
            <UserPlus className="w-4 h-4" />
            <span>CREATE EMPLOYEE CREDENTIALS</span>
          </button>
        </div>
      </div>

      {/* Action Feedback Banner */}
      {statusMsg && !isModalOpen && (
        <div
          className={`p-3.5 rounded-2xl border text-xs font-semibold flex items-center justify-between transition-all animate-fade-in ${
            statusMsg.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-rose-50 text-rose-700 border-rose-200'
          }`}
        >
          <div className="flex items-center space-x-2">
            {statusMsg.type === 'success' ? (
              <Check className="w-4 h-4 text-emerald-600" />
            ) : (
              <X className="w-4 h-4 text-rose-600" />
            )}
            <span>{statusMsg.text}</span>
          </div>
          <button
            onClick={() => setStatusMsg(null)}
            className="p-1 hover:bg-black/5 rounded-lg cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Employee List Table with Dedicated Scrollbar and Sticky Header */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
          <div>
            <h3 className="font-bold text-slate-900 text-sm">
              Registered Company Accounts ({filteredUsers.length})
            </h3>
            <p className="text-xs text-slate-500">
              Admin-issued credentials and assigned office hardware
            </p>
          </div>
        </div>

        {/* Scrollable Table Body Container */}
        <div className="overflow-x-auto overflow-y-auto max-h-[540px] divide-y divide-slate-100">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/95 backdrop-blur text-slate-600 font-semibold border-b border-slate-200 uppercase tracking-wider text-[11px] sticky top-0 z-10 shadow-sm">
              <tr>
                <th className="px-6 py-3.5 bg-slate-50">Employee Name & Code</th>
                <th className="px-6 py-3.5 bg-slate-50">Login Email</th>
                <th className="px-6 py-3.5 bg-slate-50">Department & Role</th>
                <th className="px-6 py-3.5 bg-slate-50">Assigned PC</th>
                <th className="px-6 py-3.5 text-right bg-slate-50">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
              {filteredUsers.map((u) => {
                const assignedDevice = devices.find((d) => d.assigned_user_id === u.id);
                return (
                  <tr key={u.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-9 h-9 rounded-xl bg-brand-50 border border-brand-100 text-brand-700 font-bold flex items-center justify-center text-xs">
                          {u.full_name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900">{u.full_name}</p>
                          <p className="text-[11px] font-mono text-brand-600 font-semibold">
                            Username: {u.employee_code}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-1.5 text-slate-600">
                        <Mail className="w-3.5 h-3.5 text-slate-400" />
                        <span>{u.email}</span>
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <div>
                        <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded border mb-1 ${
                          u.role === 'ADMIN'
                            ? 'bg-purple-50 text-purple-700 border-purple-200'
                            : u.role === 'TECHNICIAN'
                            ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                            : 'bg-slate-100 text-slate-700 border-slate-200'
                        }`}>
                          {u.role}
                        </span>
                        <p className="text-slate-500 text-[11px]">{u.department} • {u.designation || 'Staff'}</p>
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      {assignedDevice ? (
                        <span className="text-xs font-mono font-bold text-slate-800 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
                          {assignedDevice.hostname} ({assignedDevice.ip_address})
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400 italic">No PC assigned</span>
                      )}
                    </td>

                    <td className="px-6 py-4 text-right">
                      {u.role !== 'ADMIN' && (
                        <button
                          onClick={() => handleDeleteUser(u.id, u.full_name)}
                          title="Revoke and Delete Account"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE EMPLOYEE MODAL */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="white-modal max-w-lg w-full max-h-[90vh] overflow-y-auto rounded-3xl p-6 relative"
            >
              <div className="flex justify-between items-center pb-4 border-b border-slate-100 mb-5">
                <div className="flex items-center space-x-3">
                  <div className="w-9 h-9 rounded-xl bg-brand-50 border border-brand-100 flex items-center justify-center text-brand-600">
                    <UserPlus className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">
                      Create Employee Credentials
                    </h3>
                    <p className="text-xs text-slate-500">
                      Issue login details for new staff member
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-700"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {statusMsg && (
                <div className={`p-3 rounded-xl text-xs mb-4 flex items-center gap-2 ${
                  statusMsg.type === 'success'
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : 'bg-rose-50 text-rose-800 border border-rose-200'
                }`}>
                  {statusMsg.type === 'success' ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                  <span>{statusMsg.text}</span>
                </div>
              )}

              <form onSubmit={handleCreateEmployee} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Rohit Kumar"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:bg-white focus:border-brand-600 font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Username / Emp Code *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. EMP-105 or rohit.k"
                      value={employeeCode}
                      onChange={(e) => setEmployeeCode(e.target.value)}
                      className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:bg-white focus:border-brand-600 font-mono font-semibold"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Work Email *
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="rohit@company.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:bg-white focus:border-brand-600 font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Initial Password *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Set login password..."
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:bg-white focus:border-brand-600 font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Department
                    </label>
                    <select
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-brand-600 font-medium"
                    >
                      <option value="Core Engineering">Core Engineering</option>
                      <option value="Product Design">Product Design</option>
                      <option value="Enterprise Sales">Enterprise Sales</option>
                      <option value="Finance & Operations">Finance & Operations</option>
                      <option value="IT Support">IT Support</option>
                      <option value="Human Resources">Human Resources</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Designation
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Senior Software Engineer"
                      value={designation}
                      onChange={(e) => setDesignation(e.target.value)}
                      className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:bg-white focus:border-brand-600 font-medium"
                    />
                  </div>
                </div>

                {/* Role and Workstation Mapping */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      System Role
                    </label>
                    <select
                      value={role}
                      onChange={(e) => setRole(e.target.value as any)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-brand-600 font-medium"
                    >
                      <option value="EMPLOYEE">Standard Employee</option>
                      <option value="TECHNICIAN">IT Support Technician</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Assign Office PC
                    </label>
                    <select
                      value={selectedDeviceId}
                      onChange={(e) => setSelectedDeviceId(e.target.value ? Number(e.target.value) : '')}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-brand-600 font-mono"
                    >
                      <option value="">No workstation assigned</option>
                      {devices.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.hostname} ({d.os_name})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="pt-3 flex justify-end space-x-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs flex items-center space-x-2 shadow-sm transition-all"
                  >
                    <Key className="w-3.5 h-3.5" />
                    <span>Save & Generate Credential</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

