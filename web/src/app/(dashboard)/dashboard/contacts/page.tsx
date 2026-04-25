'use client';

import { useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { signerContactApi } from '@/lib/api';
import type { SignerContactResponse } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import {
  Plus, Trash2, Pencil, Search, Upload, Download, X, Check, Info, ChevronDown, ChevronUp
} from 'lucide-react';
import { InfoTooltip } from '@/components/ui/info-tooltip';

// ── Schemas ───────────────────────────────────────────────────────────────────

const contactSchema = z.object({
  name:    z.string().min(1, 'Name is required'),
  email:   z.string().email('Valid email required'),
  role:    z.string().min(1, 'Role is required'),
  phone:   z.string().optional(),
  company: z.string().optional(),
});
type ContactForm = z.infer<typeof contactSchema>;

// ── Modal ─────────────────────────────────────────────────────────────────────

function ContactModal({
  initial,
  onClose,
  onSave,
  loading,
  serverError,
}: {
  initial?: SignerContactResponse | null;
  onClose: () => void;
  onSave: (data: ContactForm) => void;
  loading: boolean;
  serverError?: string | null;
}) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ContactForm>({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      name:    initial?.name    ?? '',
      email:   initial?.email   ?? '',
      role:    initial?.role    ?? 'signer',
      phone:   initial?.phone   ?? '',
      company: initial?.company ?? '',
    },
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">
            {initial ? 'Edit Contact' : 'Add Contact'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSave)} className="space-y-3">
          <div className="space-y-1">
            <Label>Name *</Label>
            <Input placeholder="Jane Smith" {...register('name')} />
            {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
          </div>
          <div className="space-y-1">
            <Label>Email *</Label>
            <Input placeholder="jane@example.com" {...register('email')} />
            {errors.email && <p className="text-xs text-red-500">{errors.email.message}</p>}
            {serverError && <p className="text-xs text-red-500">{serverError}</p>}
          </div>
          <div className="space-y-1">
            <Label>Role</Label>
            <Input placeholder="signer" {...register('role')} />
            {errors.role && <p className="text-xs text-red-500">{errors.role.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Phone</Label>
              <Input placeholder="+1 555 0100" {...register('phone')} />
            </div>
            <div className="space-y-1">
              <Label>Company</Label>
              <Input placeholder="Acme Inc." {...register('company')} />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" loading={loading}>
              {initial ? 'Save Changes' : 'Add Contact'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function ContactsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<SignerContactResponse | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SignerContactResponse | null>(null);
  const [modalError, setModalError] = useState<string | null>(null);
  const [showCsvHelp, setShowCsvHelp] = useState(false);
  const [importResult, setImportResult] = useState<{ imported: number; skipped: number; failed: number; errors: string[] } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // ── Data ──────────────────────────────────────────────────────────────────

  const { data: contacts = [], isLoading } = useQuery({
    queryKey: ['signer-contacts'],
    queryFn: () => signerContactApi.list().then((r) => r.data),
  });

  const filtered = search.trim()
    ? contacts.filter(
        (c) =>
          c.name.toLowerCase().includes(search.toLowerCase()) ||
          c.email.toLowerCase().includes(search.toLowerCase())
      )
    : contacts;

  // ── Mutations ─────────────────────────────────────────────────────────────

  const createMutation = useMutation({
    mutationFn: (data: ContactForm) =>
      signerContactApi.create({
        name:    data.name,
        email:   data.email,
        role:    data.role,
        phone:   data.phone || undefined,
        company: data.company || undefined,
      }),
    onSuccess: () => {
      toast.success('Contact added.');
      queryClient.invalidateQueries({ queryKey: ['signer-contacts'] });
      setModalOpen(false);
      setModalError(null);
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message ?? 'Failed to add contact.';
      setModalError(msg);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: ContactForm }) =>
      signerContactApi.update(id, {
        name:     data.name,
        email:    data.email,
        role:     data.role,
        phone:    data.phone || null,
        company:  data.company || null,
        isActive: true,
      }),
    onSuccess: () => {
      toast.success('Contact updated.');
      queryClient.invalidateQueries({ queryKey: ['signer-contacts'] });
      setEditTarget(null);
      setModalError(null);
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message ?? 'Failed to update contact.';
      setModalError(msg);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => signerContactApi.delete(id),
    onSuccess: () => {
      toast.success('Contact removed.');
      queryClient.invalidateQueries({ queryKey: ['signer-contacts'] });
      setDeleteTarget(null);
    },
    onError: () => toast.error('Failed to delete contact.'),
  });

  const importMutation = useMutation({
    mutationFn: (file: File) => signerContactApi.importCsv(file),
    onSuccess: (res) => {
      const r = res.data;
      queryClient.invalidateQueries({ queryKey: ['signer-contacts'] });
      setImportResult(r);
    },
    onError: () => toast.error('Import failed. Check the CSV format.'),
  });

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleSave = (data: ContactForm) => {
    if (editTarget) {
      updateMutation.mutate({ id: editTarget.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleDownloadSample = () => {
    const csv = [
      'name,email,role,phone,company',
      'Jane Smith,jane.smith@example.com,signer,+1 555 0101,Acme Corp',
      'John Doe,john.doe@example.com,reviewer,,',
      'Alice Brown,alice.brown@example.com,approver,+44 20 7946 0958,Globex Ltd',
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = 'signer-contacts-sample.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExport = async () => {
    try {
      const res = await signerContactApi.exportCsv();
      const blob = new Blob([res.data as BlobPart], { type: 'text/csv' });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = 'signer-contacts.csv';
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error('Export failed.');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      importMutation.mutate(file);
      e.target.value = '';
    }
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            Signer Contacts
            <InfoTooltip content="Saved contacts let you auto-fill signer details when creating envelopes. Contacts are automatically created from signers on sent envelopes, or you can import them via CSV." side="right" />
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Manage your saved signers. Contacts are auto-created when you send envelopes.
          </p>
        </div>
        <div className="flex gap-2">
          {/* Import */}
          <input
            ref={fileRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={handleFileChange}
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => fileRef.current?.click()}
            loading={importMutation.isPending}
          >
            <Upload className="h-4 w-4 mr-1" /> Import CSV
          </Button>
          <button
            type="button"
            onClick={() => setShowCsvHelp((v) => !v)}
            className="flex items-center gap-1 text-xs text-brand-600 hover:text-brand-800 font-medium"
            title="CSV format guide"
          >
            <Info className="h-4 w-4" />
            {showCsvHelp ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </button>

          {/* Export */}
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="h-4 w-4 mr-1" /> Export CSV
          </Button>

          {/* Add */}
          <Button
            size="sm"
            onClick={() => { setEditTarget(null); setModalError(null); setModalOpen(true); }}
          >
            <Plus className="h-4 w-4 mr-1" /> Add Contact
          </Button>
        </div>
      </div>

      {/* CSV Format Guide */}
      {showCsvHelp && (
        <div className="rounded-xl border border-blue-100 bg-blue-50 p-4 space-y-3 text-sm">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2 font-semibold text-blue-800">
              <Info className="h-4 w-4 shrink-0" />
              CSV Import Format
            </div>
            <button onClick={() => setShowCsvHelp(false)} className="text-blue-400 hover:text-blue-600">
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Column table */}
          <div className="overflow-x-auto rounded-lg border border-blue-200 bg-white">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-blue-100 bg-blue-50 text-left">
                  <th className="px-3 py-2 font-medium text-blue-700">Column</th>
                  <th className="px-3 py-2 font-medium text-blue-700">Required</th>
                  <th className="px-3 py-2 font-medium text-blue-700">Default</th>
                  <th className="px-3 py-2 font-medium text-blue-700">Description</th>
                </tr>
              </thead>
              <tbody className="text-gray-700">
                <tr className="border-b border-gray-50">
                  <td className="px-3 py-2 font-mono font-semibold text-gray-900">name</td>
                  <td className="px-3 py-2"><span className="text-red-500 font-bold">Yes</span></td>
                  <td className="px-3 py-2 text-gray-400">—</td>
                  <td className="px-3 py-2">Full name of the signer</td>
                </tr>
                <tr className="border-b border-gray-50">
                  <td className="px-3 py-2 font-mono font-semibold text-gray-900">email</td>
                  <td className="px-3 py-2"><span className="text-red-500 font-bold">Yes</span></td>
                  <td className="px-3 py-2 text-gray-400">—</td>
                  <td className="px-3 py-2">Must be unique — duplicates are skipped automatically</td>
                </tr>
                <tr className="border-b border-gray-50">
                  <td className="px-3 py-2 font-mono text-gray-900">role</td>
                  <td className="px-3 py-2 text-gray-400">No</td>
                  <td className="px-3 py-2 font-mono text-gray-500">signer</td>
                  <td className="px-3 py-2">e.g. signer, reviewer, approver</td>
                </tr>
                <tr className="border-b border-gray-50">
                  <td className="px-3 py-2 font-mono text-gray-900">phone</td>
                  <td className="px-3 py-2 text-gray-400">No</td>
                  <td className="px-3 py-2 text-gray-400">—</td>
                  <td className="px-3 py-2">Phone number (any format)</td>
                </tr>
                <tr>
                  <td className="px-3 py-2 font-mono text-gray-900">company</td>
                  <td className="px-3 py-2 text-gray-400">No</td>
                  <td className="px-3 py-2 text-gray-400">—</td>
                  <td className="px-3 py-2">Company or organisation name</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Rules */}
          <ul className="list-disc list-inside text-blue-700 space-y-1 text-xs">
            <li>First row is treated as a header and skipped automatically.</li>
            <li>Columns must be comma-separated; quoted values are supported.</li>
            <li>Email must be unique per account — rows with a duplicate email are <strong>skipped</strong> (not errors).</li>
            <li>If a previously deleted contact&apos;s email is re-imported, the contact is restored.</li>
          </ul>

          {/* Sample CSV preview */}
          <div className="rounded-lg bg-gray-900 text-green-300 font-mono text-xs p-3 overflow-x-auto">
            <p className="text-gray-400 mb-1">{'// sample.csv'}</p>
            <p>name,email,role,phone,company</p>
            <p>Jane Smith,jane.smith@example.com,signer,+1 555 0101,Acme Corp</p>
            <p>John Doe,john.doe@example.com,reviewer,,</p>
            <p>Alice Brown,alice.brown@example.com,approver,+44 20 7946 0958,Globex Ltd</p>
          </div>

          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={handleDownloadSample}>
              <Download className="h-4 w-4 mr-1" /> Download sample.csv
            </Button>
            <Button
              size="sm"
              onClick={() => fileRef.current?.click()}
              loading={importMutation.isPending}
            >
              <Upload className="h-4 w-4 mr-1" /> Import CSV now
            </Button>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          className="pl-9"
          placeholder="Search by name or email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">
            {filtered.length} {filtered.length === 1 ? 'contact' : 'contacts'}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-sm text-gray-400">Loading…</div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center text-sm text-gray-400">
              {search ? 'No contacts match your search.' : 'No contacts yet. Add one or import a CSV.'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-left text-xs text-gray-500 uppercase tracking-wide">
                    <th className="px-4 py-3 font-medium">Name</th>
                    <th className="px-4 py-3 font-medium">Email</th>
                    <th className="px-4 py-3 font-medium">Role</th>
                    <th className="px-4 py-3 font-medium">Company</th>
                    <th className="px-4 py-3 font-medium">Phone</th>
                    <th className="px-4 py-3 font-medium w-20" />
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((c) => (
                    <tr key={c.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 font-medium text-gray-900">{c.name}</td>
                      <td className="px-4 py-3 text-gray-600">{c.email}</td>
                      <td className="px-4 py-3">
                        <span className="rounded-full bg-brand-50 text-brand-700 px-2 py-0.5 text-xs font-medium">
                          {c.role}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-500">{c.company ?? '—'}</td>
                      <td className="px-4 py-3 text-gray-500">{c.phone ?? '—'}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2 justify-end">
                          <button
                            onClick={() => { setEditTarget(c); setModalError(null); setModalOpen(true); }}
                            className="text-gray-400 hover:text-brand-600 transition-colors"
                            title="Edit"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => setDeleteTarget(c)}
                            className="text-gray-400 hover:text-red-500 transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add / Edit modal */}
      {modalOpen && (
        <ContactModal
          initial={editTarget}
          onClose={() => { setModalOpen(false); setEditTarget(null); setModalError(null); }}
          onSave={handleSave}
          loading={isSaving}
          serverError={modalError}
        />
      )}

      {/* Delete confirm */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">Delete Contact?</h2>
            <p className="text-sm text-gray-500">
              Remove <strong>{deleteTarget.name}</strong> ({deleteTarget.email}) from your contacts?
              This cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setDeleteTarget(null)}>
                Cancel
              </Button>
              <Button
                variant="danger"
                loading={deleteMutation.isPending}
                onClick={() => deleteMutation.mutate(deleteTarget.id)}
              >
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Import Result */}
      {importResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Import Complete</h2>
              <button onClick={() => setImportResult(null)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Summary badges */}
            <div className="flex gap-3">
              <div className="flex-1 rounded-lg bg-green-50 border border-green-100 p-3 text-center">
                <p className="text-2xl font-bold text-green-600">{importResult.imported}</p>
                <p className="text-xs text-green-700 mt-0.5">Imported</p>
              </div>
              <div className="flex-1 rounded-lg bg-yellow-50 border border-yellow-100 p-3 text-center">
                <p className="text-2xl font-bold text-yellow-600">{importResult.skipped}</p>
                <p className="text-xs text-yellow-700 mt-0.5">Skipped (duplicate)</p>
              </div>
              <div className="flex-1 rounded-lg bg-red-50 border border-red-100 p-3 text-center">
                <p className="text-2xl font-bold text-red-600">{importResult.failed}</p>
                <p className="text-xs text-red-700 mt-0.5">Failed</p>
              </div>
            </div>

            {/* Row-level errors */}
            {importResult.errors.length > 0 && (
              <div className="rounded-lg border border-red-100 bg-red-50 p-3 space-y-1 max-h-48 overflow-y-auto">
                <p className="text-xs font-semibold text-red-700 mb-1">Row errors:</p>
                {importResult.errors.map((err, i) => (
                  <p key={i} className="text-xs text-red-600 flex gap-1">
                    <span className="shrink-0">•</span> {err}
                  </p>
                ))}
              </div>
            )}

            {importResult.skipped > 0 && (
              <p className="text-xs text-yellow-700 bg-yellow-50 border border-yellow-100 rounded-lg px-3 py-2">
                <strong>{importResult.skipped}</strong> row{importResult.skipped !== 1 ? 's were' : ' was'} skipped because the email already exists in your contacts.
              </p>
            )}

            <Button className="w-full" onClick={() => setImportResult(null)}>
              <Check className="h-4 w-4 mr-1" /> Done
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
