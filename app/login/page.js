'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, setSession } from '@/lib/api';
import { Msg } from '@/components/ui';

export default function Login() {
  const router = useRouter();
  const [form, setForm] = useState({ email: '', password: '' });
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setErr('');
    try {
      const s = await api('/auth/login', { method: 'POST', body: form });
      setSession(s);
      router.replace(s.user.role === 'admin' ? '/admin' : '/finance');
    } catch (e2) {
      setErr(e2.message);
      setBusy(false);
    }
  }

  return (
    <div className="login-screen">
      <div className="login-card">
        <span className="logo" aria-hidden="true">£</span>
        <h1>Receivables Desk</h1>
        <p className="muted">Sign in to manage UK outstanding invoices, payments and reminder mail.</p>
        <form onSubmit={submit}>
          <Msg error={err} />
          <label>
            Email
            <input type="email" autoComplete="username" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </label>
          <label>
            Password
            <input type="password" autoComplete="current-password" required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          </label>
          <button className="btn primary" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
        </form>
        <p className="login-hint">Finance records payments and customer emails. Admin has a read-only overview.</p>
      </div>
    </div>
  );
}
