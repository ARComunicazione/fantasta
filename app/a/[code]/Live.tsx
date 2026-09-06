'use client';
import { useEffect, useRef, useState } from 'react';
import { useLive } from '@/app/useLive';
import { api, Chip, I, Timer, useToast } from '@/app/ui';
import { TeamsGrid } from '@/app/components/TeamsGrid';
import type { CallView } from '@/lib/auction';
import { ROLES, RNAME1 } from '@/lib/listone';

type TeamPub = { id: number; name: string; position: number };

export function Live({ code, name, teams, initialMe }: { code: string; name: string; teams: TeamPub[]; initialMe: number | null }) {
  const [me, setMe] = useState<number | null>(initialMe);
  if (!me) return <Join code={code} name={name} teams={teams} onJoined={setMe} />;
  return <Auction code={code} me={me} onLeave={() => setMe(null)} />;
}

function Join({ code, name, teams, onJoined }: { code: string; name: string; teams: TeamPub[]; onJoined: (id: number) => void }) {
  const [teamId, setTeamId] = useState<number>(0);
  const [pin, setPin] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const go = async (e: React.FormEvent) => {
    e.preventDefault(); setErr(null);
    try { const r = await api<{ teamId: number }>(`/api/a/${code}/join`, { method: 'POST', json: { teamId, pin } }); onJoined(r.teamId); }
    catch (x) { setErr((x as Error).message); }
  };
  return (
    <main className="narrow">
      <form className="panel glass" style={{ padding: 24 }} onSubmit={go}>
        <div className="eyebrow">Asta · {code}</div>
        <h1 style={{ fontSize: 26, fontWeight: 800, margin: '4px 0 14px' }}>{name}</h1>
        <div className="eyebrow" style={{ marginBottom: 8 }}>La tua squadra</div>
        <div className="pill-list">
          {teams.map(t => <button key={t.id} type="button" className={teamId === t.id ? 'buy' : 'ghost'} onClick={() => setTeamId(t.id)}>{t.name}</button>)}
        </div>
        <div className="field" style={{ marginTop: 16 }}><label>PIN della squadra</label><input className="inp num" inputMode="numeric" maxLength={4} value={pin} onChange={e => setPin(e.target.value.replace(/\D/g, ''))} placeholder="••••" style={{ fontSize: 24, letterSpacing: '.3em', textAlign: 'center' }} /></div>
        {err && <div className="err" style={{ marginTop: 8 }}>{err}</div>}
        <button className="buy big" type="submit" disabled={!teamId || pin.length !== 4} style={{ width: '100%', marginTop: 16 }}>Entra nell&apos;asta</button>
      </form>
    </main>
  );
}

