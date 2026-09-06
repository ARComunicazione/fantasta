import { createHmac, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';

const secret = () => process.env.AUTH_SECRET || 'dev-secret-non-usare-in-produzione';

export function sign(payload: string): string {
  const mac = createHmac('sha256', secret()).update(payload).digest('base64url');
  return `${payload}.${mac}`;
}
export function verify(token: string | undefined): string | null {
  if (!token) return null;
  const i = token.lastIndexOf('.');
  if (i < 0) return null;
  const payload = token.slice(0, i), mac = token.slice(i + 1);
  const expect = createHmac('sha256', secret()).update(payload).digest('base64url');
  if (mac.length !== expect.length) return null;
  return timingSafeEqual(Buffer.from(mac), Buffer.from(expect)) ? payload : null;
}

export const ADMIN_COOKIE = 'fa_admin';
export const teamCookie = (code: string) => `fa_team_${code}`;

export async function isAdmin(): Promise<boolean> {
  const c = await cookies();
  return verify(c.get(ADMIN_COOKIE)?.value) === 'admin';
}

export function adminPasswordOk(pw: string): boolean {
  const real = process.env.ADMIN_PASSWORD;
  if (!real) return process.env.NODE_ENV !== 'production'; // in locale senza password si entra
  return pw === real;
}

// Il cookie della squadra contiene "<code>:<teamId>"
export async function currentTeamId(code: string): Promise<number | null> {
  const c = await cookies();
  const p = verify(c.get(teamCookie(code))?.value);
  if (!p) return null;
  const [cd, id] = p.split(':');
  return cd === code && id ? Number(id) : null;
}
