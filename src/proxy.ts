import { NextResponse, type NextRequest } from "next/server";

/**
 * Optimistic route guard. It only checks that a session cookie exists —
 * no database lookup, since Proxy runs on every matched request including
 * prefetches. The real checks happen in `/api/auth/me` (which each
 * dashboard layout calls to verify the role) and in every route handler
 * that reads or writes protected data.
 *
 * Must match `SESSION_COOKIE` in `src/lib/server/session.ts`; it is
 * duplicated rather than imported to keep Node-only modules out of Proxy.
 */
const SESSION_COOKIE = "wale_session";

export function proxy(request: NextRequest) {
  if (request.cookies.has(SESSION_COOKIE)) return NextResponse.next();

  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("next", request.nextUrl.pathname + request.nextUrl.search);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: [
    "/student/:path*",
    "/landlord/:path*",
    "/lawyer/:path*",
    "/tenant/:path*",
    "/admin/:path*",
    "/profile/:path*",
    "/notifications/:path*",
    "/account/:path*",
    "/wallet/:path*",
  ],
};
