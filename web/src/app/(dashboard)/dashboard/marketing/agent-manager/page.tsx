'use client';

import { useEffect, useState } from 'react';
import { agentApi, AgentDto, AgentExecutionDto } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Link from 'next/link';
import {
  Bot, Plus, Play, Pause, Loader2, RefreshCw, Cpu,
  Mail, Globe2, BarChart3, Target, ShieldCheck, PenSquare,
  Trash2, Clock, CheckCircle2, XCircle, AlertCircle,
  Users, Activity, Zap, Sparkles,
} from 'lucide-react';

const AGENT_TYPES = [
  { value: 'email_marketing', label: 'Email Marketing',  icon: Mail },
  { value: 'social_media',    label: 'Social Media',     icon: Globe2 },
  { value: 'campaign',        label: 'Campaign',         icon: Target },
  { value: 'blog',            label: 'Blog Writer',      icon: PenSquare },
  { value: 'validation',      label: 'Validation',       icon: ShieldCheck },
  { value: 'analytics',       label: 'Analytics Intel',  icon: BarChart3 },
];

function getIcon(type: string) {
  return AGENT_TYPES.find(t => t.value === type)?.icon ?? Bot;
}

function statusVariant(agent: AgentDto): 'success' | 'danger' | 'warning' | 'secondary' {
  if (!agent.isEnabled) return 'secondary';
  const s = agent.statusSummary?.lastStatus;
  if (s === 'success')          return 'success';
  if (s === 'failed')           return 'danger';
  if (s === 'pending_approval') return 'warning';
  return 'secondary';
}

function statusLabel(agent: AgentDto) {
  if (!agent.isEnabled) return 'Disabled';
  const s = agent.statusSummary?.lastStatus;
  if (!s) return 'Idle';
  return s.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase());
}

const BLANK = {
  agentName: '', agentType: 'email_marketing', description: '',
  isEnabled: true, scheduleExpression: '', timezone: 'UTC',
  approvalMode: 'approval', maxRetries: 3,
};

