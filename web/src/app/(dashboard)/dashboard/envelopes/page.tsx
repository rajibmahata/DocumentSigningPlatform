'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/providers/auth-provider';
import { useQuery } from '@tanstack/react-query';
import { merchantApi, envelopeApi } from '@/lib/api';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { formatDate, getStatusColor, base64ToBlob, downloadBlob, resolveDocMimeType } from '@/lib/utils';
import { FileText, Download, ExternalLink, Clock } from 'lucide-react';
import Link from 'next/link';
import type { InitiateEnvelopeResponse } from '@/types';

export default function EnvelopesPage() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const initialTab = searchParams.get('tab') === 'completed' ? 'completed' : 'active';
  const [tab, setTab] = useState<'active' | 'completed'>(initialTab);

  useEffect(() => {
    const t = searchParams.get('tab');
    if (t === 'active' || t === 'completed') setTab(t);
  }, [searchParams]);

  const { data: merchants } = useQuery({
    queryKey: ['merchants', user?.id],
    queryFn: () => merchantApi.getByUser(user!.id).then((r) => r.data),
    enabled: !!user,
  });
  const merchant = merchants?.[0];

  const { data: envelopes, isLoading } = useQuery({
    queryKey: ['envelopes', merchant?.apiKey],
    queryFn: () => envelopeApi.list(merchant!.apiKey).then((r) => r.data),
    enabled: !!merchant,
  });

  const filtered = envelopes?.filter((e) =>
    tab === 'active'
      ? e.status === 'Sent' || e.status === 'InProgress'
      : e.status === 'Completed',
  ) ?? [];

  return (
    <div className="animate-fade-in space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Envelopes</h1>
        <p className="mt-1 text-sm text-gray-500">All signing envelopes sent through your merchant account.</p>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
        <TabsList>
          <TabsTrigger value="active">
            <Clock className="h-4 w-4 mr-1.5" />
            Active ({envelopes?.filter((e) => e.status === 'Sent' || e.status === 'InProgress').length ?? 0})
          </TabsTrigger>
          <TabsTrigger value="completed">
            Completed ({envelopes?.filter((e) => e.status === 'Completed').length ?? 0})
          </TabsTrigger>
        </TabsList>

        <TabsContent value={tab}>
          {isLoading ? (
            <div className="flex justify-center py-16">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-600 border-t-transparent" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <FileText className="h-10 w-10 text-gray-300 mb-3" />
              <p className="text-sm text-gray-500">No {tab === 'active' ? 'active' : 'completed'} envelopes.</p>
              {tab === 'active' && (
                <Button size="sm" className="mt-4" asChild>
                  <Link href="/dashboard/send">Send Envelope</Link>
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map((env) => (
                <EnvelopeCard key={env.envelopeId} env={env} apiKey={merchant!.apiKey} tab={tab} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function EnvelopeCard({
  env, apiKey, tab,
}: {
  env: InitiateEnvelopeResponse;
  apiKey: string;
  tab: 'active' | 'completed';
}) {
  const handleViewSigned = async () => {
    try {
      const res = await envelopeApi.getSignedDocuments(apiKey, env.envelopeId);
      const signed = res.data.signers.find((s) => s.signedDocumentBase64);
      if (signed?.signedDocumentBase64) {
        const mimeType = resolveDocMimeType(signed.signedDocumentType);
        const ext = mimeType.includes('pdf') ? 'pdf' : signed.signedDocumentType ?? 'pdf';
        const blob = base64ToBlob(signed.signedDocumentBase64, mimeType);
        downloadBlob(blob, `signed_${env.title}.${ext}`);
      }
    } catch {
      // handled by global error
    }
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="flex items-center justify-between gap-4 p-5">
        <div className="flex items-center gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
            <FileText className="h-5 w-5" />
          </div>
          <div>
            <p className="font-semibold text-gray-900">{env.title}</p>
            <p className="text-xs text-gray-500 mt-0.5">
              {env.signers.length} signer{env.signers.length !== 1 ? 's' : ''} · Sent {formatDate(env.sentDate)}
            </p>
            <div className="flex flex-wrap gap-1 mt-1.5">
              {env.signers.map((s) => (
                <span
                  key={s.email}
                  className={`text-xs rounded-full px-2 py-0.5 ${getStatusColor(s.status)}`}
                >
                  {s.name} ({s.status})
                </span>
              ))}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${getStatusColor(env.status)}`}>
            {env.status}
          </span>
          {tab === 'completed' ? (
            <Button size="sm" variant="outline" onClick={handleViewSigned}>
              <Download className="h-3.5 w-3.5" /> Download
            </Button>
          ) : (
            <Button size="sm" variant="outline" asChild>
              <Link href={`/dashboard/envelopes/${env.envelopeId}`}>
                <ExternalLink className="h-3.5 w-3.5" /> View
              </Link>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
