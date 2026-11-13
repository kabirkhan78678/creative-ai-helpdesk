import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Briefcase, Building, Check, X, ShieldCheck } from 'lucide-react';
import { User as UserType } from '../../types';
import { getApiBaseUrl } from '../../config/api';

interface ProfileSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserType;
  onProfileUpdated: (updatedUser: UserType) => void;
}

export const ProfileSetupModal: React.FC<ProfileSetupModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onProfileUpdated,
}) => {
  const [fullName, setFullName] = useState(currentUser.full_name || '');
  const [department, setDepartment] = useState(currentUser.department || 'Core Engineering');
  const [designation, setDesignation] = useState(currentUser.designation || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg('');

    try {
      const res = await fetch(`${getApiBaseUrl()}/auth/users/${currentUser.id}/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: fullName.trim(),
          department: department.trim(),
          designation: designation.trim(),
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to update profile.');
      }

      const updated = await res.json();
      localStorage.setItem('creative_ai_user', JSON.stringify(updated));
      onProfileUpdated(updated);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Update failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="white-modal max-w-md w-full rounded-3xl p-6 relative"
        >
          <div className="flex justify-between items-center pb-4 border-b border-slate-100 mb-5">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-2xl bg-brand-50 border border-brand-100 flex items-center justify-center text-brand-600">
                <User className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Update Employee Profile
                </h3>
                <p className="text-xs text-slate-500">
                  Code: <span className="font-mono font-bold text-brand-700">{currentUser.employee_code}</span>
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-700"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 text-rose-700 border border-rose-200 text-xs mb-4">
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Full Name *
              </label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:bg-white focus:border-brand-600 font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Designation / Job Title *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Senior Frontend Engineer"
                value={designation}
                onChange={(e) => setDesignation(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:bg-white focus:border-brand-600 font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Department
              </label>
              <select
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-brand-600 font-medium"
              >
                <option value="Core Engineering">Core Engineering</option>
                <option value="Product Design">Product Design</option>
                <option value="Enterprise Sales">Enterprise Sales</option>
                <option value="Finance & Operations">Finance & Operations</option>
                <option value="IT Support">IT Support</option>
                <option value="Human Resources">Human Resources</option>
              </select>
            </div>

            <div className="pt-3 flex justify-end space-x-2 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs shadow-sm transition-all flex items-center gap-1.5"
              >
                <Check className="w-3.5 h-3.5" />
                <span>{isSubmitting ? 'Saving...' : 'Save Profile Details'}</span>
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

