'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { portalApi } from '@/lib/api';
import { appBaseUrl } from '@/lib/config';
import type { MyEnvelopeResponse } from '@/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  PenLine, FileText, Building2, CalendarClock, Clock,
  ExternalLink, ChevronRight, X, CheckCircle, AlertCircle,
} from 'lucide-react';
import { formatDate } from '@/lib/utils';

function statusBadge(status: string) {
  switch (status) {
    case 'Sent':       return <Badge className="bg-blue-100 text-blue-700 border-0">Pending</Badge>;
    case 'InProgress': return <Badge className="bg-amber-100 text-amber-700 border-0">In Progress</Badge>;
    case 'Completed':  return <Badge className="bg-green-100 text-green-700 border-0">Completed</Badge>;
    case 'Cancelled':  return <Badge className="bg-red-100 text-red-700 border-0">Cancelled</Badge>;
    default:           return <Badge variant="secondary">{status}</Badge>;
  }
}

function isExpired(expiresAt: string) {
  return new Date(expiresAt) < new Date();
}

function isActionable(env: MyEnvelopeResponse) {
  return (env.status === 'Sent' || env.status === 'InProgress')
    && !!env.signingToken
    && !isExpired(env.expiresAt);
}

// ── Detail modal ──────────────────────────────────────────────────────────────

