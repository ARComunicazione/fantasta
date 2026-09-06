import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { isAdmin } from '@/lib/auth';
import { getAuction, snapshot } from '@/lib/auction';
import { ROLES, RNAME } from '@/lib/listone';
import { PrintButton } from './PrintButton';

export const dynamic = 'force-dynamic';

// Riepilogo finale: tutte le rose con prezzi, spese per reparto e crediti residui. Stampabile ed esportabile in CSV.
export default async function Riepilogo({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  if (!(await isAdmin())) redirect(`/admin?next=/admin/${code}/riepilogo`);
  const a = await getAuction(code);
  if (!a) notFound();
  const s = await snapshot(a);
  const today = new Date().toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' });
  const totalSlots = ROLES.reduce((n, r) => n + a.slots[r], 0);
  return (
    <>
      <style>{`
        .rp{max-width:1360px;margin:0 auto;padding:16px 14px}
        .rp-h{display:flex;flex-wrap:wrap;gap:8px 16px;align-items:center;margin-bottom:14px}
        .rp-h h1{font-size:24px;font-weight:800;margin-right:auto}
        .rp-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:14px}
        .rp-team{break-inside:avoid;padding:14px 16px}
        .rp-team h2{display:flex;justify-content:space-between;align-items:baseline;font-size:17px;font-weight:800;margin-bottom:6px}
        .rp-team h2 span{font-size:14px;color:var(--accent);font-variant-numeric:tabular-nums}
        .rp-sum{display:flex;gap:6px;flex-wrap:wrap;font-size:11px;color:var(--muted);font-weight:600;margin-bottom:8px}
        .rp-sum span{padding:2px 7px;border-radius:999px;border:1px solid var(--stroke-2)}
        table.rp-t{width:100%;border-collapse:collapse;font-size:13px}
        table.rp-t td{padding:3px 4px;border-top:1px solid var(--hair);vertical-align:middle}
        table.rp-t td.n{width:auto}
        table.rp-t td.t{color:var(--muted);font-size:12px}
        table.rp-t td.p{text-align:right;font-weight:700;font-variant-numeric:tabular-nums;width:44px}
        table.rp-t tr.role td{border-top:0;padding-top:8px;font-size:10.5px;letter-spacing:.06em;text-transform:uppercase;color:var(--muted);font-weight:600}
        table.rp-t tr.tot td{font-weight:700;border-top:1px solid var(--stroke-2)}
        table.rp-t tr.empty td{color:var(--muted2);font-style:italic}
        @media print{
          @page{margin:12mm}
          body{background:#fff;color:#000}
          .glass{background:#fff !important;border:1px solid #ccc !important;box-shadow:none !important;-webkit-backdrop-filter:none;backdrop-filter:none}
          .no-print{display:none !important}
          .rp{padding:0}
          .rp-grid{grid-template-columns:repeat(2,1fr)}
          .rp-team h2 span{color:#000}
          .chip{-webkit-print-color-adjust:exact;print-color-adjust:exact}
        }
      `}</style>
      <main className="rp">
        <div className="rp-h">
          <h1>{a.name}</h1>
          <span className="muted small">Riepilogo del {today} · {s.teams.length} squadre · {a.budget} crediti · {totalSlots} giocatori a rosa</span>
          <span className="no-print" style={{ display: 'flex', gap: 6 }}>
            <Link className="ghost" href={`/admin/${a.code}`}>Console</Link>
            <a className="ghost" href={`/api/admin/${a.code}/export`}>Scarica CSV</a>
            <PrintButton />
          </span>
        </div>
        <div className="rp-grid">
          {s.teams.map(t => {
            const taken = ROLES.reduce((n, r) => n + t.count[r], 0);
            return (
              <section key={t.id} className="panel glass rp-team">
                <h2>{t.name}<span>{t.credits} cr residui</span></h2>
                <div className="rp-sum"><span>spesi {t.spent}</span><span>{taken}/{totalSlots} giocatori</span>{ROLES.map(r => <span key={r}>{r} {t.count[r]}/{a.slots[r]} · {t.spentByRole[r]}</span>)}</div>
                <table className="rp-t"><tbody>
                  {ROLES.map(r => {
                    const rows = t.roster.filter(x => x.role === r).sort((x, y) => y.price - x.price);
                    return [
                      <tr key={r + 'h'} className="role"><td colSpan={3}><span className={`chip ${r}`} style={{ width: 18, height: 18, fontSize: 10, marginRight: 6 }}>{r}</span>{RNAME[r]}</td></tr>,
                      ...rows.map(x => <tr key={x.callId}><td className="n">{x.name}</td><td className="t">{x.team}</td><td className="p">{x.price}</td></tr>),
                      ...(rows.length < a.slots[r] ? [<tr key={r + 'e'} className="empty"><td colSpan={3}>{a.slots[r] - rows.length} {a.slots[r] - rows.length === 1 ? 'posto libero' : 'posti liberi'}</td></tr>] : []),
                    ];
                  })}
                  <tr className="tot"><td colSpan={2}>Totale</td><td className="p">{t.spent}</td></tr>
                </tbody></table>
              </section>
            );
          })}
        </div>
      </main>
    </>
  );
}
