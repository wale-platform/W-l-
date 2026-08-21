import "server-only";

import { cache } from "react";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import {
  authResponseSchema,
  hasAnyRole,
  roleHomePath,
  userSchema,
  type Role,
  type User,
} from "./schemas";

/**
 * Data access layer for the session.
 *
 * Everything server-side that needs to know who is asking goes through here, so
 * the auth check cannot be forgotten at a call site: you cannot get the user
 * without it having happened.
 *
 * WHERE THIS MUST BE CALLED — in the page (or the fetch), not in a layout. From
 * `next/dist/docs/01-app/02-guides/authentication.md`:
 *
 *   "A layout also does not control whether the rest of the route renders.
 *    Route segments and parallel route slots are rendered by the router, so a
 *    layout that hides or swaps them does not stop them from running or from
 *    appearing in the RSC Payload."
 *
 * Measured, not assumed: with the gate in the layout, `GET /admin` carrying a
 * bogus session cookie returned a 307 whose 22KB body still contained the admin
 * shell serialized into the flight payload. A guard at the top of the page
 * component itself is what actually stops the markup being built.
 *
 * `cache()` memoizes per render pass, so a layout and the page beneath it that
 * both call this cost one backend round-trip, not two.
 *
 * This is still not the security boundary. The session token is opaque, so only
 * the backend can validate it, and the backend authorizes every API call on its
 * own. What this layer buys is that unauthorized requests are turned away before
 * a page renders — no wasted fetches, no shell markup, no flash of a dashboard.
 */

const SESSION_COOKIE = "wale_session";

/** Set by `proxy.ts`; a page cannot otherwise see its own pathname. */
const PATH_HEADER = "x-wale-pathname";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000/api/v1";

/**
 * The signed-in user, or null. Memoized for the current render pass.
 *
 * Returns null rather than throwing on a transport failure: if the backend is
 * unreachable we cannot prove who this is, and treating an unknown visitor as
 * signed out is the safe direction to fail. The timeout keeps a stalled backend
 * from hanging the page rather than merely failing it.
 */
export const getServerUser = cache(async (): Promise<User | null> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;

  try {
    const response = await fetch(`${API_BASE}/auth/me`, {
      headers: {
        // Only the session cookie. Forwarding the whole jar would hand the
        // backend cookies that are none of its business.
        Cookie: `${SESSION_COOKIE}=${token}`,
        Accept: "application/json",
      },
      // Per-user and revocable, so it must never be cached or shared.
      cache: "no-store",
      signal: AbortSignal.timeout(5_000),
    });

    if (!response.ok) return null; // 401 is the normal answer for a stale cookie

    const body: unknown = await response.json();
    const payload =
      typeof body === "object" && body !== null && "data" in body
        ? (body as { data: unknown }).data
        : body;

    const wrapped = authResponseSchema.safeParse(payload);
    if (wrapped.success) return wrapped.data.user;

    // Tolerate a bare user too, so this keeps working if /auth/me is ever
    // flattened to return the user directly.
    const bare = userSchema.safeParse(payload);
    return bare.success ? bare.data : null;
  } catch {
    return null;
  }
});

/** The path being requested, for a round-trip back after signing in. */
async function currentPath(): Promise<string> {
  const path = (await headers()).get(PATH_HEADER);
  return path?.startsWith("/") && !path.startsWith("//") ? path : "/";
}

/**
 * A signed-in user, or a redirect to sign-in. Never returns null.
 *
 * Call this at the top of any page that requires a session, before returning
 * markup — `redirect()` throws, so nothing below it renders.
 */
export async function requireUser(): Promise<User> {
  const user = await getServerUser();
  if (user) return user;

  // `proxy.ts` already turned away anyone with no cookie at all, so reaching
  // here means the cookie is stale or revoked. Sign-in, not an error page.
  redirect(`/login?next=${encodeURIComponent(await currentPath())}`);
}

/**
 * A signed-in user holding one of `allow`, or a redirect away.
 *
 * Wrong-role goes to `/no-access`, which explains what happened and offers a way
 * on, rather than bouncing silently to a dashboard. Being moved somewhere
 * unexpected with no reason given is how a user concludes the product is broken
 * rather than that they opened a link meant for someone else.
 */
export async function requireRole(allow: readonly Role[]): Promise<User> {
  const user = await requireUser();

  // The union of held roles, not the primary one: a tenant who has also claimed
  // MOVER should reach both areas.
  if (hasAnyRole(user, allow)) return user;

  const params = new URLSearchParams({ allow: allow.join(","), from: await currentPath() });
  redirect(`/no-access?${params.toString()}`);
}

/** Where this user's own dashboard lives — for "get me out of here" links. */
export function homePathFor(user: User): string {
  return roleHomePath[user.role];
}
