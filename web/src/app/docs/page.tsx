'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Copy, CheckCircle } from 'lucide-react';

/* ── Types ── */
interface Param { name: string; type: string; required: boolean; description: string }
interface Endpoint {
  id: string;
  method: 'POST' | 'GET' | 'PUT' | 'DELETE';
  path: string;
  title: string;
  description: string;
  auth?: 'bearer' | 'api-key';
  headers?: Record<string, string>;
  body?: string;
  params?: Param[];
  response?: string;
}
interface Section { id: string; title: string; endpoints: Endpoint[] }

/* ── Data ── */
const SECTIONS: Section[] = [
  {
    id: 'auth', title: 'Authentication',
    endpoints: [
      {
        id: 'register', method: 'POST', path: '/api/auth/register',
        title: 'Register',
        description: 'Create a new user account. Sends a verification email.',
        body: JSON.stringify({ name: 'Jane Doe', email: 'jane@example.com', password: 'Secure1234', country: 'GB' }, null, 2),
        response: JSON.stringify({ id: 'uuid', name: 'Jane Doe', email: 'jane@example.com', isEmailVerified: false }, null, 2),
      },
      {
        id: 'login', method: 'POST', path: '/api/auth/login',
        title: 'Login',
        description: 'Authenticate and receive a JWT access token.',
        body: JSON.stringify({ email: 'jane@example.com', password: 'Secure1234' }, null, 2),
        response: JSON.stringify({ token: 'eyJ...', userId: 'uuid', name: 'Jane Doe', email: 'jane@example.com' }, null, 2),
      },
      {
        id: 'verify-email', method: 'GET', path: '/api/auth/verify-email/{token}',
        title: 'Verify Email',
        description: 'Activate email address using the token sent to the user\'s inbox.',
        params: [{ name: 'token', type: 'string', required: true, description: 'UUID token from the verification email' }],
        response: '<!-- Returns HTML confirmation page -->',
      },
      {
        id: 'forgot-password', method: 'POST', path: '/api/auth/forgot-password',
        title: 'Forgot Password',
        description: 'Send a password reset email to the specified address.',
        body: JSON.stringify({ email: 'jane@example.com' }, null, 2),
        response: JSON.stringify({ message: 'Reset email sent.' }, null, 2),
      },
      {
        id: 'reset-password', method: 'POST', path: '/api/auth/reset-password',
        title: 'Reset Password',
        description: 'Reset password using the token from the reset email.',
        body: JSON.stringify({ token: 'uuid', newPassword: 'NewPass123' }, null, 2),
        response: JSON.stringify({ message: 'Password reset successful.' }, null, 2),
      },
    ],
  },
  {
    id: 'users', title: 'Users',
    endpoints: [
      {
        id: 'get-user', method: 'GET', path: '/api/users/{id}',
        title: 'Get User',
        description: 'Retrieve your user profile.',
        auth: 'bearer',
        params: [{ name: 'id', type: 'string', required: true, description: 'User UUID' }],
        response: JSON.stringify({ id: 'uuid', name: 'Jane Doe', email: 'jane@example.com', country: 'GB', isEmailVerified: true, accessRole: 'User' }, null, 2),
      },
      {
        id: 'update-user', method: 'PUT', path: '/api/users/{id}',
        title: 'Update User',
        description: 'Update your name or country.',
        auth: 'bearer',
        body: JSON.stringify({ name: 'Jane Smith' }, null, 2),
        response: JSON.stringify({ message: 'User updated.' }, null, 2),
      },
    ],
  },
  {
    id: 'merchants', title: 'Merchants',
    endpoints: [
      {
        id: 'create-merchant', method: 'POST', path: '/api/merchants',
        title: 'Create Merchant',
        description: 'Create a merchant account. Returns the merchant record including the API key.',
        auth: 'bearer',
        body: JSON.stringify({ userId: 'uuid', name: 'Acme Corp', description: 'Our signing integration', requestLimit: 100 }, null, 2),
        response: JSON.stringify({ id: 'uuid', name: 'Acme Corp', apiKey: 'mk_...', requestLimit: 100, requestUsed: 0, isActive: true }, null, 2),
      },
      {
        id: 'get-merchant-by-user', method: 'GET', path: '/api/merchants/by-user/{userId}',
        title: 'Get Merchant by User',
        description: 'Get all merchants belonging to a user.',
        auth: 'bearer',
        params: [{ name: 'userId', type: 'string', required: true, description: 'User UUID' }],
        response: JSON.stringify([{ id: 'uuid', apiKey: 'mk_...', requestUsed: 3 }], null, 2),
      },
      {
        id: 'get-merchant', method: 'GET', path: '/api/merchants/{id}',
        title: 'Get Merchant',
        description: 'Get a single merchant by ID.',
        auth: 'bearer',
        params: [{ name: 'id', type: 'string', required: true, description: 'Merchant UUID' }],
        response: JSON.stringify({ id: 'uuid', name: 'Acme Corp', apiKey: 'mk_...' }, null, 2),
      },
    ],
  },
  {
    id: 'envelopes', title: 'Envelopes',
    endpoints: [
      {
        id: 'create-envelope', method: 'POST', path: '/api/envelopes',
        title: 'Initiate Envelope',
        description: 'Send a signing envelope. Requires a merchant API key. Documents must contain signature placeholders.',
        auth: 'api-key',
        headers: { 'X-Api-Key': 'YOUR_API_KEY', 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Employment Contract',
          merchantId: 'merchant-uuid',
          documents: [{ documentTitle: 'Contract', documentFileName: 'contract.pdf', documentBase64: 'base64...', documentContentType: 'application/pdf' }],
          signers: [{ name: 'John Doe', email: 'john@example.com', role: 'signer1', order: 1, message: 'Please sign.' }],
        }, null, 2),
        response: JSON.stringify({ envelopeId: 'uuid', title: 'Employment Contract', status: 'Pending', sentDate: '2025-01-01T00:00:00Z', signers: [{ signingToken: 'uuid', status: 'Pending' }] }, null, 2),
      },
      {
        id: 'list-envelopes', method: 'GET', path: '/api/envelopes',
        title: 'List Envelopes',
        description: 'Get all envelopes for the authenticated merchant.',
        auth: 'api-key',
        headers: { 'X-Api-Key': 'YOUR_API_KEY' },
        response: JSON.stringify([{ envelopeId: 'uuid', title: 'Employment Contract', status: 'Signed' }], null, 2),
      },
      {
        id: 'get-envelope', method: 'GET', path: '/api/envelopes/{id}',
        title: 'Get Envelope',
        description: 'Get a single envelope including its signed document.',
        auth: 'api-key',
        headers: { 'X-Api-Key': 'YOUR_API_KEY' },
        params: [{ name: 'id', type: 'string', required: true, description: 'Envelope UUID' }],
        response: JSON.stringify({ envelopeId: 'uuid', signers: [{ signedDocumentBase64: 'base64_pdf...' }] }, null, 2),
      },
    ],
  },
  {
    id: 'portal', title: 'Sign Portal',
    endpoints: [
      {
        id: 'validate-token', method: 'GET', path: '/api/portal/validate/{token}',
        title: 'Validate Signing Token',
        description: 'Called by the signing UI to load document preview and signer identity.',
        params: [{ name: 'token', type: 'string', required: true, description: 'Signing token UUID from the email link' }],
        response: JSON.stringify({ signerName: 'John Doe', signerEmail: 'john@example.com', documentTitle: 'Contract', documentBase64: 'base64...', message: 'Please sign.' }, null, 2),
      },
      {
        id: 'submit-signature', method: 'POST', path: '/api/portal/submit/{token}',
        title: 'Submit Signature',
        description: 'Submit the drawn signature. The API stamps the PDF and marks the request signed.',
        params: [{ name: 'token', type: 'string', required: true, description: 'Signing token UUID' }],
        body: JSON.stringify({ signatureBase64: 'base64_png...' }, null, 2),
        response: JSON.stringify({ message: 'Signature submitted successfully.' }, null, 2),
      },
    ],
  },
];

