import { publicSnapshot, snapshot } from '@/lib/auction';
import { handler, json, withAuction } from '@/lib/api';
import { currentTeamId } from '@/lib/auth';
import { realtimeEnabled } from '@/lib/realtime';

export const dynamic = 'force-dynamic';

export const GET = handler(async (_req: Request, { params }: { params: Promise<{ code: string }> }) => {
  const a = await withAuction((await params).code);
  const s = publicSnapshot(await snapshot(a));
  const teamId = await currentTeamId(a.code);
  return json({ ...s, me: teamId, realtime: realtimeEnabled() });
});
