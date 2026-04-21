import type { Metadata } from 'next';
import Link from 'next/link';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import {
  UserPlus, Building2, Send, PenTool, DownloadCloud, Bell,
  ShieldCheck, KeyRound, FileText, HelpCircle, ChevronDown,
  Award, Webhook, Users, CreditCard, RotateCcw, Clock,
  ArrowRight,
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'FAQ & User Guide',
  description: 'Step-by-step guide to using DocSignerHub — account setup, sending envelopes, signing documents, templates, certificates, and more.',
};

// ─────────────────────────────────────────────────────────────────────────────
// Data
// ─────────────────────────────────────────────────────────────────────────────

const GUIDE_STEPS = [
  {
    id: 'register',
    icon: UserPlus,
    color: 'bg-blue-500',
    step: '01',
    title: 'Create Your Account',
    summary: 'Register in under 30 seconds — no credit card needed.',
    details: [
      'Navigate to the home page and click **Get Started Free** or go to /register.',
      'Enter your full name, email address, and a strong password.',
      'You will receive an email verification link — click it to activate your account.',
      'Once verified, log in and you will land on your dashboard.',
    ],
    tip: 'If the verification email does not arrive within 2 minutes, check your spam folder or use the Resend link on the login page.',
  },
  {
    id: 'merchant',
    icon: Building2,
    color: 'bg-violet-500',
    step: '02',
    title: 'Set Up Your Merchant Account',
    summary: 'Your Merchant account is the signing identity tied to every envelope you send.',
    details: [
      'From the dashboard, click **Merchant** in the left sidebar.',
      'Fill in your business or personal name and save.',
      'You will receive an **API Key** — this is used to authenticate all API calls and is shown in the dashboard.',
      'Your subscription plan controls how many envelopes you can send. The Free plan gives you a fixed monthly credit.',
      'To upgrade, go to **Merchant → Subscription** and pick a plan.',
    ],
    tip: 'Keep your API Key private. If compromised, regenerate it immediately from the Merchant page.',
  },
  {
    id: 'send',
    icon: Send,
    color: 'bg-indigo-500',
    step: '03',
    title: 'Send a Signing Envelope',
    summary: 'An Envelope groups your documents and signers into a single tracked workflow.',
    details: [
      'Click **Send Envelope** from the dashboard or sidebar.',
      '(Optional) Pick a pre-built template by clicking **Start from a Template** at the top of the form. The envelope title and signers will auto-populate.',
      'Enter an **Envelope Title** that identifies the agreement (e.g. "Employment Contract — Alice Smith").',
      'Upload one or more documents (PDF, DOC, or DOCX — up to the size limit shown).',
      'Add each signer: type their **email** (auto-complete will suggest your saved contacts), then confirm their **name** and **role** (e.g. Employee, Client).',
      'Optionally set a **Signing Order** — signers with order 1 are emailed first; order 2 only receive their link after order 1 completes.',
      'Add a personal **message** for each signer (default: "Please review and sign the document.").',
      'Click **Send Envelope**. Each signer instantly receives a unique, tamper-proof signing link by email.',
    ],
    tip: 'You can send up to the documents limit per envelope. Each signer gets their own unique token — they cannot see other signers\' links.',
  },
  {
    id: 'sign',
    icon: PenTool,
    color: 'bg-emerald-500',
    step: '04',
    title: 'How Signers Sign',
    summary: 'Signers need no account — they click the link and sign on any device.',
    details: [
      'The signer receives an email with a **Sign Now** button.',
      'They click the button and land on the signing portal — no login required.',
      'They review the document preview, then scroll to the signature section.',
      'They can **draw** their signature with a mouse/finger or **type** it in a handwriting-style font.',
      'Clicking **Submit Signature** triggers the stamping process — the signature image is embedded into the PDF and a SHA-256 hash is recorded.',
      'The signer receives a confirmation email with their signed copy attached.',
      'If a signer needs to **reject** the document, they click Reject and optionally provide a reason — the envelope is marked Rejected and the merchant is notified.',
    ],
    tip: 'Signing links expire after 7 days. If a signer\'s link expires, use the **Resend Invitation** button on the envelope detail page.',
  },
  {
    id: 'track',
    icon: Clock,
    color: 'bg-amber-500',
    step: '05',
    title: 'Track Envelope Status',
    summary: 'Monitor every signer\'s progress in real time from your dashboard.',
    details: [
      'Go to **Envelopes** in the sidebar. Active envelopes are under the **Active** tab.',
      'Status badges tell you exactly where each envelope stands: Processing → Sent → Signed → Completed.',
      'Click **View** on any envelope to open the detail page.',
      'The detail page shows each signer\'s individual status (Pending / Signed / Rejected / Expired), the activity timeline, and all attached documents.',
      'Use the **Resend Invitation** button next to any Pending signer to re-send their link.',
      'To cancel an envelope still in progress, click **Cancel Envelope** at the top of the detail page.',
    ],
    tip: 'The dashboard auto-refreshes every 30 seconds. You will also receive in-app notifications (bell icon) when a signer completes signing.',
  },
  {
    id: 'download',
    icon: DownloadCloud,
    color: 'bg-orange-500',
    step: '06',
    title: 'Download Signed Documents & Certificate',
    summary: 'Once all signers complete, download the stamped documents and a Certificate of Completion.',
    details: [
      'Completed envelopes appear under the **Closed** tab in the Envelopes list.',
      'Click **Download** to save the signed PDF.',
      'Click **Certificate** to download the PDF **Certificate of Completion** — this document lists every signer, their email, role, and the UTC timestamp of when they signed.',
      'You can also access these from the envelope detail page using the **Certificate** button in the header.',
      'The Certificate of Completion can be used as proof of execution in legal proceedings.',
    ],
    tip: 'The Certificate is generated on-demand and always reflects the latest signing state of the envelope.',
  },
  {
    id: 'templates',
    icon: FileText,
    color: 'bg-pink-500',
    step: '07',
    title: 'Use & Manage Templates',
    summary: 'Templates save you time by pre-defining document signers and roles for repeated workflows.',
    details: [
      'Go to **Templates** in the sidebar.',
      'Click **New Template** and enter a template name, description, and a default envelope title.',
      'Add signer rows — each row defines an email (with contact autocomplete), name, role, signing order, and a default personal message.',
      'Save the template. It will appear in the template picker when sending a new envelope.',
      'To use a template: on the Send Envelope page, click **Start from a Template**, pick the template, and click **Apply**. The form will auto-fill the title and all signers — you still attach your document(s).',
      'Edit or delete templates from the Templates page using the action buttons on each card.',
    ],
    tip: 'Templates do not store documents — only the signer configuration. You always upload the actual file when sending.',
  },
  {
    id: 'notifications',
    icon: Bell,
    color: 'bg-cyan-500',
    step: '08',
    title: 'In-App Notifications',
    summary: 'The bell icon in the top bar keeps you informed of all signing activity.',
    details: [
      'A red badge on the bell icon shows how many unread notifications you have.',
      'Click the bell to open the notification panel and see recent events.',
      'You are notified when: an envelope is sent, a signer completes signing, all signers complete (Completed), a signer rejects a document.',
      'Click **Mark all as read** to clear the badge.',
      'Each notification links directly to the relevant envelope detail page.',
    ],
    tip: 'The bell polls for new notifications every 30 seconds automatically.',
  },
  {
    id: 'contacts',
    icon: Users,
    color: 'bg-teal-500',
    step: '09',
    title: 'Signer Contacts',
    summary: 'Your contacts book auto-builds from every envelope you send — saving you time on repeat signers.',
    details: [
      'Every time you send an envelope, the signer\'s email, name, and role are automatically saved to your Contacts.',
      'When adding signers (in an envelope or template), type an email in the email field — matching contacts will appear in a dropdown.',
      'Select a contact to auto-fill the name and role fields.',
      'Manage your contacts manually from **Settings → Signer Contacts**: add, edit, or deactivate contacts.',
    ],
    tip: 'Contacts are scoped to your user account and are not shared with other merchants.',
  },
  {
    id: 'subscription',
    icon: CreditCard,
    color: 'bg-purple-500',
    step: '10',
    title: 'Subscription & Credits',
    summary: 'Each envelope sent uses one credit from your plan\'s monthly allowance.',
    details: [
      'Your current plan and credits remaining are shown on the Dashboard (Credits Remaining card) and the Merchant page.',
      'When you reach 0 credits, sending new envelopes is blocked until the next billing cycle or an upgrade.',
      'To upgrade or change plans, go to **Merchant → Subscription** and select a tier.',
      'Cancelled envelopes do not refund credits.',
    ],
    tip: 'If you need unlimited sends, look for a plan with a 0 request limit — this is treated as "unlimited" in the platform.',
  },
  {
    id: 'resend',
    icon: RotateCcw,
    color: 'bg-rose-500',
    step: '11',
    title: 'Resend & Cancel Envelopes',
    summary: 'Forgot a signer or need to start over? You have full control.',
    details: [
      'To resend a signing invitation: open the envelope detail page, find the signer with Pending status, and click **Resend Invitation**.',
      'A fresh signing link is emailed to the signer — the old link is not revoked (both are valid until expiry).',
      'To cancel an envelope: click **Cancel Envelope** from the detail page header. This works for envelopes in Processing, Sent, or Signed state.',
      'Cancelled envelopes move to the Closed tab with status Cancelled — they cannot be reactivated.',
    ],
    tip: 'You cannot cancel an already Completed or Rejected envelope.',
  },
  {
    id: 'webhooks',
    icon: Webhook,
    color: 'bg-gray-600',
    step: '12',
    title: 'Webhooks & API Integration',
    summary: 'Integrate DocSignerHub into your own systems using the REST API and webhook events.',
    details: [
      'Your API Key is shown in the Merchant page. Include it as `X-Api-Key: <key>` header on all API requests.',
      'Full API documentation is available at /docs.',
      'Register a webhook from **Settings → Webhooks**: enter your endpoint URL and select the events you want (envelope.sent, envelope.signed, envelope.completed, etc.).',
      'Each webhook delivery is retried up to 3 times with exponential backoff if your endpoint returns a non-2xx response.',
      'Test a webhook immediately using the **Test** button on the Webhooks page.',
    ],
    tip: 'Validate the `X-Webhook-Signature` header on your endpoint to verify the payload is genuinely from DocSignerHub.',
  },
  {
    id: 'security',
    icon: ShieldCheck,
    color: 'bg-brand-600',
    step: '13',
    title: 'Security & Compliance',
    summary: 'DocSignerHub is built with security-first architecture and eIDAS awareness.',
    details: [
      'All documents are stored with AES-256 encryption. Signed documents include a SHA-256 content hash.',
      'Every signing action is recorded in an immutable audit log with IP address, user agent, and timestamp.',
      'Signing tokens are cryptographically signed (HMAC-SHA256) and expire after 7 days.',
      'Passwords are hashed with bcrypt. JWT tokens are short-lived and refreshed on activity.',
      'eIDAS Simple Electronic Signature (SES) level — suitable for most commercial and employment agreements.',
      'Admins can view the full audit log under Admin → Audit Logs.',
    ],
    tip: 'For workflows requiring Advanced or Qualified Electronic Signatures (AdES/QES), contact support to discuss certificate-based signing options.',
  },
];

