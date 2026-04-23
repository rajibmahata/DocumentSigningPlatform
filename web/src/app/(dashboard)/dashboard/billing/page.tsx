'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/providers/auth-provider';
import { merchantApi, plansApi, supportApi, SupportContact, SubscriptionPlan } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Zap, Building2, Sparkles, AlertTriangle, CreditCard, X, Mail } from 'lucide-react';

const planIcons: Record<string, React.ReactNode> = {
  free:       <Building2 className="h-6 w-6" />,
  starter:    <Zap className="h-6 w-6" />,
  pro:        <Sparkles className="h-6 w-6" />,
  enterprise: <Building2 className="h-6 w-6" />,
};

function ContactModal({
  plan,
  contacts,
  onClose,
}: {
  plan: SubscriptionPlan;
  contacts: SupportContact[];
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-xl mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 transition-colors"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          {planIcons[plan.name] ?? <Zap className="h-6 w-6 text-brand-600" />}
          <div>
            <h2 className="text-lg font-bold text-gray-900">Switch to {plan.displayName}</h2>
            <p className="text-sm text-gray-500">
              ${plan.priceMonthly}/mo &middot;{' '}
              {plan.requestLimit === 0 ? 'Unlimited requests' : `${plan.requestLimit} requests/mo`}
            </p>
          </div>
        </div>

        <p className="text-sm text-gray-600 mb-5">
          To upgrade your plan, reach out to our support team. We&apos;ll get you set up quickly.
        </p>

        <div className="space-y-3">
          {contacts.map((c) => (
            <a
              key={c.email}
              href={`mailto:${c.email}?subject=Plan change request - ${plan.displayName}&body=Hello, I would like to switch my plan to ${plan.displayName}. Please assist me.`}
              className="flex items-center gap-3 rounded-xl border border-brand-200 bg-brand-50 px-4 py-3 hover:bg-brand-100 transition-colors"
            >
              <Mail className="h-4 w-4 text-brand-600 shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-800">{c.name}</p>
                <p className="text-xs text-brand-600 truncate">{c.email}</p>
              </div>
            </a>
          ))}
        </div>

        <p className="text-xs text-gray-400 mt-4 text-center">
          Clicking an email will open your mail client with a pre-filled message.
        </p>
      </div>
    </div>
  );
}

