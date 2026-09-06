'use client';
import { useEffect, useRef, useState } from 'react';
import type { Role } from '@/db/schema';
import type { Player } from '@/lib/listone';
import { ROLES } from '@/lib/listone';
import { I } from '@/app/ui';

export type Picked = { playerKey?: string; custom?: { name: string; team?: string; role: Role }; label: string; role: Role; team: string; qa: number };

export function PlayerSearch({ taken, onPick, placeholder = 'Cerca il giocatore chiamato…', autoFocus }: { taken: Set<string>; onPick: (p: Picked) => void; placeholder?: string; autoFocus?: boolean }) {
  const [q, setQ] = useState('');
  const [res, setRes] = useState<Player[]>([]);
  const [sel, setSel] = useState(0);
  const ref = useRef<HTMLInputElement>(null);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (q.trim().length < 2) { setRes([]); return; }
    const ctrl = new AbortController();
    fetch(`/api/players?q=${encodeURIComponent(q)}`, { signal: ctrl.signal }).then(r => r.json()).then(d => { setRes(d); setSel(0); }).catch(() => {});
    return () => ctrl.abort();
  }, [q]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => { if (!box.current?.contains(e.target as Node)) setRes([]); };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const pick = (p: Player) => { onPick({ playerKey: p.key, label: p.name, role: p.role, team: p.team, qa: p.qa }); setQ(''); setRes([]); };
  const pickCustom = (role: Role) => { const name = q.trim(); if (name.length < 2) return; onPick({ custom: { name, role }, label: name, role, team: '', qa: 0 }); setQ(''); setRes([]); };

  return (
    <div className="search" ref={box}>
      <I n="search" className="lead" />
      <input ref={ref} className="inp" value={q} placeholder={placeholder} autoComplete="off" spellCheck={false} autoFocus={autoFocus}
        onChange={e => setQ(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'ArrowDown' && res.length) { setSel(s => (s + 1) % res.length); e.preventDefault(); }
          else if (e.key === 'ArrowUp' && res.length) { setSel(s => (s - 1 + res.length) % res.length); e.preventDefault(); }
          else if (e.key === 'Enter' && res[sel]) { pick(res[sel]); e.preventDefault(); }
          else if (e.key === 'Escape') setRes([]);
        }} />
      {(res.length > 0 || q.trim().length >= 2) && (
        <div className="results">
          {res.map((p, i) => (
            <button key={p.key} type="button" className={`res${i === sel ? ' sel' : ''}${taken.has(p.key) ? ' taken' : ''}`} onMouseDown={e => { e.preventDefault(); pick(p); }}>
              <span className={`chip ${p.role}`}>{p.role}</span>
              <span className="n">{p.name}<small>{p.team}{taken.has(p.key) ? ' · già assegnato' : ''}</small></span>
              <span className="q">{p.qa}</span>
            </button>
          ))}
          <div className="res" style={{ cursor: 'default' }}>
            <span className="chip" style={{ background: 'var(--glass-2)', color: 'var(--muted)', boxShadow: 'none' }}>+</span>
            <span className="n">Non in listone: «{q.trim()}»</span>
            <span style={{ display: 'flex', gap: 4 }}>{ROLES.map(r => <button key={r} type="button" className="ghost" style={{ padding: '3px 8px' }} onMouseDown={e => { e.preventDefault(); pickCustom(r); }}>{r}</button>)}</span>
          </div>
        </div>
      )}
    </div>
  );
}
