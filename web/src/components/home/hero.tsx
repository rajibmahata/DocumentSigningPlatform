'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowRight, ShieldCheck, Zap, Brain, Link2, CreditCard, Fingerprint, GitBranch } from 'lucide-react';
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
    <section className="relative overflow-hidden bg-gradient-to-br from-brand-50 via-white to-blue-50 py-24 lg:py-32 w-full">
      {/* Background decoration */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 h-96 w-96 rounded-full bg-brand-100 opacity-30 blur-3xl" />
        <div className="absolute -bottom-32 -left-32 h-80 w-80 rounded-full bg-blue-100 opacity-40 blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-64 w-64 rounded-full bg-indigo-100 opacity-20 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 text-center">
        {/* Badge row */}
        <div className="mb-6 flex flex-wrap items-center justify-center gap-2">
          <div className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-brand-50 px-4 py-1.5 text-sm text-brand-700 font-medium">
            <ShieldCheck className="h-4 w-4" />
            eIDAS Compliant · Legally Binding
          </div>
          <div className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 px-4 py-1.5 text-sm text-indigo-700 font-medium">
            <Brain className="h-4 w-4" />
            AI-Powered Analysis
          </div>
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-1.5 text-sm text-emerald-700 font-medium">
            <Link2 className="h-4 w-4" />
            Blockchain Verified
          </div>
          <div className="inline-flex items-center gap-2 rounded-full border border-purple-200 bg-purple-50 px-4 py-1.5 text-sm text-purple-700 font-medium">
            <GitBranch className="h-4 w-4" />
            Visual Workflow Engine
          </div>
        </div>

        <h1 className="mx-auto max-w-4xl text-4xl font-extrabold leading-tight tracking-tight text-gray-900 sm:text-5xl lg:text-6xl">
          The eSign Platform That{' '}
          <span className="bg-gradient-to-r from-brand-600 via-indigo-600 to-blue-500 bg-clip-text text-transparent">
            Thinks for You
          </span>
        </h1>

        <p className="mx-auto mt-6 max-w-2xl text-lg text-gray-600 leading-relaxed">
          DocSignerHub is an API-first, multi-tenant eSign platform with <strong>AI contract analysis</strong>,{' '}
          <strong>blockchain notarisation</strong>, <strong>Stripe payments</strong>, <strong>bulk CSV sending</strong>,{' '}
          <strong>visual workflow automation</strong>, and{' '}
          <strong>identity verification</strong> — all under a single REST API.</p>

        {/* Capability chips */}
        <div className="mt-5 flex items-center justify-center gap-2 flex-wrap">
          {[
            { label: '🤖 AI Summary',        cls: 'border-indigo-200 bg-indigo-50 text-indigo-700'   },
            { label: '⛓ Blockchain Proof',   cls: 'border-violet-200 bg-violet-50 text-violet-700'   },
            { label: '💳 Stripe Payments',   cls: 'border-emerald-200 bg-emerald-50 text-emerald-700' },
            { label: '🪪 ID Verification',   cls: 'border-amber-200 bg-amber-50 text-amber-700'       },
            { label: '📤 Bulk CSV Send',      cls: 'border-sky-200 bg-sky-50 text-sky-700'            },
            { label: '🔀 Workflow Engine',    cls: 'border-purple-200 bg-purple-50 text-purple-700'   },
            { label: '🎨 White-Label Ready', cls: 'border-pink-200 bg-pink-50 text-pink-700'          },
          ].map(({ label, cls }) => (
            <span key={label} className={`rounded-full border px-3 py-0.5 text-xs font-semibold ${cls}`}>
              {label}
            </span>
          ))}
        </div>

        {/* Format support chips */}
        <div className="mt-3 flex items-center justify-center gap-2 flex-wrap">
          {[
            { label: '📄 PDF',  cls: 'border-red-200 bg-red-50 text-red-700'     },
            { label: '📝 DOC',  cls: 'border-blue-200 bg-blue-50 text-blue-700'  },
            { label: '📋 DOCX', cls: 'border-indigo-200 bg-indigo-50 text-indigo-700' },
          ].map(({ label, cls }) => (
            <span key={label} className={`rounded-full border px-3 py-0.5 text-xs font-semibold ${cls}`}>
              {label} Supported
            </span>
          ))}
        </div>

        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Button size="lg" asChild>
            <Link href="/register">
              Start for Free <ArrowRight className="h-5 w-5" />
            </Link>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <Link href="/how-to-use">How It Works</Link>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <Link href="/dashboard/workflows">
              <GitBranch className="h-4 w-4" /> Workflow Builder
            </Link>
          </Button>
          <Button size="lg" variant="ghost" asChild>
            <Link href="/docs">API Reference</Link>
          </Button>
        </div>

        {/* Stats */}
        <div className="mt-16 grid grid-cols-2 gap-6 sm:grid-cols-4">
          {[
            { label: 'Documents Sent',    value: fmt(documentsSent)   },
            { label: 'Documents Signed',  value: fmt(documentsSigned) },
            { label: 'AI + Blockchain',   value: '✓'                  },
            { label: 'Avg Sign Time',     value: '< 2 min'            },
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
