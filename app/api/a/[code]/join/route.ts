import { NextResponse } from 'next/server';
import { loadTeams } from '@/lib/auction';
import { body, fail, handler, withAuction } from '@/lib/api';
import { sign, teamCookie } from '@/lib/auth';

export const POST = handler(async (req: Request, { params }: { params: Promise<{ code: string }> }) => {
  const a = await withAuction((await params).code);
  const { teamId, pin } = await body<{ teamId?: number; pin?: string }>(req);
  const t = (await loadTeams(a.id)).find(x => x.id === Number(teamId));
  if (!t) return fail('Squadra non trovata', 404);
  if (String(pin ?? '') !== t.pin) return fail('PIN errato', 401);
  const res = NextResponse.json({ ok: true, teamId: t.id });
  res.cookies.set(teamCookie(a.code), sign(`${a.code}:${t.id}`), { httpOnly: true, sameSite: 'lax', path: '/', maxAge: 60 * 60 * 24 * 3, secure: process.env.NODE_ENV === 'production' });
  return res;
});

export const DELETE = handler(async (_req: Request, { params }: { params: Promise<{ code: string }> }) => {
  const { code } = await params;
  const res = NextResponse.json({ ok: true });
  res.cookies.set(teamCookie(code.toUpperCase()), '', { path: '/', maxAge: 0 });
  return res;
});
