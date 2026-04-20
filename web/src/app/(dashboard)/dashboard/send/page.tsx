'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useForm, useFieldArray, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/providers/auth-provider';
import { useQuery } from '@tanstack/react-query';
import { merchantApi, envelopeApi, signerContactApi } from '@/lib/api';
import type { SignerContactResponse } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { Plus, Trash2, AlertTriangle, Upload, Download } from 'lucide-react';

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

// ── Email autocomplete input ──────────────────────────────────────────────────

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

  // Close dropdown on outside click
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

// ── Send page ─────────────────────────────────────────────────────────────────

export default function SendPage() {
  const router    = useRouter();
  const { user }  = useAuth();
  const [docs, setDocs] = useState<FileDoc[]>([]);

  const { data: merchants } = useQuery({
    queryKey: ['merchants', user?.id],
    queryFn: () => merchantApi.getByUser(user!.id).then((r) => r.data),
    enabled: !!user,
  });
  const merchant = merchants?.[0];

  const { register, control, handleSubmit, setValue, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      signers: [{ name: '', email: '', role: 'signer', order: 1, message: 'Please review and sign the document.' }],
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'signers' });

  // Watch signer values for the autocomplete component
  const signerValues = useWatch({ control, name: 'signers' });

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
    if (docs.length === 0) { toast.error('Please upload at least one document.'); return; }

    // Stop if usage limit reached
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
        (err as { response?: { data?: { message?: string; value?: string } } })?.response?.data
          ?.message ??
        (err as { response?: { data?: { message?: string; value?: string } } })?.response?.data
          ?.value ??
        'Failed to send envelope.';
      toast.error(msg);
    }
  };

  return (
    <div className="animate-fade-in space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Send Envelope</h1>
        <p className="mt-1 text-sm text-gray-500">Upload a document and define signers.</p>
      </div>

      {/* Signature placeholder instructions */}
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
        {/* Title */}
        <Card>
          <CardHeader><CardTitle className="text-base">Envelope Details</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <Label>Envelope Title</Label>
              <Input placeholder="e.g. Employment Contract – John Doe" {...register('title')} />
              {errors.title && <p className="text-xs text-red-500">{errors.title.message}</p>}
            </div>

            {/* File upload */}
            <div className="space-y-1">
              <Label>Documents (PDF or Word)</Label>
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
              {/* Temporary notice — remove once PDF format issue is resolved */}
              <div className="mt-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 flex gap-2.5 items-start">
                <AlertTriangle className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
                <p className="text-xs text-blue-700">
                  <span className="font-semibold">Notice:</span> We are currently experiencing an issue with certain PDF document formats. Our team is actively working on a fix and will update you soon. We apologize for any inconvenience.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Signers */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base">Signers</CardTitle>
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
              <div key={field.id} className="rounded-xl border border-gray-100 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-gray-700">Signer {index + 1}</p>
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
                    <Label>Role (must match placeholder)</Label>
                    <Input placeholder="signer" {...register(`signers.${index}.role`)} />
                  </div>
                  <div className="space-y-1">
                    <Label>Signing Order</Label>
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
          <Button type="submit" loading={isSubmitting}>Send Envelope</Button>
        </div>
      </form>
    </div>
  );
}
