import { callView, loadTeams, placeBid } from '@/lib/auction';
import { body, fail, handler, json, withAuction } from '@/lib/api';
import { currentTeamId } from '@/lib/auth';
import { publish } from '@/lib/realtime';

export const POST = handler(async (req: Request, { params }: { params: Promise<{ code: string }> }) => {
  const a = await withAuction((await params).code);
  if (a.status !== 'live') return fail("L'asta non è in corso");
  const teamId = await currentTeamId(a.code);
  if (!teamId) return fail('Scegli prima la tua squadra', 401);
  const { amount } = await body<{ amount?: number }>(req);
  const r = await placeBid(a, teamId, Number(amount));
  if (!r.ok) return fail(r.error);
  const view = await callView(r.call, await loadTeams(a.id));
  await publish(a.code, 'call', view);
  return json({ ok: true, call: view, serverNow: new Date().toISOString() });
});
