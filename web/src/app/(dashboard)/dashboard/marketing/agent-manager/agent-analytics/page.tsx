'use client';

import { useEffect, useState } from 'react';
import { agentApi, AgentDto, AgentExecutionDto } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import {
  BarChart3, ArrowLeft, RefreshCw, Loader2, TrendingUp,
  CheckCircle2, XCircle, Clock, Activity, Bot, Zap,
  Mail, Globe2, Target, PenSquare, ShieldCheck,
} from 'lucide-react';

const AGENT_TYPE_ICONS: Record<string, React.ElementType> = {
  email_marketing: Mail,
  social_media:    Globe2,
  campaign:        Target,
  blog:            PenSquare,
  validation:      ShieldCheck,
  analytics:       BarChart3,
};

interface AgentStats {
  agent: AgentDto;
  execs: AgentExecutionDto[];
  successRate: number;
  avgDurationMs: number;
  last7DaysRuns: number;
}

function buildStats(agents: AgentDto[], execs: AgentExecutionDto[]): AgentStats[] {
  const now = Date.now();
  const week = 7 * 86400000;
  return agents.map(agent => {
    const ae = execs.filter(e => e.agentId === agent.id);
    const completed = ae.filter(e => e.completedAt);
    const successRate = ae.length ? Math.round((ae.filter(e => e.executionStatus === 'success').length / ae.length) * 100) : 0;
    const avgDuration = completed.length
      ? completed.reduce((sum, e) => sum + (new Date(e.completedAt!).getTime() - new Date(e.startedAt).getTime()), 0) / completed.length
      : 0;
    const last7 = ae.filter(e => now - new Date(e.startedAt).getTime() < week).length;
    return { agent, execs: ae, successRate, avgDurationMs: avgDuration, last7DaysRuns: last7 };
  }).sort((a, b) => b.execs.length - a.execs.length);
}