function EnvelopeDetailModal({
  envelope,
  onClose,
}: {
  envelope: MyEnvelopeResponse;
  onClose: () => void;
}) {
  const signingUrl = `${appBaseUrl}/sign/${envelope.signingToken}`;
  const actionable = isActionable(envelope);
  const expired    = isExpired(envelope.expiresAt);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg rounded-2xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between rounded-t-2xl bg-gradient-to-r from-violet-600 to-purple-700 px-6 py-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-purple-200">
              Envelope Details
            </p>
            <h2 className="mt-1 text-lg font-bold text-white leading-tight">{envelope.title}</h2>
          </div>
          <button
            onClick={onClose}
            className="ml-4 mt-0.5 rounded-lg p-1 text-purple-200 hover:bg-white/10 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">

          {/* Status row */}
          <div className="flex items-center justify-between">
            {statusBadge(envelope.status)}
            {expired && envelope.status !== 'Completed' && (
              <span className="flex items-center gap-1 text-xs text-red-500">
                <AlertCircle className="h-3.5 w-3.5" /> Link expired
              </span>
            )}
          </div>

          {/* Info grid */}
          <div className="grid grid-cols-2 gap-4">
            <InfoRow
              icon={<Building2 className="h-4 w-4 text-purple-500" />}
              label="Requested by"
              value={envelope.createdByName}
            />
            <InfoRow
              icon={<PenLine className="h-4 w-4 text-purple-500" />}
              label="Your role"
              value={envelope.signerRole || 'Signer'}
            />
            <InfoRow
              icon={<CalendarClock className="h-4 w-4 text-purple-500" />}
              label="Sent on"
              value={formatDate(envelope.createdAt)}
            />
            <InfoRow
              icon={<Clock className="h-4 w-4 text-purple-500" />}
              label="Expires"
              value={formatDate(envelope.expiresAt)}
            />
          </div>

          {/* Documents */}
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
              Documents
            </p>
            <ul className="space-y-2">
              {envelope.documents.length === 0 && (
                <li className="text-sm text-gray-400">No documents attached.</li>
              )}
              {envelope.documents.map((doc, i) => (
                <li
                  key={i}
                  className="flex items-center gap-3 rounded-lg border border-gray-100 bg-gray-50 px-3 py-2"
                >
                  <FileText className="h-4 w-4 shrink-0 text-purple-500" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-gray-800">{doc.documentTitle}</p>
                    <p className="truncate text-xs text-gray-400">{doc.documentFileName}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {/* Action */}
          {envelope.status === 'Completed' ? (
            <div className="flex items-center gap-2 rounded-lg bg-green-50 border border-green-200 px-4 py-3">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <p className="text-sm font-medium text-green-700">You have already signed this document.</p>
            </div>
          ) : expired ? (
            <div className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 px-4 py-3">
              <AlertCircle className="h-5 w-5 text-red-500" />
              <p className="text-sm font-medium text-red-600">
                This signing link has expired. Please contact the sender to resend.
              </p>
            </div>
          ) : (
            <Button
              asChild
              className="w-full bg-gradient-to-r from-violet-600 to-purple-700 text-white
                         hover:from-violet-700 hover:to-purple-800 font-semibold py-5 text-base"
            >
              <a href={signingUrl} target="_blank" rel="noopener noreferrer">
                <PenLine className="mr-2 h-4 w-4" />
                Review &amp; Sign Document
                <ExternalLink className="ml-2 h-4 w-4" />
              </a>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function InfoRow({
  icon, label, value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-gray-400">
        {icon} {label}
      </p>
      <p className="text-sm font-medium text-gray-800">{value}</p>
    </div>
  );
}

// ── Envelope card ─────────────────────────────────────────────────────────────

function EnvelopeCard({
  envelope,
  onView,
}: {
  envelope: MyEnvelopeResponse;
  onView: () => void;
}) {
  const actionable = isActionable(envelope);

  return (
    <div
      onClick={onView}
      className="group cursor-pointer rounded-2xl border border-gray-100 bg-white p-5
                 shadow-sm hover:shadow-md hover:border-purple-200 transition-all duration-150"
    >
      <div className="flex items-start justify-between gap-4">
        {/* Left */}
        <div className="flex min-w-0 items-start gap-4">
          <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl
            ${actionable ? 'bg-purple-100' : 'bg-gray-100'}`}>
            <PenLine className={`h-5 w-5 ${actionable ? 'text-purple-600' : 'text-gray-400'}`} />
          </div>
          <div className="min-w-0">
            <h3 className="truncate text-sm font-semibold text-gray-900 group-hover:text-purple-700 transition-colors">
              {envelope.title}
            </h3>
            <p className="mt-0.5 flex items-center gap-1.5 text-xs text-gray-500">
              <Building2 className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{envelope.createdByName}</span>
            </p>
            {/* Documents */}
            <p className="mt-1 flex items-center gap-1.5 text-xs text-gray-400">
              <FileText className="h-3.5 w-3.5 shrink-0" />
              {envelope.documents.length === 0
                ? 'No documents'
                : envelope.documents.length === 1
                  ? envelope.documents[0].documentTitle
                  : `${envelope.documents.length} documents`}
            </p>
          </div>
        </div>

        {/* Right */}
        <div className="flex shrink-0 flex-col items-end gap-2">
          {statusBadge(envelope.status)}
          <p className="flex items-center gap-1 text-xs text-gray-400">
            <Clock className="h-3 w-3" />
            {formatDate(envelope.createdAt)}
          </p>
        </div>
      </div>

      {/* Footer action hint */}
      {actionable && (
        <div className="mt-4 flex items-center justify-between rounded-xl bg-purple-50 px-4 py-2.5">
          <span className="text-xs font-semibold text-purple-700">Signature required</span>
          <ChevronRight className="h-4 w-4 text-purple-500" />
        </div>
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function MySignaturesPage() {
  const [selected, setSelected] = useState<MyEnvelopeResponse | null>(null);

  const { data: envelopes = [], isLoading, isError } = useQuery({
    queryKey: ['my-envelopes'],
    queryFn: () => portalApi.getMyEnvelopes().then((r) => r.data),
  });

  const active    = envelopes.filter((e) => e.status === 'Sent' || e.status === 'InProgress');
  const completed = envelopes.filter((e) => e.status === 'Completed');
  const other     = envelopes.filter((e) => e.status !== 'Sent' && e.status !== 'InProgress' && e.status !== 'Completed');

  return (
    <>
      <div className="animate-fade-in space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Awaiting My Signature</h1>
          <p className="mt-1 text-sm text-gray-500">
            Documents that have been sent to you for electronic signature.
          </p>
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="flex items-center justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-purple-600 border-t-transparent" />
          </div>
        )}

        {/* Error */}
        {isError && (
          <Card>
            <CardContent className="py-12 text-center">
              <AlertCircle className="mx-auto h-10 w-10 text-red-400" />
              <p className="mt-3 text-sm text-gray-500">Failed to load envelopes. Please refresh.</p>
            </CardContent>
          </Card>
        )}

        {/* Empty state */}
        {!isLoading && !isError && envelopes.length === 0 && (
          <Card>
            <CardContent className="py-16 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-purple-50">
                <PenLine className="h-8 w-8 text-purple-400" />
              </div>
              <h3 className="text-base font-semibold text-gray-700">Nothing to sign yet</h3>
              <p className="mt-1 text-sm text-gray-400">
                When someone sends you a document to sign, it will appear here.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Active — needs action */}
        {active.length > 0 && (
          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500">
                Waiting for Your Signature
              </h2>
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-purple-600 text-[10px] font-bold text-white">
                {active.length}
              </span>
            </div>
            <div className="grid gap-3 sm:grid-cols-1 lg:grid-cols-2">
              {active.map((e) => (
                <EnvelopeCard key={e.envelopeId} envelope={e} onView={() => setSelected(e)} />
              ))}
            </div>
          </section>
        )}

        {/* Completed */}
        {completed.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500">
              Signed
            </h2>
            <div className="grid gap-3 sm:grid-cols-1 lg:grid-cols-2">
              {completed.map((e) => (
                <EnvelopeCard key={e.envelopeId} envelope={e} onView={() => setSelected(e)} />
              ))}
            </div>
          </section>
        )}

        {/* Other (cancelled etc.) */}
        {other.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500">Other</h2>
            <div className="grid gap-3 sm:grid-cols-1 lg:grid-cols-2">
              {other.map((e) => (
                <EnvelopeCard key={e.envelopeId} envelope={e} onView={() => setSelected(e)} />
              ))}
            </div>
          </section>
        )}
      </div>

      {/* Detail modal */}
      {selected && (
        <EnvelopeDetailModal
          envelope={selected}
          onClose={() => setSelected(null)}
        />
      )}
    </>
  );
}
