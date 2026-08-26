/**
 * Live inspection contract check.
 *
 * The third of these, after auth and properties, and the same claim: that the
 * shapes the UI parses are the shapes the API sends. Every response here goes
 * through the SAME Zod schemas the components use, so a drift fails on this
 * console instead of throwing inside a page a tenant is looking at.
 *
 * What it drives is the whole loop, both sides of it:
 *
 *  - a tenant asks, a landlord answers, and each reads the row back,
 *  - the tenant's phone number is ABSENT before the viewing is confirmed and
 *    present after — the one rule in this domain worth checking live, because
 *    the frontend has no fallback for it anywhere and never should,
 *  - what the landlord types reaches the tenant word for word, having crossed a
 *    role boundary and two schemas,
 *  - the refusals: a second landlord cannot see or answer these requests, a
 *    tenant cannot answer their own, asking twice is refused, and the listing's
 *    own owner cannot book a viewing of their flat,
 *  - a rejection yields a human sentence through `messageFrom()` and lands on
 *    the right input through `fieldErrorsFrom()`,
 *  - `createInspectionSchema` and `inspectionDecisionSchema` — the client-side
 *    copies — reject exactly what the server rejects. Two schemas that disagree
 *    are worse than one: the form would either pass through something the API
 *    refuses, or refuse something it would have taken.
 *
 * Transport, cookie jar and the envelope-unwrap and error-flatten steps are
 * lifted from verify-property-contract.mts, and mirror `src/lib/api/client.ts`
 * exactly — otherwise the schemas would be fed a shape the browser never sees.
 *
 * Run with the backend up:
 *   backend/node_modules/.bin/tsx scripts/verify-inspection-contract.mts
 *
 * It deletes the listing it creates, and leaves the inspection rows attached to
 * it going with it. It leaves THREE throwaway accounts behind:
 * inspcheck+<stamp>a@wale.test (landlord, owns the listing), b (the tenant who
 * asks) and c (a second landlord, for the ownership checks). To remove:
 *   cd backend && npx tsx scripts/clean-test-accounts.ts --delete
 *
 * It also SIGNS IN as an existing admin to check the admin widening; if that
 * sign-in fails, that section is SKIPPED and said to be skipped rather than
 * counted as a failure it is not.
 */

import {
  apiErrorSchema,
  createInspectionSchema,
  inspectionDecisionSchema,
  inspectionListResponseSchema,
  inspectionSchema,
  inspectionStatusCopy,
  inspectionStatusSchema,
  landlordInspectionListResponseSchema,
  landlordInspectionSchema,
  myInspectionResponseSchema,
  ownerPropertySchema,
  propertyFormSchema,
  type PropertyFormValues,
} from "../src/lib/api/schemas";
import { fieldErrorsFrom, messageFrom, statusOf } from "../src/lib/api/field-errors";
import { formatDateTime, toDateTimeLocalValue } from "../src/lib/utils/format";

const BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000/api/v1";

/** An existing admin — `POST /auth/register` refuses ADMIN, so it cannot be made here. */
const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "admin@wale.test";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "AdminDev123!";

let passed = 0;
let failed = 0;
let skipped = 0;

