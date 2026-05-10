'use client';

import { useEffect, useState } from 'react';
import { agentApi, AgentDto, AgentExecutionDto, AgentMemoryDto } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs } from '@/components/ui/tabs';
import { Loader2, Play, ArrowLeft, RotateCcw, Bot } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

function execStatusBadge(status: string): 'success' | 'danger' | 'warning' | 'secondary' {
  if (status === 'success')          return 'success';
  if (status === 'failed')           return 'danger';
  if (status === 'pending_approval') return 'warning';
  return 'secondary';
}

export default function AgentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [agent,      setAgent]      = useState<AgentDto | null>(null);
  const [executions, setExecutions] = useState<AgentExecutionDto[]>([]);
  const [memories,   setMemories]   = useState<AgentMemoryDto[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [running,    setRunning]    = useState(false);
  const [retrying,   setRetrying]   = useState<string | null>(null);
  const [activeTab,  setActiveTab]  = useState<'executions' | 'memories'>('executions');
  const [memForm,    setMemForm]    = useState({ contextType: 'general', contextKey: '', contextValue: '' });
  const [savingMem,  setSavingMem]  = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [aRes, eRes, mRes] = await Promise.all([
        agentApi.getAgent(id),
        agentApi.getExecutions(id),
        agentApi.getMemories(id),
      ]);
      setAgent(aRes.data);
      setExecutions(eRes.data ?? []);
      setMemories(mRes.data ?? []);
    } catch { /* ignore */ }
    finally  { setLoading(false); }
  };

  useEffect(() => { load(); }, [id]);

  const handleRun = async () => {
    setRunning(true);
    try { await agentApi.executeAgent(id, 'manual'); await load(); }
    catch { /* ignore */ }
    finally { setRunning(false); }
  };

  const handleRetry = async (execId: string) => {
    setRetrying(execId);
    try { await agentApi.retryExecution(execId); await load(); }
    catch { /* ignore */ }
    finally { setRetrying(null); }
  };

  const handleSaveMem = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingMem(true);
    try {
      await agentApi.upsertMemory(id, memForm);
      setMemForm({ contextType: 'general', contextKey: '', contextValue: '' });
      const mRes = await agentApi.getMemories(id);
      setMemories(mRes.data ?? []);
    } catch { /* ignore */ }
    finally { setSavingMem(false); }
  };

  if (loading) return (
    <div className="flex items-center justify-center py-20 text-slate-500">
      <Loader2 className="h-6 w-6 animate-spin mr-2" /> Loading…
    </div>
  );

  if (!agent) return (
    <div className="text-center py-20 text-slate-500">Agent not found.</div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/marketing/agent-manager">
          <Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4 mr-1" /> Back</Button>
        </Link>
        <Bot className="h-5 w-5 text-indigo-600" />
        <h1 className="text-xl font-bold">{agent.agentName}</h1>
        <Badge variant={agent.isEnabled ? 'success' : 'danger'}>
          {agent.isEnabled ? 'Enabled' : 'Disabled'}
        </Badge>
        <div className="ml-auto">
          <Button onClick={handleRun} disabled={running || !agent.isEnabled}>
            {running ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Play className="h-4 w-4 mr-1" />}
            Run Now
          </Button>
        </div>
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4 space-y-1">
            <p className="text-xs text-slate-500">Type</p>
            <p className="font-medium capitalize">{agent.agentType.replace('_', ' ')}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 space-y-1">
            <p className="text-xs text-slate-500">Approval Mode</p>
            <p className="font-medium capitalize">{agent.approvalMode}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 space-y-1">
            <p className="text-xs text-slate-500">Schedule</p>
            <p className="font-medium">{agent.scheduleExpression || 'Manual only'}</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex gap-2 border-b">
        {(['executions', 'memories'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px capitalize ${
              activeTab === tab ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            {tab} {tab === 'executions' ? `(${executions.length})` : `(${memories.length})`}
          </button>
        ))}
      </div>

      {activeTab === 'executions' && (
        <div className="space-y-3">
          {executions.length === 0 ? (
            <p className="text-slate-500 text-sm py-6 text-center">No executions yet.</p>
          ) : executions.map(exec => (
            <Card key={exec.id}>
              <CardContent className="py-3 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <Badge variant={execStatusBadge(exec.executionStatus)} className="shrink-0">
                    {exec.executionStatus}
                  </Badge>
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{new Date(exec.startedAt).toLocaleString()}</p>
                    <p className="text-xs text-slate-400 truncate">
                      Trigger: {exec.triggerType} • Retries: {exec.retryCount}
                      {exec.errorDetails ? ` • ${exec.errorDetails}` : ''}
                    </p>
                  </div>
                </div>
                {(exec.executionStatus === 'failed') && (
                  <Button
                    size="sm" variant="outline"
                    disabled={retrying === exec.id}
                    onClick={() => handleRetry(exec.id)}
                  >
                    {retrying === exec.id
                      ? <Loader2 className="h-3 w-3 animate-spin" />
                      : <RotateCcw className="h-3 w-3 mr-1" />
                    }
                    Retry
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {activeTab === 'memories' && (
        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-sm">Add / Update Memory</CardTitle></CardHeader>
            <CardContent>
              <form onSubmit={handleSaveMem} className="grid sm:grid-cols-3 gap-3">
                <div>
                  <Label>Context Type</Label>
                  <Input value={memForm.contextType} onChange={e => setMemForm(f => ({ ...f, contextType: e.target.value }))} placeholder="general / brand / tone" />
                </div>
                <div>
                  <Label>Key</Label>
                  <Input value={memForm.contextKey} onChange={e => setMemForm(f => ({ ...f, contextKey: e.target.value }))} required placeholder="e.g. brand_voice" />
                </div>
                <div>
                  <Label>Value</Label>
                  <Input value={memForm.contextValue} onChange={e => setMemForm(f => ({ ...f, contextValue: e.target.value }))} required placeholder="e.g. professional" />
                </div>
                <div className="sm:col-span-3">
                  <Button type="submit" disabled={savingMem} size="sm">
                    {savingMem ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : null}
                    Save Memory
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {memories.length === 0 ? (
            <p className="text-slate-500 text-sm text-center py-4">No memories stored yet.</p>
          ) : (
            <div className="space-y-2">
              {memories.map(mem => (
                <Card key={mem.id}>
                  <CardContent className="py-3 flex items-start justify-between gap-4">
                    <div>
                      <div className="flex gap-2 items-center">
                        <Badge variant="secondary" className="text-xs">{mem.contextType}</Badge>
                        <span className="text-sm font-medium">{mem.contextKey}</span>
                      </div>
                      <p className="text-sm text-slate-600 mt-1">{mem.contextValue}</p>
                    </div>
                    <p className="text-xs text-slate-400 shrink-0">{new Date(mem.updatedAt).toLocaleDateString()}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
