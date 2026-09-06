import { NextResponse, type NextRequest } from 'next/server';

// Protegge le pagine /admin/* (tranne la login) rimandando a /admin se manca il cookie.
// La verifica della firma avviene nelle route e nelle pagine; qui basta la presenza.
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (pathname.startsWith('/admin/') && !req.cookies.get('fa_admin')) {
    const url = req.nextUrl.clone(); url.pathname = '/admin'; url.searchParams.set('next', pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = { matcher: ['/admin/:path*'] };
