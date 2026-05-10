'use client';

import { useEffect, useState } from 'react';
import { marketingApi, MarketingCampaignDto } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Target, Plus, Loader2, PlayCircle, PauseCircle, CheckCircle, X } from 'lucide-react';
import { toast } from 'sonner';

const STATUS_ORDER = ['draft', 'active', 'paused', 'completed'];

const STATUS_COLOR: Record<string, 'default' | 'secondary' | 'warning' | 'success' | 'danger'> = {
  draft:     'secondary',
  active:    'success',
  paused:    'warning',
  completed: 'secondary',
};

const CAMPAIGN_TYPES = ['awareness', 'engagement', 'conversion', 'retention'];

function StatusAction({ campaign, onUpdate }: { campaign: MarketingCampaignDto; onUpdate: () => void }) {
  const [busy, setBusy] = useState(false);

  const update = async (status: string) => {
    setBusy(true);
    try {
      await marketingApi.updateCampaignStatus(campaign.id, status);
      toast.success(`Campaign ${status}.`);
      onUpdate();
    } catch { toast.error('Update failed.'); }
    finally { setBusy(false); }
  };

  if (campaign.status === 'draft' || campaign.status === 'paused') {
    return (
      <Button size="sm" variant="outline" disabled={busy} onClick={() => update('active')} className="gap-1">
        <PlayCircle className="h-3 w-3" />Activate
      </Button>
    );
  }
  if (campaign.status === 'active') {
    return (
      <div className="flex gap-1">
        <Button size="sm" variant="outline" disabled={busy} onClick={() => update('paused')} className="gap-1">
          <PauseCircle className="h-3 w-3" />Pause
        </Button>
        <Button size="sm" variant="outline" disabled={busy} onClick={() => update('completed')} className="gap-1">
          <CheckCircle className="h-3 w-3" />Complete
        </Button>
      </div>
    );
  }
  return null;
}

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<MarketingCampaignDto[]>([]);
  const [loading, setLoading]     = useState(true);
  const [open, setOpen]           = useState(false);
  const [form, setForm]           = useState({ name: '', description: '', campaignType: 'awareness' });
  const [saving, setSaving]       = useState(false);

  const load = async () => {
    setLoading(true);
    try { setCampaigns((await marketingApi.getCampaigns()).data); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const handleCreate = async () => {
    if (!form.name.trim()) { toast.error('Campaign name required.'); return; }
    setSaving(true);
    try {
      await marketingApi.createCampaign(form);
      toast.success('Campaign created!');
      setOpen(false);
      setForm({ name: '', description: '', campaignType: 'awareness' });
      await load();
    } catch { toast.error('Create failed.'); }
    finally { setSaving(false); }
  };

  // Group by status for kanban columns
  const grouped = STATUS_ORDER.reduce<Record<string, MarketingCampaignDto[]>>((acc, s) => {
    acc[s] = campaigns.filter((c) => c.status === s);
    return acc;
  }, {});

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Target className="h-6 w-6 text-primary" />Campaigns
          </h1>
          <p className="text-sm text-muted-foreground">Manage awareness, engagement, conversion &amp; retention campaigns</p>
        </div>
        <Button onClick={() => setOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />New Campaign
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin" /></div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {STATUS_ORDER.map((status) => (
            <div key={status} className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase text-muted-foreground">{status}</span>
                <Badge variant="secondary" className="text-xs">{grouped[status].length}</Badge>
              </div>
              {grouped[status].length === 0 ? (
                <div className="border-2 border-dashed rounded-lg h-24 flex items-center justify-center text-xs text-muted-foreground">
                  No campaigns
                </div>
              ) : (
                grouped[status].map((c) => (
                  <Card key={c.id} className="shadow-sm">
                    <CardContent className="p-3 space-y-2">
                      <p className="font-medium text-sm">{c.name}</p>
                      {c.description && <p className="text-xs text-muted-foreground line-clamp-2">{c.description}</p>}
                      <div className="flex flex-wrap gap-1">
                        <Badge variant={STATUS_COLOR[c.status]} className="text-xs capitalize">
                          {c.status}
                        </Badge>
                        <Badge variant="secondary" className="text-xs capitalize">{c.campaignType}</Badge>
                      </div>
                      <StatusAction campaign={c} onUpdate={load} />
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          ))}
        </div>
      )}

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">New Campaign</h2>
              <button onClick={() => setOpen(false)}><X className="h-5 w-5" /></button>
            </div>
          <div className="space-y-4">
            <div>
              <Label>Name</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Q3 Product Launch" />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} />
            </div>
            <div>
              <Label>Campaign Type</Label>
              <select className="w-full border rounded-lg px-3 py-2 text-sm mt-1" value={form.campaignType} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setForm({ ...form, campaignType: e.target.value })}>
                {CAMPAIGN_TYPES.map((t) => <option key={t} value={t} className="capitalize">{t}</option>)}
              </select>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={handleCreate} disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 animate-spin mr-1" />}Create
              </Button>
            </div>
          </div>
          </div>
        </div>
      )}
    </div>
  );
}
