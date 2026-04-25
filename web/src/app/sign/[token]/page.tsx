'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import { useQuery, useMutation } from '@tanstack/react-query';
import { portalApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { base64ToBlob } from '@/lib/utils';
import {
  CheckCircle, Eraser, PenLine, FileText, AlertTriangle,
  Clock, Shield, ClipboardList, MonitorCheck, XCircle, Download,
} from 'lucide-react';
import SignatureCanvas from 'react-signature-canvas';

// ── Step indicator ────────────────────────────────────────────────────────────

function StepBar({ step }: { step: 1 | 2 | 3 }) {
  const steps = [
    { n: 1, label: 'Review' },
    { n: 2, label: 'Sign' },
    { n: 3, label: 'Done' },
  ] as const;

  return (
    <div className="flex items-center gap-0 mt-4">
      {steps.map(({ n, label }, i) => {
        const active   = step === n;
        const complete = step > n;
        return (
          <div key={n} className="flex items-center" style={{ flex: i < steps.length - 1 ? '1' : undefined }}>
            <div className="flex flex-col items-center">
              <div
                className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-colors
                  ${active   ? 'bg-blue-600 text-white ring-4 ring-blue-100'  : ''}
                  ${complete ? 'bg-blue-600 text-white'                        : ''}
                  ${!active && !complete ? 'bg-gray-200 text-gray-500'         : ''}`}
              >
                {complete ? <CheckCircle className="h-4 w-4" /> : n}
              </div>
              <span className={`mt-1 text-[11px] font-medium ${active ? 'text-blue-600' : 'text-gray-400'}`}>
                {label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div className={`h-0.5 flex-1 mx-2 mb-4 rounded-full ${step > n ? 'bg-blue-600' : 'bg-gray-200'}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function SignPage() {
  const { token }   = useParams<{ token: string }>();
  const sigRef      = useRef<SignatureCanvas>(null);
  const [done, setDone]       = useState(false);
  const [rejected, setRejected] = useState(false);
  const [docUrl, setDocUrl]   = useState<string | null>(null);
  const [docContentType, setDocContentType] = useState<string>('application/pdf');
  const [mode, setMode]       = useState<'draw' | 'type'>('draw');
  const [typedName, setTypedName] = useState('');
  const [agreed, setAgreed]   = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason]       = useState('');

  const { data: preview, isLoading, isError } = useQuery({
    queryKey: ['portal', token],
    queryFn: () => portalApi.validate(token).then((r) => r.data),
    retry: false,
  });

  useEffect(() => {
    if (preview?.documentBase64) {
      const ct = preview.contentType || 'application/pdf';
      setDocContentType(ct);
      const blob = base64ToBlob(preview.documentBase64, ct);
      setDocUrl(URL.createObjectURL(blob));
    }
    return () => { if (docUrl) URL.revokeObjectURL(docUrl); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preview]);

  /** Trigger a browser download of the document */
  const handleDownload = () => {
    if (!docUrl || !preview) return;
    const a = document.createElement('a');
    a.href = docUrl;
    a.download = preview.documentFileName || 'document';
    a.click();
  };

  // Pre-fill typed name from claimant
  useEffect(() => {
    if (preview?.claimantName && !typedName) setTypedName(preview.claimantName);
  }, [preview]);

  const mutation = useMutation({
    mutationFn: (signatureBase64: string) =>
      portalApi.submit(token, { signatureBase64 }),
    onSuccess: () => {
      setDone(true);
      toast.success('Document signed successfully!');
    },
    onError: () => toast.error('Failed to submit signature. The link may have expired.'),
  });

  const rejectMutation = useMutation({
    mutationFn: (reason: string) =>
      portalApi.reject(token, { reason: reason || undefined }),
    onSuccess: () => {
      setShowRejectModal(false);
      setRejected(true);
      toast.success('Document rejected.');
    },
    onError: () => toast.error('Failed to reject. The link may have expired or already been processed.'),
  });

  /** Render typed name onto a canvas and return base64 */
  const getTypedSignatureBase64 = (): string | null => {
    if (!typedName.trim()) return null;
    const canvas = document.createElement('canvas');
    canvas.width  = 600;
    canvas.height = 150;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle   = '#1e3a8a';
    ctx.font        = "italic 64px 'Georgia', serif";
    ctx.textBaseline = 'middle';
    ctx.fillText(typedName.trim(), 20, canvas.height / 2);
    return canvas.toDataURL('image/png').split(',')[1];
  };

  const handleSign = () => {
    if (!agreed) {
      toast.error('Please confirm you have read the document and agree to sign.');
      return;
    }

    if (mode === 'draw') {
      if (!sigRef.current || sigRef.current.isEmpty()) {
        toast.error('Please draw your signature first.');
        return;
      }
      const base64 = sigRef.current.getTrimmedCanvas().toDataURL('image/png').split(',')[1];
      mutation.mutate(base64);
    } else {
      const base64 = getTypedSignatureBase64();
      if (!base64) {
        toast.error('Please type your full name as your signature.');
        return;
      }
      mutation.mutate(base64);
    }
  };

  const expiresAt = preview?.expiresAt
    ? new Date(preview.expiresAt).toLocaleString('en-GB', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit', timeZone: 'UTC', timeZoneName: 'short',
      })
    : null;

  // ── Loading ──────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  // ── Error ────────────────────────────────────────────────────────────────

  if (isError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-6">
        <div className="w-full max-w-md rounded-2xl border border-red-100 bg-white p-10 text-center shadow-sm">
          <AlertTriangle className="mx-auto h-14 w-14 text-red-400 mb-4" />
          <h2 className="text-xl font-bold text-gray-900">Invalid or Expired Link</h2>
          <p className="mt-2 text-sm text-gray-500">
            This signing link is invalid, has expired, or has already been used.
          </p>
        </div>
      </div>
    );
  }

  // ── Done ─────────────────────────────────────────────────────────────────

  if (done) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-6">
        <div className="w-full max-w-md rounded-2xl border border-green-100 bg-white p-10 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-green-50">
            <CheckCircle className="h-12 w-12 text-green-500" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900">Signing Complete!</h2>
          <p className="mt-2 text-sm text-gray-500">
            Your signature has been recorded. A signed copy will be sent to your email shortly.
          </p>
          <div className="mt-6 flex items-center justify-center gap-5 text-xs text-gray-400">
            <span className="flex items-center gap-1"><Shield className="h-3.5 w-3.5" /> 256-bit encrypted</span>
            <span className="flex items-center gap-1"><ClipboardList className="h-3.5 w-3.5" /> Full audit trail</span>
            <span className="flex items-center gap-1"><MonitorCheck className="h-3.5 w-3.5" /> eIDAS compliant</span>
          </div>
        </div>
      </div>
    );
  }

  // ── Rejected ──────────────────────────────────────────────────────────────

  if (rejected) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-6">
        <div className="w-full max-w-md rounded-2xl border border-red-100 bg-white p-10 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-red-50">
            <XCircle className="h-12 w-12 text-red-400" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900">Document Rejected</h2>
          <p className="mt-2 text-sm text-gray-500">
            You have rejected this document. The sender has been notified and no signature will be recorded.
          </p>
          <div className="mt-6 flex items-center justify-center gap-5 text-xs text-gray-400">
            <span className="flex items-center gap-1"><ClipboardList className="h-3.5 w-3.5" /> Rejection recorded in audit trail</span>
          </div>
        </div>
      </div>
    );
  }

  // ── Main layout ───────────────────────────────────────────────────────────

  return (
    <>
    <div className="min-h-screen bg-[#f3f4f6]">

      {/* ── Top navbar ─────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-20 border-b border-gray-200 bg-white px-6 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2 font-bold text-blue-700 text-base">
          <FileText className="h-5 w-5" />
          DocSignerHub
        </div>
        <p className="text-xs text-gray-400 hidden sm:block truncate max-w-xs">
          {preview?.documentFileName}
        </p>
      </header>

      {/* ── Two-column body ────────────────────────────────────────────── */}
      <div className="mx-auto max-w-7xl px-4 py-6 lg:grid lg:grid-cols-[1fr_380px] lg:gap-6 lg:items-start">

        {/* ══ LEFT: review panel ══════════════════════════════════════════ */}
        <div className="space-y-4">

          {/* Info card */}
          <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-6">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">
              You have a document to sign
            </p>
            <h1 className="text-2xl font-bold text-gray-900">
              Hello, <span className="text-blue-600">{preview?.claimantName}</span>&nbsp;👋
            </h1>
            <p className="mt-1.5 text-sm text-gray-500">
              Please review the document below, then add your signature in the panel on the right.
            </p>

            {/* Expiry notice */}
            {expiresAt && (
              <div className="mt-4 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
                <Clock className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                <div>
                  <p className="text-xs font-semibold text-amber-700">Link expires</p>
                  <p className="text-xs text-amber-600">{expiresAt}</p>
                </div>
              </div>
            )}

            {/* Step bar */}
            <StepBar step={1} />
          </div>

          {/* Message from sender */}
          {preview?.message && (
            <div className="rounded-2xl bg-white border border-gray-100 shadow-sm px-5 py-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">
                Message from sender
              </p>
              <p className="text-sm text-gray-600 italic">&ldquo;{preview.message}&rdquo;</p>
            </div>
          )}

          {/* Document card */}
          <div className="rounded-2xl bg-white border border-gray-100 shadow-sm overflow-hidden">
            {/* Document header */}
            <div className="flex items-center gap-3 border-b border-gray-100 px-5 py-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50">
                <FileText className="h-5 w-5 text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-800 truncate">Document to Sign</p>
                <p className="text-xs text-gray-400 truncate">{preview?.documentFileName}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="rounded-md bg-blue-600 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-white">
                  {docContentType.includes('pdf') ? 'PDF'
                    : docContentType.includes('word') || docContentType.includes('document') ? 'DOCX'
                    : 'DOC'}
                </span>
                <button
                  onClick={handleDownload}
                  title="Download document"
                  className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  <Download className="h-3.5 w-3.5" />
                  Download
                </button>
              </div>
            </div>

            {/* Document viewer */}
            {docUrl ? (
              docContentType.includes('pdf') ? (
                <iframe
                  src={docUrl}
                  title="Document Preview"
                  className="w-full border-0"
                  style={{ height: '70vh', minHeight: '500px' }}
                />
              ) : (
                /* Word / other formats — can't render inline; show download prompt */
                <div className="flex flex-col items-center justify-center gap-5 px-6 py-16 bg-gray-50">
                  <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-blue-50">
                    <FileText className="h-10 w-10 text-blue-500" />
                  </div>
                  <div className="text-center">
                    <p className="text-base font-semibold text-gray-800">
                      {preview?.documentFileName}
                    </p>
                    <p className="mt-1 text-sm text-gray-500">
                      This file type ({docContentType.includes('word') || docContentType.includes('document') ? 'Word document' : docContentType}) cannot be previewed directly in the browser.
                    </p>
                  </div>
                  <button
                    onClick={handleDownload}
                    className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white hover:bg-blue-700 transition-colors"
                  >
                    <Download className="h-4 w-4" />
                    Download to Review
                  </button>
                  <p className="text-xs text-gray-400 text-center max-w-xs">
                    Please download and review the document carefully before adding your signature below.
                  </p>
                </div>
              )
            ) : (
              <div className="flex h-64 items-center justify-center text-sm text-gray-400">
                Loading document…
              </div>
            )}
          </div>
        </div>

        {/* ══ RIGHT: signature panel (sticky) ═════════════════════════════ */}
        <div className="mt-4 lg:mt-0 lg:sticky lg:top-[65px]">
          <div className="rounded-2xl bg-white border border-gray-100 shadow-sm overflow-hidden">

            {/* Panel header */}
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
              <div className="flex items-center gap-2">
                <PenLine className="h-4 w-4 text-gray-700" />
                <span className="text-sm font-semibold text-gray-800">Your Signature</span>
              </div>
              <span className="rounded-full border border-amber-400 bg-amber-50 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-amber-600">
                Required
              </span>
            </div>

            <div className="p-5 space-y-4">
              {/* Draw / Type tabs */}
              <div className="flex rounded-xl border border-gray-200 bg-gray-50 p-1">
                <button
                  onClick={() => setMode('draw')}
                  className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-semibold transition-all
                    ${mode === 'draw'
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'}`}
                >
                  <PenLine className="h-4 w-4" />
                  Draw
                </button>
                <button
                  onClick={() => setMode('type')}
                  className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-semibold transition-all
                    ${mode === 'type'
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'}`}
                >
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="2" y="4" width="20" height="16" rx="2" />
                    <path d="M8 12h8M12 8v8" />
                  </svg>
                  Type
                </button>
              </div>

              {/* Draw canvas */}
              {mode === 'draw' && (
                <div>
                  <div className="relative rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 overflow-hidden">
                    <SignatureCanvas
                      ref={sigRef}
                      penColor="#1e3a8a"
                      canvasProps={{ className: 'w-full', height: 160 }}
                    />
                    <button
                      type="button"
                      onClick={() => sigRef.current?.clear()}
                      className="absolute top-2 right-2 flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-2 py-1 text-xs text-gray-500 hover:bg-gray-100 transition-colors"
                    >
                      <Eraser className="h-3 w-3" /> Clear
                    </button>
                  </div>
                  <p className="mt-1.5 text-center text-xs text-gray-400">
                    Draw your signature in the box above.
                  </p>
                </div>
              )}

              {/* Type signature */}
              {mode === 'type' && (
                <div>
                  <p className="mb-1.5 text-xs text-gray-500">Type your full name as your signature.</p>
                  <div className="relative rounded-xl border-2 border-gray-200 bg-gray-50 px-4 py-3">
                    <input
                      value={typedName}
                      onChange={(e) => setTypedName(e.target.value)}
                      placeholder="Your Full Name"
                      className="w-full bg-transparent text-3xl outline-none placeholder:text-gray-300"
                      style={{ fontFamily: "'Dancing Script', 'Brush Script MT', cursive", color: '#1e3a8a' }}
                    />
                  </div>
                  {typedName && (
                    <p className="mt-1.5 text-center text-xs text-gray-400">
                      This will be rendered as your signature image.
                    </p>
                  )}
                </div>
              )}

              {/* Legal notice */}
              <div className="rounded-xl bg-gray-50 border border-gray-100 px-4 py-3 space-y-1">
                <p className="flex items-center gap-1.5 text-xs font-semibold text-gray-700">
                  <ClipboardList className="h-3.5 w-3.5 shrink-0 text-gray-500" />
                  Legal Notice
                </p>
                <p className="text-xs leading-relaxed text-gray-500">
                  By signing, you agree your electronic signature is{' '}
                  <span className="font-semibold text-gray-700">legally binding</span>. Your IP
                  address, browser info, and timestamp will be recorded in the audit trail.
                </p>
              </div>

              {/* Consent checkbox */}
              <label className="flex cursor-pointer items-start gap-3">
                <input
                  type="checkbox"
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                  className="mt-0.5 h-4 w-4 cursor-pointer accent-blue-600"
                />
                <span className="text-xs leading-relaxed text-gray-600">
                  I have read the document and confirm my electronic signature is{' '}
                  <span className="font-semibold text-gray-800">legally binding</span>.
                </span>
              </label>

              {/* Sign button */}
              <button
                onClick={handleSign}
                disabled={mutation.isPending || !agreed}
                className="relative w-full rounded-xl bg-blue-600 py-3.5 text-sm font-bold text-white
                           hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed
                           transition-colors flex items-center justify-center gap-2"
              >
                {mutation.isPending ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Submitting…
                  </>
                ) : (
                  <>
                    <Shield className="h-4 w-4" />
                    Sign Document Securely
                  </>
                )}
              </button>

              {/* Reject button */}
              <button
                onClick={() => setShowRejectModal(true)}
                disabled={mutation.isPending || rejectMutation.isPending}
                className="w-full rounded-xl border border-red-200 py-3 text-sm font-semibold text-red-600
                           hover:bg-red-50 active:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed
                           transition-colors flex items-center justify-center gap-2"
              >
                <XCircle className="h-4 w-4" />
                Reject Document
              </button>

              {/* Trust badges */}
              <div className="flex items-center justify-center gap-4 pt-1">
                <span className="flex items-center gap-1 text-[11px] text-gray-400">
                  <Shield className="h-3 w-3" /> 256-bit encrypted
                </span>
                <span className="flex items-center gap-1 text-[11px] text-gray-400">
                  <ClipboardList className="h-3 w-3" /> Full audit trail
                </span>
                <span className="flex items-center gap-1 text-[11px] text-gray-400">
                  <MonitorCheck className="h-3 w-3" /> eIDAS compliant
                </span>
              </div>

            </div>
          </div>
        </div>
        {/* ══ end RIGHT ══ */}

      </div>
    </div>

    {/* ── Reject modal ───────────────────────────────────────────────────── */}
    {showRejectModal && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
        <div className="w-full max-w-md rounded-2xl bg-white shadow-xl p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100">
              <XCircle className="h-5 w-5 text-red-500" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Reject Document</h2>
              <p className="text-xs text-gray-500">This action cannot be undone.</p>
            </div>
          </div>
          <p className="text-sm text-gray-600">
            Are you sure you want to reject this document? The sender will be notified and no signature will be recorded.
          </p>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">
              Reason for rejection <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="e.g. Incorrect terms, wrong document, etc."
              rows={3}
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-300 resize-none"
            />
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => { setShowRejectModal(false); setRejectReason(''); }}
              disabled={rejectMutation.isPending}
              className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={() => rejectMutation.mutate(rejectReason)}
              disabled={rejectMutation.isPending}
              className="flex-1 rounded-xl bg-red-600 py-2.5 text-sm font-bold text-white hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {rejectMutation.isPending ? (
                <>
                  <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Rejecting…
                </>
              ) : (
                <>
                  <XCircle className="h-3.5 w-3.5" />
                  Confirm Rejection
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}
