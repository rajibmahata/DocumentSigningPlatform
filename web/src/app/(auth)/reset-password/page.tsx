'use client';

import { useState, Suspense } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { authApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { KeyRound, Eye, EyeOff, CheckCircle2 } from 'lucide-react';

const schema = z
  .object({
    newPassword: z
      .string()
      .min(8, 'At least 8 characters required')
      .regex(/[A-Z]/, 'Must contain at least one uppercase letter')
      .regex(/[a-z]/, 'Must contain at least one lowercase letter')
      .regex(/[0-9]/, 'Must contain at least one number'),
    confirmPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type FormValues = z.infer<typeof schema>;

function ResetPasswordForm() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const token        = searchParams.get('token') ?? '';

  const [done,           setDone]           = useState(false);
  const [visiblePw,      setVisiblePw]      = useState(false);
  const [visibleConfirm, setVisibleConfirm] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormValues) => {
    if (!token) {
      toast.error('Invalid or missing reset token. Please request a new link.');
      return;
    }
    try {
      await authApi.resetPassword({ token, newPassword: data.newPassword });
      setDone(true);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Reset failed. The link may have expired. Please request a new one.';
      toast.error(msg);
    }
  };

  if (done) {
    return (
      <Card className="w-full max-w-md shadow-lg text-center">
        <CardContent className="pt-10 pb-8">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-green-100 text-green-600 mb-4">
            <CheckCircle2 className="h-7 w-7" />
          </div>
          <h2 className="text-xl font-bold text-gray-900">Password updated!</h2>
          <p className="mt-2 text-sm text-gray-500">
            Your password has been reset successfully. You can now log in with your new password.
          </p>
          <div className="mt-6 flex flex-col gap-3">
            <Button onClick={() => router.push('/login')} className="w-full">
              Go to Login
            </Button>
            <Link
              href="/"
              className="text-sm text-gray-500 hover:text-gray-700 hover:underline"
            >
              ← Back to Home
            </Link>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!token) {
    return (
      <Card className="w-full max-w-md shadow-lg text-center">
        <CardContent className="pt-10 pb-8">
          <p className="text-sm text-red-500">Invalid reset link. Please request a new one.</p>
          <Link href="/forgot-password" className="mt-4 block text-sm text-brand-600 hover:underline">
            Request new reset link
          </Link>
          <Link href="/" className="mt-3 block text-sm text-gray-500 hover:underline">
            ← Back to Home
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md shadow-lg">
      <CardHeader className="text-center pb-2">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-600 text-white mb-3">
          <KeyRound className="h-6 w-6" />
        </div>
        <CardTitle className="text-2xl">Set new password</CardTitle>
        <CardDescription>Choose a strong password for your account.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-2">

          {/* New Password */}
          <div className="space-y-1">
            <Label htmlFor="newPassword">New Password</Label>
            <div className="relative">
              <Input
                id="newPassword"
                type={visiblePw ? 'text' : 'password'}
                placeholder="Min 8 chars, upper, lower, number"
                {...register('newPassword')}
              />
              <button
                type="button"
                onClick={() => setVisiblePw(!visiblePw)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {visiblePw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {errors.newPassword && (
              <p className="text-xs text-red-500">{errors.newPassword.message}</p>
            )}
          </div>

          {/* Confirm Password */}
          <div className="space-y-1">
            <Label htmlFor="confirmPassword">Confirm Password</Label>
            <div className="relative">
              <Input
                id="confirmPassword"
                type={visibleConfirm ? 'text' : 'password'}
                placeholder="Re-enter your new password"
                {...register('confirmPassword')}
              />
              <button
                type="button"
                onClick={() => setVisibleConfirm(!visibleConfirm)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {visibleConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {errors.confirmPassword && (
              <p className="text-xs text-red-500">{errors.confirmPassword.message}</p>
            )}
          </div>

          <Button type="submit" className="w-full" loading={isSubmitting}>
            Update Password
          </Button>
        </form>

        <div className="mt-5 flex flex-col items-center gap-2 text-sm">
          <Link href="/login" className="text-brand-600 hover:underline">
            ← Back to login
          </Link>
          <Link href="/" className="text-gray-500 hover:text-gray-700 hover:underline">
            ← Back to Home
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordForm />
    </Suspense>
  );
}
