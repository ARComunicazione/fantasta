// Console admin: azioni sull'asta. POST { action, ... }
import { getDb, schema } from '@/db';
import { assignManual, closeCall, loadTeams, openCall, publicSnapshot, snapshot, startCall, voidCall, callView } from '@/lib/auction';
import { body, fail, handler, json, requireAdmin, withAuction } from '@/lib/api';
import { playerByKey } from '@/lib/listone';
import { publish } from '@/lib/realtime';
import type { Role } from '@/db/schema';
import { eq } from 'drizzle-orm';

type Ctx = { params: Promise<{ code: string }> };
type In = {
  action: 'start' | 'close' | 'void' | 'undo' | 'assign' | 'reveal' | 'status' | 'timer' | 'team';
  playerKey?: string; custom?: { name: string; team?: string; role: Role };
  callId?: number; teamId?: number; price?: number;
  reveal?: Partial<{ P: boolean; D: boolean; C: boolean; A: boolean; credits: boolean }>;
  status?: 'setup' | 'live' | 'done'; timerSec?: number;
  team?: { id?: number; name?: string; pin?: string; remove?: boolean };
};

function resolvePlayer(b: In) {
  if (b.playerKey) {
    const p = playerByKey(b.playerKey);
    if (!p) return null;
    return { key: p.key, name: p.name, team: p.team, role: p.role, qa: p.qa };
  }
  if (b.custom?.name && b.custom.role) {
    const name = b.custom.name.trim();
    return { key: 'custom|' + name.toLowerCase() + '|' + b.custom.role, name, team: (b.custom.team ?? '').trim(), role: b.custom.role, qa: 0 };
  }
  return null;
}

export const GET = handler(async (_req: Request, { params }: Ctx) => {
  await requireAdmin();
  const a = await withAuction((await params).code);
  const teamList = await loadTeams(a.id);
  return json({ ...(await snapshot(a)), pins: teamList.map(t => ({ id: t.id, pin: t.pin })) });
});

export const POST = handler(async (req: Request, { params }: Ctx) => {
  await requireAdmin();
  let a = await withAuction((await params).code);
  const b = await body<In>(req);
  const db = await getDb();
  const teamList = await loadTeams(a.id);
  const broadcastState = async () => { const s = await snapshot(a); await publish(a.code, 'state', publicSnapshot(s)); return s; };

  switch (b.action) {
    case 'start': {
      const p = resolvePlayer(b);
      if (!p) return fail('Giocatore non valido');
      const r = await startCall(a, p);
      if (!r.ok) return fail(r.error);
      const s = await broadcastState();
      return json(s);
    }
    case 'close': {
      const c = await closeCall(a, true);
      if (!c) return fail('Nessuna chiamata aperta');
      return json(await broadcastState());
    }
    case 'void': {
      const oc = await openCall(a.id);
      if (!oc) return fail('Nessuna chiamata aperta');
      await voidCall(a, oc.id);
      return json(await broadcastState());
    }
    case 'undo': {
      if (!b.callId) return fail('callId mancante');
      const c = await voidCall(a, b.callId);
      if (!c) return fail('Assegnazione non trovata');
      return json(await broadcastState());
    }
    case 'assign': {
      const p = resolvePlayer(b);
      if (!p || !b.teamId) return fail('Dati mancanti');
      if (!teamList.some(t => t.id === b.teamId)) return fail('Squadra non valida');
      if (await openCall(a.id)) return fail('Chiudi prima la chiamata aperta');
      await assignManual(a, p, b.teamId, Math.max(1, Math.round(+(b.price ?? 1))));
      return json(await broadcastState());
    }
    case 'reveal': {
      const reveal = { ...a.reveal, ...(b.reveal ?? {}) };
      [a] = await db.update(schema.auctions).set({ reveal }).where(eq(schema.auctions.id, a.id)).returning();
      return json(await broadcastState());
    }
    case 'status': {
      if (!b.status) return fail('status mancante');
      [a] = await db.update(schema.auctions).set({ status: b.status }).where(eq(schema.auctions.id, a.id)).returning();
      return json(await broadcastState());
    }
    case 'timer': {
      const t = Math.min(60, Math.max(3, Math.round(+(b.timerSec ?? 5))));
      [a] = await db.update(schema.auctions).set({ timerSec: t }).where(eq(schema.auctions.id, a.id)).returning();
      return json(await broadcastState());
    }
    case 'team': {
      const t = b.team ?? {};
      if (t.id && t.remove) {
        const hasRoster = await db.query.calls.findFirst({ where: (c, { and, eq }) => and(eq(c.winnerTeamId, t.id!), eq(c.status, 'closed')) });
        if (hasRoster) return fail('La squadra ha già giocatori: non si può eliminare');
        await db.delete(schema.teams).where(eq(schema.teams.id, t.id));
      } else if (t.id) {
        const set: Partial<{ name: string; pin: string }> = {};
        if (t.name?.trim()) set.name = t.name.trim();
        if (t.pin && /^\d{4}$/.test(t.pin)) set.pin = t.pin;
        await db.update(schema.teams).set(set).where(eq(schema.teams.id, t.id));
      } else {
        if (!t.name?.trim() || !/^\d{4}$/.test(t.pin ?? '')) return fail('Nome e PIN di 4 cifre');
        await db.insert(schema.teams).values({ auctionId: a.id, name: t.name.trim(), pin: t.pin!, position: teamList.length });
      }
      const s = await broadcastState();
      const tl = await loadTeams(a.id);
      return json({ ...s, pins: tl.map(x => ({ id: x.id, pin: x.pin })) });
    }
    default:
      return fail('Azione sconosciuta');
  }
});

// usato solo per tipizzare l'import
void callView;
