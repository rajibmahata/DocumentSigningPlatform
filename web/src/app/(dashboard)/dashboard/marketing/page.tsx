'use client';

import { useEffect, useState } from 'react';
import { marketingApi, MarketingAnalyticsDto, MarketingPostDto } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import {
  Megaphone, Globe2, Target, Sparkles, CalendarClock,
  MessageSquare, TrendingUp, Loader2, RefreshCw,
} from 'lucide-react';

const STAT_CARDS = [
  { label: 'Total Posts',        key: 'totalPosts',         color: 'text-blue-600' },
  { label: 'Published',          key: 'publishedPosts',     color: 'text-green-600' },
  { label: 'Scheduled',          key: 'scheduledPosts',     color: 'text-yellow-600' },
  { label: 'Drafts',             key: 'draftPosts',         color: 'text-slate-500' },
  { label: 'Engagements',        key: 'totalEngagements',   color: 'text-purple-600' },
  { label: 'Pending Replies',    key: 'pendingReplies',     color: 'text-red-600' },
  { label: 'Active Campaigns',   key: 'activeCampaigns',    color: 'text-teal-600' },
  { label: 'Avg Engage Score',   key: 'avgEngagementScore', color: 'text-orange-600' },
] as const;

const QUICK_LINKS = [
  { href: '/dashboard/marketing/social',     icon: Globe2,        label: 'Social Accounts' },
  { href: '/dashboard/marketing/campaigns',  icon: Target,        label: 'Campaigns' },
  { href: '/dashboard/marketing/content',    icon: Sparkles,      label: 'AI Content Studio' },
  { href: '/dashboard/marketing/scheduled',  icon: CalendarClock, label: 'Scheduled Posts' },
  { href: '/dashboard/marketing/engagement', icon: MessageSquare, label: 'Engagement Center' },
  { href: '/dashboard/marketing/analytics',  icon: TrendingUp,    label: 'Analytics' },
];

function statusColor(s: string): 'default' | 'secondary' | 'success' | 'warning' | 'danger' {
  if (s === 'published') return 'success';
  if (s === 'scheduled') return 'warning';
  return 'secondary';
}

export default function MarketingDashboardPage() {
  const [analytics, setAnalytics]   = useState<MarketingAnalyticsDto | null>(null);
  const [recentPosts, setRecent]     = useState<MarketingPostDto[]>([]);
  const [loading, setLoading]        = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const [aRes, pRes] = await Promise.all([
        marketingApi.getAnalytics(),
        marketingApi.getPosts(),
      ]);
      setAnalytics(aRes.data);
      setRecent(pRes.data.slice(0, 8));
    } catch (err) {
      console.error('Marketing dashboard load error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Megaphone className="h-7 w-7 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Marketing Hub</h1>
            <p className="text-sm text-muted-foreground">AI-powered social media management</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          Refresh
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {STAT_CARDS.map(({ label, key, color }) => (
          <Card key={key}>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className={`text-2xl font-bold mt-1 ${color}`}>
                {loading ? '–' : String(analytics?.[key as keyof MarketingAnalyticsDto] ?? 0)}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Platform stats */}
      {analytics && analytics.platformStats.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-sm font-semibold">Platform Breakdown</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              {analytics.platformStats.map((p) => (
                <div key={p.platform} className="flex items-center justify-between border rounded p-3">
                  <span className="capitalize font-medium">{p.platform}</span>
                  <div className="text-right text-sm text-muted-foreground">
                    <div>{p.posts} posts</div>
                    <div>{p.engagements} engagements</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick navigation */}
      <Card>
        <CardHeader><CardTitle className="text-sm font-semibold">Quick Navigation</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {QUICK_LINKS.map(({ href, icon: Icon, label }) => (
              <Link key={href} href={href}>
                <Button variant="outline" className="w-full justify-start gap-2">
                  <Icon className="h-4 w-4" />{label}
                </Button>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent posts */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold">Recent Posts</CardTitle>
            <Link href="/dashboard/marketing/scheduled">
              <Button variant="ghost" size="sm">View all</Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
          ) : recentPosts.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No posts yet. Use <Link href="/dashboard/marketing/content" className="underline">AI Content Studio</Link> to generate your first post.
            </p>
          ) : (
            <ul className="divide-y">
              {recentPosts.map((p) => (
                <li key={p.id} className="py-3 flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm line-clamp-2">{p.content}</p>
                    <p className="text-xs text-muted-foreground mt-1 capitalize">
                      {p.platform} · {p.contentCategory.replace(/_/g, ' ')} · score {p.engagementScore}
                    </p>
                  </div>
                  <Badge variant={statusColor(p.status)} className="shrink-0 capitalize">{p.status}</Badge>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
