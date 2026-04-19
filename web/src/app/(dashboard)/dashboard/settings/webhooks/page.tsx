'use client';

import { useState } from 'react';
import { useAuth } from '@/providers/auth-provider';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { merchantApi, webhookApi } from '@/lib/api';
import { WEBHOOK_EVENTS } from '@/types';
import type {
  WebhookResponse,
  WebhookDeliveryResponse,
  WebhookDeliveryPagedResult,
} from '@/types';
import { toast } from 'sonner';
import {
  Globe,
  Trash2,
  Copy,
  ChevronDown,
  ChevronRight,
  Plus,
  CheckCircle,
  XCircle,
  Clock,
  Loader2,
} from 'lucide-react';

// ── Delivery status badge ─────────────────────────────────────────────────────

function StatusBadge({ status }: { status: WebhookDeliveryResponse['status'] }) {
  const map: Record<WebhookDeliveryResponse['status'], { label: string; className: string; icon: React.ReactNode }> = {
    Success:    { label: 'Success',    className: 'bg-green-100 text-green-800',  icon: <CheckCircle className="h-3 w-3" /> },
    Failed:     { label: 'Failed',     className: 'bg-red-100 text-red-800',      icon: <XCircle className="h-3 w-3" /> },
    Pending:    { label: 'Pending',    className: 'bg-yellow-100 text-yellow-800', icon: <Clock className="h-3 w-3" /> },
    Processing: { label: 'Processing', className: 'bg-blue-100 text-blue-800',    icon: <Loader2 className="h-3 w-3 animate-spin" /> },
  };
  const { label, className, icon } = map[status] ?? { label: status, className: 'bg-gray-100 text-gray-700', icon: null };
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${className}`}>
      {icon}{label}
    </span>
  );
}

// ── Event badge ───────────────────────────────────────────────────────────────

function EventBadge({ event }: { event: string }) {
  return (
    <span className="inline-flex rounded bg-gray-100 px-2 py-0.5 text-xs font-mono text-gray-700">
      {event}
    </span>
  );
}

// ── Delivery history panel ────────────────────────────────────────────────────

function DeliveryHistory({ webhookId }: { webhookId: string }) {
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery<WebhookDeliveryPagedResult>({
    queryKey: ['webhook-deliveries', webhookId, page],
    queryFn: () => webhookApi.getDeliveries(webhookId, page, 10).then((r) => r.data),
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-4">
        <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!data || data.items.length === 0) {
    return <p className="py-4 text-center text-sm text-gray-400">No deliveries yet.</p>;
  }

  return (
    <div className="space-y-2">
      <div className="overflow-x-auto rounded border border-gray-100">
        <table className="min-w-full divide-y divide-gray-100 text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2 text-left font-medium text-gray-500">Event</th>
              <th className="px-3 py-2 text-left font-medium text-gray-500">Status</th>
              <th className="px-3 py-2 text-left font-medium text-gray-500">Retries</th>
              <th className="px-3 py-2 text-left font-medium text-gray-500">Last Attempt</th>
              <th className="px-3 py-2 text-left font-medium text-gray-500">Response</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {data.items.map((d) => (
              <tr key={d.id}>
                <td className="px-3 py-2">
                  <EventBadge event={d.eventName} />
                </td>
                <td className="px-3 py-2">
                  <StatusBadge status={d.status} />
                </td>
                <td className="px-3 py-2 text-gray-600">{d.retryCount}</td>
                <td className="px-3 py-2 text-gray-500">
                  {d.lastAttempt ? new Date(d.lastAttempt).toLocaleString() : '—'}
                </td>
                <td className="px-3 py-2 max-w-xs truncate text-gray-500">
                  {d.response ?? '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {data.totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-gray-500">
          <span>
            Page {data.page} / {data.totalPages} ({data.totalCount} total)
          </span>
          <div className="flex gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="rounded border px-3 py-1 disabled:opacity-40"
            >
              Previous
            </button>
            <button
              disabled={page >= data.totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="rounded border px-3 py-1 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Webhook card ──────────────────────────────────────────────────────────────

function WebhookCard({
  webhook,
  onDelete,
  newSecret,
}: {
  webhook: WebhookResponse;
  onDelete: (id: string) => void;
  newSecret?: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied]     = useState(false);

  const secret = newSecret ?? webhook.secret;

  const handleCopy = () => {
    navigator.clipboard.writeText(secret).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
      {/* Header */}
      <div className="flex items-start justify-between p-4">
        <div className="flex items-start gap-3">
          <Globe className="mt-0.5 h-5 w-5 shrink-0 text-gray-400" />
          <div>
            <p className="break-all font-medium text-gray-900">{webhook.url}</p>
            <p className="mt-0.5 text-xs text-gray-400">
              Created {new Date(webhook.createdAt).toLocaleDateString()}
            </p>
            <div className="mt-2 flex flex-wrap gap-1">
              {webhook.events.map((e) => (
                <EventBadge key={e} event={e} />
              ))}
            </div>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2 ml-4">
          <button
            onClick={() => setExpanded((v) => !v)}
            className="flex items-center gap-1 rounded px-2 py-1 text-xs text-gray-500 hover:bg-gray-100"
          >
            {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            Deliveries
          </button>
          <button
            onClick={() => onDelete(webhook.id)}
            className="rounded p-1 text-red-400 hover:bg-red-50 hover:text-red-600"
            title="Delete webhook"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Secret — only shown when newSecret present (just created) */}
      {newSecret && (
        <div className="mx-4 mb-4 rounded-md bg-yellow-50 border border-yellow-200 p-3">
          <p className="mb-1 text-xs font-semibold text-yellow-800">
            Save this secret — it will not be shown again
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 break-all rounded bg-yellow-100 px-2 py-1 text-xs text-yellow-900">
              {secret}
            </code>
            <button
              onClick={handleCopy}
              className="rounded p-1 text-yellow-700 hover:bg-yellow-100"
              title="Copy secret"
            >
              {copied ? <CheckCircle className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
            </button>
          </div>
        </div>
      )}

      {/* Delivery history */}
      {expanded && (
        <div className="border-t border-gray-100 px-4 pb-4 pt-3">
          <DeliveryHistory webhookId={webhook.id} />
        </div>
      )}
    </div>
  );
}

// ── Create webhook form ───────────────────────────────────────────────────────

function CreateWebhookForm({
  merchantId,
  onCreated,
}: {
  merchantId: string;
  onCreated: (webhook: WebhookResponse) => void;
}) {
  const [url, setUrl]           = useState('');
  const [events, setEvents]     = useState<string[]>([]);
  const [urlError, setUrlError] = useState('');
  const queryClient             = useQueryClient();

  const mutation = useMutation({
    mutationFn: () => webhookApi.create({ merchantId, url, events }).then((r) => r.data),
    onSuccess: (webhook) => {
      queryClient.invalidateQueries({ queryKey: ['webhooks', merchantId] });
      toast.success('Webhook registered');
      setUrl('');
      setEvents([]);
      setUrlError('');
      onCreated(webhook);
    },
    onError: () => toast.error('Failed to create webhook'),
  });

  const toggleEvent = (e: string) =>
    setEvents((prev) => (prev.includes(e) ? prev.filter((x) => x !== e) : [...prev, e]));

  const handleSubmit = (ev: React.FormEvent) => {
    ev.preventDefault();

    try {
      const parsed = new URL(url);
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        setUrlError('URL must start with http:// or https://');
        return;
      }
    } catch {
      setUrlError('Please enter a valid URL');
      return;
    }

    if (events.length === 0) {
      toast.error('Select at least one event');
      return;
    }

    setUrlError('');
    mutation.mutate();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border border-dashed border-gray-300 bg-gray-50 p-4">
      <h3 className="text-sm font-semibold text-gray-700">New Webhook</h3>

      {/* URL */}
      <div>
        <label className="mb-1 block text-xs font-medium text-gray-600">
          Endpoint URL
        </label>
        <input
          type="url"
          value={url}
          onChange={(e) => { setUrl(e.target.value); setUrlError(''); }}
          placeholder="https://example.com/webhooks"
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          required
        />
        {urlError && <p className="mt-1 text-xs text-red-500">{urlError}</p>}
      </div>

      {/* Events */}
      <div>
        <label className="mb-1 block text-xs font-medium text-gray-600">Events</label>
        <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 sm:grid-cols-3">
          {WEBHOOK_EVENTS.map((e) => (
            <label key={e} className="flex cursor-pointer items-center gap-2 text-xs text-gray-700">
              <input
                type="checkbox"
                checked={events.includes(e)}
                onChange={() => toggleEvent(e)}
                className="h-3.5 w-3.5 rounded border-gray-300 text-blue-600"
              />
              <span className="font-mono">{e}</span>
            </label>
          ))}
        </div>
      </div>

      <button
        type="submit"
        disabled={mutation.isPending || !url || events.length === 0}
        className="flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {mutation.isPending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Plus className="h-4 w-4" />
        )}
        Register Webhook
      </button>
    </form>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function WebhooksPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Map of newly-created webhook id → secret (secrets only visible once)
  const [newSecrets, setNewSecrets] = useState<Record<string, string>>({});

  const { data: merchants, isLoading: merchantsLoading } = useQuery({
    queryKey: ['merchants', user?.id],
    queryFn: () => merchantApi.getByUser(user!.id).then((r) => r.data),
    enabled: !!user,
  });

  const merchant = merchants?.[0];

  const { data: webhooks, isLoading: webhooksLoading } = useQuery<WebhookResponse[]>({
    queryKey: ['webhooks', merchant?.id],
    queryFn: () => webhookApi.getByMerchant(merchant!.id).then((r) => r.data),
    enabled: !!merchant,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => webhookApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['webhooks', merchant?.id] });
      toast.success('Webhook deleted');
    },
    onError: () => toast.error('Failed to delete webhook'),
  });

  const handleDelete = (id: string) => {
    if (!confirm('Delete this webhook? All delivery history will also be removed.')) return;
    deleteMutation.mutate(id);
    setNewSecrets((s) => { const c = { ...s }; delete c[id]; return c; });
  };

  const handleCreated = (webhook: WebhookResponse) => {
    setNewSecrets((s) => ({ ...s, [webhook.id]: webhook.secret }));
  };

  if (merchantsLoading || webhooksLoading) {
    return (
      <div className="flex justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  if (!merchant) {
    return (
      <div className="py-16 text-center text-gray-400">
        No merchant account found. Please set up your merchant account first.
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-6 max-w-3xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Webhooks</h1>
        <p className="mt-1 text-sm text-gray-500">
          Receive real-time HTTP POST notifications when events occur in your account.
          Each request is signed with <code className="text-xs">X-DocSigner-Signature</code> (HMAC-SHA256).
        </p>
      </div>

      {/* Create form */}
      <CreateWebhookForm merchantId={merchant.id} onCreated={handleCreated} />

      {/* Webhook list */}
      {!webhooks || webhooks.length === 0 ? (
        <div className="rounded-lg border border-gray-100 bg-white py-12 text-center text-sm text-gray-400">
          No webhooks registered yet.
        </div>
      ) : (
        <div className="space-y-4">
          {webhooks.map((w) => (
            <WebhookCard
              key={w.id}
              webhook={w}
              onDelete={handleDelete}
              newSecret={newSecrets[w.id]}
            />
          ))}
        </div>
      )}
    </div>
  );
}
