'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/providers/auth-provider';
import { auditApi, userApi, type AuditLogResponse, type AuditLogQueryParams } from '@/lib/api';
import { Shield, ChevronLeft, ChevronRight, Search, X, RefreshCw, User, Activity } from 'lucide-react';
import { toast } from 'sonner';
import type { UserResponse } from '@/types';

// ── Constants ────────────────────────────────────────────────────────────────

const ACTION_OPTIONS = [
  'EnvelopeCreated', 'EnvelopeSent', 'EnvelopeViewed', 'EnvelopeSigned',
  'EnvelopeCompleted', 'EnvelopeCancelled', 'EnvelopeRejected', 'EnvelopeFailed', 'EnvelopeExpired',
  'DocumentUploaded', 'DocumentStamped', 'SignatureSubmitted',
  'UserRegistered', 'UserLoggedIn', 'UserLoginFailed',
  'EmailVerified', 'PasswordResetRequested', 'PasswordReset', 'UserUpdated',
  'MerchantCreated', 'MerchantUpdated', 'MerchantApiKeyRegenerated', 'MerchantLimitUpdated',
  'TicketCreated', 'TicketUpdated', 'TicketReplied', 'TicketClosed', 'TicketResolved',
  'PortalOpened',
];

const ENTITY_OPTIONS = ['Envelope', 'Document', 'User', 'Merchant', 'Ticket', 'Portal'];
const STATUS_OPTIONS = ['Success', 'Failure', 'Warning'];

const STATUS_COLORS: Record<string, string> = {
  Success: 'bg-green-100 text-green-700',
  Failure: 'bg-red-100   text-red-700',
  Warning: 'bg-amber-100 text-amber-700',
};

// Envelope status → action mapping with colors for the activity timeline
const ENVELOPE_ACTION_COLORS: Record<string, string> = {
  EnvelopeCreated:   'bg-blue-100 text-blue-700',
  EnvelopeSent:      'bg-indigo-100 text-indigo-700',
  EnvelopeSigned:    'bg-teal-100 text-teal-700',
  EnvelopeCompleted: 'bg-green-100 text-green-700',
  EnvelopeFailed:    'bg-red-100 text-red-700',
  EnvelopeCancelled: 'bg-gray-100 text-gray-700',
  EnvelopeExpired:   'bg-orange-100 text-orange-700',
  EnvelopeRejected:  'bg-rose-100 text-rose-700',
  EnvelopeViewed:    'bg-purple-100 text-purple-700',
  SignatureSubmitted: 'bg-cyan-100 text-cyan-700',
};

function fmt(dateStr: string) {
  return new Date(dateStr).toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
}

function shortId(id: string | null) {
  if (!id) return '—';
  return id.slice(0, 8) + '…';
}

// ── Detail Panel ─────────────────────────────────────────────────────────────

