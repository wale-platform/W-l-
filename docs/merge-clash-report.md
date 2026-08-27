# Merge clash report — `chore/merge-backend` against the mainline

Produced 2026-08-27, read-only. Nothing was merged, rebased, pushed or modified to
write this; every finding comes from `git merge-tree --write-tree`, which computes the
merge in memory and leaves the working tree alone.

To reproduce:

```bash
git fetch --all --prune
git merge-base HEAD origin/feat/foundation-and-landing        # 3708625
git merge-tree --write-tree --name-only HEAD origin/feat/foundation-and-landing
```

`merge-tree` exits 1 when it finds conflicts. That is its answer, not a failure.

---

## The shape of the divergence

| | |
|---|---|
| Local branch | `chore/merge-backend` @ `28889d9` — **31 commits, none pushed** |
| Mainline | `origin/feat/foundation-and-landing` @ `cb57c17` |
| Merge base | `3708625` |
| Their advance | **4 commits, 49 files, +5670 −600** |
| My advance | **29 commits, 206 files** |
| Files touched by both | **32 — every one of them conflicts** |

The four incoming commits:

| Commit | Date | Subject |
|---|---|---|
| `cb57c17` | 2026-08-24 | update |
| `231b6cd` | 2026-08-20 | fixed an error |
| `46559bb` | 2026-08-20 | udpate |
| `c88ec29` | 2026-08-19 | feat: implement student discovery experience and inspection request MVP |

Also note: the local `feat/foundation-and-landing` ref is **8 commits behind** its
remote. Anything checked against the local copy of the mainline was checked against a
stale tree.

---

## Verdict

**This is not a set of textual clashes to be hand-resolved hunk by hunk.** The two
branches implement the same product twice, on incompatible foundations:

- The mainline is a **client-side mock**: accounts, sessions, inspections, users and
  notifications live in `localStorage`, with fabricated latency and a hardcoded token.
- This branch is the **real integration**: an Express + Prisma backend, cookie
  sessions, CSRF, server-enforced authorization, 92 live contract checks.

Every conflicting file is a place where a mock and its replacement occupy the same
path. A three-way merge cannot reconcile those — it can only interleave them, and the
interleaving compiles while the product does not work.

Replacing that mock layer with a real backend *was the assignment* (spec §8–9:
"replace mock data with real backend integration"). So the conflicts are not a sign
that either side went wrong; they are the expected collision between the thing to be
replaced and the replacement. The mainline simply kept building on the mock in
parallel.

---

## Three findings that outrank the file list

### 1. Plaintext passwords in source, written to `localStorage`

`src/lib/api/auth.ts` on the mainline carries a `DEFAULT_USERS` array with real-looking
credentials in the repository:

```ts
{ email: "abdul@example.com",         password: "Password123", ... }
{ email: "amina@example.com",         password: "Password123", ... }
{ email: "kolalandlord@gmail.com",    password: "Password123", ... }
{ email: "okonlawyer@yahoo.com",      password: "Password123", ... }
{ email: "chiomatenant@gmail.com",    password: "Password123", ... }
```

These are seeded into `localStorage["wale_mock_registered_users"]` and compared with
`===` at sign-in. The standing instruction is *"Passwords must never be stored in
plaintext."* On this branch they are argon2 hashes in Postgres and the hash column is
never serialised. **This code must not survive the merge**, and because two of the five
addresses are plausible personal accounts, the strings should not survive in the merged
history either if they were ever real.

### 2. Route protection is a `useEffect` reading `localStorage`

Every dashboard layout the mainline added gates like this:

```ts
const loggedIn = localStorage.getItem("wale_is_logged_in") === "true";
const role     = localStorage.getItem("wale_role");
if (!loggedIn || !user || role !== "tenant") router.push("/login");
```

Identical in `admin/`, `landlord/`, `lawyer/`, `tenant/` and `student/`. It is
forgeable from the devtools console in one line, and it runs after the page has already
rendered into the RSC payload. The instruction was *"Do not rely only on frontend route
protection. The backend must enforce authorization independently."*

This branch gates with `await requireRole([...])` inside each **page** (not the layout —
a layout cannot stop its page from rendering) and re-authorizes every API call
server-side.

### 3. A token that is not a token

`authApi` on the mainline mints `token: "mock_jwt_token_header_payload_signature"` and
stores it at `localStorage["wale_token"]`. This branch has no bearer token at all: the
session is an httpOnly `wale_session` cookie the client cannot read, paired with a
double-submit `wale_csrf` cookie. Any merged code that reads `wale_token` is reading a
key that will never be set.

**Consequence for the identity model:** their `signUpFormSchema` uses
`role: z.enum(["student","landlord","lawyer","tenant","admin"])` — lowercase, `student`
as a role, no `MOVER`. The API's enum is `TENANT | LANDLORD | LAWYER | MOVER | ADMIN`,
and `student` is not a value it accepts. Their whole `/student` area is built on a role
the backend does not have.

---

## The 32 conflicts

### `add/add` — both sides created the file from nothing (10)

No common ancestor, so there is no hunk-level merge to be had. Each of these is a
straight choice.

