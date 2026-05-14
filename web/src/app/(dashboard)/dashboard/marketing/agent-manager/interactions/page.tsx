'use client';

import { useEffect, useState } from 'react';
import { agentApi, CustomerInteractionDto } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import Link from 'next/link';
import {
  Users, ArrowLeft, RefreshCw, Loader2, Plus, Search,
  Trash2, MessageSquare, Brain, TrendingUp, TrendingDown, Minus,
} from 'lucide-react';

function sentimentVariant(s: string): 'success' | 'danger' | 'secondary' | 'warning' {
  if (s === 'positive') return 'success';
  if (s === 'negative') return 'danger';
  if (s === 'neutral')  return 'secondary';
  return 'warning';
}

function sentimentIcon(s: string) {
  if (s === 'positive') return <TrendingUp className="h-3 w-3 text-green-500" />;
  if (s === 'negative') return <TrendingDown className="h-3 w-3 text-red-400" />;
  return <Minus className="h-3 w-3 text-slate-400" />;
}

const BLANK_FORM = {
  customerEmail: '', customerName: '', interactionType: 'email',
  platform: 'email', message: '', sentiment: 'neutral', objectionType: '', reEngageDaysDelay: 7,
};

export default function CustomerInteractionsPage() {
  const [interactions, setInteractions] = useState<CustomerInteractionDto[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [showForm,     setShowForm]     = useState(false);
  const [form,         setForm]         = useState({ ...BLANK_FORM });
  const [saving,       setSaving]       = useState(false);
  const [deleting,     setDeleting]     = useState<string | null>(null);
  const [error,        setError]        = useState<string | null>(null);
  const [search,       setSearch]       = useState('');
  const [filterType,   setFilterType]   = useState('all');

  const load = async (email?: string) => {
    setLoading(true);
    try {
      const res = await agentApi.getCustomerInteractions(email || undefined);
      setInteractions(res.data ?? []);
    } catch { setError('Failed to load interactions'); }
    finally  { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleSearch = () => { load(search || undefined); };

  const handleRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await agentApi.recordInteraction(form);
      setShowForm(false);
      setForm({ ...BLANK_FORM });
      await load();
    } catch { setError('Failed to record interaction'); }
    finally  { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this interaction record?')) return;
    setDeleting(id);
    try { await agentApi.deleteInteraction(id); await load(); }
    catch { setError('Failed to delete'); }
    finally { setDeleting(null); }
  };

  const types = ['all', ...Array.from(new Set(interactions.map(i => i.interactionType)))];
  const displayed = interactions.filter(i =>
    (filterType === 'all' || i.interactionType === filterType) &&
    (search === '' || i.customerEmail.includes(search) || (i.customerName ?? '').toLowerCase().includes(search.toLowerCase()))
  );

  // Stats
  const posCount = interactions.filter(i => i.sentiment === 'positive').length;
  const negCount = interactions.filter(i => i.sentiment === 'negative').length;
  const objCount = interactions.filter(i => i.objectionType).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/marketing/agent-manager">
            <Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4 mr-1" /> Back</Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Users className="h-6 w-6 text-indigo-600" />
              Customer Interaction Memory
            </h1>
            <p className="text-sm text-slate-500 mt-1">AI-captured customer signals, objections and re-engagement intelligence</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => load()} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </Button>
          <Button onClick={() => setShowForm(s => !s)}>
            <Plus className="h-4 w-4 mr-1" /> Record Interaction
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
        <Card><CardContent className="pt-4 text-center">
          <p className="text-3xl font-bold">{interactions.length}</p>
          <p className="text-xs text-slate-500">Total Interactions</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 text-center">
          <p className="text-3xl font-bold text-green-700">{posCount}</p>
          <p className="text-xs text-slate-500">Positive Sentiment</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 text-center">
          <p className="text-3xl font-bold text-red-500">{negCount}</p>
          <p className="text-xs text-slate-500">Negative Sentiment</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 text-center">
          <p className="text-3xl font-bold text-yellow-600">{objCount}</p>
          <p className="text-xs text-slate-500">With Objections</p>
        </CardContent></Card>
      </div>

      {/* Record Form */}
      {showForm && (
        <Card>
          <CardHeader><CardTitle>Record Customer Interaction</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={handleRecord} className="grid sm:grid-cols-2 gap-4">
              <div>
                <Label>Customer Email *</Label>
                <Input value={form.customerEmail} onChange={e => setForm(f => ({ ...f, customerEmail: e.target.value }))} required placeholder="customer@example.com" type="email" />
              </div>
              <div>
                <Label>Customer Name</Label>
                <Input value={form.customerName} onChange={e => setForm(f => ({ ...f, customerName: e.target.value }))} placeholder="John Doe" />
              </div>
              <div>
                <Label>Platform</Label>
                <select className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm mt-1" value={form.platform} onChange={e => setForm(f => ({ ...f, platform: e.target.value }))}>
                  <option value="email">Email</option>
                  <option value="linkedin">LinkedIn</option>
                  <option value="facebook">Facebook</option>
                  <option value="twitter">Twitter / X</option>
                  <option value="website">Website</option>
                  <option value="phone">Phone</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <Label>Interaction Type</Label>
                <select className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm mt-1" value={form.interactionType} onChange={e => setForm(f => ({ ...f, interactionType: e.target.value }))}>
                  <option value="email">Email Reply</option>
                  <option value="comment">Comment</option>
                  <option value="dm">Direct Message</option>
                  <option value="form">Form Submission</option>
                  <option value="call">Phone Call</option>
                  <option value="objection">Objection</option>
                  <option value="purchase">Purchase</option>
                  <option value="churn">Churn Signal</option>
                </select>
              </div>
              <div className="sm:col-span-2">
                <Label>Message *</Label>
                <Textarea value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))} required rows={3} placeholder="What did the customer say?" />
              </div>
              <div>
                <Label>Sentiment</Label>
                <select className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm mt-1" value={form.sentiment} onChange={e => setForm(f => ({ ...f, sentiment: e.target.value }))}>
                  <option value="positive">Positive</option>
                  <option value="neutral">Neutral</option>
                  <option value="negative">Negative</option>
                </select>
              </div>
              <div>
                <Label>Objection Type</Label>
                <Input value={form.objectionType} onChange={e => setForm(f => ({ ...f, objectionType: e.target.value }))} placeholder="e.g. price, timing, competitor" />
              </div>
              <div>
                <Label>Re-engage Delay (days)</Label>
                <Input type="number" min={0} max={365} value={form.reEngageDaysDelay} onChange={e => setForm(f => ({ ...f, reEngageDaysDelay: Number(e.target.value) }))} />
              </div>
              <div className="sm:col-span-2 flex gap-2 pt-2">
                <Button type="submit" disabled={saving}>
                  {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Plus className="h-4 w-4 mr-1" />}
                  Save Interaction
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Search + Filter */}
      <div className="flex gap-3 flex-wrap">
        <div className="flex gap-2 flex-1 min-w-48">
          <Input
            placeholder="Search by email or name…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
          />
          <Button variant="outline" onClick={handleSearch}>
            <Search className="h-4 w-4" />
          </Button>
        </div>
        <select
          className="border border-slate-300 rounded-md px-3 py-2 text-sm"
          value={filterType}
          onChange={e => setFilterType(e.target.value)}
        >
          {types.map(t => <option key={t} value={t}>{t === 'all' ? 'All Types' : t}</option>)}
        </select>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-20 text-slate-500">
          <Loader2 className="h-6 w-6 animate-spin mr-2" /> Loading…
        </div>
      ) : displayed.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <MessageSquare className="h-12 w-12 text-slate-200 mx-auto mb-4" />
            <p className="text-slate-500">No interactions recorded yet.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {displayed.map(item => (
            <Card key={item.id}>
              <CardContent className="py-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0 space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm">{item.customerName || item.customerEmail}</span>
                      {item.customerName && <span className="text-xs text-slate-400">{item.customerEmail}</span>}
                      <Badge variant={sentimentVariant(item.sentiment)} className="text-xs flex items-center gap-1">
                        {sentimentIcon(item.sentiment)} {item.sentiment}
                      </Badge>
                      <Badge variant="secondary" className="text-xs capitalize">{item.platform}</Badge>
                      <Badge variant="secondary" className="text-xs capitalize">{item.interactionType}</Badge>
                    </div>

                    <p className="text-sm text-slate-700 line-clamp-2">{item.message}</p>

                    {item.aiInterpretation && (
                      <div className="flex gap-1.5 items-start bg-indigo-50 rounded-md p-2 mt-1">
                        <Brain className="h-3.5 w-3.5 text-indigo-500 mt-0.5 shrink-0" />
                        <p className="text-xs text-indigo-700">{item.aiInterpretation}</p>
                      </div>
                    )}

                    <div className="flex gap-4 text-xs text-slate-400 flex-wrap">
                      {item.objectionType && <span className="text-orange-600">⚠ Objection: {item.objectionType}</span>}
                      {item.nextRecommendedAction && <span>→ {item.nextRecommendedAction}</span>}
                      <span>Re-engage in {item.reEngageDaysDelay}d</span>
                      <span>{new Date(item.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>

                  <Button size="sm" variant="danger" disabled={deleting === item.id} onClick={() => handleDelete(item.id)} title="Delete">
                    {deleting === item.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
