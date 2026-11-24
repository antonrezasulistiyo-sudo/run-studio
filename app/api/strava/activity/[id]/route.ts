import { NextResponse } from 'next/server';
import { api, getToken } from '@/lib/strava';
export const dynamic = 'force-dynamic';

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const tk = await getToken();
  if (!tk) return NextResponse.json({ error: 'auth' }, { status: 401 });
  const [d, s] = await Promise.all([
    api(`/activities/${params.id}`, tk),
    api(`/activities/${params.id}/streams?keys=latlng,time,altitude,heartrate&key_by_type=true`, tk)
  ]);
  if (!d.ok || !s.ok) return NextResponse.json({ error: 'strava' }, { status: d.ok ? s.status : d.status });
  const a = await d.json(), st = await s.json();
  if (!st.latlng) return NextResponse.json({ error: 'nogps' }, { status: 422 });
  const t0 = Date.parse(a.start_date) / 1000;
  const pts = st.latlng.data.map((ll: number[], i: number) => ({
    la: ll[0], lo: ll[1], el: st.altitude?.data[i] ?? 0, hr: st.heartrate?.data[i] ?? 0, t: t0 + (st.time?.data[i] ?? i), d: 0
  }));
  return NextResponse.json({ id: String(a.id), name: a.name, type: a.sport_type || a.type, cal: Math.round(a.calories || 0), pts });
}
