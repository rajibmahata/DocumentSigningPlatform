import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowRight, Brain, Link2, CreditCard, Fingerprint } from 'lucide-react';

export function CtaSection() {
  return (
    <section className="py-24 bg-gradient-to-br from-indigo-950 via-blue-950 to-gray-950">
      <div className="mx-auto max-w-4xl px-6 text-center">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-indigo-400/30 bg-indigo-500/10 px-4 py-1.5 text-sm text-indigo-300 font-medium">
          🚀 Phase 1 Now Live
        </div>
        <h2 className="text-3xl font-bold text-white sm:text-4xl">
          Ready to Sign Smarter?
        </h2>
        <p className="mt-4 text-gray-300 text-lg max-w-2xl mx-auto">
          AI contract analysis, blockchain notarisation, Stripe payments, bulk sending, and identity verification — all available now.
          Sign up free and send your first envelope in minutes.
        </p>

        {/* Feature pills */}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
          {[
            { icon: Brain,       label: 'AI Analysis'       },
            { icon: Link2,       label: 'Blockchain Proof'  },
            { icon: CreditCard,  label: 'Stripe Payments'   },
            { icon: Fingerprint, label: 'ID Verification'   },
          ].map(({ icon: Icon, label }) => (
            <span key={label} className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-gray-300 font-medium">
              <Icon className="h-3.5 w-3.5 text-indigo-400" />
              {label}
            </span>
          ))}
        </div>

        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Button size="lg" asChild className="bg-white text-gray-900 hover:bg-gray-100">
            <Link href="/register">
              Create Free Account <ArrowRight className="h-5 w-5" />
            </Link>
          </Button>
          <Button size="lg" variant="outline" asChild className="border-white/20 text-white hover:bg-white/10">
            <Link href="/how-to-use">How It Works</Link>
          </Button>
          <Button size="lg" variant="ghost" asChild className="text-gray-300 hover:text-white hover:bg-white/5">
            <Link href="/docs">API Reference</Link>
          </Button>
        </div>
        <p className="mt-6 text-sm text-gray-500">
          No credit card required · 100 free envelopes · Cancel anytime
        </p>
      </div>
    </section>
  );
}
