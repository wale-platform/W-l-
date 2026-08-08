# Frontend Analysis — WALE Housing

> Produced by inspecting the frontend (now the repository root, `src/`) before
> writing any backend code.
> Purpose: let the backend **adapt to the existing frontend contract** rather
> than invent an arbitrary one, and surface every conflict explicitly.

**Frontend at a glance**

| Concern | Finding |
|---|---|
| Framework | Next.js **16.3.0** (App Router, Turbopack) |
| Language | TypeScript 5, `strict: true` |
| React | 19.2 |
| HTTP client | Axios (`withCredentials: true`) |
| Server state | TanStack Query v5 |
| Client state | Zustand v5 (installed, not yet used for auth) |
| Forms | React Hook Form + `@hookform/resolvers` + Zod v3.25 |
| Validation | **Zod schemas are the single source of truth** (`src/lib/api/schemas.ts`) |
| Styling | Tailwind v4 (CSS-first, no config file) |
| Product | Verified **student** housing near Nigerian universities |

The frontend README is unusually explicit about intent, which removes most guesswork:

- "**The backend is mocked behind real HTTP.**" Mock data is served from Next.js
  Route Handlers under `src/app/api/`. The client genuinely does
  `axios → /api/properties`. Switching to the real backend is **one env var**:
  `NEXT_PUBLIC_API_BASE_URL=https://api.walehousing.ng`. Nothing else changes.
- "Auth tokens will be **httpOnly cookies**" — because Next 16's `proxy.ts`
  (formerly `middleware.ts`) reads cookies for server-side route guarding.
- Cloudinary is already whitelisted in `next.config.ts` (`res.cloudinary.com`)
  for production listing images.

---

## 1. Frontend routes discovered

Route group `(marketing)` renders public pages with a shared Navbar/Footer shell.

| Route | Status | Notes |
|---|---|---|
| `/` | Built | Home: `HeroSearch`, `FeaturedListings` |
| `/properties` | Built | Search + filters + paginated grid (`PropertySearch`) |
| `/properties/[id]` | **Missing** | Card links to it (`/properties/${id}`); detail page not built |
| `/about` `/faq` `/contact` | Built | Contact form posts to `/api/contact` |
| `/terms` `/privacy` | Built | Legal copy |
| `/login` | **Missing** | Linked from Navbar; listed in `sitemap.ts` |
| `/register` | **Missing** | Linked from Navbar; listed in `sitemap.ts` |
| `/dashboard/*` `/profile/*` | **Missing** | Only referenced in `robots.ts` disallow list |
| `not-found` | Built | Custom 404 |

**Implication:** the only routes that currently *consume backend data* are
`/` and `/properties` (both via the properties list endpoint) and `/contact`.
Everything auth/profile/dashboard is planned but unbuilt — so the backend can
**define** those contracts and the frontend will build to them.

## 2. Existing entities / data models discovered

All from `src/lib/api/schemas.ts` (the authoritative shapes) and
`src/lib/fixtures/properties.ts` (12 realistic seed listings).

### `Property` (actively used)
```ts
{
  id: string;
  title: string;
  description: string;
  price: number;                 // annual rent in NGN, no decimals
  type: "studio" | "one_bedroom" | "two_bedroom" | "shared";
  bedrooms: number;              // int >= 0
  bathrooms: number;             // int >= 1
  address: string;
  city: string;
  state: string;
  university?: string;           // university id, e.g. "unilag"
  verified: boolean;             // NOTE: a boolean, not a status enum
  availableDate: string;         // "YYYY-MM-DD" (NOT datetime)
  images: string[];              // absolute CDN URL or root-relative path
  amenities: string[];           // free-form strings
  coordinates?: { lat: number; lng: number };
  source: "wale" | "agent" | "landlord";
  landlord: { name: string; phone: string; email?: string };
  createdAt: string;             // ISO datetime
  updatedAt: string;             // ISO datetime
}
```

### `PropertyListResponse` (actively used)
```ts
{ properties: Property[]; total: number; page: number; pageSize: number; totalPages: number }
```

