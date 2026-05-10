'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { agentApi, AgentPresetDto } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Bot, Loader2, CheckCircle2, ArrowLeft, Sparkles } from 'lucide-react';

const CATEGORIES = ['All', 'Blog', 'Email', 'Social Media', 'Campaign', 'Analytics', 'Validation'];

function complexityVariant(c: string): 'success' | 'warning' | 'danger' | 'secondary' {
  if (c === 'Simple')  return 'success';
  if (c === 'Medium')  return 'warning';
  if (c === 'Complex') return 'danger';
  return 'secondary';
}

function approvalLabel(mode: string) {
  if (mode === 'auto')     return 'Fully Automated';
  if (mode === 'approval') return 'Requires Approval';
  return 'Hybrid';
}

function humanSchedule(cron: string | null | undefined) {
  if (!cron) return 'On-demand';
  const map: Record<string, string> = {
    '0 8 * * 1-5':  'Weekdays at 08:00 UTC',
    '0 9 * * 1':    'Mondays at 09:00 UTC',
    '0 9 * * 2,4':  'Tue & Thu at 09:00 UTC',
    '0 10 * * 1,3,5': 'Mon, Wed, Fri at 10:00 UTC',
    '0 8 * * 2':    'Tuesdays at 08:00 UTC',
    '0 9 1-7 * 1':  '1st Monday of month at 09:00 UTC',
    '30 9 * * 1-5': 'Weekdays at 09:30 UTC',
    '0 11 * * 1,3,5': 'Mon, Wed, Fri at 11:00 UTC',
    '0 */4 * * *':  'Every 4 hours',
    '0 7 1 * *':    '1st of every month at 07:00 UTC',
    '0 20 * * 0':   'Sundays at 20:00 UTC',
  };
  return map[cron] ?? cron;
}

interface ProvisionState {
  loading: boolean;
  done: boolean;
  agentId?: string;
  error?: string;
}

export default function AgentPresetsPage() {
  const [presets,    setPresets]   = useState<AgentPresetDto[]>([]);
  const [category,   setCategory]  = useState('All');
  const [loading,    setLoading]   = useState(true);
  const [error,      setError]     = useState<string | null>(null);
  const [provision,  setProvision] = useState<Record<string, ProvisionState>>({});

  useEffect(() => {
    agentApi.getPresets()
      .then(r => setPresets(r.data ?? []))
      .catch(() => setError('Failed to load presets.'))
      .finally(() => setLoading(false));
  }, []);

  const filtered = category === 'All'
    ? presets
    : presets.filter(p => p.category === category);

  const handleProvision = async (presetId: string) => {
    setProvision(prev => ({ ...prev, [presetId]: { loading: true, done: false } }));
    try {
      const res = await agentApi.provisionPreset(presetId);
      const agentId = res.data?.agent?.id;
      setProvision(prev => ({ ...prev, [presetId]: { loading: false, done: true, agentId } }));
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
        ?? 'Failed to provision. Please try again.';
      setProvision(prev => ({ ...prev, [presetId]: { loading: false, done: false, error: msg } }));
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/dashboard/marketing/agent-manager">
          <Button variant="ghost" className="gap-1 px-2 text-gray-500">
            <ArrowLeft className="h-4 w-4" /> Agents
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-indigo-500" />
            Agent Preset Gallery
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            One-click provisioning — fully configured agents ready to run out of the box.
          </p>
        </div>
      </div>

      {/* Category tabs */}
      <div className="flex flex-wrap gap-2">
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            onClick={() => setCategory(cat)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              category === cat
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* States */}
      {loading && (
        <div className="flex justify-center py-16">
          <Loader2 className="h-7 w-7 animate-spin text-indigo-500" />
        </div>
      )}

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Preset grid */}
      {!loading && !error && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((preset, i) => {
            const ps = provision[preset.presetId];
            const isProvisioning = ps?.loading;
            const isProvisioned  = ps?.done;

            return (
              <motion.div
                key={preset.presetId}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: i * 0.04 }}
              >
                <Card className={`relative h-full flex flex-col border ${isProvisioned ? 'border-green-400 bg-green-50/30' : 'border-gray-200'} hover:shadow-md transition-shadow`}>
                  {/* "Start Here" badge for first blog preset */}
                  {preset.presetId === 'preset-daily-blog-post' && (
                    <div className="absolute -top-2.5 left-4">
                      <span className="bg-indigo-600 text-white text-xs font-semibold px-2 py-0.5 rounded-full shadow">
                        ★ Start Here
                      </span>
                    </div>
                  )}

                  <CardHeader className="pb-2 pt-5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl" role="img" aria-label={preset.name}>{preset.icon}</span>
                        <div>
                          <CardTitle className="text-sm font-semibold text-gray-900 leading-snug">
                            {preset.name}
                          </CardTitle>
                          <p className="text-xs text-gray-400 mt-0.5">{preset.category}</p>
                        </div>
                      </div>
                      <Badge variant={complexityVariant(preset.complexity)} className="shrink-0 text-xs">
                        {preset.complexity}
                      </Badge>
                    </div>
                  </CardHeader>

                  <CardContent className="flex flex-col flex-1 gap-3 pt-0">
                    <p className="text-xs text-gray-600 leading-relaxed">{preset.description}</p>

                    <div className="flex flex-wrap gap-1">
                      {preset.tags.map(tag => (
                        <span key={tag} className="bg-gray-100 text-gray-500 text-[10px] px-1.5 py-0.5 rounded-full">
                          #{tag}
                        </span>
                      ))}
                    </div>

                    <div className="space-y-1 text-[11px] text-gray-500">
                      <div className="flex items-center gap-1.5">
                        <span className="font-medium text-gray-700">Schedule:</span>
                        {humanSchedule(preset.scheduleExpression)}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-medium text-gray-700">Mode:</span>
                        {approvalLabel(preset.approvalMode)}
                      </div>
                    </div>

                    {/* Error message */}
                    {ps?.error && (
                      <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded px-2 py-1">
                        {ps.error}
                      </p>
                    )}

                    {/* CTA */}
                    <div className="mt-auto pt-2">
                      {isProvisioned ? (
                        <div className="flex items-center justify-between gap-2">
                          <span className="flex items-center gap-1 text-xs text-green-700 font-medium">
                            <CheckCircle2 className="h-3.5 w-3.5" /> Provisioned
                          </span>
                          {ps?.agentId && (
                            <Link href={`/dashboard/marketing/agent-manager/${ps.agentId}`}>
                              <Button variant="outline" className="h-7 text-xs px-2.5">
                                Configure Agent →
                              </Button>
                            </Link>
                          )}
                        </div>
                      ) : (
                        <Button
                          className="w-full h-8 text-xs gap-1.5"
                          onClick={() => handleProvision(preset.presetId)}
                          disabled={isProvisioning}
                        >
                          {isProvisioning ? (
                            <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Provisioning…</>
                          ) : (
                            <><Bot className="h-3.5 w-3.5" /> Provision Agent</>
                          )}
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}

          {filtered.length === 0 && (
            <div className="col-span-full text-center py-12 text-gray-400 text-sm">
              No presets in this category.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
