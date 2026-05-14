'use client';

import Link from 'next/link';
import { Bell, Webhook, Settings } from 'lucide-react';

export default function SettingsPage() {
  return (
    <div className="animate-fade-in space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="mt-1 text-sm text-gray-500">Manage your notification preferences and webhook integrations.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Link
          href="/dashboard/settings/notifications"
          className="group flex items-start gap-4 rounded-2xl border border-gray-200 bg-white p-6 hover:border-brand-300 hover:shadow-sm transition-all"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 group-hover:bg-amber-100 transition-colors">
            <Bell className="h-5 w-5 text-amber-600" />
          </div>
          <div>
            <p className="font-semibold text-gray-900 group-hover:text-brand-700 transition-colors">Notifications</p>
            <p className="mt-1 text-sm text-gray-500">
              Configure email reminders and expiry alerts for your signing envelopes.
            </p>
          </div>
        </Link>

        <Link
          href="/dashboard/settings/webhooks"
          className="group flex items-start gap-4 rounded-2xl border border-gray-200 bg-white p-6 hover:border-brand-300 hover:shadow-sm transition-all"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-50 group-hover:bg-violet-100 transition-colors">
            <Webhook className="h-5 w-5 text-violet-600" />
          </div>
          <div>
            <p className="font-semibold text-gray-900 group-hover:text-brand-700 transition-colors">Webhooks</p>
            <p className="mt-1 text-sm text-gray-500">
              Register HTTPS endpoints to receive real-time event callbacks from DocSignerHub.
            </p>
          </div>
        </Link>
      </div>
    </div>
  );
}
