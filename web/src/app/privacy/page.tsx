import type { Metadata } from 'next';
import Link from 'next/link';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';

export const metadata: Metadata = {
  title: 'Privacy Policy – DocSignerHub',
  description: 'Read the DocSignerHub Privacy Policy — how we collect, use, and protect your personal data.',
};

const LAST_UPDATED = '1 June 2025';

export default function PrivacyPage() {
  return (
    <>
      <Header />
      <main className="py-16 px-6">
        <div className="mx-auto max-w-3xl">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Privacy Policy</h1>
          <p className="text-sm text-gray-500 mb-10">Last updated: {LAST_UPDATED}</p>

          <div className="space-y-8">
            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">1. Introduction</h2>
              <p className="text-sm text-gray-600 leading-relaxed">
                DocSignerHub (&ldquo;we&rdquo;, &ldquo;us&rdquo;, &ldquo;our&rdquo;) is committed to protecting your personal data. This
                Privacy Policy explains what data we collect, how we use it, and your rights under applicable
                data protection law, including the EU General Data Protection Regulation (GDPR).
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">2. Data We Collect</h2>
              <p className="text-sm text-gray-600 leading-relaxed mb-3">We collect the following categories of personal data:</p>
              <div className="space-y-3">
                {[
                  { category: 'Account Data', items: 'Name, email address, password (hashed), country, registration date.' },
                  { category: 'Document Data', items: 'Documents you upload for signing, signed documents, document metadata (title, status, timestamps).' },
                  { category: 'Signer Data', items: 'Email address, name, and role of signers you add to envelopes. Signers\' IP addresses, user agents, and timestamps are recorded for compliance.' },
                  { category: 'Usage Data', items: 'API requests, envelope events, webhook deliveries, and audit log entries.' },
                  { category: 'Payment Data', items: 'We do not store payment card data. Billing is handled via email/manual process and recorded as plan metadata only.' },
                ].map((item) => (
                  <div key={item.category} className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                    <p className="text-sm font-semibold text-gray-800">{item.category}</p>
                    <p className="text-sm text-gray-600 mt-1">{item.items}</p>
                  </div>
                ))}
              </div>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">3. How We Use Your Data</h2>
              <ul className="list-disc list-inside space-y-1.5 text-sm text-gray-600">
                <li>To provide and operate the signing platform</li>
                <li>To send signing invitation and notification emails to signers</li>
                <li>To generate audit trails and compliance certificates</li>
                <li>To process subscription and usage billing</li>
                <li>To respond to support enquiries</li>
                <li>To detect and prevent fraud and abuse</li>
                <li>To comply with legal obligations</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">4. Legal Basis for Processing</h2>
              <p className="text-sm text-gray-600 leading-relaxed">
                We process your data on the following legal bases: (a) <strong>Contractual necessity</strong> — to
                fulfil our service obligations; (b) <strong>Legitimate interests</strong> — for security, fraud
                prevention, and product improvement; (c) <strong>Legal obligation</strong> — to comply with
                applicable laws; (d) <strong>Consent</strong> — where you have explicitly opted in to
                communications.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">5. Data Sharing</h2>
              <p className="text-sm text-gray-600 leading-relaxed">
                We do not sell your personal data. We share data only with service providers necessary to
                operate the platform (email delivery, cloud hosting, database services). All processors are
                bound by data processing agreements consistent with GDPR requirements.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">6. Data Retention</h2>
              <p className="text-sm text-gray-600 leading-relaxed">
                Account data is retained for the life of your account plus 30 days after deletion. Signed
                documents and audit trails are retained for 7 years to meet typical legal retention requirements
                unless you request earlier deletion and your jurisdiction permits it.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">7. Your Rights</h2>
              <p className="text-sm text-gray-600 leading-relaxed mb-3">
                Under GDPR and applicable laws, you have the right to:
              </p>
              <ul className="list-disc list-inside space-y-1.5 text-sm text-gray-600">
                <li>Access a copy of your personal data</li>
                <li>Correct inaccurate or incomplete data</li>
                <li>Request erasure (&ldquo;right to be forgotten&rdquo;) subject to legal obligations</li>
                <li>Object to or restrict processing</li>
                <li>Data portability — receive your data in a machine-readable format</li>
                <li>Lodge a complaint with a supervisory authority</li>
              </ul>
              <p className="text-sm text-gray-600 mt-3">
                To exercise your rights, contact{' '}
                <a href="mailto:privacy@docsignerhub.com" className="text-brand-600 hover:underline">
                  privacy@docsignerhub.com
                </a>.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">8. Security</h2>
              <p className="text-sm text-gray-600 leading-relaxed">
                We implement technical and organisational security measures including TLS 1.3 encryption in
                transit, AES-256 encryption at rest, HMAC document integrity verification, and access controls.
                See our{' '}
                <Link href="/security" className="text-brand-600 hover:underline">Security page</Link>{' '}
                for full details.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">9. Cookies</h2>
              <p className="text-sm text-gray-600 leading-relaxed">
                We use essential session cookies for authentication. We do not use advertising or tracking
                cookies. No third-party analytics scripts are loaded without your consent.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">10. Changes to this Policy</h2>
              <p className="text-sm text-gray-600 leading-relaxed">
                We may update this Privacy Policy from time to time. Material changes will be communicated by
                email at least 14 days before they take effect.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">11. Contact</h2>
              <p className="text-sm text-gray-600 leading-relaxed">
                For any privacy-related questions, contact us at{' '}
                <a href="mailto:privacy@docsignerhub.com" className="text-brand-600 hover:underline">
                  privacy@docsignerhub.com
                </a>{' '}
                or via our{' '}
                <Link href="/contact" className="text-brand-600 hover:underline">Contact page</Link>.
              </p>
            </section>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
