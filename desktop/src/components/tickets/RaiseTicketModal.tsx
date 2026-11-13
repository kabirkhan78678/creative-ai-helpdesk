import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PlusCircle, X, Send, Camera, Image as ImageIcon, Trash2 } from 'lucide-react';
import { Device, TicketCategory, TicketPriority } from '../../types';
import { getApiBaseUrl } from '../../config/api';

interface RaiseTicketModalProps {
  isOpen: boolean;
  onClose: () => void;
  devices: Device[];
  currentUserId: number;
  onTicketCreated: () => void;
  initialTitle?: string;
  initialDescription?: string;
  initialCategory?: TicketCategory;
}

export const RaiseTicketModal: React.FC<RaiseTicketModalProps> = ({
  isOpen,
  onClose,
  devices,
  currentUserId,
  onTicketCreated,
  initialTitle,
  initialDescription,
  initialCategory,
}) => {
  const [title, setTitle] = useState(initialTitle || '');
  const [description, setDescription] = useState(initialDescription || '');
  const [category, setCategory] = useState<TicketCategory>(initialCategory || 'HARDWARE');
  const [priority, setPriority] = useState<TicketPriority>('MEDIUM');
  const [deviceId, setDeviceId] = useState<number | ''>(devices[0]?.id || '');
  const [attachmentImage, setAttachmentImage] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  React.useEffect(() => {
    if (initialTitle) setTitle(initialTitle);
    if (initialDescription) setDescription(initialDescription);
    if (initialCategory) setCategory(initialCategory);
  }, [initialTitle, initialDescription, initialCategory, isOpen]);

  if (!isOpen) return null;

  const handleCaptureScreenshot = async () => {
    setIsCapturing(true);
    try {
      if (typeof window !== 'undefined' && (window as any).electronAPI?.takeScreenshot) {
        const dataUrl = await (window as any).electronAPI.takeScreenshot();
        if (dataUrl) {
          setAttachmentImage(dataUrl);
        }
      }
    } catch (err) {
      console.error('Failed to take screenshot:', err);
    } finally {
      setIsCapturing(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !description) return;

    setIsSubmitting(true);
    try {
      const res = await fetch(`${getApiBaseUrl()}/tickets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description,
          category,
          priority,
          creator_id: currentUserId,
          device_id: deviceId ? Number(deviceId) : null,
          attachment_image: attachmentImage,
        }),
      });

      if (res.ok) {
        onTicketCreated();
        onClose();
      }
    } catch (err) {
      console.error('Failed to create ticket:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="white-modal max-w-lg w-full rounded-3xl p-6 relative overflow-hidden max-h-[90vh] overflow-y-auto"
        >
          {/* Header */}
          <div className="flex justify-between items-center pb-4 border-b border-slate-100 mb-5">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-xl bg-brand-50 border border-brand-100 flex items-center justify-center text-brand-600">
                <PlusCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 tracking-tight">
                  Raise IT Support Ticket
                </h3>
                <p className="text-xs text-slate-500">Submit an issue to Creative AI IT Desk</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-700 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Issue Summary *
              </label>
              <input
                type="text"
                required
                placeholder="Brief summary of hardware or software malfunction..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:bg-white focus:border-brand-600 font-medium"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as TicketCategory)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-brand-600 font-medium"
                >
                  <option value="HARDWARE">Hardware Issue</option>
                  <option value="NETWORK">Network / VPN</option>
                  <option value="SOFTWARE">Software / OS</option>
                  <option value="ACCESS">Access & Permissions</option>
                  <option value="OTHER">Other Query</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Priority
                </label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as TicketPriority)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-brand-600 font-medium"
                >
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="CRITICAL">Critical (System Down)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Affected Workstation
              </label>
              <select
                value={deviceId}
                onChange={(e) => setDeviceId(e.target.value ? Number(e.target.value) : '')}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-brand-600 font-mono"
              >
                <option value="">None / External Device</option>
                {devices.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.hostname} ({d.ip_address}) - {d.os_name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Description & Symptoms *
              </label>
              <textarea
                required
                rows={3}
                placeholder="Describe exact error codes, reproduction steps, or failed peripherals..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:bg-white focus:border-brand-600 font-sans resize-none"
              />
            </div>

            {/* Error Screen Snapshot Attachment */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between">
                <span>Attach Error Screen Snapshot</span>
                <span className="text-[10px] text-slate-400 font-normal">Optional</span>
              </label>

              {attachmentImage ? (
                <div className="relative rounded-2xl overflow-hidden border border-slate-200 bg-slate-50 p-2">
                  <img
                    src={attachmentImage}
                    alt="Error Screenshot"
                    className="w-full h-32 object-cover rounded-xl"
                  />
                  <button
                    type="button"
                    onClick={() => setAttachmentImage(null)}
                    className="absolute top-4 right-4 p-1.5 rounded-lg bg-rose-600 text-white shadow-md hover:bg-rose-700 transition-colors cursor-pointer"
                    title="Remove Screenshot"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleCaptureScreenshot}
                  disabled={isCapturing}
                  className="w-full py-2.5 px-4 rounded-xl border border-dashed border-slate-300 hover:border-brand-500 bg-slate-50 hover:bg-brand-50/30 text-slate-600 hover:text-brand-700 font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <Camera className="w-4 h-4 text-brand-600" />
                  <span>{isCapturing ? 'Capturing screen...' : 'Capture Current Screen Screenshot'}</span>
                </button>
              )}
            </div>

            <div className="pt-2 flex justify-end space-x-3 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-700 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs flex items-center space-x-2 shadow-sm transition-all cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{isSubmitting ? 'Submitting...' : 'Dispatch Ticket'}</span>
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
