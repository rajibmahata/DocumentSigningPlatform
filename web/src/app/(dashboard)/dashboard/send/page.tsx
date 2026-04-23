'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useForm, useFieldArray, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/providers/auth-provider';
import { useQuery } from '@tanstack/react-query';
import { merchantApi, envelopeApi, signerContactApi, templatesApi } from '@/lib/api';
import type { SignerContactResponse } from '@/types';
import type { TemplateResponse } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { InfoTooltip } from '@/components/ui/info-tooltip';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import {
  Plus, Trash2, AlertTriangle, Upload, Download,
  LayoutTemplate, Search, CheckCircle2, X, ChevronDown, ChevronUp,
  Users, Sparkles, Building2, CreditCard, CheckCircle, XCircle,
} from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
// Zod schema
// ─────────────────────────────────────────────────────────────────────────────

const signerSchema = z.object({
  name:    z.string().min(1, 'Required'),
  email:   z.string().email('Invalid email'),
  role:    z.string().min(1, 'Required'),
  order:   z.coerce.number().min(1),
  message: z.string().min(1, 'Required'),
});

const schema = z.object({
  title:   z.string().min(1, 'Title is required'),
  signers: z.array(signerSchema).min(1, 'Add at least one signer'),
});
type FormValues = z.infer<typeof schema>;

interface FileDoc {
  fileName: string;
  base64: string;
  contentType: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Email autocomplete input
// ─────────────────────────────────────────────────────────────────────────────

interface SignerEmailInputProps {
  value: string;
  onChange: (email: string) => void;
  onSelectContact: (contact: SignerContactResponse) => void;
  error?: string;
}

function SignerEmailInput({ value, onChange, onSelectContact, error }: SignerEmailInputProps) {
  const [suggestions, setSuggestions] = useState<SignerContactResponse[]>([]);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const fetchSuggestions = useCallback(async (query: string) => {
    if (query.length < 2) { setSuggestions([]); setOpen(false); return; }
    try {
      const res = await signerContactApi.search(query);
      setSuggestions(res.data);
      setOpen(res.data.length > 0);
    } catch {
      setSuggestions([]);
      setOpen(false);
    }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    onChange(v);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchSuggestions(v), 200);
  };

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node))
        setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <Input
        placeholder="john@example.com"
        value={value}
        onChange={handleChange}
        onFocus={() => suggestions.length > 0 && setOpen(true)}
        autoComplete="off"
      />
      {open && (
        <ul className="absolute z-30 w-full mt-1 rounded-xl border border-gray-200 bg-white shadow-lg max-h-48 overflow-auto text-sm">
          {suggestions.map((c) => (
            <li
              key={c.id}
              className="flex flex-col px-3 py-2 cursor-pointer hover:bg-gray-50 transition-colors"
              onMouseDown={(e) => {
                e.preventDefault();
                onSelectContact(c);
                setOpen(false);
              }}
            >
              <span className="font-medium text-gray-900">{c.name}</span>
              <span className="text-xs text-gray-500">{c.email} · {c.role}</span>
            </li>
          ))}
        </ul>
      )}
      {error && <p className="text-xs text-red-500 mt-0.5">{error}</p>}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Role colour map
// ─────────────────────────────────────────────────────────────────────────────

const ROLE_COLORS: Record<string, string> = {
  signer:   'bg-blue-100 text-blue-700',
  witness:  'bg-purple-100 text-purple-700',
  notary:   'bg-orange-100 text-orange-700',
  reviewer: 'bg-gray-100 text-gray-600',
};

// ─────────────────────────────────────────────────────────────────────────────
// Template picker modal
// ─────────────────────────────────────────────────────────────────────────────

interface TemplatePickerModalProps {
  templates: TemplateResponse[];
  onApply: (t: TemplateResponse) => void;
  onClose: () => void;
}

