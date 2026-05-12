import type { Metadata } from 'next';
import Link from 'next/link';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { CheckCircle, X, Zap, Building2, Sparkles, ArrowRight } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Pricing – DocSignerHub',
  description:
    'Simple, transparent pricing for every business. Start free, upgrade as you grow. eIDAS-compliant digital signing with no hidden fees.',
};

const PLANS = [
  {
    name: 'Free',
    price: '$0',
    period: '/month',
    description: 'Perfect for individuals trying out digital signing.',
    icon: Building2,
    iconBg: 'bg-gray-100',
    iconColor: 'text-gray-600',
    cta: 'Get Started Free',
    ctaHref: '/register',
    ctaVariant: 'outline' as const,
    highlight: false,
    features: [
      { text: '5 envelopes per month',        included: true  },
      { text: 'PDF document support',          included: true  },
      { text: 'Email notifications',           included: true  },
      { text: 'Audit trail',                   included: true  },
      { text: 'API access',                    included: false },
      { text: 'Webhook integrations',          included: false },
      { text: 'Custom branding',               included: false },
      { text: 'Priority support',              included: false },
    ],
  },
  {
    name: 'Starter',
    price: '$19',
    period: '/month',
    description: 'For freelancers and small teams getting things done.',
    icon: Zap,
    iconBg: 'bg-brand-100',
    iconColor: 'text-brand-600',
    cta: 'Start Starter Plan',
    ctaHref: '/register',
    ctaVariant: 'default' as const,
    highlight: false,
    features: [
      { text: '50 envelopes per month',        included: true  },
      { text: 'PDF document support',          included: true  },
      { text: 'Email notifications',           included: true  },
      { text: 'Full audit trail',              included: true  },
      { text: 'REST API access',               included: true  },
      { text: 'Webhook integrations',          included: true  },
      { text: 'Custom branding',               included: false },
      { text: 'Priority support',              included: false },
    ],
  },
  {
    name: 'Pro',
    price: '$49',
    period: '/month',
    description: 'For growing businesses with higher volumes and advanced needs.',
    icon: Sparkles,
    iconBg: 'bg-violet-100',
    iconColor: 'text-violet-600',
    cta: 'Start Pro Plan',
    ctaHref: '/register',
    ctaVariant: 'default' as const,
    highlight: true,
    features: [
      { text: '200 envelopes per month',       included: true  },
      { text: 'PDF & DOCX support',            included: true  },
      { text: 'Email notifications',           included: true  },
      { text: 'Full audit trail + export',     included: true  },
      { text: 'REST API access',               included: true  },
      { text: 'Webhook integrations',          included: true  },
      { text: 'Custom branding',               included: true  },
      { text: 'Priority email support',        included: true  },
    ],
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    period: '',
    description: 'Unlimited signing, dedicated support, and SLA guarantees.',
    icon: Building2,
    iconBg: 'bg-amber-100',
    iconColor: 'text-amber-600',
    cta: 'Contact Sales',
    ctaHref: '/contact',
    ctaVariant: 'outline' as const,
    highlight: false,
    features: [
      { text: 'Unlimited envelopes',           included: true  },
      { text: 'All document formats',          included: true  },
      { text: 'Advanced notifications',        included: true  },
      { text: 'Full audit trail + export',     included: true  },
      { text: 'REST API + bulk send',          included: true  },
      { text: 'Webhook integrations',          included: true  },
      { text: 'White-label / custom branding', included: true  },
      { text: 'Dedicated account manager',     included: true  },
    ],
  },
];

const FAQS = [
  {
    q: 'Can I change plans at any time?',
    a: 'Yes. Contact our support team and we will upgrade or downgrade your plan immediately with pro-rated billing.',
  },
  {
    q: 'What counts as an "envelope"?',
    a: 'Each envelope you send to signers counts as one envelope usage, regardless of the number of documents or signers included.',
  },
  {
    q: 'Is DocSignerHub legally binding?',
    a: 'Yes. All signatures are eIDAS-compliant, timestamped, and stored with a complete audit trail. Each signed document is HMAC-verified.',
  },
  {
    q: 'Do you offer a free trial?',
    a: 'The Free plan gives you 5 envelopes per month forever — no credit card needed. For higher plans, contact us for a trial extension.',
  },
  {
    q: 'Is my data secure?',
    a: 'All data is encrypted in transit (TLS 1.3) and at rest. Documents are processed in isolated environments. See our Security page for details.',
  },
];

