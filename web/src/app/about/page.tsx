import type { Metadata } from 'next';
import Link from 'next/link';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { FileSignature, ShieldCheck, Zap, Globe, ArrowRight } from 'lucide-react';

export const metadata: Metadata = {
  title: 'About – DocSignerHub',
  description:
    'Learn about DocSignerHub — a legally binding, eIDAS-compliant digital signing platform built for businesses of all sizes.',
};

const VALUES = [
  {
    icon: ShieldCheck,
    title: 'Security First',
    desc: 'Every decision is made through a security lens. Encryption, HMAC verification, and compliance are non-negotiable foundations.',
  },
  {
    icon: Zap,
    title: 'Speed & Simplicity',
    desc: 'Signing should take seconds, not days. We obsess over the user experience so your signers can complete documents without friction.',
  },
  {
    icon: Globe,
    title: 'Global Compliance',
    desc: 'Built to meet eIDAS standards from day one, with a roadmap for additional international compliance frameworks.',
  },
  {
    icon: FileSignature,
    title: 'Developer Friendly',
    desc: 'A clean REST API, real-time webhooks, and comprehensive documentation. Integration should be a pleasure, not a chore.',
  },
];

const MILESTONES = [
  { year: '2023', event: 'DocSignerHub founded with a mission to make legally binding digital signing accessible to every business.' },
  { year: '2024', event: 'Launched eIDAS-compliant signing, REST API, webhook integrations, and visual workflow builder.' },
  { year: '2025', event: 'Introduced AI-powered document analysis, bulk send, and enterprise white-label capabilities.' },
];

export default function AboutPage() {
  return (
    <>
      <Header />
      <main>
        {/* Hero */}
        <section className="bg-gradient-to-b from-brand-50 to-white py-20 px-6">
          <div className="mx-auto max-w-3xl text-center">
            <div className="flex justify-center mb-6">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-100">
                <FileSignature className="h-8 w-8 text-brand-600" />
              </div>
            </div>
            <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
              About DocSignerHub
            </h1>
            <p className="mt-5 text-lg text-gray-600 leading-relaxed">
              We believe every business deserves access to professional, legally binding digital signing —
              without enterprise price tags or complicated setups.
            </p>
          </div>
        </section>

        {/* Mission */}
        <section className="py-16 px-6">
          <div className="mx-auto max-w-3xl">
            <div className="rounded-2xl bg-brand-600 p-8 text-white text-center">
              <h2 className="text-2xl font-bold mb-3">Our Mission</h2>
              <p className="text-brand-100 leading-relaxed text-lg">
                To make eIDAS-compliant digital signing accessible, affordable, and fast for
                businesses of every size — from freelancers to global enterprises.
              </p>
            </div>
          </div>
        </section>

        {/* Values */}
        <section className="py-16 px-6 bg-gray-50">
          <div className="mx-auto max-w-5xl">
            <h2 className="text-2xl font-bold text-gray-900 text-center mb-10">What we stand for</h2>
            <div className="grid gap-6 sm:grid-cols-2">
              {VALUES.map((v) => {
                const Icon = v.icon;
                return (
                  <div key={v.title} className="rounded-2xl bg-white border border-gray-100 p-6 flex gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50">
                      <Icon className="h-5 w-5 text-brand-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{v.title}</h3>
                      <p className="mt-1 text-sm text-gray-500 leading-relaxed">{v.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Timeline */}
        <section className="py-16 px-6">
          <div className="mx-auto max-w-2xl">
            <h2 className="text-2xl font-bold text-gray-900 text-center mb-10">Our journey</h2>
            <div className="relative pl-6 border-l-2 border-brand-100 space-y-8">
              {MILESTONES.map((m) => (
                <div key={m.year} className="relative">
                  <div className="absolute -left-[25px] flex h-6 w-6 items-center justify-center rounded-full border-2 border-brand-400 bg-white">
                    <div className="h-2 w-2 rounded-full bg-brand-600" />
                  </div>
                  <span className="text-xs font-semibold text-brand-600 uppercase tracking-wider">{m.year}</span>
                  <p className="mt-1 text-sm text-gray-600 leading-relaxed">{m.event}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-16 px-6 bg-gray-50 text-center">
          <div className="mx-auto max-w-xl">
            <h2 className="text-xl font-bold text-gray-900">Ready to sign smarter?</h2>
            <p className="mt-2 text-gray-600 text-sm">
              Join businesses worldwide using DocSignerHub for legally binding digital signatures.
            </p>
            <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                href="/register"
                className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 transition-colors"
              >
                Get started free <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/contact"
                className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-5 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Contact us
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
