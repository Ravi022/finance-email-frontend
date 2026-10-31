'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { dmy } from '@/lib/format';
import Shell, { Tabs, useAuth } from '@/components/Shell';
import InvoiceTable from '@/components/InvoiceTable';
import InvoiceModal from '@/components/InvoiceModal';
import MailLogTable from '@/components/MailLogTable';
import { Badge, Money, Msg, Stat } from '@/components/ui';
import { gbp } from '@/lib/format';
import { ScrollTable, usePager } from '@/components/Pagination';

export default function AdminPage() {
  const user = useAuth('admin');
  const [tab, setTab] = useState('dashboard');
  const [openId, setOpenId] = useState(null);
  return (
    <Shell user={user} title="Management overview">
      <div className="page-head">
        <div>
          <h1>Receivables overview</h1>
          <p className="page-lead">Monitor outstanding balances, ageing and reminder activity. This view is read-only.</p>
        </div>
      </div>
      <Tabs value={tab} onChange={setTab} tabs={[['dashboard', 'Dashboard'], ['customers', 'Customers'], ['invoices', 'All invoices'], ['mail', 'Mail log']]} />
      {user && tab === 'dashboard' && <Dashboard onOpen={setOpenId} />}
      {user && tab === 'customers' && <CustomerList />}
      {user && tab === 'invoices' && <AllInvoices onOpen={(i) => setOpenId(i._id)} />}
      {user && tab === 'mail' && <Mail />}
      {openId && <InvoiceModal id={openId} canEdit={false} onClose={() => setOpenId(null)} />}
    </Shell>
  );
}

function Dashboard({ onOpen }) {
  const [d, setD] = useState(null);
  const [err, setErr] = useState('');
  useEffect(() => { api('/dashboard/summary').then(setD).catch((e) => setErr(e.message)); }, []);
  if (err) return <Msg error={err} />;
  if (!d) return <div className="muted">Loading…</div>;
  const t = d.totals;
  const maxB = Math.max(1, ...d.buckets.map((b) => b.amount));
  const barTone = { 'Not due': '', '1-30': '', '31-60': 'warn', '61-90': 'warn', '90+': 'bad' };

  return (
    <>
      <div className="muted" style={{ marginBottom: 12 }}>
        As of {dmy(d.asOf)} · Reminder mails {d.reminder.active ? 'active' : `start on ${dmy(d.reminder.startDate)}`}, at most one per customer every {d.reminder.intervalDays} days
      </div>
      {t.overdueCustomersWithoutEmail > 0 && <div className="banner">{t.overdueCustomersWithoutEmail} customer(s) with overdue invoices have no email address, so they will not receive reminders.</div>}
      <div className="grid4">
        <Stat label="Total outstanding" value={gbp(t.outstanding)} sub={`${t.openCount} open invoices`} />
        <Stat label="Overdue" value={gbp(t.overdueAmount)} sub={`${t.overdueCount} invoices`} tone="red" />
        <Stat label="Due in next 7 days" value={gbp(t.dueIn7.amount)} sub={`${t.dueIn7.count} invoices`} />
        <Stat label="Due in next 30 days" value={gbp(t.dueIn30.amount)} sub={`${t.dueIn30.count} invoices`} />
        <Stat label="Collected" value={gbp(t.totalPaid)} sub={`of ${gbp(t.totalInvoiced)} invoiced`} tone="green" />
        <Stat label="Reminder mails (30 days)" value={t.mailsLast30Days} sub={`${t.customersWithoutEmail} of ${t.customers} customers have no email`} />
        <Stat label="Amount missing" value={t.missingAmount} sub="invoices excluded from totals" />
      </div>

      <div className="cols2" style={{ marginTop: 16 }}>
        <div className="card">
          <h2>Overdue ageing</h2>
          <div className="bars">
            {d.buckets.map((b) => (
              <div className="bar-row" key={b.bucket}>
                <span>{b.bucket === 'Not due' ? 'Not due' : `${b.bucket} d`}</span>
                <div className="bar-track"><div className={`bar-fill ${barTone[b.bucket]}`} style={{ width: `${(b.amount / maxB) * 100}%` }} /></div>
                <span className="r num">{gbp(b.amount)} <span className="muted small">({b.count})</span></span>
              </div>
            ))}
          </div>
        </div>
        <div className="card">
          <h2>Falling due soon</h2>
          {d.upcoming.length === 0 ? <div className="muted">Nothing due.</div> : d.upcoming.map((u) => (
            <div key={u._id} className="row between due-row" onClick={() => onOpen(u._id)}>
              <span>{u.customerName}<span className="muted small"> · {u.invoiceNo}</span></span>
              <span><Money v={u.outstanding} /> <Badge tone="blue">{u.daysToDue === 0 ? 'today' : `${u.daysToDue}d`}</Badge></span>
            </div>
          ))}
        </div>
      </div>

      <h2 style={{ marginTop: 20 }}>Top customers by outstanding</h2>
      <div className="table-wrap"><table>
        <thead><tr><th>Customer</th><th className="r">Open invoices</th><th className="r">Outstanding</th><th className="r">Overdue</th></tr></thead>
        <tbody>{d.topCustomers.map((c) => (
          <tr key={c.code}>
            <td><Link href={`/admin/customers/${c.code}`}>{c.name}</Link> <span className="muted small">{c.code}</span></td>
            <td className="r">{c.invoices}</td><td className="r"><Money v={c.outstanding} /></td><td className="r"><Money v={c.overdue} /></td>
          </tr>))}</tbody>
      </table></div>
    </>
  );
}

