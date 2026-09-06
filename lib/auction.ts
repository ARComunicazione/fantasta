import { and, asc, desc, eq, inArray, sql } from 'drizzle-orm';
import { getDb, schema } from '@/db';
import type { Auction, Call, Role, Slots, Team } from '@/db/schema';
import { ROLES } from './listone';

const { auctions, teams, calls, bids } = schema;

export const genCode = () => {
  const a = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 6 }, () => a[Math.floor(Math.random() * a.length)]).join('');
};

export async function getAuction(code: string): Promise<Auction | undefined> {
  const db = await getDb();
  return db.query.auctions.findFirst({ where: eq(auctions.code, code.toUpperCase()) });
}

export type Acquired = { callId: number; playerKey: string; name: string; team: string; role: Role; qa: number; price: number; teamId: number; closedAt: string; manual: boolean };
export type TeamState = { id: number; name: string; position: number; spent: number; spentByRole: Slots; count: Slots; credits: number; roster: Acquired[] };
export type BidView = { teamId: number; teamName: string; amount: number; at: string };
export type CallView = {
  id: number; playerKey: string; name: string; team: string; role: Role; qa: number; status: Call['status'];
  amount: number; leaderTeamId: number | null; leaderName: string | null; endsAt: string | null; startedAt: string; bids: BidView[];
};
export type Snapshot = {
  auction: { code: string; name: string; budget: number; slots: Slots; timerSec: number; status: Auction['status']; reveal: Auction['reveal'] };
  teams: TeamState[];
  call: CallView | null;
  last: Acquired[]; // ultime assegnazioni
  serverNow: string;
};

export async function loadTeams(auctionId: number): Promise<Team[]> {
  const db = await getDb();
  return db.select().from(teams).where(eq(teams.auctionId, auctionId)).orderBy(asc(teams.position), asc(teams.id));
}

export async function openCall(auctionId: number): Promise<Call | undefined> {
  const db = await getDb();
  return db.query.calls.findFirst({ where: and(eq(calls.auctionId, auctionId), eq(calls.status, 'open')) });
}

export async function callView(c: Call, teamList: Team[]): Promise<CallView> {
  const db = await getDb();
  const bl = await db.select().from(bids).where(eq(bids.callId, c.id)).orderBy(desc(bids.amount), desc(bids.id)).limit(5);
  const tn = (id: number | null) => teamList.find(t => t.id === id)?.name ?? null;
  return {
    id: c.id, playerKey: c.playerKey, name: c.playerName, team: c.playerTeam, role: c.role, qa: c.qa, status: c.status,
    amount: c.amount, leaderTeamId: c.leaderTeamId, leaderName: tn(c.leaderTeamId),
    endsAt: c.endsAt ? c.endsAt.toISOString() : null, startedAt: c.startedAt.toISOString(),
    bids: bl.map(b => ({ teamId: b.teamId, teamName: tn(b.teamId) ?? '?', amount: b.amount, at: b.createdAt.toISOString() })),
  };
}

export async function snapshot(a: Auction): Promise<Snapshot> {
  const db = await getDb();
  const teamList = await loadTeams(a.id);
  const closed = await db.select().from(calls).where(and(eq(calls.auctionId, a.id), eq(calls.status, 'closed'))).orderBy(desc(calls.closedAt), desc(calls.id));
  const acq: Acquired[] = closed.map(c => ({ callId: c.id, playerKey: c.playerKey, name: c.playerName, team: c.playerTeam, role: c.role, qa: c.qa, price: c.price ?? 0, teamId: c.winnerTeamId!, closedAt: (c.closedAt ?? c.startedAt).toISOString(), manual: c.manual }));
  const ts: TeamState[] = teamList.map(t => {
    const roster = acq.filter(x => x.teamId === t.id);
    const spentByRole = { P: 0, D: 0, C: 0, A: 0 } as Slots, count = { P: 0, D: 0, C: 0, A: 0 } as Slots;
    roster.forEach(x => { spentByRole[x.role] += x.price; count[x.role]++; });
    const spent = roster.reduce((s, x) => s + x.price, 0);
    return { id: t.id, name: t.name, position: t.position, spent, spentByRole, count, credits: a.budget - spent, roster };
  });
  const oc = await openCall(a.id);
  return {
    auction: { code: a.code, name: a.name, budget: a.budget, slots: a.slots, timerSec: a.timerSec, status: a.status, reveal: a.reveal },
    teams: ts,
    call: oc ? await callView(oc, teamList) : null,
    last: acq.slice(0, 8),
    serverNow: new Date().toISOString(),
  };
}

// Vista pubblica: niente crediti né spese per i ruoli non rivelati.
export function publicSnapshot(s: Snapshot): Snapshot {
  const r = s.auction.reveal;
  return {
    ...s,
    teams: s.teams.map(t => ({
      ...t,
      credits: r.credits ? t.credits : -1,
      spent: r.credits ? t.spent : -1,
      spentByRole: { P: r.P ? t.spentByRole.P : -1, D: r.D ? t.spentByRole.D : -1, C: r.C ? t.spentByRole.C : -1, A: r.A ? t.spentByRole.A : -1 },
      roster: t.roster.map(x => ({ ...x, price: r[x.role] || r.credits ? x.price : -1 })),
    })),
  };
}

