import {
  ShieldCheck, Clock, FileCheck, Layers, Lock, BellRing,
  FileText, Globe, BarChart2, Users, FileBadge,
} from 'lucide-react';

const FEATURES = [
  { icon: ShieldCheck, title: 'eIDAS Compliant',       desc: 'Meets EU electronic signature regulations for legal validity.' },
  { icon: Lock,        title: 'Secure Token Signing',   desc: 'HMAC-secured, expiring, single-use signing tokens per signer.' },
  { icon: Layers,      title: 'Multi-Signer Support',   desc: 'Define signer order and roles — each receives their own link.' },
  { icon: FileBadge,   title: 'PDF · DOC · DOCX',       desc: 'Upload PDF, Word DOC, or DOCX files. Each signer receives only their assigned document.' },
  { icon: FileCheck,   title: 'Document Stamping',       desc: 'Signature and date automatically embedded into PDF, DOC, and DOCX files after signing.' },
  { icon: Clock,       title: 'Audit Trail',            desc: 'Every action logged: portal opened, signed, IP, user agent.' },
  { icon: BellRing,    title: 'Email Notifications',    desc: 'Signers and senders get confirmation emails on completion.' },
  { icon: FileText,    title: 'API-First Design',       desc: 'Full REST API — integrate signing into your own product.' },
  { icon: Globe,       title: 'Multi-Tenant',           desc: 'Each merchant has isolated keys, usage limits, and audit logs.' },
  { icon: BarChart2,   title: 'Analytics Dashboard',    desc: 'Real-time charts for user growth, envelopes sent, and document completion trends.' },
  { icon: Users,       title: 'Admin Management',       desc: 'Manage users, roles, and merchant accounts from a secure admin panel.' },
];

export function Features() {
  return (
    <section id="features" className="py-24 bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="text-center mb-14">
          <h2 className="text-3xl font-bold text-gray-900">Everything You Need</h2>
          <p className="mt-3 text-gray-500 max-w-xl mx-auto">
            Built for developers and businesses who need reliable, legal eSign workflows.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {FEATURES.map(({ icon: Icon, title, desc }) => (
            <div
              key={title}
              className="rounded-2xl bg-white border border-gray-100 p-6 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-600 mb-4">
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
              <p className="mt-1.5 text-xs text-gray-500 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
