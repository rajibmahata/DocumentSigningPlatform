import { AlertTriangle } from 'lucide-react';

export function SignatureInstructions() {
  return (
    <section className="py-20 bg-white">
      <div className="mx-auto max-w-4xl px-6">
        <div className="rounded-2xl border-2 border-amber-200 bg-amber-50 p-8">
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-600">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-amber-900">
                Document Signature Placeholders (Required)
              </h3>
              <p className="mt-1 text-sm text-amber-800">
                Your PDF documents <strong>must contain</strong> these exact placeholder strings so
                SignFlow can locate where to embed the signature and date.
              </p>

              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <div className="rounded-xl bg-white border border-amber-200 p-4">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Signature Field</p>
                  <code className="block rounded-lg bg-gray-900 text-green-400 px-4 py-3 text-sm font-mono break-all">
                    {'{signature:signer:Please+Sign+Here}'}
                  </code>
                  <p className="mt-2 text-xs text-gray-500">
                    Replace <code>signer</code> with the signer&apos;s <strong>role</strong> value defined in your envelope request.
                  </p>
                </div>

                <div className="rounded-xl bg-white border border-amber-200 p-4">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Date Field</p>
                  <code className="block rounded-lg bg-gray-900 text-blue-400 px-4 py-3 text-sm font-mono break-all">
                    {'{date:signer:Date+Here}'}
                  </code>
                  <p className="mt-2 text-xs text-gray-500">
                    The signing date is automatically populated when the signer submits.
                  </p>
                </div>
              </div>

              <p className="mt-4 text-xs text-amber-700">
                💡 <strong>Tip:</strong> The label after the last colon ({'"Please+Sign+Here"'}) is the
                placeholder text visible in the document before signing. Use <code>+</code> for spaces.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