function TemplatePickerModal({ templates, onApply, onClose }: TemplatePickerModalProps) {
  const [search, setSearch] = useState('');

  const filtered = templates.filter(
    (t) =>
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      (t.description ?? '').toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 py-10 px-4">
      <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div className="flex items-center gap-2">
            <LayoutTemplate className="h-5 w-5 text-brand-600" />
            <h2 className="text-lg font-semibold text-gray-900">Choose a Template</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Search */}
        <div className="px-6 pt-4 pb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search templates…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-gray-200 bg-gray-50 pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
              autoFocus
            />
          </div>
        </div>

        {/* Template list */}
        <div className="px-6 pb-6 max-h-[480px] overflow-y-auto space-y-3">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-10 text-center">
              <LayoutTemplate className="h-10 w-10 text-gray-200" />
              <p className="text-sm text-gray-500">
                {search ? 'No templates match your search.' : 'You have no templates yet.'}
              </p>
              {!search && (
                <a
                  href="/dashboard/templates"
                  className="text-xs text-brand-600 hover:underline"
                >
                  Create a template →
                </a>
              )}
            </div>
          ) : (
            filtered.map((t) => (
              <div
                key={t.id}
                className="group relative flex items-start gap-4 rounded-xl border border-gray-200 bg-white p-4 hover:border-brand-300 hover:bg-brand-50/40 transition-all cursor-pointer"
                onClick={() => onApply(t)}
              >
                {/* Icon */}
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-100 text-brand-600">
                  <LayoutTemplate className="h-5 w-5" />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-gray-900 text-sm">{t.name}</p>
                      {t.description && (
                        <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{t.description}</p>
                      )}
                      <p className="text-xs text-gray-400 mt-0.5">
                        Default title: <span className="font-medium text-gray-600">{t.defaultTitle}</span>
                      </p>
                    </div>
                    <span className="flex items-center gap-1 shrink-0 text-xs text-gray-500">
                      <Users className="h-3.5 w-3.5" />
                      {t.signers.length} signer{t.signers.length !== 1 ? 's' : ''}
                    </span>
                  </div>

                  {/* Signer chips */}
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {t.signers.sort((a, b) => a.order - b.order).map((s, i) => (
                      <span
                        key={i}
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${ROLE_COLORS[s.role] ?? 'bg-gray-100 text-gray-600'}`}
                      >
                        <span className="font-bold">{s.order}.</span>
                        {s.name || s.role}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Apply btn */}
                <button
                  type="button"
                  className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-medium text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-brand-700"
                  onClick={(e) => { e.stopPropagation(); onApply(t); }}
                >
                  <CheckCircle2 className="h-3.5 w-3.5" /> Apply
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Applied-template banner
// ─────────────────────────────────────────────────────────────────────────────

function AppliedTemplateBanner({
  name,
  signerCount,
  onClear,
}: {
  name: string;
  signerCount: number;
  onClear: () => void;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-green-200 bg-green-50 px-4 py-3">
      <CheckCircle2 className="h-5 w-5 shrink-0 text-green-600" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-green-800">
          Template applied — <span className="font-semibold">{name}</span>
        </p>
        <p className="text-xs text-green-600 mt-0.5">
          Pre-filled title and {signerCount} signer{signerCount !== 1 ? 's' : ''}. You can still edit everything below.
        </p>
      </div>
      <button
        type="button"
        onClick={onClear}
        className="shrink-0 flex items-center gap-1.5 rounded-lg border border-green-300 bg-white px-2.5 py-1 text-xs font-medium text-green-700 hover:bg-green-100 transition-colors"
      >
        <X className="h-3.5 w-3.5" /> Clear
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Template start section (collapsed / expanded chooser at top of form)
// ─────────────────────────────────────────────────────────────────────────────

function TemplateStartSection({
  templates,
  appliedTemplate,
  onApply,
  onClear,
}: {
  templates: TemplateResponse[];
  appliedTemplate: TemplateResponse | null;
  onApply: (t: TemplateResponse) => void;
  onClear: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);

  const handleApply = (t: TemplateResponse) => {
    onApply(t);
    setPickerOpen(false);
    setOpen(false);
  };

  return (
    <>
      {/* Collapsible panel */}
      <div className={`rounded-2xl border transition-all duration-200 ${appliedTemplate ? 'border-green-200 bg-green-50/60' : 'border-brand-200 bg-brand-50/60'}`}>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex w-full items-center justify-between px-5 py-3.5"
        >
          <div className="flex items-center gap-2.5">
            <Sparkles className={`h-5 w-5 ${appliedTemplate ? 'text-green-600' : 'text-brand-600'}`} />
            <span className="text-sm font-semibold text-gray-800">
              {appliedTemplate ? `Template: ${appliedTemplate.name}` : 'Start from a Template'}
            </span>
            {appliedTemplate ? (
              <Badge className="bg-green-100 text-green-700 border-0 text-xs">Applied</Badge>
            ) : (
              <Badge className="text-xs text-brand-700 bg-brand-50 border border-brand-300">Optional</Badge>
            )}
            <InfoTooltip
              content="Templates save you time by pre-filling the envelope title and the signer list. You can still edit everything after applying a template."
              side="right"
            />
          </div>
          {open
            ? <ChevronUp className="h-4 w-4 text-gray-400" />
            : <ChevronDown className="h-4 w-4 text-gray-400" />}
        </button>

        {open && (
          <div className="px-5 pb-4 border-t border-dashed border-gray-200 pt-3 space-y-3">
            {appliedTemplate ? (
              <AppliedTemplateBanner
                name={appliedTemplate.name}
                signerCount={appliedTemplate.signers.length}
                onClear={onClear}
              />
            ) : (
              <>
                <p className="text-xs text-gray-500">
                  Select a previously-saved signing workflow to pre-fill this envelope. Perfect for recurring documents like NDAs, contracts, or onboarding packets.
                </p>
                {templates.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-gray-200 bg-white px-4 py-6 text-center text-sm text-gray-500">
                    No templates yet.{' '}
                    <a href="/dashboard/templates" className="text-brand-600 hover:underline font-medium">
                      Create one →
                    </a>
                  </div>
                ) : (
                  <>
                    {/* Quick pick — top 3 templates */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      {templates.slice(0, 3).map((t) => (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => handleApply(t)}
                          className="flex items-start gap-2.5 rounded-xl border border-gray-200 bg-white p-3 text-left hover:border-brand-300 hover:bg-brand-50 transition-all group"
                        >
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-100 text-brand-600">
                            <LayoutTemplate className="h-4 w-4" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-gray-800 leading-tight truncate">{t.name}</p>
                            <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                              <Users className="h-3 w-3" />
                              {t.signers.length} signer{t.signers.length !== 1 ? 's' : ''}
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>
                    {templates.length > 3 && (
                      <button
                        type="button"
                        onClick={() => setPickerOpen(true)}
                        className="flex items-center gap-1.5 text-xs font-medium text-brand-600 hover:text-brand-800 transition-colors"
                      >
                        <Search className="h-3.5 w-3.5" />
                        Browse all {templates.length} templates…
                      </button>
                    )}
                  </>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* Full picker modal */}
      {pickerOpen && (
        <TemplatePickerModal
          templates={templates}
          onApply={handleApply}
          onClose={() => setPickerOpen(false)}
        />
      )}
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main page
// ─────────────────────────────────────────────────────────────────────────────

export default function SendPage() {
  const router   = useRouter();
  const { user } = useAuth();
  const [docs, setDocs] = useState<FileDoc[]>([]);
  const [appliedTemplate, setAppliedTemplate] = useState<TemplateResponse | null>(null);
  const [selectedMerchantId, setSelectedMerchantId] = useState<string | null>(null);

  const { data: merchants } = useQuery({
    queryKey: ['merchants', user?.id],
    queryFn: () => merchantApi.getByUser(user!.id).then((r) => r.data),
    enabled: !!user,
  });

  // Auto-select first merchant on load
  useEffect(() => {
    if (merchants && merchants.length > 0 && !selectedMerchantId) {
      setSelectedMerchantId(merchants[0].id);
    }
  }, [merchants, selectedMerchantId]);

  const merchant = merchants?.find(m => m.id === selectedMerchantId) ?? merchants?.[0];

  const { data: templates = [] } = useQuery({
    queryKey: ['templates'],
    queryFn: () => templatesApi.list().then((r) => r.data),
  });

  const {
    register, control, handleSubmit, setValue, reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      signers: [{ name: '', email: '', role: 'signer', order: 1, message: 'Please review and sign the document.' }],
    },
  });

  const { fields, append, remove, replace } = useFieldArray({ control, name: 'signers' });
  const signerValues = useWatch({ control, name: 'signers' });

  // Apply template → pre-fill form
  const applyTemplate = (t: TemplateResponse) => {
    setAppliedTemplate(t);
    setValue('title', t.defaultTitle, { shouldValidate: true });
    replace(
      t.signers
        .sort((a, b) => a.order - b.order)
        .map((s) => ({
          name:    s.name,
          email:   s.email,
          role:    s.role,
          order:   s.order,
          message: s.message ?? 'Please review and sign the document.',
        })),
    );
  };

  const clearTemplate = () => {
    setAppliedTemplate(null);
    reset({
      title: '',
      signers: [{ name: '', email: '', role: 'signer', order: 1, message: 'Please review and sign the document.' }],
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    const loaded: FileDoc[] = await Promise.all(
      files.map(
        (f) =>
          new Promise<FileDoc>((resolve) => {
            const reader = new FileReader();
            reader.onload = () => {
              const base64 = (reader.result as string).split(',')[1];
              resolve({ fileName: f.name, base64, contentType: f.type });
            };
            reader.readAsDataURL(f);
          }),
      ),
    );
    setDocs((prev) => [...prev, ...loaded]);
  };

  const onSubmit = async (data: FormValues) => {
    if (!merchant) { toast.error('Create a merchant account first.'); return; }
    if (!merchant.isActive) { toast.error('Merchant account is deactivated. Cannot send envelopes.'); return; }
    if (docs.length === 0) { toast.error('Please upload at least one document.'); return; }

    if (merchant.requestLimit > 0 && merchant.requestUsed >= merchant.requestLimit) {
      toast.error('Envelope limit reached. Upgrade your merchant account.');
      return;
    }

    try {
      await envelopeApi.create(merchant.apiKey, {
        title: data.title,
        merchantId: merchant.id,
        documents: docs.map((d) => ({
          documentTitle: d.fileName.replace(/\.[^.]+$/, ''),
          documentFileName: d.fileName,
          documentBase64: d.base64,
          documentContentType: d.contentType,
        })),
        signers: data.signers,
      });
      toast.success('Envelope sent! Signers will receive email invitations.');
      router.push('/dashboard/envelopes');
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string; value?: string } } })?.response?.data?.message ??
        (err as { response?: { data?: { message?: string; value?: string } } })?.response?.data?.value ??
        'Failed to send envelope.';
      toast.error(msg);
    }
  };

  return (
    <div className="animate-fade-in space-y-6 max-w-3xl">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Send Envelope</h1>
        <p className="mt-1 text-sm text-gray-500">
          Upload a document, choose signers, and send.
        </p>
      </div>

      {/* ── Merchant selector + details ── */}
      {merchants && merchants.length > 0 && (
        <div className={`rounded-2xl border p-4 space-y-3 ${merchant && !merchant.isActive ? 'border-red-200 bg-red-50' : 'border-gray-200 bg-white'}`}>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Building2 className={`h-5 w-5 shrink-0 ${merchant && !merchant.isActive ? 'text-red-400' : 'text-indigo-500'}`} />
              <span className="text-sm font-semibold text-gray-800">Merchant Account</span>
            </div>
            {/* Only show selector if user has multiple merchants */}
            {merchants.length > 1 && (
              <select
                value={selectedMerchantId ?? ''}
                onChange={e => setSelectedMerchantId(e.target.value)}
                className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {merchants.map(m => (
                  <option key={m.id} value={m.id}>
                    {m.name}{!m.isActive ? ' (Inactive)' : ''}
                  </option>
                ))}
              </select>
            )}
          </div>

          {merchant && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {/* Name + description */}
              <div className="col-span-2 sm:col-span-2">
                <p className="font-semibold text-gray-900 text-sm">{merchant.name}</p>
                {merchant.description && (
                  <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{merchant.description}</p>
                )}
                <div className="flex items-center gap-2 mt-1.5">
                  <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-indigo-50 text-indigo-700 capitalize">
                    {merchant.planName || 'free'}
                  </span>
                  {merchant.isActive
                    ? <span className="inline-flex items-center gap-1 text-xs text-green-600 font-medium"><CheckCircle className="h-3 w-3" /> Active</span>
                    : <span className="inline-flex items-center gap-1 text-xs text-red-600 font-medium"><XCircle className="h-3 w-3" /> Inactive</span>}
                </div>
              </div>
              {/* Credits */}
              <div className="col-span-2 sm:col-span-2">
                <div className="flex items-center gap-1.5 mb-1">
                  <CreditCard className="h-4 w-4 text-gray-400" />
                  <span className="text-xs font-medium text-gray-600">Credits</span>
                </div>
                {merchant.requestLimit === 0 ? (
                  <p className="text-sm font-semibold text-emerald-600">Unlimited</p>
                ) : (
                  <>
                    <div className="flex justify-between text-xs text-gray-600 mb-1">
                      <span>{merchant.requestUsed} used / {merchant.requestLimit}</span>
                      <span className={
                        merchant.requestLimit - merchant.requestUsed <= 0
                          ? 'text-red-600 font-bold'
                          : merchant.requestUsed / merchant.requestLimit >= 0.9
                            ? 'text-red-500 font-semibold'
                            : merchant.requestUsed / merchant.requestLimit >= 0.7
                              ? 'text-amber-600'
                              : 'text-indigo-600 font-medium'
                      }>
                        {Math.max(0, merchant.requestLimit - merchant.requestUsed)} remaining
                      </span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all ${
                          merchant.requestUsed >= merchant.requestLimit
                            ? 'bg-red-500'
                            : merchant.requestUsed / merchant.requestLimit >= 0.9
                              ? 'bg-red-400'
                              : merchant.requestUsed / merchant.requestLimit >= 0.7
                                ? 'bg-amber-400'
                                : 'bg-indigo-500'
                        }`}
                        style={{ width: `${Math.min(100, Math.round((merchant.requestUsed / merchant.requestLimit) * 100))}%` }}
                      />
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Inactive warning */}
          {merchant && !merchant.isActive && (
            <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-100 px-3 py-2.5 text-sm text-red-800">
              <XCircle className="h-4 w-4 shrink-0 mt-0.5 text-red-500" />
              <div>
                <p className="font-semibold">Merchant account is deactivated</p>
                <p className="text-xs mt-0.5">Envelope sending is disabled. Contact your administrator to reactivate this account.</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Template start section */}
      <TemplateStartSection
        templates={templates}
        appliedTemplate={appliedTemplate}
        onApply={applyTemplate}
        onClear={clearTemplate}
      />

      {/* Placeholder instructions */}
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 flex gap-3">
        <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
        <div className="text-sm text-amber-800 flex-1">
          <p className="font-semibold">Document must contain signature placeholders:</p>
          <code className="block mt-1 text-xs bg-amber-100 rounded p-2 font-mono">
            {'{signature:signer:Please+Sign+Here}'}<br />
            {'{date:signer:Date+Here}'}
          </code>
          <p className="mt-1.5 text-xs">Replace <code>signer</code> with the matching signer <strong>role</strong>.</p>
          <a
            href="/sample-template.docx"
            download="DocSignerHub-Sample-Template.docx"
            className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-amber-700 underline underline-offset-2 hover:text-amber-900"
          >
            <Download className="h-3.5 w-3.5" />
            Download sample template (.docx)
          </a>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* ── Envelope details ── */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              Envelope Details
              {appliedTemplate && (
                <Badge className="bg-green-100 text-green-700 border-0 text-xs font-medium">
                  From template
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <Label className="flex items-center gap-1">
                Envelope Title
                <InfoTooltip content="The name displayed to all signers in their email invitation and on the signing page." side="right" />
              </Label>
              <Input
                placeholder="e.g. Employment Contract – John Doe"
                {...register('title')}
                className={appliedTemplate ? 'border-green-200 focus:ring-green-300' : ''}
              />
              {errors.title && <p className="text-xs text-red-500">{errors.title.message}</p>}
            </div>

            {/* File upload */}
            <div className="space-y-1">
              <Label className="flex items-center gap-1">
                Documents (PDF or Word)
                <InfoTooltip content="Upload one or more documents for signing. The document must contain {signature:ROLE:…} placeholders for each signer's role." side="right" />
              </Label>
              <label className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 p-6 cursor-pointer hover:border-brand-400 transition-colors">
                <Upload className="h-7 w-7 text-gray-400 mb-2" />
                <p className="text-sm text-gray-500">Click or drag to upload files</p>
                <p className="text-xs text-gray-400 mt-0.5">Supported: .pdf, .doc, .docx</p>
                <input
                  type="file"
                  accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  multiple
                  className="hidden"
                  onChange={handleFileChange}
                />
              </label>
              {docs.length > 0 && (
                <ul className="mt-2 space-y-1">
                  {docs.map((d, i) => (
                    <li key={i} className="flex items-center justify-between rounded-lg bg-gray-100 px-3 py-1.5 text-sm">
                      <span className="truncate">{d.fileName}</span>
                      <button type="button" onClick={() => setDocs((p) => p.filter((_, j) => j !== i))}>
                        <Trash2 className="h-4 w-4 text-red-400" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <div className="mt-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 flex gap-2.5 items-start">
                <AlertTriangle className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
                <p className="text-xs text-blue-700">
                  <span className="font-semibold">Notice:</span> We are currently experiencing an issue with certain PDF document formats. Our team is actively working on a fix and will update you soon. We apologize for any inconvenience.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ── Signers ── */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              Signers
              <InfoTooltip content="Add everyone who must sign this envelope. Each signer receives an email with a unique, secure link. Signers are notified in the order you set." side="right" />
              {appliedTemplate && (
                <Badge className="bg-green-100 text-green-700 border-0 text-xs font-medium">
                  From template
                </Badge>
              )}
            </CardTitle>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() =>
                append({
                  name: '', email: '',
                  role: `signer${fields.length + 1}`,
                  order: fields.length + 1,
                  message: 'Please sign the document.',
                })
              }
            >
              <Plus className="h-4 w-4" /> Add Signer
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {fields.map((field, index) => (
              <div
                key={field.id}
                className={`rounded-xl border p-4 space-y-3 transition-colors ${
                  appliedTemplate
                    ? 'border-green-100 bg-green-50/40'
                    : 'border-gray-100'
                }`}
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                    Signer {index + 1}
                    {appliedTemplate && signerValues?.[index]?.name && (
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${ROLE_COLORS[signerValues[index].role] ?? 'bg-gray-100 text-gray-600'}`}>
                        {signerValues[index].role}
                      </span>
                    )}
                  </p>
                  {index > 0 && (
                    <button type="button" onClick={() => remove(index)}>
                      <Trash2 className="h-4 w-4 text-red-400" />
                    </button>
                  )}
                </div>
                <div className="space-y-1">
                  <Label>Email</Label>
                  <SignerEmailInput
                    value={signerValues?.[index]?.email ?? ''}
                    onChange={(v) => setValue(`signers.${index}.email`, v, { shouldValidate: true })}
                    onSelectContact={(c) => {
                      setValue(`signers.${index}.email`, c.email, { shouldValidate: true });
                      setValue(`signers.${index}.name`, c.name,  { shouldValidate: true });
                      setValue(`signers.${index}.role`, c.role,  { shouldValidate: true });
                    }}
                    error={errors.signers?.[index]?.email?.message}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label>Name</Label>
                    <Input placeholder="John Doe" {...register(`signers.${index}.name`)} />
                    {errors.signers?.[index]?.name && (
                      <p className="text-xs text-red-500">{errors.signers[index]!.name!.message}</p>
                    )}
                  </div>
                  <div className="space-y-1">
                    <Label className="flex items-center gap-1">
                      Role (must match placeholder)
                      <InfoTooltip content="The role must exactly match the {signature:ROLE:…} placeholder in your document. E.g. if your document has {signature:signer:Sign here}, set role to 'signer'." />
                    </Label>
                    <Input placeholder="signer" {...register(`signers.${index}.role`)} />
                  </div>
                  <div className="space-y-1">
                    <Label className="flex items-center gap-1">
                      Signing Order
                      <InfoTooltip content="Controls the sequence in which signers receive their invitation. Signer with order 1 signs first; the next is only notified after they complete." />
                    </Label>
                    <Input type="number" min={1} {...register(`signers.${index}.order`)} />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label>Message</Label>
                  <Textarea placeholder="Please review and sign." {...register(`signers.${index}.message`)} />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
          <Button
            type="submit"
            loading={isSubmitting}
            disabled={isSubmitting || (merchant != null && !merchant.isActive) || (merchant != null && merchant.requestLimit > 0 && merchant.requestUsed >= merchant.requestLimit)}
          >
            {merchant && !merchant.isActive ? 'Account Deactivated' : 'Send Envelope'}
          </Button>
        </div>
      </form>
    </div>
  );
}
