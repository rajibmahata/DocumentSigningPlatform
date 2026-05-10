'use client';

import { useEffect, useState } from 'react';
import { marketingApi, EngagementActivityDto } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, Loader2, Wand2, Send, CheckCircle, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

const STATUS_TABS = ['all', 'new', 'replied', 'resolved', 'escalated'];

function statusVariant(s: string): 'default' | 'secondary' | 'danger' | 'warning' {
  if (s === 'new')       return 'danger';
  if (s === 'replied')   return 'default';
  if (s === 'resolved')  return 'secondary';
  if (s === 'escalated') return 'warning';
  return 'secondary';
}

function EngagementCard({
  item,
  onReply,
  onStatus,
}: {
  item: EngagementActivityDto;
  onReply: (id: string, response: string) => Promise<void>;
  onStatus: (id: string, status: string) => Promise<void>;
}) {
  const [reply, setReply]     = useState(item.response ?? '');
  const [aiLoading, setAiL]   = useState(false);
  const [sending, setSending] = useState(false);

  const suggestAI = async () => {
    setAiL(true);
    try {
      const res = await marketingApi.suggestReply(item.message, item.platform);
      setReply(res.data.reply);
    } catch { toast.error('AI suggestion failed.'); }
    finally { setAiL(false); }
  };

  const sendReply = async () => {
    if (!reply.trim()) return;
    setSending(true);
    try { await onReply(item.id, reply); }
    finally { setSending(false); }
  };

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant={statusVariant(item.status)} className="capitalize text-xs">{item.status}</Badge>
              <Badge variant="secondary" className="capitalize text-xs">{item.platform}</Badge>
              <Badge variant="secondary" className="capitalize text-xs">{item.activityType}</Badge>
            </div>
            {item.userName && <p className="text-xs text-muted-foreground mt-1">From: {item.userName}</p>}
          </div>
          <div className="flex gap-1 shrink-0">
            {item.status !== 'resolved' && (
              <Button size="sm" variant="ghost" className="text-xs gap-1"
                onClick={() => onStatus(item.id, 'resolved')}>
                <CheckCircle className="h-3 w-3" />Resolve
              </Button>
            )}
            {item.status !== 'escalated' && (
              <Button size="sm" variant="ghost" className="text-xs gap-1 text-orange-600"
                onClick={() => onStatus(item.id, 'escalated')}>
                <AlertTriangle className="h-3 w-3" />Escalate
              </Button>
            )}
          </div>
        </div>

        <div className="bg-muted/50 rounded p-3 text-sm">{item.message}</div>

        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <p className="text-xs font-medium flex-1">Reply</p>
            <Button size="sm" variant="outline" onClick={suggestAI} disabled={aiLoading} className="text-xs gap-1 h-7">
              {aiLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Wand2 className="h-3 w-3" />}
              AI Suggest
            </Button>
          </div>
          <Textarea
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            rows={2}
            placeholder="Type or AI-generate your reply…"
          />
          <Button size="sm" onClick={sendReply} disabled={sending || !reply.trim()} className="gap-1">
            {sending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
            Send Reply
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function EngagementCenterPage() {
  const [items, setItems]   = useState<EngagementActivityDto[]>([]);
  const [tab, setTab]       = useState('new');
  const [loading, setLoad]  = useState(true);

  const load = async () => {
    setLoad(true);
    try {
      const res = await marketingApi.getEngagements(tab !== 'all' ? { status: tab } : undefined);
      setItems(res.data);
    } catch (err) { console.error('Engagement load error:', err); }
    finally { setLoad(false); }
  };
  useEffect(() => { load(); }, [tab]);

  const handleReply = async (id: string, response: string) => {
    await marketingApi.replyEngagement(id, response);
    toast.success('Reply sent!');
    await load();
  };

  const handleStatus = async (id: string, status: string) => {
    await marketingApi.updateEngagementStatus(id, status);
    toast.success(`Marked as ${status}.`);
    await load();
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <MessageSquare className="h-6 w-6 text-primary" />Engagement Center
        </h1>
        <p className="text-sm text-muted-foreground">
          Respond to comments &amp; messages with AI-suggested replies
        </p>
      </div>

      <div className="flex gap-1 flex-wrap">
        {STATUS_TABS.map((t) => (
          <Button key={t} size="sm" variant={tab === t ? 'default' : 'outline'}
            onClick={() => setTab(t)} className="capitalize">
            {t}
          </Button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin" /></div>
      ) : items.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No {tab === 'all' ? '' : tab} engagement items found.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {items.map((item) => (
            <EngagementCard key={item.id} item={item} onReply={handleReply} onStatus={handleStatus} />
          ))}
        </div>
      )}
    </div>
  );
}
