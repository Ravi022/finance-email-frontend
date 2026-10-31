'use client';
import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { dateTime, dmy, ymd } from '@/lib/format';
import Shell, { Tabs, useAuth } from '@/components/Shell';
import InvoiceTable from '@/components/InvoiceTable';
import InvoiceModal from '@/components/InvoiceModal';
import MailLogTable from '@/components/MailLogTable';
import { Badge, Modal, Money, Msg } from '@/components/ui';
import { ScrollTable, usePager } from '@/components/Pagination';
import MailTemplateEditor from '@/components/MailTemplateEditor';

export default function FinancePage() {
  const user = useAuth('finance');
  const [tab, setTab] = useState('invoices');
  const [modal, setModal] = useState(null); // 'new' | 'import' | {id}
  const [version, setVersion] = useState(0);
  const refresh = () => setVersion((v) => v + 1);

  return (
    <Shell user={user} title="Collections workspace">
      <div className="page-head">
        <div>
          <h1>Invoices &amp; payments</h1>
          <p className="page-lead">Record invoices, apply receipts and keep customer reminder emails up to date.</p>
        </div>
        <div className="row page-actions">
          <button className="btn" onClick={() => setModal('import')}>Import Excel</button>
          <button className="btn primary" onClick={() => setModal('new')}>+ New invoice</button>
        </div>
      </div>
      <Tabs value={tab} onChange={setTab} tabs={[['invoices', 'Invoices'], ['customers', 'Customers & emails'], ['reminders', 'Reminders'], ['template', 'Mail template']]} />
      {user && tab === 'invoices' && <Invoices version={version} onOpen={(i) => setModal({ id: i._id })} />}
      {user && tab === 'customers' && <Customers version={version} />}
      {user && tab === 'reminders' && <Reminders version={version} />}
      {user && tab === 'template' && <MailTemplateEditor />}

      {modal === 'new' && <NewInvoice onClose={() => setModal(null)} onSaved={(inv) => { refresh(); setModal({ id: inv._id }); }} />}
      {modal === 'import' && <ImportExcel onClose={() => setModal(null)} onDone={refresh} />}
      {modal?.id && <InvoiceModal id={modal.id} canEdit onClose={() => setModal(null)} onChanged={refresh} />}
    </Shell>
  );
}

function Invoices({ version, onOpen }) {
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
  }, [q, status, overdue, version]);

  const total = list.reduce((s, i) => s + i.outstanding, 0);
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
        <span className="muted">{list.length} invoices · outstanding <b><Money v={total} /></b></span>
      </div>
      <InvoiceTable invoices={list} onOpen={onOpen} />
    </>
  );
}

