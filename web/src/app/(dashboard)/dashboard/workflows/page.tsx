'use client';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { workflowApi, type WorkflowSummaryDto, type WorkflowStatsDto } from '@/lib/api';
import { builtInTemplates, templateCategories, complexityColors, type BuiltInTemplate, type TemplateCategory } from '@/data/workflowTemplates';
import { useRouter } from 'next/navigation';

type Tab = 'my-workflows' | 'templates' | 'monitoring';

const statusColors: Record<string, string> = {
  Draft:     'bg-yellow-50 text-yellow-700 border border-yellow-200',
  Published: 'bg-green-50  text-green-700  border border-green-200',
  Archived:  'bg-slate-50  text-slate-500  border border-slate-200',
};

const HOW_IT_WORKS_STEPS = [
  { icon: '🎨', title: 'Design',    description: 'Drag & drop nodes onto the canvas — emails, signature requests, approvals, conditions, webhooks.' },
  { icon: '⚙️', title: 'Configure', description: 'Set recipients, roles, timeout rules, AI actions and webhook URLs per node.' },
  { icon: '🚀', title: 'Publish',   description: 'Review your flow then publish it to make it ready for triggering.' },
  { icon: '▶',  title: 'Trigger',   description: 'Fire the workflow manually, via an envelope event, or from an external webhook call.' },
  { icon: '📊', title: 'Monitor',   description: 'Track live execution, inspect each step, see errors and durations in real time.' },
] as const;

function StatsCard({ label, value, icon, color }: { label: string; value: number; icon: string; color: string }) {
  return (
    <div className={`rounded-xl p-5 flex items-center gap-4 ${color}`}>
      <span className="text-3xl">{icon}</span>
      <div>
        <div className="text-2xl font-bold">{value}</div>
        <div className="text-sm opacity-80">{label}</div>
      </div>
    </div>
  );
}

