import { Sum } from './core';

export type Period = 'week' | 'month' | 'year';
export type Bucket = { start: Date; end: Date; items: Sum[] };

/** Awal periode (minggu dimulai hari Senin, zona waktu perangkat). */
export function startOf(t: number | Date, p: Period) {
  const d = new Date(t);
  if (p === 'year') return new Date(d.getFullYear(), 0, 1);
  if (p === 'month') return new Date(d.getFullYear(), d.getMonth(), 1);
  const s = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  s.setDate(s.getDate() - ((s.getDay() + 6) % 7));
  return s;
}
const shift = (s: Date, p: Period, k: number) =>
  p === 'year' ? new Date(s.getFullYear() + k, 0, 1) : p === 'month' ? new Date(s.getFullYear(), s.getMonth() + k, 1) : new Date(s.getFullYear(), s.getMonth(), s.getDate() + 7 * k);

/** Deret periode berurutan sampai periode berjalan: 12 minggu, 12 bulan, atau semua tahun (maks 8). */
export function buckets(items: Sum[], p: Period): Bucket[] {
  const cur = startOf(Date.now(), p), out: Bucket[] = [];
  const first = items.length ? new Date(Math.min(...items.map(i => i.date))).getFullYear() : cur.getFullYear();
  const count = p === 'year' ? Math.max(2, Math.min(8, cur.getFullYear() - first + 1)) : 12;
  let s = cur;
  for (let i = 0; i < count; i++) { out.unshift({ start: s, end: shift(s, p, 1), items: [] }); s = shift(s, p, -1); }
  items.forEach(it => { const b = out.find(b => it.date >= +b.start && it.date < +b.end); if (b) b.items.push(it); });
  return out;
}

const M = (d: Date, o: Intl.DateTimeFormatOptions) => d.toLocaleDateString('id-ID', o);
export function label(s: Date, p: Period) {
  if (p === 'year') return String(s.getFullYear());
  if (p === 'month') return M(s, { month: 'short' }) + ' ' + String(s.getFullYear()).slice(2);
  return M(s, { day: 'numeric', month: 'short' });
}
export function range(b: Bucket, p: Period) {
  if (p === 'year') return String(b.start.getFullYear());
  if (p === 'month') return M(b.start, { month: 'long', year: 'numeric' });
  const e = new Date(+b.end - 864e5);
  return `${M(b.start, { day: 'numeric', month: 'short' })} – ${M(e, { day: 'numeric', month: 'short', year: 'numeric' })}`;
}

export function summary(items: Sum[]) {
  const dist = items.reduce((s, a) => s + a.dist, 0), time = items.reduce((s, a) => s + a.time, 0);
  const hr = items.filter(a => a.hr), ht = hr.reduce((s, a) => s + a.time, 0);
  const fast = items.filter(a => a.dist >= 3000).map(a => a.time / (a.dist / 1000));
  return {
    n: items.length, dist, time, el: items.reduce((s, a) => s + a.el, 0),
    pace: dist ? time / (dist / 1000) : 0,
    hr: ht ? Math.round(hr.reduce((s, a) => s + a.hr * a.time, 0) / ht) : 0,
    longest: items.length ? Math.max(...items.map(a => a.dist)) : 0,
    best: fast.length ? Math.min(...fast) : 0
  };
}

export const dur = (s: number) => {
  const h = Math.floor(s / 3600), m = Math.round(s % 3600 / 60);
  return h ? `${h} j ${m} m` : `${m} m`;
};