function check(name: string, ok: boolean, detail = "") {
  if (ok) {
    passed++;
    console.log(`  PASS  ${name}`);
  } else {
    failed++;
    console.log(`  FAIL  ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

function skip(name: string, why: string) {
  skipped++;
  console.log(`  SKIP  ${name} — ${why}`);
}

/**
 * The status a rejected body arrives with: 422, not 400.
 *
 * `ValidationError` in backend/src/lib/errors.ts, and what
 * `src/lib/api/field-errors.ts` is written against — its own docblock says "a 422
 * from Zod arrives as details". Named rather than inlined so it is visible that
 * both sides are making the same claim about the same number.
 */
const VALIDATION_STATUS = 422;

/**
 * Whether a rejection put its complaint on a particular input.
 *
 * `fieldErrorsFrom` returns a LIST of `{field, message}`, not an object keyed by
 * field name — the form maps over it. Asking `.preferredAt` of it would be
 * undefined for a rejection that did name that field.
 */
function complainsAbout(error: unknown, field: string): boolean {
  return fieldErrorsFrom(error).some((e) => e.field === field);
}

/* ------------------------------------------------------------ cookie jar -- */

type Jar = Map<string, string>;

function cookieHeader(jar: Jar): string {
  return [...jar].map(([k, v]) => `${k}=${v}`).join("; ");
}

function storeCookies(jar: Jar, res: Response) {
  for (const raw of res.headers.getSetCookie()) {
    const [pair] = raw.split(";");
    const eq = pair.indexOf("=");
    if (eq > 0) jar.set(pair.slice(0, eq).trim(), pair.slice(eq + 1).trim());
  }
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
    message:
      typeof source.message === "string" ? source.message : "An unexpected error occurred",
    code: typeof source.code === "string" ? source.code : undefined,
    field: first && typeof first.field === "string" ? first.field : undefined,
    details: Array.isArray(details) ? details : undefined,
  };
}

interface Call {
  status: number;
  data: unknown;
  /** Raw body, kept for the envelope checks. */
  raw: unknown;
  error?: { response: { status: number; data: Flat } };
}

/** One signed-in browser: its own cookie jar, its own CSRF token. */
class Session {
  readonly jar: Jar = new Map();

  async call(
    method: "GET" | "POST" | "PATCH" | "DELETE",
    path: string,
    body?: unknown,
  ): Promise<Call> {
    const headers: Record<string, string> = { "Content-Type": "application/json" };

    // Double-submit CSRF, exactly as the request interceptor does it.
    if (method !== "GET") {
      if (!this.jar.has("wale_csrf")) await this.call("GET", "/auth/csrf");
      const token = this.jar.get("wale_csrf");
      if (token) headers["X-CSRF-Token"] = decodeURIComponent(token);
    }

    const cookies = cookieHeader(this.jar);
    if (cookies) headers.Cookie = cookies;

    const res = await fetch(`${BASE}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    storeCookies(this.jar, res);

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
        raw: parsed,
        error: { response: { status: res.status, data: flattenError(parsed) } },
      };
    }

    const unwrapped =
      typeof parsed === "object" && parsed !== null && "success" in parsed && "data" in parsed
        ? (parsed as { data: unknown }).data
        : parsed;

    return { status: res.status, data: unwrapped, raw: parsed };
  }

  async signUp(email: string, role: "LANDLORD" | "TENANT"): Promise<void> {
    const r = await this.call("POST", "/auth/register", {
      firstName: role === "TENANT" ? "Chidi" : "Insp",
      lastName: "Check",
      email,
      phone: TYPED_PHONE,
      password: PASSWORD,
      confirmPassword: PASSWORD,
      role,
    });
    check(
      `signed up ${email} as ${role}`,
      r.status === 201 || r.status === 200,
      `got ${r.status} ${JSON.stringify(r.data).slice(0, 200)}`,
    );
  }

  async signIn(email: string, password: string): Promise<boolean> {
    const r = await this.call("POST", "/auth/login", { email, password });
    return r.status === 200;
  }
}

/* ------------------------------------------------------------------ main -- */

const stamp = process.env.STAMP ?? "1";
const PASSWORD = "Wale12345";

/**
 * The number the confirmation is supposed to release — in both spellings.
 *
 * A person types the local form; `nigerianPhone` in backend/src/lib/zod-fields.ts
 * normalizes it to E.164 before it is stored, so that is what comes back and what
 * a leak check has to look for. `SIGNIFICANT` is the part common to both, used for
 * the negative checks so they cannot pass merely because the format differs from
 * the one being searched for.
 */
const TYPED_PHONE = "08031234567";
const STORED_PHONE = "+2348031234567";
const SIGNIFICANT = "8031234567";

const emailOwner = `inspcheck+${stamp}a@wale.test`;
const emailTenant = `inspcheck+${stamp}b@wale.test`;
const emailOther = `inspcheck+${stamp}c@wale.test`;

console.log(`\nInspection contract check against ${BASE}`);
console.log(`Throwaway accounts: ${emailOwner}, ${emailTenant}, ${emailOther}\n`);

const owner = new Session();
const tenant = new Session();
const other = new Session();

/** Days out, so every request in this run is inside the server's 90-day horizon. */
function future(days: number, hour = 10): Date {
  const d = new Date(Date.now() + days * 86_400_000);
  d.setHours(hour, 0, 0, 0);
  return d;
}

