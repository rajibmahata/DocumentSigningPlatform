'use client';

import { useEffect, useRef, useState } from 'react';
import { blogApi, BlogSummaryDto, BlogDto } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  PenSquare, Plus, Loader2, RefreshCw, Sparkles, Globe,
  Eye, EyeOff, Trash2, Edit2, Upload, X,
} from 'lucide-react';

type Mode = 'list' | 'create' | 'edit' | 'generate';

function statusBadge(status: string): 'success' | 'warning' | 'secondary' {
  if (status === 'published') return 'success';
  if (status === 'draft')     return 'warning';
  return 'secondary';
}

const BLANK_BLOG = { title: '', content: '', metaDescription: '', keywords: '', tags: '', category: '', coverImageUrl: '', status: 'draft' };
const BLANK_GEN  = { topic: '', keywords: '', targetAudience: '', tone: 'professional' };

export default function BlogsPage() {
  const [blogs,     setBlogs]     = useState<BlogSummaryDto[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [mode,      setMode]      = useState<Mode>('list');
  const [editBlog,  setEditBlog]  = useState<BlogDto | null>(null);
  const [form,      setForm]      = useState({ ...BLANK_BLOG });
  const [genForm,   setGenForm]   = useState({ ...BLANK_GEN });
  const [saving,    setSaving]    = useState(false);
  const [deleting,  setDeleting]  = useState<string | null>(null);
  const [publishing, setPublishing] = useState<string | null>(null);
  const [error,     setError]     = useState<string | null>(null);
  const [filter,    setFilter]    = useState<'all' | 'published' | 'draft'>('all');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imageUploading, setImageUploading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await blogApi.getBlogs(filter === 'all' ? {} : { status: filter });
      setBlogs(res.data ?? []);
    } catch { setError('Failed to load blogs'); }
    finally  { setLoading(false); }
  };

  useEffect(() => { load(); }, [filter]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await blogApi.createBlog(form);
      setMode('list');
      setForm({ ...BLANK_BLOG });
      await load();
    } catch { setError('Failed to save blog'); }
    finally  { setSaving(false); }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editBlog) return;
    setSaving(true);
    try {
      await blogApi.updateBlog(editBlog.id, form);
      setMode('list');
      setEditBlog(null);
      await load();
    } catch { setError('Failed to update blog'); }
    finally  { setSaving(false); }
  };

  const handleEdit = async (id: string) => {
    try {
      const res = await blogApi.getBlog(id);
      setEditBlog(res.data);
      setForm({
        title: res.data.title, content: res.data.content,
        metaDescription: res.data.metaDescription ?? '',
        keywords: res.data.keywords ?? '', tags: res.data.tags ?? '',
        category: res.data.category ?? '', coverImageUrl: res.data.coverImageUrl ?? '',
        status: res.data.status,
      });
      setMode('edit');
    } catch { setError('Failed to load blog'); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this blog post?')) return;
    setDeleting(id);
    try { await blogApi.deleteBlog(id); await load(); }
    catch { setError('Failed to delete'); }
    finally { setDeleting(null); }
  };

  const handlePublish = async (id: string, isPublished: boolean) => {
    setPublishing(id);
    try {
      if (isPublished) { await blogApi.unpublishBlog(id); }
      else             { await blogApi.publishBlog(id); }
      await load();
    } catch { setError('Failed to publish/unpublish'); }
    finally { setPublishing(null); }
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await blogApi.generateBlog(genForm);
      setMode('list');
      setGenForm({ ...BLANK_GEN });
      await load();
    } catch { setError('AI generation failed'); }
    finally  { setSaving(false); }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageUploading(true);
    try {
      const res = await blogApi.uploadBlogImage(file);
      // API returns "/blogImages/{filename}"; prefix with /backend to proxy through Next.js
      setForm(f => ({ ...f, coverImageUrl: `/backend${res.data.url}` }));
    } catch {
      setError('Image upload failed. Please try again.');
    } finally {
      setImageUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const filtered = blogs;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <PenSquare className="h-6 w-6 text-indigo-600" />
            Blog Manager
          </h1>
          <p className="text-sm text-slate-500 mt-1">AI-powered blog content engine</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" onClick={load} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button variant="outline" onClick={() => setMode(mode === 'generate' ? 'list' : 'generate')}>
            <Sparkles className="h-4 w-4 mr-1 text-yellow-500" /> AI Generate
          </Button>
          <Button onClick={() => { setMode(mode === 'create' ? 'list' : 'create'); setForm({ ...BLANK_BLOG }); }}>
            <Plus className="h-4 w-4 mr-1" /> New Post
          </Button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">
          {error} <button className="ml-2 underline" onClick={() => setError(null)}>Dismiss</button>
        </div>
      )}

      {/* AI Generate Panel */}
      {mode === 'generate' && (
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-yellow-500" /> AI Blog Generator</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={handleGenerate} className="space-y-4">
              <div>
                <Label>Topic *</Label>
                <Input value={genForm.topic} onChange={e => setGenForm(f => ({ ...f, topic: e.target.value }))} required placeholder="e.g. How AI is transforming contract management" />
              </div>
              <div className="grid sm:grid-cols-3 gap-3">
                <div>
                  <Label>Keywords</Label>
                  <Input value={genForm.keywords} onChange={e => setGenForm(f => ({ ...f, keywords: e.target.value }))} placeholder="e.g. AI, contracts, SaaS" />
                </div>
                <div>
                  <Label>Target Audience</Label>
                  <Input value={genForm.targetAudience} onChange={e => setGenForm(f => ({ ...f, targetAudience: e.target.value }))} placeholder="e.g. CTOs, legal teams" />
                </div>
                <div>
                  <Label>Tone</Label>
                  <select
                    className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm mt-1"
                    value={genForm.tone}
                    onChange={e => setGenForm(f => ({ ...f, tone: e.target.value }))}
                  >
                    <option value="professional">Professional</option>
                    <option value="casual">Casual</option>
                    <option value="inspirational">Inspirational</option>
                    <option value="educational">Educational</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-2">
                <Button type="submit" disabled={saving}>
                  {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Sparkles className="h-4 w-4 mr-1" />}
                  Generate Blog
                </Button>
                <Button type="button" variant="outline" onClick={() => setMode('list')}>Cancel</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Create / Edit Form */}
      {(mode === 'create' || mode === 'edit') && (
        <Card>
          <CardHeader>
            <CardTitle>{mode === 'edit' ? 'Edit Blog Post' : 'New Blog Post'}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={mode === 'edit' ? handleUpdate : handleCreate} className="space-y-4">
              <div>
                <Label>Title *</Label>
                <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required placeholder="Blog post title" />
              </div>
              <div>
                <Label>Content *</Label>
                <Textarea value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))} required rows={10} placeholder="Write your blog content here (Markdown supported)..." />
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <Label>Meta Description</Label>
                  <Input value={form.metaDescription} onChange={e => setForm(f => ({ ...f, metaDescription: e.target.value }))} placeholder="SEO meta description" />
                </div>
                <div>
                  <Label>Keywords</Label>
                  <Input value={form.keywords} onChange={e => setForm(f => ({ ...f, keywords: e.target.value }))} placeholder="comma separated" />
                </div>
                <div>
                  <Label>Tags</Label>
                  <Input value={form.tags} onChange={e => setForm(f => ({ ...f, tags: e.target.value }))} placeholder="tag1, tag2" />
                </div>
                <div>
                  <Label>Category</Label>
                  <Input value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} placeholder="e.g. Product, Tutorial" />
                </div>
                <div>
                  <Label>Cover Image</Label>
                  <div className="mt-1 space-y-2">
                    {form.coverImageUrl && (
                      <div className="relative w-full h-40 rounded-lg overflow-hidden border border-slate-200 bg-slate-50">
                        <img
                          src={form.coverImageUrl}
                          alt="Cover preview"
                          className="w-full h-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => setForm(f => ({ ...f, coverImageUrl: '' }))}
                          className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
                          title="Remove image"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    )}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/gif,image/webp"
                      className="hidden"
                      onChange={handleImageUpload}
                    />
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={imageUploading}
                        onClick={() => fileInputRef.current?.click()}
                        className="gap-2"
                      >
                        {imageUploading
                          ? <Loader2 className="h-4 w-4 animate-spin" />
                          : <Upload className="h-4 w-4" />}
                        {imageUploading ? 'Uploading…' : form.coverImageUrl ? 'Replace Image' : 'Upload Image'}
                      </Button>
                      {form.coverImageUrl && !imageUploading && (
                        <span className="text-xs text-slate-400 truncate max-w-[200px]">
                          {form.coverImageUrl.split('/').pop()}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400">JPEG, PNG, GIF or WebP · max 5 MB</p>
                  </div>
                </div>
                <div>
                  <Label>Status</Label>
                  <select
                    className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm mt-1"
                    value={form.status}
                    onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                  >
                    <option value="draft">Draft</option>
                    <option value="published">Published</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <Button type="submit" disabled={saving}>
                  {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : null}
                  {mode === 'edit' ? 'Save Changes' : 'Create Post'}
                </Button>
                <Button type="button" variant="outline" onClick={() => { setMode('list'); setEditBlog(null); }}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Filter Tabs */}
      {mode === 'list' && (
        <>
          <div className="flex gap-2 border-b">
            {(['all', 'published', 'draft'] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px capitalize ${
                  filter === f ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                {f} {f === 'all' ? `(${blogs.length})` : `(${blogs.filter(b => b.status === f).length})`}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16 text-slate-500">
              <Loader2 className="h-6 w-6 animate-spin mr-2" /> Loading…
            </div>
          ) : filtered.length === 0 ? (
            <Card>
              <CardContent className="py-16 text-center">
                <PenSquare className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500">No blog posts yet.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {filtered.map(blog => (
                <Card key={blog.id}>
                  <CardContent className="py-3 flex items-start gap-4">
                    {blog.coverImageUrl && (
                      <img
                        src={blog.coverImageUrl} alt={blog.title}
                        className="w-16 h-16 rounded object-cover shrink-0 hidden sm:block"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-medium text-base line-clamp-1">{blog.title}</h3>
                        <Badge variant={statusBadge(blog.status)}>{blog.status}</Badge>
                        {blog.category && <Badge variant="secondary">{blog.category}</Badge>}
                      </div>
                      {blog.metaDescription && (
                        <p className="text-sm text-slate-500 line-clamp-1 mt-0.5">{blog.metaDescription}</p>
                      )}
                      <div className="flex gap-4 text-xs text-slate-400 mt-1">
                        <span>By: {blog.createdByAgent}</span>
                        <span><Eye className="h-3 w-3 inline mr-0.5" />{blog.viewCount}</span>
                        {blog.publishedAt && <span>Published {new Date(blog.publishedAt).toLocaleDateString()}</span>}
                        {blog.tags && <span>Tags: {blog.tags}</span>}
                      </div>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <Button
                        size="sm" variant="outline"
                        disabled={publishing === blog.id}
                        onClick={() => handlePublish(blog.id, blog.status === 'published')}
                        title={blog.status === 'published' ? 'Unpublish' : 'Publish'}
                      >
                        {publishing === blog.id
                          ? <Loader2 className="h-3 w-3 animate-spin" />
                          : blog.status === 'published'
                            ? <EyeOff className="h-3 w-3" />
                            : <Globe className="h-3 w-3" />
                        }
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => handleEdit(blog.id)}>
                        <Edit2 className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm" variant="danger"
                        disabled={deleting === blog.id}
                        onClick={() => handleDelete(blog.id)}
                      >
                        {deleting === blog.id
                          ? <Loader2 className="h-3 w-3 animate-spin" />
                          : <Trash2 className="h-3 w-3" />
                        }
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
