import Link from 'next/link';
import { FileSignature } from 'lucide-react';

export function Footer() {
  return (
    <footer className="border-t border-gray-100 bg-white py-12">
      <div className="mx-auto max-w-7xl px-6">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-5">
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
              <li><Link href="/features" className="hover:text-brand-700">Features</Link></li>
              <li><Link href="/pricing" className="hover:text-brand-700">Pricing</Link></li>
              <li><Link href="/enterprise" className="hover:text-brand-700">Enterprise</Link></li>
              <li><Link href="/security" className="hover:text-brand-700">Security</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-gray-900 mb-3">Resources</h4>
            <ul className="space-y-2 text-sm text-gray-500">
              <li><Link href="/blog" className="hover:text-brand-700">Blog</Link></li>
              <li><Link href="/docs" className="hover:text-brand-700">API Docs</Link></li>
              <li><Link href="/faq" className="hover:text-brand-700">FAQ &amp; User Guide</Link></li>
              <li><Link href="/how-to-use" className="hover:text-brand-700">How to Use</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-gray-900 mb-3">Company</h4>
            <ul className="space-y-2 text-sm text-gray-500">
              <li><Link href="/about" className="hover:text-brand-700">About</Link></li>
              <li><Link href="/contact" className="hover:text-brand-700">Contact</Link></li>
              <li><Link href="/terms" className="hover:text-brand-700">Terms of Service</Link></li>
              <li><Link href="/privacy" className="hover:text-brand-700">Privacy Policy</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-gray-900 mb-3">Account</h4>
            <ul className="space-y-2 text-sm text-gray-500">
              <li><Link href="/register" className="hover:text-brand-700">Register</Link></li>
              <li><Link href="/login" className="hover:text-brand-700">Login</Link></li>
              <li><Link href="/dashboard" className="hover:text-brand-700">Dashboard</Link></li>
            </ul>
          </div>
        </div>

        <div className="mt-10 border-t border-gray-100 pt-6 flex flex-col md:flex-row items-center justify-between gap-2">
          <p className="text-xs text-gray-400">© {new Date().getFullYear()} DocSignerHub. All rights reserved.</p>
          <div className="flex items-center gap-4 text-xs text-gray-400">
            <span>eIDAS compliant · Encrypted · Audit-logged</span>
            <Link href="/privacy" className="hover:text-brand-600">Privacy</Link>
            <Link href="/terms" className="hover:text-brand-600">Terms</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
