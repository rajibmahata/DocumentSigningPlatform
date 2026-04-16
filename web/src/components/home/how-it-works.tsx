import { UserPlus, FileUp, Users, Send, PenTool, DownloadCloud } from 'lucide-react';

const STEPS = [
  {
    icon: UserPlus,
    step: '01',
    color: 'bg-blue-500',
    title: 'Create Your Account',
    description: 'Sign up in seconds and access your personal workspace — no credit card required.',
  },
  {
    icon: FileUp,
    step: '02',
    color: 'bg-violet-500',
    title: 'Upload Your Document',
    description: 'Upload any PDF you want others to sign. We keep it secure and ready to send.',
  },
  {
    icon: Users,
    step: '03',
    color: 'bg-indigo-500',
    title: 'Add Signers',
    description: 'Enter the name and email of each person who needs to sign. Set the order if required.',
  },
  {
    icon: Send,
    step: '04',
    color: 'bg-brand-600',
    title: 'Send for Signature',
    description: 'Hit send — each signer gets a secure, unique link delivered straight to their inbox.',
  },
  {
    icon: PenTool,
    step: '05',
    color: 'bg-emerald-500',
    title: 'Sign Digitally',
    description: 'Recipients open the link on any device, review the document, and draw their signature.',
  },
  {
    icon: DownloadCloud,
    step: '06',
    color: 'bg-orange-500',
    title: 'Track & Download',
    description: 'Monitor signing progress in real time and download the completed document anytime.',
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="py-24 bg-white">
      <div className="mx-auto max-w-7xl px-6">
        {/* Section header */}
        <div className="text-center mb-16">
          <span className="inline-block rounded-full bg-brand-50 border border-brand-200 px-4 py-1 text-xs font-semibold uppercase tracking-widest text-brand-700 mb-4">
            How It Works
          </span>
          <h2 className="text-3xl font-bold text-gray-900 sm:text-4xl">
            Send &amp; Sign in Six Simple Steps
          </h2>
          <p className="mt-4 text-gray-500 max-w-xl mx-auto text-base">
            No technical knowledge needed. From upload to signed document in minutes.
          </p>
        </div>

        {/* Step grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {STEPS.map(({ icon: Icon, step, color, title, description }) => (
            <div
              key={step}
              className="group relative flex gap-5 rounded-2xl border border-gray-100 bg-gray-50 p-6 shadow-sm hover:shadow-md hover:border-brand-200 transition-all"
            >
              {/* Step badge */}
              <span className="absolute top-4 right-5 text-xs font-bold text-gray-300 select-none">
                {step}
              </span>

              {/* Icon */}
              <div className={`flex-shrink-0 flex h-12 w-12 items-center justify-center rounded-xl ${color} text-white shadow`}>
                <Icon className="h-6 w-6" />
              </div>

              {/* Text */}
              <div>
                <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
                <p className="mt-1.5 text-sm text-gray-500 leading-relaxed">{description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
