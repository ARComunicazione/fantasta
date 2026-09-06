'use client';
// Stato live di un'asta: snapshot via API + aggiornamenti Ably se disponibile, altrimenti polling.
import { useCallback, useEffect, useRef, useState } from 'react';
import type { CallView, Snapshot } from '@/lib/auction';

// La libreria Ably viene caricata dal loro CDN a runtime: il suo bundle non passa dal transpiler di Next.
type AblyLike = { Realtime: new (o: { authUrl: string; authParams: Record<string, string> }) => { close(): void; channels: { get(n: string): { subscribe(ev: string, cb: (m: { data: unknown }) => void): void } }; connection: { on(ev: string, cb: () => void): void } } };
let ablyP: Promise<AblyLike> | null = null;
function loadAbly(): Promise<AblyLike> {
  if (!ablyP) ablyP = new Promise((res, rej) => {
    const w = window as unknown as { Ably?: AblyLike };
    if (w.Ably) return res(w.Ably);
    const sc = document.createElement('script');
    sc.src = 'https://cdn.ably.com/lib/ably.min-2.js'; sc.async = true;
    sc.onload = () => w.Ably ? res(w.Ably) : rej(new Error('Ably non caricato'));
    sc.onerror = () => rej(new Error('Ably non raggiungibile'));
    document.head.appendChild(sc);
  });
  return ablyP;
}

export type LiveState = Snapshot & { me?: number | null; realtime?: boolean; pins?: { id: number; pin: string }[] };

export function useLive(code: string, stateUrl: string, opts: { closer?: boolean } = {}) {
  const [state, setState] = useState<LiveState | null>(null);
  const [offset, setOffset] = useState(0); // serverNow - Date.now()
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState<'poll' | 'live' | 'off'>('off');
  const closing = useRef(false);

  const refresh = useCallback(async () => {
    try {
      const t0 = Date.now();
      const r = await fetch(stateUrl, { cache: 'no-store' });
      if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || 'Errore');
      const s = (await r.json()) as LiveState;
      const rtt = Date.now() - t0;
      setOffset(new Date(s.serverNow).getTime() + rtt / 2 - Date.now());
      setState(s); setError(null);
      return s;
    } catch (e) { setError((e as Error).message); return null; }
  }, [stateUrl]);

  // primo caricamento + realtime o polling
  useEffect(() => {
    let stop = false, poll: ReturnType<typeof setInterval> | null = null, ably: { close(): void } | null = null;
    (async () => {
      const s = await refresh();
      if (stop) return;
      if (s?.realtime) {
        try {
          const Ably = await loadAbly();
          const rt = new Ably.Realtime({ authUrl: `/api/a/${code}/token`, authParams: { clientId: 'c' + Math.random().toString(36).slice(2, 8) } });
          ably = rt;
          const ch = rt.channels.get(`asta:${code}`);
          ch.subscribe('call', (m: { data: unknown }) => setState(p => p ? { ...p, call: m.data as CallView } : p));
          ch.subscribe('state', () => { refresh(); });
          rt.connection.on('connected', () => { setConnected('live'); refresh(); });
          rt.connection.on('disconnected', () => setConnected('poll'));
          // rete di sicurezza anche con il realtime
          poll = setInterval(refresh, 8000);
          return;
        } catch (e) { console.warn('realtime non disponibile, uso il polling', e); }
      }
      setConnected('poll');
      poll = setInterval(refresh, 1500);
    })();
    const onVis = () => { if (document.visibilityState === 'visible') refresh(); };
    document.addEventListener('visibilitychange', onVis);
    return () => { stop = true; if (poll) clearInterval(poll); ably?.close(); document.removeEventListener('visibilitychange', onVis); };
  }, [code, refresh]);

  // chi fa da "sveglia": a timer scaduto chiede la chiusura al server
  useEffect(() => {
    if (!opts.closer) return;
    const id = setInterval(async () => {
      const c = state?.call;
      if (!c || !c.endsAt || closing.current) return;
      if (new Date(c.endsAt).getTime() <= Date.now() + offset - 150) {
        closing.current = true;
        try { await fetch(`/api/a/${code}/close`, { method: 'POST' }); await refresh(); }
        finally { closing.current = false; }
      }
    }, 200);
    return () => clearInterval(id);
  }, [opts.closer, state?.call, offset, code, refresh]);

  return { state, setState, offset, error, connected, refresh };
}