### `SearchParams` (query string for the list endpoint)
```ts
{
  query?: string; university?: string;
  minPrice?: number; maxPrice?: number;
  type?: "studio"|"one_bedroom"|"two_bedroom"|"shared";
  verifiedOnly?: boolean;
  page: number;      // default 1
  pageSize: number;  // default 12, max 50
}
```
Server-side filtering observed in the mock handler: `query` matches
title/description/address/city/state; `university` exact; `type` exact;
`minPrice`/`maxPrice` numeric bounds; `verifiedOnly=true` filters unverified out.

### `User` (placeholder — no page consumes it yet)
```ts
{ id: string; email: string; name: string; role: "student"|"admin";
  university?: string; avatar?: string|null; createdAt: string }
```

### `LoginData` / `RegisterData` / `AuthResponse` (placeholder — unused)
```ts
LoginData    = { email; password (min 8) }
RegisterData = { name (min 2); email; password (min 8, upper+lower+digit); university }
AuthResponse = { user: User; token: string }   // returns a TOKEN in the body
```

### `ContactFormData` (actively used)
```ts
{ name (min 2); email; phone?: /^(\+234|0)[789]\d{9}$/; subject (min 5); message (min 20) }
```

### `ApiError` (the error shape the client expects)
```ts
{ message: string; code?: string; field?: string }
```

## 3. Existing API calls

`src/lib/api/` — one axios instance + typed endpoint modules. **Every response
is parsed with Zod at the boundary**, so any contract drift fails loudly.

| Call | Method | Path | Consumed by | Response the client parses |
|---|---|---|---|---|
| `propertyApi.list` | GET | `/properties?<SearchParams>` | Home, `/properties` | `PropertyListResponse` (raw, unwrapped) |
| `propertyApi.getById` | GET | `/properties/:id` | (detail page, unbuilt) | `Property` (raw, unwrapped) |
| `propertyApi.requestInspection` | POST | `/properties/:id/inspect` | defined, **not wired to UI** | `{ message }` |
| `contactApi.submit` | POST | `/contact` | Contact page | `{ message }` |

Axios base URL: `process.env.NEXT_PUBLIC_API_BASE_URL ?? "/api"`, `timeout 15s`,
`withCredentials: true`, `Content-Type: application/json`. A response
interceptor coerces error bodies into `ApiError` (`{ message, code?, field? }`).

**Critical detail:** the client expects **unwrapped** success bodies. E.g.
`propertyApi.list` does `propertyListResponseSchema.parse(data)` where `data` is
`response.data` — so it expects `response.data` to *be* the list object, not
`{ success, data: {...} }`.

## 4. Authentication expectations

- Tokens as **httpOnly cookies** (README, `proxy.ts` rationale). ✅ matches the
  cookie-session design we want.
- `withCredentials: true` is already set → the client will send/receive cookies
  cross-origin. Backend must set CORS `credentials: true` + an explicit origin.
- BUT the placeholder `AuthResponse` also carries a `token: string` in the body.
  This contradicts httpOnly-cookie auth (a body token implies JS storage). Since
  no page consumes it yet, we treat the cookie as authoritative and drop the body
  token — see Conflicts.
- `registerSchema` requires `university` and a single `name`; password policy is
  min 8 with upper + lower + digit. Login is min 8.
- Password reset / email verification: no frontend routes yet, but `sitemap` and
  the README's "Next" section name them as the immediate next frontend milestone.

## 5. Forms and required backend fields

| Form | Fields | Backend endpoint needed |
|---|---|---|
| Contact (`ContactForm`) | name, email, phone?, subject, message | `POST /contact` |
| Hero search (`HeroSearch`) | query, university | feeds `GET /properties` |
| Full search (`PropertySearch`) | query, university, type, price range, verifiedOnly, page | `GET /properties` |
| Register (planned) | name, email, password, university | `POST /auth/register` |
| Login (planned) | email, password | `POST /auth/login` |

## 6. Existing mock data

`src/lib/fixtures/properties.ts` — 12 listings (`wale-001`..`wale-012`) with
genuine Nigerian university catchments (UNILAG, UI, OAU, ABU, UNN, UNIBEN, FUTA,
BUK), market-rate naira pricing, a mix of verified/unverified, and all three
sources. Images are local (`/listings/listing-NN.jpg`) in the frontend's
`public/`. **These become the backend seed** so the live API returns identical
data and the frontend renders unchanged.