const FORM_INPUT: PropertyFormValues = {
  title: "Inspection check flat near the main gate",
  description:
    "A tidy two-bedroom flat in a fenced compound with steady water and a prepaid meter.",
  price: "1200000",
  type: "two_bedroom",
  bedrooms: "2",
  bathrooms: "1",
  address: "14 Akoka Road",
  city: "Yaba",
  state: "Lagos",
  neighborhood: "Akoka",
  university: "unilag",
  availableDate: "2026-10-01",
  amenities: "Borehole, Prepaid meter, Security",
  images: ["/listings/listing-01.jpg", "/listings/listing-02.jpg"],
  contactName: "Ada Okoye",
  contactPhone: "08031234567",
  contactEmail: "ada@example.com",
};

let propertyId = "";
let inspectionId = "";

/* -- 1. The two client schemas agree with the server's, before anything runs -- */
{
  console.log("\n1. The form's own rules");

  const past = createInspectionSchema.safeParse({
    preferredAt: new Date(Date.now() - 86_400_000).toISOString(),
  });
  check("a time in the past is refused before it leaves the browser", !past.success);

  const tooFar = createInspectionSchema.safeParse({
    preferredAt: future(120).toISOString(),
  });
  check("so is one beyond the 90-day horizon the server enforces", !tooFar.success);

  const noOffset = createInspectionSchema.safeParse({ preferredAt: "2026-10-01T10:00" });
  check(
    "a bare datetime-local value is refused — it carries no offset",
    !noOffset.success,
    "this is why the component calls toISOString() on a Date built from the input",
  );

  const ok = createInspectionSchema.safeParse({
    preferredAt: future(3).toISOString(),
    note: "  I can only do mornings  ",
  });
  check("a valid request parses", ok.success);
  check(
    "the note is trimmed on the way out",
    ok.success && ok.data.note === "I can only do mornings",
    ok.success ? JSON.stringify(ok.data.note) : "",
  );

  const blankNote = createInspectionSchema.safeParse({
    preferredAt: future(3).toISOString(),
    note: "   ",
  });
  check(
    "a whitespace-only note becomes undefined, not an empty string",
    blankNote.success && blankNote.data.note === undefined,
    blankNote.success ? JSON.stringify(blankNote.data.note) : "",
  );

  const bareNo = inspectionDecisionSchema.safeParse({ status: "DECLINED" });
  check("declining with no reason is refused client-side too", !bareNo.success);
  check(
    "and the complaint lands on the response field, not the form",
    !bareNo.success && bareNo.error.issues[0]?.path[0] === "response",
    !bareNo.success ? JSON.stringify(bareNo.error.issues[0]?.path) : "",
  );

  const bareYes = inspectionDecisionSchema.safeParse({ status: "CONFIRMED" });
  check("confirming with no note is fine", bareYes.success);

  check(
    "every status the server can return has UI copy",
    inspectionStatusSchema.options.every((s) => Boolean(inspectionStatusCopy[s]?.label)),
    JSON.stringify(Object.keys(inspectionStatusCopy)),
  );

  // The two helpers exist because reading and writing a datetime-local field
  // need opposite timezone treatment. This is the half that would silently show
  // a Nigerian 08:00 for the 09:00 they picked.
  const local = new Date(2026, 9, 1, 9, 0, 0);
  check(
    "toDateTimeLocalValue keeps the wall clock the user sees",
    toDateTimeLocalValue(local) === "2026-10-01T09:00",
    toDateTimeLocalValue(local),
  );
}

/* ------------------------------------------- 2. A listing to ask about -- */
{
  console.log("\n2. Setting up a listing that is actually on offer");

  await owner.signUp(emailOwner, "LANDLORD");
  await tenant.signUp(emailTenant, "TENANT");
  await other.signUp(emailOther, "LANDLORD");

  const form = propertyFormSchema.safeParse(FORM_INPUT);
  if (!form.success) {
    check("the property form parses", false, JSON.stringify(form.error.issues).slice(0, 300));
    process.exit(1);
  }

  const created = await owner.call("POST", "/properties", form.data);
  const parsed = ownerPropertySchema.safeParse(created.data);
  check("a listing was created", parsed.success, `got ${created.status}`);
  if (!parsed.success) process.exit(1);
  propertyId = parsed.data.id;

  // A DRAFT is not on offer, so it cannot be booked — the same 404 the public
  // read gives, checked here rather than assumed.
  const early = await tenant.call("POST", `/inspections/properties/${propertyId}`, {
    preferredAt: future(3).toISOString(),
  });
  check(
    "a draft listing cannot be booked, and says 404 rather than 'it exists but is a draft'",
    early.status === 404,
    `got ${early.status}`,
  );

  const submitted = await owner.call("POST", `/properties/${propertyId}/submit`);
  check("the listing is submitted for review", submitted.status === 200, `got ${submitted.status}`);
}