const FAQS = [
  {
    q: 'Do signers need a DocSignerHub account?',
    a: 'No. Signers receive a unique link by email and can sign directly in their browser — no registration, no app download required.',
  },
  {
    q: 'What file formats are supported?',
    a: 'PDF, DOC, and DOCX. All formats are converted and stamped as PDF for the signed output.',
  },
  {
    q: 'How long does the signing link remain valid?',
    a: 'Signing links expire after 7 days. You can resend a fresh link any time from the envelope detail page.',
  },
  {
    q: 'Can I have multiple signers on one envelope?',
    a: 'Yes. You can add as many signers as needed. Use the Signing Order field to control the sequence — signer 2 will only receive their link after signer 1 completes.',
  },
  {
    q: 'What happens after all signers complete?',
    a: 'The envelope status moves to Completed. You get an in-app notification and email. The signed PDF and Certificate of Completion are immediately available to download.',
  },
  {
    q: 'Is the signed document legally binding?',
    a: 'Yes. DocSignerHub produces eIDAS Simple Electronic Signatures (SES). Each signed document includes the signer\'s name, timestamp, IP address, and a cryptographic hash — forming a complete audit trail.',
  },
  {
    q: 'What is the Certificate of Completion?',
    a: 'A PDF document generated by the platform that summarises the envelope: title, envelope ID, merchant name, and a signatory table showing each signer\'s name, email, role, status, and the UTC timestamp they signed. It serves as proof of execution.',
  },
  {
    q: 'Can I cancel an envelope after sending?',
    a: 'Yes, as long as the envelope is still in Processing, Sent, or Signed state. Once Completed or Rejected, cancellation is not possible.',
  },
  {
    q: 'How do templates work?',
    a: 'Templates store a signer configuration (names, emails, roles, signing order) that you can apply to new envelopes instantly. They do not store documents — you still upload the file each time you send.',
  },
  {
    q: 'How do I integrate DocSignerHub into my own application?',
    a: 'Use the REST API with your X-Api-Key. Full documentation is at /docs. You can also register webhooks to receive real-time event notifications to your own endpoint.',
  },
  {
    q: 'What if a signer rejects the document?',
    a: 'The envelope is marked Rejected and you receive an in-app notification and email with the signer\'s reason. You can review the rejection on the envelope detail page. To restart, send a new envelope.',
  },
  {
    q: 'Is my data encrypted?',
    a: 'Yes. All documents are stored encrypted at rest. Signing tokens are cryptographically signed and expire. All activity is recorded in an immutable audit log.',
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Components
// ─────────────────────────────────────────────────────────────────────────────

function StepCard({
  icon: Icon, step, color, title, summary, details, tip,
}: (typeof GUIDE_STEPS)[number]) {
  return (
    <div id={`step-${step}`} className="scroll-mt-24 rounded-2xl border border-gray-100 bg-white shadow-sm hover:shadow-md transition-shadow overflow-hidden">
      {/* Header */}
      <div className="flex items-start gap-4 p-6 pb-4">
        <div className={`flex-shrink-0 flex h-11 w-11 items-center justify-center rounded-xl ${color} shadow-sm`}>
          <Icon className="h-5 w-5 text-white" />
        </div>
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold text-gray-400 tracking-widest">STEP {step}</span>
          </div>
          <h3 className="text-lg font-bold text-gray-900">{title}</h3>
          <p className="text-sm text-gray-500 mt-0.5">{summary}</p>
        </div>
      </div>

      {/* Steps list */}
      <div className="px-6 pb-4">
        <ol className="space-y-2">
          {details.map((d, i) => (
            <li key={i} className="flex gap-3 text-sm text-gray-700">
              <span className="mt-0.5 flex-shrink-0 flex h-5 w-5 items-center justify-center rounded-full bg-brand-50 text-brand-700 text-xs font-bold">
                {i + 1}
              </span>
              <span dangerouslySetInnerHTML={{ __html: d.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />
            </li>
          ))}
        </ol>
      </div>

      {/* Tip */}
      <div className="mx-6 mb-6 rounded-xl bg-amber-50 border border-amber-100 px-4 py-3 flex gap-2">
        <span className="text-amber-500 text-sm font-bold flex-shrink-0">💡 Tip:</span>
        <p className="text-xs text-amber-800">{tip}</p>
      </div>
    </div>
  );
}

function FaqItem({ q, a }: { q: string; a: string }) {
  return (
    <details className="group border border-gray-100 rounded-xl bg-white shadow-sm overflow-hidden">
      <summary className="flex cursor-pointer items-center justify-between gap-4 px-5 py-4 text-sm font-semibold text-gray-800 hover:bg-gray-50 transition-colors list-none">
        <span className="flex items-center gap-2">
          <HelpCircle className="h-4 w-4 text-brand-500 flex-shrink-0" />
          {q}
        </span>
        <ChevronDown className="h-4 w-4 text-gray-400 transition-transform group-open:rotate-180 flex-shrink-0" />
      </summary>
      <div className="px-5 pb-4 pt-0">
        <p className="text-sm text-gray-600 leading-relaxed pl-6">{a}</p>
      </div>
    </details>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────────

export default function FaqPage() {
  return (
    <>
      <Header />
      <main className="min-h-screen bg-gradient-to-b from-gray-50 to-white">

        {/* ── Hero ── */}
        <section className="relative overflow-hidden bg-gradient-to-br from-brand-50 via-white to-blue-50 py-20 border-b border-gray-100">
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="absolute -top-32 -right-32 h-80 w-80 rounded-full bg-brand-100 opacity-30 blur-3xl" />
            <div className="absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-blue-100 opacity-40 blur-3xl" />
          </div>
          <div className="relative mx-auto max-w-4xl px-6 text-center">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-brand-200 bg-brand-50 px-4 py-1.5 text-sm font-medium text-brand-700">
              <KeyRound className="h-4 w-4" />
              Complete User Guide & FAQ
            </div>
            <h1 className="text-4xl font-extrabold tracking-tight text-gray-900 sm:text-5xl">
              Everything You Need to{' '}
              <span className="bg-gradient-to-r from-brand-600 to-blue-500 bg-clip-text text-transparent">
                Get Started
              </span>
            </h1>
            <p className="mt-5 text-lg text-gray-600 max-w-2xl mx-auto leading-relaxed">
              Step-by-step instructions for every feature — from creating your account to downloading
              signed certificates. No jargon, no guessing.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/register"
                className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white shadow hover:bg-brand-700 transition-colors"
              >
                Get Started Free <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/docs"
                className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-5 py-2.5 text-sm font-semibold text-gray-700 shadow-sm hover:border-brand-300 hover:text-brand-700 transition-colors"
              >
                API Documentation
              </Link>
            </div>
          </div>
        </section>

        {/* ── Quick jump ── */}
        <section className="sticky top-16 z-30 bg-white/90 backdrop-blur-md border-b border-gray-100 py-3 shadow-sm">
          <div className="mx-auto max-w-7xl px-6 overflow-x-auto">
            <div className="flex items-center gap-2 min-w-max">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-widest mr-2 flex-shrink-0">Jump to:</span>
              {GUIDE_STEPS.map((s) => (
                <a
                  key={s.id}
                  href={`#step-${s.step}`}
                  className="flex-shrink-0 rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-medium text-gray-600 hover:border-brand-400 hover:text-brand-700 transition-colors"
                >
                  {s.step}. {s.title.split(' ').slice(0, 2).join(' ')}
                </a>
              ))}
              <a
                href="#faqs"
                className="flex-shrink-0 rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700 hover:bg-brand-100 transition-colors"
              >
                FAQs
              </a>
            </div>
          </div>
        </section>

        <div className="mx-auto max-w-7xl px-6 py-16 space-y-20">

          {/* ── Step-by-Step Guide ── */}
          <section>
            <div className="text-center mb-12">
              <span className="inline-block rounded-full bg-brand-50 border border-brand-200 px-4 py-1 text-xs font-semibold uppercase tracking-widest text-brand-700 mb-4">
                Step-by-Step Guide
              </span>
              <h2 className="text-3xl font-bold text-gray-900">How to Use DocSignerHub</h2>
              <p className="mt-3 text-gray-500 max-w-xl mx-auto">
                Follow these steps in order for the smoothest experience. Each section is self-contained — jump to any step using the navigation bar above.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {GUIDE_STEPS.map((step) => (
                <StepCard key={step.id} {...step} />
              ))}
            </div>
          </section>

          {/* ── FAQ ── */}
          <section id="faqs" className="scroll-mt-24">
            <div className="text-center mb-12">
              <span className="inline-block rounded-full bg-amber-50 border border-amber-200 px-4 py-1 text-xs font-semibold uppercase tracking-widest text-amber-700 mb-4">
                Frequently Asked Questions
              </span>
              <h2 className="text-3xl font-bold text-gray-900">Got Questions?</h2>
              <p className="mt-3 text-gray-500 max-w-xl mx-auto">
                Quick answers to the most common questions about DocSignerHub.
              </p>
            </div>
            <div className="max-w-3xl mx-auto space-y-3">
              {FAQS.map((faq) => (
                <FaqItem key={faq.q} {...faq} />
              ))}
            </div>
          </section>

          {/* ── CTA ── */}
          <section className="rounded-3xl bg-gradient-to-br from-brand-600 to-blue-600 px-8 py-14 text-center shadow-lg">
            <Award className="h-12 w-12 text-white/70 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white sm:text-3xl">Ready to send your first envelope?</h2>
            <p className="mt-3 text-brand-100 max-w-md mx-auto">
              Create your free account in seconds. No credit card required.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/register"
                className="inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-bold text-brand-700 shadow hover:bg-brand-50 transition-colors"
              >
                Get Started Free <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/docs"
                className="inline-flex items-center gap-2 rounded-xl border border-white/30 px-6 py-3 text-sm font-semibold text-white hover:bg-white/10 transition-colors"
              >
                View API Docs
              </Link>
            </div>
          </section>

        </div>
      </main>
      <Footer />
    </>
  );
}
