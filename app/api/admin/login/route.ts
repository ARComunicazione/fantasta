import { NextResponse } from 'next/server';
import { ADMIN_COOKIE, adminPasswordOk, sign } from '@/lib/auth';
import { body, fail, handler } from '@/lib/api';

export const POST = handler(async (req: Request) => {
  const { password } = await body<{ password?: string }>(req);
  if (!adminPasswordOk(password ?? '')) return fail('Password errata', 401);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE, sign('admin'), { httpOnly: true, sameSite: 'lax', path: '/', maxAge: 60 * 60 * 24 * 30, secure: process.env.NODE_ENV === 'production' });
  return res;
});

export const DELETE = handler(async () => {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE, '', { path: '/', maxAge: 0 });
  return res;
});