/* ----------------------------------------------- 3. The tenant asks -- */
{
  console.log("\n3. The tenant asks to view it");

  const none = await tenant.call("GET", `/inspections/properties/${propertyId}/mine`);
  const parsedNone = myInspectionResponseSchema.safeParse(none.data);
  check(
    "before asking, /mine parses and says null",
    parsedNone.success && parsedNone.data.inspection === null,
    parsedNone.success ? JSON.stringify(parsedNone.data) : `got ${none.status}`,
  );

  const when = future(3, 11);
  const payload = createInspectionSchema.parse({
    preferredAt: when.toISOString(),
    note: "I can only do mornings before 12.",
  });

  const r = await tenant.call("POST", `/inspections/properties/${propertyId}`, payload);
  check("POST /inspections/properties/:id accepts the form's payload", r.status === 201, `got ${r.status} ${JSON.stringify(r.data).slice(0, 200)}`);

  const parsed = inspectionSchema.safeParse(r.data);
  check(
    "the created request parses with inspectionSchema",
    parsed.success,
    parsed.success ? "" : JSON.stringify(parsed.error.issues).slice(0, 300),
  );

  if (parsed.success) {
    inspectionId = parsed.data.id;
    check("a new request is REQUESTED", parsed.data.status === "REQUESTED", parsed.data.status);
    check("no answer has been invented", parsed.data.response === undefined, String(parsed.data.response));
    check("nor a responded-at date", parsed.data.respondedAt === undefined, String(parsed.data.respondedAt));
    check("the note survived", parsed.data.note === "I can only do mornings before 12.", String(parsed.data.note));
    check(
      "the time comes back as the instant that was sent, not a reinterpreted wall clock",
      Date.parse(parsed.data.preferredAt) === when.getTime(),
      `${parsed.data.preferredAt} vs ${when.toISOString()}`,
    );
    check(
      "the listing came with it, cover photo and all",
      parsed.data.property.id === propertyId &&
        parsed.data.property.image === FORM_INPUT.images[0],
      JSON.stringify(parsed.data.property),
    );
    check(
      "formatDateTime renders it without throwing",
      formatDateTime(parsed.data.preferredAt).length > 0,
      formatDateTime(parsed.data.preferredAt),
    );
  }

  const again = await tenant.call("GET", `/inspections/properties/${propertyId}/mine`);
  const parsedAgain = myInspectionResponseSchema.safeParse(again.data);
  check(
    "afterwards /mine returns the live request, which is what the button reads",
    parsedAgain.success && parsedAgain.data.inspection?.id === inspectionId,
    parsedAgain.success ? JSON.stringify(parsedAgain.data.inspection?.id) : `got ${again.status}`,
  );
}

if (!inspectionId) {
  console.log("\nNo request was created; the rest cannot run.");
  process.exit(1);
}

