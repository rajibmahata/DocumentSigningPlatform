'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import { useQuery, useMutation } from '@tanstack/react-query';
import { portalApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { base64ToBlob } from '@/lib/utils';
import { CheckCircle, Eraser, PenLine, FileText, AlertTriangle } from 'lucide-react';
import SignatureCanvas from 'react-signature-canvas';

export default function SignPage() {
  const { token }     = useParams<{ token: string }>();
  const sigRef        = useRef<SignatureCanvas>(null);
  const [done, setDone] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  const { data: preview, isLoading, isError } = useQuery({
    queryKey: ['portal', token],
    queryFn: () => portalApi.validate(token).then((r) => r.data),
    retry: false,
  });

  useEffect(() => {
    if (preview?.documentBase64) {
      const blob = base64ToBlob(preview.documentBase64, 'application/pdf');
      setPdfUrl(URL.createObjectURL(blob));
    }
    return () => { if (pdfUrl) URL.revokeObjectURL(pdfUrl); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const handleSign = () => {
    if (!sigRef.current || sigRef.current.isEmpty()) {
      toast.error('Please draw your signature first.');
      return;
    }
    const dataUrl = sigRef.current.getTrimmedCanvas().toDataURL('image/png');
    const base64 = dataUrl.split(',')[1];
    mutation.mutate(base64);
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-brand-600 border-t-transparent" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <Card className="max-w-md w-full">
          <CardContent className="flex flex-col items-center py-12 text-center">
            <AlertTriangle className="h-14 w-14 text-red-400 mb-4" />
            <h2 className="text-xl font-bold text-gray-900">Invalid or Expired Link</h2>
            <p className="mt-2 text-sm text-gray-500">
              This signing link is invalid or has already been used.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (done) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <Card className="max-w-md w-full">
          <CardContent className="flex flex-col items-center py-12 text-center">
            <CheckCircle className="h-16 w-16 text-green-500 mb-4 animate-bounce" />
            <h2 className="text-2xl font-bold text-gray-900">Document Signed!</h2>
            <p className="mt-2 text-sm text-gray-500">
              Your signature has been recorded. You will receive a copy by email shortly.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-gray-200 bg-white px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2 font-bold text-brand-700 text-lg">
          <FileText className="h-5 w-5" /> DocSignerHub
        </div>
        <p className="text-sm text-gray-500 truncate max-w-xs">{preview?.documentFileName}</p>
      </header>

      <div className="mx-auto max-w-4xl px-4 py-8 space-y-6">
        {/* Signer info */}
        <div className="rounded-xl bg-brand-50 border border-brand-100 px-5 py-3 text-sm text-brand-800">
          Signing as <strong>{preview?.claimantName}</strong>
          {preview?.signerEmail && <> · {preview.signerEmail}</>}
        </div>

        {/* Message */}
        {preview?.message && (
          <Card>
            <CardContent className="px-5 py-3">
              <p className="text-sm text-gray-600 italic">&ldquo;{preview.message}&rdquo;</p>
            </CardContent>
          </Card>
        )}

        {/* PDF Preview */}
        {pdfUrl && (
          <Card>
            <CardHeader><CardTitle className="text-base">Document Preview</CardTitle></CardHeader>
            <CardContent className="p-0 overflow-hidden rounded-b-xl">
              <iframe
                src={pdfUrl}
                title="Document Preview"
                className="w-full h-[600px] border-0"
              />
            </CardContent>
          </Card>
        )}

        {/* Signature Pad */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <PenLine className="h-4 w-4" /> Draw Your Signature
            </CardTitle>
            <Button type="button" variant="ghost" size="sm" onClick={() => sigRef.current?.clear()}>
              <Eraser className="h-4 w-4" /> Clear
            </Button>
          </CardHeader>
          <CardContent>
            <div className="rounded-xl border-2 border-dashed border-gray-200 bg-white overflow-hidden">
              <SignatureCanvas
                ref={sigRef}
                penColor="#1e40af"
                canvasProps={{
                  className: 'w-full',
                  height: 200,
                }}
              />
            </div>
            <p className="mt-2 text-xs text-gray-400 text-center">
              Draw your signature in the box above.
            </p>
          </CardContent>
        </Card>

        {/* Submit */}
        <div className="flex justify-end">
          <Button
            size="lg"
            onClick={handleSign}
            loading={mutation.isPending}
            className="w-full sm:w-auto"
          >
            <CheckCircle className="h-5 w-5" />
            Submit Signature
          </Button>
        </div>
      </div>
    </div>
  );
}
