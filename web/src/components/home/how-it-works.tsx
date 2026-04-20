import { UserPlus, FileUp, Users, Send, PenTool, DownloadCloud } from 'lucide-react';

const FORMAT_BADGES = [
  { label: 'PDF',  bg: 'bg-red-50',    text: 'text-red-600',   border: 'border-red-200'   },
  { label: 'DOC',  bg: 'bg-blue-50',   text: 'text-blue-600',  border: 'border-blue-200'  },
  { label: 'DOCX', bg: 'bg-indigo-50', text: 'text-indigo-600',border: 'border-indigo-200'},
];

const STEPS = [
  {
    icon: UserPlus,
    step: '01',
    color: 'bg-blue-500',
    title: 'Create Your Account',
    description: 'Sign up in seconds and access your personal workspace — no credit card required.',
    extra: null,
  },
  {
    icon: FileUp,
    step: '02',
    color: 'bg-violet-500',
    title: 'Upload Your Document',
    description: 'Upload a PDF, DOC, or DOCX file. Each document in the envelope is stored securely and only sent to its assigned signers.',
    extra: 'formats',
  },
  {
    icon: Users,
    step: '03',
    color: 'bg-indigo-500',
    title: 'Add Signers',
    description: 'Enter the name and email of each person who needs to sign. Set the order if required.',
    extra: null,
  },
  {
    icon: Send,
    step: '04',
    color: 'bg-brand-600',
    title: 'Send for Signature',
    description: 'Hit send — each signer gets a secure, unique link to sign only their assigned document.',
    extra: null,
  },
  {
    icon: PenTool,
    step: '05',
    color: 'bg-emerald-500',
    title: 'Sign Digitally',
    description: 'Recipients open the link on any device, review only their document, and draw their signature.',
    extra: null,
  },
  {
    icon: DownloadCloud,
    step: '06',
    color: 'bg-orange-500',
    title: 'Track & Download',
    description: 'Monitor signing progress in real time and download the completed document anytime.',
    extra: null,
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="py-24 bg-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
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
          {STEPS.map(({ icon: Icon, step, color, title, description, extra }) => (
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
                {extra === 'formats' && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {FORMAT_BADGES.map(({ label, bg, text, border }) => (
                      <span
                        key={label}
                        className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-semibold ${bg} ${text} ${border}`}
                      >
                        {label}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
