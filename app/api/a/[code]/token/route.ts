import { handler, json, withAuction } from '@/lib/api';
import { tokenRequest } from '@/lib/realtime';

export const dynamic = 'force-dynamic';

export const GET = handler(async (req: Request, { params }: { params: Promise<{ code: string }> }) => {
  const a = await withAuction((await params).code);
  const clientId = new URL(req.url).searchParams.get('clientId') || 'anon';
  const t = await tokenRequest(a.code, clientId.slice(0, 40));
  if (!t) return json({ error: 'Realtime non configurato' }, 501);
  return json(t);
});
