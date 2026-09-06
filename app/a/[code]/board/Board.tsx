'use client';
import { useEffect, useRef, useState } from 'react';
import { useLive } from '@/app/useLive';
import { Chip, Timer } from '@/app/ui';
import { TeamsGrid } from '@/app/components/TeamsGrid';
import type { CallView } from '@/lib/auction';

// Vista da proiettare: chiamata in corso a caratteri grandi + rose. Fa anche da seconda "sveglia" per la chiusura.
export function Board({ code }: { code: string }) {
  const { state, offset } = useLive(code, `/api/a/${code}/state`, { closer: true });
  const lastCall = useRef<CallView | null>(null);
  const [won, setWon] = useState<{ name: string; team: string; price: number; role: CallView['role'] } | null>(null);
  useEffect(() => {
    const c = state?.call ?? null;
    if (lastCall.current && !c) {
      const prev = lastCall.current, last = state?.last?.[0];
      if (last && last.playerKey === prev.playerKey) { setWon({ name: last.name, team: state!.teams.find(t => t.id === last.teamId)?.name ?? '', price: last.price, role: last.role }); setTimeout(() => setWon(null), 6000); }
    }
    lastCall.current = c;
  }, [state]);

  if (!state) return <div className="board"><div className="idle">Mi collego…</div></div>;
  const a = state.auction, call = state.call;
  return (
    <div className="board">
      <section className="panel glass">
        {call ? (
          <div className="call win" key={call.id}>
            <div className="who"><Chip r={call.role} lg />{call.name}<small>{call.team}{call.qa ? ` · Qt.A ${call.qa}` : ''}</small></div>
            <div className="amount">{call.amount || 1}<small>cr</small></div>
            <div className="leader">{call.leaderName ? `in vantaggio ${call.leaderName}` : 'parte da 1 credito'}</div>
            <Timer endsAt={call.endsAt} serverOffset={offset} total={a.timerSec} />
            {call.bids.length > 0 && <div className="hist" style={{ fontSize: 16 }}>{call.bids.map((b, i) => <span key={i}><b>{b.amount}</b> {b.teamName}</span>)}</div>}
          </div>
        ) : won ? (
          <div className="idle win"><span><Chip r={won.role} lg /> {won.name}</span><b style={{ letterSpacing: 0, color: 'var(--accent)' }}>{won.team}</b>{won.price} {won.price === 1 ? 'credito' : 'crediti'}</div>
        ) : (
          <div className="idle">{a.status === 'setup' ? 'Inquadra il QR per entrare' : a.status === 'done' ? 'Asta terminata' : 'Prossima chiamata…'}<b>{a.code}</b>{a.name}</div>
        )}
      </section>
      <section className="panel glass" style={{ padding: 16 }}>
        <TeamsGrid teams={state.teams} slots={a.slots} />
      </section>
    </div>
  );
}
