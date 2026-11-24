import { NextResponse } from 'next/server';
import { api, getToken } from '@/lib/strava';
export const dynamic = 'force-dynamic';
const OK = ['Run', 'TrailRun', 'Walk'];

export async function GET() {
  const tk = await getToken();
  if (!tk) return NextResponse.json({ error: 'auth' }, { status: 401 });
  const out: any[] = [];
  for (const page of [1, 2, 3]) {
    const r = await api(`/athlete/activities?per_page=100&page=${page}`, tk);
    if (r.status === 429) return NextResponse.json({ error: 'rate' }, { status: 429 });
    if (!r.ok) return NextResponse.json({ error: 'strava' }, { status: r.status });
    const list = await r.json();
    for (const a of list) {
      const type = a.sport_type || a.type;
      if (!OK.includes(type)) continue;
      out.push({ id: String(a.id), name: a.name, type, date: Date.parse(a.start_date), dist: a.distance, time: a.moving_time, hr: Math.round(a.average_heartrate || 0), el: Math.round(a.total_elevation_gain || 0), src: 'strava' });
    }
    if (list.length < 100) break;
  }
  return NextResponse.json({ items: out, at: Date.now() });
}
