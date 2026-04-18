'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/providers/auth-provider';
import { ticketsApi } from '@/lib/api';
import type { TicketSummary, TicketStatus, TicketType } from '@/types';
import { MessageSquare, Clock, ChevronRight, Filter } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

const TYPE_COLORS: Record<TicketType, string> = {
  Bug:            'bg-red-100    text-red-700',
  Feedback:       'bg-blue-100   text-blue-700',
  FeatureRequest: 'bg-purple-100 text-purple-700',
};

const STATUS_COLORS: Record<TicketStatus, string> = {
  Open:       'bg-amber-100  text-amber-700',
  InProgress: 'bg-blue-100   text-blue-700',
  Resolved:   'bg-green-100  text-green-700',
  Closed:     'bg-gray-100   text-gray-600',
};

const PRIORITY_COLORS: Record<string, string> = {
  Low:    'bg-gray-100  text-gray-600',
  Medium: 'bg-yellow-100 text-yellow-700',
  High:   'bg-red-100   text-red-700',
};

function fmt(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

export default function AdminTicketsPage() {
  const { user } = useAuth();
  const [tickets, setTickets]       = useState<TicketSummary[]>([]);
  const [loading, setLoading]       = useState(true);
  const [filterStatus, setFilterStatus] = useState<TicketStatus | 'All'>('All');
  const [filterType,   setFilterType]   = useState<TicketType | 'All'>('All');

  useEffect(() => {
    if (user?.accessRole !== 'Admin') return;
    ticketsApi.adminGetAll()
      .then(r => setTickets(r.data))
      .catch(() => toast.error('Failed to load tickets.'))
      .finally(() => setLoading(false));
  }, [user]);

  const filtered = tickets.filter(t => {
    if (filterStatus !== 'All' && t.status !== filterStatus) return false;
    if (filterType   !== 'All' && t.type   !== filterType)   return false;
    return true;
  });

  const counts: Record<TicketStatus | 'All', number> = {
    All:        tickets.length,
    Open:       tickets.filter(t => t.status === 'Open').length,
    InProgress: tickets.filter(t => t.status === 'InProgress').length,
    Resolved:   tickets.filter(t => t.status === 'Resolved').length,
    Closed:     tickets.filter(t => t.status === 'Closed').length,
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Support Tickets</h1>
        <p className="text-sm text-gray-500 mt-1">Review and respond to user feedback &amp; issues.</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {(['All', 'Open', 'InProgress', 'Resolved'] as const).map(s => (
          <button
            key={s}
            onClick={() => setFilterStatus(s)}
            className={`rounded-2xl border px-4 py-3 text-left transition-all ${
              filterStatus === s
                ? 'border-brand-500 bg-brand-50 text-brand-700'
                : 'border-gray-200 bg-white hover:border-gray-300'
            }`}
          >
            <p className="text-2xl font-bold">{counts[s]}</p>
            <p className="text-xs text-gray-500 mt-0.5">{s === 'All' ? 'Total' : s === 'InProgress' ? 'In Progress' : s}</p>
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-5 items-center">
        <Filter className="h-4 w-4 text-gray-400" />
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value as TicketStatus | 'All')}
          className="rounded-xl border border-gray-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        >
          <option value="All">All Statuses</option>
          <option value="Open">Open</option>
          <option value="InProgress">In Progress</option>
          <option value="Resolved">Resolved</option>
          <option value="Closed">Closed</option>
        </select>
        <select
          value={filterType}
          onChange={e => setFilterType(e.target.value as TicketType | 'All')}
          className="rounded-xl border border-gray-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        >
          <option value="All">All Types</option>
          <option value="Bug">Bug</option>
          <option value="Feedback">Feedback</option>
          <option value="FeatureRequest">Feature Request</option>
        </select>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-600 border-t-transparent" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-200 py-16 text-center">
          <MessageSquare className="mx-auto h-10 w-10 text-gray-300 mb-3" />
          <p className="text-gray-500 font-medium">No tickets found</p>
        </div>
      ) : (
        <div className="rounded-2xl border border-gray-200 overflow-hidden bg-white">
          {/* Table header */}
          <div className="hidden sm:grid grid-cols-[1fr_150px_110px_90px_90px_36px] gap-4 px-5 py-3 bg-gray-50 border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase tracking-wider">
            <span>Ticket</span>
            <span>User</span>
            <span>Type</span>
            <span>Priority</span>
            <span>Status</span>
            <span />
          </div>

          <div className="divide-y divide-gray-100">
            {filtered.map(t => (
              <Link
                key={t.id}
                href={`/dashboard/tickets/${t.id}`}
                className="grid sm:grid-cols-[1fr_150px_110px_90px_90px_36px] gap-4 px-5 py-4 hover:bg-gray-50 transition-colors group items-center"
              >
                {/* Title + date */}
                <div className="min-w-0">
                  <p className="font-medium text-gray-900 truncate">{t.title}</p>
                  <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-400">
                    <Clock className="h-3 w-3" />
                    {fmt(t.createdAt)}
                    <MessageSquare className="h-3 w-3 ml-1" />
                    {t.messageCount}
                  </div>
                </div>

                {/* User */}
                <div className="min-w-0 hidden sm:block">
                  <p className="text-sm text-gray-700 truncate">{t.userName}</p>
                  <p className="text-xs text-gray-400 truncate">{t.userEmail}</p>
                </div>

                {/* Type */}
                <div className="hidden sm:block">
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${TYPE_COLORS[t.type]}`}>
                    {t.type === 'FeatureRequest' ? 'Feature' : t.type}
                  </span>
                </div>

                {/* Priority */}
                <div className="hidden sm:block">
                  {t.priority ? (
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${PRIORITY_COLORS[t.priority]}`}>
                      {t.priority}
                    </span>
                  ) : (
                    <span className="text-xs text-gray-300">—</span>
                  )}
                </div>

                {/* Status */}
                <div>
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_COLORS[t.status]}`}>
                    {t.status === 'InProgress' ? 'In Progress' : t.status}
                  </span>
                </div>

                <ChevronRight className="h-4 w-4 text-gray-300 group-hover:text-brand-500 transition-colors hidden sm:block" />
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
