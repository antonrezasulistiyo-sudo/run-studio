import { NextRequest, NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';

export function GET(req: NextRequest) {
  const origin = new URL(req.url).origin;
  const state = crypto.randomUUID();
  const u = new URL('https://www.strava.com/oauth/authorize');
  u.searchParams.set('client_id', process.env.STRAVA_CLIENT_ID!);
  u.searchParams.set('redirect_uri', origin + '/api/strava/callback');
  u.searchParams.set('response_type', 'code');
  u.searchParams.set('approval_prompt', 'auto');
  u.searchParams.set('scope', 'read,activity:read_all');
  u.searchParams.set('state', state);
  const res = NextResponse.redirect(u);
  res.cookies.set('strava_state', state, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: 600 });
  return res;
}
