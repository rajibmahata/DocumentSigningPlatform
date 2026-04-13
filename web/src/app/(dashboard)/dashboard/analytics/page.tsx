'use client';

import { useEffect, useState } from 'react';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { analyticsApi } from '@/lib/api';
import { useAuth } from '@/providers/auth-provider';
import type { AnalyticsSummary, AnalyticsTrends } from '@/types';
import { Users, FileText, CheckCircle, XCircle, PenLine } from 'lucide-react';

function StatCard({
  label, value, icon: Icon, color,
}: { label: string; value: number; icon: React.ElementType; color: string }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow p-6 flex items-center gap-4">
      <div className={`p-3 rounded-xl ${color}`}>
        <Icon className="h-6 w-6 text-white" />
      </div>
      <div>
        <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
        <p className="text-2xl font-bold text-gray-900 dark:text-white">{value.toLocaleString()}</p>
      </div>
    </div>
  );
}

export default function AnalyticsPage() {
  const { user } = useAuth();
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [trends, setTrends] = useState<AnalyticsTrends | null>(null);
  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user?.accessRole !== 'Admin') return;
    setLoading(true);
    Promise.all([analyticsApi.getSummary(), analyticsApi.getTrends(days)])
      .then(([s, t]) => {
        setSummary(s.data);
        setTrends(t.data);
      })
      .catch(() => setError('Failed to load analytics data.'))
      .finally(() => setLoading(false));
  }, [days, user]);

  if (user?.accessRole !== 'Admin') {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">You do not have permission to view this page.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500 animate-pulse">Loading analytics…</p>
      </div>
    );
  }

  if (error || !summary || !trends) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-red-500">{error ?? 'No data available.'}</p>
      </div>
    );
  }

  const DAYS_OPTIONS = [7, 14, 30, 60, 90];

  return (
    <div className="space-y-8 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Analytics</h1>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">Period:</span>
          {DAYS_OPTIONS.map(d => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={`px-3 py-1 rounded-full text-sm font-medium border transition-colors ${
                days === d
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:border-indigo-400'
              }`}
            >
              {d}d
            </button>
          ))}
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
        <StatCard label="Total Users"       value={summary.totalUsers}              icon={Users}       color="bg-indigo-500" />
        <StatCard label="Envelopes Sent"    value={summary.totalEnvelopesSent}       icon={FileText}    color="bg-blue-500" />
        <StatCard label="Completed"         value={summary.totalEnvelopesSigned}     icon={CheckCircle} color="bg-green-500" />
        <StatCard label="Cancelled"         value={summary.totalEnvelopesCancelled}  icon={XCircle}     color="bg-red-500" />
        <StatCard label="Documents Signed"  value={summary.totalDocumentsSigned}     icon={PenLine}     color="bg-purple-500" />
      </div>

      {/* User Registrations chart */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow p-6">
        <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">
          User Registrations (last {days} days)
        </h2>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={trends.userRegistrations} margin={{ top: 4, right: 16, bottom: 4, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={v => v.slice(5)} />
            <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
            <Tooltip labelFormatter={l => `Date: ${l}`} />
            <Bar dataKey="count" name="Registrations" fill="#6366f1" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Envelopes Sent vs Documents Signed chart */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow p-6">
        <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">
          Envelopes Sent vs Documents Signed (last {days} days)
        </h2>
        <ResponsiveContainer width="100%" height={260}>
          <LineChart
            data={mergeByDate(trends.envelopesSent, trends.documentsSigned)}
            margin={{ top: 4, right: 16, bottom: 4, left: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={v => v.slice(5)} />
            <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
            <Tooltip labelFormatter={l => `Date: ${l}`} />
            <Legend />
            <Line type="monotone" dataKey="sent"   name="Envelopes Sent"   stroke="#3b82f6" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="signed" name="Documents Signed" stroke="#10b981" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

/** Merge two DailyCount series by date into one array for combined chart. */
function mergeByDate(
  sent: { date: string; count: number }[],
  signed: { date: string; count: number }[],
) {
  const map = new Map<string, { date: string; sent: number; signed: number }>();
  sent.forEach(({ date, count }) => map.set(date, { date, sent: count, signed: 0 }));
  signed.forEach(({ date, count }) => {
    const entry = map.get(date);
    if (entry) entry.signed = count;
    else map.set(date, { date, sent: 0, signed: count });
  });
  return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date));
}
