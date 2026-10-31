'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api';
import { dateTime } from '@/lib/format';
import Shell, { useAuth } from '@/components/Shell';
import InvoiceTable from '@/components/InvoiceTable';
import InvoiceModal from '@/components/InvoiceModal';
import MailLogTable from '@/components/MailLogTable';
import { Badge, Msg, Stat } from '@/components/ui';
import { gbp } from '@/lib/format';

export default function CustomerDrilldown() {
  const user = useAuth('admin');
  const { code } = useParams();
  const [d, setD] = useState(null);
  const [err, setErr] = useState('');
  const [openId, setOpenId] = useState(null);
  const [show, setShow] = useState('open');

  useEffect(() => {
    if (user) api(`/customers/${encodeURIComponent(code)}`).then(setD).catch((e) => setErr(e.message));
  }, [user, code]);

  const invoices = d ? d.invoices.filter((i) => (show === 'open' ? i.outstanding > 0 && i.amount > 0 : show === 'paid' ? i.paymentStatus === 'Paid' : true)) : [];
  const c = d?.customer;

  return (
    <Shell user={user} title="Management overview">
      <Link href="/admin">← Back to dashboard</Link>
      <Msg error={err} />
      {c && (
        <>
          <div className="row between" style={{ margin: '10px 0 14px' }}>
            <div>
              <h1>{c.name}</h1>
              <div className="muted">Code {c.code} · {c.email || <Badge tone="red">No email on file</Badge>} · Reminders {c.reminderEnabled ? 'on' : 'off'}
                {c.lastReminderAt && <> · last reminder {dateTime(c.lastReminderAt)}</>}</div>
            </div>
          </div>
          <div className="grid4">
            <Stat label="Outstanding" value={gbp(c.outstanding)} sub={`${c.openCount} open invoices`} />
            <Stat label="Overdue" value={gbp(c.overdueAmount)} sub={`${c.overdueCount} invoices, up to ${c.maxOverdueDays} days`} tone="red" />
            <Stat label="Paid" value={gbp(c.totalPaid)} sub={`of ${gbp(c.totalInvoiced)} invoiced`} tone="green" />
            <Stat label="Invoices" value={c.invoiceCount} sub={c.missingAmountCount ? `${c.missingAmountCount} without amount` : 'all have amounts'} />
          </div>
          <div className="toolbar" style={{ marginTop: 16 }}>
            <h2 style={{ margin: 0 }}>Invoices</h2>
            <select value={show} onChange={(e) => setShow(e.target.value)}>
              <option value="open">Outstanding</option><option value="paid">Paid</option><option value="all">All</option>
            </select>
          </div>
          <InvoiceTable invoices={invoices} showCustomer={false} onOpen={(i) => setOpenId(i._id)} />
          <h2 style={{ marginTop: 20 }}>Reminder mails sent</h2>
          <MailLogTable logs={d.mails} />
        </>
      )}
      {openId && <InvoiceModal id={openId} canEdit={false} onClose={() => setOpenId(null)} />}
    </Shell>
  );
}
