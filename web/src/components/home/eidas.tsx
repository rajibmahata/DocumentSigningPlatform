import { ShieldCheck, FileLock, History, Globe } from 'lucide-react';

const POINTS = [
  {
    icon: ShieldCheck,
    title: 'Legally Valid Signatures',
    desc: 'DocSignerHub produces Simple Electronic Signatures (SES) recognised under EU Regulation No 910/2014 (eIDAS). Signed documents are admissible as evidence in EU member state courts.',
  },
  {
    icon: FileLock,
    title: 'Secure Signing Process',
    desc: 'Documents are transmitted over TLS. Signing tokens are HMAC-signed and expire. Signed PDF bytes are preserved unchanged after stamping.',
  },
  {
    icon: History,
    title: 'Immutable Audit Trail',
    desc: 'Every event — invitation sent, portal opened, signature submitted — is logged with timestamp, IP, and user agent to create an irrefutable audit record.',
  },
  {
    icon: Globe,
    title: 'Identity & Consent',
    desc: 'Signers authenticate via their email (possession factor) plus optional password. The explicit submit action constitutes informed consent to the document.',
  },
];

export function EidasSection() {
  return (
    <section id="eidas" className="py-24 bg-gradient-to-br from-brand-700 to-brand-900 text-white">
      <div className="mx-auto max-w-7xl px-6">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-sm font-medium mb-4">
            <ShieldCheck className="h-4 w-4" />
            eIDAS Compliance
          </div>
          <h2 className="text-3xl font-bold">Built for Legal Validity</h2>
          <p className="mt-3 text-brand-200 max-w-xl mx-auto">
            DocSignerHub aligns with EU eIDAS guidelines to ensure your signed documents carry legal weight.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {POINTS.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="rounded-2xl bg-white/10 border border-white/10 p-6 backdrop-blur-sm">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/20 mb-4">
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="text-sm font-semibold">{title}</h3>
              <p className="mt-2 text-xs text-brand-200 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>

        <p className="mt-10 text-center text-xs text-brand-300">
          * SES (Simple Electronic Signature) under eIDAS Article 3(10). For AES/QES requirements, consult your legal counsel.
        </p>
      </div>
    </section>
  );
}
