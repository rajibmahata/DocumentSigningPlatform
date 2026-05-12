import type { Metadata } from 'next';
import Link from 'next/link';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';

export const metadata: Metadata = {
  title: 'Terms of Service – DocSignerHub',
  description: 'Read the DocSignerHub Terms of Service — your rights and obligations when using our digital signing platform.',
};

const LAST_UPDATED = '1 June 2025';

export default function TermsPage() {
  return (
    <>
      <Header />
      <main className="py-16 px-6">
        <div className="mx-auto max-w-3xl">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Terms of Service</h1>
          <p className="text-sm text-gray-500 mb-10">Last updated: {LAST_UPDATED}</p>

          <div className="prose prose-gray prose-sm max-w-none space-y-8">
            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">1. Acceptance of Terms</h2>
              <p className="text-gray-600 leading-relaxed">
                By creating an account or using DocSignerHub (&ldquo;Service&rdquo;), you agree to be bound by these Terms of
                Service. If you do not agree, do not use the Service. These Terms apply to all users, including
                free and paid account holders.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">2. Description of Service</h2>
              <p className="text-gray-600 leading-relaxed">
                DocSignerHub provides a digital document signing platform that allows registered users to send
                documents for electronic signature, collect signatures, and store signed documents with an audit
                trail. The Service is provided on a subscription basis with tiered plan levels.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">3. Account Registration</h2>
              <p className="text-gray-600 leading-relaxed">
                You must provide accurate registration information and keep it up to date. You are responsible
                for all activity that occurs under your account. You must not share your credentials or allow
                unauthorised access to your account. You must verify your email address to activate full account
                functionality.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">4. Acceptable Use</h2>
              <p className="text-gray-600 leading-relaxed mb-3">
                You agree not to use the Service to:
              </p>
              <ul className="list-disc list-inside space-y-1 text-gray-600 text-sm">
                <li>Send fraudulent, forged, or deceptive documents</li>
                <li>Violate any applicable law or regulation</li>
                <li>Infringe the intellectual property rights of others</li>
                <li>Transmit malware, spam, or unsolicited communications</li>
                <li>Attempt to gain unauthorised access to our systems</li>
                <li>Resell or sublicense the Service without authorisation</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">5. Electronic Signatures</h2>
              <p className="text-gray-600 leading-relaxed">
                Signatures collected through the Service are intended to meet the legal requirements for
                electronic signatures in relevant jurisdictions, including EU eIDAS. However, you are solely
                responsible for determining whether the Service meets your specific legal requirements.
                DocSignerHub does not provide legal advice.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">6. Subscription & Payments</h2>
              <p className="text-gray-600 leading-relaxed">
                Paid subscriptions are billed monthly. Plan upgrades or downgrades are handled by contacting
                our support team. We reserve the right to change pricing with 30 days&apos; notice. Refunds are
                evaluated on a case-by-case basis. Free plan usage is subject to the monthly envelope limits
                stated on the Pricing page.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">7. Data & Privacy</h2>
              <p className="text-gray-600 leading-relaxed">
                Our handling of your personal data is described in our{' '}
                <Link href="/privacy" className="text-brand-600 hover:underline">Privacy Policy</Link>.
                You retain ownership of your documents and data. By using the Service, you grant us a limited
                licence to process your data as necessary to provide the Service.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">8. Service Availability</h2>
              <p className="text-gray-600 leading-relaxed">
                We aim for high availability but do not guarantee uninterrupted access. Scheduled maintenance
                will be notified in advance where possible. Enterprise SLA guarantees are governed by separate
                enterprise agreements.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">9. Limitation of Liability</h2>
              <p className="text-gray-600 leading-relaxed">
                To the maximum extent permitted by law, DocSignerHub shall not be liable for indirect,
                incidental, special, consequential, or punitive damages arising from use of the Service.
                Our aggregate liability shall not exceed the fees paid by you in the three months preceding
                the claim.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">10. Termination</h2>
              <p className="text-gray-600 leading-relaxed">
                Either party may terminate the agreement at any time. We reserve the right to suspend or
                terminate accounts that violate these Terms. Upon termination, your data will be retained
                for 30 days before deletion unless otherwise required by law.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">11. Changes to Terms</h2>
              <p className="text-gray-600 leading-relaxed">
                We may update these Terms from time to time. We will notify you by email or in-app notification
                at least 14 days before material changes take effect. Continued use of the Service after changes
                constitutes acceptance.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">12. Contact</h2>
              <p className="text-gray-600 leading-relaxed">
                For questions about these Terms, contact us at{' '}
                <a href="mailto:legal@docsignerhub.com" className="text-brand-600 hover:underline">
                  legal@docsignerhub.com
                </a>{' '}
                or visit our{' '}
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
