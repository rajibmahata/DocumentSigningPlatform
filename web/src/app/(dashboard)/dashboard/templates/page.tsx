'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  templatesApi,
  signerContactApi,
  type TemplateResponse,
  type TemplateSigner,
  type CreateTemplateRequest,
} from '@/lib/api';
import type { SignerContactResponse } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { InfoTooltip } from '@/components/ui/info-tooltip';
import {
  LayoutTemplate, Plus, Pencil, Trash2, X, UserPlus,
  Users, FileText, Clock, Info, ChevronDown, ChevronUp,
  Lightbulb, ArrowRight,
} from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────

interface SignerRow extends TemplateSigner { key: number }

interface FormState {
  name: string;
  description: string;
  defaultTitle: string;
  signers: SignerRow[];
}

const EMPTY_SIGNER = (): SignerRow => ({
  key: Date.now() + Math.random(),
  name: '', email: '', role: 'signer', order: 1, message: 'Please review and sign the document.',
});

const EMPTY_FORM: FormState = {
  name: '', description: '', defaultTitle: '', signers: [EMPTY_SIGNER()],
};

const ROLE_COLORS: Record<string, string> = {
  signer:   'bg-blue-100 text-blue-700',
  witness:  'bg-purple-100 text-purple-700',
  notary:   'bg-orange-100 text-orange-700',
  reviewer: 'bg-gray-100 text-gray-700',
};

// ── How-it-works banner ───────────────────────────────────────────────────────

