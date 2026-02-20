import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

const protectedPaths = ['/watchlist', '/watched', '/recommendations', '/stats'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isProtectedPath = protectedPaths.some((path) => pathname.startsWith(path));

  if (!isProtectedPath) {
    return NextResponse.next();
  }

  const hasSession = Boolean(
    request.cookies.get('sb-access-token')?.value ||
      request.cookies.get('sb:token')?.value ||
      request.cookies.get('auth-token')?.value,
  );

  if (!hasSession) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = '/';
    redirectUrl.search = '';
    return NextResponse.redirect(redirectUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/watchlist/:path*', '/watched/:path*', '/recommendations/:path*', '/stats/:path*'],
};
