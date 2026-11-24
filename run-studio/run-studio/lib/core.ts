export type Pt = { la: number; lo: number; el: number; hr: number; t: number; d: number };
export type Sum = { id: string; name: string; type: string; date: number; dist: number; time: number; hr: number; el: number; src: 'strava' | 'gpx' };
export type Split = { km: number | string; s: number; part?: boolean };
export type Act = Sum & { pts: Pt[]; maxhr: number; cal: number; pace: number; splits: Split[] };

export const TL: Record<string, string> = { Run: 'Running', TrailRun: 'Trail Running', Walk: 'Walking' };
const rad = Math.PI / 180, R = 6371000;
export const hav = (a: Pt, b: Pt) => {
  const x = Math.sin((b.la - a.la) * rad / 2) ** 2 + Math.cos(a.la * rad) * Math.cos(b.la * rad) * Math.sin((b.lo - a.lo) * rad / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
};
export const pace = (s: number) => isFinite(s) && s > 0 ? Math.floor(s / 60) + ':' + String(Math.round(s % 60)).padStart(2, '0') : '-';
export const tm = (s: number) => {
  s = Math.round(s); const h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60);
  return (h ? h + ':' : '') + String(m).padStart(h ? 2 : 1, '0') + ':' + String(s % 60).padStart(2, '0');
};

export function splits(dist: number, time: number, p: Pt[]): Split[] {
  const o: Split[] = []; let k = 1, last = 0;
  for (let i = 1; i < p.length; i++) {
    while (p[i].d >= k * 1000) {
      const f = (k * 1000 - p[i - 1].d) / (p[i].d - p[i - 1].d || 1);
      const t = p[i - 1].t + f * (p[i].t - p[i - 1].t) - p[0].t;
      o.push({ km: k, s: t - last }); last = t; k++;
    }
  }
  const rem = dist - (k - 1) * 1000;
  if (rem > 50) o.push({ km: (rem / 1000).toFixed(2), s: (time - last) / rem * 1000, part: true });
  return o;
}

export function build(id: string, name: string, type: string, pts: Pt[], src: 'strava' | 'gpx', cal = 0): Act {
  let d = 0, el = 0;
  pts.forEach((p, i) => { if (i) { d += hav(pts[i - 1], p); if (p.el > pts[i - 1].el) el += p.el - pts[i - 1].el; } p.d = d; });
  const time = pts[pts.length - 1].t - pts[0].t, hrs = pts.filter(p => p.hr).map(p => p.hr);
  return {
    id, name, type, date: pts[0].t * 1000, src, pts, dist: d, time, el: Math.round(el),
    hr: hrs.length ? Math.round(hrs.reduce((x, y) => x + y) / hrs.length) : 0, maxhr: hrs.length ? Math.max(...hrs) : 0,
    cal: cal || Math.round(65 * d / 1000 * (type === 'Walk' ? .55 : 1)), pace: time / (d / 1000), splits: splits(d, time, pts)
  };
}

export function parseGPX(txt: string, fn: string): Act {
  const x = new DOMParser().parseFromString(txt, 'application/xml'), pts: Pt[] = [];
  x.querySelectorAll('trkpt').forEach(e => {
    const g = (n: string) => { const q = Array.from(e.getElementsByTagName('*')).find(z => z.localName === n); return q ? +(q.textContent || 0) : 0; };
    const ti = e.getElementsByTagName('time')[0];
    pts.push({ la: +e.getAttribute('lat')!, lo: +e.getAttribute('lon')!, el: g('ele'), hr: g('hr'), t: ti ? Date.parse(ti.textContent!) / 1000 : pts.length * 3, d: 0 });
  });
  if (pts.length < 2) throw new Error('gpx');
  const nm = x.querySelector('trk > name, metadata > name');
  return build('g' + Date.now(), nm?.textContent || fn.replace(/\.gpx$/i, ''), 'Run', pts, 'gpx');
}
