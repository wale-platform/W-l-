/**
 * Live auth contract check.
 *
 * Runs the real auth flow against a running backend and parses every response
 * with the SAME Zod schemas the UI uses, so a contract drift fails here instead
 * of throwing inside a form the user is typing into.
 *
 * Transport is plain fetch plus a tiny cookie jar (axios has no jar in Node),
 * but the envelope-unwrap and error-flatten steps mirror
 * `src/lib/api/client.ts` exactly — otherwise the schemas would be fed a shape
 * the browser never sees.
 *
 * Run with the backend up:
 *   node --experimental-strip-types scripts/verify-auth-contract.ts
 *   (or: backend/node_modules/.bin/tsx scripts/verify-auth-contract.ts)
 *
 * Leaves ONE throwaway account behind: authcheck+<epoch>@wale.test. To remove:
 *   DELETE FROM "User" WHERE email LIKE 'authcheck+%@wale.test';
 */

import {
  apiErrorSchema,
  authResponseSchema,
  messageResponseSchema,
  myRolesResponseSchema,
  userSchema,
} from "../src/lib/api/schemas";
import { fieldErrorsFrom, statusOf } from "../src/lib/api/field-errors";

const BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000/api/v1";

let passed = 0;
let failed = 0;

function check(name: string, ok: boolean, detail = "") {
  if (ok) {
    passed++;
    console.log(`  PASS  ${name}`);
  } else {
    failed++;
    console.log(`  FAIL  ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

/* ------------------------------------------------------------ cookie jar -- */

const jar = new Map<string, string>();

function storeCookies(res: Response) {
  for (const raw of res.headers.getSetCookie()) {
    const [pair] = raw.split(";");
    const eq = pair.indexOf("=");
    if (eq > 0) jar.set(pair.slice(0, eq).trim(), pair.slice(eq + 1).trim());
  }
}

function cookieHeader(): string {
  return [...jar].map(([k, v]) => `${k}=${v}`).join("; ");
}

/* ------------------------------------------------- client.ts equivalence -- */

type Flat = { message: string; code?: string; field?: string; details?: unknown[] };

/** Mirrors the error interceptor in src/lib/api/client.ts. */
function flattenError(body: unknown): Flat {
  if (typeof body !== "object" || body === null) {
    return { message: "An unexpected error occurred" };
  }
  const record = body as Record<string, unknown>;
  const nested = record.error;
  const source =
    typeof nested === "object" && nested !== null
      ? (nested as Record<string, unknown>)
      : record;
  const details = source.details;
  const first =
    Array.isArray(details) && typeof details[0] === "object" && details[0] !== null
      ? (details[0] as Record<string, unknown>)
      : undefined;
  return {
    message: typeof source.message === "string" ? source.message : "An unexpected error occurred",
    code: typeof source.code === "string" ? source.code : undefined,
    field: first && typeof first.field === "string" ? first.field : undefined,
    details: Array.isArray(details) ? details : undefined,
  };
}

interface Call {
  status: number;
  /** Envelope-unwrapped success payload, as call sites see it. */
  data: unknown;
  /** Axios-shaped rejection, so fieldErrorsFrom/statusOf can be used as-is. */
  error?: { response: { status: number; data: Flat } };
}

async function call(
  method: "GET" | "POST" | "DELETE",
  path: string,
  body?: unknown,
): Promise<Call> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const cookies = cookieHeader();
  if (cookies) headers.Cookie = cookies;

  // Double-submit CSRF, exactly as the request interceptor does it.
  if (method !== "GET") {
    if (!jar.has("wale_csrf")) await call("GET", "/auth/csrf");
    const token = jar.get("wale_csrf");
    if (token) headers["X-CSRF-Token"] = decodeURIComponent(token);
    const refreshed = cookieHeader();
    if (refreshed) headers.Cookie = refreshed;
  }

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  storeCookies(res);

  const text = await res.text();
  let parsed: unknown = undefined;
  try {
    parsed = text ? JSON.parse(text) : undefined;
  } catch {
    parsed = text;
  }

  if (!res.ok) {
    return {
      status: res.status,
      data: parsed,
      error: { response: { status: res.status, data: flattenError(parsed) } },
    };
  }

  // Envelope unwrap, as the response interceptor does it.
  const unwrapped =
    typeof parsed === "object" && parsed !== null && "success" in parsed && "data" in parsed
      ? (parsed as { data: unknown }).data
      : parsed;

  return { status: res.status, data: unwrapped };
}

/* ------------------------------------------------------------------ main -- */

const stamp = process.env.STAMP ?? String(Math.floor(Number(process.env.EPOCH ?? "0")) || 1);
const email = `authcheck+${stamp}@wale.test`;
const password = "Wale12345";

console.log(`\nAuth contract check against ${BASE}`);
console.log(`Throwaway account: ${email}\n`);

// 1. CSRF bootstrap
{
  const r = await call("GET", "/auth/csrf");
  check("GET /auth/csrf returns 200", r.status === 200, `got ${r.status}`);
  check("wale_csrf cookie is readable by JS (not httpOnly)", jar.has("wale_csrf"));
}

// 2. Register as MOVER — the role the spec added
let userId = "";
{
  const r = await call("POST", "/auth/register", {
    firstName: "Auth",
    lastName: "Check",
    email,
    phone: "08031234567",
    password,
    confirmPassword: password,
    role: "MOVER",
  });
  check("POST /auth/register creates a MOVER", r.status === 201 || r.status === 200, `got ${r.status} ${JSON.stringify(r.data).slice(0, 200)}`);

  const parsed = authResponseSchema.safeParse(r.data);
  check(
    "register response parses with authResponseSchema",
    parsed.success,
    parsed.success ? "" : JSON.stringify(parsed.error.issues).slice(0, 300),
  );
  if (parsed.success) {
    userId = parsed.data.user.id;
    check("primary role is MOVER", parsed.data.user.role === "MOVER", parsed.data.user.role);
    check("roles[] is present and includes MOVER", Boolean(parsed.data.user.roles?.includes("MOVER")), JSON.stringify(parsed.data.user.roles));
    check("no password field leaks into the user payload", !("password" in (parsed.data.user as object)));
    check("phone was normalized to +234 form", parsed.data.user.phone === "+2348031234567", String(parsed.data.user.phone));
  }
  check("session cookie was set", jar.has("wale_session"));
}

// 3. GET /auth/me
{
  const r = await call("GET", "/auth/me");
  check("GET /auth/me returns 200 while signed in", r.status === 200, `got ${r.status}`);
  const envelope = authResponseSchema.safeParse(r.data);
  const bare = userSchema.safeParse(r.data);
  check(
    "me() payload parses (authResponseSchema or userSchema)",
    envelope.success || bare.success,
    envelope.success ? "" : JSON.stringify(envelope.error.issues).slice(0, 300),
  );
}

// 4. Roles endpoint
{
  const r = await call("GET", "/users/me/roles");
  check("GET /users/me/roles returns 200", r.status === 200, `got ${r.status}`);
  const parsed = myRolesResponseSchema.safeParse(r.data);
  check(
    "roles payload parses with myRolesResponseSchema",
    parsed.success,
    parsed.success ? "" : `${JSON.stringify(parsed.error.issues).slice(0, 300)} :: got ${JSON.stringify(r.data).slice(0, 200)}`,
  );
}

// 5. Duplicate email is a field-level error the form can show
{
  const r = await call("POST", "/auth/register", {
    firstName: "Auth",
    lastName: "Check",
    email,
    password,
    confirmPassword: password,
    role: "TENANT",
  });
  check("duplicate email is rejected", r.status === 409 || r.status === 422, `got ${r.status}`);
  check("duplicate-email error parses with apiErrorSchema", apiErrorSchema.safeParse(r.error?.response.data).success);
  check("statusOf() reads the status back", statusOf(r.error) === r.status);
}

// 6. Mismatched confirmation maps onto the confirmPassword input
{
  const r = await call("POST", "/auth/register", {
    firstName: "Mismatch",
    lastName: "Case",
    email: `authcheck+mismatch${stamp}@wale.test`,
    password,
    confirmPassword: "Different123",
    role: "TENANT",
  });
  check("mismatched confirmation is 422", r.status === 422, `got ${r.status}`);
  const fields = fieldErrorsFrom(r.error);
  check(
    "fieldErrorsFrom() surfaces confirmPassword",
    fields.some((f) => f.field === "confirmPassword"),
    JSON.stringify(fields),
  );
}

// 7. Privilege escalation at signup is refused
for (const role of ["ADMIN", "LAWYER"]) {
  const r = await call("POST", "/auth/register", {
    firstName: "Esc",
    lastName: "Alate",
    email: `authcheck+${role.toLowerCase()}${stamp}@wale.test`,
    password,
    confirmPassword: password,
    role,
  });
  check(`self-assigning ${role} at signup is refused`, r.status === 422, `got ${r.status}`);
}

// 8. Wrong password must not reveal whether the account exists
{
  const r = await call("POST", "/auth/login", { email, password: "WrongPass123" });
  check("wrong password is 401", r.status === 401, `got ${r.status}`);
  const message = r.error?.response.data.message ?? "";
  check(
    "login failure message does not enumerate accounts",
    !/not found|no account|does not exist|unregistered/i.test(message),
    message,
  );
}

// 9. Forgot-password is non-enumerating and parses
{
  const r = await call("POST", "/auth/forgot-password", { email: "definitely-not-a-user@wale.test" });
  check("POST /auth/forgot-password returns 200 for an unknown email", r.status === 200, `got ${r.status}`);
  const parsed = messageResponseSchema.safeParse(r.data);
  check(
    "forgot-password parses with messageResponseSchema",
    parsed.success,
    parsed.success ? "" : `${JSON.stringify(parsed.error.issues).slice(0, 200)} :: got ${JSON.stringify(r.data).slice(0, 200)}`,
  );
}

// 10. Reset with a bogus token must fail
{
  const r = await call("POST", "/auth/reset-password", { token: "not-a-real-token", password: "Another123" });
  check("reset-password with a bogus token fails", r.status >= 400, `got ${r.status}`);
}

// 11. Verify-email with a bogus token must fail
{
  const r = await call("POST", "/auth/verify-email", { token: "not-a-real-token" });
  check("verify-email with a bogus token fails", r.status >= 400, `got ${r.status}`);
}

// 12. CSRF is still enforced (it must not have been loosened to make this pass)
{
  const headers: Record<string, string> = { "Content-Type": "application/json", Cookie: cookieHeader() };
  const res = await fetch(`${BASE}/auth/login`, {
    method: "POST",
    headers, // deliberately no X-CSRF-Token
    body: JSON.stringify({ email, password }),
  });
  check("POST without X-CSRF-Token is rejected", res.status === 403, `got ${res.status}`);
}

// 13. Login, then logout, then confirm me() has nothing to return
{
  const login = await call("POST", "/auth/login", { email, password });
  check("POST /auth/login with the right password returns 200", login.status === 200, `got ${login.status}`);
  check("login response parses with authResponseSchema", authResponseSchema.safeParse(login.data).success);

  const out = await call("POST", "/auth/logout");
  check("POST /auth/logout returns 200", out.status === 200, `got ${out.status}`);
  check("logout parses with messageResponseSchema", messageResponseSchema.safeParse(out.data).success);

  jar.delete("wale_session"); // the browser would drop the cleared cookie too
  const me = await call("GET", "/auth/me");
  check("GET /auth/me is 401 once signed out (me() maps this to null)", me.status === 401, `got ${me.status}`);
}

console.log(`\n${passed} passed, ${failed} failed`);
if (userId) console.log(`Throwaway user id: ${userId}`);
process.exit(failed === 0 ? 0 : 1);
