// Display currency. Stored amounts are always GBP; INR is converted with a fixed rate from the server.
let currency = 'GBP';
let rate = 1;
export const setCurrency = (c, r) => { currency = c; rate = r; };

export const gbp = (n) =>
  currency === 'INR'
    ? '₹' + (Number(n || 0) * rate).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : '£' + Number(n || 0).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const dmy = (d) => (d ? new Date(d).toISOString().slice(0, 10).split('-').reverse().join('/') : '-');
export const ymd = (d) => (d ? new Date(d).toISOString().slice(0, 10) : '');
export const dateTime = (d) =>
  d ? new Date(d).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' }) : '-';

export function invoiceState(i) {
  if (i.paymentStatus === 'AmountMissing') return { label: 'Amount missing', tone: 'gray' };
  if (i.paymentStatus === 'Paid') return { label: 'Paid', tone: 'green' };
  if (i.overdueDays > 0) return { label: `Overdue ${i.overdueDays}d`, tone: 'red' };
  if (i.paymentStatus === 'Partial') return { label: 'Partial', tone: 'amber' };
  return { label: i.daysToDue === 0 ? 'Due today' : `Due in ${i.daysToDue}d`, tone: 'blue' };
}
