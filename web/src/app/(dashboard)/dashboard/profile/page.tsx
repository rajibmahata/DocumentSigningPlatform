'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/providers/auth-provider';
import { useMutation } from '@tanstack/react-query';
import { userApi } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { User, ShieldCheck } from 'lucide-react';

const schema = z.object({ name: z.string().min(2, 'Name must be at least 2 characters') });
type FormValues = z.infer<typeof schema>;

export default function ProfilePage() {
  const { user, refresh } = useAuth();

  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({
    defaultValues: { name: user?.name ?? '' },
  });

  const mutation = useMutation({
    mutationFn: (data: FormValues) => userApi.update(user!.id, data),
    onSuccess: async () => {
      await refresh();
      toast.success('Profile updated.');
    },
    onError: () => toast.error('Update failed.'),
  });

  return (
    <div className="animate-fade-in space-y-6 max-w-xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Profile</h1>
        <p className="mt-1 text-sm text-gray-500">Manage your account information.</p>
      </div>

      {/* Avatar + info */}
      <Card>
        <CardContent className="flex items-center gap-5 p-6">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-600 text-white text-xl font-bold">
            {user?.name?.[0]?.toUpperCase()}
          </div>
          <div>
            <p className="font-semibold text-gray-900 text-lg">{user?.name}</p>
            <p className="text-sm text-gray-500">{user?.email}</p>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant={user?.isEmailVerified ? 'success' : 'warning'}>
                {user?.isEmailVerified ? '✓ Email verified' : '⚠ Email not verified'}
              </Badge>
              <Badge variant="secondary">{user?.accessRole}</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Edit form */}
      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><User className="h-4 w-4" /> Edit Profile</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-4">
            <div className="space-y-1">
              <Label>Full Name</Label>
              <Input {...register('name')} />
              {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
            </div>
            <div className="space-y-1">
              <Label>Email</Label>
              <Input value={user?.email} disabled />
              <p className="text-xs text-gray-400">Email cannot be changed.</p>
            </div>
            <Button type="submit" loading={mutation.isPending}>Save Changes</Button>
          </form>
        </CardContent>
      </Card>

      {/* Security info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <ShieldCheck className="h-4 w-4" /> Security
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-gray-500">To change your password, use the Forgot Password flow.</p>
          <Button variant="outline" size="sm" asChild>
            <a href="/forgot-password">Reset Password</a>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
