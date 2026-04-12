'use client';

import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/providers/auth-provider';
import { useQuery } from '@tanstack/react-query';
import { merchantApi, envelopeApi } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatDate, getStatusColor, base64ToBlob, downloadBlob } from '@/lib/utils';
import {
  ArrowLeft, FileText, Download, CheckCircle, Clock,
  User, Calendar, AlertTriangle,
} from 'lucide-react';
import Link from 'next/link';

export default function EnvelopeDetailPage() {
  const { id }    = useParams<{ id: string }>();
  const router    = useRouter();
  const { user }  = useAuth();

  const { data: merchants } = useQuery({
    queryKey: ['merchants', user?.id],
    queryFn: () => merchantApi.getByUser(user!.id).then((r) => r.data),
    enabled: !!user,
  });
  const merchant = merchants?.[0];

  const { data: envelope, isLoading, isError } = useQuery({
    queryKey: ['envelope', id, merchant?.apiKey],
    queryFn: () => envelopeApi.getById(merchant!.apiKey, id).then((r) => r.data),
    enabled: !!merchant && !!id,
  });

  const handleDownload = (base64: string, type: string, name: string) => {
    const blob = base64ToBlob(base64, type || 'application/pdf');
    downloadBlob(blob, `${name}.pdf`);
  };

  if (isLoading || !merchant) {
    return (
      <div className="flex justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-600 border-t-transparent" />
      </div>
    );
  }

  if (isError || !envelope) {
    return (
      <div className="animate-fade-in space-y-6">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
        <Card>
          <CardContent className="flex flex-col items-center py-16 text-center">
            <AlertTriangle className="h-12 w-12 text-red-400 mb-4" />
            <h2 className="text-lg font-bold text-gray-900">Envelope Not Found</h2>
            <p className="mt-2 text-sm text-gray-500">This envelope could not be loaded.</p>
            <Button className="mt-6" asChild>
              <Link href="/dashboard/envelopes">Back to Envelopes</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const allSigned = envelope.signers.every((s) => s.status === 'Signed');

  return (
    <div className="animate-fade-in space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
      </div>

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{envelope.title}</h1>
          <p className="mt-1 text-sm text-gray-500">
            Sent {formatDate(envelope.sentDate)} · {envelope.documents.length} document{envelope.documents.length !== 1 ? 's' : ''}
          </p>
        </div>
        <span className={`rounded-full px-3 py-1 text-sm font-semibold shrink-0 ${getStatusColor(envelope.status)}`}>
          {envelope.status}
        </span>
      </div>

      {/* Documents */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-4 w-4 text-brand-600" /> Documents
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {envelope.documents.map((doc) => (
            <div
              key={doc.documentId}
              className="flex items-center justify-between rounded-xl bg-gray-50 px-4 py-3"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-100 text-brand-700">
                  <FileText className="h-4 w-4" />
                </div>
                <p className="text-sm font-medium text-gray-800">{doc.documentTitle}</p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Signers */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <User className="h-4 w-4 text-brand-600" /> Signers
          </CardTitle>
        </CardHeader>
        <CardContent className="divide-y divide-gray-50">
          {envelope.signers.map((signer, idx) => {
            const isSigned = signer.status === 'Signed';
            return (
              <div key={signer.email + idx} className="flex items-center justify-between py-3">
                <div className="flex items-center gap-3">
                  <div className={`flex h-9 w-9 items-center justify-center rounded-xl text-sm font-bold ${
                    isSigned ? 'bg-green-100 text-green-700' : 'bg-amber-50 text-amber-600'
                  }`}>
                    {signer.name?.[0]?.toUpperCase() ?? '?'}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{signer.name}</p>
                    <p className="text-xs text-gray-500">{signer.email}</p>
                    <p className="text-xs text-gray-400 mt-0.5">Role: {signer.role}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`flex items-center gap-1 text-xs font-semibold ${
                    isSigned ? 'text-green-600' : 'text-amber-600'
                  }`}>
                    {isSigned
                      ? <><CheckCircle className="h-3.5 w-3.5" /> Signed</>
                      : <><Clock className="h-3.5 w-3.5" /> Pending</>
                    }
                  </span>
                  {isSigned && signer.signedDocumentBase64 && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        handleDownload(
                          signer.signedDocumentBase64!,
                          signer.signedDocumentType ?? 'application/pdf',
                          `signed_${signer.name}`,
                        )
                      }
                    >
                      <Download className="h-3.5 w-3.5" /> Download
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Summary */}
      {allSigned && (
        <div className="rounded-xl bg-green-50 border border-green-200 px-5 py-4 flex items-center gap-3">
          <CheckCircle className="h-5 w-5 text-green-500 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-green-800">All signers have completed signing.</p>
            <p className="text-xs text-green-600 mt-0.5">
              Download the signed documents from each signer row above.
            </p>
          </div>
        </div>
      )}

      {/* Timeline metadata */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Calendar className="h-4 w-4 text-brand-600" /> Envelope Info
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wide">Envelope ID</p>
            <p className="mt-0.5 font-mono text-xs text-gray-700 break-all">{envelope.envelopeId}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wide">Sent Date</p>
            <p className="mt-0.5 text-gray-700">{formatDate(envelope.sentDate)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wide">Status</p>
            <Badge variant={envelope.status === 'Signed' ? 'success' : envelope.status === 'Expired' ? 'danger' : 'warning'}>
              {envelope.status}
            </Badge>
          </div>
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wide">Completion</p>
            <p className="mt-0.5 text-gray-700">
              {envelope.signers.filter((s) => s.status === 'Signed').length} / {envelope.signers.length} signed
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
