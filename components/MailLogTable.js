'use client';
import { dateTime } from '@/lib/format';
import { Badge, Money } from './ui';

const tone = { sent: 'green', simulated: 'amber', failed: 'red' };

export default function MailLogTable({ logs }) {
  if (!logs.length) return <div className="empty">No reminder mails sent yet.</div>;
  return (
    <div className="table-wrap">
      <table>
        <thead><tr><th>When</th><th>Customer</th><th>To</th><th>Invoices</th><th className="r">Total due</th><th>Trigger</th><th>Status</th></tr></thead>
        <tbody>
          {logs.map((l) => (
            <tr key={l._id}>
              <td>{dateTime(l.createdAt)}</td>
              <td>{l.customerName}<div className="muted small">{l.customerCode}</div></td>
              <td>{l.to}</td>
              <td className="wrap">{l.invoiceNos.join(', ')}</td>
              <td className="r"><Money v={l.totalDue} /></td>
              <td>{l.trigger}</td>
              <td><Badge tone={tone[l.status]}>{l.status}</Badge>{l.error && <div className="muted small">{l.error}</div>}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
