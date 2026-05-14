'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function SamplesRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/dashboard/documents?tab=samples');
  }, [router]);
  return null;
}
