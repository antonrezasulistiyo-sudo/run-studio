import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { saveTokens } from '@/lib/strava';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const u = new URL(req.url);
  const code = u.searchParams.get('code'), state = u.searchParams.get('state');
  const saved = cookies().get('strava_state')?.value;
  if (!code || !state || state !== saved) return NextResponse.redirect(u.origin + '/?strava=ditolak');
  const r = await fetch('https://www.strava.com/oauth/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: process.env.STRAVA_CLIENT_ID!, client_secret: process.env.STRAVA_CLIENT_SECRET!, code, grant_type: 'authorization_code' }),
    cache: 'no-store'
  });
  if (!r.ok) return NextResponse.redirect(u.origin + '/?strava=gagal');
  const j = await r.json();
  saveTokens(j, j.athlete?.firstname);
  const res = NextResponse.redirect(u.origin + '/?strava=ok');
  res.cookies.delete('strava_state');
  return res;
}
