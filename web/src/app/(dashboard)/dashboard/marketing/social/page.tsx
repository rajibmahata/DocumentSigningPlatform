'use client';

import { useEffect, useState } from 'react';
import { marketingApi, SocialAccountDto } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Globe2, Trash2, Plus, Loader2, X } from 'lucide-react';
import { toast } from 'sonner';

interface ConnectForm {
  platform: string; accountName: string; pageId: string;
  accessToken: string; refreshToken: string; tokenExpiry: string;
}
const EMPTY: ConnectForm = { platform: 'linkedin', accountName: '', pageId: '', accessToken: '', refreshToken: '', tokenExpiry: '' };

export default function SocialAccountsPage() {
  const [accounts, setAccounts] = useState<SocialAccountDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<ConnectForm>(EMPTY);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try { setAccounts((await marketingApi.getSocialAccounts()).data); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const handleConnect = async () => {
    if (!form.accountName || !form.pageId || !form.accessToken) { toast.error('Account name, page ID and access token required.'); return; }
    setSaving(true);
    try {
      await marketingApi.connectSocialAccount({ platform: form.platform, accountName: form.accountName, pageId: form.pageId, accessToken: form.accessToken, refreshToken: form.refreshToken || undefined, tokenExpiry: form.tokenExpiry || undefined });
      toast.success(`${form.platform} account connected.`);
      setOpen(false); setForm(EMPTY); await load();
    } catch { toast.error('Failed to connect account.'); }
    finally { setSaving(false); }
  };

  const handleDisconnect = async (id: string, name: string) => {
    if (!confirm(`Disconnect ${name}?`)) return;
    try { await marketingApi.disconnectSocialAccount(id); toast.success('Disconnected.'); setAccounts(p => p.filter(a => a.id !== id)); }
    catch { toast.error('Failed.'); }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Globe2 className="h-6 w-6 text-primary" />Social Accounts</h1>
          <p className="text-sm text-muted-foreground">Connect LinkedIn and Facebook company pages</p>
        </div>
        <Button onClick={() => setOpen(true)} className="gap-2"><Plus className="h-4 w-4" />Connect Account</Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin" /></div>
      ) : accounts.length === 0 ? (
        <Card><CardContent className="py-16 text-center">
          <Globe2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="font-medium">No social accounts connected</p>
          <p className="text-sm text-muted-foreground mb-4">Connect your LinkedIn or Facebook company page to start publishing AI-generated content.</p>
          <Button onClick={() => setOpen(true)}>Connect Your First Account</Button>
        </CardContent></Card>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {accounts.map(a => (
            <Card key={a.id}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base capitalize">{a.platform}</CardTitle>
                  <Badge variant={a.isActive ? 'success' : 'secondary'}>{a.isActive ? 'Active' : 'Inactive'}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-1">
                <p className="font-medium">{a.accountName}</p>
                <p className="text-xs text-muted-foreground">Page ID: {a.pageId}</p>
                {a.tokenExpiry && <p className="text-xs text-muted-foreground">Expires: {new Date(a.tokenExpiry).toLocaleDateString()}</p>}
                <div className="pt-2">
                  <Button variant="danger" size="sm" onClick={() => handleDisconnect(a.id, a.accountName)} className="gap-1">
                    <Trash2 className="h-3 w-3" />Disconnect
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Connect Social Account</h2>
              <button onClick={() => setOpen(false)}><X className="h-5 w-5" /></button>
            </div>
            <div>
              <Label>Platform</Label>
              <select className="w-full border rounded-lg px-3 py-2 text-sm mt-1" value={form.platform} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setForm({ ...form, platform: e.target.value })}>
                <option value="linkedin">LinkedIn</option>
                <option value="facebook">Facebook</option>
              </select>
            </div>
            {(['accountName', 'pageId', 'accessToken', 'refreshToken', 'tokenExpiry'] as const).map(field => (
              <div key={field}>
                <Label className="capitalize">{field.replace(/([A-Z])/g, ' $1')}</Label>
                <Input value={form[field]} onChange={e => setForm({ ...form, [field]: e.target.value })} placeholder={field === 'tokenExpiry' ? '2025-12-31T00:00:00Z' : ''} type={field.includes('Token') ? 'password' : 'text'} />
              </div>
            ))}
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={handleConnect} disabled={saving}>{saving && <Loader2 className="h-4 w-4 animate-spin mr-1" />}Connect</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
