import {
  ShieldCheck, Clock, FileCheck, Layers, Lock, BellRing,
  FileText, Globe, BarChart2, Users, FileBadge,
  Brain, ScanText, Send, CreditCard, Fingerprint, Link2, Palette, GitBranch,
} from 'lucide-react';

const CORE_FEATURES = [
  { icon: ShieldCheck, title: 'eIDAS Compliant',       desc: 'Meets EU electronic signature regulations for legal validity across all member states.' },
  { icon: Lock,        title: 'Secure Token Signing',   desc: 'HMAC-secured, expiring, single-use signing tokens per signer — impossible to reuse or forge.' },
  { icon: Layers,      title: 'Multi-Signer Support',   desc: 'Define signer order and roles — each recipient receives their own unique secure link.' },
  { icon: FileBadge,   title: 'PDF · DOC · DOCX',       desc: 'Upload any format. Signature stamped directly into the document at the <<SIGNATURE>> marker.' },
  { icon: FileCheck,   title: 'Document Stamping',       desc: 'Drawn or typed signatures embedded as images into PDF, DOC, and DOCX after signing.' },
  { icon: Clock,       title: 'Hash-Chained Audit Trail', desc: 'Every action HMAC-linked to the previous — tamper-evident, court-admissible log.' },
  { icon: BellRing,    title: 'Smart Notifications',    desc: 'Customisable reminders, completion emails, and real-time webhook events to your server.' },
  { icon: FileText,    title: 'API-First Design',       desc: 'Full REST API with Swagger UI — embed signing into your product in minutes.' },
  { icon: Globe,       title: 'Multi-Tenant',           desc: 'Each merchant has isolated API keys, usage limits, branding, and audit logs.' },
  { icon: BarChart2,   title: 'Analytics Dashboard',    desc: 'Real-time charts for user growth, envelopes sent, and document completion trends.' },
  { icon: Users,       title: 'Admin Management',       desc: 'Manage users, roles, merchants, and support tickets from a secure admin panel.' },
  { icon: GitBranch,   title: 'Visual Workflow Engine', desc: 'Drag-and-drop workflow builder with 10 node types — automate approvals, emails, delays, and AI actions.' },
];

const AI_FEATURES = [
  { icon: Brain,       title: 'AI Clause Summariser',   desc: 'GPT-4o-mini reads your contract and highlights key obligations, risks, and renewal clauses automatically.' },
  { icon: ScanText,    title: 'OCR Field Detection',    desc: 'Computer-vision scans uploaded documents and auto-populates signature fields — no manual placement.' },
  { icon: Send,        title: 'Bulk CSV Send',          desc: 'Upload a CSV of 1 000+ recipients and a template — personalised envelopes dispatched in one click.' },
  { icon: CreditCard,  title: 'Stripe Payment Gate',    desc: 'Collect payment before or after signing via Stripe. Webhook confirms payment before envelope completes.' },
  { icon: Fingerprint, title: 'ID Verification',        desc: 'Signer uploads a government-issued ID; AI scores confidence and auto-approves or queues for manual review.' },
  { icon: Link2,       title: 'Blockchain Notarisation',desc: 'Document hash written to Polygon/Ethereum. Immutable proof-of-existence, verifiable by anyone forever.' },
  { icon: Palette,     title: 'White-Label Branding',   desc: 'Custom domain, logo, primary colour, and email sender name — your brand, our infrastructure.' },
  { icon: ShieldCheck, title: 'Per-Merchant Feature Flags', desc: 'Toggle AI, OCR, blockchain, and payment features per merchant — charge only for what they use.' },
];

export function Features() {
  return (
    <section id="features" className="py-24 bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        {/* Core features */}
        <div className="text-center mb-14">
          <span className="inline-block rounded-full bg-brand-50 border border-brand-200 px-4 py-1 text-xs font-semibold uppercase tracking-widest text-brand-700 mb-4">
            Core Platform
          </span>
          <h2 className="text-3xl font-bold text-gray-900">Everything You Need to Sign Smarter</h2>
          <p className="mt-3 text-gray-500 max-w-xl mx-auto">
            Built for developers and businesses who need reliable, legally-binding eSign workflows at scale.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-20">
          {CORE_FEATURES.map(({ icon: Icon, title, desc }) => (
            <div
              key={title}
              className="rounded-2xl bg-white border border-gray-100 p-6 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-600 mb-4">
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
              <p className="mt-1.5 text-xs text-gray-500 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>

        {/* Phase 1 AI/Automation features */}
        <div className="rounded-3xl bg-gradient-to-br from-indigo-950 via-blue-950 to-gray-950 p-10">
          <div className="text-center mb-12">
            <span className="inline-block rounded-full bg-indigo-500/20 border border-indigo-400/30 px-4 py-1 text-xs font-semibold uppercase tracking-widest text-indigo-300 mb-4">
              Phase 1 — AI &amp; Automation
            </span>
            <h2 className="text-3xl font-bold text-white">Next-Generation Features</h2>
            <p className="mt-3 text-gray-400 max-w-xl mx-auto">
              AI-powered analysis, automated workflows, payments, identity verification, and blockchain notarisation — all under one API.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {AI_FEATURES.map(({ icon: Icon, title, desc }) => (
              <div
                key={title}
                className="rounded-2xl bg-white/5 border border-white/10 p-5 hover:bg-white/10 transition-colors"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/20 text-indigo-300 mb-3">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="text-sm font-semibold text-white">{title}</h3>
                <p className="mt-1.5 text-xs text-gray-400 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
