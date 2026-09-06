// Chiusura a timer scaduto: chiunque può chiamarla, il server verifica l'orario. Idempotente.
import { closeCall, publicSnapshot, snapshot } from '@/lib/auction';
import { handler, json, withAuction } from '@/lib/api';
import { publish } from '@/lib/realtime';

export const POST = handler(async (_req: Request, { params }: { params: Promise<{ code: string }> }) => {
  const a = await withAuction((await params).code);
  const c = await closeCall(a, false);
  if (!c) return json({ closed: false });
  const s = publicSnapshot(await snapshot(a));
  await publish(a.code, 'state', s);
  return json({ closed: true, ...s });
});
