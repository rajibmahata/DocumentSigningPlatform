'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/providers/auth-provider';
import { ticketsApi } from '@/lib/api';
import type {
  TicketResponse, TicketMessageResponse,
  TicketStatus, TicketPriority,
} from '@/types';
import {
  ArrowLeft, Send, AlertCircle, Tag, Clock,
  CheckCircle2, RefreshCw, XCircle, Loader2, Radio,
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

const POLL_INTERVAL_MS = 5_000;

const STATUS_CONFIG: Record<TicketStatus, { label: string; color: string; Icon: React.ElementType }> = {
  Open:       { label: 'Open',        color: 'bg-amber-100 text-amber-700',  Icon: AlertCircle   },
  InProgress: { label: 'In Progress', color: 'bg-blue-100  text-blue-700',   Icon: RefreshCw     },
  Resolved:   { label: 'Resolved',    color: 'bg-green-100 text-green-700',  Icon: CheckCircle2  },
  Closed:     { label: 'Closed',      color: 'bg-gray-100  text-gray-600',   Icon: XCircle       },
};

const PRIORITY_COLOR: Record<string, string> = {
  Low:    'bg-gray-100  text-gray-600',
  Medium: 'bg-yellow-100 text-yellow-700',
  High:   'bg-red-100   text-red-700',
};

function fmt(dateStr: string) {
  return new Date(dateStr).toLocaleString('en-GB', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
  });
}