function Auction({ code, me, onLeave }: { code: string; me: number; onLeave: () => void }) {
  const { state, setState, offset, connected, error } = useLive(code, `/api/a/${code}/state`);
  const { toast, el } = useToast();
  const [custom, setCustom] = useState<number>(0);
  const [busy, setBusy] = useState(false);
  const lastCall = useRef<CallView | null>(null);
  const [won, setWon] = useState<{ name: string; mine: boolean; team: string | null; price: number } | null>(null);

  // avviso quando la chiamata che seguivo si chiude
  useEffect(() => {
    const c = state?.call ?? null;
    if (lastCall.current && !c) {
      const prev = lastCall.current;
      const last = state?.last?.[0];
      if (last && last.playerKey === prev.playerKey) setWon({ name: last.name, mine: last.teamId === me, team: state!.teams.find(t => t.id === last.teamId)?.name ?? null, price: last.price });
      else setWon({ name: prev.name, mine: false, team: null, price: 0 });
      setTimeout(() => setWon(null), 5000);
    }
    lastCall.current = c;
  }, [state, me]);

  useEffect(() => { if (state?.call) setCustom(0); }, [state?.call?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!state) return <main className="narrow"><div className="panel glass" style={{ padding: 24 }}>{error ? <span className="err">{error}</span> : 'Mi collego all\'asta…'}</div></main>;
  const a = state.auction, call = state.call, myTeam = state.teams.find(t => t.id === me);
  const mineLeading = !!call && call.leaderTeamId === me;
  const total = ROLES.reduce((s, r) => s + a.slots[r], 0);
  const takenCount = myTeam ? ROLES.reduce((s, r) => s + myTeam.count[r], 0) : 0;
  const roleFull = !!call && !!myTeam && myTeam.count[call.role] >= a.slots[call.role];
  const base = call ? Math.max(1, call.amount + 1) : 1;

  const bid = async (amount: number) => {
    if (busy || !call) return; setBusy(true);
    try {
      const r = await api<{ call: CallView }>(`/api/a/${code}/bid`, { method: 'POST', json: { amount } });
      setState(p => p ? { ...p, call: r.call } : p); setCustom(0);
    } catch (e) { toast((e as Error).message); }
    finally { setBusy(false); }
  };
  const leave = async () => { await api(`/api/a/${code}/join`, { method: 'DELETE' }); onLeave(); };

  return (
    <>
      <header className="top"><div className="top-in glass">
        <div className="brand"><span className="logo">FA</span><div><h1>{myTeam?.name ?? 'Squadra'}</h1><span>{a.name} · {connected === 'live' ? 'tempo reale' : 'aggiornamento automatico'}</span></div></div>
        <div className="stats">
          <div className="stat"><div className="v">{takenCount}/{total}</div><div className="l">Giocatori</div></div>
          {myTeam && myTeam.credits >= 0 && <div className="stat"><div className="v" style={{ color: 'var(--accent)' }}>{myTeam.credits}</div><div className="l">Crediti</div></div>}
        </div>
        <button className="ghost" onClick={leave}>Cambia</button>
      </div></header>

      <main className="wrap stack-v">
        <section className="panel glass">
          {a.status === 'setup' && <div className="idle">L&apos;asta non è ancora iniziata<b style={{ fontSize: 28, letterSpacing: 0 }}>Aspetta il via dell&apos;admin</b></div>}
          {a.status === 'done' && <div className="idle">Asta terminata<b style={{ fontSize: 28, letterSpacing: 0 }}>Grazie per aver partecipato</b></div>}
          {a.status === 'live' && !call && (
            won ? (
              <div className="idle win">{won.team ? <>{won.name} va a <b style={{ fontSize: 34, letterSpacing: 0, color: won.mine ? 'var(--accent)' : 'var(--ink)' }}>{won.mine ? 'TE' : won.team}</b> per {won.price} {won.price === 1 ? 'credito' : 'crediti'}</> : <>Chiamata di {won.name} annullata</>}</div>
            ) : <div className="idle">In attesa della prossima chiamata<b style={{ fontSize: 22, letterSpacing: 0 }}>Tieni pronto il telefono</b></div>
          )}
          {a.status === 'live' && call && (
            <div className="call win" key={call.id}>
              <div className="who"><Chip r={call.role} lg />{call.name}<small>{call.team}{call.qa ? ` · Qt.A ${call.qa}` : ''}</small></div>
              <div className="amount" style={mineLeading ? { color: 'var(--accent)' } : {}}>{call.amount || 1}<small>cr</small></div>
              <div className={`leader${mineLeading ? ' me' : ''}`}>{!call.leaderTeamId ? 'Nessuna offerta: parte da 1' : mineLeading ? 'Sei in vantaggio' : `In vantaggio ${call.leaderName}`}</div>
              <Timer endsAt={call.endsAt} serverOffset={offset} total={a.timerSec} />
              {call.bids.length > 0 && <div className="hist">{call.bids.slice(0, 3).map((b, i) => <span key={i}><b>{b.amount}</b> {b.teamId === me ? 'tu' : b.teamName}</span>)}</div>}
              {roleFull ? <div className="note">Hai già tutti i {RNAME1[call.role].toLowerCase()} che ti servono.</div> : (
                <>
                  <div className="bidbar">
                    <button className="buy" disabled={busy || mineLeading} onClick={() => bid(base)}>{call.leaderTeamId ? `+1 · ${base}` : '1'}</button>
                    <button className="buy" disabled={busy} onClick={() => bid(call.amount + 5)}>+5 · {call.amount + 5}</button>
                    <button className="buy" disabled={busy} onClick={() => bid(call.amount + 10)}>+10 · {call.amount + 10}</button>
                  </div>
                  <div className="bidbar">
                    <div className="stepper">
                      <button type="button" onClick={() => setCustom(Math.max(base, (custom || base) - 1))}><I n="minus" /></button>
                      <input type="number" inputMode="numeric" min={base} value={custom || ''} placeholder={String(base)} onChange={e => setCustom(+e.target.value)} />
                      <button type="button" onClick={() => setCustom((custom || base) + 1)}><I n="plus" /></button>
                    </div>
                    <button className="ghost" disabled={busy || !custom || custom < base} onClick={() => bid(custom)}>Offri {custom || ''}</button>
                  </div>
                </>
              )}
            </div>
          )}
        </section>

        <section className="panel glass">
          <div className="panel-h"><h2>Le rose</h2><span className="sub">{a.reveal.credits ? 'crediti visibili' : 'crediti nascosti fino a fine reparto'}</span></div>
          <div className="panel-b"><TeamsGrid teams={state.teams} slots={a.slots} me={me} /></div>
        </section>
      </main>
      {el}
    </>
  );
}
