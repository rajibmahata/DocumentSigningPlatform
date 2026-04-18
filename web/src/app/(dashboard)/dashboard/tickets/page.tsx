'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/providers/auth-provider';
import { ticketsApi } from '@/lib/api';
import type {
  TicketSummary, TicketType, TicketStatus,
  CreateTicketRequest,
} from '@/types';
import { Plus, MessageSquare, Tag, Clock, ChevronRight, X } from 'lucide-react';
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

const TYPE_LABELS: Record<TicketType, string> = {
  Bug:            '🐛 Bug',
  Feedback:       '💬 Feedback',
  FeatureRequest: '✨ Feature Request',
};

function fmt(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

export default function TicketsPage() {
  const { user } = useAuth();
  const [tickets, setTickets]   = useState<TicketSummary[]>([]);
  const [loading, setLoading]   = useState(true);
  const [showModal, setShowModal] = useState(false);

  const [form, setForm] = useState<CreateTicketRequest>({
    title: '', description: '', type: 'Feedback',
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!user) return;
    ticketsApi.getMy()
      .then(r => setTickets(r.data))
      .catch(() => toast.error('Failed to load tickets.'))
      .finally(() => setLoading(false));
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.description.trim()) {
      toast.error('Title and description are required.');
      return;
    }
    setSubmitting(true);
    try {
      const { data } = await ticketsApi.create(form);
      setTickets(prev => [{
        id: data.id,
        userName: data.userName,
        userEmail: data.userEmail,
        title: data.title,
        type: data.type,
        status: data.status,
        priority: data.priority,
        messageCount: data.messages.length,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
      }, ...prev]);
      setShowModal(false);
      setForm({ title: '', description: '', type: 'Feedback' });
      toast.success('Ticket created!');
    } catch {
      toast.error('Failed to create ticket.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Feedback &amp; Support</h1>
          <p className="text-sm text-gray-500 mt-1">Report issues, share feedback, or request features.</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          New Ticket
        </button>
      </div>

      {/* Ticket list */}
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-600 border-t-transparent" />
        </div>
      ) : tickets.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-200 py-16 text-center">
          <MessageSquare className="mx-auto h-10 w-10 text-gray-300 mb-3" />
          <p className="text-gray-500 font-medium">No tickets yet</p>
          <p className="text-sm text-gray-400 mt-1">Click "New Ticket" to submit your first report.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {tickets.map(t => (
            <Link
              key={t.id}
              href={`/dashboard/tickets/${t.id}`}
              className="flex items-center gap-4 rounded-2xl border border-gray-200 bg-white px-5 py-4 hover:border-brand-300 hover:shadow-sm transition-all group"
            >
              {/* Type badge */}
              <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${TYPE_COLORS[t.type]}`}>
                {TYPE_LABELS[t.type]}
              </span>

              {/* Title */}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 truncate">{t.title}</p>
                <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-400">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {fmt(t.createdAt)}
                  </span>
                  <span className="flex items-center gap-1">
                    <MessageSquare className="h-3 w-3" />
                    {t.messageCount} {t.messageCount === 1 ? 'message' : 'messages'}
                  </span>
                </div>
              </div>

              {/* Status */}
              <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_COLORS[t.status]}`}>
                {t.status}
              </span>

              <ChevronRight className="h-4 w-4 text-gray-300 group-hover:text-brand-500 transition-colors shrink-0" />
            </Link>
          ))}
        </div>
      )}

      {/* Create Ticket Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl">
            {/* Modal header */}
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
              <h2 className="text-lg font-semibold text-gray-900">New Ticket</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal body */}
            <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                <select
                  value={form.type}
                  onChange={e => setForm(f => ({ ...f, type: e.target.value as TicketType }))}
                  className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  <option value="Bug">🐛 Bug Report</option>
                  <option value="Feedback">💬 Feedback</option>
                  <option value="FeatureRequest">✨ Feature Request</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="Brief summary of the issue"
                  maxLength={200}
                  className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Describe the issue in detail..."
                  rows={4}
                  className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-xl bg-brand-600 px-5 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
                >
                  {submitting ? 'Submitting…' : 'Submit Ticket'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
