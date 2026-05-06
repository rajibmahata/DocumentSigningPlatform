'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { authApi, userApi } from '@/lib/api';
import { useAuth } from '@/providers/auth-provider';
import type { AuthUser } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { FileSignature, Eye, EyeOff, CheckCircle, GitBranch, FileText, Zap, ShieldCheck } from 'lucide-react';
import { useState, useEffect } from 'react';

const schema = z.object({
  email:    z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});
type FormValues = z.infer<typeof schema>;

export default function LoginPage() {
  const router           = useRouter();
  const { login, user }  = useAuth();
  const [visible, setVisible] = useState(false);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  // Once auth state is set (after login), navigate to dashboard.
  // This fires AFTER React commits the setUser update — no race condition.
  useEffect(() => {
    if (user) router.replace('/dashboard');
  }, [user, router]);

  // Strip any credentials that may have leaked into the URL.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    if (params.has('email') || params.has('password')) {
      window.history.replaceState({}, '', '/login');
    }
  }, []);

  const onSubmit = async (data: FormValues) => {
    try {
      const res = await authApi.login(data);
      const { token, isEmailVerified } = res.data;

      // Put token in localStorage before getMe so the request interceptor picks it up.
      localStorage.setItem('auth_token', token);

      // Decode userId from JWT payload (handle base64url padding).
      const parts  = token.split('.');
      const b64    = parts[1].replace(/-/g, '+').replace(/_/g, '/');
      const padded = b64.padEnd(b64.length + (4 - b64.length % 4) % 4, '=');
      const payload = JSON.parse(atob(padded)) as Record<string, string>;
      const userId  = payload['sub'] ?? payload['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier'] ?? '';

      if (!userId) throw new Error('Unable to parse user ID from token.');

      const userRes = await userApi.getMe(userId);
      const u = userRes.data;

      const authUser: AuthUser = {
        id: u.id, name: u.name, email: u.email,
        isEmailVerified: u.isEmailVerified, accessRole: u.accessRole,
      };

      // login() calls setUser() — the useEffect above will redirect once committed.
      login(token, authUser);
      toast.success(`Welcome back, ${u.name}!`);

      if (!isEmailVerified) {
        toast.warning('Please verify your email address.');
      }
    } catch (err: unknown) {
      localStorage.removeItem('auth_token');
      const status = (err as { response?: { status?: number } })?.response?.status;
      const msg    = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;

      if (status === 401 || status === 400) {
        toast.error('Invalid email or password.');
      } else if (status === 429) {
        toast.error('Too many attempts. Please wait a moment and try again.');
      } else if (!status) {
        toast.error('Unable to reach the server. Please check your connection.');
      } else {
        toast.error(msg ?? 'Login failed. Please try again.');
      }
    }
  };

  return (
    <div className="flex w-full max-w-4xl gap-8 items-start">
      {/* ── Login card ── */}
      <Card className="w-full max-w-md shadow-lg shrink-0">
      <CardHeader className="text-center pb-2">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-600 text-white mb-3">
          <FileSignature className="h-6 w-6" />
        </div>
        <CardTitle className="text-2xl">Welcome back</CardTitle>
        <CardDescription>Sign in to your DocSignerHub account</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} method="post" action="#" className="space-y-4 mt-2">
          <div className="space-y-1">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" placeholder="you@example.com" {...register('email')} />
            {errors.email && <p className="text-xs text-red-500">{errors.email.message}</p>}
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Password</Label>
              <Link href="/forgot-password" className="text-xs text-brand-600 hover:underline">
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <Input
                id="password"
                type={visible ? 'text' : 'password'}
                placeholder="••••••••"
                {...register('password')}
              />
              <button
                type="button"
                onClick={() => setVisible(!visible)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
              >
                {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {errors.password && <p className="text-xs text-red-500">{errors.password.message}</p>}
          </div>

          <Button type="submit" className="w-full" loading={isSubmitting}>
            Sign In
          </Button>
        </form>

        <p className="mt-5 text-center text-sm text-gray-500">
          Don&apos;t have an account?{' '}
          <Link href="/register" className="text-brand-600 font-medium hover:underline">
            Create one
          </Link>
        </p>
      </CardContent>
    </Card>

      {/* ── Wiki / Quick-start panel ── */}
      <aside className="hidden lg:flex flex-col gap-5 flex-1">
        <div className="rounded-2xl bg-white border border-brand-100 shadow-sm p-6">
          <h2 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
            <FileSignature className="h-5 w-5 text-brand-600" />
            Getting Started
          </h2>
          <ol className="space-y-3">
            {[
              { step: '1', text: 'Register a free account at /register', icon: CheckCircle },
              { step: '2', text: 'Verify your email via the link we send', icon: CheckCircle },
              { step: '3', text: 'Log in and go to Dashboard → Merchant → Create', icon: CheckCircle },
              { step: '4', text: 'Copy your API key and start sending envelopes', icon: CheckCircle },
            ].map(({ step, text, icon: Icon }) => (
              <li key={step} className="flex items-start gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-600 text-white text-xs font-bold">{step}</span>
                <span className="text-sm text-gray-600">{text}</span>
              </li>
            ))}
          </ol>
        </div>

        <div className="rounded-2xl bg-purple-50 border border-purple-200 p-6">
          <h2 className="text-base font-bold text-gray-900 mb-3 flex items-center gap-2">
            <GitBranch className="h-5 w-5 text-purple-600" />
            Workflow Automation
          </h2>
          <p className="text-sm text-gray-600 mb-4">
            Automate your entire signing process with the visual workflow builder. Connect approval gates, AI analysis, and webhooks — no code required.
          </p>
          <div className="space-y-2">
            {[
              'Drag-and-drop node canvas',
              '10 built-in node types (Email, Approval, AI, Webhook…)',
              '5 ready-to-use templates (NDA, Onboarding, Vendor…)',
              'Real-time execution monitoring',
            ].map((f) => (
              <div key={f} className="flex items-center gap-2 text-sm text-gray-700">
                <CheckCircle className="h-4 w-4 text-purple-500 shrink-0" />
                {f}
              </div>
            ))}
          </div>
          <Link
            href="/dashboard/workflows"
            className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-purple-700 hover:underline"
          >
            <GitBranch className="h-4 w-4" /> Open Workflow Builder →
          </Link>
        </div>

        <div className="rounded-2xl bg-indigo-50 border border-indigo-200 p-6">
          <h2 className="text-base font-bold text-gray-900 mb-3 flex items-center gap-2">
            <Zap className="h-5 w-5 text-indigo-600" />
            Platform Highlights
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {[
              { icon: ShieldCheck, label: 'eIDAS Compliant',    cls: 'text-emerald-600' },
              { icon: FileText,    label: 'PDF · DOC · DOCX',   cls: 'text-blue-600' },
              { icon: GitBranch,   label: 'Visual Workflows',   cls: 'text-purple-600' },
              { icon: Zap,         label: 'Blockchain Proof',   cls: 'text-amber-600' },
            ].map(({ icon: Icon, label, cls }) => (
              <div key={label} className="flex items-center gap-2 text-sm text-gray-700">
                <Icon className={`h-4 w-4 shrink-0 ${cls}`} />
                {label}
              </div>
            ))}
          </div>
          <div className="mt-4 flex gap-3">
            <Link href="/docs" className="text-xs font-semibold text-indigo-700 hover:underline">API Docs →</Link>
            <a href="http://localhost:5163/swagger" target="_blank" rel="noopener noreferrer" className="text-xs font-semibold text-indigo-700 hover:underline">Swagger UI →</a>
          </div>
        </div>
      </aside>
    </div>
  );
}