export default function TicketDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router  = useRouter();
  const { user } = useAuth();
  const isAdmin = user?.accessRole === 'Admin';

  const [ticket, setTicket]   = useState<TicketResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [msgText, setMsgText] = useState('');
  const [sending, setSending] = useState(false);
  const [liveActive, setLiveActive] = useState(false);

  // Admin controls
  const [editStatus,   setEditStatus]   = useState<TicketStatus>('Open');
  const [editPriority, setEditPriority] = useState<TicketPriority | ''>('');
  const [savingStatus, setSavingStatus] = useState(false);

  const bottomRef   = useRef<HTMLDivElement>(null);
  const isSending   = useRef(false); // block poll updates while user submits

  // Merge helper — only update state when something actually changed
  const mergeTicket = useCallback((fresh: TicketResponse) => {
    setTicket(prev => {
      if (!prev) return fresh;
      const hasNewMessages  = fresh.messages.length > prev.messages.length;
      const statusChanged   = fresh.status !== prev.status;
      const priorityChanged = fresh.priority !== prev.priority;
      if (hasNewMessages || statusChanged || priorityChanged) {
        // keep admin form in sync with server status
        if (statusChanged)   setEditStatus(fresh.status);
        if (priorityChanged) setEditPriority(fresh.priority ?? '');
        return fresh;
      }
      return prev;
    });
  }, []);

  useEffect(() => {
    if (!id) return;
    ticketsApi.getById(id)
      .then(r => {
        setTicket(r.data);
        setEditStatus(r.data.status);
        setEditPriority(r.data.priority ?? '');
      })
      .catch(() => toast.error('Ticket not found.'))
      .finally(() => setLoading(false));
  }, [id]);

  // Live polling — silently re-fetch every POLL_INTERVAL_MS
  useEffect(() => {
    if (!id) return;
    const timer = setInterval(async () => {
      if (isSending.current) return; // skip during send/save
      try {
        const { data } = await ticketsApi.getById(id);
        mergeTicket(data);
        setLiveActive(true);
        setTimeout(() => setLiveActive(false), 800); // brief pulse
      } catch {
        // ignore transient poll errors silently
      }
    }, POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [id, mergeTicket]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [ticket?.messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!msgText.trim() || !id) return;
    setSending(true);
    isSending.current = true;
    try {
      const { data } = await ticketsApi.addMessage(id, { message: msgText.trim() });
      setTicket(prev => prev ? { ...prev, messages: [...prev.messages, data] } : prev);
      setMsgText('');
    } catch {
      toast.error('Failed to send message.');
    } finally {
      setSending(false);
      isSending.current = false;
    }
  };

  const handleStatusSave = async () => {
    if (!id) return;
    setSavingStatus(true);
    isSending.current = true;
    try {
      await ticketsApi.adminUpdateStatus(id, {
        status:   editStatus,
        priority: editPriority || undefined,
      });
      setTicket(prev => prev ? { ...prev, status: editStatus, priority: editPriority || undefined } : prev);
      toast.success('Ticket updated.');
    } catch {
      toast.error('Failed to update ticket.');
    } finally {
      setSavingStatus(false);
      isSending.current = false;
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-600 border-t-transparent" />
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="text-center py-24 text-gray-500">
        Ticket not found.{' '}
        <Link href="/dashboard/tickets" className="text-brand-600 hover:underline">Go back</Link>
      </div>
    );
  }

  const { label: statusLabel, color: statusColor, Icon: StatusIcon } = STATUS_CONFIG[ticket.status];

  return (
    <div className="max-w-3xl mx-auto">
      {/* Back link */}
      <Link
        href="/dashboard/tickets"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-brand-700 mb-5 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Tickets
      </Link>

      {/* Ticket header */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 mb-4">
        <div className="flex flex-wrap items-start gap-3 mb-3">
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusColor} flex items-center gap-1`}>
            <StatusIcon className="h-3 w-3" />
            {statusLabel}
          </span>
          <span className="rounded-full bg-gray-100 text-gray-600 px-2.5 py-0.5 text-xs font-semibold">
            {ticket.type === 'FeatureRequest' ? 'Feature Request' : ticket.type}
          </span>
          {ticket.priority && (
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${PRIORITY_COLOR[ticket.priority] ?? ''}`}>
              {ticket.priority} Priority
            </span>
          )}
        </div>

        <h1 className="text-xl font-bold text-gray-900 mb-2">{ticket.title}</h1>
        <p className="text-gray-600 text-sm whitespace-pre-wrap">{ticket.description}</p>

        <div className="flex items-center gap-4 mt-4 text-xs text-gray-400">
          <span className="flex items-center gap-1">
            <Tag className="h-3 w-3" />
            {ticket.userName} ({ticket.userEmail})
          </span>
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {fmt(ticket.createdAt)}
          </span>
        </div>

        {/* Admin controls */}
        {isAdmin && (
          <div className="mt-5 pt-4 border-t border-gray-100">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Admin Actions</p>
            <div className="flex flex-wrap gap-3 items-end">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Status</label>
                <select
                  value={editStatus}
                  onChange={e => setEditStatus(e.target.value as TicketStatus)}
                  className="rounded-xl border border-gray-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  <option value="Open">Open</option>
                  <option value="InProgress">In Progress</option>
                  <option value="Resolved">Resolved</option>
                  <option value="Closed">Closed</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Priority</label>
                <select
                  value={editPriority}
                  onChange={e => setEditPriority(e.target.value as TicketPriority | '')}
                  className="rounded-xl border border-gray-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  <option value="">— none —</option>
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                </select>
              </div>
              <button
                onClick={handleStatusSave}
                disabled={savingStatus}
                className="rounded-xl bg-brand-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60 flex items-center gap-1.5"
              >
                {savingStatus ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                Save
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Chat messages */}
      <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
        <div className="border-b border-gray-100 px-5 py-3 flex items-center justify-between">
          <p className="text-sm font-semibold text-gray-700">Messages</p>
          <span className="flex items-center gap-1.5 text-[11px] text-gray-400">
            <Radio className={`h-3 w-3 transition-colors ${liveActive ? 'text-green-500' : 'text-gray-300'}`} />
            Live
          </span>
        </div>

        <div className="px-5 py-4 space-y-4 min-h-[200px] max-h-[400px] overflow-y-auto">
          {ticket.messages.length === 0 && (
            <p className="text-center text-sm text-gray-400 py-8">No messages yet. Start the conversation below.</p>
          )}
          {ticket.messages.map((msg: TicketMessageResponse) => (
            <MessageBubble key={msg.id} msg={msg} userName={ticket.userName} viewerIsAdmin={isAdmin} />
          ))}
          <div ref={bottomRef} />
        </div>

        {/* Reply box */}
        {ticket.status !== 'Closed' ? (
          <form onSubmit={handleSend} className="border-t border-gray-100 px-5 py-3 flex gap-3 items-end">
            <textarea
              value={msgText}
              onChange={e => setMsgText(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(e); }
              }}
              placeholder="Type a message… (Enter to send, Shift+Enter for new line)"
              rows={2}
              className="flex-1 rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
            />
            <button
              type="submit"
              disabled={sending || !msgText.trim()}
              className="rounded-xl bg-brand-600 p-2.5 text-white hover:bg-brand-700 disabled:opacity-50 shrink-0"
            >
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </button>
          </form>
        ) : (
          <div className="border-t border-gray-100 px-5 py-3 text-center text-sm text-gray-400">
            This ticket is closed. Open a new ticket if you need further help.
          </div>
        )}
      </div>
    </div>
  );
}

function MessageBubble({ msg, userName, viewerIsAdmin }: {
  msg: TicketMessageResponse;
  userName: string;
  viewerIsAdmin: boolean;
}) {
  const isAdmin = msg.senderType === 'Admin';
  const senderLabel = isAdmin ? '⚙ Support Team' : viewerIsAdmin ? `👤 ${userName}` : '👤 You';
  return (
    <div className={`flex ${isAdmin ? 'justify-start' : 'justify-end'}`}>
      <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${
        isAdmin
          ? 'bg-gray-100 text-gray-800 rounded-tl-none'
          : 'bg-brand-600 text-white rounded-tr-none'
      }`}>
        <div className={`text-[10px] font-semibold mb-1 ${isAdmin ? 'text-gray-400' : 'text-brand-200'}`}>
          {senderLabel}
        </div>
        <p className="whitespace-pre-wrap">{msg.message}</p>
        <div className={`text-[10px] mt-1 text-right ${isAdmin ? 'text-gray-400' : 'text-brand-200'}`}>
          {new Date(msg.createdAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>
    </div>
  );
}
