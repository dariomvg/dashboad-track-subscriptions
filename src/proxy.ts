import { createServerClient } from '@supabase/ssr';
import { type NextRequest, NextResponse } from 'next/server';

import { ROUTES } from '@/lib/config';

const PROTECTED_PATHS = [ROUTES.dashboard, ROUTES.settings, ROUTES.checkout];
const AUTH_ONLY_PATHS = [ROUTES.login, ROUTES.signup, ROUTES.forgotPassword];

function redirectTo(request: NextRequest, source: NextResponse, pathname: string, search?: [string, string]) {
  const url = request.nextUrl.clone();
  url.pathname = pathname;
  url.search = '';
  if (search) url.searchParams.set(search[0], search[1]);
  const redirect = NextResponse.redirect(url);
  // Preserve refreshed session cookies on redirects.
  source.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
  return redirect;
}

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  const isHome = pathname === ROUTES.home;
  const isProtected = PROTECTED_PATHS.some((path) => pathname.startsWith(path));
  const isAuthOnly = AUTH_ONLY_PATHS.some((path) => pathname.startsWith(path));

  if (isProtected && !user) {
    return redirectTo(request, response, ROUTES.login, ['next', pathname]);
  }

  if ((isAuthOnly || isHome) && user) {
    return redirectTo(request, response, ROUTES.dashboard);
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api/auth/callback|api/webhooks|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};