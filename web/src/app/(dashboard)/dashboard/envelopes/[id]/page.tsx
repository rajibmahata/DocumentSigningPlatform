'use client';

import { useAuth } from '@/providers/auth-provider';
import { useQuery } from '@tanstack/react-query';
import { merchantApi, envelopeApi } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { getStatusColor, base64ToBlob, downloadBlob, resolveDocMimeType } from '@/lib/utils';
import { FileText, Download, ArrowLeft, User } from 'lucide-react';
import Link from 'next/link';
import type { EnvelopeSignedResponse } from '@/types';

export default function EnvelopeDetailPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const { user } = useAuth();

  const { data: merchants, isPending: merchantsPending } = useQuery({
    queryKey: ['merchants', user?.id],
    queryFn: () => merchantApi.getByUser(user!.id).then((r) => r.data),
    enabled: !!user,
  });
  const merchant = merchants?.[0];

  const { data: envelope, isPending: envelopePending, isError } = useQuery({
    queryKey: ['envelope', id, merchant?.apiKey],
    queryFn: (): Promise<EnvelopeSignedResponse> => envelopeApi.getSignedDocuments(merchant!.apiKey, id).then((r) => r.data),
    enabled: !!merchant && !!id,
  });

  const handleDownload = (base64: string, mimeType: string, name: string) => {
    const blob = base64ToBlob(base64, resolveDocMimeType(mimeType));
    const ext = resolveDocMimeType(mimeType).includes('pdf') ? 'pdf' : mimeType;
    downloadBlob(blob, `signed_${name.replace(/\s+/g, '_')}_${id}.${ext}`);
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

  return (
    <div className="animate-fade-in space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/dashboard/envelopes"
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-brand-600 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Envelopes
        </Link>
      </div>

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{envelope.title}</h1>
          <p className="mt-1 text-sm text-gray-500">
            Envelope ID: <span className="font-mono text-xs">{envelope.envelopeId}</span>
          </p>
        </div>
        <span className={`rounded-full px-3 py-1 text-sm font-semibold ${getStatusColor(envelope.status)}`}>
          {envelope.status}
        </span>
      </div>

      {/* Summary card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Summary</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
          <div>
            <p className="text-xs text-gray-500 mb-0.5">Total Signers</p>
            <p className="font-semibold">{envelope.signers.length}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-0.5">Signed</p>
            <p className="font-semibold text-green-600">
              {envelope.signers.filter((s) => s.status === 'Signed').length}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-0.5">Pending</p>
            <p className="font-semibold text-amber-600">
              {envelope.signers.filter((s) => s.status === 'Pending').length}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-0.5">Status</p>
            <p className="font-semibold">{envelope.status}</p>
          </div>
        </CardContent>
      </Card>

      {/* Signers */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Signers</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {envelope.signers.map((signer, i) => (
            <div
              key={signer.email}
              className="flex items-center justify-between gap-4 rounded-xl border border-gray-100 bg-gray-50 px-4 py-3"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-100 text-brand-600 text-sm font-bold">
                  {i + 1}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <User className="h-3.5 w-3.5 text-gray-400" />
                    <span className="font-medium text-gray-900">{signer.name}</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">{signer.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Badge
                  variant={
                    signer.status === 'Signed'  ? 'success' :
                    signer.status === 'Expired' || signer.status === 'Failed' ? 'destructive' :
                    'warning'
                  }
                >
                  {signer.status}
                </Badge>
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
                    <Download className="h-3.5 w-3.5" />
                    Download
                  </Button>
                )}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
