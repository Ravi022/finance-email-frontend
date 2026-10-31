const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
const KEY = 'fe_session';

export function getSession() {
  try {
    return JSON.parse(localStorage.getItem(KEY) || 'null');
  } catch {
    return null;
  }
}
export const setSession = (s) => localStorage.setItem(KEY, JSON.stringify(s));
export const clearSession = () => localStorage.removeItem(KEY);

async function request(path, { method = 'GET', body, form } = {}) {
  const session = getSession();
  const headers = {};
  if (session?.token) headers.Authorization = `Bearer ${session.token}`;
  if (body) headers['Content-Type'] = 'application/json';
  const res = await fetch(`${API}${path}`, { method, headers, body: form || (body ? JSON.stringify(body) : undefined) });
  if (res.status === 401 && session) {
    clearSession();
    window.location.href = '/login';
    throw new Error('Session expired');
  }
  return res;
}

export async function api(path, opts) {
  const res = await request(path, opts);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

export async function openInvoiceFile(id) {
  const res = await request(`/invoices/${id}/file`);
  if (!res.ok) throw new Error('Invoice file not available');
  window.open(URL.createObjectURL(await res.blob()), '_blank');
}
