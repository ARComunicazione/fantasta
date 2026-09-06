'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { Role } from '@/db/schema';

export const I = ({ n, className = '' }: { n: string; className?: string }) => (
  <svg className={`i ${className}`}><use href={`#i-${n}`} /></svg>
);

export const Chip = ({ r, lg }: { r: Role; lg?: boolean }) => <span className={`chip ${r}${lg ? ' lg' : ''}`}>{r}</span>;

export function useToast() {
  const [msg, setMsg] = useState<string | null>(null);
  const t = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toast = useCallback((m: string) => {
    setMsg(m);
    if (t.current) clearTimeout(t.current);
    t.current = setTimeout(() => setMsg(null), 2400);
  }, []);
  const el = <div className={`toast${msg ? ' on' : ''}`} role="status">{msg}</div>;
  return { toast, el };
}

export async function api<T = unknown>(url: string, init?: RequestInit & { json?: unknown }): Promise<T> {
  const r = await fetch(url, {
    ...init,
    headers: { ...(init?.json !== undefined ? { 'content-type': 'application/json' } : {}), ...(init?.headers ?? {}) },
    body: init?.json !== undefined ? JSON.stringify(init.json) : init?.body,
    cache: 'no-store',
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error((data as { error?: string }).error || `Errore ${r.status}`);
  return data as T;
}

// Conto alla rovescia sincronizzato sull'orologio del server.
export function useCountdown(endsAt: string | null, serverOffset: number, total: number) {
  const [left, setLeft] = useState<number>(0);
  useEffect(() => {
    if (!endsAt) { setLeft(0); return; }
    const end = new Date(endsAt).getTime();
    const tick = () => setLeft(Math.max(0, end - (Date.now() + serverOffset)));
    tick();
    const id = setInterval(tick, 50);
    return () => clearInterval(id);
  }, [endsAt, serverOffset]);
  return { leftMs: left, frac: total > 0 ? Math.min(1, left / (total * 1000)) : 0 };
}

export function Timer({ endsAt, serverOffset, total }: { endsAt: string | null; serverOffset: number; total: number }) {
  const { leftMs, frac } = useCountdown(endsAt, serverOffset, total);
  const hot = leftMs > 0 && leftMs < 2000;
  if (!endsAt) return <div className="note">In attesa della prima offerta</div>;
  return (
    <div className="stack-v" style={{ gap: 6 }}>
      <div className={`timer-n${hot ? ' hot' : ''}`}>{(leftMs / 1000).toFixed(1)}</div>
      <div className={`timer${hot ? ' hot' : ''}`}><i style={{ transform: `scaleX(${frac})` }} /></div>
    </div>
  );
}
