'use client';
import type { Slots } from '@/db/schema';
import type { TeamState } from '@/lib/auction';
import { ROLES } from '@/lib/listone';

// Griglia delle squadre con le rose. I valori -1 sono nascosti (non ancora rivelati dall'admin).
export function TeamsGrid({ teams, slots, me, compact }: { teams: TeamState[]; slots: Slots; me?: number | null; compact?: boolean }) {
  return (
    <div className="teams">
      {teams.map(t => (
        <div key={t.id} className={`team${t.id === me ? ' me' : ''}`}>
          <h3><span>{t.name}</span>{t.credits >= 0 && <span className="cr tab">{t.credits} cr</span>}</h3>
          <div className="cnt">
            {ROLES.map(r => <span key={r}>{r} {t.count[r]}/{slots[r]}{t.spentByRole[r] >= 0 ? ` · ${t.spentByRole[r]}` : ''}</span>)}
          </div>
          {!compact && (
            <ul>
              {ROLES.flatMap(r => t.roster.filter(x => x.role === r)).map(x => (
                <li key={x.callId}><span className={`chip ${x.role}`}>{x.role}</span><span>{x.name}</span><span className="t">{x.team}</span>{x.price >= 0 && <span className="p tab">{x.price}</span>}</li>
              ))}
              {!t.roster.length && <li className="muted">Nessun giocatore</li>}
            </ul>
          )}
        </div>
      ))}
    </div>
  );
}