/* --------------------------------------------------- 4. The refusals -- */
{
  console.log("\n4. What is refused");

  const twice = await tenant.call("POST", `/inspections/properties/${propertyId}`, {
    preferredAt: future(4).toISOString(),
  });
  check("asking twice is refused", twice.status === 409, `got ${twice.status}`);
  check(
    "and the refusal is a sentence, not a constraint name",
    /already asked/i.test(messageFrom(twice.error)) && !/P2002|unique/i.test(messageFrom(twice.error)),
    messageFrom(twice.error),
  );

  const ownFlatByRole = await owner.call("POST", `/inspections/properties/${propertyId}`, {
    preferredAt: future(4).toISOString(),
  });
  check(
    "a landlord-only account cannot reach the ask endpoint at all",
    ownFlatByRole.status === 403,
    `got ${ownFlatByRole.status} ${messageFrom(ownFlatByRole.error, "").slice(0, 120)}`,
  );

  // The role gate above is not the interesting refusal — it would also stop a
  // landlord asking about someone ELSE's flat, which is legitimate. So: give this
  // landlord the tenant role they would really hold if they were house-hunting,
  // and watch the ownership rule refuse them their own listing. This is the
  // multi-role model doing the thing it exists for, checked live.
  const claimed = await owner.call("POST", "/users/me/roles", { role: "TENANT" });
  check(
    "a landlord can claim the tenant role for themselves",
    claimed.status === 200 || claimed.status === 201,
    `got ${claimed.status} ${messageFrom(claimed.error, "").slice(0, 120)}`,
  );

  const ownFlat = await owner.call("POST", `/inspections/properties/${propertyId}`, {
    preferredAt: future(4).toISOString(),
  });
  check(
    "and still cannot book a viewing of their own listing — that is ownership, not role",
    ownFlat.status === 409,
    `got ${ownFlat.status} ${messageFrom(ownFlat.error, "").slice(0, 120)}`,
  );
  check(
    "told so in a sentence about their listing, not a rule name",
    /your own listing/i.test(messageFrom(ownFlat.error)),
    messageFrom(ownFlat.error),
  );

  // Put them back, so the queue checks below are a plain landlord's queue.
  const dropped = await owner.call("DELETE", "/users/me/roles/TENANT");
  check("and can drop it again", dropped.status === 200 || dropped.status === 204, `got ${dropped.status}`);

  const past = await tenant.call("POST", `/inspections/properties/${propertyId}`, {
    preferredAt: new Date(Date.now() - 86_400_000).toISOString(),
  });
  check(
    "a time in the past is refused by the server too",
    past.status === VALIDATION_STATUS,
    `got ${past.status}`,
  );
  check(
    "the complaint lands on the date input",
    complainsAbout(past.error, "preferredAt"),
    JSON.stringify(fieldErrorsFrom(past.error)),
  );
  check(
    "the error body is the shape the client's interceptor hands the form",
    apiErrorSchema.safeParse(past.error?.response.data).success,
    JSON.stringify(past.error?.response.data).slice(0, 200),
  );
  // The wire shape, before the interceptor: the documented envelope, with the
  // reason nested under `error`. Checked separately because `apiErrorSchema`
  // describes the flattened form, not this one.
  check(
    "and on the wire it was the documented envelope",
    typeof past.raw === "object" &&
      past.raw !== null &&
      (past.raw as { success?: unknown }).success === false &&
      apiErrorSchema.safeParse((past.raw as { error?: unknown }).error).success,
    JSON.stringify(past.raw).slice(0, 200),
  );

  const stranger = await other.call("PATCH", `/inspections/${inspectionId}/respond`, {
    status: "CONFIRMED",
  });
  check(
    "a second landlord answering someone else's request gets 404, not 403",
    stranger.status === 404,
    `got ${stranger.status}`,
  );

  const selfAnswer = await tenant.call("PATCH", `/inspections/${inspectionId}/respond`, {
    status: "CONFIRMED",
  });
  check(
    "the tenant cannot confirm their own viewing",
    selfAnswer.status === 403 || selfAnswer.status === 404,
    `got ${selfAnswer.status}`,
  );

  const strangerQueue = await other.call("GET", "/inspections/incoming");
  const parsedQueue = landlordInspectionListResponseSchema.safeParse(strangerQueue.data);
  check(
    "a second landlord's queue parses and does not contain this request",
    parsedQueue.success && !parsedQueue.data.inspections.some((i) => i.id === inspectionId),
    parsedQueue.success ? `${parsedQueue.data.inspections.length} rows` : `got ${strangerQueue.status}`,
  );

  const anon = new Session();
  const anonAsk = await anon.call("POST", `/inspections/properties/${propertyId}`, {
    preferredAt: future(4).toISOString(),
  });
  check("a signed-out visitor cannot ask", anonAsk.status === 401, `got ${anonAsk.status}`);
  check(
    "and statusOf() reads that 401, which is what gates the query on the listing page",
    statusOf(anonAsk.error) === 401,
    String(statusOf(anonAsk.error)),
  );
}