function Customers({ version }) {
  const [list, setList] = useState([]);
  const [drafts, setDrafts] = useState({});
  const [err, setErr] = useState('');
  const [ok, setOk] = useState('');
  const [adding, setAdding] = useState(false);

  const load = useCallback(() => api('/customers').then(setList).catch((e) => setErr(e.message)), []);
  useEffect(() => { load(); }, [load, version]);
  const pager = usePager(list);

  async function save(c, patch) {
    setErr(''); setOk('');
    try {
      await api(`/customers/${c.code}`, { method: 'PUT', body: patch });
      setOk(`${c.name} updated`);
      setDrafts((d) => { const n = { ...d }; delete n[c.code]; return n; });
      load();
    } catch (e) { setErr(e.message); }
  }

  return (
    <>
      <Msg error={err} ok={ok} />
      <div className="row between" style={{ marginBottom: 12 }}>
        <div className="muted">Reminder mails go to the address below. Customers without an email are skipped.</div>
        <button className="btn" onClick={() => setAdding(true)}>+ Add customer</button>
      </div>
      <ScrollTable pager={pager} noun="customers">
        <table>
          <thead><tr><th>Code</th><th>Customer</th><th>Email (comma separated for several)</th><th className="r">Outstanding</th><th className="r">Overdue</th><th>Reminders</th><th>Last reminder</th></tr></thead>
          <tbody>
            {pager.slice.map((c) => {
              const draft = drafts[c.code];
              return (
                <tr key={c.code}>
                  <td className="mono">{c.code}</td><td>{c.name}</td>
                  <td>
                    <div className="row">
                      <input className="grow" type="text" placeholder="accounts@customer.com" value={draft ?? c.email} onChange={(e) => setDrafts({ ...drafts, [c.code]: e.target.value })} />
                      {draft !== undefined && draft !== c.email && <button className="btn primary" onClick={() => save(c, { email: draft })}>Save</button>}
                    </div>
                  </td>
                  <td className="r"><Money v={c.outstanding} /></td><td className="r"><Money v={c.overdueAmount} /></td>
                  <td><label className="check"><input type="checkbox" checked={c.reminderEnabled} onChange={(e) => save(c, { reminderEnabled: e.target.checked })} />{c.reminderEnabled ? 'On' : 'Off'}</label></td>
                  <td className="muted">{c.lastReminderAt ? dateTime(c.lastReminderAt) : '-'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </ScrollTable>
      {adding && <AddCustomer onClose={() => setAdding(false)} onSaved={() => { setAdding(false); load(); }} />}
    </>
  );
}

function AddCustomer({ onClose, onSaved }) {
  const [f, setF] = useState({ code: '', name: '', email: '' });
  const [err, setErr] = useState('');
  async function submit(e) {
    e.preventDefault();
    try { await api('/customers', { method: 'POST', body: f }); onSaved(); } catch (e2) { setErr(e2.message); }
  }
  return (
    <Modal title="Add customer" onClose={onClose}>
      <form onSubmit={submit}>
        <Msg error={err} />
        <label>Customer code<input required value={f.code} onChange={(e) => setF({ ...f, code: e.target.value })} /></label>
        <label>Customer name<input required value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></label>
        <label>Email<input value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></label>
        <button className="btn primary">Add customer</button>
      </form>
    </Modal>
  );
}

function NewInvoice({ onClose, onSaved }) {
  const [customers, setCustomers] = useState([]);
  const [f, setF] = useState({ customerCode: '', customerName: '', email: '', invoiceNo: '', poNo: '', soNo: '', documentDate: ymd(new Date()), creditPeriod: 30, amount: '', remarks: '' });
  const [err, setErr] = useState('');
  useEffect(() => { api('/customers').then(setCustomers).catch(() => {}); }, []);
  const known = customers.find((c) => c.code === f.customerCode.trim());
  const due = f.documentDate ? new Date(new Date(f.documentDate).getTime() + Number(f.creditPeriod || 0) * 86400000) : null;

  async function submit(e) {
    e.preventDefault();
    setErr('');
    try {
      onSaved(await api('/invoices', { method: 'POST', body: { ...f, customerName: known ? known.name : f.customerName, creditPeriod: Number(f.creditPeriod), amount: Number(f.amount) } }));
    } catch (e2) { setErr(e2.message); }
  }
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  return (
    <Modal title="New invoice" onClose={onClose}>
      <form onSubmit={submit}>
        <Msg error={err} />
        <div className="grid4">
          <label>Customer code<input required list="cust-codes" value={f.customerCode} onChange={set('customerCode')} />
            <datalist id="cust-codes">{customers.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}</datalist></label>
          <label>Customer name<input required readOnly={!!known} value={known ? known.name : f.customerName} onChange={set('customerName')} /></label>
          {!known && <label>Customer email<input value={f.email} onChange={set('email')} /></label>}
          <label>Invoice no<input required value={f.invoiceNo} onChange={set('invoiceNo')} /></label>
          <label>PO no<input value={f.poNo} onChange={set('poNo')} /></label>
          <label>SO no<input value={f.soNo} onChange={set('soNo')} /></label>
          <label>Document date<input type="date" required value={f.documentDate} onChange={set('documentDate')} /></label>
          <label>Credit period (days)<input type="number" min="0" required value={f.creditPeriod} onChange={set('creditPeriod')} /></label>
          <label>Amount (GBP)<input type="number" step="0.01" min="0.01" required value={f.amount} onChange={set('amount')} /></label>
        </div>
        <label>Remarks<input value={f.remarks} onChange={set('remarks')} /></label>
        {due && <div className="muted">Due date: <b>{dmy(due)}</b>. Reminders start once it is overdue.</div>}
        <button className="btn primary">Create invoice</button>
      </form>
    </Modal>
  );
}

function ImportExcel({ onClose, onDone }) {
  const [res, setRes] = useState(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  async function upload(file) {
    if (!file) return;
    setBusy(true); setErr(''); setRes(null);
    const form = new FormData();
    form.append('file', file);
    try { setRes(await api('/invoices/import/excel', { method: 'POST', form })); onDone(); } catch (e) { setErr(e.message); }
    setBusy(false);
  }
  return (
    <Modal title="Import outstanding report" onClose={onClose}>
      <p className="muted">Upload the “UK OS” workbook (.xlsx). Existing invoice numbers are left untouched, so payments you recorded are never overwritten.</p>
      <Msg error={err} />
      <input type="file" accept=".xlsx,.xls" disabled={busy} onChange={(e) => upload(e.target.files[0])} />
      {busy && <div className="muted">Importing…</div>}
      {res && (
        <div className="msg ok">
          Sheet “{res.sheet}”: {res.created} invoices created, {res.skippedExisting} already existed, {res.customersCreated} new customers.
          {res.missingAmount > 0 && <> {res.missingAmount} have no amount in the sheet and need to be completed.</>}
          {res.warnings.map((w) => <div key={w}>{w}</div>)}
        </div>
      )}
    </Modal>
  );
}

function Reminders({ version }) {
  const [plan, setPlan] = useState(null);
  const [logs, setLogs] = useState([]);
  const [force, setForce] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    api(`/dashboard/reminders/preview${force ? '?force=1' : ''}`).then(setPlan).catch((e) => setErr(e.message));
    api('/dashboard/mail-logs').then(setLogs).catch(() => {});
  }, [force]);
  useEffect(() => { load(); }, [load, version]);

  async function run(dryRun) {
    if (!dryRun && !confirm('Send reminder mails now to every customer marked “Will send”?')) return;
    setBusy(true); setErr(''); setMsg('');
    try {
      const r = await api('/dashboard/reminders/run', { method: 'POST', body: { dryRun, force } });
      const n = (s) => r.results.filter((x) => x.status === s).length;
      setMsg(dryRun ? `Dry run: ${n('would-send')} mail(s) would be sent, ${n('skipped')} skipped.` : `Done: ${n('sent') + n('simulated')} mail(s) processed (${n('simulated')} simulated, no SMTP configured), ${n('failed')} failed, ${n('skipped')} skipped.`);
      load();
    } catch (e) { setErr(e.message); }
    setBusy(false);
  }

  return (
    <>
      <Msg error={err} ok={msg} />
      {plan && !plan.active && <div className="banner">Automatic reminders are inactive until <b>{dmy(plan.startDate)}</b> (constant start date). Nothing is sent before then unless forced.</div>}
      <div className="toolbar">
        <button className="btn" disabled={busy} onClick={() => run(true)}>Dry run</button>
        <button className="btn primary" disabled={busy} onClick={() => run(false)}>Send now</button>
        <label className="check"><input type="checkbox" checked={force} onChange={(e) => setForce(e.target.checked)} /> Ignore start date &amp; minimum interval</label>
        <span className="muted">Scheduled run: daily. Customers with all invoices paid are never mailed.</span>
      </div>
      <h3>Customers with overdue invoices</h3>
      <ReminderPlan items={plan?.items} />
      <h3>Mail log</h3>
      <MailLogTable logs={logs} />
    </>
  );
}

function ReminderPlan({ items }) {
  const pager = usePager(items || []);
  if (!items) return null;
  if (!items.length) return <div className="empty">No overdue unpaid invoices.</div>;
  return (
    <>
      <ScrollTable pager={pager} noun="customers"><table>
        <thead><tr><th>Customer</th><th>Email</th><th className="r">Overdue invoices</th><th className="r">Total due</th><th>Next run</th></tr></thead>
        <tbody>{pager.slice.map((i) => (
          <tr key={i.customerCode}>
            <td>{i.customerName}<div className="muted small">{i.customerCode}</div></td>
            <td>{i.email || <span className="muted">-</span>}</td>
            <td className="r">{i.invoiceCount}</td><td className="r"><Money v={i.totalDue} /></td>
            <td>{i.willSend ? <Badge tone="green">Will send</Badge> : <Badge tone="gray">{i.skipReason}</Badge>}</td>
          </tr>))}</tbody>
      </table></ScrollTable>
    </>
  );
}
