import { notFound } from 'next/navigation';
import { getAuction } from '@/lib/auction';
import { Board } from './Board';

export const dynamic = 'force-dynamic';

export default async function BoardPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const a = await getAuction(code);
  if (!a) notFound();
  return <Board code={a.code} />;
}