export default function BillingPage() {
  const { user } = useAuth();
  const [contactPlan, setContactPlan] = useState<SubscriptionPlan | null>(null);

  const { data: merchants, isLoading: merchantLoading } = useQuery({
    queryKey: ['merchants', user?.id],
    queryFn: () => merchantApi.getByUser(user!.id).then((r) => r.data),
    enabled: !!user,
  });
  const merchant = merchants?.[0];

  const { data: plans = [], isLoading: plansLoading } = useQuery({
    queryKey: ['plans'],
    queryFn: () => plansApi.getAll().then((r) => r.data),
  });

  const { data: supportContacts = [] } = useQuery({
    queryKey: ['support-contacts'],
    queryFn: () => supportApi.getContacts().then((r) => r.data),
  });

  const currentPlanName = merchant?.planName?.toLowerCase() ?? null;
  const currentPlan = plans.find((p) => p.name === currentPlanName);

  const usagePct =
    merchant && merchant.requestLimit > 0
      ? Math.min(100, Math.round((merchant.requestUsed / merchant.requestLimit) * 100))
      : null;

  const subscriptionEnd = merchant?.subscriptionEnd ? new Date(merchant.subscriptionEnd) : null;
  const daysUntilExpiry = subscriptionEnd
    ? Math.ceil((subscriptionEnd.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;
  const showExpiryWarning = daysUntilExpiry !== null && daysUntilExpiry <= 7 && daysUntilExpiry >= 0;
  const isExpired = daysUntilExpiry !== null && daysUntilExpiry < 0;

  const primaryContact = supportContacts[0]?.email ?? 'info@airesumecheck.me';

  if (merchantLoading || plansLoading) {
    return (
      <div className="flex justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <>
      {contactPlan && (
        <ContactModal
          plan={contactPlan}
          contacts={supportContacts}
          onClose={() => setContactPlan(null)}
        />
      )}

      <div className="animate-fade-in space-y-8 max-w-5xl">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Billing &amp; Plans</h1>
          <p className="text-sm text-gray-500 mt-1">View your current plan and available tiers.</p>
        </div>

        {!merchant && (
          <Card className="border-yellow-200 bg-yellow-50">
            <CardContent className="pt-6 flex items-start gap-3">
              <CreditCard className="h-5 w-5 text-yellow-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-yellow-800">No merchant account found</p>
                <p className="text-sm text-yellow-700 mt-1">
                  Contact{' '}
                  <a href={`mailto:${primaryContact}`} className="underline">{primaryContact}</a>{' '}
                  to get set up.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {isExpired && (
          <Card className="border-red-300 bg-red-50">
            <CardContent className="pt-6 flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-red-800">Subscription expired</p>
                <p className="text-sm text-red-700 mt-1">
                  Expired on <span className="font-semibold">{subscriptionEnd!.toLocaleDateString()}</span>.{' '}
                  Contact <a href={`mailto:${primaryContact}?subject=Subscription renewal`} className="underline">{primaryContact}</a> to renew.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {showExpiryWarning && !isExpired && (
          <Card className="border-orange-300 bg-orange-50">
            <CardContent className="pt-6 flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-orange-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-orange-800">
                  Subscription expires in {daysUntilExpiry} day{daysUntilExpiry === 1 ? '' : 's'}
                </p>
                <p className="text-sm text-orange-700 mt-1">
                  Renews on <span className="font-semibold">{subscriptionEnd!.toLocaleDateString()}</span>.{' '}
                  Contact <a href={`mailto:${primaryContact}?subject=Subscription renewal`} className="underline">{primaryContact}</a> to avoid interruption.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {merchant && currentPlan && (
          <Card className="border-brand-200 bg-brand-50">
            <CardHeader className="pb-2">
              <CardTitle className="text-base text-brand-700 flex items-center gap-2">
                {planIcons[currentPlan.name] ?? <Zap className="h-6 w-6" />}
                Current Plan: {currentPlan.displayName}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1.5">
                <div className="flex justify-between text-sm text-gray-700">
                  <span>Signing requests used</span>
                  <span className="font-semibold">
                    {merchant.requestUsed} / {merchant.requestLimit === 0 ? '\u221e' : merchant.requestLimit}
                    {usagePct !== null && <span className="text-gray-400 font-normal ml-1">({usagePct}%)</span>}
                  </span>
                </div>
                {usagePct !== null && (
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={['h-2 rounded-full transition-all', usagePct >= 90 ? 'bg-red-500' : usagePct >= 70 ? 'bg-orange-400' : 'bg-brand-500'].join(' ')}
                      style={{ width: `${usagePct}%` }}
                    />
                  </div>
                )}
                {usagePct !== null && usagePct >= 90 && (
                  <p className="text-xs text-red-600 font-medium">You&apos;ve used {usagePct}% of your monthly limit. Consider upgrading.</p>
                )}
              </div>
              <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-gray-600">
                <span>Start: <span className="font-medium text-gray-800">{new Date(merchant.subscriptionStart).toLocaleDateString()}</span></span>
                {merchant.subscriptionEnd && (
                  <span>
                    {isExpired ? 'Expired' : 'Renews'}:{' '}
                    <span className={`font-medium ${isExpired ? 'text-red-700' : 'text-gray-800'}`}>{subscriptionEnd!.toLocaleDateString()}</span>
                  </span>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {plans.length > 0 && (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
            {plans.map((plan) => {
              const isCurrent = plan.name === currentPlanName;
              const isDowngrade = currentPlanName
                ? plans.findIndex((p) => p.name === currentPlanName) > plans.findIndex((p) => p.name === plan.name)
                : false;
              return (
                <div
                  key={plan.name}
                  className={[
                    'relative rounded-2xl border p-6 flex flex-col gap-4 transition-shadow',
                    plan.isPopular ? 'border-brand-500 shadow-lg shadow-brand-100 ring-2 ring-brand-400' : 'border-gray-200 hover:shadow-md',
                    isCurrent ? 'bg-brand-50' : 'bg-white',
                  ].join(' ')}
                >
                  {plan.isPopular && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-brand-600 px-3 py-0.5 text-xs font-semibold text-white shadow">
                      Most Popular
                    </span>
                  )}
                  {isCurrent && <Badge className="w-fit bg-brand-600 text-white text-xs">Current Plan</Badge>}
                  <div className="flex items-center gap-2 text-brand-700">
                    {planIcons[plan.name] ?? <Zap className="h-6 w-6" />}
                    <span className="text-lg font-bold text-gray-900">{plan.displayName}</span>
                  </div>
                  <div>
                    <span className="text-3xl font-extrabold text-gray-900">${plan.priceMonthly === 0 ? '0' : plan.priceMonthly}</span>
                    <span className="text-sm text-gray-500"> / mo</span>
                  </div>
                  <p className="text-sm text-gray-500">{plan.description}</p>
                  <ul className="space-y-2 flex-1">
                    {plan.features.map((feat) => (
                      <li key={feat} className="flex items-start gap-2 text-sm text-gray-700">
                        <CheckCircle className="h-4 w-4 shrink-0 text-green-500 mt-0.5" />
                        {feat}
                      </li>
                    ))}
                  </ul>
                  <div className="text-xs text-gray-400 text-center">
                    {plan.requestLimit === 0 ? 'Unlimited requests' : `${plan.requestLimit} requests / month`}
                  </div>
                  {!isCurrent && (
                    <button
                      onClick={() => setContactPlan(plan)}
                      className="mt-2 w-full rounded-lg border border-brand-500 px-4 py-2 text-sm font-medium text-brand-600 hover:bg-brand-50 transition-colors"
                    >
                      {isDowngrade ? 'Downgrade' : 'Upgrade'} to {plan.displayName}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <p className="text-xs text-gray-400">
          To change your plan, contact our support team. Plan changes take effect immediately upon admin confirmation.
        </p>
      </div>
    </>
  );
}