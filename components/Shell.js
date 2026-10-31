'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, clearSession, getSession } from '@/lib/api';
import { setCurrency } from '@/lib/format';

export function useAuth(role) {
  const router = useRouter();
  const [user, setUser] = useState(null);
  useEffect(() => {
    const s = getSession();
    if (!s) return router.replace('/login');
    if (role && s.user.role !== role) return router.replace(s.user.role === 'admin' ? '/admin' : '/finance');
    setUser(s.user);
  }, [role, router]);
  return user;
}

export default function Shell({ user, title, children }) {
  const router = useRouter();
  const [cur, setCur] = useState(null); // null until the saved choice and rate are loaded
  const [fx, setFx] = useState(110);
  useEffect(() => {
    if (!user) return;
    api('/dashboard/fx').then((d) => setFx(d.gbpInr)).catch(() => {});
    let saved = 'GBP';
    try { saved = localStorage.getItem('fe_currency') || 'GBP'; } catch {}
    setCur(saved);
  }, [user]);
  const pick = (c) => {
    try { localStorage.setItem('fe_currency', c); } catch {}
    setCur(c);
  };
  if (!user) return <div className="center muted">Loading…</div>;
  // set before children render so every amount in this pass uses the chosen currency
  setCurrency(cur || 'GBP', cur === 'INR' ? fx : 1);
  return (
    <>
      <header className="topbar">
        <div className="brand">
          <span className="logo">₤</span>
          <div>
            <div className="brand-title">Receivables Desk</div>
            <div className="brand-sub">{title}</div>
          </div>
        </div>
        <div className="who">
          <div className="seg" role="group" aria-label="Display currency" title={`1 GBP = ${fx} INR`}>
            {['GBP', 'INR'].map((c) => (
              <button key={c} className={cur === c ? 'on' : ''} aria-pressed={cur === c} onClick={() => pick(c)}>{c === 'GBP' ? '£ GBP' : '₹ INR'}</button>
            ))}
          </div>
          <span className="role">{user.role}</span>
          <span className="muted">{user.name}</span>
          <button
            className="btn"
            onClick={() => {
              clearSession();
              router.replace('/login');
            }}
          >
            Sign out
          </button>
        </div>
      </header>
      <main className="container" key={`${cur}-${fx}`}>
        {cur === 'INR' && <div className="muted small" style={{ marginBottom: 8 }}>Showing INR at a fixed rate of 1 GBP = ₹{fx}. Invoices and mails stay in GBP.</div>}
        {cur && children}
      </main>
    </>
  );
}

export function Tabs({ tabs, value, onChange }) {
  return (
    <div className="tabs" role="tablist">
      {tabs.map(([k, label]) => (
        <button key={k} role="tab" aria-selected={value === k} className={value === k ? 'tab active' : 'tab'} onClick={() => onChange(k)}>
          {label}
        </button>
      ))}
    </div>
  );
}
