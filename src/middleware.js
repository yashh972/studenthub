import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

const secretStr = process.env.JWT_SECRET || 'studyhub-super-secret-key-development-jwt-123456';
const JWT_SECRET = new TextEncoder().encode(secretStr);

export async function middleware(request) {
  const { pathname } = request.nextUrl;
  
  // Retrieve the session token from cookies
  const tokenCookie = request.cookies.get('token');
  const token = tokenCookie ? tokenCookie.value : null;

  let payload = null;
  if (token) {
    try {
      const { payload: verified } = await jwtVerify(token, JWT_SECRET);
      payload = verified;
    } catch (e) {
      // Session is expired or signature is invalid
    }
  }

  const isAuthenticated = !!payload;

  // 1. Route guard for protected admin endpoints
  if (pathname.startsWith('/admin')) {
    if (!isAuthenticated) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('from', pathname);
      return NextResponse.redirect(loginUrl);
    }
    if (payload.role !== 'admin') {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }

  // 1b. Route guard for protected dashboard endpoints
  if (pathname.startsWith('/dashboard')) {
    if (!isAuthenticated) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('from', pathname);
      return NextResponse.redirect(loginUrl);
    }

    // Redirect unverified users to verify-email, EXCEPT if they are already on verify-email
    if (!payload.isVerified && pathname !== '/dashboard/verify-email') {
      return NextResponse.redirect(new URL('/dashboard/verify-email', request.url));
    }

    // Redirect verified users away from verify-email back to the main dashboard
    if (payload.isVerified && pathname === '/dashboard/verify-email') {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }

  // 2. Redirect logged-in users away from authentication pages
  if (pathname === '/login' || pathname === '/signup' || pathname === '/') {
    if (isAuthenticated) {
      // If unverified, let them go to dashboard which will redirect them to verify-email
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/',
    '/dashboard/:path*',
    '/admin/:path*',
    '/login',
    '/signup',
  ],
};
