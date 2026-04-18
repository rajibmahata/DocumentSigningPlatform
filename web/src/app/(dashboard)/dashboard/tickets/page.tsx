'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/providers/auth-provider';
import { ticketsApi } from '@/lib/api';
import type {
  TicketSummary, TicketType, TicketStatus,
  CreateTicketRequest,
} from '@/types';
import { Plus, MessageSquare, Clock, ChevronRight, X, Paperclip } from 'lucide-react';
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
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowed.includes(file.type)) {
      toast.error('Only JPEG, PNG, GIF, or WebP images are allowed.');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Image must be smaller than 2 MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = ev => {
      const dataUrl = ev.target?.result as string;
      // strip the data:image/...;base64, prefix
      const base64 = dataUrl.split(',')[1];
      setImagePreview(dataUrl);
      setForm(f => ({ ...f, attachmentBase64: base64, attachmentContentType: file.type }));
    };
    reader.readAsDataURL(file);
  }

  function clearImage() {
    setImagePreview(null);
    setForm(f => ({ ...f, attachmentBase64: undefined, attachmentContentType: undefined }));
  }

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
      const { data } = await ticketsApi.create(form).catch((err) => {
        const msg = err?.response?.data?.message
          ?? err?.response?.data
          ?? 'Failed to create ticket.';
        throw new Error(typeof msg === 'string' ? msg : JSON.stringify(msg));
      });
      setTickets(prev => [{
        id: data.id,
        userName: data.userName,
        userEmail: data.userEmail,
        title: data.title,
        type: data.type,
        status: data.status,
        priority: data.priority,
        messageCount: data.messages.length,
        hasAttachment: !!data.attachmentBase64,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
      }, ...prev]);
      setShowModal(false);
      setForm({ title: '', description: '', type: 'Feedback' });
      setImagePreview(null);
      toast.success('Ticket created!');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to create ticket.');
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
                  {t.hasAttachment && (
                    <span className="flex items-center gap-0.5 text-brand-500" title="Has attachment">
                      <Paperclip className="h-3 w-3" />
                    </span>
                  )}
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl flex flex-col max-h-full">
            {/* Modal header */}
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
              <h2 className="text-lg font-semibold text-gray-900">New Ticket</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal body */}
            <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4 overflow-y-auto">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                <select
                  value={form.type}
                  onChange={e => {
                    const t = e.target.value as TicketType;
                    setForm(f => ({ ...f, type: t }));
                    // clear attachment when switching to Feedback
                    if (t === 'Feedback') clearImage();
                  }}
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

              {/* Attachment — only for Bug / FeatureRequest */}
              {(form.type === 'Bug' || form.type === 'FeatureRequest') && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Screenshot / Image
                    <span className="ml-1 text-xs font-normal text-gray-400">(optional, max 2 MB)</span>
                  </label>
                  {imagePreview ? (
                    <div className="relative inline-block">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={imagePreview}
                        alt="Attachment preview"
                        className="max-h-36 max-w-full rounded-xl border border-gray-200 object-contain"
                      />
                      <button
                        type="button"
                        onClick={clearImage}
                        className="absolute -top-2 -right-2 rounded-full bg-red-500 p-0.5 text-white hover:bg-red-600"
                        title="Remove image"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ) : (
                    /* Use <label> instead of programmatic .click() for better browser compatibility */
                    <label className="flex items-center gap-2 rounded-xl border border-dashed border-gray-300 px-4 py-3 text-sm text-gray-500 hover:border-brand-400 hover:text-brand-600 transition-colors w-full justify-center cursor-pointer">
                      <Paperclip className="h-4 w-4" />
                      Attach a screenshot
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/gif,image/webp"
                        className="hidden"
                        onChange={handleImageChange}
                      />
                    </label>
                  )}
                </div>
              )}

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
