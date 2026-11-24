import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
export function GET(req: Request) {
  const res = NextResponse.redirect(new URL(req.url).origin + '/');
  res.cookies.delete('strava');
  return res;
}
