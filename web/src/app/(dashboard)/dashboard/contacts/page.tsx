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
  Plus, Trash2, Pencil, Search, Upload, Download, X, Check
} from 'lucide-react';

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
}: {
  initial?: SignerContactResponse | null;
  onClose: () => void;
  onSave: (data: ContactForm) => void;
  loading: boolean;
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
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message ?? 'Failed to add contact.';
      toast.error(msg);
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
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message ?? 'Failed to update contact.';
      toast.error(msg);
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
      toast.success(
        `Import complete: ${r.imported} imported, ${r.skipped} skipped, ${r.failed} failed.`
      );
      queryClient.invalidateQueries({ queryKey: ['signer-contacts'] });
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
          <h1 className="text-2xl font-bold text-gray-900">Signer Contacts</h1>
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

          {/* Export */}
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="h-4 w-4 mr-1" /> Export CSV
          </Button>

          {/* Add */}
          <Button
            size="sm"
            onClick={() => { setEditTarget(null); setModalOpen(true); }}
          >
            <Plus className="h-4 w-4 mr-1" /> Add Contact
          </Button>
        </div>
      </div>

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
                            onClick={() => { setEditTarget(c); setModalOpen(true); }}
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
          onClose={() => { setModalOpen(false); setEditTarget(null); }}
          onSave={handleSave}
          loading={isSaving}
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
                variant="destructive"
                loading={deleteMutation.isPending}
                onClick={() => deleteMutation.mutate(deleteTarget.id)}
              >
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
