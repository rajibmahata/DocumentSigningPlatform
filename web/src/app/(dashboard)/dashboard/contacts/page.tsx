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
  Plus, Trash2, Pencil, Search, Upload, Download, X, Check, Info, ChevronDown, ChevronUp,
  Users, UserRound, FolderOpen, Tag,
} from 'lucide-react';
import { InfoTooltip } from '@/components/ui/info-tooltip';
import { useContactGroupStore, type ContactGroup } from '@/store/contactGroupStore';

// ── Schemas ───────────────────────────────────────────────────────────────────

const contactSchema = z.object({
  name:    z.string().min(1, 'Name is required'),
  email:   z.string().email('Valid email required'),
  role:    z.string().min(1, 'Role is required'),
  phone:   z.string().optional(),
  company: z.string().optional(),
});
type ContactForm = z.infer<typeof contactSchema>;

const groupSchema = z.object({
  name:        z.string().min(1, 'Group name is required'),
  description: z.string().optional(),
  emoji:       z.string().min(1),
  tags:        z.string().optional(),
});
type GroupForm = z.infer<typeof groupSchema>;

// ── Helpers ───────────────────────────────────────────────────────────────────

const AVATAR_COLORS = [
  'bg-blue-100 text-blue-700',
  'bg-green-100 text-green-700',
  'bg-purple-100 text-purple-700',
  'bg-amber-100 text-amber-700',
  'bg-teal-100 text-teal-700',
  'bg-rose-100 text-rose-700',
];
function avatarColor(str: string) {
  let n = 0;
  for (let i = 0; i < str.length; i++) n += str.charCodeAt(i);
  return AVATAR_COLORS[n % AVATAR_COLORS.length];
}
function initials(name: string) {
  return name.split(' ').slice(0, 2).map((p) => p[0]?.toUpperCase() ?? '').join('');
}

const GROUP_COLORS: { label: string; value: string }[] = [
  { label: 'Indigo', value: 'bg-indigo-100 text-indigo-700' },
  { label: 'Blue',   value: 'bg-blue-100 text-blue-700'    },
  { label: 'Green',  value: 'bg-green-100 text-green-700'  },
  { label: 'Amber',  value: 'bg-amber-100 text-amber-700'  },
  { label: 'Teal',   value: 'bg-teal-100 text-teal-700'    },
  { label: 'Rose',   value: 'bg-rose-100 text-rose-700'    },
  { label: 'Purple', value: 'bg-purple-100 text-purple-700'},
  { label: 'Slate',  value: 'bg-slate-100 text-slate-700'  },
];
const EMOJI_OPTIONS = ['⚖️','🧑‍💼','💰','🏆','🤝','📋','🏥','🏗️','🎓','🛡️','🔬','🌍'];

// ── Contact Modal ─────────────────────────────────────────────────────────────

