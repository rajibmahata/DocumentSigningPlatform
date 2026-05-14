import type { Metadata } from 'next';
import Link from 'next/link';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { Mail, MessageSquare, LifeBuoy, Building2, ArrowRight, Clock } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Contact Us – DocSignerHub',
  description:
    'Get in touch with the DocSignerHub team for sales enquiries, technical support, or general questions. We respond within 24 hours.',
};

const CONTACT_OPTIONS = [
  {
    icon: LifeBuoy,
    title: 'Technical Support',
    desc: 'Having trouble with your account, an envelope, or the API? Our support team is here to help.',
    cta: 'Email support',
    href: 'mailto:support@docsignerhub.com?subject=Support Request',
    color: 'bg-brand-50',
    iconColor: 'text-brand-600',
  },
  {
    icon: Building2,
    title: 'Sales & Enterprise',
    desc: 'Looking for a custom enterprise plan, white-label licensing, or a demo? Talk to our sales team.',
    cta: 'Email sales',
    href: 'mailto:sales@docsignerhub.com?subject=Enterprise Enquiry',
    color: 'bg-violet-50',
    iconColor: 'text-violet-600',
  },
  {
    icon: MessageSquare,
    title: 'General Enquiries',
    desc: 'Press, partnerships, billing questions, or anything else — we read every email.',
    cta: 'Send a message',
    href: 'mailto:hello@docsignerhub.com?subject=General Enquiry',
    color: 'bg-amber-50',
    iconColor: 'text-amber-600',
  },
];

const FAQS = [
  {
    q: 'How quickly do you respond?',
    a: 'We aim to respond to all enquiries within 24 hours on business days. Enterprise customers on Pro and Enterprise plans receive priority support.',
  },
  {
    q: 'Can I book a live demo?',
    a: 'Yes. Email our sales team and request a demo — we will schedule a 30-minute walkthrough of the platform tailored to your use case.',
  },
  {
    q: 'I found a security vulnerability. What should I do?',
    a: 'Please email security@docsignerhub.com with details. We take all reports seriously and commit to acknowledging within 24 hours.',
  },
  {
    q: 'Do you offer phone support?',
    a: 'Enterprise customers have access to a dedicated account manager. All other customers are supported via email.',
  },
];

export default function ContactPage() {
  return (
    <>
      <Header />
      <main>
        {/* Hero */}
        <section className="bg-gradient-to-b from-brand-50 to-white py-20 px-6">
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
              Get in touch
            </h1>
            <p className="mt-4 text-lg text-gray-600">
              We&apos;re a small team and we read every message. Expect a reply within 24 hours.
            </p>
            <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-green-50 border border-green-200 px-4 py-2 text-sm text-green-700">
              <Clock className="h-4 w-4" />
              Typical response: &lt; 24 hours
            </div>
          </div>
        </section>

        {/* Contact options */}
        <section className="py-16 px-6">
          <div className="mx-auto max-w-5xl grid gap-6 sm:grid-cols-3">
            {CONTACT_OPTIONS.map((opt) => {
              const Icon = opt.icon;
              return (
                <div key={opt.title} className="rounded-2xl border border-gray-100 bg-white p-6 flex flex-col">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${opt.color} mb-4`}>
                    <Icon className={`h-5 w-5 ${opt.iconColor}`} />
                  </div>
                  <h2 className="font-bold text-gray-900">{opt.title}</h2>
                  <p className="mt-2 text-sm text-gray-500 leading-relaxed flex-1">{opt.desc}</p>
                  <a
                    href={opt.href}
                    className="mt-5 inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 transition-colors"
                  >
                    <Mail className="h-4 w-4" />
                    {opt.cta}
                  </a>
                </div>
              );
            })}
          </div>
        </section>

        {/* FAQs */}
        <section className="py-16 px-6 bg-gray-50">
          <div className="mx-auto max-w-3xl">
            <h2 className="text-2xl font-bold text-gray-900 text-center mb-10">
              Before you reach out
            </h2>
            <div className="space-y-5">
              {FAQS.map((faq) => (
                <div key={faq.q} className="rounded-2xl bg-white border border-gray-100 p-6">
                  <h3 className="font-semibold text-gray-900">{faq.q}</h3>
                  <p className="mt-2 text-sm text-gray-600 leading-relaxed">{faq.a}</p>
                </div>
              ))}
            </div>
            <p className="mt-8 text-center text-sm text-gray-500">
              Need step-by-step instructions instead?{' '}
              <Link href="/faq" className="text-brand-600 hover:underline font-medium">
                Visit our FAQ & User Guide
              </Link>
            </p>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
