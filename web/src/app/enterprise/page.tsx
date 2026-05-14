import type { Metadata } from 'next';
import Link from 'next/link';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import {
  Building2, ShieldCheck, Users, Globe, Webhook, LifeBuoy,
  CheckCircle, ArrowRight, Cpu, FileText,
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'Enterprise – DocSignerHub',
  description:
    'Enterprise-grade digital signing with unlimited envelopes, dedicated support, custom SLAs, white-label branding, and full API access. Contact us for a custom quote.',
};

const ENTERPRISE_FEATURES = [
  { icon: Globe,      title: 'Unlimited Envelopes',       desc: 'No monthly limits. Send as many signing envelopes as your business requires.'                  },
  { icon: ShieldCheck, title: 'eIDAS Advanced Compliance', desc: 'Full eIDAS AdES compliance with custom audit packages available for regulated industries.'     },
  { icon: Building2,  title: 'White-label Branding',      desc: 'Replace DocSignerHub branding with your own logo, colours, and custom email domain.'           },
  { icon: Webhook,    title: 'Advanced Webhooks & API',   desc: 'Higher rate limits, dedicated API keys, IP allowlisting, and priority webhook delivery.'        },
  { icon: Users,      title: 'Team Management',           desc: 'Multiple users, roles, and merchant accounts under one enterprise umbrella.'                    },
  { icon: Cpu,        title: 'AI Document Analysis',      desc: 'AI-powered document review, classification, and workflow suggestions for large document volumes.' },
  { icon: LifeBuoy,   title: 'Dedicated Account Manager', desc: 'A named contact for onboarding, training, and ongoing strategic guidance.'                       },
  { icon: FileText,   title: 'Custom SLA',                desc: 'Uptime guarantees, incident response times, and custom data residency options.'                   },
];

const TESTIMONIALS = [
  {
    quote: 'DocSignerHub cut our contract turnaround from 5 days to under 2 hours. The API is clean and the audit trail is exactly what our legal team needed.',
    author: 'Sarah Chen',
    role: 'Head of Legal Operations',
    company: 'TechCorp Ltd',
    initials: 'SC',
  },
  {
    quote: 'We sign thousands of documents per month. Unlimited envelopes, webhooks that actually work, and support that picks up the phone — what more could you ask for?',
    author: 'Marcus Obi',
    role: 'CTO',
    company: 'FinTrust Financial',
    initials: 'MO',
  },
  {
    quote: 'The white-label feature was the dealbreaker for us. Our clients never leave our platform — DocSignerHub runs completely under our brand.',
    author: 'Elena Vasquez',
    role: 'Product Director',
    company: 'DocFlow Agency',
    initials: 'EV',
  },
];

export default function EnterprisePage() {
  return (
    <>
      <Header />
      <main>
        {/* Hero */}
        <section className="bg-gradient-to-b from-slate-900 to-slate-800 py-24 px-6 text-white text-center">
          <div className="mx-auto max-w-3xl">
            <span className="inline-block rounded-full bg-amber-400/20 px-4 py-1.5 text-xs font-semibold text-amber-300 mb-4">
              Enterprise Plan
            </span>
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
              Signing infrastructure built for scale
            </h1>
            <p className="mt-5 text-lg text-slate-300 leading-relaxed">
              Unlimited envelopes, dedicated support, custom SLAs, and white-label options —
              everything your enterprise needs to sign with confidence.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                href="/contact"
                className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-7 py-3 text-sm font-semibold text-white hover:bg-brand-700 transition-colors"
              >
                Contact sales <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/features"
                className="inline-flex items-center gap-2 rounded-xl border border-white/20 px-7 py-3 text-sm font-semibold text-white hover:bg-white/10 transition-colors"
              >
                View all features
              </Link>
            </div>
          </div>
        </section>

        {/* Features grid */}
        <section className="py-20 px-6">
          <div className="mx-auto max-w-6xl">
            <h2 className="text-2xl font-bold text-gray-900 text-center mb-12">
              Everything in Pro, plus
            </h2>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {ENTERPRISE_FEATURES.map((f) => {
                const Icon = f.icon;
                return (
                  <div key={f.title} className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 mb-4">
                      <Icon className="h-5 w-5 text-amber-600" />
                    </div>
                    <h3 className="font-semibold text-gray-900">{f.title}</h3>
                    <p className="mt-2 text-sm text-gray-500 leading-relaxed">{f.desc}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* What's included */}
        <section className="py-16 px-6 bg-gray-50">
          <div className="mx-auto max-w-4xl">
            <h2 className="text-2xl font-bold text-gray-900 text-center mb-10">What you get</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                'Unlimited envelopes per month',
                'All document formats (PDF, DOCX, and more)',
                'Full audit trail with export',
                'REST API with unlimited requests',
                'Real-time webhooks with retry guarantees',
                'Bulk send via API',
                'White-label branding & custom domain',
                'Multiple team members & merchant accounts',
                'Dedicated account manager',
                'Custom SLA with uptime guarantees',
                'AI document review & classification',
                'Onboarding & integration support',
              ].map((item) => (
                <div key={item} className="flex items-center gap-3 rounded-xl bg-white border border-gray-100 px-4 py-3">
                  <CheckCircle className="h-4 w-4 shrink-0 text-green-500" />
                  <span className="text-sm text-gray-700">{item}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Testimonials */}
        <section className="py-20 px-6">
          <div className="mx-auto max-w-5xl">
            <h2 className="text-2xl font-bold text-gray-900 text-center mb-12">Trusted by teams worldwide</h2>
            <div className="grid gap-6 md:grid-cols-3">
              {TESTIMONIALS.map((t) => (
                <div key={t.author} className="rounded-2xl border border-gray-100 bg-white p-6">
                  <p className="text-sm text-gray-600 leading-relaxed italic">&ldquo;{t.quote}&rdquo;</p>
                  <div className="mt-4 flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-700">
                      {t.initials}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{t.author}</p>
                      <p className="text-xs text-gray-500">{t.role}, {t.company}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-20 px-6 bg-brand-600 text-center">
          <div className="mx-auto max-w-xl">
            <h2 className="text-2xl font-bold text-white">Ready to talk?</h2>
            <p className="mt-3 text-brand-100">
              Our sales team will build you a custom plan that fits your volume, compliance requirements, and budget.
            </p>
            <Link
              href="/contact"
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-semibold text-brand-700 hover:bg-brand-50 transition-colors"
            >
              Contact sales <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