const METHOD_COLOR: Record<string, string> = {
  GET:    'bg-sky-100 text-sky-700',
  POST:   'bg-green-100 text-green-700',
  PUT:    'bg-amber-100 text-amber-700',
  DELETE: 'bg-red-100 text-red-700',
};

/* ── Copy button ── */
function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      className="ml-auto flex items-center gap-1 rounded px-2 py-1 text-xs text-gray-400 hover:text-gray-200 transition"
    >
      {copied ? <CheckCircle className="h-3.5 w-3.5 text-green-400" /> : <Copy className="h-3.5 w-3.5" />}
      {copied ? 'Copied' : 'Copy'}
    </button>
  );
}

/* ── Endpoint card ── */
function EndpointCard({ ep }: { ep: Endpoint }) {
  const [open, setOpen] = useState(false);

  return (
    <div className={`rounded-xl border border-gray-200 overflow-hidden bg-white transition-all ${open ? 'shadow-md' : ''}`}>
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-4 px-5 py-4 text-left hover:bg-gray-50 transition-colors"
      >
        <span className={`rounded-md px-2.5 py-1 text-xs font-bold font-mono ${METHOD_COLOR[ep.method]}`}>
          {ep.method}
        </span>
        <code className="text-sm font-mono text-gray-700 flex-1">{ep.path}</code>
        <span className="text-sm text-gray-600 hidden md:block">{ep.title}</span>
        {ep.auth && (
          <Badge variant={ep.auth === 'bearer' ? 'default' : 'secondary'} className="hidden md:flex">
            {ep.auth === 'bearer' ? '🔐 JWT' : '🔑 API Key'}
          </Badge>
        )}
      </button>

      {open && (
        <div className="border-t border-gray-100 px-5 py-5 space-y-5">
          <p className="text-sm text-gray-600">{ep.description}</p>

          {ep.params && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Path Parameters</p>
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-gray-50 text-xs text-gray-500 text-left">
                    <th className="px-3 py-2 font-medium">Name</th>
                    <th className="px-3 py-2 font-medium">Type</th>
                    <th className="px-3 py-2 font-medium">Required</th>
                    <th className="px-3 py-2 font-medium">Description</th>
                  </tr>
                </thead>
                <tbody>
                  {ep.params.map((p) => (
                    <tr key={p.name} className="border-t border-gray-100">
                      <td className="px-3 py-2 font-mono text-xs text-gray-700">{p.name}</td>
                      <td className="px-3 py-2 text-xs text-gray-500">{p.type}</td>
                      <td className="px-3 py-2">
                        {p.required
                          ? <span className="text-xs text-red-500 font-medium">required</span>
                          : <span className="text-xs text-gray-400">optional</span>}
                      </td>
                      <td className="px-3 py-2 text-xs text-gray-600">{p.description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {ep.headers && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Headers</p>
              <div className="rounded-xl bg-gray-900 px-4 py-3 text-xs font-mono text-green-400 flex flex-col gap-1">
                {Object.entries(ep.headers).map(([k, v]) => (
                  <div key={k}><span className="text-purple-400">{k}</span>: {v}</div>
                ))}
              </div>
            </div>
          )}

          {ep.body && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Request Body</p>
              <div className="rounded-xl bg-gray-900 overflow-hidden">
                <div className="flex items-center px-4 py-2 border-b border-gray-700">
                  <span className="text-xs text-gray-500">JSON</span>
                  <CopyButton text={ep.body} />
                </div>
                <pre className="px-4 py-4 text-xs font-mono text-green-400 overflow-x-auto whitespace-pre">{ep.body}</pre>
              </div>
            </div>
          )}

          {ep.response && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Response</p>
              <div className="rounded-xl bg-gray-900 overflow-hidden">
                <div className="flex items-center px-4 py-2 border-b border-gray-700">
                  <span className="text-xs text-gray-500">200 OK</span>
                  <CopyButton text={ep.response} />
                </div>
                <pre className="px-4 py-4 text-xs font-mono text-green-400 overflow-x-auto whitespace-pre">{ep.response}</pre>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Page ── */
export default function DocsPage() {
  const [activeSection, setActiveSection] = useState(SECTIONS[0].id);
  const section = SECTIONS.find((s) => s.id === activeSection)!;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Page header */}
      <div className="border-b border-gray-200 bg-white px-6 py-6">
        <div className="mx-auto max-w-6xl">
          <h1 className="text-3xl font-bold text-gray-900">API Reference</h1>
          <p className="mt-2 text-gray-500 text-sm max-w-xl">
            All API endpoints for SignFlow. Base URL: <code className="font-mono text-brand-700">https://api.signflow.app</code>
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Badge variant="secondary">REST / JSON</Badge>
            <Badge variant="secondary">JWT Bearer</Badge>
            <Badge variant="secondary">API Key (X-Api-Key)</Badge>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl flex gap-0 py-8 px-4">
        {/* Sidebar nav */}
        <nav className="hidden md:block w-48 shrink-0 mr-8">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 px-2">Sections</p>
          <ul className="space-y-1">
            {SECTIONS.map((s) => (
              <li key={s.id}>
                <Button
                  variant={activeSection === s.id ? 'default' : 'ghost'}
                  size="sm"
                  className="w-full justify-start"
                  onClick={() => setActiveSection(s.id)}
                >
                  {s.title}
                </Button>
              </li>
            ))}
          </ul>
        </nav>

        {/* Mobile section select */}
        <div className="md:hidden w-full mb-6">
          <select
            className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm"
            value={activeSection}
            onChange={(e) => setActiveSection(e.target.value)}
          >
            {SECTIONS.map((s) => <option key={s.id} value={s.id}>{s.title}</option>)}
          </select>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <h2 className="text-xl font-bold text-gray-900 mb-5">{section.title}</h2>
          <div className="space-y-3">
            {section.endpoints.map((ep) => (
              <EndpointCard key={ep.id} ep={ep} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
