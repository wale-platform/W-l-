# WALE Housing

Verified student housing for Nigeria. WALE lists accommodation near Nigerian
universities with honest pricing, real availability dates, and a named contact
for every home.

**Mission:** a trusted, transparent, and user-friendly housing platform for
students and future housing seekers across Nigeria.

---

## Stack

| Concern | Choice |
|---|---|
| Framework | Next.js 16.3 (App Router, Turbopack) |
| UI | React 19.2, TypeScript 5 |
| Styling | Tailwind CSS v4 (CSS-first `@theme`) |
| Forms | React Hook Form + Zod |
| Server state | TanStack Query |
| Client state | Zustand |
| HTTP | Axios |
| Interactive maps | Leaflet + OpenStreetMap |
| Toasts | Sonner |
| Icons | lucide-react |
| Database | Neon PostgreSQL (`@neondatabase/serverless`) |

---

## Getting started

```bash
npm install
```

Copy `.env.example` to `.env.local` and set `DATABASE_URL` to the Neon
PostgreSQL connection string.
To enable Google sign-in, create a **Web application** OAuth client in Google
Cloud Console and set `NEXT_PUBLIC_GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`.
Under **Authorized redirect URIs**, add `/api/auth/callback/google` on every
origin the app runs on, for example
`http://localhost:3000/api/auth/callback/google` and
`https://waleonline.com.ng/api/auth/callback/google`. Production builds
use `NEXT_PUBLIC_SITE_URL` for the callback, so it must match. Restart the app
after changing these values.
To send password-reset and email-confirmation emails, set `SENDBYTE_API_KEY`
and `EMAIL_FROM` (a sender on a domain verified in SendByte, currently
`WALE <noreply@www.waleonline.com.ng>` — Gmail addresses can't be used). Emails go
through [SendByte](https://docs.sendbyte.africa): a `sk_test_` key accepts
emails without delivering them, a `sk_live_` key delivers them and requires
`EMAIL_FROM` to be on a domain verified in SendByte,
and set `NEXT_PUBLIC_SITE_URL` to the public site address used in emailed links.
Without these settings, development prints each email — including its
link — to the server console; production reports an error instead.
Contact-page messages are saved in the Neon `contact_messages` table and
forwarded to `CONTACT_INBOX_EMAIL` (defaulting to the public contact address
in `src/config/site.ts`) with Reply-To set to the sender.
Keep `.env.local` private; it is ignored by Git.

```bash
npm run dev
```

The app runs at `http://localhost:3000`.

| Script | Does |
|---|---|
| `npm run dev` | Dev server |
| `npm run build` | Production build |
| `npm start` | Serve the production build |
| `npx tsc --noEmit` | Typecheck |
| `npx eslint .` | Lint (`next lint` was removed in Next 16) |

---

## Project structure

```
src/
  app/
    (marketing)/       Public pages — Home, About, Contact, FAQ, Match, Map
    api/               Route Handlers (the mock backend and geocoder)
    layout.tsx         Root shell: fonts, metadata, providers, skip link
    not-found.tsx      Custom 404
    sitemap.ts robots.ts
  components/
    ui/                The shared component library
    layout/            Navbar, Footer, Container/Section
    marketing/         Page sections (HeroSearch, FeaturedListings, ContactForm)
    property/          PropertyCard and its skeleton
    brand/             Logo
    providers/         QueryProvider
  hooks/               useProperties and friends
  lib/
    api/               Axios client, typed endpoint modules, Zod schemas
    fixtures/          Mock listing data
    utils/             cn, variants, formatters
  config/site.ts       Brand copy, nav, university list
```

Route group `(marketing)` gives the public pages a shared Navbar/Footer shell
without adding a URL segment — `/about`, not `/marketing/about`. The authed
dashboard gets its own group later.

---

## Architecture decisions

### The backend is mocked behind real HTTP

Most backend functionality is still mocked. Rather than importing fixtures
into components — which would have to be ripped out later — mock listing data
is served from **Route Handlers** (`src/app/api/`). The client genuinely does
`axios → /api/properties`.

Switching to the real API is one environment variable:

```
NEXT_PUBLIC_API_BASE_URL=https://api.walehousing.ng
```

Nothing else changes. The handlers add ~600ms of latency on purpose, so loading
skeletons are actually observable in development.

### Authentication uses database sessions in an httpOnly cookie

Accounts live in the Neon `users` table (created on first use alongside
`sessions`, `properties` and `property_images`). Passwords are hashed with
Node's built-in scrypt. Logging in, signing up or signing in with Google
(`/api/auth/*`) stores a random session token in the httpOnly `wale_session`
cookie; the database keeps only its SHA-256, and logging out deletes the row.

`src/proxy.ts` redirects signed-out visitors away from the dashboards
(an optimistic cookie check only). Each dashboard layout then confirms the
role through `/api/auth/me`, and every protected route handler checks the
session itself with `requireUser()` from `src/lib/server/session.ts`.

The full account lifecycle is handled:

- **Sign up / log in / log out** — email and password, or Google via the
  server-side OAuth code flow (`/api/auth/google/start` → Google →
  `/api/auth/callback/google`, with PKCE, state and nonce checks). Google
  sign-up creates an account with the type chosen on the sign-up page;
  signing in with an unknown Google account sends you to sign-up instead.
  A Google account with the same verified email as an existing account is
  linked to it. "Remember me"
  keeps the session for 30 days; unchecked, it ends with the browser.
- **Email confirmation** — sign-up emails a confirmation link
  (`/verify-email`); dashboards show a reminder with a resend button until it
  is confirmed. Google accounts are confirmed automatically.
- **Forgot / reset password** — `/forgot-password` emails a one-hour,
  single-use link to `/reset-password`. The response is the same whether or
  not the email has an account. Resetting signs out every other device.
- **Change password** — `/account`, which also lets Google-only accounts set
  a password.

Emailed links use single-use tokens stored as hashes in `auth_tokens`, and
each kind of email can be sent to an account at most once a minute.

Admins cannot sign themselves up. Promote an existing account in Neon:

```sql
UPDATE users SET role = 'admin' WHERE email = 'you@example.com';
```

### Wallet payments: Paystack and Flutterwave

Signed-in users fund a WALE wallet at `/wallet` using either gateway's hosted
checkout (card details never touch WALE). Set `PAYSTACK_SECRET_KEY`,
`FLUTTERWAVE_SECRET_KEY` and `FLUTTERWAVE_WEBHOOK_HASH`; a gateway without a
key is shown as unavailable.

1. `POST /api/payments/initialize` records a `pending` payment with our own
   reference and returns the gateway checkout URL.
2. The gateway sends the payer back to `/api/payments/callback/{paystack|flutterwave}`,
   which **verifies the payment with the gateway's API** before crediting.
3. Webhooks credit the wallet even if the payer closes the tab:
   - Paystack → `<site>/api/payments/webhook/paystack` (checked with the
     HMAC-SHA512 `x-paystack-signature`).
   - Flutterwave → `<site>/api/payments/webhook/flutterwave`, with the
     dashboard "Secret hash" equal to `FLUTTERWAVE_WEBHOOK_HASH`. The event is
     re-verified with Flutterwave's API before crediting.

A payment is credited only if the gateway confirms it succeeded in NGN for at
least the requested amount, and in one SQL statement guarded by
`status = 'pending'`, so the redirect and the webhook can both arrive and the
wallet is still credited exactly once. Balances are stored in kobo.

### Notifications

The header bell shows the unread count from the `notifications` table
(refreshed every minute). Notifications are created for sign-up, submitted
and verified listings, and wallet top-ups; `/notifications` lists them and
marks them read.

### One app frame for signed-in users

Once logged in, every page — dashboards and public pages such as Browse Homes,
the map and About — uses `AppShell`: a fixed sidebar on desktop (a drawer on
mobile) with role-specific links, and a header showing the user's name, role,
wallet balance and notification bell. Visitors who aren't logged in see the
marketing navbar instead (`SiteChrome`).

### Landlords upload listings with photos

Landlords, lawyers and outgoing tenants submit listings with 1–8 photos as a
multipart `POST /api/properties`. Photos are downscaled in the browser to
1600px JPEGs, checked by file signature on the server, stored in
`property_images`, and served from `/api/property-images/[id]`. New listings
start unverified; admins verify them with `PATCH /api/properties/[id]`, and
owners can delete their own. Submitted listings are merged with the bundled
sample listings in search results.

### Zod schemas are the single source of truth

`src/lib/api/schemas.ts` defines every data shape. TypeScript types are inferred
with `z.infer` rather than hand-written alongside, and responses are parsed at
the API boundary — a backend that breaks the contract fails loudly instead of
leaking malformed data into the UI. The **same** `contactFormSchema` validates
in the browser and inside the route handler.

### Accessibility via native elements

Three deliberate choices that buy correct behaviour for free rather than
reimplementing it:

- **`Modal` uses native `<dialog>` + `showModal()`** — focus trap, Esc to close,
  top-layer stacking, and an inert background, all from the browser. Next 16's
  support floor (Chrome 111+, Safari 16.4+) is exactly `<dialog>`'s baseline, so
  no focus-trap library is needed.
- **`Select` wraps native `<select>`** — keyboard navigation, mobile pickers, and
  screen-reader semantics come included.
- **FAQ uses `<details>`/`<summary>`** — an accordion that works without JS.

Beyond that: a skip link as the first tab stop, one `<h1>` per page, visible
`:focus-visible` rings, `aria-busy` on loading buttons, `role="alert"` on
validation errors wired through `aria-describedby`, and `aria-current="page"` on
active nav links. Brand colours clear WCAG AA — primary button 5.79:1, body text
6.2:1, hero text 12.5:1.

### QueryClient lives in `useState`

`QueryProvider` creates the client inside `useState`, not at module scope. On the
server a module-scoped client would be shared across requests, letting one user's
cached data leak into another user's response.

### The mobile menu closes without an effect

`Navbar` stores *which path the menu was opened on* rather than a boolean, so
navigating closes it during render. A `useEffect` calling `setState` on pathname
change would work but costs an extra render pass and trips
`react-hooks/set-state-in-effect`.

### AI Match ranks listing preferences locally

AI Match filters out homes that violate hard requirements such as a maximum
budget, home type, bedroom count, or verification preference. It ranks the
remaining listings by how well their details fit the preferred area and other
selected preferences. Ranking is performed in the browser from listing data;
preferences are not saved or sent to an AI provider.

### Map search uses OpenStreetMap

The property map is rendered with Leaflet and OpenStreetMap tiles. Location
queries are sent to OpenStreetMap's Nominatim geocoder through
`/api/geocode`; map attribution is shown in the interface. The geocoded point
is used to show listings within 25 km when available. No map API key is
required.

### Listing imagery is local

Representative Unsplash apartment and house photography lives in
`public/listings/`, including the homepage hero, so the app renders without a
stock-photo CDN. These images illustrate sample listings and are not
photographs of the exact homes described. Production listing images will come
from Cloudinary — `next.config.ts` already allows that host in
`images.remotePatterns`.

---

## The component library

Everything in `src/components/ui/`, exported from one barrel:

```ts
import { Button, Input, Card, Modal, toast } from "@/components/ui";
```

**Form** — `Button` · `Input` · `Textarea` · `Select` · `Checkbox` · `Radio` ·
`Label` · `FormField` · `PasswordInput`
**Display** — `Card` (+ Header/Title/Description/Body/Footer) · `Badge` ·
`VerifiedBadge` · `Avatar` · `Alert` · `Table`
**Feedback** — `Spinner` · `Skeleton` · `SkeletonText` · `EmptyState` ·
`ErrorState` · `Toaster`/`toast`
**Overlay** — `Modal` · `ConfirmDialog`
**Navigation** — `Pagination` · `Breadcrumbs`

Each is typed against its native element, forwards refs, and merges an external
`className` through `cn()` so callers can override styling without `!important`.

Variants use a local `variants()` helper (`src/lib/utils/variants.ts`) instead of
pulling in `class-variance-authority` — same ergonomics, one less dependency.

`FormField` takes a render prop so the generated id and `aria-describedby` reach
the actual control:

```tsx
<FormField label="Email" required error={errors.email?.message}>
  {(field) => <Input {...field} {...register("email")} type="email" />}
</FormField>
```

---

## Design tokens

Defined in `src/app/globals.css` under `@theme`. Tailwind v4 is CSS-first —
**there is no `tailwind.config.js` and none should be created.**

The burgundy scale is derived from the supplied WALE logo:
`--color-brand-800` (`#7a1737`) is the primary mark color, with a warm `sand`
accent, an `ink` neutral ramp, semantic
`success`/`warning`/`danger`/`info` pairs, and radius/shadow/easing scales.

The supplied logo artwork is rendered as crisp inline SVG in
`src/components/brand/Logo.tsx`, with a matching app icon. The shared component
keeps the mark consistent across the landing page, navigation, dashboards, and
auth pages.

---

## Next.js 16 notes

This version differs from older tutorials in ways that matter here:

- `middleware.ts` is now **`proxy.ts`** — Node runtime only, reads cookies, never
  localStorage. This is why auth tokens will be httpOnly cookies: it makes
  server-side route guarding possible.
- `params` and `searchParams` are **Promises** — `await` them. Use the generated
  `PageProps<'/route'>` / `LayoutProps<'/'>` helpers.
- `images.domains` was removed — use `images.remotePatterns`.
- `next lint` was removed — run ESLint directly.
- `images.qualities` defaults to `[75]`; other `quality` values silently coerce.

---

## Status

**Shipped** — design tokens and brand, component library, layout shell, mock API
with Zod-validated fixtures, public pages, preference-based AI Match, cookie-session authentication (sign-up, login, Google,
email confirmation, password reset and change) with `proxy.ts` guarding, landlord listing uploads with photos, and an
interactive postcode/location map search with `sitemap.ts` and `robots.ts`.

**Next** — the student experience
(dashboard, search with filters, listings grid, property details with gallery,
profile management).

Google Maps and Cloudinary are configured for but not yet exercised; both need
API keys.
