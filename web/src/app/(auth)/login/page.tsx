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
import { FileSignature, Eye, EyeOff } from 'lucide-react';
import { useState, useEffect } from 'react';

const schema = z.object({
  email:    z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});
type FormValues = z.infer<typeof schema>;

export default function LoginPage() {
  const router     = useRouter();
  const { login }  = useAuth();
  const [visible, setVisible] = useState(false);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  // Pre-warm the dashboard route so navigation is instant
  useEffect(() => { router.prefetch('/dashboard'); }, [router]);

  const onSubmit = async (data: FormValues) => {
    try {
      const res = await authApi.login(data);
      const { token, isEmailVerified } = res.data;

      // Save token to localStorage FIRST so the next API call carries it
      localStorage.setItem('auth_token', token);

      // Decode userId from JWT payload
      const parts = token.split('.');
      const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
      const userId: string =
        payload['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier'] ??
        payload.sub ?? '';

      // Fetch full user profile (token is now in localStorage, so this carries auth)
      const userRes = await userApi.getMe(userId);
      const u = userRes.data;

      const authUser: AuthUser = {
        id: u.id, name: u.name, email: u.email,
        isEmailVerified: u.isEmailVerified, accessRole: u.accessRole,
      };
      login(token, authUser);

      toast.success(`Welcome back, ${u.name}!`);

      if (!isEmailVerified) {
        toast.warning('Please verify your email address.');
      }

      // Hold briefly so the user can read the toast, then navigate
      await new Promise<void>((resolve) => setTimeout(resolve, 800));
      router.push('/dashboard');
    } catch (err: unknown) {
      // Clear any partial token on failure
      localStorage.removeItem('auth_token');
      const status = (err as { response?: { status?: number } })?.response?.status;
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message;

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
    <Card className="w-full max-w-md shadow-lg">
      <CardHeader className="text-center pb-2">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-600 text-white mb-3">
          <FileSignature className="h-6 w-6" />
        </div>
        <CardTitle className="text-2xl">Welcome back</CardTitle>
        <CardDescription>Sign in to your SignFlow account</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-2">
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
  );
}
