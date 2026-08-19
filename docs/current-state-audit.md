# Wale — Current State Audit

**Date:** 2026-08-19
**Branch:** `chore/merge-backend` (merged with `feat/foundation-and-landing`)
**Purpose:** Establish ground truth before integration work begins. Every claim
below was verified against the code, not inferred from documentation.

---

## Executive summary

The frontend and backend are both real, working codebases — but they have
**never been connected**. The frontend runs entirely on mock data served by its
own Next.js route handlers; the backend has never been called by it.

Three findings dominate everything else:

1. **There is no authentication UI at all.** No `/login`, `/register`, or
   `/auth` route exists. The Navbar links to `/login` and `/register`
   ([Navbar.tsx:64-69](../src/components/layout/Navbar.tsx#L64-L69)), so both
   links 404 today. This is the reported "auth routes not working".
2. **The role-based dashboards are static shells.** Admin, landlord, lawyer and
   tenant pages contain zero API calls and hardcoded `0` values.
3. **Several features named in the product brief do not exist in any form** —
   no payment UI, no chat/messaging UI, no map/location UI, no wallet, no mover.
   These are greenfield, not integration work.

The backend is the more mature half: well-structured, 27 passing tests, a
considered Prisma schema, and complete auth endpoints. Its main gap is breadth —
only 4 of ~12 required domains are modelled.

---

## 1. Existing frontend features

**Stack:** Next.js 16.3.0 (App Router, Turbopack), React 19.2.8, TypeScript
strict, Tailwind v4, TanStack Query v5, axios, Zod v3, react-hook-form, zustand
(installed, unused), sonner.

### Working, real features

| Feature | Location | State |
| --- | --- | --- |
| Marketing site (home, about, FAQ, contact, privacy, terms) | `src/app/(marketing)/` | ✅ Complete |
| Property catalogue + search UI | `src/app/(marketing)/properties/` | ✅ Works, **mock data** |
| Property search/filter component | `PropertySearch.tsx`, `HeroSearch.tsx` | ✅ Works, **mock data** |
| Featured listings | `FeaturedListings.tsx` | ✅ Works, **mock data** |
| Contact form | `ContactForm.tsx` → `/api/contact` | ✅ Works, **mock handler** |
| Design system | `src/components/ui/` (Button, Card, Input, Modal, Table, Toast, FormField, Feedback) | ✅ Solid, reusable |
| Brand/layout | `Logo`, `Navbar`, `Footer`, `Container` | ✅ Complete |
| SEO | `robots.ts`, `sitemap.ts`, favicons | ✅ Complete |

### Static shells (UI only, no data, no API)

Added by Thebolamidey1 in the last 4 commits (~1,700 lines):

| Route | Lines | Reality |
| --- | --- | --- |
| `/admin` + `/admin/{listings,users,verification,inspections,reports}` | ~280 | Hardcoded zeros, no fetch |
| `/landlord` + `/landlord/{properties,properties/edit,inspections}` | ~230 | Hardcoded zeros, no fetch |
| `/landlord/upload-property` | 380 | Full form; submits to `console.log` only |
| `/lawyer` + `/lawyer/properties{,/upload}` | ~270 | Static |
| `/tenant` + `/tenant/properties{,/upload}` | ~250 | Static |
| `/profile` | 116 | Static, no user data |
| `/notifications` | 48 | Static list |

**Verified:** `grep` for `useQuery|apiClient|fetch(|propertyApi|axios` across all
six dashboard pages returns **0 matches**.
`upload-property/page.tsx:70` is `console.log(property)` — the form never
submits anywhere.

### Features that do NOT exist (contrary to the brief)

Verified by exhaustive grep across `src/`:

| Claimed feature | Occurrences in `src/` | Reality |
| --- | --- | --- |
| Payment / wallet UI | 3 (all legal prose) | **Does not exist.** Only mentions are in privacy/terms |
| Chat / messaging UI | 0 | **Does not exist** |
| Socket.IO | 0 | **Does not exist** |
| Installment UI | 0 | **Does not exist** |
| Mover role/UI | 0 | **Does not exist** |
| Map / location UI | 0 | **Does not exist.** All 19 "map" hits are `.map()`; all 3 `<Map` are `<MapPin>` lucide icons |
| Auth pages | 0 routes | **Does not exist** (schemas exist, no pages) |

> ⚠️ **Policy conflict.** `src/app/(marketing)/privacy/page.tsx:96-97` states:
> *"we never store payment-card details — because no payments flow through
> WALE."* And `terms/page.tsx:158` says users must not ask for payment before
> inspection. Introducing payments **requires updating both legal pages.**

---

## 2. Existing backend features

**Stack:** Express 5, TypeScript strict, Prisma 6.19.3, Zod, argon2
(`@node-rs/argon2`), pino, helmet, express-rate-limit, nodemailer, cookie-parser,
cors. Vitest + supertest for tests.

### Implemented and tested

| Capability | Location | Quality |
| --- | --- | --- |
| App assembly with deliberate middleware order | `src/app.ts` | ✅ Excellent, documented |
| Env validation (fail-fast, Zod, never echoes secrets) | `src/config/env.ts` | ✅ Excellent |
| Session auth (opaque tokens, HMAC-hashed at rest) | `modules/auth/session.service.ts` | ✅ Strong |
| Password hashing (argon2) | `lib/crypto.ts` | ✅ Strong |
| CSRF (stateless double-submit) | `middleware/csrf.ts` | ✅ Correct |
| Rate limiting (global + stricter auth limiter) | `middleware/security.ts` | ✅ Present |
| Security headers (helmet), CORS allowlist, trust proxy | `middleware/security.ts` | ✅ Present |
| Error handling + uniform envelope | `middleware/error.ts`, `lib/http.ts` | ✅ Consistent |
| Request logging w/ correlation id | `middleware/request-logger.ts` | ✅ Present |
| Role gate `requireRole(...)` | `middleware/auth.ts:59` | ✅ **Exists but unused** |
| Serializers (never leak `passwordHash`) | `modules/users/user.serializer.ts` | ✅ Single wire path |
| Email transport (`log` in dev, SMTP in prod) | `lib/email.ts` | ✅ Present |
| Tests | `tests/` — 27 passing, hermetic (pass with DB down) | ✅ Good |

### Domain coverage

Only **4 modules** exist: `auth`, `properties` (read-only), `contact`, `health`.

The schema comment at `prisma/schema.prisma:197-200` states this explicitly:
*"Deferred domains (messaging, notifications, verification workflow, wallet,
bookings, media assets) are intentionally NOT modelled yet."*

---

## 3. Existing API endpoints

Base: `/api/v1` (mounted at `app.ts:49`). Port 4000.

### Auth — `modules/auth/auth.routes.ts` (12 endpoints, complete)

| Method | Path | Guard |
| --- | --- | --- |
| GET | `/auth/csrf` | public |
| POST | `/auth/register` | rate-limited |
| POST | `/auth/login` | rate-limited |
| POST | `/auth/logout` | public (clears cookie) |
| POST | `/auth/logout-all` | `requireAuth` |
| GET | `/auth/me` | `requireAuth` |
| POST | `/auth/verify-email` | public + token |
| POST | `/auth/resend-verification` | rate-limited |
| POST | `/auth/forgot-password` | rate-limited |
| POST | `/auth/reset-password` | rate-limited + token |
| GET | `/auth/sessions` | `requireAuth` |
| DELETE | `/auth/sessions/:id` | `requireAuth` |

### Properties — `modules/properties/property.routes.ts` (read-only)

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/properties` | filters: `query, university, minPrice, maxPrice, type, verifiedOnly, page, pageSize` |
| GET | `/properties/:id` | only `VERIFIED` / `PENDING_VERIFICATION` visible |

### Contact / Health

| Method | Path |
| --- | --- |
| POST | `/contact` |
| GET | `/health`, `/health/ready` |

**Total: 17 endpoints.**

### Frontend's own mock endpoints (Next route handlers)

| Path | Serves |
| --- | --- |
| `GET /api/properties` | `src/lib/fixtures/properties.ts` + 600ms artificial latency |
| `POST /api/contact` | mock acknowledgement |

---

## 4. Existing database entities

7 models, 5 enums. One migration applied: `20260808161847_init`.

| Model | Purpose | Notable |
| --- | --- | --- |
| `User` | Accounts | `firstName`/`lastName` split, `phone?`, `role`, `status`, `university?`, `emailVerified` |
| `Session` | Auth sessions | `tokenHash` unique (HMAC), `expiresAt`, `userAgent`, `ip` |
| `EmailVerificationToken` | Email verify | hash-only, `usedAt` single-use |
| `PasswordResetToken` | Password reset | hash-only, `usedAt` single-use |
| `Property` | Listings | `ownerId?`, price (annual NGN), lat/long, `amenities[]`, `status`, denormalized contact |
| `PropertyImage` | Listing images | `url`, `position`, cascade delete |

**Enums:** `Role{USER,LANDLORD,ADMIN}`, `UserStatus{ACTIVE,SUSPENDED,DEACTIVATED}`,
`PropertyType{studio,one_bedroom,two_bedroom,shared}`,
`PropertySource{wale,agent,landlord}`,
`PropertyStatus{DRAFT,PENDING_VERIFICATION,VERIFIED,REJECTED,SUSPENDED}`.

> ✅ **`PropertyStatus` already contains exactly the 5 states the brief
> requires.** No enum change needed for §13 — only the workflow around it.

**Seed data:** 3 accounts (`admin@wale.test`, `student@wale.test`,
`landlord@wale.test`) + 12 listings (`wale-001`…`wale-012`) with local image
paths.

---

## 5. Existing authentication flow

**Backend: complete and sound.**

```
register/login
  → argon2 verify
  → generate opaque token (raw)
  → store HMAC-SHA256(raw) in Session.tokenHash
  → set httpOnly cookie `wale_session` (raw token)

authenticated request
  → read cookie → HMAC → lookup Session → check expiry
  → attach req.user (serialized, no passwordHash)

CSRF (unsafe methods only)
  → GET /auth/csrf sets readable `wale_csrf` cookie + returns token
  → client echoes in `X-CSRF-Token`
  → server compares header vs cookie (timing-safe)
```

Design choices worth preserving: raw token never persisted; per-device
revocation; email verification is **not** a login gate; login errors do not
leak whether an email exists.

**Frontend: nonexistent.**

- No auth pages, no `src/lib/api/auth.ts`, no auth store, no route protection.
- `zustand` is installed but never imported — presumably intended for auth state.
- Zod auth schemas exist (`loginSchema`, `registerSchema`, `authResponseSchema`)
  but nothing consumes them.

---

## 6. Existing mocked functionality

| Feature | Mock source | Backend ready? |
| --- | --- | --- |
| Property list/search | `src/app/api/properties/route.ts` + `fixtures/properties.ts` | ✅ Yes — swap is config + interceptor |
| Property detail | fixtures | ✅ Yes |
| Contact form | `src/app/api/contact/route.ts` | ✅ Yes |
| Dashboard stats (all roles) | hardcoded `0` in JSX | ❌ No endpoints exist |
| Property upload | `console.log` | ❌ No `POST /properties` |
| Inspections | static UI | ❌ No model, no endpoints |
| Admin verification | static UI | ⚠️ Enum exists, no workflow/endpoints |
| Notifications | static list | ❌ No model, no endpoints |
| Profile | static | ⚠️ `GET /auth/me` exists; no update endpoint |

**Fixture data** lives in `src/lib/fixtures/properties.ts` and is imported by
the mock route handler only — components are unaware, which is good: swapping to
the real API requires no component changes.

---

## 7. Frontend/backend mismatches

These are the concrete blockers. All verified in code.

### 7.1 Base URL — frontend points at itself

`client.ts:13` — `baseURL: process.env.NEXT_PUBLIC_API_BASE_URL ?? "/api"`.
No `.env.local` exists, so it resolves to `/api` → its own mock handlers.
**The backend is never called.**

### 7.2 Response envelope not unwrapped

| Side | Shape |
| --- | --- |
| Backend | `{ success: true, data: { properties, total, page, pageSize, totalPages } }` |
| Mock handler | `{ properties, total, page, pageSize, totalPages }` |
| Frontend parse | `propertyListResponseSchema.parse(data)` — expects the bare shape |

`property.ts:18` parses the raw body. Pointing at the backend makes **every
parse throw**. Fix documented at `backend/docs/frontend-integration.md:50-58`
(one success interceptor) — never implemented.

### 7.3 Error shape mismatch

Backend: `{ success:false, error:{ code, message, details? } }` (nested).
Frontend `apiErrorSchema`: `{ message, code?, field? }` (flat).
Result: parse fails, falls back to `"An unexpected error occurred"` — real
messages and codes are silently lost. Not fatal, but every backend error is
currently unreadable to users.

### 7.4 No CSRF token sent

`client.ts` sets `withCredentials: true` but has **no request interceptor**.
Every `POST/PATCH/DELETE` to the backend returns **403 Invalid or missing CSRF
token**. This alone breaks login, register and contact.

### 7.5 Role enum incompatible

| Frontend `userSchema.role` | Backend `Role` |
| --- | --- |
| `z.enum(["student","admin"])` | `USER \| LANDLORD \| ADMIN` |

Frontend would reject **every** real user. Also: the frontend has route
directories for `landlord`, `lawyer`, `tenant` — none of which are in either
enum. `LAWYER`, `TENANT`, `MOVER` exist nowhere in the backend.

### 7.6 Auth response expects a bearer token

`authResponseSchema` requires `token: z.string()`. The backend is
cookie-based and returns `{ user }` with **no token**. Parse would fail.
(Flagged in `backend/docs/frontend-analysis.md:159` as a design contradiction —
a body token implies JS-readable storage, defeating httpOnly.)

### 7.7 Register field mismatch

Frontend `registerSchema`: `{ name, email, password, university }` (student-focused).
Brief requires: firstName, lastName, email, phone, password, confirmation, role.
Backend accepts `name` **or** `firstName`/`lastName`, but has **no role
selection on register** and no `confirmPassword`.

### 7.8 Missing endpoint already called by frontend

`property.ts:33` — `requestInspection()` calls `POST /properties/:id/inspect`.
**No such endpoint exists.** (Currently unreachable: nothing calls it.)

### 7.9 Search capability gap

| Frontend/brief wants | Backend supports |
| --- | --- |
| location, city, state, price, type, bedrooms, bathrooms, amenities, availability, verification, **sorting** | `query`, `university`, `minPrice`, `maxPrice`, `type`, `verifiedOnly`, `page`, `pageSize` |

Missing: `city`, `state`, `bedrooms`, `bathrooms`, `amenities`, `availability`,
and **any sorting** (hardcoded `createdAt desc` at `property.service.ts:68`).

### 7.10 Property shape gaps

`propertySchema` omits `status`, `country`, `neighborhood` — and exposes only
`verified: boolean`. A landlord managing drafts/rejections needs real `status`.
`PropertyType` has only 4 values (no 3-bedroom, duplex, self-contain, etc.).

### 7.11 No frontend `typecheck` script

Root `package.json` has `dev/build/start/lint` only. Quality gate §39 requires
`npm run typecheck`. Also: `tsconfig.json` includes `.next/dev/types/**/*.ts`,
so a stale dev-server artifact can fail `npm run build` with errors in
generated code (observed this session).

---

## 8. Missing endpoints

Grouped by phase. **~60 endpoints** needed beyond the current 17.

### Properties (CRUD + ownership) — §10
- `POST /properties`, `PATCH /properties/:id`, `DELETE /properties/:id`
- `GET /properties/mine` (owner's listings incl. DRAFT/REJECTED)
- `POST /properties/:id/submit-for-verification`

### Media / Cloudinary — §12
- `POST /media/upload-signature` (signed, server-side secret)
- `POST /properties/:id/images`, `DELETE /properties/:id/images/:imageId`
- `PATCH /users/me/avatar`

### Verification workflow — §13
- `GET /admin/properties?status=PENDING_VERIFICATION`
- `POST /admin/properties/:id/approve` · `/reject` · `/suspend`
- `GET /admin/verification-queue`

### Inspections — §14
- `POST /properties/:id/inspections` (frontend already calls a variant)
- `GET /inspections` (mine, as requester or owner)
- `PATCH /inspections/:id` (confirm/cancel/complete/reject)

### Mover / residence / reviews — §15-20
- `POST /residences` (claim a past residence), `GET /residences/mine`
- `POST /residences/:id/confirm` (landlord/admin confirmation)
- `POST /properties/:id/reviews`, `PATCH /reviews/:id`, `GET /properties/:id/reviews`
- `GET /properties/:id/experience-summary` (aggregates)
- `POST /reviews/:id/report`, `GET /admin/reviews`, `PATCH /admin/reviews/:id`

### Payments / installments — §21-27
- `POST /payments/initialize`, `GET /payments/:reference/verify`
- `POST /webhooks/<provider>` (signature-verified, idempotent)
- `POST /installment-plans`, `GET /installment-plans/mine`
- `POST /installments/:id/pay`, `GET /transactions`

### Chat — §28
- `GET /conversations`, `POST /conversations`
- `GET /conversations/:id/messages` (paginated), `POST .../messages`
- Socket.IO namespace with session-cookie auth

### Notifications — §29
- `GET /notifications`, `PATCH /notifications/:id/read`, `POST /notifications/read-all`

### Users / profile — §31, §36
- `PATCH /users/me`, `GET /admin/users`, `PATCH /admin/users/:id/status`

### Dashboard aggregates
- `GET /dashboard/landlord|tenant|admin|lawyer|mover` (stats the shells display)

---

## 9. Missing database models

Current: 7 models. Estimated need: **~22**.

### Role architecture change (§5)

`Role` needs `LAWYER`, `TENANT`, `MOVER`. But the brief also requires that a
person can be tenant *and* mover *and later* landlord.

**Observation:** the schema author already anticipated this
(`schema.prisma:19-22`): *"A user is NOT limited to one relationship with the
platform: ownership is expressed through the `Property.owner` relation."*

**Recommendation:** keep `User.role` as the *primary* role (cheap, already
indexed, drives default dashboard), and add a `UserCapability` join table for
additive capabilities. This satisfies "structure it so evolution is possible"
without over-engineering the MVP:

```
model UserCapability {
  userId, capability (enum), grantedAt, grantedBy?
  @@unique([userId, capability])
}
```

### New models required

| Domain | Models |
| --- | --- |
| Media | `MediaAsset` (cloudinaryPublicId, url, type, ownerId, propertyId?) |
| Verification | `PropertyVerification` (propertyId, reviewerId, status, notes, reviewedAt) |
| Inspections | `Inspection` (propertyId, requesterId, ownerId, preferredAt, status, notes) |
| Residence | `ResidenceHistory` (userId, propertyId, moveIn/OutDate, verificationStatus, confirmedBy) |
| Reviews | `PropertyReview` (residenceId unique, ratings…, body, status), `ReviewReport` |
| Aggregates | `PropertyRatingSummary` (or computed view — avoid inventing ratings) |
| Payments | `Transaction`, `PaymentIntent`, `WebhookEvent` (idempotency), `InstallmentPlan`, `Installment` |
| Chat | `Conversation`, `ConversationParticipant`, `Message`, `MessageRead` |
| Notifications | `Notification` |
| Capabilities | `UserCapability` |

### Schema changes to existing models

- `Property`: add `verificationId?`, relations to reviews/inspections/media;
  consider widening `PropertyType`.
- `User`: add `phone` validation, relations to all new models.
- `PropertyImage`: migrate toward `MediaAsset` (keep both during transition —
  do not break the working serializer).

### Trust safeguards (§17, §19)

`ResidenceHistory.verificationStatus` must default to **unverified**. A review
must be tied to a confirmed residence period, with `@@unique` on
`(residenceId)` to enforce one review per residence period. Reviews from
unconfirmed residences must be visibly labelled unverified — **never** counted
into a "verified resident experience" average.

---

## 10. Recommended implementation order

Sequenced by dependency, not by brief order. Each step is independently
shippable and testable.

### ⛔ Prerequisite — unblock the database

**Supabase project `ivpyvhwkzseujxhaaeix` is PAUSED** (DNS returns NXDOMAIN;
free-tier projects pause after ~7 days idle). Nothing requiring the DB can be
migrated, seeded, or verified until it is restored from the Supabase dashboard.
All code work below can proceed; all *verification* of it cannot.

### Step 1 — Contract + wiring foundation (no DB needed)
Add the three interceptors (unwrap, error-map, CSRF) to `client.ts`; add
`.env.local`; fix `userSchema.role`, drop `token` from `authResponseSchema`; add
frontend `typecheck` script; scope `tsconfig` away from `.next` artifacts.
**Unblocks everything else. Small, high-leverage, ~150 lines.**

### Step 2 — Auth UI + client (§3, §4, §6)
Build `/login`, `/register`, `/forgot-password`, `/reset-password`,
`/verify-email`; `src/lib/api/auth.ts`; zustand auth store; route protection.
Backend needs only: role on register, `confirmPassword`, phone.
**Fixes the 404s users hit today.**

### Step 3 — Roles + capabilities (§5)
Extend `Role` with `LAWYER`, `TENANT`, `MOVER`; add `UserCapability`; apply
`requireRole` to routes; role-aware navigation and redirects.

### Step 4 — Property CRUD + ownership (§10, §11)
`POST/PATCH/DELETE /properties`, `/properties/mine`, ownership authorization,
extended search (city, state, bedrooms, bathrooms, amenities, sorting). Wire
`upload-property` and landlord pages. Remove the properties mock **last**.

### Step 5 — Cloudinary (§12)
`MediaAsset`, signed-upload endpoint, frontend direct-to-Cloudinary upload.
Secret stays server-side.

### Step 6 — Verification workflow (§13)
`PropertyVerification`, admin approve/reject/suspend, wire admin UI.

### Step 7 — Inspections (§14)
`Inspection` model + endpoints; wire landlord/tenant/admin inspection pages.

### Step 8 — Mover, residence, reviews (§15-20)
`MOVER` capability, mover dashboard + onboarding, `ResidenceHistory` with real
confirmation, `PropertyReview` with one-per-residence enforcement, experience
summary computed from real reviews only.

### Step 9 — Notifications (§29)
`Notification` model, emit on real domain events, wire the notifications page.

### Step 10 — Chat (§28)
REST for conversations/history + Socket.IO for realtime, authenticated by the
same session cookie.

### Step 11 — Payments + installments (§21-27)
`PaymentProvider` abstraction, dev provider for local, Paystack when credentials
exist, signature-verified idempotent webhooks, installment plans.
**Also update privacy/terms — they currently state no payments flow through Wale.**

### Step 12 — Admin, lawyer, final QA (§30, §31, §38, §39)
Admin data wiring, lawyer domain foundation, full quality gates.

### Scope reality

Steps 1-2 are days. Steps 1-12 are **weeks** of engineering — payments with
verified webhooks, realtime chat, and a trust-verified review system are each
substantial features in their own right. They should not be rushed together:
payment correctness and review trust are exactly where shortcuts cause real
harm.

Recommended sequencing for review: land Steps 1-2 as one PR (integration
foundation + auth), then one PR per step thereafter, per §42 git discipline.

---

## Appendix — verification commands used

```bash
# route inventory
git ls-files src/app | grep page.tsx

# proof dashboards make no API calls (returns 0)
grep -cE "useQuery|apiClient|fetch\(|propertyApi|axios" src/app/{admin,landlord,tenant,lawyer,profile,notifications}/page.tsx

# proof no payment/chat/socket/mover/wallet code
grep -rinE "socket|wallet|installment|mover|chat" src/     # → 0 results

# proof "map" hits are false positives
grep -rioE "\.map\(|mapbox|leaflet|<Map" src/ | sort | uniq -c

# backend endpoint inventory
grep -rE "router\.(get|post|put|patch|delete)" backend/src/modules/

# backend tests (hermetic — pass with DB down)
cd backend && npm test    # → 27 passed
```
