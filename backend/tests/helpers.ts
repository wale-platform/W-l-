import request from "supertest";
import type { App } from "supertest/types";

/**
 * Test helpers for the double-submit CSRF flow.
 *
 * A cookie-authenticated mutation needs (1) the CSRF cookie and (2) the same
 * value echoed in the X-CSRF-Token header. `getCsrf` bootstraps both from
 * GET /auth/csrf; `withCsrf` applies them (plus any session cookies) to a
 * request so tests read like the real client.
 */

const API = "/api/v1";

export async function getCsrf(
  app: App,
): Promise<{ token: string; cookie: string[] }> {
  const res = await request(app).get(`${API}/auth/csrf`);
  const setCookie = res.headers["set-cookie"] as unknown as string[] | undefined;
  return {
    token: res.body?.data?.csrfToken as string,
    cookie: setCookie ?? [],
  };
}

/** Merge multiple Set-Cookie arrays into a single Cookie header array. */
export function mergeCookies(...groups: (string[] | undefined)[]): string[] {
  return groups.flatMap((g) => g ?? []);
}

export { API };
