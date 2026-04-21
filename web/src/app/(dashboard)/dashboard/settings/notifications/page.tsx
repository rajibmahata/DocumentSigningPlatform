'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/providers/auth-provider';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { merchantApi } from '@/lib/api';
import { toast } from 'sonner';
import {
  Bell,
  Clock,
  Mail,
  Info,
  Loader2,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────

const PRESET_HOURS = [
  { label: '6 hours before expiry',  value: 6 },
  { label: '12 hours before expiry', value: 12 },
  { label: '24 hours before expiry', value: 24 },
  { label: '48 hours before expiry', value: 48 },
  { label: '72 hours before expiry', value: 72 },
];

// ─────────────────────────────────────────────────────────────────────────────

export default function NotificationSettingsPage() {
  const { user }       = useAuth();
  const queryClient    = useQueryClient();

  // Fetch merchant
  const { data: merchants, isLoading: loadingMerchant } = useQuery({
    queryKey: ['merchants', user?.id],
    queryFn:  () => merchantApi.getByUser(user!.id).then((r) => r.data),
    enabled:  !!user?.id,
  });
  const merchant = merchants?.[0];

  // Fetch notification settings
  const {
    data:      settings,
    isLoading: loadingSettings,
  } = useQuery({
    queryKey: ['notification-settings', merchant?.id],
    queryFn:  () => merchantApi.getNotificationSettings(merchant!.id).then((r) => r.data),
    enabled:  !!merchant?.id,
  });

  // Local form state
  const [reminderEnabled,     setReminderEnabled]     = useState(true);
  const [reminderWindowHours, setReminderWindowHours] = useState(24);
  const [customHours,         setCustomHours]         = useState('');
  const [useCustom,           setUseCustom]           = useState(false);

  // Sync form with loaded settings
  useEffect(() => {
    if (!settings) return;
    setReminderEnabled(settings.reminderEnabled);
    const preset = PRESET_HOURS.find((p) => p.value === settings.reminderWindowHours);
    if (preset) {
      setReminderWindowHours(settings.reminderWindowHours);
      setUseCustom(false);
    } else {
      setReminderWindowHours(settings.reminderWindowHours);
      setCustomHours(String(settings.reminderWindowHours));
      setUseCustom(true);
    }
  }, [settings]);

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: (data: { reminderEnabled: boolean; reminderWindowHours: number }) =>
      merchantApi.updateNotificationSettings(merchant!.id, data).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-settings', merchant?.id] });
      toast.success('Notification settings saved.');
    },
    onError: (err: any) => {
      const msg = err?.response?.data ?? 'Failed to save settings.';
      toast.error(typeof msg === 'string' ? msg : 'Failed to save settings.');
    },
  });

  const handleSave = () => {
    let hours = reminderWindowHours;
    if (useCustom) {
      hours = parseInt(customHours, 10);
      if (!hours || hours < 1 || hours > 168) {
        toast.error('Custom hours must be between 1 and 168.');
        return;
      }
    }
    saveMutation.mutate({ reminderEnabled, reminderWindowHours: hours });
  };

  const isLoading = loadingMerchant || loadingSettings;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Bell className="h-6 w-6 text-brand-600" />
          Notification Settings
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Control how and when reminder emails are sent to signers for your envelopes.
        </p>
      </div>

      {!merchant && !loadingMerchant && (
        <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-800 flex gap-2">
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
          You need a merchant account to configure notification settings.
          <a href="/dashboard/merchant" className="underline font-medium">Create one here.</a>
        </div>
      )}

      {isLoading && (
        <div className="flex items-center gap-2 text-sm text-gray-500 py-8">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading settings…
        </div>
      )}

      {merchant && !isLoading && (
        <div className="space-y-6">

          {/* How it works info box */}
          <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800 space-y-2">
            <p className="font-semibold flex items-center gap-1.5">
              <Info className="h-4 w-4 shrink-0" />
              How reminder emails work
            </p>
            <ul className="list-disc list-inside space-y-1 text-blue-700">
              <li>The system checks every hour for pending signers whose link is about to expire.</li>
              <li>Each signer receives <strong>one reminder email</strong> when their signing link is within the configured window.</li>
              <li>Reminders are only sent once per signer — the system will not re-send if the signer has already been reminded.</li>
              <li>Reminders are only sent for envelopes in <em>Sent</em>, <em>Processing</em>, or <em>Signed</em> state.</li>
            </ul>
          </div>

          {/* Reminder toggle */}
          <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-4">
            <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-1.5">
              <Mail className="h-4 w-4 text-brand-600" />
              Signer reminder emails
            </h2>

            <label className="flex items-center gap-3 cursor-pointer">
              <div className="relative">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={reminderEnabled}
                  onChange={(e) => setReminderEnabled(e.target.checked)}
                />
                <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:bg-brand-600 transition-colors" />
                <div className="absolute left-0.5 top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform peer-checked:translate-x-5" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">
                  {reminderEnabled ? 'Reminders enabled' : 'Reminders disabled'}
                </p>
                <p className="text-xs text-gray-500">
                  {reminderEnabled
                    ? 'Signers will receive a reminder email before their signing link expires.'
                    : 'No reminder emails will be sent for your envelopes.'}
                </p>
              </div>
            </label>
          </div>

          {/* Window hours */}
          <div className={`rounded-xl border border-gray-200 bg-white p-5 space-y-4 transition-opacity ${!reminderEnabled ? 'opacity-50 pointer-events-none' : ''}`}>
            <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-1.5">
              <Clock className="h-4 w-4 text-brand-600" />
              When to send the reminder
            </h2>
            <p className="text-xs text-gray-500">
              Select how far in advance of the signing link expiry to send the reminder.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {PRESET_HOURS.map((preset) => (
                <button
                  key={preset.value}
                  type="button"
                  onClick={() => { setReminderWindowHours(preset.value); setUseCustom(false); }}
                  className={`flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm text-left transition-colors ${
                    !useCustom && reminderWindowHours === preset.value
                      ? 'border-brand-500 bg-brand-50 text-brand-700 font-medium'
                      : 'border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <CheckCircle className={`h-4 w-4 shrink-0 ${!useCustom && reminderWindowHours === preset.value ? 'text-brand-600' : 'text-transparent'}`} />
                  {preset.label}
                </button>
              ))}

              {/* Custom option */}
              <button
                type="button"
                onClick={() => setUseCustom(true)}
                className={`flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm text-left transition-colors ${
                  useCustom
                    ? 'border-brand-500 bg-brand-50 text-brand-700 font-medium'
                    : 'border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                <CheckCircle className={`h-4 w-4 shrink-0 ${useCustom ? 'text-brand-600' : 'text-transparent'}`} />
                Custom hours
              </button>
            </div>

            {useCustom && (
              <div className="flex items-center gap-2 mt-2">
                <input
                  type="number"
                  min={1}
                  max={168}
                  value={customHours}
                  onChange={(e) => setCustomHours(e.target.value)}
                  placeholder="e.g. 36"
                  className="w-28 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
                />
                <span className="text-sm text-gray-600">hours before expiry (1–168)</span>
              </div>
            )}

            <p className="text-xs text-gray-400">
              Example: with <strong>7-day envelope expiry</strong> and a <strong>24-hour reminder window</strong>,
              signers will receive a reminder on day 6.
            </p>
          </div>

          {/* Save button */}
          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleSave}
              disabled={saveMutation.isPending}
              className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-700 disabled:opacity-60 transition-colors"
            >
              {saveMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Save settings
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
