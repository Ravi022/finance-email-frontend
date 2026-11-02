/** Convert using USD-base rates. */
export function convert(amount, from, to, rates) {
  const f = String(from || '').toUpperCase();
  const t = String(to || '').toUpperCase();
  if (f === t) return Number(amount) || 0;
  const fromRate = rates?.[f];
  const toRate = rates?.[t];
  if (!fromRate || !toRate) return null;

  const n = Number(amount) || 0;
  const usd = f === 'USD' ? n : n / fromRate;
  const out = t === 'USD' ? usd : usd * toRate;
  return Math.round(out * 100) / 100;
}
