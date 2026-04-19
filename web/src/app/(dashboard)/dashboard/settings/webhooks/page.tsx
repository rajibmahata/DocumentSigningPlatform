'use client';

import { useState } from 'react';
import { useAuth } from '@/providers/auth-provider';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { merchantApi, webhookApi } from '@/lib/api';
import type { WebhookTestResult } from '@/lib/api';
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
  Info,
  Zap,
  BookOpen,
  Shield,
  Code2,
  Activity,
  X,
} from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const EVENT_META: Record<string, { description: string; samplePayload: object }> = {
  'envelope.processing': {
    description: 'Fired when an envelope is accepted and preparing to send invitation emails.',
    samplePayload: { event: 'envelope.processing', timestamp: '2026-04-19T12:00:00Z', data: { envelopeId: 'uuid', title: 'Contract Agreement', status: 'Processing' } },
  },
  'envelope.sent': {
    description: 'Fired when invitation emails have been dispatched to all signers.',
    samplePayload: { event: 'envelope.sent', timestamp: '2026-04-19T12:01:00Z', data: { envelopeId: 'uuid', title: 'Contract Agreement', recipientCount: 2 } },
  },
  'envelope.signed': {
    description: 'Fired each time one signer completes their signature.',
    samplePayload: { event: 'envelope.signed', timestamp: '2026-04-19T12:10:00Z', data: { envelopeId: 'uuid', signedBy: { name: 'Alice Smith', email: 'alice@example.com' } } },
  },
  'envelope.completed': {
    description: 'Fired when every required signer has signed — the envelope is fully complete.',
    samplePayload: { event: 'envelope.completed', timestamp: '2026-04-19T12:30:00Z', data: { envelopeId: 'uuid', title: 'Contract Agreement', completedAt: '2026-04-19T12:30:00Z' } },
  },
  'envelope.failed': {
    description: 'Fired on an internal system error during envelope processing.',
    samplePayload: { event: 'envelope.failed', timestamp: '2026-04-19T12:02:00Z', data: { envelopeId: 'uuid', error: 'PDF rendering failed' } },
  },
  'envelope.expired': {
    description: 'Fired when the signing deadline has passed without completion.',
    samplePayload: { event: 'envelope.expired', timestamp: '2026-04-26T00:00:00Z', data: { envelopeId: 'uuid', title: 'Contract Agreement' } },
  },
  'envelope.rejected': {
    description: 'Fired when a signer explicitly rejects the document.',
    samplePayload: { event: 'envelope.rejected', timestamp: '2026-04-19T12:15:00Z', data: { envelopeId: 'uuid', rejectedBy: { name: 'Bob Jones', email: 'bob@example.com' }, reason: 'Terms not agreed' } },
  },
  'envelope.cancelled': {
    description: 'Fired when the sender cancels the envelope before completion.',
    samplePayload: { event: 'envelope.cancelled', timestamp: '2026-04-19T12:05:00Z', data: { envelopeId: 'uuid', cancelledBy: 'sender@example.com' } },
  },
  'ticket.created': {
    description: 'Fired when a new support ticket is opened.',
    samplePayload: { event: 'ticket.created', timestamp: '2026-04-19T14:00:00Z', data: { ticketId: 'uuid', subject: 'Signing issue', createdBy: { name: 'Alice Smith', email: 'alice@example.com' } } },
  },
  'ticket.replied': {
    description: 'Fired when a message is added to an existing support ticket.',
    samplePayload: { event: 'ticket.replied', timestamp: '2026-04-19T14:30:00Z', data: { ticketId: 'uuid', replyBy: { name: 'Support Agent', email: 'support@example.com' }, message: 'Please try again.' } },
  },
};

