'use client';
import { useMemo, useState } from 'react';
import { dmy } from '@/lib/format';
import { InvoiceBadge, Money } from './ui';
import { ScrollTable, usePager } from './Pagination';

const DATES = new Set(['documentDate', 'dueDate']);

export default function InvoiceTable({ invoices, onOpen, showCustomer = true }) {
  const [sort, setSort] = useState(null);
  const rows = useMemo(() => {
    if (!sort) return invoices;
    const val = (i) => (DATES.has(sort.key) ? new Date(i[sort.key]).getTime() : i[sort.key]);
    return [...invoices].sort((a, b) => {
      const x = val(a);
      const y = val(b);
      const c = typeof x === 'number' && typeof y === 'number' ? x - y : String(x ?? '').localeCompare(String(y ?? ''), undefined, { numeric: true });
      return c * sort.dir;
    });
  }, [invoices, sort]);
  const pager = usePager(rows);

  const toggle = (key) => setSort((s) => (s && s.key === key ? { key, dir: -s.dir } : { key, dir: 1 }));
  const Th = ({ k, children, right }) => (
    <th
      className={`sortable${right ? ' r' : ''}`}
      aria-sort={sort?.key === k ? (sort.dir === 1 ? 'ascending' : 'descending') : 'none'}
    >
      <button type="button" onClick={() => toggle(k)}>
        {children}
        <span className="arrow">{sort?.key === k ? (sort.dir === 1 ? '▲' : '▼') : '↕'}</span>
      </button>
    </th>
  );

  if (!invoices.length) return <div className="empty">No invoices match.</div>;
  return (
    <ScrollTable pager={pager} noun="invoices">
        <table>
          <thead>
            <tr>
              {showCustomer && <Th k="customerName">Customer</Th>}
              <Th k="invoiceNo">Invoice No</Th>
              <th>PO / SO</th>
              <Th k="documentDate">Doc date</Th>
              <Th k="dueDate">Due date</Th>
              <Th k="ageing" right>Ageing</Th>
              <Th k="creditPeriod" right>Credit</Th>
              <Th k="overdueDays" right>Overdue</Th>
              <Th k="amount" right>Amount</Th>
              <Th k="amountPaid" right>Paid</Th>
              <Th k="outstanding" right>Outstanding</Th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {pager.slice.map((i) => (
              <tr key={i._id} className="click" onClick={() => onOpen(i)}>
                {showCustomer && (
                  <td>
                    <div>{i.customerName}</div>
                    <div className="muted small">{i.customerCode}</div>
                  </td>
                )}
                <td className="mono">{i.invoiceNo}</td>
                <td>
                  {i.poNo || '-'}
                  <div className="muted small">{i.soNo || ''}</div>
                </td>
                <td>{dmy(i.documentDate)}</td>
                <td>{dmy(i.dueDate)}</td>
                <td className="r">{i.ageing}</td>
                <td className="r">{i.creditPeriod}</td>
                <td className="r">{i.overdueDays || '-'}</td>
                <td className="r"><Money v={i.amount} /></td>
                <td className="r"><Money v={i.amountPaid} /></td>
                <td className="r"><b><Money v={i.outstanding} /></b></td>
                <td><InvoiceBadge inv={i} /></td>
              </tr>
            ))}
          </tbody>
        </table>
    </ScrollTable>
  );
}
