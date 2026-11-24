import { Act, TL, pace, tm } from './core';

export const TH: Record<string, any> = {
  minimal: { n: 'Minimalist', bg: '#f5f5f2', fg: '#111', ac: '#111', rt: '#e8432d', f: 'Helvetica,Arial,sans-serif', w: '700' },
  sporty: { n: 'Sporty', bg: '#0b1b3a', fg: '#fff', ac: '#ffd200', rt: '#ffd200', f: 'Impact,"Arial Black",sans-serif', w: '900', it: 'italic ' },
  cyber: { n: 'Cyberpunk', bg: '#0a0014', fg: '#e8faff', ac: '#00f0ff', rt: '#ff2bd6', f: '"Courier New",monospace', w: '700', glow: 1 },
  premium: { n: 'Premium', bg: '#0c0c0c', fg: '#efe6d2', ac: '#c9a85c', rt: '#c9a85c', f: 'Georgia,"Times New Roman",serif', w: '400' },
  retro: { n: 'Retro', bg: '#f2e3c6', fg: '#4a2410', ac: '#d9531e', rt: '#d9531e', f: '"Courier New",monospace', w: '700' }
};

function proj(pts: any[], w: number, h: number, pad: number) {
  let a = 1e9, b = -1e9, c = 1e9, e = -1e9;
  pts.forEach(p => { a = Math.min(a, p.la); b = Math.max(b, p.la); c = Math.min(c, p.lo); e = Math.max(e, p.lo); });
  const k = Math.cos((a + b) / 2 * Math.PI / 180), dx = (e - c) * k || 1e-6, dy = (b - a) || 1e-6;
  const s = Math.min((w - 2 * pad) / dx, (h - 2 * pad) / dy), ox = (w - dx * s) / 2, oy = (h - dy * s) / 2;
  return (p: any) => [ox + (p.lo - c) * k * s, h - oy - (p.la - a) * s];
}

export function route(c: CanvasRenderingContext2D, a: Act, t: any, x: number, y: number, w: number, h: number, pr: number, bare?: boolean) {
  const f = proj(a.pts, w, h, 30), n = a.pts.length - 1, to = Math.floor(pr * n);
  const line = (upTo: number) => { c.beginPath(); for (let i = 0; i <= upTo; i++) { const [u, v] = f(a.pts[i]); i ? c.lineTo(u + x, v + y) : c.moveTo(u + x, v + y); } c.stroke(); };
  c.lineJoin = c.lineCap = 'round';
  c.strokeStyle = t.fg; c.globalAlpha = bare ? .18 : .25; c.lineWidth = 5; line(n); c.globalAlpha = 1;
  c.strokeStyle = t.rt; c.lineWidth = 8; if (t.glow) { c.shadowColor = t.rt; c.shadowBlur = 24; } line(to); c.shadowBlur = 0;
  const dot = (p: any, col: string, r: number) => { const [u, v] = f(p); c.fillStyle = col; c.beginPath(); c.arc(u + x, v + y, r, 0, 7); c.fill(); };
  dot(a.pts[0], '#2ecc71', 13); dot(a.pts[n], pr >= 1 ? '#e74c3c' : t.bg, 13);
  if (pr < 1) { c.shadowColor = t.rt; c.shadowBlur = 30; dot(a.pts[to], '#fff', 11); c.shadowBlur = 0; }
  c.fillStyle = t.fg; c.font = '700 20px ' + t.f;
  const s0 = f(a.pts[0]); c.fillText('START', s0[0] + x + 18, s0[1] + y + 6);
  if (pr >= 1) { const s1 = f(a.pts[n]); c.fillText('FINISH', s1[0] + x + 18, s1[1] + y + 6); }
}

function bgd(c: CanvasRenderingContext2D, t: any, W: number, H: number, k: string) {
  c.fillStyle = t.bg; c.fillRect(0, 0, W, H);
  if (k === 'sporty') { const g = c.createLinearGradient(0, 0, W, H); g.addColorStop(0, '#0b1b3a'); g.addColorStop(1, '#1d4fb8'); c.fillStyle = g; c.fillRect(0, 0, W, H); c.fillStyle = 'rgba(255,210,0,.9)'; c.beginPath(); c.moveTo(0, H * .7); c.lineTo(W, H * .55); c.lineTo(W, H * .58); c.lineTo(0, H * .73); c.fill(); }
  if (k === 'cyber') { c.strokeStyle = 'rgba(0,240,255,.12)'; c.lineWidth = 1; for (let i = 0; i < W; i += 60) { c.beginPath(); c.moveTo(i, 0); c.lineTo(i, H); c.stroke(); } for (let j = 0; j < H; j += 60) { c.beginPath(); c.moveTo(0, j); c.lineTo(W, j); c.stroke(); } c.strokeStyle = '#ff2bd6'; c.lineWidth = 3; c.strokeRect(30, 30, W - 60, H - 60); }
  if (k === 'premium') { const g = c.createRadialGradient(W / 2, H * .4, 50, W / 2, H * .4, W); g.addColorStop(0, '#232323'); g.addColorStop(1, '#050505'); c.fillStyle = g; c.fillRect(0, 0, W, H); c.strokeStyle = t.ac; c.lineWidth = 2; c.strokeRect(36, 36, W - 72, H - 72); c.strokeRect(46, 46, W - 92, H - 92); }
  if (k === 'retro') { ['#e8a33d', '#d9531e', '#a8321a'].forEach((s, i) => { c.fillStyle = s; c.fillRect(0, H - (i + 1) * 14 - 30, W, 10); }); c.strokeStyle = t.fg; c.lineWidth = 6; c.strokeRect(24, 24, W - 48, H - 48); }
}

