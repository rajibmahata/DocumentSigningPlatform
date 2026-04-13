'use client';

import { useEffect, useState } from 'react';
import { merchantApi, userApi } from '@/lib/api';
import { useAuth } from '@/providers/auth-provider';
import type { MerchantResponse, UserResponse, UpdateMerchantRequest, CreateMerchantRequest } from '@/types';
import { CheckCircle, XCircle, Eye, EyeOff, Pencil, Plus, RefreshCw, X } from 'lucide-react';

type CreateForm = { userId: string; name: string; description: string; requestLimit: number };
type EditForm   = { name: string; description: string; requestLimit: number; subscriptionEnd: string; isActive: boolean };

export default function AdminMerchantsPage() {
  const { user: me } = useAuth();

  const [merchants, setMerchants] = useState<MerchantResponse[]>([]);
  const [users,     setUsers]     = useState<UserResponse[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState<string | null>(null);
  const [revealed,  setRevealed]  = useState<Set<string>>(new Set());

  // Create modal
  const [showCreate, setShowCreate] = useState(false);
  const [creating,   setCreating]   = useState(false);
  const [createErr,  setCreateErr]  = useState<string | null>(null);
  const [createForm, setCreateForm] = useState<CreateForm>({ userId: '', name: '', description: '', requestLimit: 100 });

  // Edit modal
  const [editTarget, setEditTarget] = useState<MerchantResponse | null>(null);
  const [editForm,   setEditForm]   = useState<EditForm>({ name: '', description: '', requestLimit: 100, subscriptionEnd: '', isActive: true });
  const [saving,     setSaving]     = useState(false);
  const [editErr,    setEditErr]    = useState<string | null>(null);

  // Regen API key
  const [regenId, setRegenId] = useState<string | null>(null);

  useEffect(() => {
    if (me?.accessRole !== 'Admin') return;
    Promise.all([merchantApi.getAll(), userApi.getAll()])
      .then(([mr, ur]) => { setMerchants(mr.data); setUsers(ur.data); })
      .catch(() => setError('Failed to load data.'))
      .finally(() => setLoading(false));
  }, [me]);

  if (me?.accessRole !== 'Admin') {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">You do not have permission to view this page.</p>
      </div>
    );
  }

  // ── helpers ───────────────────────────────────────────────────────────────

  function toggleReveal(id: string) {
    setRevealed(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }

  function maskKey(key: string) {
    return key.length > 8 ? `${key.slice(0, 4)}${'•'.repeat(key.length - 8)}${key.slice(-4)}` : '••••••••';
  }

  function userLabel(userId: string) {
    const u = users.find(u => u.id === userId);
    return u ? `${u.name} (${u.email})` : userId;
  }

  // ── create ────────────────────────────────────────────────────────────────

  function openCreate() {
    setCreateErr(null);
    setCreateForm({ userId: users[0]?.id ?? '', name: '', description: '', requestLimit: 100 });
    setShowCreate(true);
  }

  async function handleCreate() {
    if (!createForm.userId) { setCreateErr('Please select a user.'); return; }
    if (!createForm.name.trim()) { setCreateErr('Name is required.'); return; }
    setCreating(true); setCreateErr(null);
    try {
      const payload: CreateMerchantRequest = {
        userId: createForm.userId,
        name: createForm.name.trim(),
        description: createForm.description.trim() || undefined,
        requestLimit: createForm.requestLimit,
      };
      const res = await merchantApi.create(payload);
      setMerchants(prev => [...prev, res.data]);
      setShowCreate(false);
    } catch {
      setCreateErr('Failed to create merchant.');
    } finally {
      setCreating(false);
    }
  }

  // ── edit ──────────────────────────────────────────────────────────────────

  function openEdit(m: MerchantResponse) {
    setEditErr(null);
    setEditForm({
      name: m.name,
      description: m.description ?? '',
      requestLimit: m.requestLimit,
      subscriptionEnd: m.subscriptionEnd ? m.subscriptionEnd.slice(0, 10) : '',
      isActive: m.isActive,
    });
    setEditTarget(m);
  }

  async function handleEdit() {
    if (!editTarget) return;
    if (!editForm.name.trim()) { setEditErr('Name is required.'); return; }
    setSaving(true); setEditErr(null);
    try {
      const payload: UpdateMerchantRequest = {
        name: editForm.name.trim(),
        description: editForm.description.trim() || undefined,
        isActive: editForm.isActive,
        requestLimit: editForm.requestLimit,
        subscriptionEnd: editForm.subscriptionEnd || undefined,
      };
      const res = await merchantApi.update(editTarget.id, payload);
      setMerchants(prev => prev.map(m => m.id === editTarget.id ? res.data : m));
      setEditTarget(null);
    } catch {
      setEditErr('Failed to save changes.');
    } finally {
      setSaving(false);
    }
  }

  // ── toggle active ─────────────────────────────────────────────────────────

  async function handleToggleActive(m: MerchantResponse) {
    const payload: UpdateMerchantRequest = {
      name: m.name,
      description: m.description,
      isActive: !m.isActive,
      requestLimit: m.requestLimit,
      subscriptionEnd: m.subscriptionEnd,
    };
    try {
      const res = await merchantApi.update(m.id, payload);
      setMerchants(prev => prev.map(x => x.id === m.id ? res.data : x));
    } catch { /* silent */ }
  }

  // ── regenerate key ────────────────────────────────────────────────────────

  async function handleRegenKey(id: string) {
    setRegenId(id);
    try {
      const res = await merchantApi.regenerateKey(id);
      setMerchants(prev => prev.map(m => m.id === id ? res.data : m));
      setRevealed(prev => { const n = new Set(prev); n.add(id); return n; });
    } catch { /* silent */ }
    finally { setRegenId(null); }
  }

  // ── render ────────────────────────────────────────────────────────────────

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Merchant Management</h1>
          <p className="text-sm text-gray-500 mt-1">Create, edit, set limits, and activate/deactivate merchant accounts.</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium transition-colors shadow"
        >
          <Plus className="h-4 w-4" /> Create Merchant
        </button>
      </div>

      {loading && <p className="text-gray-500 animate-pulse">Loading…</p>}
      {error   && <p className="text-red-500">{error}</p>}

      {!loading && !error && (
        <div className="overflow-x-auto bg-white dark:bg-gray-800 rounded-2xl shadow">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 uppercase text-xs">
                <th className="px-4 py-3 text-left">Name</th>
                <th className="px-4 py-3 text-left">Owner</th>
                <th className="px-4 py-3 text-left">API Key</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Usage / Limit</th>
                <th className="px-4 py-3 text-left">Sub. Start</th>
                <th className="px-4 py-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {merchants.map(m => (
                <tr key={m.id} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors">
                  <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{m.name}</td>
                  <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400 max-w-[160px] truncate">
                    {userLabel(m.userId)}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-700 dark:text-gray-300">
                    <span className="flex items-center gap-1">
                      {revealed.has(m.id) ? m.apiKey : maskKey(m.apiKey)}
                      <button onClick={() => toggleReveal(m.id)} className="p-0.5 text-gray-400 hover:text-indigo-500" title={revealed.has(m.id) ? 'Hide' : 'Reveal'}>
                        {revealed.has(m.id) ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                      </button>
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {m.isActive
                      ? <span className="flex items-center gap-1 text-green-600 text-xs"><CheckCircle className="h-3.5 w-3.5" /> Active</span>
                      : <span className="flex items-center gap-1 text-red-500 text-xs"><XCircle className="h-3.5 w-3.5" /> Inactive</span>}
                  </td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-300">
                    {m.requestUsed} / {m.requestLimit === 0 ? '∞' : m.requestLimit}
                  </td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400">
                    {new Date(m.subscriptionStart).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openEdit(m)}
                        className="p-1.5 text-gray-400 hover:text-indigo-600 rounded hover:bg-indigo-50 dark:hover:bg-gray-700 transition-colors"
                        title="Edit merchant"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleRegenKey(m.id)}
                        disabled={regenId === m.id}
                        className="p-1.5 text-gray-400 hover:text-amber-600 rounded hover:bg-amber-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-40"
                        title="Regenerate API key"
                      >
                        <RefreshCw className={`h-3.5 w-3.5 ${regenId === m.id ? 'animate-spin' : ''}`} />
                      </button>
                      <button
                        onClick={() => handleToggleActive(m)}
                        className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                          m.isActive
                            ? 'text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20'
                            : 'text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20'
                        }`}
                      >
                        {m.isActive ? 'Deactivate' : 'Activate'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {merchants.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-400">No merchants yet.</td>
                </tr>
              )}
            </tbody>
          </table>
          <p className="text-xs text-gray-400 px-4 py-3">{merchants.length} merchant{merchants.length !== 1 ? 's' : ''} total</p>
        </div>
      )}

      {/* ── Create Modal ───────────────────────────────────────────────────── */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Create Merchant</h2>
              <button onClick={() => setShowCreate(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">User (Owner) *</label>
              <select
                value={createForm.userId}
                onChange={e => setCreateForm(f => ({ ...f, userId: e.target.value }))}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">— Select user —</option>
                {users.map(u => <option key={u.id} value={u.id}>{u.name} ({u.email})</option>)}
              </select>
            </div>

            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Merchant Name *</label>
              <input
                type="text"
                value={createForm.name}
                onChange={e => setCreateForm(f => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Acme Corp"
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Description (optional)</label>
              <textarea
                value={createForm.description}
                onChange={e => setCreateForm(f => ({ ...f, description: e.target.value }))}
                rows={2}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Request Limit <span className="text-gray-400 font-normal">(0 = unlimited)</span></label>
              <input
                type="number"
                min={0}
                value={createForm.requestLimit}
                onChange={e => setCreateForm(f => ({ ...f, requestLimit: Number(e.target.value) }))}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {createErr && <p className="text-sm text-red-500">{createErr}</p>}

            <div className="flex justify-end gap-3 pt-1">
              <button onClick={() => setShowCreate(false)} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={creating}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
              >
                {creating ? 'Creating…' : 'Create Merchant'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Edit Modal ─────────────────────────────────────────────────────── */}
      {editTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Edit Merchant</h2>
              <button onClick={() => setEditTarget(null)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">Owner: {userLabel(editTarget.userId)}</p>

            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Name *</label>
              <input
                type="text"
                value={editForm.name}
                onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Description</label>
              <textarea
                value={editForm.description}
                onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))}
                rows={2}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Request Limit <span className="text-gray-400 font-normal">(0 = unlimited)</span></label>
              <input
                type="number"
                min={0}
                value={editForm.requestLimit}
                onChange={e => setEditForm(f => ({ ...f, requestLimit: Number(e.target.value) }))}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Subscription End (optional)</label>
              <input
                type="date"
                value={editForm.subscriptionEnd}
                onChange={e => setEditForm(f => ({ ...f, subscriptionEnd: e.target.value }))}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                id="edit-active"
                type="checkbox"
                checked={editForm.isActive}
                onChange={e => setEditForm(f => ({ ...f, isActive: e.target.checked }))}
                className="h-4 w-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
              />
              <label htmlFor="edit-active" className="text-sm font-medium text-gray-700 dark:text-gray-300">Active</label>
            </div>

            {editErr && <p className="text-sm text-red-500">{editErr}</p>}

            <div className="flex justify-end gap-3 pt-1">
              <button onClick={() => setEditTarget(null)} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
                Cancel
              </button>
              <button
                onClick={handleEdit}
                disabled={saving}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
              >
                {saving ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