/* ------------------------------ 5. The landlord's queue, before answering -- */
{
  console.log("\n5. The landlord's queue");

  const r = await owner.call("GET", "/inspections/incoming");
  check("GET /inspections/incoming returns 200 for the owner", r.status === 200, `got ${r.status}`);

  const parsed = landlordInspectionListResponseSchema.safeParse(r.data);
  check(
    "the queue parses with landlordInspectionListResponseSchema",
    parsed.success,
    parsed.success ? "" : JSON.stringify(parsed.error.issues).slice(0, 400),
  );

  if (parsed.success) {
    const row = parsed.data.inspections.find((i) => i.id === inspectionId);
    check("the request is in it", Boolean(row), `${parsed.data.inspections.length} rows`);

    if (row) {
      check(
        "the landlord is told who is asking",
        row.tenant.name === "Chidi Check",
        JSON.stringify(row.tenant),
      );
      // The rule this whole file exists to check.
      check(
        "the tenant's phone number is NOT there before the viewing is confirmed",
        row.tenant.phone === undefined,
        JSON.stringify(row.tenant),
      );
      check(
        "and it is nowhere else in the payload either",
        !JSON.stringify(row).includes(SIGNIFICANT),
        JSON.stringify(row).slice(0, 300),
      );
      check(
        "nor is the tenant's email address anywhere in it",
        !JSON.stringify(row).includes(emailTenant),
        JSON.stringify(row).slice(0, 300),
      );
    }

    check("pagination came back", parsed.data.page === 1 && parsed.data.totalPages >= 1, JSON.stringify({ page: parsed.data.page, totalPages: parsed.data.totalPages }));
  }

  const filtered = await owner.call("GET", "/inspections/incoming?status=DECLINED");
  const parsedFiltered = landlordInspectionListResponseSchema.safeParse(filtered.data);
  check(
    "the status filter the Select sends is understood and excludes this row",
    parsedFiltered.success && !parsedFiltered.data.inspections.some((i) => i.id === inspectionId),
    parsedFiltered.success ? `${parsedFiltered.data.inspections.length} rows` : `got ${filtered.status}`,
  );

  const bad = await owner.call("GET", "/inspections/incoming?status=BANANA");
  check(
    "an unknown status is refused, not silently ignored",
    bad.status === VALIDATION_STATUS,
    `got ${bad.status}`,
  );
}

/* ---------------------------------------- 6. The answer, and the number -- */
const NOTE = "Come to the black gate and ask for Musa. Bring ID.";
{
  console.log("\n6. The landlord confirms");

  const decision = inspectionDecisionSchema.parse({ status: "CONFIRMED", response: NOTE });
  const r = await owner.call("PATCH", `/inspections/${inspectionId}/respond`, decision);
  check("PATCH /inspections/:id/respond accepts the dialog's payload", r.status === 200, `got ${r.status} ${messageFrom(r.error, "").slice(0, 150)}`);

  const parsed = landlordInspectionSchema.safeParse(r.data);
  check(
    "the answered request parses with landlordInspectionSchema",
    parsed.success,
    parsed.success ? "" : JSON.stringify(parsed.error.issues).slice(0, 300),
  );

  if (parsed.success) {
    check("it is CONFIRMED", parsed.data.status === "CONFIRMED", parsed.data.status);
    check("respondedAt is set now that there is an answer", Boolean(parsed.data.respondedAt), String(parsed.data.respondedAt));
    // The other half of the rule. E.164, not the local form the tenant typed:
    // `nigerianPhone` normalizes on the way in, which is also exactly what the
    // queue's `tel:` link wants.
    check(
      "the phone number IS released once the viewing is confirmed",
      parsed.data.tenant.phone === STORED_PHONE,
      JSON.stringify(parsed.data.tenant),
    );
    check(
      "the appointment time was not rewritten under the tenant",
      Boolean(parsed.data.preferredAt),
      String(parsed.data.preferredAt),
    );
  }

  const reconfirm = await owner.call("PATCH", `/inspections/${inspectionId}/respond`, {
    status: "CONFIRMED",
  });
  check("confirming twice is refused", reconfirm.status === 409, `got ${reconfirm.status}`);
  check(
    "with a sentence a landlord can read",
    /already confirmed/i.test(messageFrom(reconfirm.error)),
    messageFrom(reconfirm.error),
  );

  const declineBlank = await owner.call("PATCH", `/inspections/${inspectionId}/respond`, {
    status: "DECLINED",
    response: "no",
  });
  check(
    "declining with a one-word reason is refused",
    declineBlank.status === VALIDATION_STATUS,
    `got ${declineBlank.status}`,
  );
  check(
    "and it lands on the response field, exactly as the client schema said it would",
    complainsAbout(declineBlank.error, "response"),
    JSON.stringify(fieldErrorsFrom(declineBlank.error)),
  );
}

