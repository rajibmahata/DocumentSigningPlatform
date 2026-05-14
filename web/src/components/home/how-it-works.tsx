import { UserPlus, FileUp, Users, Send, PenTool, DownloadCloud, GitBranch, Play, Settings, Eye, CheckCircle2, Webhook } from 'lucide-react';
import Link from 'next/link';

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

const WORKFLOW_STEPS = [
  {
    icon: GitBranch,
    step: '1',
    color: 'bg-purple-600',
    title: 'Design Workflow',
    description: 'Drag nodes onto the canvas and connect them to define your automation logic.',
  },
  {
    icon: Settings,
    step: '2',
    color: 'bg-indigo-600',
    title: 'Configure Nodes',
    description: 'Set email templates, approval assignees, delays, conditions, and AI actions per node.',
  },
  {
    icon: Play,
    step: '3',
    color: 'bg-blue-600',
    title: 'Publish & Trigger',
    description: 'Publish the workflow and trigger it manually, on envelope events, or on a schedule.',
  },
  {
    icon: CheckCircle2,
    step: '4',
    color: 'bg-emerald-600',
    title: 'Execute Nodes',
    description: 'The engine walks the graph sequentially — emails, delays, approvals, and AI actions fire automatically.',
  },
  {
    icon: Eye,
    step: '5',
    color: 'bg-amber-500',
    title: 'Monitor Runs',
    description: 'Track every run in real time — see current node, execution log, and timestamps.',
  },
  {
    icon: Webhook,
    step: '6',
    color: 'bg-rose-500',
    title: 'Webhook Callbacks',
    description: 'Receive HTTP callbacks at each milestone so your system stays in sync.',
  },
];

const WORKFLOW_NODES = [
  { emoji: '▶️', label: 'Start / End',       desc: 'Entry and exit points of the workflow',           color: 'border-green-200 bg-green-50' },
  { emoji: '📧', label: 'Send Email',         desc: 'Auto-send templated notification emails',         color: 'border-blue-200 bg-blue-50' },
  { emoji: '✅', label: 'Approval Gate',      desc: 'Pause and wait for a named approver',             color: 'border-amber-200 bg-amber-50' },
  { emoji: '⏱', label: 'Delay',              desc: 'Wait N hours/days before continuing',             color: 'border-orange-200 bg-orange-50' },
  { emoji: '🔀', label: 'Condition',          desc: 'Branch on true/false logic',                      color: 'border-purple-200 bg-purple-50' },
  { emoji: '📄', label: 'Doc Template',       desc: 'Generate a document from a template',             color: 'border-indigo-200 bg-indigo-50' },
  { emoji: '✍️', label: 'Signature Request',  desc: 'Send a signing envelope automatically',           color: 'border-brand-200 bg-brand-50' },
  { emoji: '🤖', label: 'AI Action',          desc: 'Run AI analysis or clause summarisation',         color: 'border-violet-200 bg-violet-50' },
  { emoji: '🔗', label: 'Webhook',            desc: 'POST event data to your external endpoint',       color: 'border-rose-200 bg-rose-50' },
  { emoji: '📣', label: 'Send Reminder',      desc: 'Auto-remind signers who haven\'t acted yet',     color: 'border-sky-200 bg-sky-50' },
];

export function HowItWorks() {
  return (
    <>
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

    {/* ─── Workflow Automation Steps ─────────────────────────────────────── */}
    <section id="workflow-automation" className="py-24 bg-gradient-to-br from-purple-50 via-white to-indigo-50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="text-center mb-16">
          <span className="inline-block rounded-full bg-purple-50 border border-purple-200 px-4 py-1 text-xs font-semibold uppercase tracking-widest text-purple-700 mb-4">
            Workflow Automation
          </span>
          <h2 className="text-3xl font-bold text-gray-900 sm:text-4xl">
            Build Automated Signing Workflows
          </h2>
          <p className="mt-4 text-gray-500 max-w-2xl mx-auto text-base">
            Design multi-step document signing processes with our visual drag-and-drop builder.
            Connect approval gates, AI analysis, reminders, and webhooks — no code required.
          </p>
        </div>

        {/* Workflow process steps — horizontal flow */}
        <div className="relative">
          {/* Connecting line (desktop) */}
          <div className="hidden lg:block absolute top-10 left-[calc(8.33%+24px)] right-[calc(8.33%+24px)] h-0.5 bg-gradient-to-r from-purple-200 via-indigo-300 to-purple-200" />

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-6">
            {WORKFLOW_STEPS.map(({ icon: Icon, step, color, title, description }) => (
              <div key={step} className="flex flex-col items-center text-center group">
                {/* Icon bubble */}
                <div className={`relative z-10 flex h-12 w-12 items-center justify-center rounded-full ${color} text-white shadow-lg group-hover:scale-110 transition-transform mb-3`}>
                  <Icon className="h-6 w-6" />
                  <span className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-white border-2 border-current text-[10px] font-bold text-gray-700">
                    {step}
                  </span>
                </div>
                <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
                <p className="mt-1 text-xs text-gray-500 leading-relaxed">{description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Node type legend */}
        <div className="mt-16 rounded-2xl bg-white border border-gray-100 shadow-sm p-8">
          <h3 className="text-base font-semibold text-gray-800 mb-6 text-center">Available Workflow Node Types</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {WORKFLOW_NODES.map(({ emoji, label, desc, color }) => (
              <div key={label} className={`rounded-xl border p-4 ${color}`}>
                <div className="text-2xl mb-1">{emoji}</div>
                <div className="text-sm font-semibold">{label}</div>
                <div className="text-xs text-gray-500 mt-0.5 leading-tight">{desc}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-10 text-center">
          <Link
            href="/dashboard/workflows"
            className="inline-flex items-center gap-2 rounded-xl bg-purple-600 px-6 py-3 text-sm font-semibold text-white shadow hover:bg-purple-700 transition-colors"
          >
            <GitBranch className="h-4 w-4" />
            Open Workflow Builder
          </Link>
          <Link
            href="/docs#workflows"
            className="ml-4 inline-flex items-center gap-2 rounded-xl border border-purple-200 px-6 py-3 text-sm font-semibold text-purple-700 hover:bg-purple-50 transition-colors"
          >
            View Workflow API Docs
          </Link>
        </div>
      </div>
    </section>
    </>
  );
}
