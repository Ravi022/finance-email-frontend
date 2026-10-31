'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getSession } from '@/lib/api';

export default function Home() {
  const router = useRouter();
  useEffect(() => {
    const s = getSession();
    router.replace(!s ? '/login' : s.user.role === 'admin' ? '/admin' : '/finance');
  }, [router]);
  return <div className="center muted">Loading…</div>;
}
