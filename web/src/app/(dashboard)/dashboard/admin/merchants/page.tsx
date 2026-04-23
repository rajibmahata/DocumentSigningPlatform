'use client';

import { useEffect, useMemo, useState } from 'react';
import { merchantApi, userApi } from '@/lib/api';
import { useAuth } from '@/providers/auth-provider';
import type { MerchantResponse, UserResponse, UpdateMerchantRequest, CreateMerchantRequest } from '@/types';
import {
  CheckCircle, XCircle, Eye, EyeOff, Pencil, Plus, RefreshCw, X,
  Search, Filter, TrendingUp, Users, Building2, AlertTriangle,
} from 'lucide-react';

type CreateForm = { userId: string; name: string; description: string; requestLimit: number };
type EditForm   = { name: string; description: string; requestLimit: number; subscriptionEnd: string; isActive: boolean };

// ── stat card ──────────────────────────────────────────────────────────────

function StatCard({ label, value, sub, color }: { label: string; value: number; sub?: string; color: string }) {
  return (
    <div className={`rounded-2xl border p-4 bg-white dark:bg-gray-800 ${color}`}>
      <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
      <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mt-0.5">{label}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
}

export default function AdminMerchantsPage() {
  const { user: me } = useAuth();

  const [merchants, setMerchants] = useState<MerchantResponse[]>([]);
  const [users,     setUsers]     = useState<UserResponse[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState<string | null>(null);
  const [revealed,  setRevealed]  = useState<Set<string>>(new Set());

  // Filters
  const [search,         setSearch]         = useState('');
  const [filterUserId,   setFilterUserId]   = useState('');
  const [filterStatus,   setFilterStatus]   = useState<'all' | 'active' | 'inactive'>('all');

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

  // ── filtered list ────────────────────────────────────────────────────────

  const filtered = useMemo(() => {
    return merchants.filter(m => {
      const matchSearch = search === '' ||
        m.name.toLowerCase().includes(search.toLowerCase()) ||
        (m.description ?? '').toLowerCase().includes(search.toLowerCase());
      const matchUser = filterUserId === '' || m.userId === filterUserId;
      const matchStatus =
        filterStatus === 'all' ||
        (filterStatus === 'active'   &&  m.isActive) ||
        (filterStatus === 'inactive' && !m.isActive);
      return matchSearch && matchUser && matchStatus;
    });
  }, [merchants, search, filterUserId, filterStatus]);

  // ── stats ────────────────────────────────────────────────────────────────

  const totalActive   = merchants.filter(m =>  m.isActive).length;
  const totalInactive = merchants.filter(m => !m.isActive).length;
  const totalEnvelopes = merchants.reduce((s, m) => s + m.requestUsed, 0);

  if (me?.accessRole !== 'Admin') {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">You do not have permission to view this page.</p>
      </div>
    );
  }

  // ── helpers ────────────────────────────────────────────────────────────

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

  function creditLabel(m: MerchantResponse) {
    if (m.requestLimit === 0) return '∞ unlimited';
    const remaining = m.requestLimit - m.requestUsed;
    return `${remaining} left`;
  }

  function usagePct(m: MerchantResponse) {
    if (m.requestLimit === 0) return 0;
    return Math.min(100, Math.round((m.requestUsed / m.requestLimit) * 100));
  }

  // ── create ──────────────────────────────────────────────────────────────

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

  // ── edit ────────────────────────────────────────────────────────────────

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

  // ── toggle active ────────────────────────────────────────────────────────

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

  // ── regen key ────────────────────────────────────────────────────────────

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
      <div className="flex items-center justify-between flex-wrap gap-3">
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

      {/* Stats */}
      {!loading && !error && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard label="Total Merchants"   value={merchants.length}  color="border-gray-200"   />
          <StatCard label="Active"            value={totalActive}       color="border-green-200"  />
          <StatCard label="Inactive"          value={totalInactive}     color="border-red-200"    sub="Envelope sending disabled" />
          <StatCard label="Envelopes Sent"    value={totalEnvelopes}    color="border-indigo-200" />
        </div>
      )}

      {/* Filters */}
      {!loading && !error && (
        <div className="flex flex-wrap gap-3 items-center">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search merchants…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 pl-9 pr-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Filter by user */}
          <div className="flex items-center gap-1.5">
            <Users className="h-4 w-4 text-gray-400" />
            <select
              value={filterUserId}
              onChange={e => setFilterUserId(e.target.value)}
              className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">All Users</option>
              {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
          </div>

          {/* Filter by status */}
          <div className="flex items-center gap-1.5">
            <Filter className="h-4 w-4 text-gray-400" />
            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value as 'all' | 'active' | 'inactive')}
              className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          {(search || filterUserId || filterStatus !== 'all') && (
            <button
              onClick={() => { setSearch(''); setFilterUserId(''); setFilterStatus('all'); }}
              className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-800 transition-colors"
            >
              <X className="h-3.5 w-3.5" /> Clear filters
            </button>
          )}

          <span className="ml-auto text-xs text-gray-400">
            Showing {filtered.length} of {merchants.length}
          </span>
        </div>
      )}

      {loading && <p className="text-gray-500 animate-pulse">Loading…</p>}
      {error   && <p className="text-red-500">{error}</p>}

      {!loading && !error && (
        <div className="overflow-x-auto bg-white dark:bg-gray-800 rounded-2xl shadow">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 uppercase text-xs">
                <th className="px-4 py-3 text-left">Merchant</th>
                <th className="px-4 py-3 text-left">Owner</th>
                <th className="px-4 py-3 text-left">API Key</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Plan</th>
                <th className="px-4 py-3 text-left">Credits</th>
                <th className="px-4 py-3 text-left">Sub. Start</th>
                <th className="px-4 py-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(m => {
                const pct = usagePct(m);
                return (
                  <tr key={m.id} className={`border-b border-gray-100 dark:border-gray-700 transition-colors ${m.isActive ? 'hover:bg-gray-50 dark:hover:bg-gray-750' : 'bg-red-50/40 dark:bg-red-900/10'}`}>
                    {/* Merchant name + description */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Building2 className={`h-4 w-4 shrink-0 ${m.isActive ? 'text-indigo-500' : 'text-gray-300'}`} />
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">{m.name}</p>
                          {m.description && <p className="text-xs text-gray-400 truncate max-w-[160px]">{m.description}</p>}
                        </div>
                      </div>
                    </td>
                    {/* Owner */}
                    <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400 max-w-[160px] truncate">
                      {userLabel(m.userId)}
                    </td>
                    {/* API Key */}
                    <td className="px-4 py-3 font-mono text-xs text-gray-700 dark:text-gray-300">
                      <span className="flex items-center gap-1">
                        {revealed.has(m.id) ? m.apiKey : maskKey(m.apiKey)}
                        <button onClick={() => toggleReveal(m.id)} className="p-0.5 text-gray-400 hover:text-indigo-500" title={revealed.has(m.id) ? 'Hide' : 'Reveal'}>
                          {revealed.has(m.id) ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                        </button>
                      </span>
                    </td>
                    {/* Status */}
                    <td className="px-4 py-3">
                      {m.isActive
                        ? <span className="flex items-center gap-1 text-green-600 text-xs font-medium"><CheckCircle className="h-3.5 w-3.5" /> Active</span>
                        : <span className="flex items-center gap-1 text-red-500 text-xs font-medium"><XCircle className="h-3.5 w-3.5" /> Inactive</span>}
                    </td>
                    {/* Plan */}
                    <td className="px-4 py-3">
                      <span className="inline-block rounded-full px-2 py-0.5 text-xs font-medium bg-indigo-50 text-indigo-700 capitalize">
                        {m.planName || 'free'}
                      </span>
                    </td>
                    {/* Credits */}
                    <td className="px-4 py-3">
                      <div className="space-y-1 min-w-[100px]">
                        <div className="flex justify-between text-xs text-gray-600 dark:text-gray-300">
                          <span>{m.requestUsed} used</span>
                          <span className={pct >= 90 ? 'text-red-600 font-semibold' : pct >= 70 ? 'text-amber-600' : 'text-gray-400'}>
                            {creditLabel(m)}
                          </span>
                        </div>
                        {m.requestLimit > 0 && (
                          <div className="w-full bg-gray-100 rounded-full h-1.5">
                            <div
                              className={`h-1.5 rounded-full ${pct >= 90 ? 'bg-red-500' : pct >= 70 ? 'bg-amber-400' : 'bg-indigo-500'}`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        )}
                        {m.requestLimit === 0 && (
                          <div className="flex items-center gap-1 text-xs text-emerald-600">
                            <TrendingUp className="h-3 w-3" /> Unlimited
                          </div>
                        )}
                      </div>
                    </td>
                    {/* Sub start */}
                    <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400">
                      {new Date(m.subscriptionStart).toLocaleDateString()}
                    </td>
                    {/* Actions */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 flex-wrap">
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
                          className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors ${
                            m.isActive
                              ? 'text-red-600 bg-red-50 hover:bg-red-100 dark:hover:bg-red-900/20'
                              : 'text-green-600 bg-green-50 hover:bg-green-100 dark:hover:bg-green-900/20'
                          }`}
                          title={m.isActive ? 'Deactivate — will block all new envelopes' : 'Activate merchant'}
                        >
                          {m.isActive
                            ? <><XCircle className="h-3 w-3" /> Deactivate</>
                            : <><CheckCircle className="h-3 w-3" /> Activate</>}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center">
                    <div className="flex flex-col items-center gap-2 text-gray-400">
                      <Building2 className="h-8 w-8" />
                      <p className="text-sm">{search || filterUserId || filterStatus !== 'all' ? 'No merchants match your filters.' : 'No merchants yet.'}</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          <p className="text-xs text-gray-400 px-4 py-3">{filtered.length} of {merchants.length} merchant{merchants.length !== 1 ? 's' : ''}</p>
        </div>
      )}

      {/* deactivation warning */}
      {!loading && !error && totalInactive > 0 && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5 text-amber-500" />
          <p>
            <span className="font-semibold">{totalInactive} inactive merchant{totalInactive !== 1 ? 's' : ''}</span> — envelope sending is blocked for these accounts. The API returns <code className="text-xs bg-amber-100 rounded px-1">401 Invalid or inactive API key</code> for all requests.
          </p>
        </div>
      )}

      {/* ── Create Modal ──────────────────────────────────────────────────── */}
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

      {/* ── Edit Modal ────────────────────────────────────────────────────── */}
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

            <div className="flex items-center gap-2 rounded-lg border border-gray-200 dark:border-gray-600 px-3 py-2">
              <input
                id="edit-active"
                type="checkbox"
                checked={editForm.isActive}
                onChange={e => setEditForm(f => ({ ...f, isActive: e.target.checked }))}
                className="h-4 w-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
              />
              <label htmlFor="edit-active" className="flex-1 text-sm font-medium text-gray-700 dark:text-gray-300">Active</label>
              {!editForm.isActive && (
                <span className="text-xs text-red-500 flex items-center gap-1">
                  <XCircle className="h-3.5 w-3.5" /> Envelope sending will be blocked
                </span>
              )}
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