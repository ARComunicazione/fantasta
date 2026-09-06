'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { api, I, useToast } from '@/app/ui';
import { ROLES, RNAME } from '@/lib/listone';
import type { Role } from '@/db/schema';

export function AdminLogin({ needsPassword }: { needsPassword: boolean }) {
  const [pw, setPw] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const router = useRouter();
  const go = async (e: React.FormEvent) => {
    e.preventDefault();
    try { await api('/api/admin/login', { method: 'POST', json: { password: pw } }); router.refresh(); }
    catch (x) { setErr((x as Error).message); }
  };
  return (
    <main className="narrow">
      <form className="panel glass" style={{ padding: 28 }} onSubmit={go}>
        <div className="brand" style={{ marginBottom: 18 }}><span className="logo">FA</span><div><h1>Console asta</h1><span>Accesso riservato</span></div></div>
        {needsPassword ? (
          <div className="field"><label>Password</label><input className="inp" type="password" value={pw} onChange={e => setPw(e.target.value)} autoFocus /></div>
        ) : <p className="note">Nessuna password impostata (ADMIN_PASSWORD): in locale si entra direttamente.</p>}
        {err && <div className="err" style={{ marginTop: 8 }}>{err}</div>}
        <div style={{ display: 'flex', gap: 8, marginTop: 16, justifyContent: 'flex-end' }}><Link className="ghost" href="/">Indietro</Link><button className="buy" type="submit">Entra</button></div>
      </form>
    </main>
  );
}

type Row = { code: string; name: string; status: string; budget: number; createdAt: string };
type TeamIn = { name: string; pin: string };
const randPin = () => String(Math.floor(1000 + Math.random() * 9000));

export function AdminHome({ auctions }: { auctions: Row[] }) {
  const router = useRouter();
  const { toast, el } = useToast();
  const [name, setName] = useState('');
  const [budget, setBudget] = useState(500);
  const [timer, setTimer] = useState(5);
  const [slots, setSlots] = useState<Record<Role, number>>({ P: 3, D: 8, C: 8, A: 6 });
  const [teams, setTeams] = useState<TeamIn[]>(Array.from({ length: 8 }, (_, i) => ({ name: `Squadra ${i + 1}`, pin: randPin() })));
  const [busy, setBusy] = useState(false);

  const create = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true);
    try {
      const a = await api<{ code: string }>('/api/admin/auctions', { method: 'POST', json: { name, budget, timerSec: timer, slots, teams } });
      router.push(`/admin/${a.code}`);
    } catch (x) { toast((x as Error).message); setBusy(false); }
  };
  const logout = async () => { await api('/api/admin/login', { method: 'DELETE' }); router.refresh(); };

  return (
    <>
      <header className="top"><div className="top-in glass">
        <Link className="brand" href="/"><span className="logo">FA</span><div><h1>Console asta</h1><span>FantAsta 26/27</span></div></Link>
        <Link className="ghost" href="/studio">Le mie valutazioni</Link>
        <button className="ghost" onClick={logout}>Esci</button>
      </div></header>
      <main className="wrap grid2">
        <form className="panel glass" onSubmit={create}>
          <div className="panel-h"><h2>Nuova asta</h2></div>
          <div className="panel-b stack-v">
            <div className="field"><label>Nome</label><input className="inp" value={name} onChange={e => setName(e.target.value)} placeholder="Lega degli amici 26/27" required /></div>
            <div className="grid4" style={{ gridTemplateColumns: '1fr 1fr' }}>
              <div className="field"><label>Crediti per squadra</label><input className="inp num" type="number" min={1} value={budget} onChange={e => setBudget(+e.target.value)} /></div>
              <div className="field"><label>Timer (secondi)</label><input className="inp num" type="number" min={3} max={60} value={timer} onChange={e => setTimer(+e.target.value)} /></div>
            </div>
            <div>
              <div className="eyebrow" style={{ marginBottom: 8 }}>Giocatori per ruolo</div>
              <div className="grid4">
                {ROLES.map(r => <div className="field" key={r}><label><span className={`chip ${r}`} style={{ marginRight: 6 }}>{r}</span>{RNAME[r]}</label><input className="inp num" type="number" min={0} value={slots[r]} onChange={e => setSlots({ ...slots, [r]: +e.target.value })} /></div>)}
              </div>
            </div>
            <div>
              <div className="eyebrow" style={{ marginBottom: 8 }}>Squadre e PIN</div>
              <div className="stack-v" style={{ gap: 6 }}>
                {teams.map((t, i) => (
                  <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 90px auto', gap: 6 }}>
                    <input className="inp" value={t.name} onChange={e => setTeams(teams.map((x, j) => j === i ? { ...x, name: e.target.value } : x))} placeholder={`Squadra ${i + 1}`} />
                    <input className="inp num" value={t.pin} inputMode="numeric" maxLength={4} pattern="\d{4}" onChange={e => setTeams(teams.map((x, j) => j === i ? { ...x, pin: e.target.value.replace(/\D/g, '').slice(0, 4) } : x))} />
                    <button type="button" className="x" title="Togli" onClick={() => setTeams(teams.filter((_, j) => j !== i))}><I n="x" /></button>
                  </div>
                ))}
              </div>
              <button type="button" className="ghost" style={{ marginTop: 8 }} onClick={() => setTeams([...teams, { name: `Squadra ${teams.length + 1}`, pin: randPin() }])}><I n="plus" /> Aggiungi squadra</button>
              <div className="note" style={{ marginTop: 8 }}>Ogni squadra entra dal QR scegliendo il proprio nome e digitando il PIN. Potrai cambiarli dopo.</div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}><button className="buy" type="submit" disabled={busy}>Crea asta</button></div>
          </div>
        </form>
        <div className="panel glass">
          <div className="panel-h"><h2>Le tue aste</h2><span className="sub">{auctions.length}</span></div>
          <div className="panel-b">
            {!auctions.length && <div className="note">Nessuna asta ancora. Creane una qui a fianco.</div>}
            {auctions.map(a => (
              <Link key={a.code} href={`/admin/${a.code}`} className="row" style={{ color: 'inherit' }}>
                <span className={`tag ${a.status === 'live' ? 'ok' : a.status === 'done' ? '' : 'warn'}`}>{a.status === 'live' ? 'in corso' : a.status === 'done' ? 'chiusa' : 'preparazione'}</span>
                <span className="n">{a.name}<small>{a.budget} cr · {new Date(a.createdAt).toLocaleDateString('it-IT')}</small></span>
                <span className="code" style={{ fontSize: 15, letterSpacing: '.12em' }}>{a.code}</span>
              </Link>
            ))}
          </div>
        </div>
      </main>
      {el}
    </>
  );
}