const CODE_SAMPLES: Record<string, { label: string; code: string }[]> = {
  verify: [
    {
      label: 'Node.js',
      code: `const crypto = require('crypto');
const express = require('express');
const app = express();

// IMPORTANT: use raw body, not parsed JSON
app.post('/webhook', express.raw({ type: 'application/json' }), (req, res) => {
  const sig   = req.headers['x-docsigner-signature'];
  const event = req.headers['x-docsigner-event'];

  const expected = crypto
    .createHmac('sha256', process.env.WEBHOOK_SECRET)
    .update(req.body)           // req.body is a Buffer here
    .digest('hex');

  if (sig !== expected) {
    return res.status(401).send('Signature mismatch');
  }

  const payload = JSON.parse(req.body);
  console.log('Received event:', event, payload.data);
  res.sendStatus(200);
});`,
    },
    {
      label: 'Python',
      code: `import hmac, hashlib, os
from flask import Flask, request, abort

app = Flask(__name__)
SECRET = os.environ['WEBHOOK_SECRET'].encode()

@app.route('/webhook', methods=['POST'])
def webhook():
    sig      = request.headers.get('X-DocSigner-Signature', '')
    expected = hmac.new(SECRET, request.data, hashlib.sha256).hexdigest()

    if not hmac.compare_digest(sig, expected):
        abort(401)

    event   = request.headers.get('X-DocSigner-Event')
    payload = request.json
    print(f'Event: {event}', payload['data'])
    return '', 200`,
    },
    {
      label: 'C#',
      code: `using System.Security.Cryptography;
using System.Text;
using Microsoft.AspNetCore.Mvc;

[HttpPost("webhook")]
public async Task<IActionResult> HandleWebhook()
{
    Request.EnableBuffering();
    using var reader  = new StreamReader(Request.Body, leaveOpen: true);
    var rawBody       = await reader.ReadToEndAsync();
    Request.Body.Position = 0;

    var sig      = Request.Headers["X-DocSigner-Signature"].ToString();
    var secret   = Encoding.UTF8.GetBytes(Environment.GetEnvironmentVariable("WEBHOOK_SECRET")!);
    var payload  = Encoding.UTF8.GetBytes(rawBody);
    var expected = Convert.ToHexString(HMACSHA256.HashData(secret, payload)).ToLowerInvariant();

    if (sig != expected) return Unauthorized();

    var eventName = Request.Headers["X-DocSigner-Event"].ToString();
    using var doc = JsonDocument.Parse(rawBody);
    // handle doc.RootElement ...
    return Ok();
}`,
    },
    {
      label: 'PHP',
      code: `<?php
$secret  = getenv('WEBHOOK_SECRET');
$payload = file_get_contents('php://input');
$sig     = $_SERVER['HTTP_X_DOCSIGNER_SIGNATURE'] ?? '';
$event   = $_SERVER['HTTP_X_DOCSIGNER_EVENT']     ?? '';

$expected = hash_hmac('sha256', $payload, $secret);

if (!hash_equals($expected, $sig)) {
    http_response_code(401);
    exit('Signature mismatch');
}

$data = json_decode($payload, true);
error_log("Received event: $event " . json_encode($data['data']));
http_response_code(200);`,
    },
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// Small reusable components
// ─────────────────────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: WebhookDeliveryResponse['status'] }) {
  const map: Record<WebhookDeliveryResponse['status'], { label: string; className: string; icon: React.ReactNode }> = {
    Success:    { label: 'Success',    className: 'bg-green-100 text-green-800',   icon: <CheckCircle className="h-3 w-3" /> },
    Failed:     { label: 'Failed',     className: 'bg-red-100 text-red-800',       icon: <XCircle className="h-3 w-3" /> },
    Pending:    { label: 'Pending',    className: 'bg-yellow-100 text-yellow-800', icon: <Clock className="h-3 w-3" /> },
    Processing: { label: 'Processing', className: 'bg-blue-100 text-blue-800',     icon: <Loader2 className="h-3 w-3 animate-spin" /> },
  };
  const { label, className, icon } = map[status] ?? { label: status, className: 'bg-gray-100 text-gray-700', icon: null };
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${className}`}>
      {icon}{label}
    </span>
  );
}

function EventBadge({ event }: { event: string }) {
  return (
    <span className="inline-flex rounded bg-gray-100 px-2 py-0.5 text-xs font-mono text-gray-700">
      {event}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Info Panel
// ─────────────────────────────────────────────────────────────────────────────

type InfoTab = 'guide' | 'verify' | 'events';

function InfoPanel() {
  const [open, setOpen]             = useState(false);
  const [tab, setTab]               = useState<InfoTab>('guide');
  const [lang, setLang]             = useState(0);
  const [copied, setCopied]         = useState(false);
  const [expandedEvent, setExpandedEvent] = useState<string | null>(null);

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const tabs: { id: InfoTab; label: string; icon: React.ReactNode }[] = [
    { id: 'guide',  label: 'Setup Guide',             icon: <BookOpen className="h-3.5 w-3.5" /> },
    { id: 'verify', label: 'Signature Verification',  icon: <Shield className="h-3.5 w-3.5" /> },
    { id: 'events', label: 'Events Reference',        icon: <Activity className="h-3.5 w-3.5" /> },
  ];

  return (
    <div className="rounded-lg border border-blue-100 bg-blue-50">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 px-4 py-3 text-sm font-medium text-blue-700 hover:bg-blue-100 rounded-lg"
      >
        <Info className="h-4 w-4 shrink-0" />
        <span className="flex-1 text-left">How to use webhooks</span>
        {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
      </button>

      {open && (
        <div className="border-t border-blue-100 px-4 pb-4 pt-3">
          {/* Tab bar */}
          <div className="mb-4 flex gap-1 rounded-lg bg-white border border-gray-100 p-1">
            {tabs.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  tab === t.id ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {t.icon}{t.label}
              </button>
            ))}
          </div>

          {/* Setup Guide */}
          {tab === 'guide' && (
            <div className="space-y-4 text-sm text-gray-700">
              <ol className="space-y-3 pl-1">
                {[
                  { n: 1, title: 'Register an endpoint', body: 'Fill in the form below with your publicly reachable HTTPS URL and select the events you care about. A unique signing secret is generated — save it immediately.' },
                  { n: 2, title: 'Verify signatures', body: 'Every request arrives with an X-DocSigner-Signature header: an HMAC-SHA256 hex digest of the raw request body using your secret. Always verify it to prevent spoofed events. See the "Signature Verification" tab for code samples.' },
                  { n: 3, title: 'Return 2xx quickly', body: 'Your endpoint must respond within 30 seconds with a 2xx status code. For heavy processing, acknowledge the webhook immediately and handle the event asynchronously in a background job.' },
                  { n: 4, title: 'Handle retries', body: 'If your endpoint returns a 5xx or times out, delivery is retried up to 5 times with exponential back-off: 1 min → 5 min → 15 min → 1 hr → 24 hr. 4xx responses are not retried.' },
                  { n: 5, title: 'Test with the ping button', body: 'Use the "Test" button on any registered webhook to send a live webhook.test ping to your endpoint and confirm it responds correctly before relying on real events.' },
                ].map(({ n, title, body }) => (
                  <li key={n} className="flex gap-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">{n}</span>
                    <div>
                      <p className="font-semibold text-gray-900">{title}</p>
                      <p className="text-gray-600">{body}</p>
                    </div>
                  </li>
                ))}
              </ol>

              <div className="rounded-md bg-amber-50 border border-amber-200 p-3 text-xs text-amber-800">
                <strong>Security tip:</strong> Always verify signatures on your server. Never process events without confirming the HMAC digest matches. Do not store secrets in client-side code.
              </div>

              <div className="rounded-md bg-gray-50 border border-gray-200 p-3">
                <p className="text-xs font-semibold text-gray-700 mb-1">Request headers sent on every delivery:</p>
                <table className="w-full text-xs">
                  <tbody className="divide-y divide-gray-100">
                    {[
                      ['X-DocSigner-Signature', 'HMAC-SHA256 hex digest of the raw body'],
                      ['X-DocSigner-Event',     'Event name e.g. envelope.completed'],
                      ['Content-Type',          'application/json'],
                    ].map(([h, d]) => (
                      <tr key={h}>
                        <td className="py-1 pr-3 font-mono font-medium text-gray-800">{h}</td>
                        <td className="py-1 text-gray-600">{d}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Signature Verification */}
          {tab === 'verify' && (
            <div className="space-y-3">
              <p className="text-sm text-gray-600">
                Pick your language and copy the snippet into your webhook handler. Never skip verification — it prevents spoofed events.
              </p>
              <div className="flex gap-1">
                {CODE_SAMPLES.verify.map((s, i) => (
                  <button
                    key={s.label}
                    onClick={() => { setLang(i); setCopied(false); }}
                    className={`rounded px-3 py-1 text-xs font-medium transition-colors ${
                      lang === i ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>

              <div className="relative rounded-lg bg-gray-900">
                <button
                  onClick={() => copyCode(CODE_SAMPLES.verify[lang].code)}
                  className="absolute right-2 top-2 flex items-center gap-1 rounded bg-gray-700 px-2 py-1 text-xs text-gray-300 hover:bg-gray-600"
                >
                  {copied
                    ? <><CheckCircle className="h-3 w-3 text-green-400" /> Copied</>
                    : <><Copy className="h-3 w-3" /> Copy</>}
                </button>
                <pre className="overflow-x-auto rounded-lg p-4 text-xs text-gray-100 leading-relaxed">
                  <code>{CODE_SAMPLES.verify[lang].code}</code>
                </pre>
              </div>

              <div className="rounded-md bg-blue-50 border border-blue-200 p-3 text-xs text-blue-800">
                <strong>Important:</strong> Compute the HMAC over the <em>raw request body bytes</em>, not a re-serialised JSON string. Parsing and re-stringifying may alter whitespace and break the signature check.
              </div>
            </div>
          )}

          {/* Events Reference */}
          {tab === 'events' && (
            <div className="space-y-2">
              <p className="text-sm text-gray-600 mb-3">
                Click any event to see its sample payload delivered to your endpoint.
              </p>
              {WEBHOOK_EVENTS.map((event) => {
                const meta   = EVENT_META[event];
                const isOpen = expandedEvent === event;
                return (
                  <div key={event} className="rounded-md border border-gray-200 bg-white overflow-hidden">
                    <button
                      onClick={() => setExpandedEvent(isOpen ? null : event)}
                      className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-gray-50"
                    >
                      <Code2 className="h-3.5 w-3.5 shrink-0 text-gray-400" />
                      <span className="flex-1 font-mono text-xs font-medium text-gray-800">{event}</span>
                      <span className="hidden sm:block text-xs text-gray-500 truncate max-w-[200px]">{meta.description}</span>
                      {isOpen
                        ? <ChevronDown className="h-3.5 w-3.5 shrink-0 text-gray-400" />
                        : <ChevronRight className="h-3.5 w-3.5 shrink-0 text-gray-400" />}
                    </button>
                    {isOpen && (
                      <div className="border-t border-gray-100 bg-gray-50 px-3 pb-3 pt-2">
                        <p className="mb-2 text-xs text-gray-600">{meta.description}</p>
                        <div className="relative rounded-md bg-gray-900">
                          <span className="absolute right-2 top-2 rounded bg-gray-700 px-2 py-0.5 text-xs text-gray-400">JSON</span>
                          <pre className="overflow-x-auto p-3 text-xs text-gray-100 leading-relaxed">
                            <code>{JSON.stringify(meta.samplePayload, null, 2)}</code>
                          </pre>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Delivery history
// ─────────────────────────────────────────────────────────────────────────────

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
                <td className="px-3 py-2"><EventBadge event={d.eventName} /></td>
                <td className="px-3 py-2"><StatusBadge status={d.status} /></td>
                <td className="px-3 py-2 text-gray-600">{d.retryCount}</td>
                <td className="px-3 py-2 text-gray-500">
                  {d.lastAttempt ? new Date(d.lastAttempt).toLocaleString() : '—'}
                </td>
                <td className="px-3 py-2 max-w-xs truncate text-gray-500">{d.response ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {data.totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-gray-500">
          <span>Page {data.page} / {data.totalPages} ({data.totalCount} total)</span>
          <div className="flex gap-2">
            <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="rounded border px-3 py-1 disabled:opacity-40">Previous</button>
            <button disabled={page >= data.totalPages} onClick={() => setPage((p) => p + 1)} className="rounded border px-3 py-1 disabled:opacity-40">Next</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Test result badge
// ─────────────────────────────────────────────────────────────────────────────

function TestResultBadge({ result, onDismiss }: { result: WebhookTestResult; onDismiss: () => void }) {
  const isOk = result.success;
  return (
    <div className={`flex items-center gap-2 rounded-md px-3 py-2 text-xs ${isOk ? 'bg-green-50 border border-green-200 text-green-800' : 'bg-red-50 border border-red-200 text-red-800'}`}>
      {isOk
        ? <CheckCircle className="h-3.5 w-3.5 shrink-0 text-green-600" />
        : <XCircle className="h-3.5 w-3.5 shrink-0 text-red-500" />}
      <span className="font-medium">{isOk ? 'Endpoint is live' : 'Endpoint unreachable'}</span>
      {result.statusCode > 0 && (
        <span className="rounded bg-white/60 px-1.5 py-0.5 font-mono">HTTP {result.statusCode}</span>
      )}
      <span className="text-gray-500">{result.durationMs} ms</span>
      {result.body && (
        <span className="max-w-[160px] truncate text-gray-500" title={result.body}>— {result.body}</span>
      )}
      <button onClick={onDismiss} className="ml-auto shrink-0 rounded p-0.5 hover:bg-black/10" title="Dismiss">
        <X className="h-3 w-3" />
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Webhook card
// ─────────────────────────────────────────────────────────────────────────────

function WebhookCard({
  webhook,
  onDelete,
  newSecret,
}: {
  webhook: WebhookResponse;
  onDelete: (id: string) => void;
  newSecret?: string;
}) {
  const [expanded, setExpanded]     = useState(false);
  const [copied, setCopied]         = useState(false);
  const [testResult, setTestResult] = useState<WebhookTestResult | null>(null);

  const secret = newSecret ?? webhook.secret;

  const handleCopy = () => {
    navigator.clipboard.writeText(secret).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const testMutation = useMutation({
    mutationFn: () => webhookApi.test(webhook.id).then((r) => r.data),
    onSuccess: (result) => {
      setTestResult(result);
      if (result.success) {
        toast.success(`Ping succeeded — HTTP ${result.statusCode} in ${result.durationMs} ms`);
      } else {
        toast.error(result.statusCode > 0 ? `Endpoint returned HTTP ${result.statusCode}` : 'Endpoint unreachable');
      }
    },
    onError: () => toast.error('Test request failed'),
  });

  return (
    <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
      {/* Header */}
      <div className="flex items-start justify-between p-4">
        <div className="flex items-start gap-3 min-w-0">
          <Globe className="mt-0.5 h-5 w-5 shrink-0 text-gray-400" />
          <div className="min-w-0">
            <p className="break-all font-medium text-gray-900">{webhook.url}</p>
            <p className="mt-0.5 text-xs text-gray-400">Created {new Date(webhook.createdAt).toLocaleDateString()}</p>
            <div className="mt-2 flex flex-wrap gap-1">
              {webhook.events.map((e) => <EventBadge key={e} event={e} />)}
            </div>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1 ml-4">
          <button
            onClick={() => testMutation.mutate()}
            disabled={testMutation.isPending}
            title="Send a test ping to this endpoint"
            className="flex items-center gap-1.5 rounded px-2.5 py-1.5 text-xs font-medium text-indigo-600 hover:bg-indigo-50 disabled:opacity-50 border border-indigo-200 hover:border-indigo-300"
          >
            {testMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Zap className="h-3.5 w-3.5" />}
            Test
          </button>
          <button
            onClick={() => setExpanded((v) => !v)}
            className="flex items-center gap-1 rounded px-2 py-1.5 text-xs text-gray-500 hover:bg-gray-100"
          >
            {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            Deliveries
          </button>
          <button
            onClick={() => onDelete(webhook.id)}
            className="rounded p-1.5 text-red-400 hover:bg-red-50 hover:text-red-600"
            title="Delete webhook"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Test result inline */}
      {testResult && (
        <div className="mx-4 mb-3">
          <TestResultBadge result={testResult} onDismiss={() => setTestResult(null)} />
        </div>
      )}

      {/* Secret — only shown immediately after creation */}
      {newSecret && (
        <div className="mx-4 mb-4 rounded-md bg-yellow-50 border border-yellow-200 p-3">
          <p className="mb-1 text-xs font-semibold text-yellow-800">Save this secret — it will not be shown again</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 break-all rounded bg-yellow-100 px-2 py-1 text-xs text-yellow-900">{secret}</code>
            <button onClick={handleCopy} className="rounded p-1 text-yellow-700 hover:bg-yellow-100" title="Copy secret">
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

// ─────────────────────────────────────────────────────────────────────────────
// Create webhook form
// ─────────────────────────────────────────────────────────────────────────────

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
    if (events.length === 0) { toast.error('Select at least one event'); return; }
    setUrlError('');
    mutation.mutate();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border border-dashed border-gray-300 bg-gray-50 p-4">
      <h3 className="text-sm font-semibold text-gray-700">New Webhook</h3>
      <div>
        <label className="mb-1 block text-xs font-medium text-gray-600">Endpoint URL</label>
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
      <div>
        <label className="mb-1 block text-xs font-medium text-gray-600">Events</label>
        <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 sm:grid-cols-3">
          {WEBHOOK_EVENTS.map((e) => (
            <label key={e} className="flex cursor-pointer items-center gap-2 text-xs text-gray-700">
              <input type="checkbox" checked={events.includes(e)} onChange={() => toggleEvent(e)} className="h-3.5 w-3.5 rounded border-gray-300 text-blue-600" />
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
        {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
        Register Webhook
      </button>
    </form>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────────

export default function WebhooksPage() {
  const { user }        = useAuth();
  const queryClient     = useQueryClient();
  const [newSecrets, setNewSecrets] = useState<Record<string, string>>({});

  const { data: merchants, isLoading: merchantsLoading } = useQuery({
    queryKey: ['merchants', user?.id],
    queryFn:  () => merchantApi.getByUser(user!.id).then((r) => r.data),
    enabled:  !!user,
  });

  const merchant = merchants?.[0];

  const { data: webhooks, isLoading: webhooksLoading } = useQuery<WebhookResponse[]>({
    queryKey: ['webhooks', merchant?.id],
    queryFn:  () => webhookApi.getByMerchant(merchant!.id).then((r) => r.data),
    enabled:  !!merchant,
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

  const handleCreated = (webhook: WebhookResponse) =>
    setNewSecrets((s) => ({ ...s, [webhook.id]: webhook.secret }));

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
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Webhooks</h1>
        <p className="mt-1 text-sm text-gray-500">
          Receive real-time HTTP POST notifications when events occur in your account.
          Each request is signed with{' '}
          <code className="text-xs bg-gray-100 px-1 rounded">X-DocSigner-Signature</code>{' '}
          (HMAC-SHA256).
        </p>
      </div>

      <InfoPanel />

      <CreateWebhookForm merchantId={merchant.id} onCreated={handleCreated} />

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
