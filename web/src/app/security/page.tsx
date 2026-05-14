import type { Metadata } from 'next';
import Link from 'next/link';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import {
  ShieldCheck, Lock, KeyRound, FileText, Award, Globe,
  Eye, Server, AlertCircle, CheckCircle, ArrowRight,
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'Security – DocSignerHub',
  description:
    'Learn how DocSignerHub keeps your documents and data secure: TLS 1.3 encryption, HMAC integrity verification, eIDAS compliance, and complete audit trails.',
};

const SECURITY_PILLARS = [
  {
    icon: Lock,
    title: 'Encryption in Transit & at Rest',
    desc: 'All data is transmitted over TLS 1.3. Documents and sensitive data are encrypted at rest using AES-256. No unencrypted data ever leaves our infrastructure.',
  },
  {
    icon: KeyRound,
    title: 'HMAC Document Integrity',
    desc: 'Every signed document is protected with HMAC-SHA256 fingerprinting. Any post-signing tampering is instantly detected and flagged in the audit trail.',
  },
  {
    icon: Award,
    title: 'eIDAS Compliance',
    desc: 'All electronic signatures meet EU eIDAS Advanced Electronic Signature (AdES) standards. Signatures are legally binding across EU member states and beyond.',
  },
  {
    icon: FileText,
    title: 'Immutable Audit Trail',
    desc: 'Every action — document view, signing attempt, rejection, completion — is timestamped and immutably logged. Full chain-of-custody for every envelope.',
  },
  {
    icon: Eye,
    title: 'Signer Identity Verification',
    desc: 'Signers are authenticated via email-based unique tokens. IP address, user agent, and timestamp are recorded with every signing event.',
  },
  {
    icon: Server,
    title: 'Infrastructure Security',
    desc: 'API servers are isolated behind network security groups. API keys are hashed before storage. CORS and CSRF protections are enforced on all endpoints.',
  },
  {
    icon: AlertCircle,
    title: 'Rate Limiting & Abuse Prevention',
    desc: 'All API endpoints are rate-limited per merchant key. Suspicious patterns trigger automatic alerts and temporary key suspension.',
  },
  {
    icon: Globe,
    title: 'Webhook Security',
    desc: 'Webhooks are delivered with HMAC-SHA256 signatures. Verify every payload using your webhook secret to ensure authenticity.',
  },
];

const COMPLIANCE_ITEMS = [
  { label: 'EU eIDAS Regulation',      status: 'Compliant', color: 'text-green-600 bg-green-50 border-green-200' },
  { label: 'TLS 1.3 Transport',         status: 'Enforced',  color: 'text-green-600 bg-green-50 border-green-200' },
  { label: 'AES-256 Data Encryption',   status: 'Active',    color: 'text-green-600 bg-green-50 border-green-200' },
  { label: 'HMAC-SHA256 Integrity',     status: 'Active',    color: 'text-green-600 bg-green-50 border-green-200' },
  { label: 'Immutable Audit Logging',   status: 'Active',    color: 'text-green-600 bg-green-50 border-green-200' },
  { label: 'CORS & CSRF Protection',    status: 'Enforced',  color: 'text-green-600 bg-green-50 border-green-200' },
  { label: 'API Rate Limiting',         status: 'Enforced',  color: 'text-green-600 bg-green-50 border-green-200' },
  { label: 'Webhook Signature Verify',  status: 'Supported', color: 'text-green-600 bg-green-50 border-green-200' },
];

export default function SecurityPage() {
  return (
    <>
      <Header />
      <main>
        {/* Hero */}
        <section className="bg-gradient-to-b from-slate-900 to-slate-800 py-24 px-6 text-white text-center">
          <div className="mx-auto max-w-3xl">
            <div className="flex justify-center mb-6">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-green-500/20">
                <ShieldCheck className="h-8 w-8 text-green-400" />
              </div>
            </div>
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
              Security you can trust
            </h1>
            <p className="mt-5 text-lg text-slate-300 leading-relaxed">
              DocSignerHub is built with security as a first principle — not an afterthought.
              Every document, every signature, every byte of data is protected.
            </p>
          </div>
        </section>

        {/* Security pillars */}
        <section className="py-20 px-6">
          <div className="mx-auto max-w-6xl">
            <h2 className="text-2xl font-bold text-gray-900 text-center mb-12">
              How we protect your documents
            </h2>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {SECURITY_PILLARS.map((p) => {
                const Icon = p.icon;
                return (
                  <div key={p.title} className="rounded-2xl border border-gray-100 bg-white p-6">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-50 mb-4">
                      <Icon className="h-5 w-5 text-green-600" />
                    </div>
                    <h3 className="font-semibold text-gray-900">{p.title}</h3>
                    <p className="mt-2 text-sm text-gray-500 leading-relaxed">{p.desc}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Compliance checklist */}
        <section className="py-16 px-6 bg-gray-50">
          <div className="mx-auto max-w-3xl">
            <h2 className="text-2xl font-bold text-gray-900 text-center mb-10">Compliance status</h2>
            <div className="space-y-3">
              {COMPLIANCE_ITEMS.map((item) => (
                <div
                  key={item.label}
                  className="flex items-center justify-between rounded-xl bg-white border border-gray-100 px-5 py-4"
                >
                  <div className="flex items-center gap-3">
                    <CheckCircle className="h-4 w-4 shrink-0 text-green-500" />
                    <span className="text-sm font-medium text-gray-700">{item.label}</span>
                  </div>
                  <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${item.color}`}>
                    {item.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Responsible disclosure */}
        <section className="py-16 px-6">
          <div className="mx-auto max-w-3xl text-center">
            <div className="rounded-2xl border border-amber-100 bg-amber-50 p-8">
              <AlertCircle className="h-8 w-8 text-amber-600 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-gray-900 mb-3">Responsible Disclosure</h2>
              <p className="text-sm text-gray-600 leading-relaxed mb-5">
                We take all security reports seriously. If you discover a vulnerability in DocSignerHub,
                please report it responsibly. We commit to acknowledging reports within 24 hours and
                resolving critical issues within 72 hours.
              </p>
              <Link
                href="/contact"
                className="inline-flex items-center gap-2 rounded-xl bg-amber-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-amber-700 transition-colors"
              >
                Report a vulnerability <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
