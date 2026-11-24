'use client';
import { useState } from 'react';
import { Sum, TL, pace } from '@/lib/core';
import { Period, buckets, dur, label, range, summary } from '@/lib/stats';

const COL: Record<string, string> = { Run: 'var(--ac)', TrailRun: '#2e9e6b', Walk: '#7c6ae0' };
const PER: [Period, string][] = [['week', 'Mingguan'], ['month', 'Bulanan'], ['year', 'Tahunan']];
const PREV: Record<Period, string> = { week: 'minggu lalu', month: 'bulan lalu', year: 'tahun lalu' };

export default function Stats({ items, onOpen }: { items: Sum[]; onOpen: (s: Sum) => void }) {
  const [p, setP] = useState<Period>('week'), [ty, setTy] = useState('All'), [pick, setPick] = useState<number | null>(null);
  const src = items.filter(a => ty === 'All' || a.type === ty), B = buckets(src, p);
  const idx = Math.min(pick ?? B.length - 1, B.length - 1), cur = B[idx], prev = B[idx - 1];
  const S = summary(cur.items), P = prev ? summary(prev.items) : null;
  const max = Math.max(1, ...B.map(b => summary(b.items).dist));
  const delta = P && P.dist ? Math.round((S.dist - P.dist) / P.dist * 100) : null;
  const cells: [string, string][] = [
    [(S.dist / 1000).toFixed(1), 'km total'], [String(S.n), 'aktivitas'], [dur(S.time), 'waktu bergerak'],
    [pace(S.pace), 'pace rata-rata /km'], [S.hr ? String(S.hr) : '-', 'HR rata-rata'], [`${S.el} m`, 'total elevasi'],
    [(S.longest / 1000).toFixed(1) + ' km', 'terjauh'], [S.best ? pace(S.best) : '-', 'pace terbaik (min. 3 km)']
  ];

  return (
    <>
      <h2>Statistik</h2>
      <div className="chips">
        {PER.map(([k, l]) => <button key={k} className={p === k ? 'on' : ''} onClick={() => { setP(k); setPick(null); }}>{l}</button>)}
        <span className="sep" />
        {['All', 'Run', 'TrailRun', 'Walk'].map(f => <button key={f} className={ty === f ? 'on' : ''} onClick={() => { setTy(f); setPick(null); }}>{f === 'All' ? 'Semua' : TL[f]}</button>)}
      </div>

      <div className="card">
        <div className="row"><b>Jarak per {p === 'week' ? 'minggu' : p === 'month' ? 'bulan' : 'tahun'}</b>
          <span className="legend">{Object.keys(COL).map(k => <span key={k}><i style={{ background: COL[k] }} />{TL[k]}</span>)}</span></div>
        <div className="bars" role="group" aria-label="Pilih periode">
          {B.map((b, i) => {
            const t = summary(b.items), by: Record<string, number> = {};
            b.items.forEach(a => { by[a.type] = (by[a.type] || 0) + a.dist; });
            return (
              <button key={+b.start} className={'bcol' + (i === idx ? ' sel' : '')} onClick={() => setPick(i)} aria-pressed={i === idx} aria-label={`${range(b, p)}: ${(t.dist / 1000).toFixed(1)} km`}>
                <span className="bval">{t.dist ? (t.dist / 1000).toFixed(0) : ''}</span>
                <span className="stack" style={{ height: `${t.dist / max * 100}%` }}>
                  {Object.entries(by).map(([k, v]) => <i key={k} style={{ height: `${v / t.dist * 100}%`, background: COL[k] }} />)}
                </span>
                <span className="blab">{label(b.start, p)}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="row" style={{ margin: '18px 0 8px' }}>
        <h2 style={{ margin: 0 }}>{range(cur, p)}{idx === B.length - 1 ? ' (berjalan)' : ''}</h2>
        {delta !== null && <span className={'badge ' + (delta >= 0 ? 'up' : 'down')}>{delta >= 0 ? '+' : ''}{delta}% jarak vs {PREV[p]}</span>}
      </div>
      {S.n === 0 ? <p className="mut">Belum ada aktivitas di periode ini.</p> : <>
        <div className="grid sgrid">{cells.map(([v, l]) => <div className="card stat" key={l}><b>{v}</b><span>{l}</span></div>)}</div>
        <h3 style={{ margin: '18px 0 8px' }}>Aktivitas di periode ini</h3>
        <div className="card"><table><tbody>
          {[...cur.items].sort((a, b) => b.date - a.date).map(a => (
            <tr key={a.id} className="act" onClick={() => onOpen(a)}>
              <td>{new Date(a.date).toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short' })}</td>
              <td>{a.name}</td><td><span className="badge">{TL[a.type]}</span></td>
              <td>{(a.dist / 1000).toFixed(2)} km</td><td>{pace(a.time / (a.dist / 1000))}/km</td>
            </tr>))}
        </tbody></table></div>
      </>}
    </>
  );
}
