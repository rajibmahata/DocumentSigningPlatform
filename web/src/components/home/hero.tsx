'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowRight, ShieldCheck, Zap } from 'lucide-react';
import { portalApi } from '@/lib/api';

export function Hero() {
  const [documentsSent,   setDocumentsSent]   = useState<number | null>(null);
  const [documentsSigned, setDocumentsSigned] = useState<number | null>(null);

  useEffect(() => {
    portalApi.getStats()
      .then(res => {
        setDocumentsSent(res.data.documentsSent);
        setDocumentsSigned(res.data.documentsSigned);
      })
      .catch(() => { /* silently ignore – stats are optional */ });
  }, []);

  const fmt = (n: number | null) => n === null ? '…' : n.toLocaleString();

  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-brand-50 via-white to-blue-50 py-24 lg:py-32">
      {/* Background decoration */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 h-96 w-96 rounded-full bg-brand-100 opacity-30 blur-3xl" />
        <div className="absolute -bottom-32 -left-32 h-80 w-80 rounded-full bg-blue-100 opacity-40 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-7xl px-6 text-center">
        {/* Badge */}
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-brand-200 bg-brand-50 px-4 py-1.5 text-sm text-brand-700 font-medium">
          <ShieldCheck className="h-4 w-4" />
          eIDAS Compliant · Legally Binding · Audit Logged
        </div>

        <h1 className="mx-auto max-w-4xl text-4xl font-extrabold leading-tight tracking-tight text-gray-900 sm:text-5xl lg:text-6xl">
          Sign Documents{' '}
          <span className="bg-gradient-to-r from-brand-600 to-blue-500 bg-clip-text text-transparent">
            Electronically
          </span>
          , Securely
        </h1>

        <p className="mx-auto mt-6 max-w-2xl text-lg text-gray-600 leading-relaxed">
          SignFlow is an API-first, multi-tenant eSign SaaS. Send documents for signature, track
          signing status in real time, and integrate with your own systems via our developer API.
        </p>

        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Button size="lg" asChild>
            <Link href="/register">
              Get Started Free <ArrowRight className="h-5 w-5" />
            </Link>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <Link href="/docs">View API Docs</Link>
          </Button>
        </div>

        {/* Stats */}
        <div className="mt-16 grid grid-cols-2 gap-6 sm:grid-cols-4">
          {[
            { label: 'Documents Sent',   value: fmt(documentsSent)   },
            { label: 'Documents Signed', value: fmt(documentsSigned) },
            { label: 'eIDAS Compliant',  value: '✓'                  },
            { label: 'Avg Sign Time',    value: '< 2 min'            },
          ].map((s) => (
            <div key={s.label} className="rounded-2xl bg-white/80 border border-gray-100 p-4 shadow-sm">
              <div className="text-2xl font-bold text-brand-700">{s.value}</div>
              <div className="mt-1 text-xs text-gray-500">{s.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
