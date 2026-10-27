import { NextResponse, type NextRequest } from 'next/server';

/** Sem cookie de sessão, manda para o login. A validação real acontece na API. */
export function middleware(req: NextRequest) {
  const hasSession = req.cookies.has('pj_token');
  const { pathname } = req.nextUrl;
  if (!hasSession && pathname !== '/login') {
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    url.search = pathname === '/' ? '' : `?next=${encodeURIComponent(pathname)}`;
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next|fonts|favicon.svg).*)'],
};
