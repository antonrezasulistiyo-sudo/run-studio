'use client';
import { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { Act, tm } from '@/lib/core';
import { KEY, PIT, follow, setProgress, setupLayers, styleUrl } from '@/lib/mapcore';
import { exportRoute3D } from '@/lib/export3d';
import { mp4Supported } from '@/lib/mp4';

export default function Map3D({ a, onVideo }: { a: Act; onVideo: (b: Blob) => void }) {
  const box = useRef<HTMLDivElement>(null), map = useRef<maplibregl.Map>(), abort = useRef<AbortController | null>(null);
  const coords = useRef<number[][]>(a.pts.map(p => [p.lo, p.la]));
  const S = useRef<any>({ p: 0, play: false, mode: 'follow', dur: 30, bear: null, last: 0, raf: 0, sty: 'd3', first: 0 });
  const [sty, setSty] = useState('d3'), [mode, setMode] = useState('follow'), [play, setPlay] = useState(false);
  const [prog, setProg] = useState(0), [dur, setDur] = useState(30), [vert, setVert] = useState(false);
  const [exp, setExp] = useState<number | null>(null), [err, setErr] = useState('');

  const apply = (p: number, move = true) => {
    const m = map.current; if (!m || !m.getSource('prog')) return;
    const { cur, i } = setProgress(m, coords.current, p);
    if (S.current.mode === 'follow' && move) follow(m, coords.current, cur, i, S.current, S.current.sty);
    setProg(p);
  };
  const overview = () => {
    const m = map.current!, b = new maplibregl.LngLatBounds(); coords.current.forEach(c => b.extend(c as [number, number]));
    m.fitBounds(b, { padding: 70, pitch: PIT[S.current.sty], bearing: 0, duration: 900 });
  };

  useEffect(() => {
    const m = new maplibregl.Map({ container: box.current!, style: styleUrl('d3'), center: coords.current[0] as [number, number], zoom: 13, pitch: PIT.d3 } as any);
    map.current = m; m.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'top-right');
    m.on('style.load', () => { setupLayers(m, coords.current, S.current.sty); apply(S.current.p, false); if (!S.current.first) { S.current.first = 1; overview(); } });
    return () => { cancelAnimationFrame(S.current.raf); abort.current?.abort(); m.remove(); };
  }, []);

  const tick = (now: number) => {
    const s = S.current; if (!s.play) return;
    s.p = Math.min(1, s.p + (now - s.last) / (s.dur * 1000)); s.last = now; apply(s.p);
    if (s.p >= 1) { stopPlay(); return; }
    s.raf = requestAnimationFrame(tick);
  };
  const startPlay = () => { const s = S.current; if (s.p >= 1) { s.p = 0; s.bear = null; } s.play = true; s.last = performance.now(); setPlay(true); s.raf = requestAnimationFrame(tick); };
  const stopPlay = () => { S.current.play = false; cancelAnimationFrame(S.current.raf); setPlay(false); };

  const doExport = async () => {
    if (!mp4Supported()) { setErr('Browser ini belum mendukung export MP4. Gunakan Chrome, Edge, atau Safari versi terbaru.'); return; }
    stopPlay(); setErr(''); setExp(0);
    const ac = new AbortController(); abort.current = ac;
    try { onVideo(await exportRoute3D({ a, sty: S.current.sty, mode: S.current.mode, dur: S.current.dur, fps: 30, vertical: vert, onProgress: setExp, signal: ac.signal })); }
    catch (e: any) { if (e?.name !== 'AbortError') setErr('Export gagal: ' + (e?.message || 'kesalahan tidak diketahui')); }
    finally { setExp(null); abort.current = null; }
  };

  const chStyle = (k: string) => { setSty(k); S.current.sty = k; map.current!.setStyle(styleUrl(k)); };
  const chMode = (k: string) => { setMode(k); S.current.mode = k; if (k === 'free') overview(); };
  const i = Math.min(a.pts.length - 1, Math.floor(prog * (a.pts.length - 1))), q = a.pts[i], busy = exp !== null;

  return (
    <div>
      {!KEY && <p className="warn">NEXT_PUBLIC_MAPTILER_KEY belum diisi. Peta memakai style demo tanpa jalan dan satelit. Lihat README.</p>}
      <div className="chips">
        {[['dark', 'Dark'], ['sat', 'Satellite'], ['d3', '3D']].map(([k, l]) => <button key={k} className={sty === k ? 'on' : ''} disabled={busy} onClick={() => chStyle(k)}>{l}</button>)}
        <span className="sep" />
        {[['follow', 'Ikuti pelari'], ['free', 'Orbit / bebas']].map(([k, l]) => <button key={k} className={mode === k ? 'on' : ''} disabled={busy} onClick={() => chMode(k)}>{l}</button>)}
      </div>
      <div className="mapwrap">
        <div ref={box} className="map" />
        <div className="hud"><b>{(q.d / 1000).toFixed(2)} km</b><span>{tm(q.t - a.pts[0].t)}{q.hr ? ' · ' + q.hr + ' bpm' : ''}</span></div>
      </div>
      <div className="chips" style={{ marginTop: 10 }}>
        <button className="pri" disabled={busy} onClick={() => (play ? stopPlay() : startPlay())}>{play ? 'Jeda' : 'Putar'}</button>
        <label className="mut">Durasi <select value={dur} disabled={busy} onChange={e => { setDur(+e.target.value); S.current.dur = +e.target.value; }}>{[15, 30, 45, 60].map(v => <option key={v} value={v}>{v} dtk</option>)}</select></label>
      </div>
      <input type="range" min={0} max={1000} disabled={busy} value={Math.round(prog * 1000)} style={{ width: '100%' }} onChange={e => { const p = +e.target.value / 1000; S.current.p = p; apply(p); }} />
      <div className="card" style={{ marginTop: 12 }}>
        <b>Export MP4 1080p</b>
        <p className="mut" style={{ margin: '4px 0 10px' }}>Dirender frame demi frame (30 fps) lengkap dengan overlay jarak, waktu, pace, HR, dan profil elevasi. Durasi 30 detik butuh sekitar 1–3 menit. Biarkan tab tetap terbuka.</p>
        <div className="chips" style={{ margin: 0 }}>
          <select value={vert ? 'v' : 'h'} disabled={busy} onChange={e => setVert(e.target.value === 'v')}><option value="h">Lanskap 1920×1080</option><option value="v">Vertikal 1080×1920 (Story)</option></select>
          {!busy && <button className="pri" onClick={doExport}>Export MP4</button>}
          {busy && <button onClick={() => abort.current?.abort()}>Batal</button>}
        </div>
        {busy && <div className="prog"><div style={{ width: `${Math.round((exp || 0) * 100)}%` }} /><span>{Math.round((exp || 0) * 100)}%</span></div>}
        {err && <p className="warn" style={{ marginTop: 10 }}>{err}</p>}
      </div>
    </div>
  );
}
