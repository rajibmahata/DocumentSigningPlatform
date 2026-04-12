import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';

export function CtaSection() {
  return (
    <section className="py-24 bg-gray-50">
      <div className="mx-auto max-w-3xl px-6 text-center">
        <h2 className="text-3xl font-bold text-gray-900">Ready to Start Signing?</h2>
        <p className="mt-4 text-gray-500 text-lg">
          Create a free account, set up your merchant, and send your first envelope in under 5 minutes.
        </p>
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Button size="lg" asChild>
            <Link href="/register">
              Create Free Account <ArrowRight className="h-5 w-5" />
            </Link>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <Link href="/docs">Explore API Docs</Link>
          </Button>
        </div>
        <p className="mt-6 text-sm text-gray-400">
          No credit card required &middot; 100 free envelopes per merchant &middot; Cancel anytime
        </p>
      </div>
    </section>
  );
}