export default function AgentManagerPage() {
  const [agents,   setAgents]   = useState<AgentDto[]>([]);
  const [execs,    setExecs]    = useState<AgentExecutionDto[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form,     setForm]     = useState({ ...BLANK });
  const [creating, setCreating] = useState(false);
  const [running,  setRunning]  = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [error,    setError]    = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [aRes, eRes] = await Promise.all([
        agentApi.getAgents(),
        agentApi.getAllExecutions(),
      ]);
      setAgents(aRes.data ?? []);
      setExecs(eRes.data ?? []);
    } catch { setError('Failed to load'); }
    finally  { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      await agentApi.createAgent(form);
      setShowForm(false);
      setForm({ ...BLANK });
      await load();
    } catch { setError('Failed to create agent'); }
    finally  { setCreating(false); }
  };

  const handleToggle = async (a: AgentDto) => {
    try { await agentApi.toggleAgent(a.id, !a.isEnabled); await load(); }
    catch { setError('Failed to toggle'); }
  };

  const handleRun = async (id: string) => {
    setRunning(id);
    try { await agentApi.executeAgent(id, 'manual'); await load(); }
    catch { setError('Failed to execute'); }
    finally { setRunning(null); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this agent? All history will be lost.')) return;
    setDeleting(id);
    try { await agentApi.deleteAgent(id); await load(); }
    catch { setError('Failed to delete'); }
    finally { setDeleting(null); }
  };

  const total   = agents.length;
  const enabled = agents.filter(a => a.isEnabled).length;
  const pending = execs.filter(e => e.executionStatus === 'pending_approval').length;
  const runs24h = execs.filter(e => Date.now() - new Date(e.startedAt).getTime() < 86400000).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Bot className="h-6 w-6 text-indigo-600" />
            AI Agent Manager
          </h1>
          <p className="text-sm text-slate-500 mt-1">Orchestrate your autonomous AI marketing workforce</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={load} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </Button>
          <Link href="/dashboard/marketing/agent-manager/presets">
            <Button variant="outline">
              <Sparkles className="h-4 w-4 mr-1" /> Preset Gallery
            </Button>
          </Link>
          <Button onClick={() => setShowForm(s => !s)}>
            <Plus className="h-4 w-4 mr-1" /> New Agent
          </Button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm flex justify-between">
          <span>{error}</span>
          <button className="underline" onClick={() => setError(null)}>Dismiss</button>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card><CardContent className="pt-4 flex items-center gap-3">
          <div className="p-2 bg-indigo-50 rounded-lg"><Cpu className="h-5 w-5 text-indigo-600" /></div>
          <div><p className="text-2xl font-bold">{total}</p><p className="text-xs text-slate-500">Total Agents</p></div>
        </CardContent></Card>
        <Card><CardContent className="pt-4 flex items-center gap-3">
          <div className="p-2 bg-green-50 rounded-lg"><Zap className="h-5 w-5 text-green-600" /></div>
          <div><p className="text-2xl font-bold text-green-700">{enabled}</p><p className="text-xs text-slate-500">Active</p></div>
        </CardContent></Card>
        <Card><CardContent className="pt-4 flex items-center gap-3">
          <div className="p-2 bg-yellow-50 rounded-lg"><AlertCircle className="h-5 w-5 text-yellow-600" /></div>
          <div><p className="text-2xl font-bold text-yellow-700">{pending}</p><p className="text-xs text-slate-500">Pending Approval</p></div>
        </CardContent></Card>
        <Card><CardContent className="pt-4 flex items-center gap-3">
          <div className="p-2 bg-blue-50 rounded-lg"><Activity className="h-5 w-5 text-blue-600" /></div>
          <div><p className="text-2xl font-bold text-blue-700">{runs24h}</p><p className="text-xs text-slate-500">Runs (24h)</p></div>
        </CardContent></Card>
      </div>

      {/* Quick Nav */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Link href="/dashboard/marketing/agent-manager/approvals">
          <Card className="hover:border-yellow-400 cursor-pointer transition-colors">
            <CardContent className="py-3 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-yellow-500" />
              <div>
                <p className="text-sm font-medium">Approvals</p>
                <p className="text-xs text-yellow-600">{pending > 0 ? `${pending} waiting` : 'None pending'}</p>
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link href="/dashboard/marketing/agent-manager/interactions">
          <Card className="hover:border-indigo-400 cursor-pointer transition-colors">
            <CardContent className="py-3 flex items-center gap-2">
              <Users className="h-4 w-4 text-indigo-500" />
              <div><p className="text-sm font-medium">Customer Memory</p><p className="text-xs text-slate-400">Interactions CRM</p></div>
            </CardContent>
          </Card>
        </Link>
        <Link href="/dashboard/marketing/agent-manager/agent-analytics">
          <Card className="hover:border-blue-400 cursor-pointer transition-colors">
            <CardContent className="py-3 flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-blue-500" />
              <div><p className="text-sm font-medium">Analytics</p><p className="text-xs text-slate-400">Performance</p></div>
            </CardContent>
          </Card>
        </Link>
        <Link href="/dashboard/marketing/blogs">
          <Card className="hover:border-purple-400 cursor-pointer transition-colors">
            <CardContent className="py-3 flex items-center gap-2">
              <PenSquare className="h-4 w-4 text-purple-500" />
              <div><p className="text-sm font-medium">Blogs</p><p className="text-xs text-slate-400">AI Content</p></div>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Create Agent Form */}
      {showForm && (
        <Card>
          <CardHeader><CardTitle>Create New Agent</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={handleCreate} className="grid sm:grid-cols-2 gap-4">
              <div>
                <Label>Agent Name *</Label>
                <Input value={form.agentName} onChange={e => setForm(f => ({ ...f, agentName: e.target.value }))} required placeholder="e.g. Daily Email Sender" />
              </div>
              <div>
                <Label>Agent Type</Label>
                <select className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm mt-1" value={form.agentType} onChange={e => setForm(f => ({ ...f, agentType: e.target.value }))}>
                  {AGENT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div className="sm:col-span-2">
                <Label>Description</Label>
                <Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="What does this agent do?" />
              </div>
              <div>
                <Label>Schedule (cron: M H * * *)</Label>
                <Input value={form.scheduleExpression} onChange={e => setForm(f => ({ ...f, scheduleExpression: e.target.value }))} placeholder="0 9 * * * (9am daily)" />
              </div>
              <div>
                <Label>Approval Mode</Label>
                <select className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm mt-1" value={form.approvalMode} onChange={e => setForm(f => ({ ...f, approvalMode: e.target.value }))}>
                  <option value="auto">Auto (no approval needed)</option>
                  <option value="approval">Approval required</option>
                  <option value="hybrid">Hybrid</option>
                </select>
              </div>
              <div>
                <Label>Timezone</Label>
                <Input value={form.timezone} onChange={e => setForm(f => ({ ...f, timezone: e.target.value }))} placeholder="UTC" />
              </div>
              <div>
                <Label>Max Retries</Label>
                <Input type="number" min={0} max={10} value={form.maxRetries} onChange={e => setForm(f => ({ ...f, maxRetries: Number(e.target.value) }))} />
              </div>
              <div className="sm:col-span-2 flex gap-2 pt-2">
                <Button type="submit" disabled={creating}>
                  {creating ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Plus className="h-4 w-4 mr-1" />}
                  Create Agent
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Agent Cards */}
      {loading ? (
        <div className="flex items-center justify-center py-20 text-slate-500">
          <Loader2 className="h-6 w-6 animate-spin mr-2" /> Loading agents…
        </div>
      ) : agents.length === 0 ? (
        <Card>
          <CardContent className="py-20 text-center">
            <Cpu className="h-14 w-14 text-slate-200 mx-auto mb-4" />
            <p className="text-slate-500 font-medium">No agents configured yet.</p>
            <p className="text-sm text-slate-400 mt-1">Create your first AI agent to start automating your marketing.</p>
            <Button className="mt-4" onClick={() => setShowForm(true)}><Plus className="h-4 w-4 mr-1" /> Create Agent</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {agents.map(agent => {
            const Icon = getIcon(agent.agentType);
            const recentExecs = execs.filter(e => e.agentId === agent.id).slice(0, 5);
            return (
              <Card key={agent.id} className="flex flex-col">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className={`p-1.5 rounded-lg shrink-0 ${agent.isEnabled ? 'bg-indigo-50' : 'bg-slate-100'}`}>
                        <Icon className={`h-4 w-4 ${agent.isEnabled ? 'text-indigo-600' : 'text-slate-400'}`} />
                      </div>
                      <CardTitle className="text-sm leading-tight line-clamp-1">{agent.agentName}</CardTitle>
                    </div>
                    <Badge variant={statusVariant(agent)} className="shrink-0 text-xs">{statusLabel(agent)}</Badge>
                  </div>
                  <p className="text-xs text-slate-400 pl-8">{AGENT_TYPES.find(t => t.value === agent.agentType)?.label ?? agent.agentType}</p>
                </CardHeader>
                <CardContent className="flex flex-col gap-3 flex-1">
                  {agent.description && (
                    <p className="text-xs text-slate-500 line-clamp-2">{agent.description}</p>
                  )}
                  <div className="grid grid-cols-3 text-center text-xs gap-1">
                    <div className="bg-slate-50 rounded-md p-1.5">
                      <div className="font-bold text-slate-700">{agent.statusSummary?.totalRuns ?? 0}</div>
                      <div className="text-[10px] text-slate-400">Runs</div>
                    </div>
                    <div className="bg-green-50 rounded-md p-1.5">
                      <div className="font-bold text-green-700">{agent.statusSummary?.successRuns ?? 0}</div>
                      <div className="text-[10px] text-slate-400">Success</div>
                    </div>
                    <div className="bg-red-50 rounded-md p-1.5">
                      <div className="font-bold text-red-600">{agent.statusSummary?.failedRuns ?? 0}</div>
                      <div className="text-[10px] text-slate-400">Failed</div>
                    </div>
                  </div>
                  {recentExecs.length > 0 && (
                    <div className="flex gap-1 items-center">
                      <span className="text-[10px] text-slate-400 mr-1">Recent:</span>
                      {recentExecs.map(ex => (
                        <span key={ex.id} title={`${ex.executionStatus} — ${new Date(ex.startedAt).toLocaleString()}`}>
                          {ex.executionStatus === 'success'           && <CheckCircle2 className="h-3 w-3 text-green-500" />}
                          {ex.executionStatus === 'failed'            && <XCircle className="h-3 w-3 text-red-400" />}
                          {ex.executionStatus === 'pending_approval'  && <Clock className="h-3 w-3 text-yellow-500" />}
                          {ex.executionStatus === 'running'           && <Activity className="h-3 w-3 text-blue-400" />}
                        </span>
                      ))}
                    </div>
                  )}
                  {agent.scheduleExpression && (
                    <p className="text-[11px] text-slate-400 flex items-center gap-1">
                      <Clock className="h-3 w-3" /> {agent.scheduleExpression} · {agent.timezone}
                    </p>
                  )}
                  <p className="text-[11px] text-slate-400 flex items-center gap-1">
                    <ShieldCheck className="h-3 w-3" />
                    Approval: <span className="capitalize font-medium text-slate-600 ml-0.5">{agent.approvalMode}</span>
                  </p>
                  <div className="flex gap-2 mt-auto pt-2">
                    <Button size="sm" variant={agent.isEnabled ? 'outline' : 'default'} onClick={() => handleToggle(agent)} className="flex-1 text-xs">
                      {agent.isEnabled ? <><Pause className="h-3 w-3 mr-1" />Disable</> : <><Play className="h-3 w-3 mr-1" />Enable</>}
                    </Button>
                    <Button size="sm" className="flex-1 text-xs" disabled={!agent.isEnabled || running === agent.id} onClick={() => handleRun(agent.id)}>
                      {running === agent.id ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Zap className="h-3 w-3 mr-1" />}
                      Run Now
                    </Button>
                    <Button size="sm" variant="danger" disabled={deleting === agent.id} onClick={() => handleDelete(agent.id)} title="Delete">
                      {deleting === agent.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                    </Button>
                  </div>
                  <Link href={`/dashboard/marketing/agent-manager/${agent.id}`} className="text-center text-xs text-indigo-600 hover:underline">
                    View Details & Memory →
                  </Link>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
