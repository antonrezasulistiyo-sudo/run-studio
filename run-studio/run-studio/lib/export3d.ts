import maplibregl from 'maplibre-gl';
import { Act, pace, tm } from './core';
import { PIT, follow, setProgress, setupLayers, styleUrl } from './mapcore';
import { encodeMp4 } from './mp4';

const rr = (c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number, fill: string) => {
  c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
  c.fillStyle = fill; c.fill();
};

/** Overlay statistik: kartu jarak/waktu/pace/HR, profil elevasi, dan bar progres. */
function makeHud(a: Act, W: number, H: number, vertical: boolean) {
  const u = Math.min(W, H) / 1080, P = a.pts, n = P.length, F = 'system-ui,-apple-system,Segoe UI,sans-serif';
  const els = P.map(p => p.el), mn = Math.min(...els), mx = Math.max(...els), span = (mx - mn) || 1;
  const prof: number[][] = [], step = Math.max(1, Math.floor(n / 160));
  for (let i = 0; i < n; i += step) prof.push([P[i].d / a.dist, (P[i].el - mn) / span]);
  return (c: CanvasRenderingContext2D, p: number) => {
    const i = Math.min(n - 1, Math.round(p * (n - 1))), q = P[i], j = Math.max(0, i - 10), k = Math.min(n - 1, i + 10);
    const dd = P[k].d - P[j].d, pc = dd > 1 ? (P[k].t - P[j].t) / dd * 1000 : 0;
    const pw = 540 * u, ph = 230 * u, px = 48 * u, py = H - 62 * u - ph;
    rr(c, px, py, pw, ph, 22 * u, 'rgba(8,10,14,.62)');
    c.textBaseline = 'alphabetic';
    c.fillStyle = 'rgba(255,255,255,.7)'; c.font = `600 ${26 * u}px ${F}`; c.fillText(a.name.slice(0, 30), px + 28 * u, py + 44 * u);
    const kt = (q.d / 1000).toFixed(2); c.fillStyle = '#fff'; c.font = `800 ${96 * u}px ${F}`; c.fillText(kt, px + 28 * u, py + 138 * u);
    const w = c.measureText(kt).width; c.font = `600 ${32 * u}px ${F}`; c.fillStyle = '#fc4c02'; c.fillText('km', px + 38 * u + w, py + 138 * u);
    c.fillStyle = '#fff'; c.font = `600 ${30 * u}px ${F}`;
    c.fillText(`${tm(q.t - P[0].t)}    ${pace(pc)}/km${q.hr ? '    ' + q.hr + ' bpm' : ''}`, px + 28 * u, py + 196 * u);
    const fw = vertical ? W - 96 * u : 520 * u, fh = 120 * u, fx = vertical ? 48 * u : W - 48 * u - fw, fy = vertical ? py - 24 * u - fh : H - 62 * u - fh;
    rr(c, fx, fy, fw, fh, 18 * u, 'rgba(8,10,14,.62)');
    const X = (d: number) => fx + 16 * u + d * (fw - 32 * u), Y = (e: number) => fy + fh - 16 * u - e * (fh - 32 * u);
    c.beginPath(); prof.forEach(([x, y], t) => (t ? c.lineTo(X(x), Y(y)) : c.moveTo(X(x), Y(y))));
    c.strokeStyle = 'rgba(255,255,255,.85)'; c.lineWidth = 3 * u; c.lineJoin = 'round'; c.stroke();
    c.beginPath(); c.arc(X(q.d / a.dist), Y((q.el - mn) / span), 8 * u, 0, 7); c.fillStyle = '#fc4c02'; c.fill();
    c.fillStyle = 'rgba(255,255,255,.2)'; c.fillRect(0, H - 8 * u, W, 8 * u); c.fillStyle = '#fc4c02'; c.fillRect(0, H - 8 * u, W * p, 8 * u);
  };
}

const settle = (m: maplibregl.Map) => new Promise<void>(res => {
  let done = false; const f = () => { if (!done) { done = true; clearTimeout(t); res(); } };
  const t = setTimeout(f, 5000); m.once('idle', f);
});

/** Render peta 3D frame demi frame di kanvas tersembunyi 1080p, tempel overlay, lalu encode ke MP4. */
export async function exportRoute3D(o: { a: Act; sty: string; mode: string; dur: number; fps: number; vertical: boolean; onProgress: (p: number) => void; signal: AbortSignal }): Promise<Blob> {
  const W = o.vertical ? 1080 : 1920, H = o.vertical ? 1920 : 1080, N = Math.max(2, Math.round(o.dur * o.fps));
  const C = o.a.pts.map(p => [p.lo, p.la]);
  const host = document.createElement('div');
  host.style.cssText = `position:fixed;left:0;top:0;width:${W}px;height:${H}px;opacity:0;pointer-events:none;z-index:-1`;
  document.body.appendChild(host);
  const m = new maplibregl.Map({ container: host, style: styleUrl(o.sty), center: C[0] as [number, number], zoom: 13, pitch: PIT[o.sty], interactive: false, attributionControl: false, preserveDrawingBuffer: true, pixelRatio: 1 } as any);
  try {
    await new Promise<void>(r => m.once('load', () => r()));
    setupLayers(m, C, o.sty);
    const b = new maplibregl.LngLatBounds(); C.forEach(c => b.extend(c as [number, number]));
    const cam = m.cameraForBounds(b, { padding: Math.round(Math.min(W, H) * .12) });
    const comp = document.createElement('canvas'); comp.width = W; comp.height = H;
    const cc = comp.getContext('2d')!, hud = makeHud(o.a, W, H, o.vertical), st: { bear: number | null } = { bear: null };
    return await encodeMp4({
      w: W, h: H, fps: o.fps, n: N, signal: o.signal, onProgress: o.onProgress,
      frame: async i => {
        const p = i / (N - 1), { cur, i: ix } = setProgress(m, C, p);
        if (o.mode === 'follow' || !cam) follow(m, C, cur, ix, st, o.sty, .12);
        else m.jumpTo({ center: cam.center, zoom: cam.zoom, pitch: PIT[o.sty], bearing: p * 50 - 25 });
        await settle(m);
        cc.drawImage(m.getCanvas(), 0, 0, W, H); hud(cc, p);
        return comp;
      }
    });
  } finally { m.remove(); host.remove(); }
}
