# Wale Housing — Backend API

Production backend for **Wale Housing**, a Nigerian proptech platform for
verified student housing near universities. It serves the Next.js frontend it
shares this repository with (the project root) over a versioned REST API, and
lives in the [`backend/`](.) directory of that repo.

- **Stack:** Node.js + TypeScript · Express 5 · Prisma 6 · PostgreSQL (Supabase) · Zod
- **Auth:** Argon2id passwords · DB-backed opaque sessions in httpOnly cookies · double-submit CSRF
- **API base:** `/api/v1` · JSON envelope `{ success, data }` / `{ success, error }`

> **Scope of this phase.** Foundation + authentication + the read-only surface
> the frontend already consumes (properties, contact). Bookings, wallet,
> messaging, uploads and the verification workflow are deferred to later phases
> and are deliberately not modelled yet. See [docs/frontend-analysis.md](docs/frontend-analysis.md).

---

## Quick start

```bash
# 1. Install
npm install

# 2. Configure
cp .env.example .env
#   then set DATABASE_URL / DIRECT_URL and a real SESSION_SECRET (>= 32 chars):
#   node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"

# 3. Database: generate client, apply schema, seed catalogue + dev accounts
npm run prisma:generate
npm run prisma:migrate      # first run creates the initial migration
npm run db:seed

# 4. Run
npm run dev                 # http://localhost:4000  (tsx watch)
```

Verify it's up:

```bash
curl http://localhost:4000/api/v1/health          # liveness
curl http://localhost:4000/api/v1/health/ready    # readiness (checks the DB)
```

---

## Environment

Every variable is validated at startup by [src/config/env.ts](src/config/env.ts)
(Zod) — the process refuses to boot on a misconfigured or insecure setup rather
than failing mid-request. See [.env.example](.env.example) for the annotated
template. The essentials:

| Variable | Purpose | Notes |
| --- | --- | --- |
| `DATABASE_URL` | Runtime DB connection | Supabase: the **pooled** URL (port 6543) |
| `DIRECT_URL` | Migrations/Studio only | Supabase: the **direct** URL (port 5432) |
| `SESSION_SECRET` | HMAC key for hashing tokens | **≥ 32 chars**, random, secret |
| `FRONTEND_URL` | CORS allowlist | Comma-separated origins |
| `COOKIE_SECURE` | Secure cookies | `true` in production (HTTPS) |
| `COOKIE_SAMESITE` | Cookie scope | `lax` same-site; `none` cross-site (needs `COOKIE_SECURE=true`) |
| `EMAIL_TRANSPORT` | Email delivery | `log` (dev default) or `smtp` |

---

## Seeded dev accounts

`npm run db:seed` ports the 12 catalogue listings the frontend used to mock, and
creates three **development-only** accounts:

| Role | Email | Password | University |
| --- | --- | --- | --- |
| Admin | `admin@wale.test` | `AdminDev123!` | — |
| Student | `student@wale.test` | `StudentDev123!` | unilag |
| Landlord | `landlord@wale.test` | `LandlordDev123!` | — |

> ⚠️ **These are throwaway local fixtures, not secrets.** They use the reserved
> `.test` domain (never a real inbox) and exist only to log in during
> development. **Do not** seed them into any shared or production database —
> `db:seed` is for local/dev environments. Real users register via
> `POST /api/v1/auth/register`.

---

## Scripts

| Script | Does |
| --- | --- |
| `npm run dev` | Start with hot reload (tsx watch) |
| `npm run build` / `npm start` | Compile to `dist/` / run compiled server |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` / `lint:fix` | ESLint |
| `npm run format` / `format:check` | Prettier |
| `npm test` / `test:watch` | Vitest suite |
| `npm run prisma:generate` | Regenerate the Prisma client |
| `npm run prisma:migrate` | Create/apply a dev migration |
| `npm run prisma:deploy` | Apply migrations (production) |
| `npm run db:seed` | Seed catalogue + dev accounts (idempotent) |
| `npm run db:reset` | Drop, re-migrate and re-seed (destructive) |

---

## Architecture

```
Route → Controller → Service → Prisma
```

Thin controllers translate HTTP to service calls and own cookie side effects;
services hold all business/security logic; Prisma is the only thing that touches
the database. Cross-cutting concerns live in middleware.

```
src/
  config/env.ts         Zod-validated environment (parsed once, fail-fast)
  lib/                  logger · prisma singleton · crypto · errors · http envelope · cookies · email
  middleware/           security (helmet/CORS/rate-limit) · auth · csrf · validate · error handler
  modules/
    auth/               register · login · logout · verify-email · password reset · sessions
    properties/         read-only catalogue (list + detail)
    contact/            contact-form dispatch
    health/             liveness + readiness
    users/              public-user serializer (never leaks passwordHash)
  routes.ts             mounts every module under /api/v1
  app.ts                middleware assembly (exported for tests)
  server.ts             HTTP listener + graceful shutdown
prisma/
  schema.prisma         data model
  seed.ts               catalogue + dev accounts
tests/                  vitest + supertest (DB-free via deep-mocked Prisma)
```

### Security posture

- **Passwords** — Argon2id (OWASP params m=19 MiB, t=2, p=1); never logged, never returned.
- **Sessions** — opaque 256-bit random tokens; the raw value lives only in the
  httpOnly cookie, and only its HMAC-SHA256 hash is stored. Backs logout,
  log-out-everywhere, and per-device revocation. A DB leak yields no usable session.
- **Verification / reset tokens** — same discipline: raw token emailed once, only
  the hash stored; single-use and time-limited.
- **CSRF** — double-submit token on all unsafe methods (see below).
- **Transport** — helmet headers, credentialed CORS allowlist, global +
  strict-auth rate limiters, 1 MB body cap.
- **No enumeration** — login, forgot-password and resend-verification return
  uniform responses whether or not the account exists.

---

## Testing

```bash
npm test
```

The suite (27 tests) runs the **real** application end-to-end — routing,
middleware, controllers, services, Argon2 hashing, and the session/CSRF logic —
with only the Prisma layer replaced by a deep mock. No database is required, so
it runs anywhere (CI included). Covered: registration (+ duplicate, weak
password), login (+ wrong password, unknown email, inactive account), logout,
email verification, password reset, authenticated vs unauthenticated `/me`, CSRF
enforcement, the properties list/detail serialization, and the contact form.

---

## API

Full reference: [docs/api.md](docs/api.md). Frontend wiring (envelope unwrap +
CSRF bootstrap): [docs/frontend-integration.md](docs/frontend-integration.md).
