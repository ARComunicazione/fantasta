// Esporta in CSV tutte le assegnazioni: squadra, ruolo, giocatore, club, Qt.A, prezzo.
import { snapshot } from '@/lib/auction';
import { handler, requireAdmin, withAuction } from '@/lib/api';
import { ROLES } from '@/lib/listone';

const q = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;

export const GET = handler(async (_req: Request, { params }: { params: Promise<{ code: string }> }) => {
  await requireAdmin();
  const a = await withAuction((await params).code);
  const s = await snapshot(a);
  const lines = ['Squadra;Ruolo;Giocatore;Club;Qt.A;Prezzo'];
  for (const t of s.teams) for (const r of ROLES) for (const x of t.roster.filter(x => x.role === r).sort((x, y) => y.price - x.price)) {
    lines.push([t.name, x.role, x.name, x.team, x.qa || '', x.price].map(q).join(';'));
  }
  lines.push('');
  lines.push(['Squadra', 'Spesi', 'Residui', ...ROLES.map(r => `Spesi ${r}`)].map(q).join(';'));
  for (const t of s.teams) lines.push([t.name, t.spent, t.credits, ...ROLES.map(r => t.spentByRole[r])].map(q).join(';'));
  const body = '﻿' + lines.join('\r\n');
  return new Response(body, { headers: { 'content-type': 'text/csv; charset=utf-8', 'content-disposition': `attachment; filename="asta-${a.code}.csv"` } });
});
