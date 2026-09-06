import * as schema from './schema';
import type { NeonHttpDatabase } from 'drizzle-orm/neon-http';
import type { PgliteDatabase } from 'drizzle-orm/pglite';

// In produzione: Neon via HTTP (serverless). In locale senza DATABASE_URL: PGlite su file,
// così l'app gira senza installare Postgres.
export type DB = NeonHttpDatabase<typeof schema> | PgliteDatabase<typeof schema>;

const g = globalThis as unknown as { __fantastaDb?: Promise<DB> };

async function create(): Promise<DB> {
  const url = process.env.DATABASE_URL;
  if (url) {
    const { neon } = await import('@neondatabase/serverless');
    const { drizzle } = await import('drizzle-orm/neon-http');
    const { migrate } = await import('drizzle-orm/neon-http/migrator');
    const path = await import('node:path');
    const db = drizzle(neon(url), { schema });
    // migrazioni idempotenti al primo avvio del processo: nessun passaggio manuale dopo il deploy
    await migrate(db, { migrationsFolder: path.join(process.cwd(), 'drizzle') });
    return db;
  }
  const { PGlite } = await import('@electric-sql/pglite');
  const { drizzle } = await import('drizzle-orm/pglite');
  const { migrate } = await import('drizzle-orm/pglite/migrator');
  const path = await import('node:path');
  const fs = await import('node:fs');
  const os = await import('node:os');
  // cartella dati locale: PGLITE_DIR, altrimenti la temp di sistema; se non scrivibile, in memoria
  let dir: string | undefined = process.env.PGLITE_DIR || path.join(os.tmpdir(), 'fantasta-pglite');
  try { fs.mkdirSync(dir, { recursive: true }); } catch { dir = undefined; }
  if (!dir) console.warn('PGlite: cartella non scrivibile, uso il database in memoria');
  const client = new PGlite(dir);
  const db = drizzle(client, { schema });
  await migrate(db, { migrationsFolder: path.join(process.cwd(), 'drizzle') });
  return db;
}

export function getDb(): Promise<DB> {
  if (!g.__fantastaDb) g.__fantastaDb = create().catch(e => { g.__fantastaDb = undefined; throw e; });
  return g.__fantastaDb;
}

export { schema };
