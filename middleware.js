import { NextResponse } from 'next/server';
import { updateSupabaseSession } from '@/lib/supabase/middleware';

const PROTECTED_PREFIXES = [
  '/practice',
  '/progress',
  '/settings',
  '/results',
  '/paper-1',
  '/paper-2',
];

export async function middleware(request) {
  const session = await updateSupabaseSession(request);
  const isProtected = PROTECTED_PREFIXES.some((prefix) =>
    request.nextUrl.pathname === prefix || request.nextUrl.pathname.startsWith(`${prefix}/`),
  );

  if (isProtected && !session.user) {
    const destination = request.nextUrl.clone();
    destination.pathname = '/onboarding';
    destination.search = '';
    destination.searchParams.set('next', `${request.nextUrl.pathname}${request.nextUrl.search}`);
    destination.searchParams.set('mode', 'signin');
    return NextResponse.redirect(destination);
  }

  return session.response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