export default function PricingPage() {
  return (
    <>
      <Header />
      <main>
        {/* Hero */}
        <section className="bg-gradient-to-b from-brand-50 to-white py-20 px-6">
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
              Simple, transparent pricing
            </h1>
            <p className="mt-4 text-lg text-gray-600">
              Start free, scale when you&apos;re ready. No hidden fees — ever.
            </p>
          </div>
        </section>

        {/* Plans grid */}
        <section className="py-16 px-6">
          <div className="mx-auto max-w-7xl grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {PLANS.map((plan) => {
              const Icon = plan.icon;
              return (
                <div
                  key={plan.name}
                  className={`relative flex flex-col rounded-2xl border p-8 ${
                    plan.highlight
                      ? 'border-brand-500 shadow-lg shadow-brand-100 ring-2 ring-brand-500'
                      : 'border-gray-200 bg-white'
                  }`}
                >
                  {plan.highlight && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <span className="rounded-full bg-brand-600 px-3 py-1 text-xs font-semibold text-white">
                        Most Popular
                      </span>
                    </div>
                  )}

                  <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${plan.iconBg} mb-4`}>
                    <Icon className={`h-5 w-5 ${plan.iconColor}`} />
                  </div>

                  <h2 className="text-lg font-bold text-gray-900">{plan.name}</h2>
                  <p className="mt-1 text-sm text-gray-500">{plan.description}</p>

                  <div className="mt-4 flex items-baseline gap-1">
                    <span className="text-4xl font-bold text-gray-900">{plan.price}</span>
                    {plan.period && <span className="text-sm text-gray-500">{plan.period}</span>}
                  </div>

                  <ul className="mt-6 space-y-3 flex-1">
                    {plan.features.map((f) => (
                      <li key={f.text} className="flex items-center gap-2 text-sm">
                        {f.included ? (
                          <CheckCircle className="h-4 w-4 shrink-0 text-green-500" />
                        ) : (
                          <X className="h-4 w-4 shrink-0 text-gray-300" />
                        )}
                        <span className={f.included ? 'text-gray-700' : 'text-gray-400'}>{f.text}</span>
                      </li>
                    ))}
                  </ul>

                  <Link
                    href={plan.ctaHref}
                    className={`mt-8 inline-flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition-colors ${
                      plan.highlight
                        ? 'bg-brand-600 text-white hover:bg-brand-700'
                        : plan.ctaVariant === 'outline'
                        ? 'border border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                        : 'bg-brand-600 text-white hover:bg-brand-700'
                    }`}
                  >
                    {plan.cta}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              );
            })}
          </div>
        </section>

        {/* FAQ */}
        <section className="py-16 px-6 bg-gray-50">
          <div className="mx-auto max-w-3xl">
            <h2 className="text-2xl font-bold text-gray-900 text-center mb-10">Frequently asked questions</h2>
            <div className="space-y-6">
              {FAQS.map((faq) => (
                <div key={faq.q} className="rounded-2xl bg-white border border-gray-100 p-6">
                  <h3 className="font-semibold text-gray-900">{faq.q}</h3>
                  <p className="mt-2 text-sm text-gray-600 leading-relaxed">{faq.a}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-20 px-6 text-center">
          <div className="mx-auto max-w-xl">
            <h2 className="text-2xl font-bold text-gray-900">Ready to get started?</h2>
            <p className="mt-3 text-gray-600">
              Join thousands of businesses using DocSignerHub for legally binding digital signatures.
            </p>
            <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                href="/register"
                className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-6 py-3 text-sm font-semibold text-white hover:bg-brand-700 transition-colors"
              >
                Start for free <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/contact"
                className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-6 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Talk to sales
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