`src/config/site.ts` holds the canonical **university list** (`id/name/short/city`)
that drives the filter. The backend stores `university` as that string id.

## 7. Frontend / backend integration points

1. **`NEXT_PUBLIC_API_BASE_URL`** → point at `http://localhost:4000/api/v1` (dev)
   or `https://api.walehousing.ng/api/v1` (prod). *(Note the `/api/v1` suffix — see Conflicts #6.)*
2. **CORS + credentials** — backend allowlists `FRONTEND_URL`, sets
   `Access-Control-Allow-Credentials: true`; client already sends cookies.
3. **httpOnly session cookie** — set on login, read by Next `proxy.ts` for route
   guards, cleared on logout.
4. **Properties list/detail** — must return the exact `Property` /
   `PropertyListResponse` shapes above.
5. **Contact** — same `contactFormSchema`, returns `{ message }`.
6. **Cloudinary** — production image URLs already whitelisted; media upload flow
   (signed uploads) is a later phase.

## 8. Questions & inconsistencies discovered (conflicts to resolve)

These are documented, not silently resolved. Recommended resolution in **bold**.

1. **Response envelope.** Prompt mandates `{ success, data }` / `{ success, error:{code,message,details} }`. Frontend expects **unwrapped** success bodies and errors as `{ message, code?, field? }`.
   → **Backend uses the standard envelope; frontend adds a ~10-line axios interceptor to unwrap `data` and map the error shape.** Its Zod schemas stay unchanged. Exact snippet in `docs/frontend-integration.md`. *(Alternative: backend unwraps for `/properties` & `/contact` only — rejected as inconsistent.)*

2. **`token` in `AuthResponse`.** Frontend placeholder returns `{ user, token }`.
   → **Drop the body token; auth is the httpOnly cookie** (matches the README's own stated direction). Login returns `{ user }`. Frontend updates the unused `authResponseSchema`.

3. **`name` vs `firstName`/`lastName`.** Frontend `User.name` is one field; prompt's User is split.
   → **Backend stores `firstName`/`lastName` and also returns a computed `name` in the safe user DTO** so both conventions are satisfied. `register` accepts either `{name}` (split on first space) or `{firstName,lastName}`.

4. **Role enum.** Frontend: `"student"|"admin"`. Prompt: `USER|LANDLORD|ADMIN` (extensible, multi-capability).
   → **Backend is authoritative: `USER|LANDLORD|ADMIN`.** Since no page consumes `role` yet, the frontend widens its enum when it builds auth. A user can hold multiple capabilities (see schema note), so role is the *primary* role.

5. **`availableDate` format.** Frontend uses `"YYYY-MM-DD"` (a plain date), while `createdAt`/`updatedAt` are ISO datetimes.
   → **Backend stores a `Date` and serializes `availableDate` as `YYYY-MM-DD`** to match; timestamps stay full ISO.

6. **API version prefix.** Prompt mandates `/api/v1`. Frontend default base is `/api`.
   → **Backend serves `/api/v1`.** Frontend sets `NEXT_PUBLIC_API_BASE_URL` to include `/api/v1`; no code change beyond the env var.

7. **`verified` boolean vs verification lifecycle.** Frontend wants a boolean; the product needs a real status machine (`DRAFT→PENDING_VERIFICATION→VERIFIED→REJECTED/SUSPENDED`).
   → **Backend stores `status`; the DTO derives `verified = status === "VERIFIED"`.** Frontend is unaffected.

8. **`landlord` may not be a platform user.** Fixtures include landlords like "Kongo Properties".
   → **Property stores denormalized public contact (`contactName/Phone/Email`) plus an optional `ownerId` relation** to a real user when one exists.

9. **Amenities.** Frontend is `string[]`; prompt hints at a `PropertyAmenity` table.
   → **Store `String[]` on Property now** (matches frontend, avoids premature normalization; the search UI doesn't filter by amenity). Normalize later if structured amenity filters are added.
