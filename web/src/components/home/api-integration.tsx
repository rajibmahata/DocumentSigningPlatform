import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Copy, Key } from 'lucide-react';

const STEPS = [
  { num: '1', title: 'Register',         desc: 'Create a free account at signflow.app/register' },
  { num: '2', title: 'Create Merchant',  desc: 'Go to Dashboard → Merchant → Create Merchant Account' },
  { num: '3', title: 'Copy API Key',     desc: 'Your API key appears on the Merchant page. Keep it secret.' },
  { num: '4', title: 'Call the API',     desc: 'Add the X-Api-Key header to every envelope request.' },
];

export function ApiIntegration() {
  return (
    <section id="api-integration" className="py-24 bg-gray-50">
      <div className="mx-auto max-w-7xl px-6">
        <div className="grid gap-12 lg:grid-cols-2 items-center">
          {/* Left */}
          <div>
            <h2 className="text-3xl font-bold text-gray-900">Integrate in Minutes</h2>
            <p className="mt-3 text-gray-500 leading-relaxed">
              SignFlow provides a clean REST API. All you need is an API key from your merchant
              account and you can start sending envelopes from any language or platform.
            </p>

            <ol className="mt-8 space-y-4">
              {STEPS.map(({ num, title, desc }) => (
                <li key={num} className="flex gap-4">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-600 text-white text-xs font-bold">
                    {num}
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{title}</p>
                    <p className="text-xs text-gray-500">{desc}</p>
                  </div>
                </li>
              ))}
            </ol>

            <Button className="mt-8" asChild>
              <Link href="/docs">
                <Key className="h-4 w-4" /> View Full API Docs
              </Link>
            </Button>
          </div>

          {/* Right — code snippet */}
          <div className="rounded-2xl bg-gray-900 p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs text-gray-400 font-mono">POST /api/envelopes</span>
              <button className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition-colors">
                <Copy className="h-3.5 w-3.5" /> Copy
              </button>
            </div>
            <pre className="text-sm text-green-400 font-mono overflow-x-auto leading-relaxed whitespace-pre">
{`curl -X POST https://api.signflow.app/api/envelopes \\
  -H "X-Api-Key: YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "title": "Employment Contract",
    "merchantId": "YOUR_MERCHANT_ID",
    "documents": [{
      "documentTitle": "Contract",
      "documentFileName": "contract.pdf",
      "documentBase64": "BASE64_CONTENT"
    }],
    "signers": [{
      "name": "John Doe",
      "email": "john@example.com",
      "role": "signer",
      "order": 1,
      "message": "Please sign the contract."
    }]
  }'`}
            </pre>
          </div>
        </div>
      </div>
    </section>
  );
}
