import { cookies } from 'next/headers';

const OPT = () => ({ httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax' as const, path: '/', maxAge: 31536000 });

export function saveTokens(j: any, name?: string) {
  cookies().set('strava', JSON.stringify({ access_token: j.access_token, refresh_token: j.refresh_token, expires_at: j.expires_at, name }), OPT());
}

/** Access token yang valid (auto-refresh). null jika belum terhubung. */
export async function getToken(): Promise<string | null> {
  const c = cookies().get('strava');
  if (!c) return null;
  let t: any;
  try { t = JSON.parse(c.value); } catch { return null; }
  if (t.expires_at < Date.now() / 1000 + 120) {
    const r = await fetch('https://www.strava.com/oauth/token', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.STRAVA_CLIENT_ID!, client_secret: process.env.STRAVA_CLIENT_SECRET!,
        grant_type: 'refresh_token', refresh_token: t.refresh_token
      }),
      cache: 'no-store'
    });
    if (!r.ok) return null;
    const j = await r.json();
    saveTokens(j, t.name);
    return j.access_token;
  }
  return t.access_token;
}

export const api = (path: string, token: string) =>
  fetch('https://www.strava.com/api/v3' + path, { headers: { Authorization: 'Bearer ' + token }, cache: 'no-store' });