function DetailPanel({ log, onClose }: { log: AuditLogResponse; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900">Audit Entry</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100">
            <X className="h-4 w-4 text-gray-500" />
          </button>
        </div>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
          {[
            ['ID',          log.id],
            ['Action',      log.action],
            ['Entity Type', log.entityType || '—'],
            ['Entity ID',   log.entityId  || '—'],
            ['User ID',     log.userId    || '—'],
            ['Merchant ID', log.merchantId || '—'],
            ['Status',      log.status],
            ['IP Address',  log.ipAddress || '—'],
            ['Timestamp',   fmt(log.timestamp)],
          ].map(([label, value]) => (
            <div key={label} className="col-span-2 sm:col-span-1">
              <dt className="text-xs text-gray-400 uppercase tracking-wider">{label}</dt>
              <dd className="mt-0.5 font-medium text-gray-800 break-all">{value}</dd>
            </div>
          ))}
          {log.description && (
            <div className="col-span-2">
              <dt className="text-xs text-gray-400 uppercase tracking-wider">Description</dt>
              <dd className="mt-0.5 text-gray-800">{log.description}</dd>
            </div>
          )}
          {log.userAgent && (
            <div className="col-span-2">
              <dt className="text-xs text-gray-400 uppercase tracking-wider">User Agent</dt>
              <dd className="mt-0.5 text-gray-600 text-xs break-all">{log.userAgent}</dd>
            </div>
          )}
          {log.metadata && (
            <div className="col-span-2">
              <dt className="text-xs text-gray-400 uppercase tracking-wider">Metadata</dt>
              <dd className="mt-0.5 bg-gray-50 rounded-lg p-2 text-xs font-mono whitespace-pre-wrap break-all text-gray-700">
                {(() => {
                  try { return JSON.stringify(JSON.parse(log.metadata!), null, 2); }
                  catch { return log.metadata; }
                })()}
              </dd>
            </div>
          )}
        </dl>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

const PAGE_SIZE = 50;

export default function AuditLogsPage() {
  const { user } = useAuth();

  // Filters
  const [action,     setAction]     = useState('');
  const [entityType, setEntityType] = useState('');
  const [status,     setStatus]     = useState('');
  const [from,       setFrom]       = useState('');
  const [to,         setTo]         = useState('');
  const [search,     setSearch]     = useState('');
  const [userId,     setUserId]     = useState('');

  // Users for filter dropdown
  const [users,      setUsers]      = useState<UserResponse[]>([]);
  const userMap = Object.fromEntries(users.map(u => [u.id, u.name ?? u.email]));

  // Data
  const [logs,       setLogs]       = useState<AuditLogResponse[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [page,       setPage]       = useState(1);
  const [loading,    setLoading]    = useState(false);
  const [selected,   setSelected]   = useState<AuditLogResponse | null>(null);

  const load = useCallback(async (p = page) => {
    if (user?.accessRole !== 'Admin') return;
    setLoading(true);
    const params: AuditLogQueryParams = {
      page: p,
      pageSize: PAGE_SIZE,
      ...(action     ? { action }     : {}),
      ...(entityType ? { entityType } : {}),
      ...(status     ? { status }     : {}),
      ...(from       ? { from }       : {}),
      ...(to         ? { to }         : {}),
      ...(userId     ? { userId }     : {}),
    };
    try {
      const r = await auditApi.getPaged(params);
      setLogs(r.data.items);
      setTotalPages(r.data.totalPages);
      setTotalCount(r.data.totalCount);
    } catch {
      toast.error('Failed to load audit logs.');
    } finally {
      setLoading(false);
    }
  }, [user, page, action, entityType, status, from, to, userId]);

  // Load users for the filter dropdown
  useEffect(() => {
    if (user?.accessRole !== 'Admin') return;
    userApi.getAll().then(r => setUsers(r.data)).catch(() => {});
  }, [user]);

  useEffect(() => { load(page); }, [page]); // eslint-disable-line react-hooks/exhaustive-deps

  function applyFilters() {
    setPage(1);
    load(1);
  }

  function clearFilters() {
    setAction(''); setEntityType(''); setStatus(''); setFrom(''); setTo(''); setSearch(''); setUserId('');
    setPage(1);
    // load with empty params
    if (user?.accessRole !== 'Admin') return;
    setLoading(true);
    auditApi.getPaged({ page: 1, pageSize: PAGE_SIZE })
      .then(r => { setLogs(r.data.items); setTotalPages(r.data.totalPages); setTotalCount(r.data.totalCount); })
      .catch(() => toast.error('Failed to load audit logs.'))
      .finally(() => setLoading(false));
  }

  if (user?.accessRole !== 'Admin') {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">You do not have permission to view this page.</p>
      </div>
    );
  }

  // Client-side search filter on description/action/user name
  const visible = search.trim()
    ? logs.filter(l =>
        l.action.toLowerCase().includes(search.toLowerCase()) ||
        l.description.toLowerCase().includes(search.toLowerCase()) ||
        (l.userId  ? (userMap[l.userId] ?? l.userId).toLowerCase().includes(search.toLowerCase()) : false) ||
        (l.entityId ?? '').toLowerCase().includes(search.toLowerCase()),
      )
    : logs;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-indigo-50">
            <Shield className="h-5 w-5 text-indigo-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Audit Logs</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {totalCount.toLocaleString()} total events
            </p>
          </div>
        </div>
        <button
          onClick={() => load(page)}
          disabled={loading}
          className="flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-colors"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="rounded-2xl border border-gray-200 bg-white p-4 space-y-3">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* Action */}
          <select
            value={action}
            onChange={e => setAction(e.target.value)}
            className="col-span-2 sm:col-span-1 rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
          >
            <option value="">All Actions</option>
            {ACTION_OPTIONS.map(a => <option key={a} value={a}>{a}</option>)}
          </select>

          {/* Entity Type */}
          <select
            value={entityType}
            onChange={e => setEntityType(e.target.value)}
            className="rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
          >
            <option value="">All Entities</option>
            {ENTITY_OPTIONS.map(e => <option key={e} value={e}>{e}</option>)}
          </select>

          {/* Status */}
          <select
            value={status}
            onChange={e => setStatus(e.target.value)}
            className="rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
          >
            <option value="">All Statuses</option>
            {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>

          {/* From date */}
          <input
            type="date"
            value={from}
            onChange={e => setFrom(e.target.value)}
            className="rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
          />

          {/* To date */}
          <input
            type="date"
            value={to}
            onChange={e => setTo(e.target.value)}
            className="rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
          />

          {/* Apply / Clear */}
          <div className="flex gap-2">
            <button
              onClick={applyFilters}
              className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
            >
              <Search className="h-3.5 w-3.5" />
              Filter
            </button>
            <button
              onClick={clearFilters}
              className="rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-500 hover:bg-gray-50 transition-colors"
              title="Clear filters"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* User filter row */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wider">
            <User className="h-3.5 w-3.5" />
            Filter by User
          </div>
          <select
            value={userId}
            onChange={e => setUserId(e.target.value)}
            className="flex-1 max-w-xs rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
          >
            <option value="">All Users</option>
            {users.map(u => (
              <option key={u.id} value={u.id}>{u.name ?? u.email}</option>
            ))}
          </select>
          {userId && (
            <span className="flex items-center gap-1.5 text-xs bg-indigo-50 text-indigo-700 rounded-full px-3 py-1">
              <Activity className="h-3 w-3" />
              Showing activity for: <strong>{userMap[userId]}</strong>
              <button onClick={() => setUserId('')} className="ml-1 hover:text-indigo-900">
                <X className="h-3 w-3" />
              </button>
            </span>
          )}
        </div>

        {/* Search within page */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by action, description, user ID or entity ID…"
            className="w-full rounded-xl border border-gray-200 pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
          />
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="h-7 w-7 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
          </div>
        ) : visible.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 gap-2 text-gray-500">
            <Shield className="h-8 w-8 text-gray-300" />
            <p className="text-sm">No audit events found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50 text-xs font-semibold uppercase tracking-wider text-gray-400">
                  <th className="px-4 py-3 text-left">Timestamp</th>
                  <th className="px-4 py-3 text-left">Action</th>
                  <th className="px-4 py-3 text-left">Entity</th>
                  <th className="px-4 py-3 text-left">User</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">Description</th>
                  <th className="px-4 py-3 text-left">IP</th>
                </tr>
              </thead>
              <tbody>
                {visible.map(log => (
                  <tr
                    key={log.id}
                    onClick={() => setSelected(log)}
                    className="border-b border-gray-100 hover:bg-indigo-50/40 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3 whitespace-nowrap text-gray-500 font-mono text-xs">
                      {fmt(log.timestamp)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${
                        ENVELOPE_ACTION_COLORS[log.action] ?? 'bg-gray-100 text-gray-700'
                      }`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-gray-600">
                      {log.entityType
                        ? <span>{log.entityType} <span className="text-gray-400 font-mono text-xs">{shortId(log.entityId)}</span></span>
                        : '—'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                      {log.userId
                        ? <span className="flex items-center gap-1">
                            <User className="h-3 w-3 text-gray-400" />
                            {userMap[log.userId] ?? shortId(log.userId)}
                          </span>
                        : '—'
                      }
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[log.status] ?? 'bg-gray-100 text-gray-600'}`}>
                        {log.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 max-w-xs truncate text-gray-600">
                      {log.description || '—'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-gray-400 text-xs font-mono">
                      {log.ipAddress || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {!loading && totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-gray-100 px-4 py-3">
            <p className="text-xs text-gray-500">
              Page {page} of {totalPages} &middot; {totalCount.toLocaleString()} events
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="rounded-lg border border-gray-200 p-1.5 text-gray-600 hover:bg-gray-50 disabled:opacity-40 transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-sm font-medium text-gray-700 min-w-[3rem] text-center">{page}</span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="rounded-lg border border-gray-200 p-1.5 text-gray-600 hover:bg-gray-50 disabled:opacity-40 transition-colors"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Detail modal */}
      {selected && <DetailPanel log={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
