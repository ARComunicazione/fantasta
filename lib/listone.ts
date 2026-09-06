import listone from '@/data/listone.json';
import type { Role } from '@/db/schema';

export type Player = { key: string; role: Role; name: string; team: string; qa: number; qi: number; fvm: number; rm: string };

export const LISTONE = listone as Player[];
export const LISTONE_DATE = '6 settembre 2026';
const byKey = new Map(LISTONE.map(p => [p.key, p]));
export const playerByKey = (k: string) => byKey.get(k);

export const ROLES: Role[] = ['P', 'D', 'C', 'A'];
export const RNAME: Record<Role, string> = { P: 'Portieri', D: 'Difensori', C: 'Centrocampisti', A: 'Attaccanti' };
export const RNAME1: Record<Role, string> = { P: 'Portiere', D: 'Difensore', C: 'Centrocampista', A: 'Attaccante' };

export const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
export function searchPlayers(q: string, limit = 10): Player[] {
  const parts = norm(q.trim()).split(/\s+/).filter(Boolean);
  if (!parts.length || parts.join('').length < 2) return [];
  return LISTONE.filter(p => { const h = norm(p.name + ' ' + p.team); return parts.every(w => h.includes(w)); })
    .sort((a, b) => b.qa - a.qa).slice(0, limit);
}
