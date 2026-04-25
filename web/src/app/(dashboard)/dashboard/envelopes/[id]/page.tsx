'use client';

import { useState } from 'react';
import { useAuth } from '@/providers/auth-provider';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { merchantApi, envelopeApi } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { getStatusColor, base64ToBlob, downloadBlob, resolveDocMimeType } from '@/lib/utils';
import {
  FileText, Download, ArrowLeft, User, Ban, AlertTriangle,
  Clock, CheckCircle2, CheckCheck, XCircle, RotateCcw, Calendar, Hash,
  FileCheck, MessageSquare, ListOrdered, SendHorizonal, Award,
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import type { EnvelopeSignedResponse, SignerSignedSummary, EnvelopeActivityItem } from '@/types';

const CANCELLABLE_STATUSES = ['Processing', 'Sent', 'Signed'];

function StatusIcon({ status }: { status: string }) {
  switch (status) {
    case 'Signed':    return <CheckCircle2 className="h-4 w-4 text-green-500" />;
    case 'Confirmed': return <CheckCheck className="h-4 w-4 text-emerald-500" />;
    case 'Rejected':  return <XCircle className="h-4 w-4 text-red-500" />;
    case 'Expired':   return <Clock className="h-4 w-4 text-gray-400" />;
    default:          return <Clock className="h-4 w-4 text-amber-500" />;
  }
}

function fmtDate(d?: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

function isExpired(expiresAt?: string | null) {
  if (!expiresAt) return false;
  return new Date(expiresAt) < new Date();
}

export default function EnvelopeDetailPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [resendingEmail, setResendingEmail] = useState<string | null>(null);

  const { data: merchants, isPending: merchantsPending } = useQuery({
    queryKey: ['merchants', user?.id],
    queryFn: () => merchantApi.getByUser(user!.id).then((r) => r.data),
    enabled: !!user,
  });
  const merchant = merchants?.[0];

  const { data: envelope, isPending: envelopePending, isError } = useQuery({
    queryKey: ['envelope', id, merchant?.apiKey],
    queryFn: (): Promise<EnvelopeSignedResponse> =>
      envelopeApi.getSignedDocuments(merchant!.apiKey, id).then((r) => r.data),
    enabled: !!merchant && !!id,
  });

  const { data: activityLog = [] } = useQuery({
    queryKey: ['envelope-activity', id, merchant?.apiKey],
    queryFn: (): Promise<EnvelopeActivityItem[]> =>
      envelopeApi.getActivity(merchant!.apiKey, id).then((r) => r.data),
    enabled: !!merchant && !!id,
  });

  const cancelMutation = useMutation({
    mutationFn: () => envelopeApi.cancel(merchant!.apiKey, id),
    onSuccess: () => {
      setShowCancelConfirm(false);
      toast.success('Envelope cancelled successfully.');
      queryClient.invalidateQueries({ queryKey: ['envelope', id] });
    },
    onError: () => toast.error('Failed to cancel envelope.'),
  });

  const handleDownload = (base64: string, mimeType: string, name: string) => {
    const blob = base64ToBlob(base64, resolveDocMimeType(mimeType));
    const ext = resolveDocMimeType(mimeType).includes('pdf') ? 'pdf' : mimeType;
    downloadBlob(blob, `signed_${name.replace(/\s+/g, '_')}_${id}.${ext}`);
  };

  const handleDownloadOriginal = async (docId: string, fileName: string) => {
    if (!merchant) return;
    try {
      const resp = await envelopeApi.downloadDocument(merchant.apiKey, id, docId);
      const blob = resp.data as unknown as Blob;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error('Failed to download document.');
    }
  };

  const handleDownloadCertificate = async () => {
    if (!merchant) return;
    try {
      const resp = await envelopeApi.downloadCertificate(merchant.apiKey, id);
      const blob = resp.data as unknown as Blob;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `certificate-${id.slice(0, 8)}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error('Failed to download certificate.');
    }
  };

  const handleResend = async (signer: SignerSignedSummary) => {
    if (!merchant) return;
    setResendingEmail(signer.email);
    try {
      await envelopeApi.resendInvitation(merchant.apiKey, id, signer.email);
      toast.success(`Invitation resent to ${signer.email}`);
      queryClient.invalidateQueries({ queryKey: ['envelope', id] });
    } catch {
      toast.error('Failed to resend invitation.');
    } finally {
      setResendingEmail(null);
    }
  };

  if (merchantsPending || envelopePending) {
    return (
      <div className="flex justify-center py-24">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-600 border-t-transparent" />
      </div>
    );
  }

  if (isError || !envelope) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <FileText className="h-12 w-12 text-gray-300 mb-4" />
        <p className="text-gray-500">Envelope not found or you don&apos;t have access.</p>
        <Button className="mt-6" asChild>
          <Link href="/dashboard/envelopes">Back to Envelopes</Link>
        </Button>
      </div>
    );
  }

  const canCancel      = CANCELLABLE_STATUSES.includes(envelope.status);
  const signedCount    = envelope.signers.filter((s) => s.status === 'Signed').length;
  const confirmedCount = envelope.signers.filter((s) => s.status === 'Confirmed').length;
  const pendingCount   = envelope.signers.filter((s) => s.status === 'Pending').length;
  const rejectedCount  = envelope.signers.filter((s) => s.status === 'Rejected').length;

  return (
    <>
      <div className="animate-fade-in space-y-6 pb-10">

        {/* ── Back ── */}
        <Link
          href="/dashboard/envelopes"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-brand-600 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Envelopes
        </Link>

        {/* ── Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{envelope.title}</h1>
            <p className="mt-1 text-xs text-gray-400 font-mono flex items-center gap-1">
              <Hash className="h-3 w-3" />{envelope.envelopeId}
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <span className={`rounded-full px-3 py-1 text-sm font-semibold ${getStatusColor(envelope.status)}`}>
              {envelope.status}
            </span>
            {envelope.status === 'Completed' && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownloadCertificate}
                className="border-green-200 text-green-700 hover:bg-green-50 hover:border-green-300"
              >
                <Award className="h-3.5 w-3.5 mr-1.5" />
                Certificate
              </Button>
            )}
            {canCancel && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowCancelConfirm(true)}
                className="border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300"
              >
                <Ban className="h-3.5 w-3.5 mr-1.5" />
                Cancel Envelope
              </Button>
            )}
          </div>
        </div>

        {/* ── Stats cards ── */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
          {[
            { label: 'Total Signers', value: envelope.signers.length, color: 'text-gray-900 dark:text-white' },
            { label: 'Signed',    value: signedCount,    color: 'text-green-600' },
            { label: 'Confirmed', value: confirmedCount, color: 'text-emerald-500' },
            { label: 'Pending',   value: pendingCount,   color: 'text-amber-500' },
            { label: 'Rejected',  value: rejectedCount,  color: 'text-red-500'  },
          ].map(({ label, value, color }) => (
            <div key={label} className="rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 p-4">
              <p className="text-xs text-gray-500 mb-1">{label}</p>
              <p className={`text-2xl font-bold ${color}`}>{value}</p>
            </div>
          ))}
        </div>

        {/* ── Envelope details ── */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Hash className="h-4 w-4 text-gray-400" />Envelope Details
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-x-6 gap-y-4 text-sm">
            <div>
              <p className="text-xs text-gray-500 mb-0.5 flex items-center gap-1"><Calendar className="h-3 w-3" />Created</p>
              <p className="font-medium">{fmtDate(envelope.sentDate)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-0.5">Status</p>
              <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${getStatusColor(envelope.status)}`}>
                {envelope.status}
              </span>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-0.5">Signing Progress</p>
              <p className="font-medium text-gray-800 dark:text-gray-200">{signedCount} / {envelope.signers.length} signed</p>
              <div className="mt-1.5 h-1.5 w-full rounded-full bg-gray-100 dark:bg-gray-700">
                <div
                  className="h-1.5 rounded-full bg-green-500 transition-all"
                  style={{ width: envelope.signers.length > 0 ? `${(signedCount / envelope.signers.length) * 100}%` : '0%' }}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ── Documents ── */}
        {envelope.documents.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <FileCheck className="h-4 w-4 text-gray-400" />
                Documents ({envelope.documents.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {envelope.documents.map((doc) => (
                <div
                  key={doc.documentId}
                  className="flex items-center justify-between gap-3 rounded-xl border border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-750 px-4 py-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <FileText className="h-5 w-5 text-brand-500 shrink-0" />
                    <div className="min-w-0">
                      <p className="font-medium text-gray-900 dark:text-white text-sm truncate">{doc.documentTitle}</p>
                      <p className="text-xs text-gray-400 font-mono truncate">{doc.documentId}</p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDownloadOriginal(doc.documentId, doc.documentTitle)}
                    className="shrink-0"
                  >
                    <Download className="h-3.5 w-3.5 mr-1" />
                    Download
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* ── Signers ── */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <User className="h-4 w-4 text-gray-400" />Signers
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {[...envelope.signers]
              .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
              .map((signer) => {
                const expired  = signer.status === 'Pending' && isExpired(signer.expiresAt);
                const canResend = signer.status === 'Pending'
                  && envelope.status !== 'Cancelled'
                  && envelope.status !== 'Completed';

                return (
                  <div
                    key={signer.email}
                    className="rounded-2xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden"
                  >
                    {/* Header row */}
                    <div className="flex items-start justify-between gap-4 px-4 py-3">
                      <div className="flex items-start gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-100 dark:bg-brand-900 text-brand-600 dark:text-brand-300 text-sm font-bold mt-0.5">
                          {signer.order ?? '·'}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <StatusIcon status={signer.status} />
                            <span className="font-semibold text-gray-900 dark:text-white">{signer.name}</span>
                            {signer.role && signer.role !== 'signer' && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] bg-gray-100 dark:bg-gray-700 text-gray-500 uppercase tracking-wide">
                                {signer.role}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 mt-0.5">{signer.email}</p>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
                        <Badge
                          variant={
                            signer.status === 'Signed'    ? 'success' :
                            signer.status === 'Confirmed' ? 'success' :
                            signer.status === 'Rejected' || signer.status === 'Expired' || signer.status === 'Failed' ? 'danger' :
                            'warning'
                          }
                          className={signer.status === 'Confirmed' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : ''}
                        >
                          {signer.status === 'Confirmed' ? '✓ Confirmed' : signer.status}
                        </Badge>

                        {canResend && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleResend(signer)}
                            disabled={resendingEmail === signer.email}
                            className="border-brand-200 text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-950 disabled:opacity-50"
                          >
                            {resendingEmail === signer.email
                              ? <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
                              : <RotateCcw className="h-3.5 w-3.5" />}
                            <span className="ml-1.5">{resendingEmail === signer.email ? 'Sending…' : 'Resend'}</span>
                          </Button>
                        )}

                        {signer.signedDocumentBase64 && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              handleDownload(
                                signer.signedDocumentBase64!,
                                signer.signedDocumentType ?? 'application/pdf',
                                signer.name,
                              )
                            }
                          >
                            <Download className="h-3.5 w-3.5 mr-1" />
                            Download
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Metadata strip */}
                    <div className="border-t border-gray-50 dark:border-gray-700/50 bg-gray-50 dark:bg-gray-750 px-4 py-2.5 flex flex-wrap gap-x-6 gap-y-1.5 text-xs text-gray-500">
                      {signer.expiresAt && (
                        <div className="flex items-center gap-1.5">
                          <Clock className={`h-3 w-3 ${expired ? 'text-red-400' : 'text-gray-400'}`} />
                          <span className={expired ? 'text-red-500 font-medium' : ''}>
                            {expired ? 'Expired' : 'Expires'}: {fmtDate(signer.expiresAt)}
                          </span>
                        </div>
                      )}
                      {signer.signedAt && (
                        <div className="flex items-center gap-1.5">
                          <CheckCircle2 className="h-3 w-3 text-green-500" />
                          Signed: {fmtDate(signer.signedAt)}
                        </div>
                      )}
                      {signer.confirmedAt && (
                        <div className="flex items-center gap-1.5">
                          <CheckCheck className="h-3 w-3 text-emerald-500" />
                          Confirmed: {fmtDate(signer.confirmedAt)}
                        </div>
                      )}
                      {signer.message && (
                        <div className="flex items-start gap-1.5">
                          <MessageSquare className="h-3 w-3 mt-0.5 text-gray-400 shrink-0" />
                          <span className="italic">&ldquo;{signer.message}&rdquo;</span>
                        </div>
                      )}
                      {signer.status === 'Rejected' && (
                        <div className="flex items-start gap-1.5 text-red-500 w-full">
                          <XCircle className="h-3 w-3 mt-0.5 shrink-0" />
                          {signer.rejectionReason
                            ? `Rejection reason: ${signer.rejectionReason}`
                            : 'Rejected — no reason provided'}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
          </CardContent>
        </Card>

        {/* ── Activity timeline ── */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <ListOrdered className="h-4 w-4 text-gray-400" />Activity Timeline
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="relative border-l border-gray-200 dark:border-gray-700 space-y-5 ml-2 pl-4">
              {/* Created — always first */}
              <li>
                <div className="absolute -left-[7px] h-3 w-3 rounded-full border-2 border-brand-500 bg-white dark:bg-gray-800" />
                <p className="text-sm font-medium text-gray-900 dark:text-white">Envelope created &amp; invitations sent</p>
                <p className="text-xs text-gray-500 mt-0.5">{fmtDate(envelope.sentDate)}</p>
              </li>

              {/* Confirmed events from signers */}
              {envelope.signers.filter(s => s.confirmedAt).map(s => (
                <li key={s.email + '_confirmed'}>
                  <div className="absolute -left-[7px] h-3 w-3 rounded-full border-2 border-emerald-500 bg-white dark:bg-gray-800" />
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    <span className="text-emerald-600">{s.name}</span> confirmed &amp; agreed to sign
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">{fmtDate(s.confirmedAt)}</p>
                </li>
              ))}

              {/* Signed events from signers */}
              {envelope.signers.filter(s => s.signedAt).map(s => (
                <li key={s.email + '_signed'}>
                  <div className="absolute -left-[7px] h-3 w-3 rounded-full border-2 border-green-500 bg-white dark:bg-gray-800" />
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    <span className="text-green-600">{s.name}</span> signed the document
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">{fmtDate(s.signedAt)}</p>
                </li>
              ))}

              {/* Rejected events from signers */}
              {envelope.signers.filter(s => s.status === 'Rejected').map(s => (
                <li key={s.email + '_rejected'}>
                  <div className="absolute -left-[7px] h-3 w-3 rounded-full border-2 border-red-500 bg-white dark:bg-gray-800" />
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    <span className="text-red-500">{s.name}</span> rejected the document
                  </p>
                  {s.rejectionReason && <p className="text-xs text-red-400 italic mt-0.5">&ldquo;{s.rejectionReason}&rdquo;</p>}
                </li>
              ))}

              {/* Resend events from audit log */}
              {activityLog
                .filter(e => e.action === 'Invitation.Resent')
                .map((e, i) => (
                  <li key={'resend_' + i}>
                    <div className="absolute -left-[7px] h-3 w-3 rounded-full border-2 border-blue-400 bg-white dark:bg-gray-800 flex items-center justify-center">
                      <SendHorizonal className="h-1.5 w-1.5 text-blue-400" />
                    </div>
                    <p className="text-sm font-medium text-blue-600 dark:text-blue-400 flex items-center gap-1">
                      <RotateCcw className="h-3.5 w-3.5" />
                      Invitation resent
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">{e.description}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{fmtDate(e.timestamp)}</p>
                  </li>
                ))}

              {/* Terminal states */}
              {envelope.status === 'Completed' && (
                <li>
                  <div className="absolute -left-[7px] h-3 w-3 rounded-full bg-green-600" />
                  <p className="text-sm font-semibold text-green-600">Envelope completed — all signers signed</p>
                </li>
              )}
              {envelope.status === 'Cancelled' && (
                <li>
                  <div className="absolute -left-[7px] h-3 w-3 rounded-full bg-gray-400" />
                  <p className="text-sm font-medium text-gray-500">Envelope cancelled</p>
                </li>
              )}
            </ol>
          </CardContent>
        </Card>

      </div>

      {/* ── Cancel confirmation modal ── */}
      {showCancelConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-gray-800 shadow-xl p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100">
                <AlertTriangle className="h-5 w-5 text-red-500" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">Cancel Envelope</h2>
                <p className="text-xs text-gray-500">This action cannot be undone.</p>
              </div>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Are you sure you want to cancel{' '}
              <span className="font-semibold text-gray-800 dark:text-white">&ldquo;{envelope.title}&rdquo;</span>?
              All pending signers will no longer be able to sign.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowCancelConfirm(false)}
                disabled={cancelMutation.isPending}
                className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Keep Envelope
              </button>
              <button
                onClick={() => cancelMutation.mutate()}
                disabled={cancelMutation.isPending}
                className="flex-1 rounded-xl bg-red-600 py-2.5 text-sm font-bold text-white hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {cancelMutation.isPending
                  ? <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  : <Ban className="h-3.5 w-3.5" />}
                {cancelMutation.isPending ? 'Cancelling…' : 'Cancel Envelope'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