export default function WorkflowsPage() {
  const router = useRouter();
  const [tab,            setTab]            = useState<Tab>('my-workflows');
  const [workflows,      setWorkflows]      = useState<WorkflowSummaryDto[]>([]);
  const [stats,          setStats]          = useState<WorkflowStatsDto | null>(null);
  const [loading,        setLoading]        = useState(true);
  const [creating,       setCreating]       = useState(false);
  const [newName,        setNewName]        = useState('');
  const [showNew,        setShowNew]        = useState(false);
  const [activeCategory, setActiveCategory] = useState<TemplateCategory>('All');

  useEffect(() => {
    void (async () => {
      try {
        const [wfRes, stRes] = await Promise.all([
          workflowApi.list(),
          workflowApi.getStats(),
        ]);
        setWorkflows(wfRes.data);
        setStats(stRes.data);
      } catch {
        // handled silently — UI shows empty state
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const res = await workflowApi.create({ name: newName.trim() });
      router.push(`/dashboard/workflows/${res.data.id}`);
    } catch {
      setCreating(false);
    }
  };

  const handleRun = async (wf: WorkflowSummaryDto) => {
    try {
      await workflowApi.trigger(wf.id, {});
      // Refresh stats after triggering
      const stRes = await workflowApi.getStats();
      setStats(stRes.data);
    } catch {
      // Handled silently — server will return appropriate error
    }
  };

  const handleUseTemplate = async (tpl: BuiltInTemplate) => {
    setCreating(true);
    try {
      const res = await workflowApi.create({
        name: tpl.name,
        description: tpl.description,
        category: tpl.category,
        jsonDefinition: tpl.jsonDefinition,
      });
      router.push(`/dashboard/workflows/${res.data.id}`);
    } catch {
      setCreating(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Workflow Engine</h1>
          <p className="text-sm text-slate-500 mt-0.5">Automate your document signing processes</p>
        </div>
        <button
          onClick={() => setShowNew(true)}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-colors"
        >
          + New Workflow
        </button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <StatsCard label="Total Workflows"    value={stats.totalWorkflows}     icon="🔧" color="bg-blue-50   text-blue-800" />
          <StatsCard label="Published"          value={stats.publishedWorkflows}  icon="✅" color="bg-green-50  text-green-800" />
          <StatsCard label="Running Now"        value={stats.runningInstances}    icon="▶" color="bg-amber-50  text-amber-800" />
          <StatsCard label="Completed Runs"     value={stats.completedInstances}  icon="🏁" color="bg-teal-50   text-teal-800" />
          <StatsCard label="Failed Runs"        value={stats.failedInstances}     icon="⚠" color="bg-red-50    text-red-800" />
        </div>
      )}

      {/* ── How Workflows Work ── */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm px-5 py-4">
        <h2 className="text-sm font-semibold text-slate-700 mb-4">How Workflows Work</h2>
        <div className="flex flex-wrap items-start gap-3">
          {HOW_IT_WORKS_STEPS.map((step, i) => (
            <div key={i} className="flex items-start gap-2">
              <div className="flex flex-col items-center gap-1 shrink-0">
                <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-xs font-bold text-white">
                  {i + 1}
                </div>
                <span className="text-lg">{step.icon}</span>
              </div>
              <div className="pt-0.5 min-w-[110px] max-w-[150px]">
                <p className="text-xs font-semibold text-slate-700">{step.title}</p>
                <p className="text-xs text-slate-400 leading-relaxed mt-0.5">{step.description}</p>
              </div>
              {i < HOW_IT_WORKS_STEPS.length - 1 && (
                <span className="text-slate-300 text-lg mt-2 hidden sm:block">→</span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="border-b border-slate-100 flex">
          {(['my-workflows', 'templates', 'monitoring'] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-5 py-3 text-sm font-medium capitalize transition-colors ${
                tab === t ? 'border-b-2 border-blue-600 text-blue-700' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {t === 'my-workflows' ? 'My Workflows' : t === 'templates' ? 'Template Library' : 'Monitoring'}
            </button>
          ))}
        </div>

        {/* ── My Workflows ── */}
        {tab === 'my-workflows' && (
          <div className="p-4">
            {loading ? (
              <div className="py-16 text-center text-slate-400">Loading workflows…</div>
            ) : workflows.length === 0 ? (
              <div className="py-16 text-center">
                <div className="text-4xl mb-3">🔧</div>
                <p className="text-slate-500 text-sm">No workflows yet. Create one or use a template to get started.</p>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {workflows.map((wf) => (
                  <div
                    key={wf.id}
                    className="flex flex-col p-4 rounded-xl border border-slate-200 hover:border-blue-300 hover:shadow transition-all group"
                  >
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-2">
                        <Link
                          href={`/dashboard/workflows/${wf.id}`}
                          className="text-sm font-semibold text-slate-800 group-hover:text-blue-700 transition-colors line-clamp-1 flex-1 mr-2"
                        >
                          {wf.name}
                        </Link>
                        <span className={`flex-shrink-0 px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[wf.status] ?? ''}`}>
                          {wf.status}
                        </span>
                      </div>
                      {wf.description && (
                        <p className="text-xs text-slate-400 line-clamp-2 mb-3">{wf.description}</p>
                      )}
                      <div className="flex items-center justify-between text-xs text-slate-400 mb-3">
                        <span>v{wf.version} · {wf.category ?? 'General'}</span>
                        <span>{wf.instanceCount} run{wf.instanceCount !== 1 ? 's' : ''}</span>
                      </div>
                    </div>
                    <div className="flex gap-2 pt-2 border-t border-slate-100">
                      <Link
                        href={`/dashboard/workflows/${wf.id}`}
                        className="flex-1 py-1.5 text-xs font-medium text-center text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                      >
                        Edit
                      </Link>
                      {wf.status === 'Published' && (
                        <button
                          onClick={() => handleRun(wf)}
                          className="flex-1 py-1.5 text-xs font-medium text-green-700 border border-green-200 rounded-lg hover:bg-green-50 transition-colors"
                        >
                          ▶ Run
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Template Library ── */}
        {tab === 'templates' && (
          <div className="p-5 space-y-5">
            {/* Header */}
            <div>
              <h2 className="text-base font-semibold text-slate-800">Industry Template Library</h2>
              <p className="text-sm text-slate-500 mt-0.5">
                {builtInTemplates.length} ready-to-use workflows across {templateCategories.length - 1} industries. Click <strong>Use Template</strong> to clone and customise.
              </p>
            </div>

            {/* Category filter bar */}
            <div className="flex flex-wrap gap-2">
              {templateCategories.map((cat) => {
                const count = cat === 'All' ? builtInTemplates.length : builtInTemplates.filter(t => t.category === cat).length;
                return (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                      activeCategory === cat
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {cat} {count > 0 && <span className="ml-1 opacity-70">({count})</span>}
                  </button>
                );
              })}
            </div>

            {/* Template grid */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {builtInTemplates
                .filter(tpl => activeCategory === 'All' || tpl.category === activeCategory)
                .map((tpl) => (
                  <div key={tpl.id} className="flex flex-col rounded-xl border border-slate-200 hover:border-blue-300 hover:shadow-md transition-all overflow-hidden bg-white">
                    {/* Card header */}
                    <div className="px-4 pt-4 pb-3 border-b border-slate-100">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-2xl shrink-0">{tpl.icon}</span>
                          <span className="text-sm font-semibold text-slate-800 leading-tight">{tpl.name}</span>
                        </div>
                        <div className="flex flex-col items-end gap-1 shrink-0">
                          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-100 whitespace-nowrap">
                            {tpl.category}
                          </span>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${complexityColors[tpl.complexity]}`}>
                            {tpl.complexity}
                          </span>
                        </div>
                      </div>
                      <p className="text-xs text-slate-500 line-clamp-2 mt-1">{tpl.description}</p>
                    </div>

                    {/* Step flow preview */}
                    <div className="px-4 py-3 bg-slate-50 border-b border-slate-100">
                      <p className="text-xs font-medium text-slate-400 mb-2 uppercase tracking-wide">Workflow Steps</p>
                      <div className="flex flex-wrap items-center gap-1">
                        {tpl.steps.map((step, i) => (
                          <span key={i} className="flex items-center gap-1">
                            <span className="px-2 py-0.5 rounded text-xs bg-white border border-slate-200 text-slate-600 whitespace-nowrap shadow-sm">
                              {step}
                            </span>
                            {i < tpl.steps.length - 1 && (
                              <span className="text-slate-300 text-xs">→</span>
                            )}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Use cases */}
                    <div className="px-4 py-3 flex-1">
                      <p className="text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wide">Use Cases</p>
                      <ul className="space-y-0.5">
                        {tpl.useCases.map((uc, i) => (
                          <li key={i} className="text-xs text-slate-600 flex items-start gap-1.5">
                            <span className="text-blue-400 mt-0.5 shrink-0">•</span>
                            {uc}
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Action */}
                    <div className="px-4 pb-4">
                      <button
                        disabled={creating}
                        onClick={() => handleUseTemplate(tpl)}
                        className="w-full py-2 text-xs font-semibold text-blue-700 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors disabled:opacity-50 flex items-center justify-center gap-1"
                      >
                        Use Template →
                      </button>
                    </div>
                  </div>
                ))}
            </div>

            {builtInTemplates.filter(t => activeCategory === 'All' || t.category === activeCategory).length === 0 && (
              <div className="py-12 text-center text-slate-400 text-sm">No templates in this category yet.</div>
            )}
          </div>
        )}

        {/* ── Monitoring ── */}
        {tab === 'monitoring' && (
          <div className="p-4">
            <MonitoringPanel />
          </div>
        )}
      </div>

      {/* New workflow modal */}
      {showNew && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md space-y-4">
            <h2 className="text-lg font-semibold text-slate-800">New Workflow</h2>
            <input
              autoFocus
              type="text"
              placeholder="Workflow name…"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') void handleCreate(); }}
              className="w-full px-4 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowNew(false)}
                className="px-4 py-2 text-sm text-slate-500 hover:text-slate-700"
              >
                Cancel
              </button>
              <button
                disabled={creating || !newName.trim()}
                onClick={handleCreate}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {creating ? 'Creating…' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Monitoring sub-panel ──────────────────────────────────────────────────────

type WFInstance = import('@/lib/api').WorkflowInstanceDto;
type NodeExec   = import('@/lib/api').NodeExecutionDto;

const instanceStatusStyle: Record<string, string> = {
  Running:   'bg-blue-50   text-blue-700  border border-blue-200',
  Completed: 'bg-green-50  text-green-700 border border-green-200',
  Failed:    'bg-red-50    text-red-700   border border-red-200',
  Cancelled: 'bg-slate-100 text-slate-500 border border-slate-200',
  Paused:    'bg-amber-50  text-amber-700 border border-amber-200',
};
const nodeStatusStyle: Record<string, string> = {
  Pending:   'bg-slate-100 text-slate-500',
  Running:   'bg-blue-100  text-blue-700',
  Completed: 'bg-green-100 text-green-700',
  Failed:    'bg-red-100   text-red-700',
  Skipped:   'bg-slate-50  text-slate-400',
};
const nodeStatusIcon: Record<string, string> = {
  Running: '▶', Completed: '✅', Failed: '⚠', Cancelled: '✕', Paused: '⏸', Pending: '⏳', Skipped: '↷',
};

function durationStr(start: string, end?: string) {
  const ms = (end ? new Date(end) : new Date()).getTime() - new Date(start).getTime();
  if (ms < 60_000)     return `${Math.round(ms / 1000)}s`;
  if (ms < 3_600_000)  return `${Math.round(ms / 60_000)}m ${Math.round((ms % 60_000) / 1000)}s`;
  return `${(ms / 3_600_000).toFixed(1)}h`;
}

function secondsAgo(d: Date) {
  const s = Math.round((Date.now() - d.getTime()) / 1000);
  if (s < 5)  return 'just now';
  if (s < 60) return `${s}s ago`;
  return `${Math.round(s / 60)}m ago`;
}

function MonitoringPanel() {
  const [instances,     setInstances]     = useState<WFInstance[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [refreshing,    setRefreshing]    = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
  const [expandedId,    setExpandedId]    = useState<string | null>(null);
  const [tick,          setTick]          = useState(0);   // force re-render for 'X ago'
  const intervalRef  = useRef<ReturnType<typeof setInterval> | null>(null);
  const tickRef      = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchInstances = useCallback(async (showSpinner = false) => {
    if (showSpinner) setRefreshing(true);
    try {
      const res = await workflowApi.listAllInstances();
      setInstances(res.data);
      setLastRefreshed(new Date());
    } catch {
      // silently handle
    } finally {
      setLoading(false);
      if (showSpinner) setRefreshing(false);
    }
  }, []);

  // initial load
  useEffect(() => { void fetchInstances(); }, [fetchInstances]);

  // auto-refresh every 10 s when any run is active
  useEffect(() => {
    const hasActive = instances.some(i => i.status === 'Running' || i.status === 'Paused');
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (hasActive) {
      intervalRef.current = setInterval(() => void fetchInstances(), 10_000);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [instances, fetchInstances]);

  // tick every 5 s so '10s ago' text updates
  useEffect(() => {
    tickRef.current = setInterval(() => setTick(t => t + 1), 5_000);
    return () => { if (tickRef.current) clearInterval(tickRef.current); };
  }, []);

  const hasActive = instances.some(i => i.status === 'Running' || i.status === 'Paused');

  if (loading) return <div className="py-12 text-center text-slate-400">Loading instances…</div>;

  return (
    <div className="space-y-4 p-1">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-slate-700">Workflow Runs</h3>
          <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{instances.length}</span>
          {hasActive && (
            <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
              <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse inline-block" />
              Auto-refreshing every 10s
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {lastRefreshed && (
            <span key={tick} className="text-xs text-slate-400">Updated {secondsAgo(lastRefreshed)}</span>
          )}
          <button
            onClick={() => void fetchInstances(true)}
            disabled={refreshing}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 transition-colors"
          >
            <span className={`text-base leading-none ${refreshing ? 'animate-spin' : ''}`}>↻</span>
            {refreshing ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* Status summary pills */}
      {instances.length > 0 && (() => {
        const counts: Record<string, number> = {};
        instances.forEach(i => { counts[i.status] = (counts[i.status] ?? 0) + 1; });
        return (
          <div className="flex flex-wrap gap-2">
            {Object.entries(counts).map(([status, count]) => (
              <span key={status} className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${instanceStatusStyle[status] ?? ''}`}>
                {nodeStatusIcon[status]} {status} · {count}
              </span>
            ))}
          </div>
        );
      })()}

      {instances.length === 0 ? (
        <div className="py-12 text-center">
          <div className="text-3xl mb-2">📋</div>
          <p className="text-sm text-slate-400">No workflow runs yet. Trigger a published workflow to see activity here.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {instances.map((inst) => (
            <div key={inst.id} className="rounded-xl border border-slate-200 overflow-hidden bg-white">

              {/* ── Collapsed row header ── */}
              <button
                className="w-full px-4 py-3 flex items-center gap-3 hover:bg-slate-50 transition-colors text-left"
                onClick={() => setExpandedId(expandedId === inst.id ? null : inst.id)}
              >
                {/* Status */}
                <span className={`shrink-0 px-2.5 py-0.5 rounded-full text-xs font-semibold flex items-center gap-1 ${instanceStatusStyle[inst.status] ?? ''}`}>
                  {nodeStatusIcon[inst.status]} {inst.status}
                </span>

                {/* Name */}
                <span className="flex-1 text-sm font-medium text-slate-800 truncate">{inst.workflowName}</span>

                {/* Mini step-bar */}
                {inst.nodeExecutions.length > 0 && (
                  <div className="hidden md:flex items-center gap-0.5 shrink-0" title="Step progress">
                    {inst.nodeExecutions.map((ne, idx) => (
                      <div
                        key={idx}
                        title={`${ne.nodeLabel}: ${ne.status}`}
                        className={`h-2 w-4 rounded-sm ${
                          ne.status === 'Completed' ? 'bg-green-400' :
                          ne.status === 'Running'   ? 'bg-blue-400 animate-pulse' :
                          ne.status === 'Failed'    ? 'bg-red-400' :
                          ne.status === 'Skipped'   ? 'bg-slate-200' : 'bg-slate-200'
                        }`}
                      />
                    ))}
                  </div>
                )}

                {/* Right meta */}
                <div className="hidden sm:flex items-center gap-3 text-xs text-slate-400 shrink-0">
                  <span title="Duration">⏱ {durationStr(inst.startedAt, inst.completedAt)}</span>
                  <span title="Started">{new Date(inst.startedAt).toLocaleString()}</span>
                </div>

                <span className="text-slate-300 text-xs shrink-0">{expandedId === inst.id ? '▲' : '▼'}</span>
              </button>

              {/* ── Expanded detail ── */}
              {expandedId === inst.id && (
                <div className="border-t border-slate-100 bg-slate-50 px-4 pb-5 space-y-4">

                  {/* Meta grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4">
                    {([
                      ['Instance ID',  <span className="font-mono truncate block">{inst.id}</span>],
                      ['Duration',     durationStr(inst.startedAt, inst.completedAt)],
                      ['Triggered By', inst.triggeredBy ?? 'System'],
                      ['Started',      new Date(inst.startedAt).toLocaleString()],
                      ['Completed',    inst.completedAt ? new Date(inst.completedAt).toLocaleString() : '—'],
                      ...(inst.envelopeId ? [['Envelope ID', <span className="font-mono truncate block">{inst.envelopeId}</span>]] : []),
                      ...(inst.currentNodeId && inst.status === 'Running' ? [['Current Step', inst.currentNodeId]] : []),
                    ] as [string, React.ReactNode][]).map(([label, val]) => (
                      <div key={label}>
                        <p className="text-xs text-slate-400 mb-0.5">{label}</p>
                        <p className="text-xs font-medium text-slate-700">{val}</p>
                      </div>
                    ))}
                  </div>

                  {/* Error banner */}
                  {inst.errorMessage && (
                    <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2.5 text-xs text-red-700 flex gap-2">
                      <span className="shrink-0">⚠</span>
                      <div><strong>Error:</strong> {inst.errorMessage}</div>
                    </div>
                  )}

                  {/* Execution steps */}
                  {inst.nodeExecutions.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Execution Steps</p>
                      <div className="flex flex-wrap items-start gap-2">
                        {inst.nodeExecutions.map((ne: NodeExec, idx: number) => (
                          <div key={ne.id} className="flex items-start gap-1.5">
                            <div className={`rounded-xl border px-3 py-2.5 min-w-[130px] max-w-[180px] ${
                              ne.status === 'Completed' ? 'bg-green-50  border-green-200' :
                              ne.status === 'Running'   ? 'bg-blue-50   border-blue-200'  :
                              ne.status === 'Failed'    ? 'bg-red-50    border-red-200'   :
                              ne.status === 'Skipped'   ? 'bg-slate-50  border-slate-200' :
                              'bg-white border-slate-200'
                            }`}>
                              <div className="flex items-start justify-between gap-1 mb-1">
                                <span className="text-xs font-semibold text-slate-700 leading-tight">{ne.nodeLabel}</span>
                                <span className={`shrink-0 px-1.5 py-0.5 rounded text-xs font-medium ${nodeStatusStyle[ne.status] ?? ''}`}>
                                  {ne.status}
                                </span>
                              </div>
                              <p className="text-xs text-slate-400 italic mb-1">{ne.nodeType}</p>
                              {(ne.startedAt) && (
                                <p className="text-xs text-slate-400">
                                  ⏱ {ne.completedAt ? durationStr(ne.startedAt, ne.completedAt) : `${durationStr(ne.startedAt)} (running)`}
                                </p>
                              )}
                              {ne.errorMessage && (
                                <p className="text-xs text-red-600 mt-1 line-clamp-3 border-t border-red-100 pt-1">{ne.errorMessage}</p>
                              )}
                            </div>
                            {idx < inst.nodeExecutions.length - 1 && (
                              <span className="text-slate-300 mt-3 text-xs leading-none">→</span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {inst.nodeExecutions.length === 0 && (
                    <p className="text-xs text-slate-400 italic">No step executions recorded for this run.</p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
