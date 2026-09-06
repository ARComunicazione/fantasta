import { isAdmin } from '@/lib/auth';
import { getDb, schema } from '@/db';
import { desc } from 'drizzle-orm';
import { AdminHome, AdminLogin } from './AdminHome';

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  if (!(await isAdmin())) return <AdminLogin needsPassword={!!process.env.ADMIN_PASSWORD} />;
  const db = await getDb();
  const list = await db.select().from(schema.auctions).orderBy(desc(schema.auctions.id));
  return <AdminHome auctions={list.map(a => ({ code: a.code, name: a.name, status: a.status, budget: a.budget, createdAt: a.createdAt.toISOString() }))} />;
}