function ContactModal({
  initial, onClose, onSave, loading, serverError,
}: {
  initial?: SignerContactResponse | null;
  onClose: () => void;
  onSave: (data: ContactForm) => void;
  loading: boolean;
  serverError?: string | null;
}) {
  const { register, handleSubmit, formState: { errors } } = useForm<ContactForm>({
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
          <h2 className="text-lg font-semibold">{initial ? 'Edit Contact' : 'Add Contact'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
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
            <div className="space-y-1"><Label>Phone</Label><Input placeholder="+1 555 0100" {...register('phone')} /></div>
            <div className="space-y-1"><Label>Company</Label><Input placeholder="Acme Inc." {...register('company')} /></div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" loading={loading}>{initial ? 'Save Changes' : 'Add Contact'}</Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Group Modal ───────────────────────────────────────────────────────────────

function GroupModal({
  initial, contacts, onClose, onSave,
}: {
  initial?: ContactGroup | null;
  contacts: SignerContactResponse[];
  onClose: () => void;
  onSave: (data: GroupForm, color: string, contactIds: string[]) => void;
}) {
  const [color, setColor]               = useState(initial?.color ?? GROUP_COLORS[0].value);
  const [selectedIds, setSelectedIds]   = useState<string[]>(initial?.contactIds ?? []);
  const [memberSearch, setMemberSearch] = useState('');

  const { register, handleSubmit, formState: { errors }, watch, setValue } = useForm<GroupForm>({
    resolver: zodResolver(groupSchema),
    defaultValues: {
      name:        initial?.name        ?? '',
      description: initial?.description ?? '',
      emoji:       initial?.emoji       ?? '⚖️',
      tags:        initial?.tags?.join(', ') ?? '',
    },
  });

  const currentEmoji = watch('emoji');

  const filteredContacts = contacts.filter(
    (c) => c.isActive && (memberSearch === '' ||
      c.name.toLowerCase().includes(memberSearch.toLowerCase()) ||
      c.email.toLowerCase().includes(memberSearch.toLowerCase())),
  );

  const toggle = (id: string) =>
    setSelectedIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">{initial ? 'Edit Group' : 'New Group'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
        </div>
        <form onSubmit={handleSubmit((data) => onSave(data, color, selectedIds))} className="flex flex-col gap-4 overflow-hidden">
          <div className="grid grid-cols-[auto_1fr] gap-3 items-start">
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-600">Icon</label>
              <div className="grid grid-cols-4 gap-1 w-28">
                {EMOJI_OPTIONS.map((e) => (
                  <button key={e} type="button" onClick={() => setValue('emoji', e)}
                    className={`text-lg p-1 rounded-lg transition-all ${currentEmoji === e ? 'bg-blue-100 ring-2 ring-blue-400 scale-110' : 'hover:bg-gray-100'}`}>
                    {e}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-3">
              <div className="space-y-1">
                <Label>Group Name *</Label>
                <Input placeholder="Legal Team" {...register('name')} />
                {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
              </div>
              <div className="space-y-1">
                <Label>Description</Label>
                <Input placeholder="Short description…" {...register('description')} />
              </div>
              <div className="space-y-1">
                <Label>Tags <span className="text-gray-400 font-normal">(comma-separated, for AI suggestions)</span></Label>
                <Input placeholder="legal, compliance, nda" {...register('tags')} />
              </div>
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-600">Color</label>
            <div className="flex gap-2 flex-wrap">
              {GROUP_COLORS.map((c) => (
                <button key={c.value} type="button" onClick={() => setColor(c.value)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${c.value} ${color === c.value ? 'ring-2 ring-offset-1 ring-blue-500 scale-105' : 'opacity-70 hover:opacity-100'}`}>
                  {c.label}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-2 flex-1 overflow-hidden flex flex-col">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-gray-600">Members</label>
              <span className="text-xs text-gray-400">{selectedIds.length} selected</span>
            </div>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
              <input type="text" value={memberSearch} onChange={(e) => setMemberSearch(e.target.value)}
                placeholder="Search contacts…"
                className="w-full pl-8 pr-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            {contacts.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-4">No contacts yet. Add contacts first.</p>
            ) : (
              <div className="border border-gray-100 rounded-xl overflow-y-auto flex-1 min-h-0 max-h-48">
                {filteredContacts.map((c) => (
                  <label key={c.id} className="flex items-center gap-3 px-3 py-2 hover:bg-gray-50 cursor-pointer border-b border-gray-50 last:border-0">
                    <input type="checkbox" checked={selectedIds.includes(c.id)} onChange={() => toggle(c.id)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                    <span className={`h-6 w-6 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 ${avatarColor(c.name)}`}>
                      {initials(c.name)}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-gray-800 truncate">{c.name}</p>
                      <p className="text-xs text-gray-400 truncate">{c.email}</p>
                    </div>
                    <span className="text-xs text-gray-300 capitalize shrink-0">{c.role}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit">{initial ? 'Save Changes' : 'Create Group'}</Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Groups Panel ──────────────────────────────────────────────────────────────

function GroupsPanel({ contacts }: { contacts: SignerContactResponse[] }) {
  const groups                 = useContactGroupStore((s) => s.groups);
  const addGroup               = useContactGroupStore((s) => s.addGroup);
  const updateGroup            = useContactGroupStore((s) => s.updateGroup);
  const deleteGroup            = useContactGroupStore((s) => s.deleteGroup);
  const addContactToGroup      = useContactGroupStore((s) => s.addContactToGroup);
  const removeContactFromGroup = useContactGroupStore((s) => s.removeContactFromGroup);

  const [modalOpen, setModalOpen]           = useState(false);
  const [editTarget, setEditTarget]         = useState<ContactGroup | null>(null);
  const [expandedId, setExpandedId]         = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget]     = useState<ContactGroup | null>(null);
  const [addMembersTarget, setAddMembersTarget] = useState<string | null>(null);
  const [memberSearch, setMemberSearch]     = useState('');

  const handleSave = (data: GroupForm, color: string, contactIds: string[]) => {
    const tags = data.tags ? data.tags.split(',').map((t) => t.trim()).filter(Boolean) : [];
    if (editTarget) {
      updateGroup(editTarget.id, { name: data.name, description: data.description ?? '', emoji: data.emoji, color, tags, contactIds });
      toast.success('Group updated.');
    } else {
      addGroup({ name: data.name, description: data.description ?? '', emoji: data.emoji, color, tags, contactIds });
      toast.success('Group created.');
    }
    setModalOpen(false);
    setEditTarget(null);
  };

  const expandedGroup   = groups.find((g) => g.id === expandedId);
  const expandedMembers = expandedGroup ? contacts.filter((c) => expandedGroup.contactIds.includes(c.id)) : [];
  const addMembersGroup = groups.find((g) => g.id === addMembersTarget);
  const nonMembers = addMembersGroup
    ? contacts.filter((c) => c.isActive && !addMembersGroup.contactIds.includes(c.id) &&
        (memberSearch === '' || c.name.toLowerCase().includes(memberSearch.toLowerCase()) || c.email.toLowerCase().includes(memberSearch.toLowerCase())))
    : [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
            <Users className="h-4 w-4 text-brand-600" /> Contact Groups
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Organise contacts into named groups. Link groups to workflow email nodes to reach everyone at once.
          </p>
        </div>
        <Button size="sm" onClick={() => { setEditTarget(null); setModalOpen(true); }}>
          <Plus className="h-4 w-4 mr-1" /> New Group
        </Button>
      </div>

      {groups.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-gray-200 p-12 text-center">
          <FolderOpen className="h-8 w-8 text-gray-300 mx-auto mb-3" />
          <p className="text-sm font-medium text-gray-400">No groups yet</p>
          <p className="text-xs text-gray-300 mt-1 mb-4">Create a group and add contacts to it.</p>
          <Button size="sm" onClick={() => setModalOpen(true)}><Plus className="h-4 w-4 mr-1" /> Create First Group</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {groups.map((g) => {
            const isExpanded = expandedId === g.id;
            return (
              <div key={g.id} className={`rounded-2xl border transition-all ${isExpanded ? 'border-blue-200 bg-blue-50/30' : 'border-gray-100 bg-white hover:border-gray-200'}`}>
                <div className="flex items-center gap-3 p-4 cursor-pointer" onClick={() => setExpandedId(isExpanded ? null : g.id)}>
                  <span className="text-2xl">{g.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-900">{g.name}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${g.color}`}>
                        {g.contactIds.length} member{g.contactIds.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                    {g.description && <p className="text-xs text-gray-500 mt-0.5 truncate">{g.description}</p>}
                    {g.tags.length > 0 && (
                      <div className="flex gap-1 mt-1 flex-wrap">
                        {g.tags.map((t) => (
                          <span key={t} className="inline-flex items-center gap-0.5 text-xs bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-full">
                            <Tag className="h-2.5 w-2.5" />{t}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={(e) => { e.stopPropagation(); setEditTarget(g); setModalOpen(true); }}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors" title="Edit group">
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); setDeleteTarget(g); }}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors" title="Delete group">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                    <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                  </div>
                </div>

                {isExpanded && (
                  <div className="border-t border-blue-100 px-4 py-3 space-y-3">
                    {expandedMembers.length === 0 ? (
                      <p className="text-xs text-gray-400 text-center py-2">No members yet.</p>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {expandedMembers.map((c) => (
                          <span key={c.id} className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${avatarColor(c.name)}`}>
                            <span className="font-semibold">{initials(c.name)}</span>
                            <span>{c.name}</span>
                            <button type="button" onClick={() => { removeContactFromGroup(g.id, c.id); toast.success(`${c.name} removed`); }}
                              className="ml-0.5 opacity-50 hover:opacity-100">×</button>
                          </span>
                        ))}
                      </div>
                    )}
                    {addMembersTarget === g.id ? (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-gray-600">Add contacts</span>
                          <button type="button" onClick={() => { setAddMembersTarget(null); setMemberSearch(''); }} className="text-xs text-gray-400 hover:text-gray-600">Done</button>
                        </div>
                        <div className="relative">
                          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-gray-400" />
                          <input type="text" value={memberSearch} onChange={(e) => setMemberSearch(e.target.value)} placeholder="Search contacts…"
                            className="w-full pl-7 pr-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                        </div>
                        <div className="max-h-36 overflow-y-auto rounded-xl border border-gray-100 bg-white">
                          {nonMembers.length === 0 ? (
                            <p className="text-xs text-gray-400 text-center py-3">All contacts are already members.</p>
                          ) : nonMembers.map((c) => (
                            <button key={c.id} type="button"
                              onClick={() => { addContactToGroup(g.id, c.id); toast.success(`${c.name} added`); }}
                              className="w-full flex items-center gap-2 px-3 py-2 hover:bg-blue-50 text-left border-b border-gray-50 last:border-0">
                              <span className={`h-5 w-5 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 ${avatarColor(c.name)}`}>{initials(c.name)}</span>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-medium text-gray-800 truncate">{c.name}</p>
                                <p className="text-xs text-gray-400 truncate">{c.email}</p>
                              </div>
                              <Plus className="h-3.5 w-3.5 text-blue-400 shrink-0" />
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <button type="button" onClick={() => { setAddMembersTarget(g.id); setMemberSearch(''); }}
                        className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1">
                        <Plus className="h-3.5 w-3.5" /> Add members
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {modalOpen && (
        <GroupModal initial={editTarget} contacts={contacts}
          onClose={() => { setModalOpen(false); setEditTarget(null); }}
          onSave={handleSave} />
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">Delete Group?</h2>
            <p className="text-sm text-gray-500">
              Remove <strong>{deleteTarget.name}</strong>? Individual contacts are not deleted.
            </p>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
              <Button variant="danger" onClick={() => { deleteGroup(deleteTarget.id); setDeleteTarget(null); toast.success('Group deleted.'); }}>Delete</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function ContactsPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab]       = useState<'contacts' | 'groups'>('contacts');
  const [search, setSearch]             = useState('');
  const [modalOpen, setModalOpen]       = useState(false);
  const [editTarget, setEditTarget]     = useState<SignerContactResponse | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SignerContactResponse | null>(null);
  const [modalError, setModalError]     = useState<string | null>(null);
  const [showCsvHelp, setShowCsvHelp]   = useState(false);
  const [importResult, setImportResult] = useState<{ imported: number; skipped: number; failed: number; errors: string[] } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const { data: contacts = [], isLoading } = useQuery({
    queryKey: ['signer-contacts'],
    queryFn: () => signerContactApi.list().then((r) => r.data),
  });

  const groups             = useContactGroupStore((s) => s.groups);
  const getGroupsForContact = useContactGroupStore((s) => s.getGroupsForContact);

  const filtered = search.trim()
    ? contacts.filter((c) => c.name.toLowerCase().includes(search.toLowerCase()) || c.email.toLowerCase().includes(search.toLowerCase()))
    : contacts;

  const createMutation = useMutation({
    mutationFn: (data: ContactForm) => signerContactApi.create({ name: data.name, email: data.email, role: data.role, phone: data.phone || undefined, company: data.company || undefined }),
    onSuccess: () => { toast.success('Contact added.'); queryClient.invalidateQueries({ queryKey: ['signer-contacts'] }); setModalOpen(false); setModalError(null); },
    onError: (err: { response?: { data?: { message?: string } } }) => setModalError(err?.response?.data?.message ?? 'Failed to add contact.'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: ContactForm }) =>
      signerContactApi.update(id, { name: data.name, email: data.email, role: data.role, phone: data.phone || null, company: data.company || null, isActive: true }),
    onSuccess: () => { toast.success('Contact updated.'); queryClient.invalidateQueries({ queryKey: ['signer-contacts'] }); setEditTarget(null); setModalError(null); },
    onError: (err: { response?: { data?: { message?: string } } }) => setModalError(err?.response?.data?.message ?? 'Failed to update contact.'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => signerContactApi.delete(id),
    onSuccess: () => { toast.success('Contact removed.'); queryClient.invalidateQueries({ queryKey: ['signer-contacts'] }); setDeleteTarget(null); },
    onError: () => toast.error('Failed to delete contact.'),
  });

  const importMutation = useMutation({
    mutationFn: (file: File) => signerContactApi.importCsv(file),
    onSuccess: (res) => { queryClient.invalidateQueries({ queryKey: ['signer-contacts'] }); setImportResult(res.data); },
    onError: () => toast.error('Import failed. Check the CSV format.'),
  });

  const handleSave = (data: ContactForm) => {
    if (editTarget) updateMutation.mutate({ id: editTarget.id, data });
    else createMutation.mutate(data);
  };

  const handleDownloadSample = () => {
    const csv = ['name,email,role,phone,company','Jane Smith,jane.smith@example.com,signer,+1 555 0101,Acme Corp','John Doe,john.doe@example.com,reviewer,,'].join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    Object.assign(document.createElement('a'), { href: url, download: 'signer-contacts-sample.csv' }).click();
    URL.revokeObjectURL(url);
  };

  const handleExport = async () => {
    try {
      const res = await signerContactApi.exportCsv();
      const url = URL.createObjectURL(new Blob([res.data as BlobPart], { type: 'text/csv' }));
      Object.assign(document.createElement('a'), { href: url, download: 'signer-contacts.csv' }).click();
      URL.revokeObjectURL(url);
    } catch { toast.error('Export failed.'); }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) { importMutation.mutate(file); e.target.value = ''; }
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Page title */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            Contacts &amp; Groups
            <InfoTooltip content="Saved contacts let you auto-fill signer details. Groups let you link a whole team to a workflow email node in one click." side="right" />
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {contacts.length} contact{contacts.length !== 1 ? 's' : ''} · {groups.length} group{groups.length !== 1 ? 's' : ''}
          </p>
        </div>
        {activeTab === 'contacts' && (
          <div className="flex gap-2">
            <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleFileChange} />
            <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()} loading={importMutation.isPending}>
              <Upload className="h-4 w-4 mr-1" /> Import CSV
            </Button>
            <button type="button" onClick={() => setShowCsvHelp((v) => !v)}
              className="flex items-center gap-1 text-xs text-brand-600 hover:text-brand-800 font-medium">
              <Info className="h-4 w-4" />
              {showCsvHelp ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </button>
            <Button variant="outline" size="sm" onClick={handleExport}>
              <Download className="h-4 w-4 mr-1" /> Export CSV
            </Button>
            <Button size="sm" onClick={() => { setEditTarget(null); setModalError(null); setModalOpen(true); }}>
              <Plus className="h-4 w-4 mr-1" /> Add Contact
            </Button>
          </div>
        )}
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
        {(['contacts', 'groups'] as const).map((tab) => (
          <button key={tab} type="button" onClick={() => setActiveTab(tab)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === tab ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>
            {tab === 'contacts' ? <UserRound className="h-4 w-4" /> : <Users className="h-4 w-4" />}
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
            <span className={`text-xs px-1.5 py-0.5 rounded-full ${activeTab === tab ? 'bg-brand-100 text-brand-700' : 'bg-gray-200 text-gray-500'}`}>
              {tab === 'contacts' ? contacts.length : groups.length}
            </span>
          </button>
        ))}
      </div>

      {/* ── Contacts tab ─── */}
      {activeTab === 'contacts' && (
        <>
          {showCsvHelp && (
            <div className="rounded-xl border border-blue-100 bg-blue-50 p-4 space-y-3 text-sm">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2 font-semibold text-blue-800"><Info className="h-4 w-4 shrink-0" />CSV Import Format</div>
                <button onClick={() => setShowCsvHelp(false)} className="text-blue-400 hover:text-blue-600"><X className="h-4 w-4" /></button>
              </div>
              <div className="overflow-x-auto rounded-lg border border-blue-200 bg-white">
                <table className="w-full text-xs">
                  <thead><tr className="border-b border-blue-100 bg-blue-50 text-left">
                    <th className="px-3 py-2 font-medium text-blue-700">Column</th>
                    <th className="px-3 py-2 font-medium text-blue-700">Required</th>
                    <th className="px-3 py-2 font-medium text-blue-700">Default</th>
                    <th className="px-3 py-2 font-medium text-blue-700">Description</th>
                  </tr></thead>
                  <tbody className="text-gray-700">
                    {[['name','Yes','—','Full name'],['email','Yes','—','Must be unique'],['role','No','signer','e.g. signer, approver'],['phone','No','—','Any format'],['company','No','—','Organisation']].map(([col,req,def,desc]) => (
                      <tr key={col} className="border-b border-gray-50">
                        <td className="px-3 py-2 font-mono font-semibold text-gray-900">{col}</td>
                        <td className="px-3 py-2">{req === 'Yes' ? <span className="text-red-500 font-bold">Yes</span> : <span className="text-gray-400">No</span>}</td>
                        <td className="px-3 py-2 font-mono text-gray-500">{def}</td>
                        <td className="px-3 py-2">{desc}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="rounded-lg bg-gray-900 text-green-300 font-mono text-xs p-3">
                <p className="text-gray-400 mb-1">// sample.csv</p>
                <p>name,email,role,phone,company</p>
                <p>Jane Smith,jane.smith@example.com,signer,+1 555 0101,Acme Corp</p>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={handleDownloadSample}><Download className="h-4 w-4 mr-1" /> Download sample.csv</Button>
                <Button size="sm" onClick={() => fileRef.current?.click()} loading={importMutation.isPending}><Upload className="h-4 w-4 mr-1" /> Import CSV now</Button>
              </div>
            </div>
          )}

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input className="pl-9" placeholder="Search by name or email…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{filtered.length} {filtered.length === 1 ? 'contact' : 'contacts'}</CardTitle>
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
                        <th className="px-4 py-3 font-medium">Groups</th>
                        <th className="px-4 py-3 font-medium w-20" />
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((c) => {
                        const cGroups = getGroupsForContact(c.id);
                        return (
                          <tr key={c.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <span className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 ${avatarColor(c.name)}`}>{initials(c.name)}</span>
                                <span className="font-medium text-gray-900">{c.name}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-gray-600">{c.email}</td>
                            <td className="px-4 py-3"><span className="rounded-full bg-brand-50 text-brand-700 px-2 py-0.5 text-xs font-medium">{c.role}</span></td>
                            <td className="px-4 py-3 text-gray-500">{c.company ?? '—'}</td>
                            <td className="px-4 py-3">
                              {cGroups.length === 0 ? <span className="text-gray-300 text-xs">—</span> : (
                                <div className="flex gap-1 flex-wrap">
                                  {cGroups.slice(0, 2).map((g) => (
                                    <span key={g.id} className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${g.color}`}>{g.emoji} {g.name}</span>
                                  ))}
                                  {cGroups.length > 2 && <span className="text-xs text-gray-400">+{cGroups.length - 2}</span>}
                                </div>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2 justify-end">
                                <button onClick={() => { setEditTarget(c); setModalError(null); setModalOpen(true); }} className="text-gray-400 hover:text-brand-600 transition-colors" title="Edit"><Pencil className="h-4 w-4" /></button>
                                <button onClick={() => setDeleteTarget(c)} className="text-gray-400 hover:text-red-500 transition-colors" title="Delete"><Trash2 className="h-4 w-4" /></button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* ── Groups tab ─── */}
      {activeTab === 'groups' && <GroupsPanel contacts={contacts} />}

      {/* Modals */}
      {modalOpen && (
        <ContactModal initial={editTarget}
          onClose={() => { setModalOpen(false); setEditTarget(null); setModalError(null); }}
          onSave={handleSave} loading={isSaving} serverError={modalError} />
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">Delete Contact?</h2>
            <p className="text-sm text-gray-500">Remove <strong>{deleteTarget.name}</strong> ({deleteTarget.email})? This cannot be undone.</p>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
              <Button variant="danger" loading={deleteMutation.isPending} onClick={() => deleteMutation.mutate(deleteTarget.id)}>Delete</Button>
            </div>
          </div>
        </div>
      )}

      {importResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Import Complete</h2>
              <button onClick={() => setImportResult(null)} className="text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
            </div>
            <div className="flex gap-3">
              <div className="flex-1 rounded-lg bg-green-50 border border-green-100 p-3 text-center"><p className="text-2xl font-bold text-green-600">{importResult.imported}</p><p className="text-xs text-green-700 mt-0.5">Imported</p></div>
              <div className="flex-1 rounded-lg bg-yellow-50 border border-yellow-100 p-3 text-center"><p className="text-2xl font-bold text-yellow-600">{importResult.skipped}</p><p className="text-xs text-yellow-700 mt-0.5">Skipped</p></div>
              <div className="flex-1 rounded-lg bg-red-50 border border-red-100 p-3 text-center"><p className="text-2xl font-bold text-red-600">{importResult.failed}</p><p className="text-xs text-red-700 mt-0.5">Failed</p></div>
            </div>
            {importResult.errors.length > 0 && (
              <div className="rounded-lg border border-red-100 bg-red-50 p-3 space-y-1 max-h-48 overflow-y-auto">
                {importResult.errors.map((err, i) => <p key={i} className="text-xs text-red-600">• {err}</p>)}
              </div>
            )}
            <Button className="w-full" onClick={() => setImportResult(null)}><Check className="h-4 w-4 mr-1" /> Done</Button>
          </div>
        </div>
      )}
    </div>
  );
}