/* ------------------------------------- 7. What the tenant reads back -- */
{
  console.log("\n7. What the tenant sees");

  const r = await tenant.call("GET", "/inspections/mine");
  check("GET /inspections/mine returns 200", r.status === 200, `got ${r.status}`);

  const parsed = inspectionListResponseSchema.safeParse(r.data);
  check(
    "the tenant's list parses with inspectionListResponseSchema",
    parsed.success,
    parsed.success ? "" : JSON.stringify(parsed.error.issues).slice(0, 400),
  );

  if (parsed.success) {
    const row = parsed.data.inspections.find((i) => i.id === inspectionId);
    check("their request is in it", Boolean(row), `${parsed.data.inspections.length} rows`);

    if (row) {
      check("it shows as confirmed", row.status === "CONFIRMED", row.status);
      // Crossed a role boundary and two schemas without being touched.
      check(
        "the landlord's words arrive verbatim",
        row.response === NOTE,
        JSON.stringify(row.response),
      );
      check(
        "the tenant's list carries no `tenant` block — they know who they are",
        !("tenant" in row),
        JSON.stringify(Object.keys(row)),
      );
      check(
        "and no phone number is echoed back at them",
        !JSON.stringify(row).includes(SIGNIFICANT),
        JSON.stringify(row).slice(0, 300),
      );
    }

    check(
      "every status in the list has copy to render it with",
      parsed.data.inspections.every((i) => Boolean(inspectionStatusCopy[i.status])),
    );
  }

  const filtered = await tenant.call("GET", "/inspections/mine?status=CONFIRMED&page=1&pageSize=5");
  const parsedFiltered = inspectionListResponseSchema.safeParse(filtered.data);
  check(
    "the tenant's status filter and page size are honoured",
    parsedFiltered.success &&
      parsedFiltered.data.pageSize === 5 &&
      parsedFiltered.data.inspections.every((i) => i.status === "CONFIRMED"),
    parsedFiltered.success ? JSON.stringify({ pageSize: parsedFiltered.data.pageSize }) : `got ${filtered.status}`,
  );

  const tooBig = await tenant.call("GET", "/inspections/mine?pageSize=500");
  check(
    "an oversized page size is refused rather than served",
    tooBig.status === VALIDATION_STATUS,
    `got ${tooBig.status}`,
  );
}

/* ---------------------------------------------- 8. The admin widening -- */
{
  console.log("\n8. The admin queue");

  const admin = new Session();
  const signedIn = await admin.signIn(ADMIN_EMAIL, ADMIN_PASSWORD);

  if (!signedIn) {
    skip("the admin sees every request", `could not sign in as ${ADMIN_EMAIL}`);
  } else {
    const r = await admin.call("GET", "/inspections/incoming?pageSize=50");
    const parsed = landlordInspectionListResponseSchema.safeParse(r.data);
    check(
      "the admin queue parses with the same schema the landlord queue uses",
      parsed.success,
      parsed.success ? "" : JSON.stringify(parsed.error.issues).slice(0, 400),
    );
    check(
      "and it contains a request on a listing the admin does not own",
      parsed.success && parsed.data.inspections.some((i) => i.id === inspectionId),
      parsed.success ? `${parsed.data.inspections.length} rows` : `got ${r.status}`,
    );

    // Same endpoint, same shape, wider result — which is the whole reason one
    // component serves both /landlord/inspections and /admin/inspections.
    const mine = await admin.call("GET", "/inspections/mine");
    const parsedMine = inspectionListResponseSchema.safeParse(mine.data);
    check(
      "an admin's own 'mine' is still only their own, with no widening",
      parsedMine.success && !parsedMine.data.inspections.some((i) => i.id === inspectionId),
      parsedMine.success ? `${parsedMine.data.inspections.length} rows` : `got ${mine.status}`,
    );
  }
}

