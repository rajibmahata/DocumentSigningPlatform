'use client';

import { useEffect, useState } from 'react';
import { agentApi, AgentExecutionDto } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import {
  AlertCircle, CheckCircle2, XCircle, Loader2, RefreshCw,
  Clock, ArrowLeft, Eye,
} from 'lucide-react';

function statusVariant(s: string): 'warning' | 'success' | 'danger' | 'secondary' {
  if (s === 'pending_approval') return 'warning';
  if (s === 'success')          return 'success';
  if (s === 'failed')           return 'danger';
  return 'secondary';
}

export default function ApprovalsPage() {
  const [execs,     setExecs]     = useState<AgentExecutionDto[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [approving, setApproving] = useState<string | null>(null);
  const [canceling, setCanceling] = useState<string | null>(null);
  const [error,     setError]     = useState<string | null>(null);
  const [filter,    setFilter]    = useState<'pending' | 'all'>('pending');
  const [expanded,  setExpanded]  = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await agentApi.getAllExecutions();
      setExecs(res.data ?? []);
    } catch { setError('Failed to load executions'); }
    finally  { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleApprove = async (id: string) => {
    setApproving(id);
    try { await agentApi.approveExecution(id); await load(); }
    catch { setError('Failed to approve'); }
    finally { setApproving(null); }
  };

  const handleCancel = async (id: string) => {
    setCanceling(id);
    try { await agentApi.cancelExecution(id); await load(); }
    catch { setError('Failed to cancel'); }
    finally { setCanceling(null); }
  };

  const displayed = filter === 'pending'
    ? execs.filter(e => e.executionStatus === 'pending_approval')
    : execs;

  const pendingCount = execs.filter(e => e.executionStatus === 'pending_approval').length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/marketing/agent-manager">
            <Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4 mr-1" /> Back</Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <AlertCircle className="h-6 w-6 text-yellow-500" />
              Approval Queue
            </h1>
            <p className="text-sm text-slate-500 mt-1">Review and approve AI-generated actions before they execute</p>
          </div>
        </div>
        <Button variant="outline" onClick={load} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </Button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm flex justify-between">
          <span>{error}</span>
          <button className="underline" onClick={() => setError(null)}>Dismiss</button>
        </div>
      )}

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-3xl font-bold text-yellow-600">{pendingCount}</p>
            <p className="text-sm text-slate-500">Pending Approval</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-3xl font-bold text-green-600">{execs.filter(e => e.executionStatus === 'success').length}</p>
            <p className="text-sm text-slate-500">Approved & Done</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-3xl font-bold text-red-500">{execs.filter(e => e.executionStatus === 'failed').length}</p>
            <p className="text-sm text-slate-500">Failed</p>
          </CardContent>
        </Card>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 border-b">
        {(['pending', 'all'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px capitalize ${
              filter === f ? 'border-yellow-500 text-yellow-700' : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            {f === 'pending' ? `Pending (${pendingCount})` : `All Executions (${execs.length})`}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-slate-500">
          <Loader2 className="h-6 w-6 animate-spin mr-2" /> Loading…
        </div>
      ) : displayed.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <CheckCircle2 className="h-12 w-12 text-green-300 mx-auto mb-4" />
            <p className="text-slate-500">
              {filter === 'pending' ? 'No pending approvals. All agents are up to date.' : 'No executions found.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {displayed.map(exec => (
            <Card key={exec.id} className={exec.executionStatus === 'pending_approval' ? 'border-yellow-300 bg-yellow-50/30' : ''}>
              <CardContent className="py-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant={statusVariant(exec.executionStatus)}>{exec.executionStatus.replace(/_/g, ' ')}</Badge>
                      <span className="font-medium text-sm">{exec.agentName}</span>
                      <span className="text-xs text-slate-400">Trigger: {exec.triggerType}</span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      <Clock className="h-3 w-3 inline mr-1" />
                      Started: {new Date(exec.startedAt).toLocaleString()}
                      {exec.completedAt && ` · Completed: ${new Date(exec.completedAt).toLocaleString()}`}
                      {exec.retryCount > 0 && ` · Retries: ${exec.retryCount}`}
                    </p>
                    {exec.errorDetails && (
                      <p className="text-xs text-red-600 mt-1">Error: {exec.errorDetails}</p>
                    )}

                    {/* Expandable output */}
                    {exec.outputJson && (
                      <div className="mt-2">
                        <button
                          className="text-xs text-indigo-600 flex items-center gap-1 hover:underline"
                          onClick={() => setExpanded(expanded === exec.id ? null : exec.id)}
                        >
                          <Eye className="h-3 w-3" /> {expanded === exec.id ? 'Hide' : 'View'} Output
                        </button>
                        {expanded === exec.id && (
                          <pre className="mt-2 text-xs bg-slate-100 rounded p-3 overflow-auto max-h-48 whitespace-pre-wrap">
                            {(() => { try { return JSON.stringify(JSON.parse(exec.outputJson), null, 2); } catch { return exec.outputJson; } })()}
                          </pre>
                        )}
                      </div>
                    )}
                  </div>

                  {exec.executionStatus === 'pending_approval' && (
                    <div className="flex gap-2 shrink-0">
                      <Button
                        size="sm"
                        disabled={approving === exec.id}
                        onClick={() => handleApprove(exec.id)}
                      >
                        {approving === exec.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3 mr-1" />}
                        Approve
                      </Button>
                      <Button
                        size="sm" variant="outline"
                        disabled={canceling === exec.id}
                        onClick={() => handleCancel(exec.id)}
                      >
                        {canceling === exec.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <XCircle className="h-3 w-3 mr-1" />}
                        Reject
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
