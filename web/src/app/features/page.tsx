import type { Metadata } from 'next';
import Link from 'next/link';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import {
  Send, PenTool, LayoutTemplate, Webhook, Bell, ShieldCheck,
  FileText, Users, Cpu, Globe, Award, ArrowRight,
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'Features – DocSignerHub',
  description:
    'Explore all features of DocSignerHub: e-signing workflows, eIDAS compliance, REST API, webhooks, audit trails, bulk send, templates, and more.',
};

const FEATURE_SECTIONS = [
  {
    id: 'signing',
    badge: 'Core Signing',
    badgeColor: 'bg-brand-100 text-brand-700',
    heading: 'Powerful document signing',
    description:
      'Everything you need to collect legally binding digital signatures at scale — with full compliance baked in.',
    icon: PenTool,
    iconBg: 'bg-brand-50',
    iconColor: 'text-brand-600',
    features: [
      { icon: Send,        title: 'Send Envelopes',         desc: 'Upload documents (PDF/DOCX), add signers with roles and signing order, send with a click.'    },
      { icon: PenTool,     title: 'Draw or Type Signatures', desc: 'Signers draw with mouse/finger or type in a handwriting font — no account needed.'          },
      { icon: FileText,    title: 'Multi-document Envelopes', desc: 'Group multiple documents into a single envelope for a streamlined signing experience.'        },
      { icon: Users,       title: 'Multi-signer Workflows',  desc: 'Sequential or parallel signing orders — signers are notified automatically in the right order.' },
    ],
  },
  {
    id: 'automation',
    badge: 'Automation',
    badgeColor: 'bg-violet-100 text-violet-700',
    heading: 'Save time with templates & workflows',
    description:
      'Create reusable templates for recurring agreements and build visual workflow automations to eliminate manual steps.',
    icon: LayoutTemplate,
    iconBg: 'bg-violet-50',
    iconColor: 'text-violet-600',
    features: [
      { icon: LayoutTemplate, title: 'Document Templates',    desc: 'Define signer lists and default titles once. Reuse for contracts, NDAs, and onboarding.'          },
      { icon: Cpu,            title: 'Visual Workflow Builder', desc: 'Drag-and-drop automation canvas: emails, approvals, conditions, delays, webhooks.'              },
      { icon: Send,           title: 'Bulk Send',              desc: 'Send the same envelope to hundreds of recipients in one operation via the API.'                   },
      { icon: Bell,           title: 'Automated Reminders',    desc: 'Configure expiry alerts so signers are reminded before their links expire.'                       },
    ],
  },
  {
    id: 'compliance',
    badge: 'Compliance & Security',
    badgeColor: 'bg-green-100 text-green-700',
    heading: 'eIDAS-grade compliance',
    description:
      'Every signature is legally binding under EU eIDAS regulations, with a complete tamper-proof audit trail.',
    icon: ShieldCheck,
    iconBg: 'bg-green-50',
    iconColor: 'text-green-600',
    features: [
      { icon: ShieldCheck, title: 'eIDAS Compliance',    desc: 'All electronic signatures meet EU eIDAS Advanced Electronic Signature (AdES) standards.'         },
      { icon: Award,       title: 'Signing Certificates', desc: 'Each signed document is issued a PDF certificate with timestamp and signer identity data.'         },
      { icon: FileText,    title: 'Audit Trail',          desc: 'Every view, signing attempt, rejection, and completion is immutably logged with timestamps.'        },
      { icon: ShieldCheck, title: 'HMAC Integrity',       desc: 'Documents are HMAC-SHA256 verified to detect any post-signing tampering instantly.'                 },
    ],
  },
  {
    id: 'integration',
    badge: 'Developer Integration',
    badgeColor: 'bg-amber-100 text-amber-700',
    heading: 'Built for developers',
    description:
      'A clean REST API, real-time webhooks, and comprehensive documentation so you can integrate in minutes.',
    icon: Globe,
    iconBg: 'bg-amber-50',
    iconColor: 'text-amber-600',
    features: [
      { icon: Globe,   title: 'REST API',             desc: 'Full-featured JSON API with API key auth. Create envelopes, manage signers, download signed PDFs.' },
      { icon: Webhook, title: 'Real-time Webhooks',   desc: 'Subscribe to envelope events: processing, sent, signed, completed, expired, rejected, cancelled.'   },
      { icon: FileText, title: 'API Documentation',   desc: 'Interactive docs with cURL examples, endpoint descriptions, and response schemas.'                   },
      { icon: Cpu,     title: 'AI-Powered Features',  desc: 'AI document review, smart classification, and workflow suggestions powered by DeepSeek.'             },
    ],
  },
];

export default function FeaturesPage() {
  return (
    <>
      <Header />
      <main>
        {/* Hero */}
        <section className="bg-gradient-to-b from-brand-50 to-white py-20 px-6">
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
              Everything you need to sign smarter
            </h1>
            <p className="mt-4 text-lg text-gray-600">
              From simple signature requests to enterprise-grade automation — DocSignerHub has you covered.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                href="/register"
                className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-6 py-3 text-sm font-semibold text-white hover:bg-brand-700 transition-colors"
              >
                Get started free <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/pricing"
                className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-6 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
              >
                See pricing
              </Link>
            </div>
          </div>
        </section>

        {/* Feature sections */}
        {FEATURE_SECTIONS.map((section, idx) => {
          const Icon = section.icon;
          return (
            <section
              key={section.id}
              className={`py-20 px-6 ${idx % 2 === 1 ? 'bg-gray-50' : 'bg-white'}`}
            >
              <div className="mx-auto max-w-6xl">
                <div className="mb-10">
                  <span className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${section.badgeColor} mb-3`}>
                    {section.badge}
                  </span>
                  <h2 className="text-2xl font-bold text-gray-900 sm:text-3xl">{section.heading}</h2>
                  <p className="mt-3 text-gray-600 max-w-2xl">{section.description}</p>
                </div>

                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                  {section.features.map((f) => {
                    const FIcon = f.icon;
                    return (
                      <div key={f.title} className="rounded-2xl border border-gray-100 bg-white p-6">
                        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${section.iconBg} mb-4`}>
                          <FIcon className={`h-5 w-5 ${section.iconColor}`} />
                        </div>
                        <h3 className="font-semibold text-gray-900">{f.title}</h3>
                        <p className="mt-2 text-sm text-gray-500 leading-relaxed">{f.desc}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>
          );
        })}

        {/* CTA */}
        <section className="py-20 px-6 bg-brand-600 text-center">
          <div className="mx-auto max-w-xl">
            <h2 className="text-2xl font-bold text-white">Start signing for free today</h2>
            <p className="mt-3 text-brand-100">
              No credit card required. 5 free envelopes per month, forever.
            </p>
            <Link
              href="/register"
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-semibold text-brand-700 hover:bg-brand-50 transition-colors"
            >
              Create free account <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
