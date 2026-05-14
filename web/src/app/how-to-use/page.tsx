import Link from 'next/link';
import { ArrowRight, UserPlus, Building2, Key, FileUp, Users, Send, Brain, ScanText, CreditCard, Fingerprint, Link2, Palette, ToggleLeft, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

/* ─── Types ─────────────────────────────────────────────────────────── */
interface Step {
  icon: React.ElementType;
  number: string;
  title: string;
  desc: string;
  code?: string;
  badge?: string;
  badgeColor?: string;
}

interface Section {
  id: string;
  title: string;
  subtitle: string;
  steps: Step[];
  dark?: boolean;
}

/* ─── Data ───────────────────────────────────────────────────────────── */
const SECTIONS: Section[] = [
  {
    id: 'getting-started',
    title: 'Getting Started',
    subtitle: 'Register, create a merchant, and send your first envelope in under 5 minutes.',
    steps: [
      {
        icon: UserPlus,
        number: '01',
        title: 'Create Your Account',
        desc: 'Register at /register with your name, email, and password. Check your inbox for the verification email and click the link to activate your account.',
        code: `POST /api/auth/register
{
  "firstName": "Alice",
  "lastName": "Smith",
  "email": "alice@example.com",
  "password": "Str0ngP@ss!"
}`,
      },
      {
        icon: Key,
        number: '02',
        title: 'Log In & Get Your JWT',
        desc: 'Log in to receive a JWT Bearer token. Include this token in the Authorization header for all protected endpoints.',
        code: `POST /api/auth/login
{ "email": "alice@example.com", "password": "Str0ngP@ss!" }

# Response → use token in header:
Authorization: Bearer eyJhbGci...`,
      },
      {
        icon: Building2,
        number: '03',
        title: 'Create a Merchant',
        desc: 'A Merchant is your isolated workspace — it has its own API key, usage limits, branding, and audit log. You must create one before sending envelopes.',
        code: `POST /api/merchants
Authorization: Bearer eyJ...
{ "name": "Acme Legal Ltd", "email": "legal@acme.com" }

# Response → save merchantId and apiKey`,
      },
      {
        icon: FileUp,
        number: '04',
        title: 'Create an Envelope',
        desc: 'Upload one or more documents (PDF, DOC, DOCX) and assign each one to a signer. Each signer receives a unique, secure link to sign only their document.',
        code: `POST /api/envelopes
X-Api-Key: <your-merchant-api-key>
{
  "subject": "NDA for Project X",
  "signers": [
    { "name": "Bob Jones", "email": "bob@corp.com",
      "documentTitle": "NDA", "documentFileName": "nda.pdf",
      "documentContent": "<base64-encoded-pdf>" }
  ]
}`,
      },
      {
        icon: Users,
        number: '05',
        title: 'Signers Receive Secure Links',
        desc: 'Each signer gets an email with a unique, expiring signing link. They open it on any device, review their document, draw or type their signature, and submit.',
      },
      {
        icon: CheckCircle,
        number: '06',
        title: 'Track & Download',
        desc: 'Monitor envelope status in the dashboard or via the API. Download the signed document (with embedded signature) once all signers have completed.',
        code: `GET /api/envelopes/{envelopeId}
X-Api-Key: <your-api-key>
# → status: "Completed"`,
      },
    ],
  },

  {
    id: 'phase1-features',
    title: 'Phase 1 — AI & Automation Features',
    subtitle: 'Unlock powerful AI analysis, blockchain notarisation, payments, and more.',
    dark: true,
    steps: [
      {
        icon: Brain,
        number: '01',
        title: 'AI Contract Summary',
        badge: 'AI',
        badgeColor: 'bg-indigo-500/20 text-indigo-300 border-indigo-400/30',
        desc: 'After uploading a document, call POST /summary to ask GPT-4o-mini to read the contract and return a plain-English summary of obligations, key dates, and risk areas. Results are cached — subsequent GET requests return instantly.',
        code: `# Generate summary
POST /api/documents/{docId}/summary
X-Api-Key: <your-api-key>

# Retrieve cached summary
GET /api/documents/{docId}/summary
X-Api-Key: <your-api-key>`,
      },
      {
        icon: ScanText,
        number: '02',
        title: 'OCR & Field Detection',
        badge: 'AI',
        badgeColor: 'bg-indigo-500/20 text-indigo-300 border-indigo-400/30',
        desc: 'Run OCR on scanned image-PDFs to extract machine-readable text (for AI analysis). Then use field detection to automatically find where signature boxes, checkboxes, and initials lines appear — no manual placement needed.',
        code: `# Run OCR on scanned doc
POST /api/documents/{docId}/ocr
X-Api-Key: <your-api-key>

# Detect signature field positions
POST /api/documents/{docId}/fields
GET  /api/documents/{docId}/fields`,
      },
      {
        icon: Send,
        number: '03',
        title: 'Bulk CSV Send',
        badge: 'Automation',
        badgeColor: 'bg-sky-500/20 text-sky-300 border-sky-400/30',
        desc: 'Upload a CSV file (up to 1 000 rows) and a common document — DocSignerHub dispatches personalised envelopes for every recipient in one API call. Track the entire batch with a single batchId.',
        code: `POST /api/envelopes/bulk
X-Api-Key: <your-api-key>
Content-Type: multipart/form-data

csvFile = recipients.csv
subject = "Please review and sign"`,
      },
      {
        icon: CreditCard,
        number: '04',
        title: 'Stripe Payment Gate',
        badge: 'Payments',
        badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-400/30',
        desc: 'Require payment before or after signing. Create a PaymentIntent via the API, redirect the signer to Stripe Checkout, and handle the stripe-webhook to confirm payment. The envelope can complete only after payment succeeds.',
        code: `POST /api/payments/intent
X-Api-Key: <your-api-key>
{
  "envelopeId": "env-uuid",
  "amountCents": 4999,
  "currency": "gbp"
}
# → clientSecret for Stripe Elements`,
      },
      {
        icon: Fingerprint,
        number: '05',
        title: 'Identity Verification',
        badge: 'Security',
        badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-400/30',
        desc: 'Require signers to upload a government-issued ID. The AI pipeline scores confidence 0–100. Scores ≥ 80 auto-approve; lower scores enter a review queue where an admin can approve or reject.',
        code: `POST /api/verification/start
X-Api-Key: <your-api-key>
{
  "signingRequestId": "req-uuid",
  "documentType": "passport",
  "idImageBase64": "/9j/4AAQ..."
}
# → { status: "Approved", confidenceScore: 92 }`,
      },
      {
        icon: Link2,
        number: '06',
        title: 'Blockchain Notarisation',
        badge: 'Blockchain',
        badgeColor: 'bg-violet-500/20 text-violet-300 border-violet-400/30',
        desc: 'Write the SHA-256 hash of a completed envelope to Polygon. Anyone can independently verify authenticity by recomputing the hash and checking the transaction on Polygonscan — no trust in DocSignerHub required.',
        code: `# Notarise a completed envelope
POST /api/envelopes/{envelopeId}/blockchain
X-Api-Key: <your-api-key>

# Returns: txHash, blockNumber, documentHash
GET /api/envelopes/{envelopeId}/blockchain`,
      },
      {
        icon: Palette,
        number: '07',
        title: 'White-Label Branding',
        badge: 'Customisation',
        badgeColor: 'bg-pink-500/20 text-pink-300 border-pink-400/30',
        desc: 'Replace the DocSignerHub branding with your own logo, primary colour, portal title, and email sender name. Signers see your brand throughout the entire signing experience.',
        code: `PUT /api/merchants/{merchantId}/branding
X-Api-Key: <your-api-key>
{
  "primaryColor": "#7C3AED",
  "logoUrl": "https://cdn.example.com/logo.png",
  "portalTitle": "Acme Sign",
  "emailSenderName": "Acme Contracts"
}`,
      },
      {
        icon: ToggleLeft,
        number: '08',
        title: 'Per-Merchant Feature Flags',
        badge: 'Admin',
        badgeColor: 'bg-gray-400/20 text-gray-300 border-gray-400/30',
        desc: 'Enable or disable AI, blockchain, Stripe, and other Phase 1 features per merchant. Perfect for offering tiered plans — charge only for the capabilities each customer uses.',
        code: `# Enable blockchain for one merchant
PUT /api/merchants/{merchantId}/features/blockchain
X-Api-Key: <your-api-key>
{ "enabled": true }

# List all flags
GET /api/merchants/{merchantId}/features`,
      },
    ],
  },
];

/* ─── Page ───────────────────────────────────────────────────────────── */
export default function HowToUsePage() {
  return (
    <div className="min-h-screen bg-gray-50">

      {/* Hero banner */}
      <div className="bg-gradient-to-br from-brand-50 via-white to-blue-50 border-b border-gray-200 py-16 px-6">
        <div className="mx-auto max-w-4xl text-center">
          <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-brand-700 transition-colors mb-6">
            ← Back to Home
          </Link>
          <h1 className="text-4xl font-extrabold text-gray-900 sm:text-5xl">
            How to Use{' '}
            <span className="bg-gradient-to-r from-brand-600 to-blue-500 bg-clip-text text-transparent">
              DocSignerHub
            </span>
          </h1>
          <p className="mt-5 text-lg text-gray-600 max-w-2xl mx-auto">
            A step-by-step guide to sending your first envelope and unlocking AI, blockchain, payments, and identity verification.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <a href="#getting-started" className="rounded-full border border-brand-200 bg-brand-50 px-4 py-1.5 text-sm text-brand-700 font-medium hover:bg-brand-100 transition">
              Getting Started
            </a>
            <a href="#phase1-features" className="rounded-full border border-indigo-200 bg-indigo-50 px-4 py-1.5 text-sm text-indigo-700 font-medium hover:bg-indigo-100 transition">
              AI &amp; Automation
            </a>
            <Link href="/docs" className="rounded-full border border-gray-200 bg-white px-4 py-1.5 text-sm text-gray-700 font-medium hover:bg-gray-50 transition">
              Full API Reference →
            </Link>
          </div>
        </div>
      </div>

      {/* Sections */}
      {SECTIONS.map((section) => (
        <section
          key={section.id}
          id={section.id}
          className={section.dark
            ? 'bg-gradient-to-br from-indigo-950 via-blue-950 to-gray-950 py-20 px-6'
            : 'bg-white py-20 px-6 border-b border-gray-100'}
        >
          <div className="mx-auto max-w-5xl">
            <div className="text-center mb-14">
              <h2 className={`text-3xl font-bold ${section.dark ? 'text-white' : 'text-gray-900'}`}>
                {section.title}
              </h2>
              <p className={`mt-3 text-base max-w-xl mx-auto ${section.dark ? 'text-gray-400' : 'text-gray-500'}`}>
                {section.subtitle}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {section.steps.map(({ icon: Icon, number, title, desc, code, badge, badgeColor }) => (
                <div
                  key={number}
                  className={`rounded-2xl p-6 ${section.dark
                    ? 'bg-white/5 border border-white/10 hover:bg-white/10'
                    : 'border border-gray-100 shadow-sm hover:shadow-md'} transition-all`}
                >
                  {/* Header */}
                  <div className="flex items-start gap-4 mb-4">
                    <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${section.dark ? 'bg-indigo-500/20 text-indigo-300' : 'bg-brand-50 text-brand-600'}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className={`text-xs font-mono font-bold ${section.dark ? 'text-gray-500' : 'text-gray-400'}`}>
                          {number}
                        </span>
                        {badge && (
                          <span className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${badgeColor}`}>
                            {badge}
                          </span>
                        )}
                      </div>
                      <h3 className={`text-base font-semibold ${section.dark ? 'text-white' : 'text-gray-900'}`}>
                        {title}
                      </h3>
                    </div>
                  </div>

                  {/* Description */}
                  <p className={`text-sm leading-relaxed mb-4 ${section.dark ? 'text-gray-300' : 'text-gray-600'}`}>
                    {desc}
                  </p>

                  {/* Code snippet */}
                  {code && (
                    <div className="rounded-xl bg-gray-900 overflow-hidden">
                      <pre className="px-4 py-4 text-xs font-mono text-green-400 overflow-x-auto whitespace-pre leading-relaxed">
                        {code}
                      </pre>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>
      ))}

      {/* CTA footer */}
      <section className="bg-white border-t border-gray-100 py-16 px-6">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-2xl font-bold text-gray-900">Ready to get started?</h2>
          <p className="mt-3 text-gray-500">
            Create a free account and send your first envelope in minutes. No credit card required.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button size="lg" asChild>
              <Link href="/register">
                Create Free Account <ArrowRight className="h-5 w-5" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/docs">Full API Reference</Link>
            </Button>
            <Button size="lg" variant="ghost" asChild>
              <Link href="/faq">FAQ</Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
