import React, { useState } from 'react';
import { PlusCircle, CheckCircle } from 'lucide-react';
import { Ticket, TicketStatus, Device } from '../../types';
import { TicketCard } from './TicketCard';
import { RaiseTicketModal } from './RaiseTicketModal';

interface TicketCenterProps {
  tickets: Ticket[];
  devices: Device[];
  currentUserId: number;
  onUpdateStatus: (ticketId: number, status: TicketStatus) => void;
  onOpenChatWithUser: (userId: number, ticketId: number) => void;
  onRefresh: () => void;
}

export const TicketCenter: React.FC<TicketCenterProps> = ({
  tickets,
  devices,
  currentUserId,
  onUpdateStatus,
  onOpenChatWithUser,
  onRefresh,
}) => {
  const [filter, setFilter] = useState<string>('ALL');
  const [isRaiseModalOpen, setIsRaiseModalOpen] = useState(false);

  const filteredTickets = tickets.filter((t) => {
    if (filter === 'ALL') return true;
    return t.status === filter;
  });

  const pendingCount = tickets.filter(t => t.status === 'PENDING').length;
  const inProgressCount = tickets.filter(t => t.status === 'IN_PROGRESS').length;
  const resolvedCount = tickets.filter(t => t.status === 'RESOLVED').length;

  return (
    <div className="space-y-6">
      {/* Top Bar with Filter Pills & Raise Ticket */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setFilter('ALL')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              filter === 'ALL'
                ? 'bg-brand-600 text-white font-bold shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:text-slate-900 border border-slate-200/60'
            }`}
          >
            All Queues ({tickets.length})
          </button>
          <button
            onClick={() => setFilter('PENDING')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              filter === 'PENDING'
                ? 'bg-amber-500 text-white font-bold shadow-sm'
                : 'bg-slate-100 text-amber-700 hover:text-amber-800 border border-slate-200/60'
            }`}
          >
            Pending ({pendingCount})
          </button>
          <button
            onClick={() => setFilter('IN_PROGRESS')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              filter === 'IN_PROGRESS'
                ? 'bg-blue-600 text-white font-bold shadow-sm'
                : 'bg-slate-100 text-blue-700 hover:text-blue-800 border border-slate-200/60'
            }`}
          >
            In Progress ({inProgressCount})
          </button>
          <button
            onClick={() => setFilter('RESOLVED')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              filter === 'RESOLVED'
                ? 'bg-emerald-600 text-white font-bold shadow-sm'
                : 'bg-slate-100 text-emerald-700 hover:text-emerald-800 border border-slate-200/60'
            }`}
          >
            Resolved ({resolvedCount})
          </button>
        </div>

        <button
          onClick={() => setIsRaiseModalOpen(true)}
          className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs flex items-center justify-center space-x-2 shadow-sm transition-all"
        >
          <PlusCircle className="w-4 h-4" />
          <span>RAISE NEW TICKET</span>
        </button>
      </div>

      {/* Ticket List */}
      <div className="space-y-3">
        {filteredTickets.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-3xl border border-slate-200">
            <CheckCircle className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
            <h4 className="text-sm font-bold text-slate-800">No tickets in this queue</h4>
          </div>
        ) : (
          filteredTickets.map((ticket) => (
            <TicketCard
              key={ticket.id}
              ticket={ticket}
              onUpdateStatus={onUpdateStatus}
              onOpenChatWithUser={onOpenChatWithUser}
              currentUserId={currentUserId}
            />
          ))
        )}
      </div>

      <RaiseTicketModal
        isOpen={isRaiseModalOpen}
        onClose={() => setIsRaiseModalOpen(false)}
        devices={devices}
        currentUserId={currentUserId}
        onTicketCreated={onRefresh}
      />
    </div>
  );
};
