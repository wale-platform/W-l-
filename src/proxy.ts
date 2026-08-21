import { NextResponse, type NextRequest } from "next/server";

/**
 * Route gate for signed-in areas.
 *
 * This is an OPTIMISTIC check and nothing more. It asks one question — is a
 * session cookie present? — and redirects to sign-in when it isn't. It does not
 * and must not validate the cookie: the session token is an opaque HMAC-hashed
 * value with no readable payload, so proving it is real means asking the
 * backend, and the Next docs are explicit that proxy runs on every request
 * (prefetches included) and must not do session or authorization work.
 *
 * What this buys is UX: a guest who clicks a dashboard link lands on sign-in
 * with their destination preserved, instead of watching an empty dashboard
 * render and then fail every request behind it.
 *
 * What it is NOT is a security boundary. A forged or expired cookie sails past
 * this check, and that is fine — every dashboard's data comes from the API, and
 * the backend authorizes each request independently. Role checks are not here
 * either: the cookie carries no role. Validating the session and checking roles
 * happen one layer in, in `requireUser()`/`requireRole()`, which each protected
 * page calls and which can afford the backend round-trip that this cannot.
 *
 * Auth pages are deliberately NOT gated in the other direction. Bouncing a
 * cookie-bearing visitor away from /login would strand anyone holding a stale
 * or revoked cookie on a page they cannot leave — the one page they need to fix
 * it. The forms handle that case themselves, using a validated session.
 */

const SESSION_COOKIE = "wale_session";

/** Read back by `server-auth.ts`; layouts cannot see their own pathname. */
const PATH_HEADER = "x-wale-pathname";

export function proxy(request: NextRequest): NextResponse {
  const { pathname, search } = request.nextUrl;

  if (request.cookies.has(SESSION_COOKIE)) {
    // Pass the path along so a layout that has to bounce a stale session can
    // build a `?next=` pointing back here. Set on the request, not the
    // response: it is for our own server components, not for the browser.
    const forwarded = new Headers(request.headers);
    forwarded.set(PATH_HEADER, `${pathname}${search}`);
    return NextResponse.next({ request: { headers: forwarded } });
  }

  const url = request.nextUrl.clone();
  url.pathname = "/login";
  // Drop any query the protected URL carried before adding our own, so a stray
  // `?next=` on the way in cannot survive into the sign-in link.
  url.search = "";
  url.searchParams.set("next", `${pathname}${search}`);

  return NextResponse.redirect(url);
}

/**
 * Only the signed-in areas. Listed literally — matcher values are read
 * statically at build time, so they cannot be derived from a shared constant.
 * Each area needs both entries: the bare path and everything beneath it.
 */
export const config = {
  matcher: [
    "/admin",
    "/admin/:path*",
    "/landlord",
    "/landlord/:path*",
    "/lawyer",
    "/lawyer/:path*",
    "/tenant",
    "/tenant/:path*",
    "/profile",
    "/profile/:path*",
    "/notifications",
    "/notifications/:path*",
    // Explains a wrong-role bounce, so it needs a session of its own — without
    // one it would tell strangers which roles the product has.
    "/no-access",
  ],
};
