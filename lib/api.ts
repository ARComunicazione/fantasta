import { NextResponse } from 'next/server';
import { getAuction } from './auction';
import { isAdmin } from './auth';

export const json = (data: unknown, status = 200) => NextResponse.json(data, { status });
export const fail = (error: string, status = 400) => NextResponse.json({ error }, { status });

export async function withAuction(code: string) {
  const a = await getAuction(code);
  if (!a) throw new Response(JSON.stringify({ error: 'Asta non trovata' }), { status: 404, headers: { 'content-type': 'application/json' } });
  return a;
}

export async function requireAdmin() {
  if (!(await isAdmin())) throw new Response(JSON.stringify({ error: 'Non autorizzato' }), { status: 401, headers: { 'content-type': 'application/json' } });
}

// Avvolge un handler: le Response lanciate diventano risposte, gli errori 500.
export function handler<T extends unknown[]>(fn: (...args: T) => Promise<Response>) {
  return async (...args: T): Promise<Response> => {
    try { return await fn(...args); }
    catch (e) {
      if (e instanceof Response) return e;
      console.error(e);
      return fail('Errore interno', 500);
    }
  };
}

export async function body<T = Record<string, unknown>>(req: Request): Promise<T> {
  try { return await req.json() as T; } catch { return {} as T; }
}
