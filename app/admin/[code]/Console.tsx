'use client';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useLive } from '@/app/useLive';
import { api, Chip, I, Timer, useToast } from '@/app/ui';
import { PlayerSearch, type Picked } from '@/app/components/PlayerSearch';
import { TeamsGrid } from '@/app/components/TeamsGrid';
import { ROLES, RNAME } from '@/lib/listone';

export function Console({ code, joinUrl, qr }: { code: string; joinUrl: string; qr: string }) {
  const { state, offset, error, connected, refresh, setState } = useLive(code, `/api/admin/${code}`, { closer: true });
  const { toast, el } = useToast();
  const [busy, setBusy] = useState(false);
  const [assign, setAssign] = useState<Picked | null>(null);
  const [assignTeam, setAssignTeam] = useState<number>(0);
  const [assignPrice, setAssignPrice] = useState<number>(1);
  const [showQr, setShowQr] = useState(true);
  const [editTeams, setEditTeams] = useState(false);

  const taken = useMemo(() => new Set(state?.teams.flatMap(t => t.roster.map(x => x.playerKey)) ?? []), [state]);

  const act = async (payload: Record<string, unknown>, ok?: string) => {
    if (busy) return; setBusy(true);
    try { const s = await api<typeof state>(`/api/admin/${code}`, { method: 'POST', json: payload }); if (s) setState(p => ({ ...(p ?? s), ...s, pins: s.pins ?? p?.pins })); if (ok) toast(ok); }
    catch (e) { toast((e as Error).message); }
    finally { setBusy(false); }
  };

  if (!state) return <main className="narrow"><div className="panel glass" style={{ padding: 24 }}>{error ? <span className="err">{error}</span> : 'Carico l\'asta…'}</div></main>;
  const a = state.auction, call = state.call;
  const rev = a.reveal;
  const totalSlots = ROLES.reduce((s, r) => s + a.slots[r], 0);

  return (
    <>
      <header className="top"><div className="top-in glass">
        <Link className="brand" href="/admin"><span className="logo">FA</span><div><h1>{a.name}</h1><span>codice {a.code} · {connected === 'live' ? 'tempo reale' : 'polling'}</span></div></Link>
        <div className="stats">
          <div className="stat"><div className="v">{state.teams.length}</div><div className="l">Squadre</div></div>
          <div className="stat"><div className="v">{a.budget}</div><div className="l">Crediti</div></div>
          <div className="stat"><div className="v">{state.teams.reduce((s, t) => s + t.roster.length, 0)}/{totalSlots * state.teams.length}</div><div className="l">Assegnati</div></div>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <Link className="ghost" href={`/a/${code}/board`} target="_blank"><I n="monitor" /><span className="hide-m">Proiettore</span></Link>
          {a.status === 'setup' && <button className="buy" onClick={() => act({ action: 'status', status: 'live' }, 'Asta avviata')}><I n="play" />Avvia asta</button>}
          {a.status === 'live' && <button className="ghost" onClick={() => confirm('Chiudere l\'asta? I partecipanti non potranno più puntare.') && act({ action: 'status', status: 'done' }, 'Asta chiusa')}>Termina</button>}
          {a.status === 'done' && <button className="ghost" onClick={() => act({ action: 'status', status: 'live' }, 'Asta riaperta')}>Riapri</button>}
        </div>
      </div></header>

      <main className="wrap grid2">
        <div className="stack-v">
          {/* chiamata */}
          <section className="panel glass">
            <div className="panel-h"><h2>Chiamata</h2><span className="sub">{a.status === 'setup' ? 'asta non ancora avviata' : a.status === 'done' ? 'asta terminata' : call ? 'in corso' : 'nessuna chiamata aperta'}</span></div>
            {!call ? (
              <div className="panel-b stack-v">
                <PlayerSearch taken={taken} autoFocus onPick={p => act({ action: 'start', playerKey: p.playerKey, custom: p.custom }, `${p.label} in asta`)} />
                <div className="note">Cerca il giocatore chiamato e premi Invio: la chiamata parte da 1 credito e il timer da {a.timerSec} s riparte a ogni offerta.</div>
              </div>
            ) : (
              <div className="call win">
                <div className="who"><Chip r={call.role} lg />{call.name}<small>{call.team}{call.qa ? ` · Qt.A ${call.qa}` : ''}</small></div>
                <div className="amount">{call.amount || 1}<small>cr</small></div>
                <div className="leader">{call.leaderName ? `in vantaggio ${call.leaderName}` : 'nessuna offerta'}</div>
                <Timer endsAt={call.endsAt} serverOffset={offset} total={a.timerSec} />
                {call.bids.length > 0 && <div className="hist">{call.bids.map((b, i) => <span key={i}><b>{b.amount}</b> {b.teamName}</span>)}</div>}
                <div className="bidbar">
                  <button className="buy" disabled={busy || !call.leaderTeamId} onClick={() => act({ action: 'close' }, 'Assegnato')}><I n="check" />Assegna ora</button>
                  <button className="ghost danger" disabled={busy} onClick={() => confirm('Annullare la chiamata?') && act({ action: 'void' }, 'Chiamata annullata')}>Annulla chiamata</button>
                </div>
              </div>
            )}
          </section>

          {/* squadre */}
          <section className="panel glass">
            <div className="panel-h"><h2>Squadre</h2>
              <div style={{ marginLeft: 'auto', display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                <span className="small muted hide-m">Mostra a tutti:</span>
                {ROLES.map(r => <button key={r} className={`ghost${rev[r] ? ' on' : ''}`} style={rev[r] ? { background: 'var(--accent-soft)', color: 'var(--accent)', borderColor: 'transparent' } : {}} onClick={() => act({ action: 'reveal', reveal: { [r]: !rev[r] } })}>{RNAME[r]}</button>)}
                <button className={`ghost`} style={rev.credits ? { background: 'var(--accent-soft)', color: 'var(--accent)', borderColor: 'transparent' } : {}} onClick={() => act({ action: 'reveal', reveal: { credits: !rev.credits } })}><I n="eye" />Crediti</button>
              </div>
            </div>
            <div className="panel-b"><TeamsGrid teams={state.teams} slots={a.slots} /></div>
          </section>
        </div>

        <div className="stack-v">
          {/* QR */}
          <section className="panel glass">
            <div className="panel-h"><h2>Accesso</h2><button className="ghost" style={{ marginLeft: 'auto' }} onClick={() => setShowQr(!showQr)}>{showQr ? 'Nascondi QR' : 'Mostra QR'}</button></div>
            <div className="panel-b stack-v">
              {showQr && <div className="qr"><img src={qr} alt={`QR per ${joinUrl}`} /></div>}
              <div style={{ textAlign: 'center' }}><div className="code">{a.code}</div><div className="small muted">{joinUrl}</div></div>
              <div>
                <div className="eyebrow" style={{ marginBottom: 6 }}>PIN delle squadre</div>
                {state.teams.map(t => <div key={t.id} className="row" style={{ gridTemplateColumns: '1fr auto' }}><span className="n">{t.name}</span><span className="num tab" style={{ letterSpacing: '.1em' }}>{state.pins?.find(p => p.id === t.id)?.pin}</span></div>)}
                <button className="ghost" style={{ marginTop: 8 }} onClick={() => setEditTeams(!editTeams)}>{editTeams ? 'Chiudi modifica' : 'Modifica squadre'}</button>
                {editTeams && <TeamEditor teams={state.teams} pins={state.pins ?? []} onSave={(t) => act({ action: 'team', team: t }, 'Squadre aggiornate')} />}
              </div>
            </div>
          </section>

          {/* ultime assegnazioni */}
          <section className="panel glass">
            <div className="panel-h"><h2>Ultime assegnazioni</h2></div>
            <div className="panel-b">
              {!state.last.length && <div className="note">Ancora nessuna.</div>}
              {state.last.map(x => (
                <div key={x.callId} className="row" style={{ gridTemplateColumns: 'auto 1fr auto auto' }}>
                  <Chip r={x.role} />
                  <span className="n">{x.name}<small>{state.teams.find(t => t.id === x.teamId)?.name}{x.manual ? ' · manuale' : ''}</small></span>
                  <span className="num tab">{x.price}</span>
                  <button className="x" title="Annulla assegnazione" onClick={() => confirm(`Annullare l'assegnazione di ${x.name}?`) && act({ action: 'undo', callId: x.callId }, 'Assegnazione annullata')}><I n="undo" /></button>
                </div>
              ))}
            </div>
          </section>

          {/* assegnazione manuale */}
          <section className="panel glass">
            <div className="panel-h"><h2>Assegnazione manuale</h2></div>
            <div className="panel-b stack-v">
              {!assign ? <PlayerSearch taken={taken} placeholder="Giocatore da assegnare a mano…" onPick={p => { setAssign(p); setAssignPrice(Math.max(1, p.qa || 1)); setAssignTeam(state.teams[0]?.id ?? 0); }} /> : (
                <>
                  <div className="row" style={{ gridTemplateColumns: 'auto 1fr auto' }}><Chip r={assign.role} /><span className="n">{assign.label}<small>{assign.team}</small></span><button className="x" onClick={() => setAssign(null)}><I n="x" /></button></div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 90px', gap: 8 }}>
                    <select className="sel" value={assignTeam} onChange={e => setAssignTeam(+e.target.value)}>{state.teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select>
                    <input className="inp num" type="number" min={1} value={assignPrice} onChange={e => setAssignPrice(+e.target.value)} />
                  </div>
                  <button className="buy" disabled={busy} onClick={async () => { await act({ action: 'assign', playerKey: assign.playerKey, custom: assign.custom, teamId: assignTeam, price: assignPrice }, 'Assegnato'); setAssign(null); }}>Assegna</button>
                </>
              )}
              <div className="note">Per correggere al volo: assegna senza asta, oppure annulla un&apos;assegnazione dall&apos;elenco sopra.</div>
            </div>
          </section>

          <section className="panel glass">
            <div className="panel-h"><h2>Timer</h2></div>
            <div className="panel-b" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input className="inp num" type="number" min={3} max={60} defaultValue={a.timerSec} style={{ width: 90 }} onBlur={e => { const v = +e.target.value; if (v !== a.timerSec) act({ action: 'timer', timerSec: v }, 'Timer aggiornato'); }} />
              <span className="note">secondi tra un&apos;offerta e l&apos;assegnazione</span>
              <button className="ghost" style={{ marginLeft: 'auto' }} onClick={() => refresh()}>Aggiorna</button>
            </div>
          </section>
        </div>
      </main>
      {el}
    </>
  );
}

function TeamEditor({ teams, pins, onSave }: { teams: { id: number; name: string; roster: unknown[] }[]; pins: { id: number; pin: string }[]; onSave: (t: { id?: number; name?: string; pin?: string; remove?: boolean }) => void }) {
  const [nn, setNn] = useState(''); const [np, setNp] = useState('');
  return (
    <div className="stack-v" style={{ gap: 6, marginTop: 8 }}>
      {teams.map(t => <TeamRow key={t.id} id={t.id} name={t.name} pin={pins.find(p => p.id === t.id)?.pin ?? ''} canRemove={!t.roster.length} onSave={onSave} />)}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px auto', gap: 6 }}>
        <input className="inp" placeholder="Nuova squadra" value={nn} onChange={e => setNn(e.target.value)} />
        <input className="inp num" placeholder="PIN" value={np} maxLength={4} inputMode="numeric" onChange={e => setNp(e.target.value.replace(/\D/g, '').slice(0, 4))} />
        <button className="ghost" onClick={() => { onSave({ name: nn, pin: np }); setNn(''); setNp(''); }}><I n="plus" /></button>
      </div>
    </div>
  );
}
function TeamRow({ id, name, pin, canRemove, onSave }: { id: number; name: string; pin: string; canRemove: boolean; onSave: (t: { id?: number; name?: string; pin?: string; remove?: boolean }) => void }) {
  const [n, setN] = useState(name); const [p, setP] = useState(pin);
  const dirty = n !== name || p !== pin;
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px auto auto', gap: 6 }}>
      <input className="inp" value={n} onChange={e => setN(e.target.value)} />
      <input className="inp num" value={p} maxLength={4} inputMode="numeric" onChange={e => setP(e.target.value.replace(/\D/g, '').slice(0, 4))} />
      <button className="ghost" disabled={!dirty} onClick={() => onSave({ id, name: n, pin: p })}><I n="check" /></button>
      <button className="x" disabled={!canRemove} title={canRemove ? 'Elimina' : 'Ha già giocatori'} onClick={() => confirm(`Eliminare ${name}?`) && onSave({ id, remove: true })}><I n="x" /></button>
    </div>
  );
}