function HowItWorksBanner({ onDismiss }: { onDismiss: () => void }) {
  return (
    <div className="rounded-2xl border border-brand-200 bg-brand-50 p-5 relative">
      <button
        onClick={onDismiss}
        className="absolute top-3 right-3 text-gray-400 hover:text-gray-600"
        aria-label="Dismiss"
      >
        <X className="h-4 w-4" />
      </button>

      <div className="flex items-center gap-2 mb-3">
        <Lightbulb className="h-5 w-5 text-brand-600 shrink-0" />
        <h2 className="font-semibold text-brand-700">How Document Templates Work</h2>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm text-gray-600">
        <div className="flex gap-3 items-start">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-600 text-white text-xs font-bold">1</span>
          <div>
            <p className="font-medium text-gray-800">Create a Template</p>
            <p className="text-xs mt-0.5">Define a reusable signing configuration — give it a name, default envelope title, and list the signers with their roles and signing order.</p>
          </div>
        </div>
        <div className="flex gap-3 items-start">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-600 text-white text-xs font-bold">2</span>
          <div>
            <p className="font-medium text-gray-800">Use it when Sending</p>
            <p className="text-xs mt-0.5">When creating a new envelope, select a template to pre-fill the title and signer list. Just upload your document and send.</p>
          </div>
        </div>
        <div className="flex gap-3 items-start">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-600 text-white text-xs font-bold">3</span>
          <div>
            <p className="font-medium text-gray-800">Save Time</p>
            <p className="text-xs mt-0.5">For recurring workflows like NDAs, contracts or onboarding packets — templates eliminate repetitive setup so you can send faster.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Signer contact email autocomplete ────────────────────────────────────────

function SignerEmailAutocomplete({
  value,
  onChange,
  onSelectContact,
}: {
  value: string;
  onChange: (v: string) => void;
  onSelectContact: (c: SignerContactResponse) => void;
}) {
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
      <input
        type="email"
        autoComplete="off"
        placeholder="jane@company.com"
        value={value}
        onChange={handleChange}
        onFocus={() => suggestions.length > 0 && setOpen(true)}
        className="w-full rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
      />
      {open && (
        <ul className="absolute z-40 w-full mt-1 rounded-xl border border-gray-200 bg-white shadow-lg max-h-44 overflow-auto text-sm">
          {suggestions.map((c) => (
            <li
              key={c.id}
              className="flex flex-col px-3 py-2 cursor-pointer hover:bg-brand-50 transition-colors"
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
    </div>
  );
}

// ── Signer row input ──────────────────────────────────────────────────────────

function SignerRowInput({
  signer,
  index,
  onChange,
  onSelect,
  onRemove,
  canRemove,
}: {
  signer: SignerRow;
  index: number;
  onChange: (key: number, field: keyof TemplateSigner, value: string | number) => void;
  onSelect: (key: number, contact: SignerContactResponse) => void;
  onRemove: (key: number) => void;
  canRemove: boolean;
}) {
  return (
    <div className="rounded-xl border border-gray-100 bg-gray-50 p-3 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
          Signer #{index + 1}
        </span>
        {canRemove && (
          <button
            type="button"
            onClick={() => onRemove(signer.key)}
            className="text-red-400 hover:text-red-600 transition-colors"
            aria-label="Remove signer"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
      {/* Email — first field with autocomplete */}
      <div>
        <label className="text-xs text-gray-500 mb-0.5 flex items-center gap-1">
          Email
          <InfoTooltip
            content="Start typing to auto-fill from your saved contacts. Email is where the signing request will be sent — can be edited when creating an envelope."
            side="top"
          />
        </label>
        <SignerEmailAutocomplete
          value={signer.email}
          onChange={(v) => onChange(signer.key, 'email', v)}
          onSelectContact={(c) => onSelect(signer.key, c)}
        />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-xs text-gray-500 mb-0.5 flex items-center gap-1">
            Name
            <InfoTooltip
              content="Full name of the signer. This will be pre-filled in the envelope but can be changed before sending."
              side="top"
            />
          </label>
          <input
            className="w-full rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
            placeholder="e.g. Jane Smith"
            value={signer.name}
            onChange={(e) => onChange(signer.key, 'name', e.target.value)}
          />
        </div>
        <div>
          <label className="text-xs text-gray-500 mb-0.5 flex items-center gap-1">
            Role
            <InfoTooltip
              content={
                <div className="space-y-1">
                  <p><strong>Signer</strong> — must sign the document</p>
                  <p><strong>Witness</strong> — witnesses the signing event</p>
                  <p><strong>Notary</strong> — provides notarial seal</p>
                  <p><strong>Reviewer</strong> — reviews but does not sign</p>
                </div>
              }
              side="top"
            />
          </label>
          <select
            className="w-full rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
            value={signer.role}
            onChange={(e) => onChange(signer.key, 'role', e.target.value)}
          >
            <option value="signer">Signer</option>
            <option value="witness">Witness</option>
            <option value="notary">Notary</option>
            <option value="reviewer">Reviewer</option>
          </select>
        </div>
        <div>
          <label className="text-xs text-gray-500 mb-0.5 flex items-center gap-1">
            Signing Order
            <InfoTooltip
              content="Controls the sequence in which signers receive the document. Lower numbers go first. Signers with the same order number receive it simultaneously."
              side="top"
            />
          </label>
          <input
            className="w-full rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
            type="number"
            min={1}
            value={signer.order}
            onChange={(e) => onChange(signer.key, 'order', Number(e.target.value))}
          />
        </div>
      </div>
      <div>
        <label className="text-xs text-gray-500 mb-0.5 flex items-center gap-1">
          Personal Message
          <span className="text-gray-400 font-normal">(optional)</span>
          <InfoTooltip
            content="A custom message shown to this signer in their signing request email. Useful for giving context or instructions."
            side="top"
          />
        </label>
        <input
          className="w-full rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
          placeholder="e.g. Please review and sign the document."
          value={signer.message ?? ''}
          onChange={(e) => onChange(signer.key, 'message', e.target.value)}
        />
      </div>
    </div>
  );
}

// ── Template modal (create / edit) ────────────────────────────────────────────

function TemplateModal({
  initial,
  title,
  onSave,
  onClose,
  isSaving,
}: {
  initial: FormState;
  title: string;
  onSave: (data: CreateTemplateRequest) => void;
  onClose: () => void;
  isSaving: boolean;
}) {
  const [form, setForm] = useState<FormState>(initial);

  const handleSignerChange = (key: number, field: keyof TemplateSigner, value: string | number) =>
    setForm((f) => ({
      ...f,
      signers: f.signers.map((s) => (s.key === key ? { ...s, [field]: value } : s)),
    }));

  const handleSignerSelect = (key: number, contact: SignerContactResponse) =>
    setForm((f) => ({
      ...f,
      signers: f.signers.map((s) =>
        s.key === key
          ? { ...s, email: contact.email, name: contact.name, role: contact.role }
          : s,
      ),
    }));

  const addSigner = () =>
    setForm((f) => ({
      ...f,
      signers: [...f.signers, { ...EMPTY_SIGNER(), order: f.signers.length + 1 }],
    }));

  const removeSigner = (key: number) =>
    setForm((f) => ({ ...f, signers: f.signers.filter((s) => s.key !== key) }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      name: form.name.trim(),
      description: form.description.trim() || undefined,
      defaultTitle: form.defaultTitle.trim(),
      signers: form.signers.map(({ key: _k, ...rest }) => rest),
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 py-8 px-4">
      <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div className="flex items-center gap-2">
            <LayoutTemplate className="h-5 w-5 text-brand-600" />
            <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700 flex items-center gap-1">
                Template Name <span className="text-red-500">*</span>
                <InfoTooltip
                  content="A short internal label for this template. Only visible to you — signers never see this name."
                  side="right"
                />
              </label>
              <input
                required
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
                placeholder="e.g. NDA for New Hires"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700 flex items-center gap-1">
                Default Envelope Title <span className="text-red-500">*</span>
                <InfoTooltip
                  content="This title is pre-filled on the envelope whenever you use this template. It appears in signer emails as the document name."
                  side="left"
                />
              </label>
              <input
                required
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
                placeholder="e.g. Non-Disclosure Agreement 2026"
                value={form.defaultTitle}
                onChange={(e) => setForm((f) => ({ ...f, defaultTitle: e.target.value }))}
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700 flex items-center gap-1">
              Description
              <span className="text-gray-400 text-xs font-normal ml-1">(optional)</span>
              <InfoTooltip
                content="A brief note about when to use this template. Only visible to you."
                side="right"
              />
            </label>
            <textarea
              rows={2}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-brand-400"
              placeholder="Brief description of when to use this template"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
                <Users className="h-4 w-4 text-brand-600" />
                Signers
                <InfoTooltip
                  content="Define who needs to sign this document and in what order. These are pre-filled when you create an envelope from this template — you can still edit them before sending."
                  side="right"
                />
              </label>
              <Badge className="text-xs border border-gray-200 bg-white text-gray-600">{form.signers.length} defined</Badge>
            </div>

            <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
              {form.signers.map((s, i) => (
                <SignerRowInput
                  key={s.key}
                  signer={s}
                  index={i}
                  onChange={handleSignerChange}
                  onSelect={handleSignerSelect}
                  onRemove={removeSigner}
                  canRemove={form.signers.length > 1}
                />
              ))}
            </div>

            <button
              type="button"
              onClick={addSigner}
              className="flex items-center gap-1.5 text-sm text-brand-600 hover:text-brand-800 font-medium transition-colors"
            >
              <UserPlus className="h-4 w-4" /> Add another signer
            </button>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button type="button" variant="ghost" onClick={onClose} disabled={isSaving}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving} className="min-w-[120px]">
              {isSaving ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Saving…
                </span>
              ) : 'Save Template'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Template card ─────────────────────────────────────────────────────────────

function TemplateCard({
  template,
  onEdit,
  onDelete,
}: {
  template: TemplateResponse;
  onEdit: (t: TemplateResponse) => void;
  onDelete: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <Card className="group hover:shadow-md transition-all duration-200 border-gray-200 hover:border-brand-200">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
              <LayoutTemplate className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <CardTitle className="text-base leading-tight truncate">{template.name}</CardTitle>
              {template.description && (
                <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{template.description}</p>
              )}
            </div>
          </div>
          <div className="flex gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => onEdit(template)}
              className="p-1.5 rounded-lg hover:bg-brand-50 text-gray-400 hover:text-brand-600 transition-colors"
              title="Edit template"
            >
              <Pencil className="h-4 w-4" />
            </button>
            <button
              onClick={() => onDelete(template.id)}
              className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors"
              title="Delete template"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3 pt-0">
        <div className="flex items-center gap-2 rounded-lg bg-gray-50 px-3 py-2">
          <FileText className="h-3.5 w-3.5 text-gray-400 shrink-0" />
          <span className="text-xs text-gray-500">Default title:</span>
          <span className="text-xs font-medium text-gray-800 truncate">{template.defaultTitle}</span>
        </div>

        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="flex w-full items-center justify-between text-xs text-gray-500 hover:text-gray-700 transition-colors group/btn"
        >
          <span className="flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5" />
            <span className="font-medium">{template.signers.length} signer{template.signers.length !== 1 ? 's' : ''}</span>
            <span className="text-gray-400">— click to {expanded ? 'hide' : 'view'}</span>
          </span>
          {expanded
            ? <ChevronUp className="h-3.5 w-3.5" />
            : <ChevronDown className="h-3.5 w-3.5" />}
        </button>

        {expanded && (
          <div className="space-y-1.5 pt-1 border-t border-gray-100">
            {template.signers
              .sort((a, b) => a.order - b.order)
              .map((s, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gray-100 text-xs font-semibold text-gray-600">
                    {s.order}
                  </span>
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium shrink-0 ${ROLE_COLORS[s.role] ?? 'bg-gray-100 text-gray-700'}`}>
                    {s.role}
                  </span>
                  <span className="text-sm font-medium text-gray-800 truncate">
                    {s.name || <span className="text-gray-400 italic">unnamed</span>}
                  </span>
                  {s.email && (
                    <span className="text-xs text-gray-400 truncate hidden sm:block">{s.email}</span>
                  )}
                </div>
              ))}
          </div>
        )}

        <div className="flex items-center justify-between pt-1 border-t border-gray-50">
          <span className="flex items-center gap-1 text-xs text-gray-400">
            <Clock className="h-3 w-3" />
            {new Date(template.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </span>
          <button
            onClick={() => onEdit(template)}
            className="flex items-center gap-1 text-xs text-brand-600 hover:text-brand-800 font-medium transition-colors opacity-0 group-hover:opacity-100"
          >
            Edit <ArrowRight className="h-3 w-3" />
          </button>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────────

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="rounded-2xl border-2 border-dashed border-gray-200 bg-white py-16 flex flex-col items-center gap-4 text-center px-6">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-50">
        <LayoutTemplate className="h-8 w-8 text-brand-400" />
      </div>
      <div>
        <p className="text-lg font-semibold text-gray-800">No templates yet</p>
        <p className="text-sm text-gray-500 mt-1 max-w-sm">
          Create your first template to save time when sending documents. Define signers once, reuse forever.
        </p>
      </div>
      <Button onClick={onCreate} className="mt-2">
        <Plus className="h-4 w-4 mr-1.5" /> Create your first template
      </Button>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function TemplatesPage() {
  const qc = useQueryClient();
  const [showInfo, setShowInfo]   = useState(true);
  const [modalMode, setModalMode] = useState<'none' | 'create' | 'edit'>('none');
  const [editing, setEditing]     = useState<TemplateResponse | null>(null);

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['templates'],
    queryFn: () => templatesApi.list().then((r) => r.data),
  });

  const createMutation = useMutation({
    mutationFn: (data: CreateTemplateRequest) => templatesApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['templates'] });
      setModalMode('none');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: CreateTemplateRequest }) =>
      templatesApi.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['templates'] });
      setModalMode('none');
      setEditing(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => templatesApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['templates'] }),
  });

  const handleEdit = (t: TemplateResponse) => {
    setEditing(t);
    setModalMode('edit');
  };

  const handleDelete = (id: string) => {
    if (confirm('Delete this template? This cannot be undone.')) {
      deleteMutation.mutate(id);
    }
  };

  const handleClose = () => {
    setModalMode('none');
    setEditing(null);
  };

  const formInitial: FormState =
    modalMode === 'edit' && editing
      ? {
          name:         editing.name,
          description:  editing.description ?? '',
          defaultTitle: editing.defaultTitle,
          signers:      editing.signers.map((s) => ({ ...s, key: Math.random() })),
        }
      : EMPTY_FORM;

  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="animate-fade-in space-y-6 max-w-5xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <LayoutTemplate className="h-6 w-6 text-brand-600" />
            Document Templates
            <InfoTooltip
              content="Templates are reusable signing workflows. Define a set of signers and a default title once, then apply the template any time you send that type of document."
              side="right"
            />
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Save reusable envelope configurations to speed up your document workflows.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {!showInfo && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowInfo(true)}
              className="text-gray-500 gap-1.5"
            >
              <Info className="h-4 w-4" /> How it works
            </Button>
          )}
          <Button onClick={() => setModalMode('create')} className="flex items-center gap-2">
            <Plus className="h-4 w-4" /> New Template
          </Button>
        </div>
      </div>

      {showInfo && <HowItWorksBanner onDismiss={() => setShowInfo(false)} />}

      {templates.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          <div className="rounded-xl border border-gray-100 bg-white p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50">
              <LayoutTemplate className="h-5 w-5 text-brand-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Total Templates</p>
              <p className="text-2xl font-bold text-gray-900">{templates.length}</p>
            </div>
          </div>
          <div className="rounded-xl border border-gray-100 bg-white p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50">
              <Users className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Total Signers Defined</p>
              <p className="text-2xl font-bold text-gray-900">
                {templates.reduce((sum, t) => sum + t.signers.length, 0)}
              </p>
            </div>
          </div>
          <div className="rounded-xl border border-gray-100 bg-white p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-50">
              <FileText className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Avg Signers / Template</p>
              <p className="text-2xl font-bold text-gray-900">
                {templates.length > 0
                  ? (templates.reduce((sum, t) => sum + t.signers.length, 0) / templates.length).toFixed(1)
                  : '—'}
              </p>
            </div>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-20">
          <div className="h-9 w-9 animate-spin rounded-full border-4 border-brand-600 border-t-transparent" />
        </div>
      ) : templates.length === 0 ? (
        <EmptyState onCreate={() => setModalMode('create')} />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {templates.map((t) => (
            <TemplateCard key={t.id} template={t} onEdit={handleEdit} onDelete={handleDelete} />
          ))}
        </div>
      )}

      {modalMode !== 'none' && (
        <TemplateModal
          title={modalMode === 'create' ? 'New Template' : `Edit Template — ${editing?.name}`}
          initial={formInitial}
          onSave={(data) => {
            if (modalMode === 'edit' && editing) {
              updateMutation.mutate({ id: editing.id, data });
            } else {
              createMutation.mutate(data);
            }
          }}
          onClose={handleClose}
          isSaving={isSaving}
        />
      )}
    </div>
  );
}
