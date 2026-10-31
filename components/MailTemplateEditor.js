'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Msg } from './ui';

const FIELDS = [
  ['subject', 'Subject', 2],
  ['greeting', 'Greeting', 2],
  ['intro', 'Opening paragraph', 4],
  ['paymentInstructions', 'Payment instructions', 3],
  ['closing', 'Closing paragraph', 3],
  ['signOff', 'Sign-off', 3],
  ['company', 'Company name', 1],
];

export default function MailTemplateEditor() {
  const [form, setForm] = useState(null);
  const [preview, setPreview] = useState(null);
  const [placeholders, setPlaceholders] = useState([]);
  const [err, setErr] = useState('');
  const [ok, setOk] = useState('');
  const [busy, setBusy] = useState(false);

  const apply = (d) => {
    setForm({
      subject: d.template.subject,
      greeting: d.template.greeting,
      intro: d.template.intro,
      paymentInstructions: d.template.paymentInstructions,
      closing: d.template.closing,
      signOff: d.template.signOff,
      company: d.template.company,
    });
    setPreview(d.preview);
    setPlaceholders(d.template.placeholders || []);
  };

  useEffect(() => {
    api('/dashboard/mail-template').then(apply).catch((e) => setErr(e.message));
  }, []);

  useEffect(() => {
    if (!form) return undefined;
    const t = setTimeout(() => {
      api('/dashboard/mail-template/preview', { method: 'POST', body: form })
        .then((d) => setPreview(d.preview))
        .catch(() => {});
    }, 280);
    return () => clearTimeout(t);
  }, [form]);

  async function save(reset) {
    setBusy(true);
    setErr('');
    setOk('');
    try {
      const d = await api('/dashboard/mail-template', { method: 'PUT', body: reset ? { reset: true } : form });
      apply(d);
      setOk(reset ? 'Template restored to the default wording.' : 'Template saved. The next reminder run will use this text.');
    } catch (e) {
      setErr(e.message);
    }
    setBusy(false);
  }

  if (!form) return err ? <Msg error={err} /> : <div className="muted">Loading template…</div>;

  return (
    <>
      <div className="page-head">
        <div>
          <h2 style={{ margin: 0 }}>Reminder mail template</h2>
          <p className="page-lead">Change the wording sent to customers. The invoice table is filled in automatically. Use tokens such as {'{{customerName}}'} and they will be replaced when the mail is sent.</p>
        </div>
        <div className="row">
          <button className="btn" disabled={busy} onClick={() => save(true)}>Reset to default</button>
          <button className="btn primary" disabled={busy} onClick={() => save(false)}>{busy ? 'Saving…' : 'Save template'}</button>
        </div>
      </div>
      <Msg error={err} ok={ok} />
      <div className="help-tokens muted small">
        Tokens: {placeholders.map((p) => <span key={p} className="token">{p}</span>)}
      </div>
      <div className="mail-editor">
        <div className="card mail-fields">
          {FIELDS.map(([key, label, rows]) => (
            <label key={key}>
              {label}
              {rows === 1 || key === 'subject' || key === 'greeting' || key === 'company' ? (
                <input value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} />
              ) : (
                <textarea rows={rows} value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} />
              )}
            </label>
          ))}
        </div>
        <div className="mail-preview">
          <div className="mail-preview-meta">
            <div className="stat-label">Live preview</div>
            <div className="small" style={{ marginTop: 6 }}><span className="muted">Subject</span><div><b>{preview?.subject}</b></div></div>
          </div>
          <div className="mail-preview-pane" dangerouslySetInnerHTML={{ __html: preview?.html || '' }} />
          <div className="muted small" style={{ marginTop: 10 }}>Preview uses sample invoices. Save to apply this wording to the next reminder run.</div>
        </div>
      </div>
    </>
  );
}