function SuccessBar({ rate }: { rate: number }) {
  const color = rate >= 80 ? 'bg-green-500' : rate >= 50 ? 'bg-yellow-500' : 'bg-red-500';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${rate}%` }} />
      </div>
      <span className="text-xs font-medium w-8 text-right">{rate}%</span>
    </div>
  );
}

export default function AgentAnalyticsPage() {
  const [agents,  setAgents]  = useState<AgentDto[]>([]);
  const [execs,   setExecs]   = useState<AgentExecutionDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [aRes, eRes] = await Promise.all([agentApi.getAgents(), agentApi.getAllExecutions()]);
      setAgents(aRes.data ?? []);
      setExecs(eRes.data ?? []);
    } catch { setError('Failed to load analytics'); }
    finally  { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const stats = buildStats(agents, execs);

  const totalRuns     = execs.length;
  const successRuns   = execs.filter(e => e.executionStatus === 'success').length;
  const failedRuns    = execs.filter(e => e.executionStatus === 'failed').length;
  const pendingRuns   = execs.filter(e => e.executionStatus === 'pending_approval').length;
  const overallRate   = totalRuns ? Math.round((successRuns / totalRuns) * 100) : 0;

  const now = Date.now();
  const runs24h = execs.filter(e => now - new Date(e.startedAt).getTime() < 86400000).length;
  const runs7d  = execs.filter(e => now - new Date(e.startedAt).getTime() < 7 * 86400000).length;

  // Daily histogram last 7 days
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(now - (6 - i) * 86400000);
    const label = d.toLocaleDateString('en', { weekday: 'short' });
    const count = execs.filter(e => {
      const t = new Date(e.startedAt);
      return t.toDateString() === d.toDateString();
    }).length;
    return { label, count };
  });
  const maxDay = Math.max(...days.map(d => d.count), 1);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/marketing/agent-manager">
            <Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4 mr-1" /> Back</Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <BarChart3 className="h-6 w-6 text-blue-600" />
              Agent Performance Analytics
            </h1>
            <p className="text-sm text-slate-500 mt-1">Execution metrics and health for all AI agents</p>
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

      {loading ? (
        <div className="flex items-center justify-center py-20 text-slate-500">
          <Loader2 className="h-6 w-6 animate-spin mr-2" /> Loading analytics…
        </div>
      ) : (
        <>
          {/* Top-level KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Card><CardContent className="pt-4">
              <p className="text-3xl font-bold">{totalRuns}</p>
              <p className="text-xs text-slate-500 mt-0.5">Total Executions</p>
              <p className="text-xs text-slate-400">{runs24h} last 24h · {runs7d} last 7d</p>
            </CardContent></Card>
            <Card><CardContent className="pt-4">
              <p className="text-3xl font-bold text-green-700">{overallRate}%</p>
              <p className="text-xs text-slate-500 mt-0.5">Overall Success Rate</p>
              <SuccessBar rate={overallRate} />
            </CardContent></Card>
            <Card><CardContent className="pt-4">
              <p className="text-3xl font-bold text-red-500">{failedRuns}</p>
              <p className="text-xs text-slate-500 mt-0.5">Failed Runs</p>
              <p className="text-xs text-slate-400">{successRuns} succeeded</p>
            </CardContent></Card>
            <Card><CardContent className="pt-4">
              <p className="text-3xl font-bold text-yellow-600">{pendingRuns}</p>
              <p className="text-xs text-slate-500 mt-0.5">Pending Approval</p>
              <Link href="/dashboard/marketing/agent-manager/approvals" className="text-xs text-indigo-600 hover:underline">Review →</Link>
            </CardContent></Card>
          </div>

          {/* 7-Day Histogram */}
          <Card>
            <CardHeader><CardTitle className="text-base">Executions — Last 7 Days</CardTitle></CardHeader>
            <CardContent>
              <div className="flex items-end gap-3 h-32">
                {days.map((d, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <span className="text-xs text-slate-600 font-medium">{d.count || ''}</span>
                    <div
                      className="w-full rounded-t bg-indigo-400 transition-all"
                      style={{ height: `${Math.max((d.count / maxDay) * 96, d.count > 0 ? 4 : 0)}px` }}
                    />
                    <span className="text-[10px] text-slate-400">{d.label}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Per-Agent Table */}
          <Card>
            <CardHeader><CardTitle className="text-base">Per-Agent Breakdown</CardTitle></CardHeader>
            <CardContent className="p-0">
              {stats.length === 0 ? (
                <div className="py-12 text-center text-slate-500">
                  <Bot className="h-10 w-10 text-slate-200 mx-auto mb-3" />
                  No agent data yet.
                </div>
              ) : (
                <div className="divide-y">
                  {stats.map(({ agent, execs: ae, successRate, avgDurationMs, last7DaysRuns }) => {
                    const Icon = AGENT_TYPE_ICONS[agent.agentType] ?? Bot;
                    return (
                      <div key={agent.id} className="px-4 py-3 flex items-center gap-4">
                        <div className={`p-2 rounded-lg shrink-0 ${agent.isEnabled ? 'bg-indigo-50' : 'bg-slate-100'}`}>
                          <Icon className={`h-4 w-4 ${agent.isEnabled ? 'text-indigo-600' : 'text-slate-400'}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm">{agent.agentName}</span>
                            <Badge variant={agent.isEnabled ? 'success' : 'secondary'} className="text-xs">
                              {agent.isEnabled ? 'Active' : 'Disabled'}
                            </Badge>
                          </div>
                          <p className="text-xs text-slate-400 capitalize">{agent.agentType.replace(/_/g, ' ')}</p>
                        </div>

                        {/* Mini stats */}
                        <div className="hidden sm:flex gap-6 text-center">
                          <div>
                            <p className="text-sm font-bold">{ae.length}</p>
                            <p className="text-[10px] text-slate-400">Total</p>
                          </div>
                          <div>
                            <p className="text-sm font-bold text-green-700">{ae.filter(e => e.executionStatus === 'success').length}</p>
                            <p className="text-[10px] text-slate-400">Success</p>
                          </div>
                          <div>
                            <p className="text-sm font-bold text-red-500">{ae.filter(e => e.executionStatus === 'failed').length}</p>
                            <p className="text-[10px] text-slate-400">Failed</p>
                          </div>
                          <div>
                            <p className="text-sm font-bold text-blue-600">{last7DaysRuns}</p>
                            <p className="text-[10px] text-slate-400">Last 7d</p>
                          </div>
                          <div className="w-28">
                            <p className="text-[10px] text-slate-400 mb-1">Success Rate</p>
                            <SuccessBar rate={successRate} />
                          </div>
                          {avgDurationMs > 0 && (
                            <div>
                              <p className="text-sm font-bold">
                                {avgDurationMs < 60000 ? `${Math.round(avgDurationMs / 1000)}s` : `${Math.round(avgDurationMs / 60000)}m`}
                              </p>
                              <p className="text-[10px] text-slate-400">Avg Time</p>
                            </div>
                          )}
                        </div>

                        <Link href={`/dashboard/marketing/agent-manager/${agent.id}`}>
                          <Button size="sm" variant="ghost" className="shrink-0">Details</Button>
                        </Link>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent failures */}
          {execs.filter(e => e.executionStatus === 'failed').length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-base flex items-center gap-2">
                <XCircle className="h-4 w-4 text-red-500" /> Recent Failures
              </CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {execs
                  .filter(e => e.executionStatus === 'failed')
                  .slice(0, 5)
                  .map(exec => (
                    <div key={exec.id} className="flex items-start justify-between gap-4 py-2 border-b last:border-0">
                      <div>
                        <p className="text-sm font-medium">{exec.agentName}</p>
                        <p className="text-xs text-slate-400">{new Date(exec.startedAt).toLocaleString()}</p>
                        {exec.errorDetails && <p className="text-xs text-red-600 mt-0.5">{exec.errorDetails}</p>}
                      </div>
                      <Badge variant="danger" className="shrink-0">Failed</Badge>
                    </div>
                  ))
                }
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