function CustomerList() {
  const [list, setList] = useState([]);
  const [q, setQ] = useState('');
  const [err, setErr] = useState('');
  useEffect(() => { api('/customers').then(setList).catch((e) => setErr(e.message)); }, []);
  const shown = list.filter((c) => `${c.name} ${c.code}`.toLowerCase().includes(q.toLowerCase()));
  const pager = usePager(shown);
  return (
    <>
      <Msg error={err} />
      <div className="toolbar"><input className="grow" placeholder="Search customer…" value={q} onChange={(e) => setQ(e.target.value)} /></div>
      <ScrollTable pager={pager} noun="customers"><table>
        <thead><tr><th>Customer</th><th>Email</th><th className="r">Invoices</th><th className="r">Outstanding</th><th className="r">Overdue</th><th className="r">Max overdue</th><th>Reminders</th></tr></thead>
        <tbody>{pager.slice.map((c) => (
          <tr key={c.code}>
            <td><Link href={`/admin/customers/${c.code}`}>{c.name}</Link><div className="muted small">{c.code}</div></td>
            <td>{c.email || <Badge tone="red">No email</Badge>}</td>
            <td className="r">{c.invoiceCount}</td><td className="r"><Money v={c.outstanding} /></td><td className="r"><Money v={c.overdueAmount} /></td>
            <td className="r">{c.maxOverdueDays ? `${c.maxOverdueDays} d` : '-'}</td>
            <td>{c.reminderEnabled ? <Badge tone="green">On</Badge> : <Badge tone="gray">Off</Badge>}</td>
          </tr>))}</tbody>
      </table></ScrollTable>
    </>
  );
}

function AllInvoices({ onOpen }) {
  const [list, setList] = useState([]);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [overdue, setOverdue] = useState(false);
  const [err, setErr] = useState('');
  useEffect(() => {
    const t = setTimeout(() => {
      const p = new URLSearchParams();
      if (q) p.set('q', q);
      if (status) p.set('status', status);
      if (overdue) p.set('overdue', '1');
      api(`/invoices?${p}`).then(setList).catch((e) => setErr(e.message));
    }, 200);
    return () => clearTimeout(t);
  }, [q, status, overdue]);
  return (
    <>
      <Msg error={err} />
      <div className="toolbar">
        <input className="grow" placeholder="Search customer, invoice, PO, SO…" value={q} onChange={(e) => setQ(e.target.value)} />
        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All statuses</option><option value="Open">Open</option><option value="Partial">Partially paid</option>
          <option value="Paid">Paid</option><option value="AmountMissing">Amount missing</option>
        </select>
        <label className="check"><input type="checkbox" checked={overdue} onChange={(e) => setOverdue(e.target.checked)} /> Overdue only</label>
      </div>
      <InvoiceTable invoices={list} onOpen={onOpen} />
    </>
  );
}

function Mail() {
  const [logs, setLogs] = useState([]);
  useEffect(() => { api('/dashboard/mail-logs').then(setLogs).catch(() => {}); }, []);
  return <MailLogTable logs={logs} />;
}
