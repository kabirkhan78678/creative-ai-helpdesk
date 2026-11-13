import React from 'react';
import { motion } from 'framer-motion';
import { Clock, User, Monitor, MessageSquare } from 'lucide-react';
import { Ticket, TicketStatus } from '../../types';

interface TicketCardProps {
  ticket: Ticket;
  onUpdateStatus: (ticketId: number, newStatus: TicketStatus) => void;
  onOpenChatWithUser: (userId: number, ticketId: number) => void;
  currentUserId: number;
}

export const TicketCard: React.FC<TicketCardProps> = ({
  ticket,
  onUpdateStatus,
  onOpenChatWithUser,
}) => {
  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'CRITICAL':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'HIGH':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'MEDIUM':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const getStatusBadge = (status: TicketStatus) => {
    switch (status) {
      case 'PENDING':
        return 'bg-amber-50 text-amber-800 border-amber-200';
      case 'IN_PROGRESS':
        return 'bg-blue-50 text-blue-800 border-blue-200';
      case 'RESOLVED':
        return 'bg-emerald-50 text-emerald-800 border-emerald-200';
      case 'CLOSED':
        return 'bg-slate-100 text-slate-600 border-slate-200';
    }
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm hover:shadow-md transition-all duration-300 relative overflow-hidden"
    >
      {/* Priority Left Accent */}
      <div className={`absolute top-0 left-0 bottom-0 w-1.5 ${
        ticket.priority === 'CRITICAL' ? 'bg-rose-500' :
        ticket.priority === 'HIGH' ? 'bg-amber-500' : 'bg-brand-600'
      }`} />

      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 pl-2">
        <div className="space-y-2 max-w-2xl">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-xs font-bold text-brand-700">
              {ticket.ticket_number}
            </span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${getPriorityBadge(ticket.priority)}`}>
              {ticket.priority}
            </span>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-600">
              {ticket.category}
            </span>
          </div>

          <h4 className="text-base font-bold text-slate-900 tracking-tight">
            {ticket.title}
          </h4>

          <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-2xl border border-slate-100">
            {ticket.description}
          </p>

          <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-slate-500 pt-1">
            <div className="flex items-center space-x-1.5">
              <User className="w-3.5 h-3.5 text-brand-600" />
              <span className="text-slate-700 font-semibold">
                {ticket.creator ? ticket.creator.full_name : `User #${ticket.creator_id}`}
              </span>
            </div>

            {ticket.device && (
              <div className="flex items-center space-x-1.5">
                <Monitor className="w-3.5 h-3.5 text-brand-600" />
                <span className="text-slate-700 font-medium">{ticket.device.hostname}</span>
              </div>
            )}

            <div className="flex items-center space-x-1.5 text-slate-400">
              <Clock className="w-3.5 h-3.5" />
              <span>{new Date(ticket.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center space-x-3 w-full lg:w-auto justify-end pt-3 lg:pt-0 border-t lg:border-t-0 border-slate-100">
          <select
            value={ticket.status}
            onChange={(e) => onUpdateStatus(ticket.id, e.target.value as TicketStatus)}
            className={`text-xs font-bold px-3 py-2 rounded-xl border cursor-pointer focus:outline-none ${getStatusBadge(ticket.status)}`}
          >
            <option value="PENDING">PENDING</option>
            <option value="IN_PROGRESS">IN PROGRESS</option>
            <option value="RESOLVED">RESOLVED</option>
            <option value="CLOSED">CLOSED</option>
          </select>

          <button
            onClick={() => onOpenChatWithUser(ticket.creator_id, ticket.id)}
            title="Chat with Employee"
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 transition-all cursor-pointer"
          >
            <MessageSquare className="w-4 h-4" />
          </button>
        </div>
      </div>
    </motion.div>
  );
};
