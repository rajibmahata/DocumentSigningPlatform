'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/providers/auth-provider';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { merchantApi } from '@/lib/api';
import { apiBaseUrl } from '@/lib/config';
import type { MerchantResponse } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Building2, Key, Copy, CheckCircle, AlertTriangle, Pencil, X } from 'lucide-react';
import { InfoTooltip } from '@/components/ui/info-tooltip';

const schema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  description: z.string().optional(),
  requestLimit: z.coerce.number().min(0).default(100),
});
type FormValues = z.infer<typeof schema>;

export default function MerchantPage() {
  const { user }    = useAuth();
  const queryClient = useQueryClient();

  const { data: merchants, isLoading } = useQuery({
    queryKey: ['merchants', user?.id],
    queryFn: () => merchantApi.getByUser(user!.id).then((r) => r.data),
    enabled: !!user,
  });
  const merchant = merchants?.[0];

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Merchant Account</h1>
        <p className="mt-1 text-sm text-gray-500">
          Your merchant account gives you an API key and envelope quota.
        </p>
      </div>

      {merchant ? (
        <MerchantDetails merchant={merchant} />
      ) : (
        <CreateMerchantForm userId={user!.id} onCreated={() => queryClient.invalidateQueries({ queryKey: ['merchants'] })} />
      )}
    </div>
  );
}

