# Wale Housing API — v1

Base URL: `/<host>/api/v1`

## Conventions

**Response envelope.** Every response is wrapped so the client branches on one shape:

```jsonc
// success
{ "success": true, "data": { /* payload */ } }

// failure
{ "success": false, "error": { "code": "STRING_CODE", "message": "Human readable", "details": [ /* optional */ ] } }
```

`error.details` (when present) is an array of `{ field, message }` for field-level
validation failures. The frontend unwraps `data` in an axios interceptor and
parses it against its Zod schemas — see
[frontend-integration.md](frontend-integration.md).

**Auth.** Authentication rides on an httpOnly session cookie (`wale_session`) set
at register/login. Send credentialed requests (`withCredentials: true`).

**CSRF.** All unsafe methods (`POST`/`PUT`/`PATCH`/`DELETE`) require a
double-submit token: `GET /auth/csrf` sets a readable `wale_csrf` cookie and
returns the token; echo it in the `X-CSRF-Token` header on every mutation.

**Error codes.** `VALIDATION_ERROR` (422), `BAD_REQUEST` (400),
`UNAUTHORIZED` · `INVALID_CREDENTIALS` · `ACCOUNT_INACTIVE` · `INVALID_TOKEN` (401),
`FORBIDDEN` (403), `NOT_FOUND` (404), `EMAIL_TAKEN` · `CONFLICT` (409),
`RATE_LIMITED` (429), `INTERNAL_ERROR` (500).

---

## Health

### `GET /health`
Liveness. → `200` `{ status: "ok", uptime: <seconds> }`

### `GET /health/ready`
Readiness — runs `SELECT 1`. → `200` `{ status: "ready", database: "up" }` or
`503` `{ code: "NOT_READY" }`.

---

## Auth

### `GET /auth/csrf`
Bootstrap CSRF. Sets the `wale_csrf` cookie. → `200` `{ csrfToken }`.

### `POST /auth/register`
Create an account and log in immediately (sets `wale_session`). A verification
email is sent (logged in dev); email verification is **not** yet a login gate.

Body — accepts the frontend's single `name` **or** explicit `firstName`/`lastName`:

```jsonc
{ "name": "Ada Obi", "email": "ada@example.com", "password": "Password123", "university": "unilag" }
```

Password policy: ≥ 8 chars with upper, lower and a digit. → `201`
`{ user }`. Errors: `422` (validation), `409 EMAIL_TAKEN`.

### `POST /auth/login`
Body `{ email, password }`. → `200` `{ user }` and sets `wale_session`.
Errors: `401 INVALID_CREDENTIALS` (wrong password **or** unknown email — no
enumeration), `401 ACCOUNT_INACTIVE`.

### `POST /auth/logout`
Revokes the current session and clears the cookie. → `200` `{ message }`.

### `POST /auth/logout-all` · auth required
Revokes every session for the user. → `200` `{ message, sessionsRevoked }`.

### `GET /auth/me` · auth required
→ `200` `{ user }`. `401` if no valid session.

### `POST /auth/verify-email`
Body `{ token }`. → `200` `{ user, message }`. `401 INVALID_TOKEN` if
invalid/expired/used.

### `POST /auth/resend-verification`
Body `{ email }`. Always → `200` with a uniform message (no enumeration).

### `POST /auth/forgot-password`
Body `{ email }`. Always → `200` with a uniform message (no enumeration). Sends
a reset link if the account exists.

### `POST /auth/reset-password`
Body `{ token, password }`. Sets the new password and **revokes all sessions**.
→ `200` `{ message }`. `401 INVALID_TOKEN` if invalid/expired/used.

### `GET /auth/sessions` · auth required
→ `200` `{ sessions: [{ id, userAgent, ip, createdAt, lastUsedAt, expiresAt, current }] }`.
Never exposes token hashes.

### `DELETE /auth/sessions/:id` · auth required
Revoke one session (per-device). → `200` `{ revoked: boolean }`.

### The `user` object

```jsonc
{
  "id": "…", "email": "ada@example.com",
  "name": "Ada Obi", "firstName": "Ada", "lastName": "Obi",
  "role": "USER",                 // USER | LANDLORD | ADMIN
  "university": "unilag",         // may be null
  "avatar": null,
  "emailVerified": false,
  "createdAt": "2026-08-08T…Z"
}
```

`passwordHash` is never serialized — a single serializer
([user.serializer.ts](../src/modules/users/user.serializer.ts)) is the only path to the wire.

---

## Properties (read-only)

Only publicly listable rows are returned: `VERIFIED` and `PENDING_VERIFICATION`.
Internal fields (`status`, `ownerId`) never cross the wire; `verified` is derived
as `status === "VERIFIED"`.

### `GET /properties`
Query params (all optional): `query`, `university`, `minPrice`, `maxPrice`,
`type` (`studio|one_bedroom|two_bedroom|shared`), `verifiedOnly` (`true|false`),
`page` (default 1), `pageSize` (default 12, max 50).

→ `200`:

```jsonc
{ "properties": [ /* Property */ ], "total": 42, "page": 1, "pageSize": 12, "totalPages": 4 }
```

### `GET /properties/:id`
→ `200` a single `Property`, or `404 NOT_FOUND`.

### The `Property` object

```jsonc
{
  "id": "wale-001", "title": "…", "description": "…",
  "price": 850000, "type": "studio", "bedrooms": 1, "bathrooms": 1,
  "address": "…", "city": "Yaba", "state": "Lagos", "university": "unilag",
  "verified": true,
  "availableDate": "2026-09-01",        // YYYY-MM-DD (date-only)
  "images": ["/listings/listing-01.jpg"],
  "amenities": ["wifi", "water"],
  "coordinates": { "lat": 6.5158, "lng": 3.3898 },   // omitted if unknown
  "source": "wale",                                   // wale | agent | landlord
  "landlord": { "name": "…", "phone": "…", "email": "…" },
  "createdAt": "2026-…Z", "updatedAt": "2026-…Z"
}
```

---

## Contact

### `POST /contact`
Dispatches a contact enquiry (emailed to the team; logged in dev). Not persisted
in this phase.

Body (mirrors the frontend form):

```jsonc
{ "name": "Ada", "email": "ada@example.com", "phone": "+2348012345678", "subject": "…", "message": "at least 20 chars" }
```

`phone` optional, Nigerian format `^(\+234|0)[789]\d{9}$`. `subject` ≥ 5,
`message` ≥ 20. → `200` `{ message }`. Errors: `422`.

---

## Rate limits

A global limiter applies to all routes; a stricter limiter guards credential and
token-issuing auth endpoints (`register`, `login`, `resend-verification`,
`forgot-password`, `reset-password`). Exceeding a limit → `429 RATE_LIMITED`.
Limits are configurable via `RATE_LIMIT_*` / `AUTH_RATE_LIMIT_MAX`.
