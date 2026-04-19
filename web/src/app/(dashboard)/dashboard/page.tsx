'use client';

import { useAuth } from '@/providers/auth-provider';
import { useQuery } from '@tanstack/react-query';
import { merchantApi, envelopeApi, portalApi } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatDate, getStatusColor } from '@/lib/utils';
import { FileText, Send, CheckCircle, Clock, CreditCard, ArrowRight, PenLine } from 'lucide-react';
import Link from 'next/link';

export default function DashboardPage() {
  const { user } = useAuth();

  const { data: merchants, isLoading: loadingMerchants } = useQuery({
    queryKey: ['merchants', user?.id],
    queryFn: () => merchantApi.getByUser(user!.id).then((r) => r.data),
    enabled: !!user,
  });

  const merchant = merchants?.[0];

  const { data: envelopes, isLoading: loadingEnvelopes } = useQuery({
    queryKey: ['envelopes', merchant?.apiKey],
    queryFn: () => envelopeApi.list(merchant!.apiKey).then((r) => r.data),
    enabled: !!merchant,
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  });

  const { data: myEnvelopes, isLoading: loadingMyEnvelopes } = useQuery({
    queryKey: ['my-envelopes'],
    queryFn: () => portalApi.getMyEnvelopes().then((r) => r.data),
    enabled: !!user,
    refetchInterval: 10_000,
    refetchOnWindowFocus: true,
  });

  const isLoading = loadingMerchants || (!!merchant && loadingEnvelopes);

  const awaitingMySign = myEnvelopes?.filter(
    (e) => (e.status === 'Sent' || e.status === 'InProgress') && !!e.signingToken && new Date(e.expiresAt) > new Date()
  ).length ?? 0;

  const total   = envelopes?.length ?? 0;
  const pending = envelopes?.filter((e) => e.status === 'Sent' || e.status === 'InProgress').length ?? 0;
  const signed  = envelopes?.filter((e) => e.status === 'Completed').length ?? 0;
  const remaining = merchant
    ? merchant.requestLimit === 0
      ? '∞'
      : `${merchant.requestLimit - merchant.requestUsed}`
    : '—';

  const STATS = [
    { label: 'Total Envelopes',        value: total,          icon: FileText,    color: 'text-brand-600',  bg: 'bg-brand-50',   href: '/dashboard/envelopes'      },
    { label: 'Pending Signature',      value: pending,        icon: Clock,       color: 'text-amber-600',  bg: 'bg-amber-50',   href: '/dashboard/envelopes?tab=active'  },
    { label: 'Signed',                 value: signed,         icon: CheckCircle, color: 'text-green-600',  bg: 'bg-green-50',   href: '/dashboard/envelopes?tab=completed' },
    { label: 'Awaiting My Signature',  value: awaitingMySign, icon: PenLine,     color: 'text-violet-600', bg: 'bg-violet-50',  href: '/dashboard/my-signatures'           },
    { label: 'Credits Remaining',      value: remaining,      icon: CreditCard,  color: 'text-purple-600', bg: 'bg-purple-50',  href: '/dashboard/merchant'                },
  ];

  return (
    <div className="animate-fade-in space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Welcome back, {user?.name?.split(' ')[0]} 👋
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/send">
            <Send className="h-4 w-4" /> Send Envelope
          </Link>
        </Button>
      </div>

      {/* Email warning */}
      {user && !user.isEmailVerified && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-3 text-sm text-amber-800">
          ⚠ Your email address is not verified. Check your inbox for a verification link.
        </div>
      )}

      {/* No merchant warning */}
      {!merchant && (
        <div className="rounded-xl border border-orange-200 bg-orange-50 px-5 py-4 flex items-center justify-between">
          <p className="text-sm text-orange-800">
            ⚠ You need a Merchant account before you can send envelopes.
          </p>
          <Button size="sm" asChild>
            <Link href="/dashboard/merchant">Create Merchant <ArrowRight className="h-4 w-4" /></Link>
          </Button>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        {isLoading || loadingMyEnvelopes
          ? [...Array(5)].map((_, i) => (
              <Card key={i}>
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <div className="space-y-2">
                      <div className="h-3 w-20 animate-pulse rounded bg-gray-200" />
                      <div className="h-7 w-10 animate-pulse rounded bg-gray-200" />
                    </div>
                    <div className="h-10 w-10 animate-pulse rounded-xl bg-gray-100" />
                  </div>
                </CardContent>
              </Card>
            ))
          : STATS.map(({ label, value, icon: Icon, color, bg, href }) => {
              const inner = (
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-gray-500">{label}</p>
                      <p className={`mt-1 text-2xl font-bold ${color}`}>{value}</p>
                    </div>
                    <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${bg} ${color}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                  </div>
                  {href && (
                    <p className={`mt-2 text-xs font-medium ${color} flex items-center gap-0.5 opacity-70`}>
                      View all <ArrowRight className="h-3 w-3" />
                    </p>
                  )}
                </CardContent>
              );
              return href ? (
                <Link key={label} href={href} className="block">
                  <Card className="hover:shadow-md hover:border-violet-200 transition-all cursor-pointer">
                    {inner}
                  </Card>
                </Link>
              ) : (
                <Card key={label}>{inner}</Card>
              );
            })}
      </div>

      {/* Recent envelopes */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base">Recent Envelopes</CardTitle>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/dashboard/envelopes">View all <ArrowRight className="h-4 w-4" /></Link>
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="divide-y">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="flex items-center gap-4 px-6 py-3">
                  <div className="h-4 flex-1 animate-pulse rounded bg-gray-100" />
                  <div className="h-4 w-8 animate-pulse rounded bg-gray-100" />
                  <div className="h-4 w-24 animate-pulse rounded bg-gray-100" />
                  <div className="h-5 w-16 animate-pulse rounded-full bg-gray-100" />
                </div>
              ))}
            </div>
          ) : !envelopes || envelopes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <FileText className="h-10 w-10 text-gray-300 mb-3" />
              <p className="text-sm text-gray-500">No envelopes yet.</p>
              <Button size="sm" className="mt-4" asChild>
                <Link href="/dashboard/send">Send your first envelope</Link>
              </Button>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-xs text-gray-500">
                  <th className="px-6 py-3 text-left font-medium">Title</th>
                  <th className="px-6 py-3 text-left font-medium">Signers</th>
                  <th className="px-6 py-3 text-left font-medium">Sent</th>
                  <th className="px-6 py-3 text-left font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {envelopes.slice(0, 5).map((env) => (
                  <tr key={env.envelopeId} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-3 font-medium text-gray-900 truncate max-w-[200px]">
                      <Link href={`/dashboard/envelopes/${env.envelopeId}`} className="hover:text-brand-700">
                        {env.title}
                      </Link>
                    </td>
                    <td className="px-6 py-3 text-gray-500">{env.signers.length}</td>
                    <td className="px-6 py-3 text-gray-500">{formatDate(env.sentDate)}</td>
                    <td className="px-6 py-3">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${getStatusColor(env.status)}`}>
                        {env.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
