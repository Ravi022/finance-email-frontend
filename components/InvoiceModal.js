'use client';
import { useCallback, useEffect, useState } from 'react';
import { api, openInvoiceFile } from '@/lib/api';
import { dmy, dateTime, ymd } from '@/lib/format';
import { InvoiceBadge, Modal, Money, Msg } from './ui';

export default function InvoiceModal({ id, canEdit, onClose, onChanged }) {
  const [inv, setInv] = useState(null);
  const [err, setErr] = useState('');
  const [ok, setOk] = useState('');
  const [pay, setPay] = useState({ amount: '', date: ymd(new Date()), mode: 'Bank transfer', reference: '', note: '' });
  const [edit, setEdit] = useState({ amount: '', creditPeriod: '', poNo: '', soNo: '', remarks: '' });

  const load = useCallback(async () => {
    try {
      const d = await api(`/invoices/${id}`);
      setInv(d);
      setEdit({ amount: d.amount, creditPeriod: d.creditPeriod, poNo: d.poNo, soNo: d.soNo, remarks: d.remarks });
      setPay((p) => ({ ...p, amount: d.outstanding > 0 ? d.outstanding : '' }));
    } catch (e) {
      setErr(e.message);
    }
  }, [id]);
  useEffect(() => { load(); }, [load]);

  async function act(fn, success) {
    setErr(''); setOk('');
    try {
      const d = await fn();
      setInv(d);
      setOk(success);
      onChanged?.();
      setPay((p) => ({ ...p, amount: d.outstanding > 0 ? d.outstanding : '', reference: '', note: '' }));
      setEdit({ amount: d.amount, creditPeriod: d.creditPeriod, poNo: d.poNo, soNo: d.soNo, remarks: d.remarks });
    } catch (e) {
      setErr(e.message);
    }
  }

  const recordPayment = (e) => {
    e.preventDefault();
    act(() => api(`/invoices/${id}/payments`, { method: 'POST', body: pay }), 'Payment recorded. Reminders stop automatically once the invoice is fully paid.');
  };
  const saveDetails = (e) => {
    e.preventDefault();
    act(() => api(`/invoices/${id}`, { method: 'PUT', body: { ...edit, amount: Number(edit.amount), creditPeriod: Number(edit.creditPeriod) } }), 'Invoice updated.');
  };
  const removePayment = (pid) => {
    if (confirm('Remove this payment? The invoice will become outstanding again and reminders may resume.'))
      act(() => api(`/invoices/${id}/payments/${pid}`, { method: 'DELETE' }), 'Payment removed.');
  };
  const upload = (file) => {
    if (!file) return;
    const form = new FormData();
    form.append('file', file);
    act(() => api(`/invoices/${id}/file`, { method: 'POST', form }), 'Invoice PDF attached. It will be included in reminder mails.');
  };

  return (
    <Modal title={inv ? `Invoice ${inv.invoiceNo}` : 'Invoice'} onClose={onClose} wide>
      {!inv ? <Msg error={err} /> : (
        <>
          <Msg error={err} ok={ok} />
          <div className="grid4">
            <Info k="Customer" v={`${inv.customerName} (${inv.customerCode})`} />
            <Info k="PO / SO" v={`${inv.poNo || '-'} / ${inv.soNo || '-'}`} />
            <Info k="Document date" v={dmy(inv.documentDate)} />
            <Info k="Due date" v={`${dmy(inv.dueDate)} (${inv.creditPeriod}d credit)`} />
            <Info k="Ageing" v={`${inv.ageing} days`} />
            <Info k="Overdue" v={inv.overdueDays ? `${inv.overdueDays} days` : 'No'} />
            <Info k="Reminders sent" v={`${inv.reminderCount || 0}${inv.lastReminderAt ? ` (last ${dateTime(inv.lastReminderAt)})` : ''}`} />
            <Info k="Status" v={<InvoiceBadge inv={inv} />} />
          </div>
          <div className="grid3 totals">
            <Info k="Invoice amount" v={<Money v={inv.amount} />} />
            <Info k="Paid" v={<Money v={inv.amountPaid} />} />
            <Info k="Outstanding" v={<b><Money v={inv.outstanding} /></b>} />
          </div>
          {inv.remarks && <p className="note">{inv.remarks}</p>}

          <h3>Payments</h3>
          {inv.payments.length === 0 ? <div className="empty small">No payment received yet.</div> : (
            <div className="table-wrap"><table>
              <thead><tr><th>Date</th><th className="r">Amount</th><th>Mode</th><th>Reference</th><th>Recorded by</th>{canEdit && <th />}</tr></thead>
              <tbody>{inv.payments.map((p) => (
                <tr key={p._id}>
                  <td>{dmy(p.date)}</td><td className="r"><Money v={p.amount} /></td><td>{p.mode}</td>
                  <td>{p.reference || p.note || '-'}</td><td className="muted small">{p.recordedBy}</td>
                  {canEdit && <td><button className="btn ghost danger" onClick={() => removePayment(p._id)}>Remove</button></td>}
                </tr>))}</tbody>
            </table></div>
          )}

          {canEdit && inv.outstanding > 0 && inv.amount > 0 && (
            <form className="panel" onSubmit={recordPayment}>
              <h3>Record payment received</h3>
              <div className="grid4">
                <label>Amount (GBP)<input type="number" step="0.01" min="0.01" max={inv.outstanding} required value={pay.amount} onChange={(e) => setPay({ ...pay, amount: e.target.value })} /></label>
                <label>Received on<input type="date" required value={pay.date} onChange={(e) => setPay({ ...pay, date: e.target.value })} /></label>
                <label>Mode<select value={pay.mode} onChange={(e) => setPay({ ...pay, mode: e.target.value })}><option>Bank transfer</option><option>Cheque</option><option>Card</option><option>Other</option></select></label>
                <label>Reference<input value={pay.reference} onChange={(e) => setPay({ ...pay, reference: e.target.value })} /></label>
              </div>
              <button className="btn primary">Save payment</button>
            </form>
          )}

          {canEdit && (
            <>
              <form className="panel" onSubmit={saveDetails}>
                <h3>Edit invoice</h3>
                <div className="grid4">
                  <label>Invoice amount (GBP)<input type="number" step="0.01" min="0" value={edit.amount} onChange={(e) => setEdit({ ...edit, amount: e.target.value })} /></label>
                  <label>Credit period (days)<input type="number" min="0" value={edit.creditPeriod} onChange={(e) => setEdit({ ...edit, creditPeriod: e.target.value })} /></label>
                  <label>PO no<input value={edit.poNo} onChange={(e) => setEdit({ ...edit, poNo: e.target.value })} /></label>
                  <label>SO no<input value={edit.soNo} onChange={(e) => setEdit({ ...edit, soNo: e.target.value })} /></label>
                </div>
                <label>Remarks<input value={edit.remarks} onChange={(e) => setEdit({ ...edit, remarks: e.target.value })} /></label>
                <button className="btn">Save changes</button>
              </form>
              <div className="panel">
                <h3>Invoice copy (PDF)</h3>
                <div className="row">
                  {inv.hasFile && <button className="btn" onClick={() => openInvoiceFile(id).catch((e) => setErr(e.message))}>View attached PDF</button>}
                  <input type="file" accept="application/pdf" onChange={(e) => upload(e.target.files[0])} />
                </div>
                <div className="muted small">Attached to reminder mails for this invoice.</div>
              </div>
            </>
          )}
          {!canEdit && inv.hasFile && <button className="btn" onClick={() => openInvoiceFile(id).catch((e) => setErr(e.message))}>View invoice PDF</button>}
        </>
      )}
    </Modal>
  );
}

const Info = ({ k, v }) => (
  <div className="info"><div className="muted small">{k}</div><div>{v}</div></div>
);
