'use client';

import { useState } from 'react';
import { marketingApi, GeneratePostResult } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Copy, Send, Loader2, Wand2 } from 'lucide-react';
import { toast } from 'sonner';

const CONTENT_CATEGORIES = [
  'product_feature', 'workflow_automation', 'ai_signing', 'esign_security',
  'legal_compliance', 'saas_productivity', 'digital_transformation',
  'customer_success', 'feature_launch', 'educational_tips',
];

const TONES = ['professional', 'friendly', 'inspiring', 'educational', 'bold'];

interface GenerateForm {
  platform: string; contentCategory: string; tone: string;
  campaignContext: string; includeHashtags: boolean;
}

export default function AIContentStudioPage() {
  const [form, setForm]         = useState<GenerateForm>({
    platform: 'linkedin', contentCategory: 'product_feature',
    tone: 'professional', campaignContext: '', includeHashtags: true,
  });
  const [result, setResult]     = useState<GeneratePostResult | null>(null);
  const [generating, setGen]    = useState(false);
  const [publishing, setPub]    = useState(false);
  const [editedContent, setEdited] = useState('');

  const generate = async () => {
    setGen(true);
    setResult(null);
    try {
      const res = await marketingApi.generatePost({
        platform:        form.platform,
        contentCategory: form.contentCategory,
        tone:            form.tone,
        campaignContext: form.campaignContext || undefined,
        includeHashtags: form.includeHashtags,
      });
      setResult(res.data);
      setEdited(res.data.content + (form.includeHashtags && res.data.hashtags ? '\n\n' + res.data.hashtags : ''));
    } catch {
      toast.error('AI generation failed. Check your DeepSeek API key in settings.');
    } finally { setGen(false); }
  };

  const saveAsDraft = async () => {
    if (!editedContent.trim()) return;
    setPub(true);
    try {
      await marketingApi.createPost({
        platform:        form.platform,
        content:         editedContent,
        contentCategory: form.contentCategory,
        hashtags:        result?.hashtags,
      });
      toast.success('Saved as draft!');
    } catch { toast.error('Save failed.'); }
    finally { setPub(false); }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(editedContent);
    toast.success('Copied to clipboard!');
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Sparkles className="h-6 w-6 text-primary" />AI Content Studio
        </h1>
        <p className="text-sm text-muted-foreground">
          Generate AI-powered marketing posts for LinkedIn &amp; Facebook using DeepSeek
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Controls */}
        <Card>
          <CardHeader><CardTitle className="text-sm">Generation Settings</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Platform</Label>
                <select className="w-full border rounded-lg px-3 py-2 text-sm mt-1" value={form.platform} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setForm({ ...form, platform: e.target.value })}>
                  <option value="linkedin">LinkedIn</option>
                  <option value="facebook">Facebook</option>
                </select>
              </div>
              <div>
                <Label>Tone</Label>
                <select className="w-full border rounded-lg px-3 py-2 text-sm mt-1" value={form.tone} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setForm({ ...form, tone: e.target.value })}>
                  {TONES.map((t) => <option key={t} value={t} className="capitalize">{t}</option>)}
                </select>
              </div>
            </div>
            <div>
              <Label>Content Category</Label>
              <select className="w-full border rounded-lg px-3 py-2 text-sm mt-1" value={form.contentCategory} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setForm({ ...form, contentCategory: e.target.value })}>
                {CONTENT_CATEGORIES.map((c) => (
                  <option key={c} value={c} className="capitalize">{c.replace(/_/g, ' ')}</option>
                ))}
              </select>
            </div>
            <div>
              <Label>Campaign Context (optional)</Label>
              <Textarea
                placeholder="e.g. Q3 product launch, holiday promotion..."
                value={form.campaignContext}
                onChange={(e) => setForm({ ...form, campaignContext: e.target.value })}
                rows={2}
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="includeHashtags"
                checked={form.includeHashtags}
                onChange={(e) => setForm({ ...form, includeHashtags: e.target.checked })}
                className="h-4 w-4 rounded border"
              />
              <Label htmlFor="includeHashtags">Include hashtags</Label>
            </div>
            <Button onClick={generate} disabled={generating} className="w-full gap-2">
              {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
              {generating ? 'Generating…' : 'Generate with AI'}
            </Button>
          </CardContent>
        </Card>

        {/* Preview / edit */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">Preview &amp; Edit</CardTitle>
              {result && (
                <Badge variant="secondary">Score: {result.engagementScore}/100</Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {!result && !generating ? (
              <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
                <Sparkles className="h-10 w-10 mb-2 opacity-30" />
                <p className="text-sm">Configure settings and click Generate</p>
              </div>
            ) : generating ? (
              <div className="flex flex-col items-center justify-center h-48">
                <Loader2 className="h-10 w-10 animate-spin text-primary mb-2" />
                <p className="text-sm text-muted-foreground">DeepSeek is writing your post…</p>
              </div>
            ) : (
              <>
                <Textarea
                  value={editedContent}
                  onChange={(e) => setEdited(e.target.value)}
                  rows={10}
                  className="font-mono text-sm"
                />
                {result?.suggestedCtas && result.suggestedCtas.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">Suggested CTAs</p>
                    <div className="flex flex-wrap gap-1">
                      {result.suggestedCtas.map((cta, i) => (
                        <Badge
                        key={i} variant="secondary" className="cursor-pointer text-xs"
                          onClick={() => setEdited((prev) => prev + '\n\n' + cta)}
                        >
                          + {cta}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                <div className="flex gap-2 pt-2">
                  <Button variant="outline" size="sm" onClick={copyToClipboard} className="gap-1">
                    <Copy className="h-3 w-3" />Copy
                  </Button>
                  <Button size="sm" onClick={saveAsDraft} disabled={publishing} className="gap-1">
                    {publishing ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
                    Save as Draft
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
