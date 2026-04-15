import { ArrowRight } from 'lucide-react';

const FLOW = [
  { label: 'User',     color: 'bg-brand-600' },
  { label: 'REST API', color: 'bg-blue-600' },
  { label: 'Database', color: 'bg-indigo-600' },
  { label: 'Queue',    color: 'bg-purple-600' },
  { label: 'Email',    color: 'bg-pink-600' },
  { label: 'Sign Portal', color: 'bg-rose-600' },
  { label: 'Storage',  color: 'bg-orange-600' },
];

export function Architecture() {
  return (
    <section className="py-24 bg-white">
      <div className="mx-auto max-w-7xl px-6">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900">Background Architecture</h2>
          <p className="mt-3 text-gray-500 max-w-xl mx-auto">
            High-level overview of how DocSignerHub processes a document signing request.
          </p>
        </div>

        {/* Flow diagram */}
        <div className="flex flex-wrap items-center justify-center gap-2">
          {FLOW.map(({ label, color }, i) => (
            <div key={label} className="flex items-center gap-2">
              <div className={`rounded-xl ${color} px-4 py-2.5 text-white text-sm font-semibold shadow`}>
                {label}
              </div>
              {i < FLOW.length - 1 && (
                <ArrowRight className="h-4 w-4 text-gray-400" />
              )}
            </div>
          ))}
        </div>

        {/* Explanation cards */}
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {[
            {
              title: 'Token-Based Signing',
              desc: 'Each signer receives a unique HMAC-signed, time-limited URL. Tokens are single-use and expire after a configured window.',
            },
            {
              title: 'Outbox Queue Processing',
              desc: 'Emails (signing links, confirmations) and PDF stamping jobs are queued in the OutboxQueue table and processed by a background worker.',
            },
            {
              title: 'Audit Logging',
              desc: 'Every action — portal opened, signature submitted, token expired — is appended to the AuditLog with IP address, user agent, and timestamp.',
            },
            {
              title: 'PDF Stamping',
              desc: 'When a signer submits, the background stamp worker embeds the signature image and signing date into the PDF at the placeholder coordinates.',
            },
            {
              title: 'Multi-Tenant Isolation',
              desc: 'Each merchant has its own API key and envelope quota. Usage is tracked via RequestUsed. At limit, new envelopes are blocked.',
            },
            {
              title: 'eIDAS Alignment',
              desc: 'Electronic signatures meet Simple Electronic Signature (SES) requirements under eIDAS. Audit trail supports non-repudiation.',
            },
          ].map(({ title, desc }) => (
            <div key={title} className="rounded-2xl border border-gray-100 bg-gray-50 p-5">
              <h4 className="text-sm font-semibold text-gray-900">{title}</h4>
              <p className="mt-1.5 text-xs text-gray-500 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
