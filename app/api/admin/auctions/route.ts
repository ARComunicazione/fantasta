import { getDb, schema } from '@/db';
import { genCode } from '@/lib/auction';
import { body, fail, handler, json, requireAdmin } from '@/lib/api';
import { desc } from 'drizzle-orm';
import type { Slots } from '@/db/schema';

type In = { name?: string; budget?: number; slots?: Partial<Slots>; timerSec?: number; teams?: { name: string; pin: string }[] };

export const GET = handler(async () => {
  await requireAdmin();
  const db = await getDb();
  const list = await db.select().from(schema.auctions).orderBy(desc(schema.auctions.id));
  return json(list);
});

export const POST = handler(async (req: Request) => {
  await requireAdmin();
  const b = await body<In>(req);
  const name = (b.name ?? '').trim();
  if (!name) return fail('Serve un nome per l\'asta');
  const teamsIn = (b.teams ?? []).map(t => ({ name: (t.name ?? '').trim(), pin: String(t.pin ?? '').trim() })).filter(t => t.name);
  if (teamsIn.length < 2) return fail('Servono almeno 2 squadre');
  if (teamsIn.some(t => !/^\d{4}$/.test(t.pin))) return fail('Ogni squadra deve avere un PIN di 4 cifre');
  const slots: Slots = { P: +(b.slots?.P ?? 3), D: +(b.slots?.D ?? 8), C: +(b.slots?.C ?? 8), A: +(b.slots?.A ?? 6) };
  const db = await getDb();
  let code = genCode();
  for (let i = 0; i < 5; i++) {
    const ex = await db.query.auctions.findFirst({ where: (a, { eq }) => eq(a.code, code) });
    if (!ex) break; code = genCode();
  }
  const [a] = await db.insert(schema.auctions).values({
    code, name, budget: Math.max(1, Math.round(+(b.budget ?? 500))), slots, timerSec: Math.min(60, Math.max(3, Math.round(+(b.timerSec ?? 5)))),
    status: 'setup', reveal: { P: false, D: false, C: false, A: false, credits: false },
  }).returning();
  await db.insert(schema.teams).values(teamsIn.map((t, i) => ({ auctionId: a.id, name: t.name, pin: t.pin, position: i })));
  return json(a, 201);
});
