'use client';
import { useCallback, useEffect, useState } from 'react';
import { get, set } from 'idb-keyval';
import { Act, Sum, TL, build, pace, parseGPX } from '@/lib/core';
import Detail from './Detail';
import Stats from './Stats';

type Gal = { u: string; n: string; t: string };
type Vid = { b: Blob; n: string; t: string; d: number };
const NAV: [string, string][] = [['dash', 'Dashboard'], ['st', 'Statistik'], ['up', 'Upload GPX'], ['gal', 'Galeri'], ['vid', 'Video']];

export default function App() {
  const [view, setView] = useState('dash'), [filt, setFilt] = useState('All'), [auth, setAuth] = useState<'unk' | 'in' | 'out'>('unk');
  const [strava, setStrava] = useState<Sum[]>([]), [local, setLocal] = useState<Act[]>([]), [gal, setGal] = useState<Gal[]>([]), [vids, setVids] = useState<Vid[]>([]);
  const [cur, setCur] = useState<Act | null>(null), [at, setAt] = useState(0), [msg, setMsg] = useState(''), [busy, setBusy] = useState(false);
  const toast = (s: string) => { setMsg(s); setTimeout(() => setMsg(''), 4500); };

  const sync = useCallback(async () => {
    try {
      const r = await fetch('/api/strava/activities', { cache: 'no-store' });
      if (r.status === 401) { setAuth('out'); return; }
      if (r.status === 429) { toast('Batas request Strava tercapai. Coba lagi beberapa menit lagi.'); return; }
      if (!r.ok) throw 0;
      const j = await r.json(); setStrava(j.items); setAt(j.at); setAuth('in');
    } catch { toast('Tidak bisa menghubungi server. Menampilkan data terakhir.'); }
  }, []);

  useEffect(() => {
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => {});
    get('acts').then(v => v && setLocal(v)); get('gal').then(v => v && setGal(v)); get('vids').then(v => v && setVids(v));
    const q = new URLSearchParams(location.search).get('strava'); if (q) { history.replaceState(null, '', '/'); if (q !== 'ok') toast('Koneksi Strava gagal. Coba hubungkan lagi.'); }
    sync();
    const iv = setInterval(sync, 5 * 60 * 1000), vis = () => document.visibilityState === 'visible' && sync();
    document.addEventListener('visibilitychange', vis);
    return () => { clearInterval(iv); document.removeEventListener('visibilitychange', vis); };
  }, [sync]);

  const open = async (s: Sum) => {
    if (s.src === 'gpx') { setCur(local.find(x => x.id === s.id)!); setView('det'); return; }
    setBusy(true);
    try {
      const r = await fetch('/api/strava/activity/' + s.id);
      if (r.status === 422) return toast('Aktivitas ini tidak punya data GPS (misalnya treadmill).');
      if (!r.ok) throw 0;
      const j = await r.json(); setCur(build(j.id, j.name, j.type, j.pts, 'strava', j.cal)); setView('det');
    } catch { toast('Gagal memuat aktivitas dari Strava.'); } finally { setBusy(false); }
  };
  const upload = (f: File) => {
    const rd = new FileReader();
    rd.onload = async () => {
      try { const a = parseGPX(String(rd.result), f.name), L = [a, ...local]; setLocal(L); await set('acts', L); setCur(a); setView('det'); toast(`GPX dimuat: ${(a.dist / 1000).toFixed(2)} km`); }
      catch { toast('File GPX tidak valid atau tidak berisi titik trek.'); }
    };
    rd.readAsText(f);
  };
  const addGal = async (u: string, n: string, t: string) => { const g = [{ u, n, t }, ...gal]; setGal(g); await set('gal', g); toast('Poster disimpan ke galeri'); };
  const addVid = async (b: Blob, n: string, t: string) => { const v = [{ b, n, t, d: Date.now() }, ...vids]; setVids(v); await set('vids', v); toast('Video disimpan di riwayat'); };
  const setType = async (t: string) => { if (!cur) return; const a = { ...cur, type: t }; setCur(a); if (a.src === 'gpx') { const L = local.map(x => x.id === a.id ? a : x); setLocal(L); await set('acts', L); } };

  const list: Sum[] = [...local, ...strava].filter(a => filt === 'All' || a.type === filt).sort((a, b) => b.date - a.date);
  return (
    <>
      <header>
        <div className="logo">Run<b>Studio</b></div>
        <nav>{NAV.map(([k, l]) => <button key={k} className={view === k || (view === 'det' && k === 'dash') ? 'on' : ''} onClick={() => setView(k)}>{l}</button>)}</nav>
        {auth === 'out' && <a className="btn pri" href="/api/strava/login">Hubungkan Strava</a>}
        {auth === 'in' && <><button onClick={sync} title="Sinkronkan sekarang">Sync {at ? new Date(at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : ''}</button><a className="btn" href="/api/strava/logout">Keluar</a></>}
      </header>
      <main>
        {view === 'dash' && <>
          <h2>Riwayat aktivitas</h2>
          <div className="chips">{['All', 'Run', 'TrailRun', 'Walk'].map(f => <button key={f} className={filt === f ? 'on' : ''} onClick={() => setFilt(f)}>{f === 'All' ? 'Semua' : TL[f]}</button>)}</div>
          {auth === 'out' && <p className="mut">Hubungkan Strava untuk menampilkan aktivitas Anda, atau unggah file GPX.</p>}
          {busy && <p className="mut">Memuat aktivitas…</p>}
          {list.length === 0 && auth !== 'unk' && <p className="mut">Belum ada aktivitas untuk filter ini.</p>}
          <div className="grid">{list.map(a => (
            <div key={a.id} className="card act" onClick={() => open(a)}>
              <div className="row"><b>{a.name}</b><span className="badge">{TL[a.type]}</span></div>
              <div className="mut">{new Date(a.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}{a.src === 'gpx' ? ' · GPX' : ''}</div>
              <div className="stats"><div className="stat"><b>{(a.dist / 1000).toFixed(2)}</b><span>km</span></div><div className="stat"><b>{pace(a.time / (a.dist / 1000))}</b><span>/km</span></div><div className="stat"><b>{a.hr || '-'}</b><span>bpm</span></div></div>
            </div>))}
          </div>
        </>}
        {view === 'st' && <Stats items={[...local, ...strava]} onOpen={open} />}
        {view === 'up' && <>
          <h2>Upload GPX manual</h2>
          <label className="drop card" onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); e.dataTransfer.files[0] && upload(e.dataTransfer.files[0]); }}>
            <input type="file" accept=".gpx" hidden onChange={e => e.target.files?.[0] && upload(e.target.files[0])} />
            <b>Pilih atau seret file .gpx</b><p className="mut">Heart rate dan waktu ikut terbaca jika ada di file.</p>
          </label>
        </>}
        {view === 'det' && cur && <Detail key={cur.id} a={cur} onBack={() => setView('dash')} onGal={addGal} onVid={addVid} onType={setType} />}
        {view === 'gal' && <>
          <h2>Galeri desain</h2>
          {gal.length === 0 ? <p className="mut">Belum ada poster. Buka aktivitas, pilih Poster, lalu Simpan ke galeri.</p> :
            <div className="grid">{gal.map((g, i) => <div className="card" key={i}><img src={g.u} alt={g.n} /><div className="row"><span>{g.n} ({g.t})</span><a className="btn" download="poster.png" href={g.u}>Unduh</a></div></div>)}</div>}
        </>}
        {view === 'vid' && <Vids vids={vids} />}
      </main>
      {msg && <div id="toast">{msg}</div>}
    </>
  );
}

function Vids({ vids }: { vids: Vid[] }) {
  const [urls, setUrls] = useState<string[]>([]);
  useEffect(() => { const u = vids.map(v => URL.createObjectURL(v.b)); setUrls(u); return () => u.forEach(URL.revokeObjectURL); }, [vids]);
  return <>
    <h2>Riwayat video animasi</h2>
    {vids.length === 0 ? <p className="mut">Belum ada video. Buka Peta 3D atau Animasi 2D, lalu pilih Export MP4.</p> :
      <div className="grid">{vids.map((v, i) => <div className="card" key={v.d}><video controls src={urls[i]} /><div className="row"><span>{v.n} ({v.t})</span><a className="btn" download={v.b.type.includes('mp4') ? 'rute.mp4' : 'rute.webm'} href={urls[i]}>Unduh</a></div></div>)}</div>}
  </>;
}
