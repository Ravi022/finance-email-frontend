'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, clearSession, getSession } from '@/lib/api';
import { convert } from '@/lib/currency';
import { setCurrency } from '@/lib/format';
import BrandLogo from '@/components/BrandLogo';

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

function initials(user) {
  const source = user?.name && user.name.trim().toLowerCase() !== user.role ? user.name : user?.email || '';
  const parts = source.replace(/@.*/, '').split(/[\s._-]+/).filter(Boolean);
  const letters = (parts[0]?.[0] || '') + (parts[1]?.[0] || parts[0]?.[1] || '');
  return letters.toUpperCase() || 'U';
}

export default function Shell({ user, title, children }) {
  const router = useRouter();
  const [cur, setCur] = useState(null);
  const [rates, setRates] = useState(null);
  const [ratesError, setRatesError] = useState(false);
  const [ratesMeta, setRatesMeta] = useState(null);
  const fx = rates ? convert(1, 'GBP', 'INR', rates) : null;
  useEffect(() => {
    if (!user) return;
    api('/dashboard/fx')
      .then((d) => {
        setRates(d.rates || null);
        setRatesError(!d.rates);
        setRatesMeta({ cache: d.cache, stale: d.stale, fetchedAt: d.fetchedAt || d.cachedAt });
      })
      .catch(() => {
        setRates(null);
        setRatesError(true);
        setRatesMeta(null);
      });
    let saved = 'GBP';
    try { saved = localStorage.getItem('fe_currency') || 'GBP'; } catch {}
    setCur(saved);
  }, [user]);
  const pick = (c) => {
    try { localStorage.setItem('fe_currency', c); } catch {}
    setCur(c);
  };
  if (!user) return <div className="center muted">Loading…</div>;
  const displayCur = cur === 'INR' && rates ? 'INR' : 'GBP';
  setCurrency(displayCur, rates);
  const nameIsRole = user.name && user.name.trim().toLowerCase() === user.role;
  const displayName = nameIsRole ? user.email : user.name;
  const fxLabel = fx == null ? '…' : fx;
  return (
    <>
      <header className="topbar">
        <div className="brand">
          <BrandLogo size="sm" />
          <div>
            <div className="brand-title">Receivables Desk</div>
            <div className="brand-sub">{title}</div>
          </div>
        </div>
        <div className="who">
          <div className="seg" role="group" aria-label="Display currency" title={fx == null ? 'Loading currency rates…' : `1 GBP = ₹${fx} INR`}>
            {['GBP', 'INR'].map((c) => (
              <button key={c} className={cur === c ? 'on' : ''} aria-pressed={cur === c} onClick={() => pick(c)} disabled={c === 'INR' && !rates}>
                {c === 'GBP' ? <><span className="seg-full">£ GBP</span><span className="seg-short">£</span></> : <><span className="seg-full">₹ INR</span><span className="seg-short">₹</span></>}
              </button>
            ))}
          </div>
          <div className="user-chip">
            <span className="avatar" aria-hidden="true">{initials(user)}</span>
            <div className="user-details">
              <div className="user-name">{displayName}</div>
              {!nameIsRole && user.email && <div className="user-meta">{user.email}</div>}
            </div>
          </div>
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
      <main className="container" key={`${cur}-${fxLabel}`}>
        {cur === 'INR' && (
          <div className="muted small" style={{ marginBottom: 8 }}>
            {ratesError
              ? 'Failed to fetch live currency rates — amounts shown in GBP.'
              : fx == null
                ? 'Loading currency rates…'
                : <>
                    Showing INR at 1 GBP = ₹{fx}. Invoices and mails stay in GBP.
                    {ratesMeta?.stale
                      ? ' Live rates unavailable; using saved rates.'
                      : ratesMeta?.cache === 'hit'
                        ? ' Using saved rates (refresh every 24h).'
                        : null}
                  </>}
          </div>
        )}
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
