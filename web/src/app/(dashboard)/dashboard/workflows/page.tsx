'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { workflowApi, type WorkflowSummaryDto, type WorkflowStatsDto } from '@/lib/api';
import { builtInTemplates, type BuiltInTemplate } from '@/data/workflowTemplates';
import { useRouter } from 'next/navigation';

type Tab = 'my-workflows' | 'templates' | 'monitoring';

const statusColors: Record<string, string> = {
  Draft:     'bg-yellow-50 text-yellow-700 border border-yellow-200',
  Published: 'bg-green-50  text-green-700  border border-green-200',
  Archived:  'bg-slate-50  text-slate-500  border border-slate-200',
};

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
  const [tab,       setTab]       = useState<Tab>('my-workflows');
  const [workflows, setWorkflows] = useState<WorkflowSummaryDto[]>([]);
  const [stats,     setStats]     = useState<WorkflowStatsDto | null>(null);
  const [loading,   setLoading]   = useState(true);
  const [creating,  setCreating]  = useState(false);
  const [newName,   setNewName]   = useState('');
  const [showNew,   setShowNew]   = useState(false);

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
          <div className="p-4">
            <p className="text-sm text-slate-500 mb-4">
              Click <strong>Use Template</strong> to create a new workflow pre-filled with a sample process you can customise.
            </p>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {builtInTemplates.map((tpl) => (
                <div key={tpl.id} className="p-4 rounded-xl border border-slate-200 space-y-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-semibold text-slate-800">{tpl.name}</span>
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700">
                        {tpl.category}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 line-clamp-3">{tpl.description}</p>
                  </div>
                  <button
                    disabled={creating}
                    onClick={() => handleUseTemplate(tpl)}
                    className="w-full py-2 text-xs font-medium text-blue-700 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors disabled:opacity-50"
                  >
                    Use Template →
                  </button>
                </div>
              ))}
            </div>
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

function MonitoringPanel() {
  const [instances, setInstances] = useState<import('@/lib/api').WorkflowInstanceDto[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      try {
        const res = await workflowApi.listAllInstances();
        setInstances(res.data);
      } catch {
        // silently handle
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const statusIcon: Record<string, string> = {
    Running: '▶', Completed: '✅', Failed: '⚠', Cancelled: '✕', Paused: '⏸',
  };

  if (loading) return <div className="py-12 text-center text-slate-400">Loading instances…</div>;
  if (instances.length === 0) return (
    <div className="py-12 text-center">
      <div className="text-3xl mb-2">📋</div>
      <p className="text-sm text-slate-400">No workflow runs yet. Trigger a published workflow to see activity here.</p>
    </div>
  );

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-xs text-slate-500 border-b border-slate-100">
            <th className="text-left py-2 pr-4 font-medium">Workflow</th>
            <th className="text-left py-2 pr-4 font-medium">Status</th>
            <th className="text-left py-2 pr-4 font-medium">Current Node</th>
            <th className="text-left py-2 pr-4 font-medium">Triggered By</th>
            <th className="text-left py-2 font-medium">Started</th>
          </tr>
        </thead>
        <tbody>
          {instances.map((inst) => (
            <tr key={inst.id} className="border-b border-slate-50 hover:bg-slate-50">
              <td className="py-2 pr-4 font-medium text-slate-800 truncate max-w-[180px]">{inst.workflowName}</td>
              <td className="py-2 pr-4">
                <span className="flex items-center gap-1">
                  {statusIcon[inst.status]} {inst.status}
                </span>
              </td>
              <td className="py-2 pr-4 text-slate-500 truncate max-w-[140px]">{inst.currentNodeId ?? '—'}</td>
              <td className="py-2 pr-4 text-slate-500 truncate max-w-[140px]">{inst.triggeredBy ?? '—'}</td>
              <td className="py-2 text-slate-400 text-xs">{new Date(inst.startedAt).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