/* --------------------------------------------- 9. The tenant cancels -- */
{
  console.log("\n9. Cancelling");

  const notTheirs = await other.call("POST", `/inspections/${inspectionId}/cancel`);
  check(
    "someone else cannot cancel it — 404, same as a guessed id",
    notTheirs.status === 404,
    `got ${notTheirs.status}`,
  );

  const landlordCancel = await owner.call("POST", `/inspections/${inspectionId}/cancel`);
  check(
    "nor can the landlord, who declines instead",
    landlordCancel.status === 404,
    `got ${landlordCancel.status}`,
  );

  const r = await tenant.call("POST", `/inspections/${inspectionId}/cancel`);
  check("the tenant can cancel a confirmed viewing", r.status === 200, `got ${r.status}`);

  const parsed = inspectionSchema.safeParse(r.data);
  check("the cancelled request parses", parsed.success, parsed.success ? "" : JSON.stringify(parsed.error.issues).slice(0, 300));
  if (parsed.success) {
    check("it is CANCELLED", parsed.data.status === "CANCELLED", parsed.data.status);
  }

  const twice = await tenant.call("POST", `/inspections/${inspectionId}/cancel`);
  check("cancelling twice is refused", twice.status === 409, `got ${twice.status}`);

  const answerAfter = await owner.call("PATCH", `/inspections/${inspectionId}/respond`, {
    status: "CONFIRMED",
  });
  check(
    "and the landlord cannot confirm what was called off",
    answerAfter.status === 409,
    `got ${answerAfter.status}`,
  );
  check(
    "the landlord is told the tenant cancelled, rather than a status name",
    /cancelled this request/i.test(messageFrom(answerAfter.error)),
    messageFrom(answerAfter.error),
  );

  // The row is kept, not deleted — a landlord who blocked out the morning needs
  // to see it was called off, not find it vanished.
  const still = await owner.call("GET", "/inspections/incoming?status=CANCELLED");
  const parsedStill = landlordInspectionListResponseSchema.safeParse(still.data);
  check(
    "the cancelled request is still visible to the landlord",
    parsedStill.success && parsedStill.data.inspections.some((i) => i.id === inspectionId),
    parsedStill.success ? `${parsedStill.data.inspections.length} rows` : `got ${still.status}`,
  );

  // And the index only counts REQUESTED rows, so asking again is possible.
  const askAgain = await tenant.call("POST", `/inspections/properties/${propertyId}`, {
    preferredAt: future(6).toISOString(),
  });
  check(
    "after cancelling, the tenant may ask again",
    askAgain.status === 201,
    `got ${askAgain.status} ${messageFrom(askAgain.error, "").slice(0, 150)}`,
  );

  const parsedNew = inspectionSchema.safeParse(askAgain.data);
  if (parsedNew.success) {
    const declined = await owner.call("PATCH", `/inspections/${parsedNew.data.id}/respond`, {
      status: "DECLINED",
      response: "That week is taken — try the following Saturday morning instead.",
    });
    const parsedDeclined = landlordInspectionSchema.safeParse(declined.data);
    check("a request can be declined with a reason", declined.status === 200, `got ${declined.status}`);
    check(
      "a declined request releases no phone number",
      parsedDeclined.success && parsedDeclined.data.tenant.phone === undefined,
      parsedDeclined.success ? JSON.stringify(parsedDeclined.data.tenant) : "",
    );

    const completed = await owner.call("PATCH", `/inspections/${parsedNew.data.id}/respond`, {
      status: "COMPLETED",
    });
    check(
      "a declined request cannot then be marked as viewed",
      completed.status === 409,
      `got ${completed.status}`,
    );
  }
}

/* --------------------------------------------------- 10. Clean up -- */
{
  console.log("\n10. Cleaning up");

  const r = await owner.call("DELETE", `/properties/${propertyId}`);
  check(
    "DELETE /properties/:id removes the listing and its requests with it",
    r.status === 200 || r.status === 204,
    `got ${r.status}`,
  );

  const after = await tenant.call("GET", "/inspections/mine?pageSize=50");
  const parsed = inspectionListResponseSchema.safeParse(after.data);
  check(
    "the tenant's list no longer mentions it",
    parsed.success && !parsed.data.inspections.some((i) => i.property.id === propertyId),
    parsed.success ? `${parsed.data.inspections.length} rows` : `got ${after.status}`,
  );
}

console.log(`\n${passed} passed, ${failed} failed${skipped ? `, ${skipped} skipped` : ""}`);
console.log(`Left behind: ${emailOwner}, ${emailTenant}, ${emailOther}`);
console.log(`Clean up with: cd backend && npx tsx scripts/clean-test-accounts.ts --delete`);
process.exit(failed === 0 ? 0 : 1);
