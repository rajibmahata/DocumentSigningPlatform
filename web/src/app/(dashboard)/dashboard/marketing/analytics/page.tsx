'use client';

import { useEffect, useState } from 'react';
import { marketingApi, MarketingAnalyticsDto, MarketingPostDto } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TrendingUp, Loader2, RefreshCw, BarChart2, MessageSquare, Rocket } from 'lucide-react';

function StatCard({ label, value, icon: Icon, color }: {
  label: string; value: string | number; icon: React.ElementType; color: string;
}) {
  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-4">
        <div className={`rounded-full p-2 bg-muted ${color}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-2xl font-bold">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function EngagementBar({ platform, posts, engagements, maxPosts }: {
  platform: string; posts: number; engagements: number; maxPosts: number;
}) {
  const pct = maxPosts > 0 ? Math.round((posts / maxPosts) * 100) : 0;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="capitalize font-medium">{platform}</span>
        <span className="text-muted-foreground">{posts} posts · {engagements} engagements</span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default function AnalyticsPage() {
  const [data, setData]     = useState<MarketingAnalyticsDto | null>(null);
  const [loading, setLoad]  = useState(true);

  const load = async () => {
    setLoad(true);
    try { setData((await marketingApi.getAnalytics()).data); }
    catch (err) { console.error('Analytics load error:', err); }
    finally { setLoad(false); }
  };
  useEffect(() => { load(); }, []);

  const maxPosts = data ? Math.max(...data.platformStats.map((p) => p.posts), 1) : 1;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <TrendingUp className="h-6 w-6 text-primary" />Marketing Analytics
          </h1>
          <p className="text-sm text-muted-foreground">Performance overview across all platforms</p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
        </Button>
      </div>

      {loading && !data ? (
        <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin" /></div>
      ) : data ? (
        <>
          {/* KPI row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <StatCard label="Total Posts"       value={data.totalPosts}         icon={BarChart2}     color="text-blue-600" />
            <StatCard label="Published"          value={data.publishedPosts}     icon={Rocket}        color="text-green-600" />
            <StatCard label="Total Engagements"  value={data.totalEngagements}   icon={MessageSquare} color="text-purple-600" />
            <StatCard label="Avg Engage Score"   value={`${data.avgEngagementScore}/100`} icon={TrendingUp} color="text-orange-600" />
          </div>

          {/* Platform breakdown */}
          {data.platformStats.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-sm font-semibold">Platform Breakdown</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                {data.platformStats.map((p) => (
                  <EngagementBar key={p.platform} {...p} maxPosts={maxPosts} />
                ))}
              </CardContent>
            </Card>
          )}

          {/* Status breakdown */}
          <div className="grid grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-xs text-muted-foreground">Scheduled</p>
                <p className="text-3xl font-bold text-yellow-600 mt-1">{data.scheduledPosts}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-xs text-muted-foreground">Drafts</p>
                <p className="text-3xl font-bold text-slate-500 mt-1">{data.draftPosts}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-xs text-muted-foreground">Pending Replies</p>
                <p className="text-3xl font-bold text-red-600 mt-1">{data.pendingReplies}</p>
              </CardContent>
            </Card>
          </div>

          {/* Top posts */}
          {data.topPosts.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-sm font-semibold">Top Performing Posts</CardTitle></CardHeader>
              <CardContent>
                <ul className="divide-y">
                  {data.topPosts.map((p, i) => (
                    <li key={p.id} className="py-3 flex items-start gap-3">
                      <span className="text-lg font-bold text-muted-foreground w-6 text-center">
                        {i + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm line-clamp-2">{p.content}</p>
                        <div className="flex gap-2 mt-1 text-xs text-muted-foreground">
                          <span className="capitalize">{p.platform}</span>
                          <span>·</span>
                          <span>Score: {p.engagementScore}/100</span>
                          {p.publishedAt && <><span>·</span><span>{new Date(p.publishedAt).toLocaleDateString()}</span></>}
                        </div>
                      </div>
                      <Badge variant="default" className="shrink-0">{p.engagementScore}</Badge>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {data.topPosts.length === 0 && (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                Publish some posts to see analytics here.
              </CardContent>
            </Card>
          )}
        </>
      ) : null}
    </div>
  );
}
