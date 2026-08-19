import axios, { type InternalAxiosRequestConfig } from "axios";

/**
 * Base axios instance — the single place API transport is configured.
 *
 * `NEXT_PUBLIC_API_BASE_URL` must include the `/api/v1` prefix when pointing at
 * the Express backend (e.g. `http://localhost:4000/api/v1`). It falls back to
 * `/api` — the Next.js route handlers that still serve fixture data for
 * features the backend does not implement yet.
 *
 * Three interceptors bridge the frontend/backend contract. See
 * `backend/docs/frontend-integration.md` and `docs/api-contract.md`:
 *   1. request  — attach the CSRF token to unsafe methods
 *   2. response — unwrap the `{ success, data }` envelope
 *   3. response — flatten the nested error shape
 */
export const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL ?? "/api",
  timeout: 15_000,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true, // Send cookies on cross-origin requests
});

/* ------------------------------------------------------------------ CSRF -- */

const CSRF_COOKIE = "wale_csrf";
const CSRF_HEADER = "X-CSRF-Token";
const UNSAFE_METHODS = new Set(["post", "put", "patch", "delete"]);

function readCookie(name: string): string | undefined {
  if (typeof document === "undefined") return undefined; // SSR: no cookie jar
  return document.cookie
    .split("; ")
    .find((c) => c.startsWith(`${name}=`))
    ?.slice(name.length + 1);
}

/**
 * In-flight bootstrap promise, so N concurrent mutations trigger exactly one
 * `GET /auth/csrf`. Cleared on failure so a later request can retry.
 */
let csrfBootstrap: Promise<unknown> | null = null;

function bootstrapCsrf(): Promise<unknown> {
  csrfBootstrap ??= apiClient.get("/auth/csrf").catch((err: unknown) => {
    csrfBootstrap = null; // allow retry
    throw err;
  });
  return csrfBootstrap;
}

/**
 * Attach the double-submit CSRF token to unsafe requests.
 *
 * The backend enforces `X-CSRF-Token` == `wale_csrf` cookie on every
 * POST/PUT/PATCH/DELETE. The cookie is readable (not httpOnly) by design, so
 * the client can echo it. Requests that already carry the header are left
 * alone, and `/auth/csrf` itself is skipped to avoid recursion.
 */
apiClient.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  const method = (config.method ?? "get").toLowerCase();
  if (!UNSAFE_METHODS.has(method)) return config;
  if (config.url?.includes("/auth/csrf")) return config;
  if (config.headers[CSRF_HEADER]) return config;

  if (!readCookie(CSRF_COOKIE)) {
    try {
      await bootstrapCsrf();
    } catch {
      // Let the request proceed; the backend will answer 403 and the error
      // interceptor surfaces a real message rather than a transport failure.
    }
  }

  const token = readCookie(CSRF_COOKIE);
  if (token) config.headers[CSRF_HEADER] = decodeURIComponent(token);

  return config;
});

/* -------------------------------------------------------------- Envelope -- */

type Envelope = { success: boolean; data?: unknown; error?: unknown };

function isEnvelope(body: unknown): body is Envelope {
  return typeof body === "object" && body !== null && "success" in body;
}

/**
 * Unwrap the backend envelope so call sites parse payloads directly.
 *
 * Backend: `{ success: true, data: { properties, … } }`
 * Mock route handlers: `{ properties, … }` (already bare)
 *
 * Unwrapping here means every consumer works against both, so mocks can be
 * retired feature by feature without touching call sites.
 */
apiClient.interceptors.response.use((response) => {
  const body: unknown = response.data;
  if (isEnvelope(body) && "data" in body) {
    response.data = body.data;
  }
  return response;
});

/* ----------------------------------------------------------------- Errors -- */

function pickString(source: Record<string, unknown>, key: string): string | undefined {
  const value = source[key];
  return typeof value === "string" ? value : undefined;
}

/**
 * Flatten the backend's nested error into the flat shape consumers expect.
 *
 * Backend: `{ success: false, error: { code, message, details?: [{field,message}] } }`
 * Consumers rely on: `error.response.data.message` / `.code` / `.field`
 *
 * Without this, the real message and code are lost and every failure reads
 * "An unexpected error occurred".
 */
apiClient.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    if (!axios.isAxiosError(error) || !error.response?.data) {
      return Promise.reject(error);
    }

    const raw: unknown = error.response.data;

    if (typeof raw === "string") {
      error.response.data = { message: raw };
      return Promise.reject(error);
    }

    if (typeof raw !== "object" || raw === null) {
      error.response.data = { message: "An unexpected error occurred" };
      return Promise.reject(error);
    }

    const record = raw as Record<string, unknown>;
    const nested = record.error;
    const source: Record<string, unknown> =
      typeof nested === "object" && nested !== null
        ? (nested as Record<string, unknown>)
        : record;

    // Field-level validation errors arrive as details: [{ field, message }].
    const details = source.details;
    const firstDetail =
      Array.isArray(details) && typeof details[0] === "object" && details[0] !== null
        ? (details[0] as Record<string, unknown>)
        : undefined;

    error.response.data = {
      message: pickString(source, "message") ?? "An unexpected error occurred",
      code: pickString(source, "code"),
      field: firstDetail ? pickString(firstDetail, "field") : undefined,
      details: Array.isArray(details) ? details : undefined,
    };

    return Promise.reject(error);
  },
);
