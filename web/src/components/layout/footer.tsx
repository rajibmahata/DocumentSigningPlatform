import Link from 'next/link';
import { FileSignature } from 'lucide-react';

export function Footer() {
  return (
    <footer className="border-t border-gray-100 bg-white py-12">
      <div className="mx-auto max-w-7xl px-6">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="flex items-center gap-2 text-brand-700 font-bold text-lg">
              <FileSignature className="h-5 w-5" />
              <span>DocSignerHub</span>
            </Link>
            <p className="mt-2 text-sm text-gray-500 leading-relaxed">
              Legally binding eSign platform. eIDAS compliant.
            </p>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-gray-900 mb-3">Product</h4>
            <ul className="space-y-2 text-sm text-gray-500">
              <li><Link href="/#how-it-works" className="hover:text-brand-700">How it Works</Link></li>
              <li><Link href="/#features" className="hover:text-brand-700">Features</Link></li>
              <li><Link href="/#eidas" className="hover:text-brand-700">eIDAS Compliance</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-gray-900 mb-3">Resources</h4>
            <ul className="space-y-2 text-sm text-gray-500">
              <li><Link href="/blog" className="hover:text-brand-700">Blog</Link></li>
              <li><Link href="/docs" className="hover:text-brand-700">API Docs</Link></li>
              <li><Link href="/#api-integration" className="hover:text-brand-700">API Integration</Link></li>
              <li><Link href="/faq" className="hover:text-brand-700">FAQ &amp; User Guide</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-gray-900 mb-3">Account</h4>
            <ul className="space-y-2 text-sm text-gray-500">
              <li><Link href="/register" className="hover:text-brand-700">Register</Link></li>
              <li><Link href="/login" className="hover:text-brand-700">Login</Link></li>
            </ul>
          </div>
        </div>

        <div className="mt-10 border-t border-gray-100 pt-6 flex flex-col md:flex-row items-center justify-between gap-2">
          <p className="text-xs text-gray-400">© {new Date().getFullYear()} DocSignerHub. All rights reserved.</p>
          <p className="text-xs text-gray-400">eIDAS compliant · Encrypted · Audit-logged</p>
        </div>
      </div>
    </footer>
  );
}
