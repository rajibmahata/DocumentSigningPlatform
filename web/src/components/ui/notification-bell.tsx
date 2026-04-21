'use client';

import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notificationsApi, type NotificationDto } from '@/lib/api';
import { Bell, CheckCheck, FileText, AlertCircle, CheckCircle } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

// ── Icon per notification type ────────────────────────────────────────────────
function NotifIcon({ type }: { type: string }) {
  if (type === 'envelope.completed')
    return <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />;
  if (type === 'envelope.signed')
    return <FileText className="h-4 w-4 text-blue-500 shrink-0" />;
  if (type === 'envelope.expired')
    return <AlertCircle className="h-4 w-4 text-red-500 shrink-0" />;
  return <Bell className="h-4 w-4 text-gray-400 shrink-0" />;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1)  return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

// ── Single notification row ───────────────────────────────────────────────────
function NotifRow({ n, onRead }: { n: NotificationDto; onRead: (id: string) => void }) {
  const content = (
    <div
      className={cn(
        'px-4 py-3 flex gap-3 hover:bg-gray-50 cursor-pointer transition-colors',
        !n.isRead && 'bg-brand-50'
      )}
      onClick={() => !n.isRead && onRead(n.id)}
    >
      <NotifIcon type={n.type} />
      <div className="flex-1 min-w-0">
        <p className={cn('text-sm font-medium text-gray-900 truncate', !n.isRead && 'font-semibold')}>
          {n.title}
        </p>
        <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{n.body}</p>
        <p className="text-xs text-gray-400 mt-0.5">{timeAgo(n.createdAt)}</p>
      </div>
      {!n.isRead && (
        <span className="mt-1 h-2 w-2 rounded-full bg-brand-500 shrink-0" />
      )}
    </div>
  );

  if (n.link) {
    return (
      <Link href={n.link} className="block">
        {content}
      </Link>
    );
  }
  return content;
}

// ── Bell component ────────────────────────────────────────────────────────────
export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const qc = useQueryClient();

  // Poll every 30 s
  const { data } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => notificationsApi.getSummary().then((r) => r.data),
    refetchInterval: 30_000,
  });

  const markAllMutation = useMutation({
    mutationFn: () => notificationsApi.markAllRead(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const markOneMutation = useMutation({
    mutationFn: (id: string) => notificationsApi.markRead(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });

  // Close on outside click
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, []);

  const unread = data?.unreadCount ?? 0;
  const recent = data?.recent ?? [];

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors"
        aria-label="Notifications"
      >
        <Bell className="h-5 w-5 text-gray-600" />
        {unread > 0 && (
          <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white leading-none">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 rounded-xl border border-gray-200 bg-white shadow-xl z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b">
            <span className="font-semibold text-sm text-gray-900">Notifications</span>
            {unread > 0 && (
              <button
                onClick={() => markAllMutation.mutate()}
                disabled={markAllMutation.isPending}
                className="flex items-center gap-1 text-xs text-brand-600 hover:text-brand-800"
              >
                <CheckCheck className="h-3.5 w-3.5" />
                Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-96 overflow-y-auto divide-y divide-gray-100">
            {recent.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-gray-400 gap-2">
                <Bell className="h-8 w-8" />
                <p className="text-sm">No notifications yet</p>
              </div>
            ) : (
              recent.map((n) => (
                <NotifRow
                  key={n.id}
                  n={n}
                  onRead={(id) => markOneMutation.mutate(id)}
                />
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
