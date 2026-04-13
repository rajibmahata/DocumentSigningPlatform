'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { authApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { FileSignature, Eye, EyeOff } from 'lucide-react';
import { useState } from 'react';

const schema = z
  .object({
    name:            z.string().min(2, 'Name must be at least 2 characters'),
    email:           z.string().email('Invalid email address'),
    password:        z
      .string()
      .min(8, 'At least 8 characters required')
      .regex(/[A-Z]/, 'Must contain at least one uppercase letter')
      .regex(/[a-z]/, 'Must contain at least one lowercase letter')
      .regex(/[0-9]/, 'Must contain at least one number'),
    confirmPassword: z.string(),
    country:         z.string().optional(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type FormValues = z.infer<typeof schema>;

/** Extract a human-readable message from an Axios error response */
function extractErrorMessage(err: unknown): string {
  const data = (err as { response?: { data?: unknown; status?: number } })?.response?.data;
  const status = (err as { response?: { status?: number } })?.response?.status;

  if (!data) {
    // Network error / CORS / no response
    return 'Unable to reach the server. Please check your connection.';
  }

  if (typeof data === 'string') return data;

  const d = data as Record<string, unknown>;

  // Our custom { message: "..." }
  if (typeof d.message === 'string') return d.message;

  // ASP.NET ModelState { errors: { field: ["msg"] } }
  if (d.errors && typeof d.errors === 'object') {
    const firstField = Object.values(d.errors as Record<string, string[]>)[0];
    if (Array.isArray(firstField) && firstField.length > 0) return firstField[0];
  }

  // ASP.NET ProblemDetails { title: "..." }
  if (typeof d.title === 'string') return d.title;

  if (status === 409) return 'This email is already registered. Please log in instead.';
  if (status === 400) return 'Invalid details. Check your input and try again.';
  if (status === 429) return 'Too many attempts. Please wait a moment and try again.';

  return 'Registration failed. Please try again.';
}

export default function RegisterPage() {
  const router = useRouter();
  const [visiblePw,      setVisiblePw]      = useState(false);
  const [visibleConfirm, setVisibleConfirm] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormValues) => {
    try {
      const { confirmPassword: _, ...payload } = data;
      await authApi.register(payload);
      toast.success('Account created! Check your email to verify your address.');
      router.push('/login');
    } catch (err: unknown) {
      toast.error(extractErrorMessage(err));
    }
  };

  return (
    <Card className="w-full max-w-md shadow-lg">
      <CardHeader className="text-center pb-2">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-600 text-white mb-3">
          <FileSignature className="h-6 w-6" />
        </div>
        <CardTitle className="text-2xl">Create your account</CardTitle>
        <CardDescription>Start signing documents for free</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-2">

          {/* Full Name */}
          <div className="space-y-1">
            <Label htmlFor="name">Full Name</Label>
            <Input id="name" placeholder="John Doe" {...register('name')} />
            {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
          </div>

          {/* Email */}
          <div className="space-y-1">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" placeholder="you@example.com" {...register('email')} />
            {errors.email && <p className="text-xs text-red-500">{errors.email.message}</p>}
          </div>

          {/* Password */}
          <div className="space-y-1">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Input
                id="password"
                type={visiblePw ? 'text' : 'password'}
                placeholder="Min 8 chars, upper, lower, number"
                {...register('password')}
              />
              <button
                type="button"
                onClick={() => setVisiblePw(!visiblePw)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {visiblePw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {errors.password && <p className="text-xs text-red-500">{errors.password.message}</p>}
          </div>

          {/* Confirm Password */}
          <div className="space-y-1">
            <Label htmlFor="confirmPassword">Confirm Password</Label>
            <div className="relative">
              <Input
                id="confirmPassword"
                type={visibleConfirm ? 'text' : 'password'}
                placeholder="Re-enter your password"
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

          {/* Country */}
          <div className="space-y-1">
            <Label htmlFor="country">
              Country <span className="text-gray-400">(optional)</span>
            </Label>
            <Input id="country" placeholder="India" {...register('country')} />
          </div>

          <Button type="submit" className="w-full" loading={isSubmitting}>
            Create Account
          </Button>
        </form>

        <p className="mt-5 text-center text-sm text-gray-500">
          Already have an account?{' '}
          <Link href="/login" className="text-brand-600 font-medium hover:underline">
            Sign in
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