function MerchantDetails({ merchant }: { merchant: MerchantResponse }) {
  const queryClient = useQueryClient();
  const [copied, setCopied] = useState(false);
  const [keyVisible, setKeyVisible] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(merchant.name);
  const [editDesc, setEditDesc] = useState(merchant.description ?? '');

  const updateMutation = useMutation({
    mutationFn: () =>
      merchantApi.updateProfile(merchant.id, {
        name: editName.trim(),
        description: editDesc.trim() || undefined,
      }),
    onSuccess: () => {
      toast.success('Merchant profile updated.');
      queryClient.invalidateQueries({ queryKey: ['merchants'] });
      setEditing(false);
    },
    onError: () => toast.error('Failed to update merchant.'),
  });

  const startEdit = () => {
    setEditName(merchant.name);
    setEditDesc(merchant.description ?? '');
    setEditing(true);
  };

  const used      = merchant.requestUsed;
  const limit     = merchant.requestLimit;
  const unlimited = limit === 0;
  const pct       = unlimited ? 0 : Math.min((used / limit) * 100, 100);
  const remaining = unlimited ? '∞' : limit - used;

  const copyKey = () => {
    navigator.clipboard.writeText(merchant.apiKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-5">
      {/* Merchant card */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                <Building2 className="h-5 w-5" />
              </div>
              <div>
                <CardTitle>{merchant.name}</CardTitle>
                {merchant.description && (
                  <p className="text-sm text-gray-500 mt-0.5">{merchant.description}</p>
                )}
              </div>
            </div>
            {!editing && (
              <button
                onClick={startEdit}
                className="flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors shrink-0"
              >
                <Pencil className="h-3.5 w-3.5" /> Edit
              </button>
            )}
          </div>
          {/* Inline edit form */}
          {editing && (
            <div className="mt-4 space-y-3 rounded-xl border border-brand-200 bg-brand-50 p-4">
              <div className="space-y-1">
                <Label className="text-xs text-gray-600">Merchant Name *</Label>
                <Input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="e.g. Acme Corp"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-gray-600">Description</Label>
                <Textarea
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  placeholder="Optional description"
                  rows={2}
                  className="resize-none"
                />
              </div>
              <div className="flex gap-2 pt-1">
                <Button
                  size="sm"
                  onClick={() => updateMutation.mutate()}
                  loading={updateMutation.isPending}
                  disabled={!editName.trim() || updateMutation.isPending}
                >
                  Save Changes
                </Button>
                <button
                  onClick={() => setEditing(false)}
                  className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium text-gray-500 hover:text-gray-800 transition-colors"
                >
                  <X className="h-3.5 w-3.5" /> Cancel
                </button>
              </div>
            </div>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Merchant ID */}
          <div>
            <Label className="text-xs text-gray-400 uppercase tracking-wide">Merchant ID</Label>
            <p className="mt-1 font-mono text-sm text-gray-700 bg-gray-50 rounded-lg px-3 py-2 select-all">
              {merchant.id}
            </p>
          </div>

          {/* API Key */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <Label className="text-xs text-gray-400 uppercase tracking-wide flex items-center gap-1">
                <Key className="h-3.5 w-3.5" /> API Key
                <InfoTooltip content="Your API key authenticates requests to the DocSignerHub REST API. Pass it in the X-Api-Key header. Keep it secret — do not commit it to source control." side="right" />
              </Label>
              <div className="flex gap-2">
                <button
                  onClick={() => setKeyVisible(!keyVisible)}
                  className="text-xs text-brand-600 hover:underline"
                >
                  {keyVisible ? 'Hide' : 'Show'}
                </button>
                <button onClick={copyKey} className="flex items-center gap-1 text-xs text-brand-600 hover:underline">
                  {copied ? <CheckCircle className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>
            </div>
            <p className="font-mono text-sm text-gray-700 bg-gray-900 text-green-400 rounded-lg px-3 py-2 select-all truncate">
              {keyVisible ? merchant.apiKey : '•'.repeat(32)}
            </p>
            <p className="mt-1 text-xs text-gray-400">
              Keep this secret. Use it in the <code>X-Api-Key</code> request header.
            </p>
          </div>

          {/* Usage */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <Label className="text-xs text-gray-400 uppercase tracking-wide flex items-center gap-1">
                Usage
                <InfoTooltip content="Each envelope you send consumes one credit. When requestLimit is 0 the account has unlimited credits. Contact support to increase your limit." />
              </Label>
              <span className="text-xs text-gray-600">
                {used} / {unlimited ? '∞' : limit} used · {remaining} remaining
              </span>
            </div>
            <div className="h-2.5 w-full rounded-full bg-gray-100">
              {!unlimited && (
                <div
                  className={`h-2.5 rounded-full transition-all ${
                    pct >= 90 ? 'bg-red-500' : pct >= 70 ? 'bg-amber-500' : 'bg-brand-600'
                  }`}
                  style={{ width: `${pct}%` }}
                />
              )}
              {unlimited && <div className="h-2.5 rounded-full bg-brand-200 w-full" />}
            </div>
            {!unlimited && pct >= 90 && (
              <p className="mt-1.5 flex items-center gap-1 text-xs text-red-600">
                <AlertTriangle className="h-3.5 w-3.5" />
                You are approaching your envelope limit.
              </p>
            )}
          </div>

          {/* Status */}
          <div className="flex items-center gap-2">
            <span className={`h-2 w-2 rounded-full ${merchant.isActive ? 'bg-green-500' : 'bg-gray-400'}`} />
            <span className="text-sm text-gray-600">
              {merchant.isActive ? 'Active' : 'Inactive'}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Quick usage guide */}
      <Card>
        <CardHeader><CardTitle className="text-sm">Quick API Usage</CardTitle></CardHeader>
        <CardContent>
          <pre className="rounded-xl bg-gray-900 text-green-400 p-4 text-xs font-mono overflow-x-auto whitespace-pre">{`curl -X POST ${apiBaseUrl}/api/envelopes \\
  -H "X-Api-Key: ${keyVisible ? merchant.apiKey : 'YOUR_API_KEY'}" \\
  -H "Content-Type: application/json" \\
  -d '{ "title": "...", "merchantId": "${merchant.id}", ... }'`}</pre>
        </CardContent>
      </Card>
    </div>
  );
}

function CreateMerchantForm({ userId, onCreated }: { userId: string; onCreated: () => void }) {
  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { requestLimit: 100 },
  });

  const mutation = useMutation({
    mutationFn: (data: FormValues) =>
      merchantApi.create({ userId, name: data.name, description: data.description, requestLimit: data.requestLimit }),
    onSuccess: () => {
      toast.success('Merchant account created!');
      onCreated();
    },
    onError: () => toast.error('Failed to create merchant.'),
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50 text-orange-600">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div>
            <CardTitle>Create Merchant Account</CardTitle>
            <p className="text-sm text-gray-500 mt-0.5">
              Required before sending envelopes via API.
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-4">
          <div className="space-y-1">
            <Label>Business / Merchant Name</Label>
            <Input placeholder="Acme Corp" {...register('name')} />
            {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
          </div>
          <div className="space-y-1">
            <Label>Description <span className="text-gray-400">(optional)</span></Label>
            <Textarea placeholder="Brief description of your business" {...register('description')} />
          </div>
          <div className="space-y-1">
            <Label>Envelope Limit</Label>
            <Input type="number" min={0} {...register('requestLimit')} />
            <p className="text-xs text-gray-400">
              0 = unlimited. Default is 100 envelopes.
            </p>
          </div>
          <Button type="submit" loading={mutation.isPending}>
            <Building2 className="h-4 w-4" /> Create Merchant Account
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