| File | Theirs | Resolution |
|---|---|---|
| `src/app/(auth)/layout.tsx` | +103 | **Take mine.** Theirs has no server gate; mine is the redesigned auth shell (§4). |
| `src/app/(auth)/login/page.tsx` | +142 | **Take mine.** Theirs posts to the localStorage mock. |
| `src/app/(auth)/forgot-password/page.tsx` | +130 | **Take mine.** Mine pairs with `reset-password` + `verify-email`, which they do not have. |
| `src/app/admin/layout.tsx` | +218 | **Take mine, port their nav shell.** See note below. |
| `src/app/landlord/layout.tsx` | +216 | Same. |
| `src/app/lawyer/layout.tsx` | +214 | Same. |
| `src/app/tenant/layout.tsx` | +214 | Same. |
| `src/app/(marketing)/properties/[id]/page.tsx` | +39 | **Take mine** (real `propertyApi.get`, verification state, reviews, experience summary). Theirs delegates to their new `PropertyDetail.tsx` — worth porting, see salvage list. |
| `src/lib/api/auth.ts` | +214 | **Take mine, unconditionally.** This is the plaintext-password file. |
| `src/lib/api/inspections.ts` | +154 | **Take mine.** Theirs is `LOCAL_STORAGE_KEY = "wale_inspections"` with `defaultInspections` (`insp-001`, `insp-002`) and `setTimeout(600)` for fake latency. |

> **The layouts are the one place their side fills a real gap.** Their four dashboard
> layouts are ~215-line nav shells — sidebar items, mobile menu, avatar, sign-out —
> and the integration report already lists "most dashboard layouts render a bare
> `<main>`" as an outstanding defect. Take the chrome, delete the `useEffect` gate and
> the `localStorage.removeItem` sign-out, and keep `requireRole` in the pages. That is
> a port, not a merge.

### `content` — both sides edited a file that existed at the base (21)

| File | Theirs | What theirs does | Resolution |
|---|---|---|---|
| `src/lib/api/schemas.ts` | +29 −1 | Widens `source` to `["wale","agent","landlord","lawyer","tenant"]`; adds `source`/`availability`/`sortBy` to `searchParamsSchema` as loose `z.string().optional()`; adds `signUpFormSchema` with the lowercase role enum | **Take mine.** Mine is the wire contract for a live API — 40+ schemas mirroring the backend. Cherry-pick `availability`/`sortBy` **only** if the backend grows the filters; drop `signUpFormSchema`. |
| `src/lib/api/property.ts` | +243 −4 | Fixture-backed CRUD | **Take mine** (real endpoints, Cloudinary signed uploads, ownership authz). |
| `src/lib/api/index.ts` | +5 | Re-exports their mock modules | **Take mine**, then re-add exports for whatever of theirs is kept. |
| `src/components/layout/Navbar.tsx` | +73 −17 | Reads `localStorage` for auth state | **Take mine** — `feat(nav): show real auth state in the navbar` (`faedd46`) does this against the session. |
| `src/components/marketing/PropertySearch.tsx` | +128 −27 | Richer filter UI | **Merge by hand.** Their controls over my `searchParams` wiring; see salvage list. |
| `src/app/(marketing)/properties/page.tsx` | +9 | Passes their new filters through | Follows from `PropertySearch`. |
| `src/app/admin/page.tsx` | +171 −30 | Mock dashboard with invented counts | **Take mine.** Mine badges the three unwired areas "Placeholder" rather than showing numbers no endpoint can produce. |
| `src/app/admin/verification/page.tsx` | +130 −28 | Mock queue | **Take mine** (live queue, approve/reject/suspend). |
| `src/app/admin/listings/page.tsx` | +147 −28 | Mock list | **Review.** Both sides are unbacked; mine is an honest placeholder, theirs is a fake. Neither is real until there is an endpoint. |
| `src/app/admin/users/page.tsx` | +101 −20 | Mock list | Same. No user-listing endpoint exists. |
| `src/app/admin/reports/page.tsx` | +128 −24 | Mock stats | Same. |
| `src/app/landlord/page.tsx` | +156 −61 | Mock dashboard | **Take mine.** |
| `src/app/landlord/properties/page.tsx` | +92 −46 | Fixture list | **Take mine.** |
| `src/app/landlord/upload-property/page.tsx` | +50 −24 | Fixture submit | **Take mine.** |
| `src/app/landlord/inspections/page.tsx` | +128 −46 | localStorage queue | **Take mine** (live inspection queue). |
| `src/app/lawyer/page.tsx` | +129 −46 | Mock dashboard | **Take mine.** Lawyer role is preserved on this branch per §29. |
| `src/app/lawyer/properties/page.tsx` | +95 −37 | Fixture list | **Take mine.** |
| `src/app/lawyer/properties/upload/page.tsx` | +50 −10 | Fixture submit | **Take mine.** |
| `src/app/tenant/page.tsx` | +131 −46 | Mock dashboard | **Take mine** — and note `roleHomePath.MOVER` also points at `/tenant`. |
| `src/app/tenant/properties/page.tsx` | +95 −37 | Fixture list | **Take mine.** |
| `src/app/tenant/properties/upload/page.tsx` | +88 −17 | Fixture submit | **Take mine.** |

