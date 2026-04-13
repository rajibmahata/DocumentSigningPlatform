import { UserPlus, Building2, Send, PenTool } from 'lucide-react';

const STEPS = [
  {
    icon: UserPlus,
    step: '01',
    title: 'Register & Verify',
    description: 'Create your account and verify your email address to activate your signing portal.',
  },
  {
    icon: Building2,
    step: '02',
    title: 'Create Merchant',
    description: 'Set up your merchant account to get an API key. Each merchant has a usage limit (default 100 envelopes).',
  },
  {
    icon: Send,
    step: '03',
    title: 'Send Envelope',
    description: 'Upload your document, add signers with order and roles, and dispatch the signing envelope.',
  },
  {
    icon: PenTool,
    step: '04',
    title: 'Signer Signs',
    description: 'Signers receive a secure email link, draw their signature, and submit — confirmation email follows.',
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="py-24 bg-white">
      <div className="mx-auto max-w-7xl px-6">
        <div className="text-center mb-14">
          <h2 className="text-3xl font-bold text-gray-900">How It Works</h2>
          <p className="mt-3 text-gray-500 max-w-xl mx-auto">
            Four simple steps from registration to a fully signed document.
          </p>
        </div>

        <div className="relative grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Connector line */}
          <div className="absolute hidden lg:block top-10 left-[12.5%] right-[12.5%] h-px bg-gradient-to-r from-brand-200 via-brand-400 to-brand-200" />

          {STEPS.map(({ icon: Icon, step, title, description }) => (
            <div key={step} className="relative flex flex-col items-center text-center p-6">
              <div className="relative z-10 flex h-20 w-20 items-center justify-center rounded-2xl bg-brand-600 text-white shadow-lg mb-4">
                <Icon className="h-8 w-8" />
                <span className="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-white text-xs font-bold text-brand-600 border border-brand-200 shadow">
                  {step}
                </span>
              </div>
              <h3 className="text-base font-semibold text-gray-900">{title}</h3>
              <p className="mt-2 text-sm text-gray-500 leading-relaxed">{description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
