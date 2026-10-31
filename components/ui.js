'use client';
import { useEffect } from 'react';
import { gbp, invoiceState } from '@/lib/format';

export const Badge = ({ tone = 'gray', children }) => <span className={`badge ${tone}`}>{children}</span>;

export const InvoiceBadge = ({ inv }) => {
  const s = invoiceState(inv);
  return <Badge tone={s.tone}>{s.label}</Badge>;
};

export function Stat({ label, value, sub, tone }) {
  return (
    <div className={`card stat ${tone || ''}`}>
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
      {sub && <div className="stat-sub">{sub}</div>}
    </div>
  );
}

export function Modal({ title, onClose, children, wide }) {
  useEffect(() => {
    const h = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);
  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`modal ${wide ? 'wide' : ''}`} role="dialog" aria-modal="true">
        <div className="modal-head">
          <h2>{title}</h2>
          <button className="btn ghost" onClick={onClose} aria-label="Close">✕</button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}

export const Msg = ({ error, ok }) =>
  error ? <div className="msg error">{error}</div> : ok ? <div className="msg ok">{ok}</div> : null;

export const Money = ({ v }) => <span className="num">{gbp(v)}</span>;
