import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Copy, Key, ExternalLink } from 'lucide-react';
import { apiBaseUrl, swaggerUrl } from '@/lib/config';

const SWAGGER_URL = swaggerUrl;

const STEPS = [
  { num: '1', title: 'Register',         desc: 'Create a free account at docsignerhub.com/register' },
  { num: '2', title: 'Create Merchant',  desc: 'Go to Dashboard → Merchant → Create Merchant Account' },
  { num: '3', title: 'Copy API Key',     desc: 'Your API key appears on the Merchant page. Keep it secret.' },
  { num: '4', title: 'Call the API',     desc: 'Add the X-Api-Key header to every envelope request.' },
];

export function ApiIntegration() {
  return (
    <section id="api-integration" className="py-24 bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="grid gap-12 lg:grid-cols-2 items-center">
          {/* Left */}
          <div>
            <h2 className="text-3xl font-bold text-gray-900">Integrate in Minutes</h2>
            <p className="mt-3 text-gray-500 leading-relaxed">
              DocSignerHub provides a clean REST API. All you need is an API key from your merchant
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

            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild>
                <Link href="/docs">
                  <Key className="h-4 w-4" /> View Full API Docs
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <a href={SWAGGER_URL} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4" /> Try Swagger UI
                </a>
              </Button>
            </div>
          </div>

          {/* Right — code snippet */}
          <div className="rounded-2xl bg-gray-900 p-6 shadow-xl overflow-hidden min-w-0">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs text-gray-400 font-mono">POST /api/envelopes</span>
              <button className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition-colors">
                <Copy className="h-3.5 w-3.5" /> Copy
              </button>
            </div>
            <pre className="text-sm text-green-400 font-mono overflow-x-auto leading-relaxed whitespace-pre w-full">
{`curl -X POST ${apiBaseUrl}/api/envelopes \\
  -H "X-Api-Key: YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "title": "Employment Contract",
    "merchantId": "YOUR_MERCHANT_ID",
    "documents": [{
      "documentTitle": "Contract",
      "documentFileName": "contract.pdf",  // .pdf | .doc | .docx
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
