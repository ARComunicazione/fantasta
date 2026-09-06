import { notFound } from 'next/navigation';
import { getAuction, teamsPublic } from '@/lib/auction';
import { currentTeamId } from '@/lib/auth';
import { Live } from './Live';

export const dynamic = 'force-dynamic';

export default async function Participant({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const a = await getAuction(code);
  if (!a) notFound();
  const teams = await teamsPublic(a.id);
  const me = await currentTeamId(a.code);
  return <Live code={a.code} name={a.name} teams={teams} initialMe={me} />;
}
