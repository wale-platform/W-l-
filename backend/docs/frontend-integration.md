# Frontend integration

How the existing Next.js frontend (the repository root, [`src/`](../../src)) talks
to this backend, which lives alongside it in [`backend/`](..) of the same repo.
The backend was shaped to match the frontend's data schemas
([src/lib/api/schemas.ts](../../src/lib/api/schemas.ts)) as
closely as reasonable. This document is the **honest** wiring guide: what works
as-is, the few small changes the frontend needs, and the conflicts that remain
to be resolved when frontend auth is built.

> **Ground rule.** The frontend is not rewritten. The changes below are additive
> and minimal — a couple of interceptors on the existing `apiClient`, and (later)
> three schema adjustments for auth. Nothing here changes component code.

---

## 1. Point the frontend at the backend

One environment variable, which **must include the `/api/v1` prefix**:

```bash
# .env.local  (at the repo root, next to package.json)
NEXT_PUBLIC_API_BASE_URL=http://localhost:4000/api/v1
```

The existing [`apiClient`](../../src/lib/api/client.ts) already reads
`NEXT_PUBLIC_API_BASE_URL` and already sets `withCredentials: true`, so cookies
flow without change. In production this becomes e.g.
`https://api.walehousing.ng/api/v1`.

---

## 2. The response envelope — one required interceptor

**This is the one change properties and contact need to keep working.**

The backend wraps every response as `{ success, data }`. But the frontend's data
layer parses the raw body directly — e.g.
[property.ts](../../src/lib/api/property.ts):

```ts
const { data } = await apiClient.get("/properties");
return propertyListResponseSchema.parse(data);   // expects { properties, total, … }
```

With the envelope, `data` is `{ success, data: { properties, … } }`, so the parse
fails. Fix it in **one place** — add a success interceptor to the existing
`apiClient` that unwraps `data`. No call sites change:

```ts
// src/lib/api/client.ts — add below the existing interceptor
apiClient.interceptors.response.use((response) => {
  const body = response.data;
  if (body && typeof body === "object" && "success" in body && "data" in body) {
    response.data = body.data;   // { success, data } → data
  }
  return response;
});
```

Why keep the envelope (rather than have the backend return bare payloads)? It
gives every endpoint a uniform success/error shape and room for metadata without
reshaping payloads later. The cost is exactly this one interceptor.

---

## 3. Error shape — align the error interceptor

The frontend's existing error interceptor parses `error.response.data` with
`apiErrorSchema` = `{ message, code?, field? }`
([schemas.ts](../../src/lib/api/schemas.ts)). The backend returns
`{ success: false, error: { code, message, details? } }` — a **nested** shape.
Today the frontend's parse fails and coerces to
`{ message: "An unexpected error occurred" }`, so nothing crashes, but the real
message and code are lost.

Map the nested error into the flat shape the frontend already expects — again in
[client.ts](../../src/lib/api/client.ts):

```ts
// Replace the body of the existing error interceptor's `if (error.response?.data)`:
const raw = error.response.data;
const env = raw && typeof raw === "object" && "error" in raw ? raw.error : raw;
error.response.data = {
  message: env?.message ?? "An unexpected error occurred",
  code: env?.code,
  field: env?.details?.[0]?.field,
};
```

This keeps `error.response.data.message` (and now `.code`) working for every
consumer, unchanged.

---

## 4. CSRF bootstrap

Cookie-authenticated mutations require a double-submit token. `GET /auth/csrf`
sets a **readable** `wale_csrf` cookie; echo its value in the `X-CSRF-Token`
header on every unsafe request. A request interceptor on `apiClient` does this
transparently:

```ts
// src/lib/api/client.ts
function readCookie(name: string): string | undefined {
  return document.cookie.split("; ").find((c) => c.startsWith(`${name}=`))?.split("=")[1];
}

let csrfReady: Promise<unknown> | null = null;
const UNSAFE = new Set(["post", "put", "patch", "delete"]);

apiClient.interceptors.request.use(async (config) => {
  if (UNSAFE.has((config.method ?? "get").toLowerCase())) {
    if (!readCookie("wale_csrf")) {
      csrfReady ??= apiClient.get("/auth/csrf");   // fetch once; cookie persists
      await csrfReady;
    }
    const token = readCookie("wale_csrf");
    if (token) config.headers["X-CSRF-Token"] = decodeURIComponent(token);
  }
  return config;
});
```

> SSR note: server-side code has no `document.cookie`. Keep authenticated/mutating
> calls on the client, or forward the incoming `cookie` header and set
> `X-CSRF-Token` manually when calling from a route handler.

With these interceptors, `contactApi.submit(...)` works unchanged — it already
does `apiClient.post("/contact", …)`.

---

## 5. Auth — not yet wired on the frontend (forward-looking)

There is **no `auth.ts`** in `src/lib/api/` yet — the auth schemas
exist but nothing calls the backend. So the following are **latent conflicts** to
resolve when the frontend's auth flow is built. They do not affect properties or
contact today.

| Frontend schema | Backend reality | Resolution when wiring auth |
| --- | --- | --- |
| `userSchema.role: "student" \| "admin"` | `USER \| LANDLORD \| ADMIN` | Update the frontend enum to `["USER","LANDLORD","ADMIN"]` (map to labels in the UI). Backend uses these because a landlord role already exists in the product. |
| `authResponseSchema` requires `token: string` | Auth is **cookie-based**; no body token | Drop `token` from `authResponseSchema`; the httpOnly `wale_session` cookie is set automatically. Read the session via `GET /auth/me`. |
| `userSchema` has no `firstName`/`lastName`/`emailVerified` | Backend returns them **plus** computed `name` | No change required — extra fields are ignored by Zod. Add them to the schema only if the UI needs them. |
| Register sends `{ name, … }` | Backend accepts `name` **or** `firstName` | No change — `name` is supported and split server-side. |

Recommended auth client once built (illustrative):

```ts
// src/lib/api/auth.ts  (to be added by the frontend)
export const authApi = {
  register: (d) => apiClient.post("/auth/register", d).then((r) => r.data), // { user }
  login:    (d) => apiClient.post("/auth/login", d).then((r) => r.data),    // { user }
  me:       () => apiClient.get("/auth/me").then((r) => r.data),            // { user }
  logout:   () => apiClient.post("/auth/logout").then((r) => r.data),
};
```

---

## 6. CORS

The backend allows credentialed requests only from origins listed in
`FRONTEND_URL` (comma-separated). Include the frontend origin
(`http://localhost:3000` in dev), or the browser blocks the request.

---

## 7. Contract summary

Already matched by the backend serializers (no frontend change):

| Point | Status |
| --- | --- |
| `Property` shape (`verified` bool, `availableDate` `YYYY-MM-DD`, `landlord`, `coordinates?`, `source`, `amenities[]`) | ✅ matches `propertySchema` |
| `propertyListResponse` (`properties/total/page/pageSize/totalPages`) | ✅ matches |
| Contact form (Nigerian phone regex, min lengths) | ✅ matches `contactFormSchema` |
| Search params (`type` enum, `verifiedOnly`, `page`, `pageSize` max 50) | ✅ matches `searchParamsSchema` |

Requires the small frontend changes above:

| Point | Change | Section |
| --- | --- | --- |
| Response envelope | add unwrap interceptor | §2 |
| Error shape | align error interceptor | §3 |
| CSRF on mutations | add request interceptor | §4 |
| Auth role enum / token / endpoints | update 2 schemas, add `auth.ts` | §5 |

Full endpoint reference: [api.md](api.md).
