import { headers } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import QRCode from 'qrcode';
import { isAdmin } from '@/lib/auth';
import { getAuction } from '@/lib/auction';
import { Console } from './Console';

export const dynamic = 'force-dynamic';

export default async function AdminAuction({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  if (!(await isAdmin())) redirect(`/admin?next=/admin/${code}`);
  const a = await getAuction(code);
  if (!a) notFound();
  const h = await headers();
  const base = process.env.NEXT_PUBLIC_BASE_URL || `${h.get('x-forwarded-proto') ?? 'http'}://${h.get('x-forwarded-host') ?? h.get('host')}`;
  const joinUrl = `${base}/a/${a.code}`;
  const qr = await QRCode.toDataURL(joinUrl, { margin: 1, width: 520, color: { dark: '#0C1117', light: '#FFFFFF' } });
  return <Console code={a.code} joinUrl={joinUrl} qr={qr} />;
}