### `modify/delete` (1)

| File | State | Resolution |
|---|---|---|
| `src/app/api/properties/route.ts` | **Deleted here, modified there (+26 −11)** | **Keep it deleted.** It was a fixture-backed Next route handler standing in for the API; the Express backend replaced it. Git will leave their version in the tree on merge — remove it explicitly. |

---

## Files that merge clean — and two that must not

17 files only the mainline touched, so a merge takes them silently. Most are harmless
or welcome. Two are neither, and three create duplicate product surfaces.

### Stop these

| File | |
|---|---|
| `AGENTS.md` | **Deleted on the mainline.** A clean merge deletes it here too. It is the project instruction file, re-generated by `next dev` — losing it is silent and confusing rather than fatal, but it should be a decision, not a side effect. |
| `CLAUDE.md` | **Deleted on the mainline.** Same. It is `@AGENTS.md` plus nothing, so it goes with it. |

### Duplicate surfaces a merge would create

| Theirs (new) | Mine | Problem |
|---|---|---|
| `src/app/(auth)/signup/page.tsx` | `(auth)/register/page.tsx` | Two registration pages at two URLs, one of them writing to `localStorage`. Pick one path; if `/signup` is the wanted URL, rename mine and redirect. |
| `src/app/student/{layout,page,profile}` | `/tenant` | An entire role area for `student`, which the backend's Role enum does not contain. Either map it onto `TENANT`/`MOVER` or drop it. Three files, all client-gated. |
| `src/app/api/properties/[id]/route.ts` | *(nothing — API is Express)* | New fixture-backed route handler; the sibling `route.ts` is the modify/delete above. Drop both. |
| `src/app/landlord/properties/edit/page.tsx` | `landlord/properties/[id]/edit/page.tsx` | Static vs dynamic segment. Both would resolve; only mine can edit a specific listing. |
| `src/lib/api/users.ts` (+97) | `authApi` role endpoints | localStorage user store. Drop — `POST /users/me/roles` is live. |
| `src/lib/api/notifications.ts` (+42) | *(none yet)* | localStorage notifications. Notifications are §41 step 10 and unimplemented here, so this is the one mock with no replacement — still, do not ship it as if it worked. |

### Worth salvaging (real UI value, no mock entanglement)

| File | Size | Note |
|---|---|---|
| `src/components/property/PropertyDetail.tsx` | **+582, new** | The largest single piece of genuine work on their side. Port it onto the real `Property` type and my `[id]/page.tsx`; it must gain the verification badge, reviews and experience summary. |
| `src/components/marketing/PropertySearch.tsx` | +128 −27 | Better filter UI. Only wire controls the backend actually supports — `source`/`availability`/`sortBy` are typed as free strings on their side and would silently do nothing. |
| `src/components/marketing/HeroSearch.tsx` | modified | Landing search. Clean merge. |
| `src/components/property/PropertyCard.tsx` | +11 | Clean merge. |
| `src/components/ui/Card.tsx` | +6 | Clean merge. |
| `src/config/site.ts`, `src/app/(marketing)/page.tsx`, `src/app/sitemap.ts` | modified | Clean merge. `sitemap.ts` still reads fixtures on both sides — a known open item. |
| `src/lib/fixtures/properties.ts` | +106 | Only the sitemap and their mocks read it now. Keep for the sitemap; delete when that is wired. |

---

## Recommended procedure

A merge commit is the wrong instrument here. 32 of 32 shared files conflict, and for
28 of them the resolution is "take mine" — a merge would ask a person to re-decide that
28 times, with a conflict marker in every file, and a mistake anywhere reintroduces a
mock into a working path.

Instead:

1. **Do not merge the mainline into this branch.** Open the PR the other way and let
   this branch be the base going forward.
2. **Port the six salvageable pieces first**, as their own commits on this branch,
   before any PR: `PropertyDetail.tsx`, the four dashboard nav shells (chrome only),
   and `PropertySearch`/`HeroSearch`/`PropertyCard`/`Card`. Each becomes an ordinary
   commit with no conflict markers anywhere.
3. **Decide the two route names** — `/register` vs `/signup`, and what `student` means
   in a system whose roles are `TENANT | LANDLORD | LAWYER | MOVER | ADMIN`. These are
   product decisions, not merge decisions, and both are cheap now and expensive later.
4. **Delete the mock layer explicitly** as part of that PR, so the diff shows the
   plaintext-password file and the `localStorage` session being removed rather than
   quietly overwritten.
5. **Re-add `AGENTS.md` / `CLAUDE.md`** if their deletion was accidental.
6. Then run the gates on the result: `npm run lint`, `npm run typecheck`,
   `npm run build`, `cd backend && npm test && npx prisma validate`.

Nothing on this branch has been pushed. That is deliberate — the standing instruction
is not to push to the mainline without authorization, and this report is the input to
that decision, not a step past it.