// Regola di puntata: slot libero nel ruolo e crediti sufficienti lasciando 1 credito per ogni altro slot da riempire.
export function maxBid(a: Auction, t: TeamState): { max: number; slotsLeftTotal: number } {
  const total = ROLES.reduce((s, r) => s + (a.slots[r] || 0), 0);
  const taken = ROLES.reduce((s, r) => s + t.count[r], 0);
  const left = total - taken;
  return { max: left > 0 ? t.credits - (left - 1) : 0, slotsLeftTotal: left };
}
export function canBid(a: Auction, t: TeamState, role: Role, amount: number): string | null {
  if (t.count[role] >= (a.slots[role] || 0)) return `Hai già ${a.slots[role]} ${role === 'P' ? 'portieri' : role === 'D' ? 'difensori' : role === 'C' ? 'centrocampisti' : 'attaccanti'}`;
  const { max } = maxBid(a, t);
  if (amount > max) return `Puoi offrire al massimo ${max}`;
  return null;
}

export async function placeBid(a: Auction, teamId: number, amount: number): Promise<{ ok: true; call: Call } | { ok: false; error: string }> {
  const db = await getDb();
  const oc = await openCall(a.id);
  if (!oc) return { ok: false, error: 'Nessuna chiamata aperta' };
  amount = Math.round(amount);
  if (!(amount >= 1)) return { ok: false, error: 'Importo non valido' };
  if (amount <= oc.amount) return { ok: false, error: `Serve più di ${oc.amount}` };
  const s = await snapshot(a);
  const t = s.teams.find(x => x.id === teamId);
  if (!t) return { ok: false, error: 'Squadra non trovata' };
  const err = canBid(a, t, oc.role, amount);
  if (err) return { ok: false, error: err };
  const endsAt = new Date(Date.now() + a.timerSec * 1000);
  // aggiornamento condizionale: vince solo se ancora aperta e l'importo è ancora superiore
  const upd = await db.update(calls).set({ amount, leaderTeamId: teamId, endsAt })
    .where(and(eq(calls.id, oc.id), eq(calls.status, 'open'), sql`${calls.amount} < ${amount}`)).returning();
  if (!upd.length) return { ok: false, error: 'Qualcuno ha rilanciato prima di te' };
  await db.insert(bids).values({ callId: oc.id, teamId, amount });
  return { ok: true, call: upd[0] };
}

// Chiude la chiamata aperta se il timer è scaduto (o forzatamente). Idempotente.
export async function closeCall(a: Auction, force = false): Promise<Call | null> {
  const db = await getDb();
  const oc = await openCall(a.id);
  if (!oc) return null;
  if (!force && (!oc.endsAt || oc.endsAt.getTime() > Date.now())) return null;
  if (!oc.leaderTeamId || oc.amount < 1) {
    // nessuna offerta: chiamata annullata
    const v = await db.update(calls).set({ status: 'void', closedAt: new Date() }).where(and(eq(calls.id, oc.id), eq(calls.status, 'open'))).returning();
    return v[0] ?? null;
  }
  const upd = await db.update(calls).set({ status: 'closed', closedAt: new Date(), winnerTeamId: oc.leaderTeamId, price: oc.amount })
    .where(and(eq(calls.id, oc.id), eq(calls.status, 'open'))).returning();
  return upd[0] ?? null;
}

export async function startCall(a: Auction, p: { key: string; name: string; team: string; role: Role; qa: number }): Promise<{ ok: true; call: Call } | { ok: false; error: string }> {
  const db = await getDb();
  if (await openCall(a.id)) return { ok: false, error: "C'è già una chiamata aperta" };
  const already = await db.select({ id: calls.id }).from(calls).where(and(eq(calls.auctionId, a.id), eq(calls.playerKey, p.key), eq(calls.status, 'closed'))).limit(1);
  if (already.length) return { ok: false, error: 'Giocatore già assegnato' };
  const ins = await db.insert(calls).values({ auctionId: a.id, playerKey: p.key, playerName: p.name, playerTeam: p.team, role: p.role, qa: p.qa, status: 'open', amount: 0, endsAt: null }).returning();
  return { ok: true, call: ins[0] };
}

export async function assignManual(a: Auction, p: { key: string; name: string; team: string; role: Role; qa: number }, teamId: number, price: number) {
  const db = await getDb();
  const ins = await db.insert(calls).values({ auctionId: a.id, playerKey: p.key, playerName: p.name, playerTeam: p.team, role: p.role, qa: p.qa, status: 'closed', amount: price, price, winnerTeamId: teamId, leaderTeamId: teamId, closedAt: new Date(), manual: true }).returning();
  return ins[0];
}

export async function voidCall(a: Auction, callId: number) {
  const db = await getDb();
  const upd = await db.update(calls).set({ status: 'void', closedAt: new Date() }).where(and(eq(calls.id, callId), eq(calls.auctionId, a.id), inArray(calls.status, ['open', 'closed']))).returning();
  return upd[0] ?? null;
}

export async function teamsPublic(auctionId: number) {
  const t = await loadTeams(auctionId);
  return t.map(x => ({ id: x.id, name: x.name, position: x.position }));
}
