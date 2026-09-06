// Applica le migrazioni su Neon: DATABASE_URL=... npm run db:migrate
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { migrate } from 'drizzle-orm/neon-http/migrator';

const url = process.env.DATABASE_URL;
if (!url) { console.error('DATABASE_URL mancante'); process.exit(1); }
const db = drizzle(neon(url));
migrate(db, { migrationsFolder: './drizzle' }).then(() => { console.log('Migrazioni applicate'); }).catch(e => { console.error(e); process.exit(1); });
