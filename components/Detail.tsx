'use client';
import dynamic from 'next/dynamic';
import { useEffect, useRef, useState } from 'react';
import { Act, TL, pace, tm } from '@/lib/core';
import { TH, chart, frame, poster, route } from '@/lib/draw';
import { encodeMp4, mp4Supported } from '@/lib/mp4';
const Map3D = dynamic(() => import('./Map3D'), { ssr: false, loading: () => <p className="mut">Memuat peta…</p> });

export default function Detail({ a, onBack, onGal, onVid, onType }: { a: Act; onBack: () => void; onGal: (u: string, n: string, t: string) => void; onVid: (b: Blob, n: string, t: string) => void; onType: (t: string) => void }) {
  const [tab, setTab] = useState('stat'), [th, setTh] = useState('cyber');
  const rc = useRef<HTMLCanvasElement>(null), ch = useRef<HTMLCanvasElement>(null), pc = useRef<HTMLCanvasElement>(null), ac = useRef<HTMLCanvasElement>(null);
  const raf = useRef(0), abort = useRef<AbortController | null>(null);
  const [exp, setExp] = useState<number | null>(null), [err, setErr] = useState('');
  const mx = Math.max(...a.splits.map(s => s.s)), mn = Math.min(...a.splits.map(s => s.s));

  useEffect(() => {
    if (tab === 'stat' && rc.current && ch.current) {
      const t = TH[th], c = rc.current.getContext('2d')!; rc.current.width = 600; rc.current.height = 500;
      c.fillStyle = t.bg; c.fillRect(0, 0, 600, 500); route(c, a, t, 0, 0, 600, 500, 1); chart(ch.current, a);
    }
    if (tab === 'poster' && pc.current) poster(pc.current, a, th);
    if (tab === 'anim' && ac.current) { ac.current.width = ac.current.height = 1080; frame(ac.current, a, th, 1); }
    return () => cancelAnimationFrame(raf.current);
  }, [tab, th, a]);

  const play = () => {
    const cv = ac.current!; cancelAnimationFrame(raf.current);
    const s = performance.now(), D = 10000;
    const tick = (now: number) => { const p = Math.min(1, (now - s) / D); frame(cv, a, th, p); if (p < 1) raf.current = requestAnimationFrame(tick); };
    raf.current = requestAnimationFrame(tick);
  };
  const exportMp4 = async () => {
    if (!mp4Supported()) { setErr('Browser ini belum mendukung export MP4. Gunakan Chrome, Edge, atau Safari versi terbaru.'); return; }
    cancelAnimationFrame(raf.current); setErr(''); setExp(0);
    const ctl = new AbortController(); abort.current = ctl;
    const cv = document.createElement('canvas'); cv.width = cv.height = 1080; const N = 300;
    try {
      const b = await encodeMp4({ w: 1080, h: 1080, fps: 30, n: N, signal: ctl.signal, onProgress: setExp, frame: async i => { frame(cv, a, th, i / (N - 1)); return cv; } });
      onVid(b, a.name, TH[th].n);
    } catch (e: any) { if (e?.name !== 'AbortError') setErr('Export gagal: ' + (e?.message || 'kesalahan tidak diketahui')); }
    finally { setExp(null); abort.current = null; if (ac.current) frame(ac.current, a, th, 1); }
  };
  const dl = () => { const l = document.createElement('a'); l.download = `poster-${th}.png`; l.href = pc.current!.toDataURL('image/png'); l.click(); };
  const Themes = () => <div className="chips">{Object.entries(TH).map(([k, t]) => <button key={k} className={th === k ? 'on' : ''} onClick={() => setTh(k)}>{t.n}</button>)}</div>;

  return (
    <div>
      <div className="row"><h2>{a.name}</h2><button onClick={onBack}>Kembali</button></div>
      <div className="chips">
        {[['stat', 'Statistik'], ['poster', 'Poster'], ['anim', 'Animasi 2D'], ['map', 'Peta 3D']].map(([k, l]) => <button key={k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{l}</button>)}
        <select value={a.type} onChange={e => onType(e.target.value)}>{Object.entries(TL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
      </div>

      {tab === 'stat' && <>
        <div className="stats card">
          {[[(a.dist / 1000).toFixed(2), 'km'], [tm(a.time), 'waktu'], [pace(a.pace), 'pace /km'], [a.hr || '-', 'HR rata-rata'], [a.maxhr || '-', 'HR maks'], [a.cal, 'kalori'], [a.el, 'elevasi (m)']].map((s, i) => <div className="stat" key={i}><b>{s[0]}</b><span>{s[1]}</span></div>)}
        </div>
        <div className="two">
          <div className="card"><canvas ref={rc} style={{ width: '100%' }} /></div>
          <div className="card"><b>Grafik pace dan heart rate</b><canvas ref={ch} style={{ width: '100%' }} /></div>
        </div>
        <div className="card" style={{ marginTop: 16 }}><b>Split per kilometer</b>
          <table><thead><tr><th>KM</th><th>Pace</th><th /></tr></thead><tbody>
            {a.splits.map((s, i) => <tr key={i}><td>{s.km}{s.part ? ' (sisa)' : ''}</td><td>{pace(s.s)}</td><td style={{ width: '55%' }}><div className="bar" style={{ width: `${30 + 70 * (1 - (s.s - mn) / ((mx - mn) || 1))}%` }} /></td></tr>)}
          </tbody></table>
        </div>
      </>}

      {tab === 'poster' && <>
        <Themes />
        <div className="chips"><button className="pri" onClick={dl}>Unduh PNG</button><button onClick={() => onGal(pc.current!.toDataURL('image/png'), a.name, TH[th].n)}>Simpan ke galeri</button></div>
        <canvas ref={pc} style={{ width: 'min(100%,460px)' }} />
      </>}

      {tab === 'anim' && <>
        <Themes />
        <div className="chips"><button className="pri" disabled={exp !== null} onClick={play}>Putar</button>{exp === null ? <button onClick={exportMp4}>Export MP4 1080×1080</button> : <button onClick={() => abort.current?.abort()}>Batal</button>}</div>
        {exp !== null && <div className="prog"><div style={{ width: `${Math.round(exp * 100)}%` }} /><span>{Math.round(exp * 100)}%</span></div>}
        {err && <p className="warn">{err}</p>}
        <canvas ref={ac} style={{ width: 'min(100%,560px)' }} />
      </>}

      {tab === 'map' && <Map3D a={a} onVideo={b => onVid(b, a.name, 'Peta 3D')} />}
    </div>
  );
}
