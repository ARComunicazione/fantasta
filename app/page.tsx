import Link from 'next/link';
import { redirect } from 'next/navigation';

export default async function Home({ searchParams }: { searchParams: Promise<{ code?: string }> }) {
  const { code } = await searchParams;
  if (code) redirect(`/a/${code.trim().toUpperCase()}`);
  return (
    <main className="narrow">
      <div className="panel glass" style={{ padding: 28 }}>
        <div className="brand" style={{ marginBottom: 18 }}>
          <span className="logo">FA</span>
          <div><h1>FantAsta</h1><span>Serie A 2026/27</span></div>
        </div>
        <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 6 }}>Entra nell&apos;asta</h2>
        <p className="note" style={{ marginTop: 0 }}>Inquadra il QR code dell&apos;asta oppure inserisci il codice a 6 lettere.</p>
        <form action="/" method="get" style={{ display: 'flex', gap: 8, marginTop: 14 }}>
          <input className="inp num" name="code" placeholder="CODICE" maxLength={6} autoCapitalize="characters" autoComplete="off" style={{ letterSpacing: '.15em', textTransform: 'uppercase', fontSize: 20 }} required />
          <button className="buy" type="submit">Entra</button>
        </form>
        <hr className="hr" style={{ margin: '20px 0' }} />
        <div className="small muted">Sei tu a gestire l&apos;asta? <Link href="/admin">Vai alla console</Link></div>
      </div>
    </main>
  );
}