export function poster(cv: HTMLCanvasElement, a: Act, k: string) {
  const t = TH[k], c = cv.getContext('2d')!, W = (cv.width = 1080), H = (cv.height = 1350);
  bgd(c, t, W, H, k);
  c.fillStyle = t.fg; c.textBaseline = 'alphabetic';
  c.font = (t.it || '') + t.w + ' 70px ' + t.f;
  let nm = a.name.toUpperCase(); if (nm.length > 22) nm = nm.slice(0, 21) + '…';
  c.fillText(nm, 70, 150);
  c.font = '28px ' + t.f; c.fillStyle = t.ac;
  c.fillText(new Date(a.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }).toUpperCase() + '  ·  ' + TL[a.type]?.toUpperCase(), 70, 200);
  route(c, a, t, 90, 230, 900, 640, 1, true);
  const km = (a.dist / 1000).toFixed(2);
  c.fillStyle = t.fg; c.font = (t.it || '') + t.w + ' 150px ' + t.f; c.fillText(km, 70, 1040);
  const wd = c.measureText(km).width;
  c.font = '40px ' + t.f; c.fillStyle = t.ac; c.fillText('KILOMETER', 70 + wd + 20, 1040);
  const S = [['WAKTU', tm(a.time)], ['PACE', pace(a.pace) + '/km'], ['HR AVG', a.hr || '-'], ['KALORI', a.cal + ' kcal'], ['ELEVASI', a.el + ' m'], ['HR MAX', a.maxhr || '-']];
  S.forEach((s, i) => {
    const x = 70 + i % 3 * 330, y = 1130 + Math.floor(i / 3) * 110;
    c.fillStyle = t.ac; c.font = '22px ' + t.f; c.fillText(String(s[0]), x, y);
    c.fillStyle = t.fg; c.font = (t.it || '') + t.w + ' 44px ' + t.f; c.fillText(String(s[1]), x, y + 48);
  });
}

export function frame(cv: HTMLCanvasElement, a: Act, k: string, p: number) {
  const t = TH[k], c = cv.getContext('2d')!, W = cv.width, H = cv.height;
  bgd(c, t, W, H, k); route(c, a, t, 40, 20, W - 80, H - 260, p);
  const q = a.pts[Math.min(a.pts.length - 1, Math.floor(p * (a.pts.length - 1)))];
  c.fillStyle = t.fg; c.font = (t.it || '') + t.w + ' 56px ' + t.f; c.fillText((q.d / 1000).toFixed(2) + ' km', 60, H - 150);
  c.fillStyle = t.ac; c.font = '34px ' + t.f; c.fillText(tm(q.t - a.pts[0].t) + '   ' + (q.hr ? q.hr + ' bpm' : ''), 60, H - 90);
  c.font = '28px ' + t.f; c.fillText(a.name.toUpperCase().slice(0, 28), 60, H - 40);
}

export function chart(cv: HTMLCanvasElement, a: Act) {
  const c = cv.getContext('2d')!, W = (cv.width = 900), H = (cv.height = 240), p = a.pts, n = p.length;
  const P: number[][] = [], Hs: number[][] = [];
  for (let i = 0; i < n; i += Math.max(1, Math.floor(n / 150))) {
    const j = Math.max(0, i - 8), k = Math.min(n - 1, i + 8), dd = p[k].d - p[j].d;
    P.push([p[i].d, dd > 1 ? Math.min(900, Math.max(150, (p[k].t - p[j].t) / dd * 1000)) : 0]); Hs.push([p[i].d, p[i].hr]);
  }
  const ln = (s: number[][], lo: number, hi: number, col: string, inv?: boolean) => {
    c.strokeStyle = col; c.lineWidth = 2.5; c.beginPath(); let f = 0;
    s.forEach(([d, v]) => { if (!v) return; const x = 40 + d / a.dist * (W - 60), y = 20 + (inv ? (v - lo) / (hi - lo) : 1 - (v - lo) / (hi - lo)) * (H - 50); f ? c.lineTo(x, y) : c.moveTo(x, y); f = 1; });
    c.stroke();
  };
  const pv = P.map(z => z[1]).filter(Boolean), hv = Hs.map(z => z[1]).filter(Boolean);
  if (!pv.length) return;
  ln(P, Math.min(...pv), Math.max(...pv), '#fc4c02', true);
  if (hv.length) ln(Hs, Math.min(...hv) - 5, Math.max(...hv) + 5, '#e0245e');
  c.font = '13px sans-serif'; c.fillStyle = '#fc4c02'; c.fillText('Pace (atas = cepat) ' + pace(Math.min(...pv)) + ' – ' + pace(Math.max(...pv)), 44, H - 8);
  if (hv.length) { c.fillStyle = '#e0245e'; c.fillText('HR ' + Math.min(...hv) + '–' + Math.max(...hv) + ' bpm', 360, H - 8); }
}
