'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/providers/auth-provider';
import { merchantApi, plansApi } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Zap, Building2, Sparkles } from 'lucide-react';

const planIcons: Record<string, React.ReactNode> = {
  free:       <Building2 className="h-6 w-6" />,
  starter:    <Zap className="h-6 w-6" />,
  pro:        <Sparkles className="h-6 w-6" />,
  enterprise: <Building2 className="h-6 w-6" />,
};

function resolvePlanName(requestLimit: number): string {
  if (requestLimit === 0)   return 'enterprise';
  if (requestLimit <= 25)   return 'free';
  if (requestLimit <= 100)  return 'starter';
  if (requestLimit <= 500)  return 'pro';
  return 'enterprise';
}

export default function BillingPage() {
  const { user } = useAuth();

  const { data: merchants } = useQuery({
    queryKey: ['merchants', user?.id],
    queryFn: () => merchantApi.getByUser(user!.id).then((r) => r.data),
    enabled: !!user,
  });
  const merchant = merchants?.[0];

  const { data: plans = [], isLoading: plansLoading } = useQuery({
    queryKey: ['plans'],
    queryFn: () => plansApi.getAll().then((r) => r.data),
  });

  const currentPlanName = merchant ? resolvePlanName(merchant.requestLimit) : null;
  const currentPlan = plans.find((p) => p.name === currentPlanName);

  return (
    <div className="animate-fade-in space-y-8 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Billing &amp; Plans</h1>
        <p className="text-sm text-gray-500 mt-1">
          View your current plan and available tiers.
        </p>
      </div>

      {/* Current plan summary */}
      {merchant && currentPlan && (
        <Card className="border-brand-200 bg-brand-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-brand-700 flex items-center gap-2">
              {planIcons[currentPlan.name]}
              Current Plan: {currentPlan.displayName}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm text-gray-700">
            <p>
              Signing requests used:{' '}
              <span className="font-semibold">{merchant.requestUsed}</span>
              {' / '}
              <span className="font-semibold">
                {merchant.requestLimit === 0 ? '∞' : merchant.requestLimit}
              </span>
            </p>
            {merchant.subscriptionEnd && (
              <p>
                Renews:{' '}
                <span className="font-semibold">
                  {new Date(merchant.subscriptionEnd).toLocaleDateString()}
                </span>
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Plan grid */}
      {plansLoading ? (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-600 border-t-transparent" />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
          {plans.map((plan) => {
            const isCurrent = plan.name === currentPlanName;
            return (
              <div
                key={plan.name}
                className={[
                  'relative rounded-2xl border p-6 flex flex-col gap-4 transition-shadow',
                  plan.isPopular
                    ? 'border-brand-500 shadow-lg shadow-brand-100 ring-2 ring-brand-400'
                    : 'border-gray-200 hover:shadow-md',
                  isCurrent ? 'bg-brand-50' : 'bg-white',
                ].join(' ')}
              >
                {plan.isPopular && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-brand-600 px-3 py-0.5 text-xs font-semibold text-white shadow">
                    Most Popular
                  </span>
                )}

                {isCurrent && (
                  <Badge className="w-fit bg-brand-600 text-white text-xs">Current Plan</Badge>
                )}

                <div className="flex items-center gap-2 text-brand-700">
                  {planIcons[plan.name] ?? <Zap className="h-6 w-6" />}
                  <span className="text-lg font-bold text-gray-900">{plan.displayName}</span>
                </div>

                <div>
                  <span className="text-3xl font-extrabold text-gray-900">
                    ${plan.priceMonthly === 0 ? '0' : plan.priceMonthly}
                  </span>
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
                  {plan.requestLimit === 0
                    ? 'Unlimited requests'
                    : `${plan.requestLimit} requests / month`}
                </div>

                {!isCurrent && (
                  <a
                    href="mailto:support@docsigner.example.com?subject=Plan upgrade request"
                    className="mt-2 block rounded-lg border border-brand-500 px-4 py-2 text-center text-sm font-medium text-brand-600 hover:bg-brand-50 transition-colors"
                  >
                    Contact to upgrade
                  </a>
                )}
              </div>
            );
          })}
        </div>
      )}

      <p className="text-xs text-gray-400">
        To change your plan, contact{' '}
        <a href="mailto:support@docsigner.example.com" className="underline">
          support@docsigner.example.com
        </a>
        . Plan changes take effect on the next billing cycle.
      </p>
    </div>
  );
}
