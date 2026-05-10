'use client';

import { useEffect, useState } from 'react';
import { marketingApi, MarketingPostDto } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { CalendarClock, Loader2, CheckCircle, Trash2, RefreshCw, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';

const STATUS_TABS = ['all', 'draft', 'scheduled', 'published', 'failed'];

function statusVariant(s: string): 'default' | 'secondary' | 'success' | 'warning' | 'danger' {
  if (s === 'published') return 'success';
  if (s === 'scheduled') return 'warning';
  if (s === 'failed')    return 'danger';
  return 'secondary';
}

export default function ScheduledPostsPage() {
  const [posts, setPosts]       = useState<MarketingPostDto[]>([]);
  const [tab, setTab]           = useState('all');
  const [search, setSearch]     = useState('');
  const [loading, setLoading]   = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const res = await marketingApi.getPosts(tab !== 'all' ? { status: tab } : undefined);
      setPosts(res.data);
    } catch (err) { console.error('Scheduled posts load error:', err); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [tab]);

  const handlePublish = async (id: string) => {
    try {
      await marketingApi.updatePostStatus(id, 'published');
      toast.success('Post marked as published.');
      await load();
    } catch { toast.error('Update failed.'); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this post?')) return;
    try {
      await marketingApi.deletePost(id);
      setPosts((prev) => prev.filter((p) => p.id !== id));
      toast.success('Post deleted.');
    } catch { toast.error('Delete failed.'); }
  };

  const filtered = posts.filter((p) =>
    !search || p.content.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <CalendarClock className="h-6 w-6 text-primary" />Scheduled Posts
          </h1>
          <p className="text-sm text-muted-foreground">Manage draft, scheduled and published posts</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          </Button>
          <Link href="/dashboard/marketing/content">
            <Button size="sm">Create Post</Button>
          </Link>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 flex-wrap">
        {STATUS_TABS.map((t) => (
          <Button
            key={t} size="sm"
            variant={tab === t ? 'default' : 'outline'}
            onClick={() => setTab(t)}
            className="capitalize"
          >
            {t}
          </Button>
        ))}
      </div>

      {/* Search */}
      <Input
        placeholder="Search post content..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="max-w-sm"
      />

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No posts found. <Link href="/dashboard/marketing/content" className="underline">Generate one with AI.</Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((post) => (
            <Card key={post.id}>
              <CardContent className="p-4 flex items-start gap-4">
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant={statusVariant(post.status)} className="capitalize text-xs">
                      {post.status}
                    </Badge>
                    <Badge variant="secondary" className="capitalize text-xs">{post.platform}</Badge>
                    <span className="text-xs text-muted-foreground">
                      Score: {post.engagementScore}/100
                    </span>
                    {post.scheduledAt && (
                      <span className="text-xs text-muted-foreground">
                        Scheduled: {new Date(post.scheduledAt).toLocaleString()}
                      </span>
                    )}
                    {post.publishedAt && (
                      <span className="text-xs text-muted-foreground">
                        Published: {new Date(post.publishedAt).toLocaleString()}
                      </span>
                    )}
                  </div>
                  <p className="text-sm line-clamp-3">{post.content}</p>
                  {post.hashtags && (
                    <p className="text-xs text-blue-600 line-clamp-1">{post.hashtags}</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Category: {post.contentCategory.replace(/_/g, ' ')} · By: {post.createdBy}
                  </p>
                </div>
                <div className="flex flex-col gap-1 shrink-0">
                  {(post.status === 'draft' || post.status === 'scheduled') && (
                    <Button
                      size="sm" variant="outline"
                      onClick={() => handlePublish(post.id)}
                      className="gap-1 text-xs"
                    >
                      <CheckCircle className="h-3 w-3" />Publish
                    </Button>
                  )}
                  <Button
                    size="sm" variant="ghost"
                    onClick={() => handleDelete(post.id)}
                    className="gap-1 text-xs text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-3 w-3" />Delete
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
