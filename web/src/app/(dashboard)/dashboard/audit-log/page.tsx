'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/providers/auth-provider';
import { auditApi, type AuditLogResponse, type AuditPagedResult } from '@/lib/api';
import {
  Search, Filter, ChevronLeft, ChevronRight,
  ShieldCheck, AlertTriangle, XCircle, RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';

// ── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(s: string) {
  return new Date(s).toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

const STATUS_STYLE: Record<string, string> = {
  Success: 'bg-green-100 text-green-700',
  Failure: 'bg-red-100   text-red-700',
  Warning: 'bg-amber-100 text-amber-700',
};

const STATUS_ICON: Record<string, React.ElementType> = {
  Success: ShieldCheck,
  Failure: XCircle,
  Warning: AlertTriangle,
};

const ENTITY_TYPES = ['', 'Envelope', 'Document', 'User', 'Merchant', 'Ticket', 'Portal'];
const STATUSES     = ['', 'Success', 'Failure', 'Warning'];

// ── Component ─────────────────────────────────────────────────────────────────

export default function UserAuditLogPage() {
  const { user } = useAuth();

  const [result, setResult]   = useState<AuditPagedResult | null>(null);
  const [loading, setLoading] = useState(true);

  const [search,     setSearch]     = useState('');
  const [action,     setAction]     = useState('');
  const [entityType, setEntityType] = useState('');
  const [status,     setStatus]     = useState('');
  const [from,       setFrom]       = useState('');
  const [to,         setTo]         = useState('');
  const [page,       setPage]       = useState(1);
  const PAGE_SIZE = 20;

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const res = await auditApi.getMyLogs({
        search:     search     || undefined,
        action:     action     || undefined,
        entityType: entityType || undefined,
        status:     status     || undefined,
        from:       from       || undefined,
        to:         to         || undefined,
        page,
        pageSize: PAGE_SIZE,
      });
      setResult(res.data);
    } catch (err: unknown) {
      const msg = (err as { response?: { status?: number; data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg || 'Failed to load audit log. Make sure the API server is running.');
    } finally {
      setLoading(false);
    }
  }, [user, search, action, entityType, status, from, to, page]);

  useEffect(() => { load(); }, [load]);

  // Reset page when filters change
  useEffect(() => { setPage(1); }, [search, action, entityType, status, from, to]);

  function clearFilters() {
    setSearch(''); setAction(''); setEntityType('');
    setStatus(''); setFrom(''); setTo('');
    setPage(1);
  }

  const hasFilters = search || action || entityType || status || from || to;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Audit Log</h1>
          <p className="mt-1 text-sm text-gray-500">
            All activity recorded for your account
          </p>
        </div>
        <button
          onClick={load}
          className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="rounded-xl border border-gray-100 bg-white p-4 space-y-3 shadow-sm">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by action or description…"
            className="w-full rounded-lg border border-gray-200 pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>

        {/* Filter row */}
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex items-center gap-1 text-xs text-gray-500 font-medium shrink-0">
            <Filter className="h-3.5 w-3.5" />
            Filters
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500">Action</label>
            <input
              type="text"
              value={action}
              onChange={e => setAction(e.target.value)}
              placeholder="e.g. Envelope.Sent"
              className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm w-44 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500">Entity Type</label>
            <select
              value={entityType}
              onChange={e => setEntityType(e.target.value)}
              className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              {ENTITY_TYPES.map(t => (
                <option key={t} value={t}>{t || 'All types'}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500">Status</label>
            <select
              value={status}
              onChange={e => setStatus(e.target.value)}
              className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              {STATUSES.map(s => (
                <option key={s} value={s}>{s || 'All statuses'}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500">From</label>
            <input
              type="date"
              value={from}
              onChange={e => setFrom(e.target.value)}
              className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500">To</label>
            <input
              type="date"
              value={to}
              onChange={e => setTo(e.target.value)}
              className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          {hasFilters && (
            <button
              onClick={clearFilters}
              className="self-end text-xs text-red-500 hover:text-red-700 underline"
            >
              Clear all
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-gray-100 bg-white shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-gray-400 text-sm">
            Loading…
          </div>
        ) : !result || result.items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400 gap-2">
            <ShieldCheck className="h-10 w-10 text-gray-200" />
            <p className="text-sm">No audit entries found.</p>
            {hasFilters && (
              <button onClick={clearFilters} className="text-xs text-brand-600 underline">
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                <tr>
                  <th className="px-4 py-3 text-left">Timestamp</th>
                  <th className="px-4 py-3 text-left">Action</th>
                  <th className="px-4 py-3 text-left">Entity Type</th>
                  <th className="px-4 py-3 text-left">Description</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">IP Address</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {result.items.map(row => (
                  <AuditRow key={row.id} row={row} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {result && result.totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-gray-500">
          <span>
            Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, result.totalCount)} of {result.totalCount}
          </span>
          <div className="flex items-center gap-2">
            <button
              disabled={page === 1}
              onClick={() => setPage(p => p - 1)}
              className="rounded-lg border border-gray-200 p-1.5 disabled:opacity-40 hover:bg-gray-50"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="px-2">Page {page} of {result.totalPages}</span>
            <button
              disabled={page >= result.totalPages}
              onClick={() => setPage(p => p + 1)}
              className="rounded-lg border border-gray-200 p-1.5 disabled:opacity-40 hover:bg-gray-50"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Row sub-component ─────────────────────────────────────────────────────────

function AuditRow({ row }: { row: AuditLogResponse }) {
  const statusStyle = STATUS_STYLE[row.status] ?? 'bg-gray-100 text-gray-600';
  const Icon        = STATUS_ICON[row.status] ?? ShieldCheck;

  return (
    <tr className="hover:bg-gray-50 transition-colors">
      <td className="px-4 py-3 whitespace-nowrap text-gray-500 text-xs">
        {fmtDate(row.timestamp)}
      </td>
      <td className="px-4 py-3">
        <span className="font-mono text-xs bg-gray-100 text-gray-700 rounded px-1.5 py-0.5">
          {row.action}
        </span>
      </td>
      <td className="px-4 py-3 text-gray-600">{row.entityType || '—'}</td>
      <td className="px-4 py-3 text-gray-800 max-w-xs truncate" title={row.description}>
        {row.description || '—'}
      </td>
      <td className="px-4 py-3">
        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${statusStyle}`}>
          <Icon className="h-3 w-3" />
          {row.status}
        </span>
      </td>
      <td className="px-4 py-3 text-gray-500 text-xs font-mono">{row.ipAddress || '—'}</td>
    </tr>
  );
}
