/**
 * Live property contract check.
 *
 * The counterpart to verify-auth-contract: it drives the owner property flow
 * against a running backend and parses every response with the SAME Zod schemas
 * the UI uses, so a contract drift fails here instead of throwing inside a form
 * a landlord is typing into.
 *
 * This is deliberately about the FRONTEND's side of the contract. The backend's
 * own rules (ownership, the verification lifecycle, server-derived trust
 * signals) have their own unit tests and their own live matrix; what is checked
 * here is that the shapes line up:
 *
 *  - the payload `propertyFormSchema` produces is one the API accepts,
 *  - the payload the API returns is one `ownerPropertySchema` accepts,
 *  - `propertyFormValuesFrom()` round-trips a real response back through
 *    `propertyFormSchema` without errors, so the edit form never opens with
 *    complaints about fields nobody touched,
 *  - a real rejection yields a human sentence through `messageFrom()` and lands
 *    on the right input through `fieldErrorsFrom()`,
 *  - the upload-signature endpoint hands the browser a ticket shaped the way
 *    `uploadTicketSchema` expects — or, where no Cloudinary credentials are
 *    configured, a clean 503 the form can explain,
 *  - the sentence a reviewer types into the decision dialog is the sentence the
 *    landlord reads on their own dashboard, unedited, having crossed a role
 *    boundary and two schemas.
 *
 * Transport is plain fetch plus a tiny cookie jar, and the envelope-unwrap and
 * error-flatten steps mirror `src/lib/api/client.ts` exactly — otherwise the
 * schemas would be fed a shape the browser never sees.
 *
 * Run with the backend up:
 *   backend/node_modules/.bin/tsx scripts/verify-property-contract.mts
 *
 * It deletes the listings it creates. It leaves THREE throwaway accounts behind:
 * propcheck+<stamp>a@wale.test (landlord), b (a second landlord, for the
 * ownership checks) and c (a tenant, for the role gates). To remove:
 *   cd backend && npx tsx scripts/clean-test-accounts.ts --delete
 *
 * It also SIGNS IN as an existing admin, which it does not create and does not
 * clean up — see ADMIN_EMAIL below.
 *
 * That script also prints the table counts either side, which is how a run is
 * shown to have left the shared database where it found it.
 */

import {
  amenityTagOptions,
  apiErrorSchema,
  ownerPropertyListResponseSchema,
  ownerPropertySchema,
  propertyDecisionSchema,
  propertyFormSchema,
  propertyFormValuesFrom,
  propertyListResponseSchema,
  propertySortOptions,
  uploadTicketSchema,
  verificationHistoryResponseSchema,
  type PropertyFormValues,
} from "../src/lib/api/schemas";
import { fieldErrorsFrom, messageFrom, statusOf } from "../src/lib/api/field-errors";
import { universities } from "../src/config/site";

const BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000/api/v1";

/**
 * An existing admin, because one cannot be registered.
 *
 * `POST /auth/register` deliberately refuses ADMIN, so unlike the landlord and
 * tenant accounts this one cannot be created on the fly — it has to already
 * exist. The default is the seeded development admin; override both for a
 * database seeded differently. If the sign-in fails the review-queue section is
 * SKIPPED and said to be skipped, rather than counted as a contract failure it
 * is not.
 */
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
  /** Envelope-unwrapped success payload, as call sites see it. */
  data: unknown;
  /** Axios-shaped rejection, so fieldErrorsFrom/messageFrom work as-is. */
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

  async signUp(email: string, role: "LANDLORD" | "TENANT"): Promise<void> {
    const r = await this.call("POST", "/auth/register", {
      firstName: "Prop",
      lastName: "Check",
      email,
      phone: "08031234567",
      password: PASSWORD,
      confirmPassword: PASSWORD,
      role,
    });
    // Not a contract claim, a precondition — but a silent failure here (a STAMP
    // reused from an earlier run, say) would make every later check fail for a
    // reason that has nothing to do with the contract.
    check(
      `signed up ${email} as ${role}`,
      r.status === 201 || r.status === 200,
      `got ${r.status} ${JSON.stringify(r.data).slice(0, 200)}`,
    );
  }
}

/* ------------------------------------------------------------------ main -- */

const stamp = process.env.STAMP ?? "1";
const PASSWORD = "Wale12345";
const emailA = `propcheck+${stamp}a@wale.test`;
const emailB = `propcheck+${stamp}b@wale.test`;

console.log(`\nProperty contract check against ${BASE}`);
console.log(`Throwaway accounts: ${emailA}, ${emailB}\n`);

/**
 * What the form hands over: every value a string, exactly as an `<input>` yields
 * it. Parsing this is the whole point — if the schema's output is not something
 * the API accepts, the form is broken no matter how it looks.
 */
const FORM_INPUT: PropertyFormValues = {
  title: "Contract check flat near the main gate",
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
  // A university ID, not a display name — the same closed vocabulary the search
  // filter sends. Section 9 checks the two lists really do line up.
  university: "unilag",
  availableDate: "2026-10-01",
  amenities: "Borehole, Prepaid meter, Security",
  // What the uploader would have produced: already-uploaded locations, not files.
  // A root-relative path rather than a Cloudinary URL, so the check runs without
  // media credentials — the backend accepts both (see property.schemas.ts).
  images: ["/listings/listing-01.jpg", "/listings/listing-02.jpg"],
  contactName: "Ada Okoye",
  contactPhone: "08031234567",
  contactEmail: "ada@example.com",
};

const owner = new Session();
const stranger = new Session();
let propertyId = "";

// 1. The form's output is a payload the API accepts.
{
  await owner.signUp(emailA, "LANDLORD");

  const form = propertyFormSchema.safeParse(FORM_INPUT);
  check(
    "propertyFormSchema parses the values an <input> produces",
    form.success,
    form.success ? "" : JSON.stringify(form.error.issues).slice(0, 300),
  );
  if (!form.success) process.exit(1);

  check(
    "the schema converts strings to JSON types",
    typeof form.data.price === "number" && Array.isArray(form.data.amenities),
    `price=${typeof form.data.price} amenities=${typeof form.data.amenities}`,
  );

  const r = await owner.call("POST", "/properties", form.data);
  check(
    "POST /properties accepts that payload",
    r.status === 201,
    `got ${r.status} ${JSON.stringify(r.data).slice(0, 300)}`,
  );

  const parsed = ownerPropertySchema.safeParse(r.data);
  check(
    "the created listing parses with ownerPropertySchema",
    parsed.success,
    parsed.success ? "" : JSON.stringify(parsed.error.issues).slice(0, 300),
  );

  if (parsed.success) {
    propertyId = parsed.data.id;
    check("a new listing is a DRAFT", parsed.data.status === "DRAFT", parsed.data.status);
    check("verified is false on a draft", parsed.data.verified === false);
    check(
      "neighborhood survives the round trip to the owner payload",
      parsed.data.neighborhood === "Akoka",
      String(parsed.data.neighborhood),
    );
    check(
      "amenities came back as the array the schema built",
      parsed.data.amenities.join("|") === "Borehole|Prepaid meter|Security",
      JSON.stringify(parsed.data.amenities),
    );
    check(
      "photos came back in the order they were given",
      parsed.data.images.join("|") === FORM_INPUT.images.join("|"),
      JSON.stringify(parsed.data.images),
    );
    check(
      "the published contact is the one we sent, not the login email",
      parsed.data.landlord.name === "Ada Okoye" && parsed.data.landlord.email === "ada@example.com",
      JSON.stringify(parsed.data.landlord),
    );
  }
}

if (!propertyId) {
  console.log("\nNo listing was created; the rest cannot run.");
  process.exit(1);
}

// 2. The edit form can reopen what was saved.
{
  const r = await owner.call("GET", `/properties/mine/${propertyId}`);
  check("GET /properties/mine/:id returns 200 for its owner", r.status === 200, `got ${r.status}`);

  const parsed = ownerPropertySchema.safeParse(r.data);
  check("the detail payload parses with ownerPropertySchema", parsed.success);

  if (parsed.success) {
    // The claim that matters: whatever the API returns must go straight back
    // into the form without a single validation error.
    const values = propertyFormValuesFrom(parsed.data);
    const reparsed = propertyFormSchema.safeParse(values);
    check(
      "propertyFormValuesFrom() round-trips through propertyFormSchema",
      reparsed.success,
      reparsed.success ? "" : JSON.stringify(reparsed.error.issues).slice(0, 400),
    );
    check(
      "the server's normalized phone still passes the form's phone rule",
      propertyFormSchema.shape.contactPhone.safeParse(parsed.data.landlord.phone).success,
      parsed.data.landlord.phone,
    );
    check(
      "availableDate comes back in the format <input type=date> needs",
      /^\d{4}-\d{2}-\d{2}$/.test(parsed.data.availableDate),
      parsed.data.availableDate,
    );
  }
}

// 3. The owner list payload parses, and shows the draft.
{
  const r = await owner.call("GET", "/properties/mine?page=1&pageSize=12");
  check("GET /properties/mine returns 200", r.status === 200, `got ${r.status}`);

  const parsed = ownerPropertyListResponseSchema.safeParse(r.data);
  check(
    "the owner list parses with ownerPropertyListResponseSchema",
    parsed.success,
    parsed.success ? "" : JSON.stringify(parsed.error.issues).slice(0, 300),
  );
  if (parsed.success) {
    check(
      "the draft is in the owner's own list",
      parsed.data.properties.some((p) => p.id === propertyId),
    );
  }

  const filtered = await owner.call("GET", "/properties/mine?status=DRAFT");
  check("the status filter the UI sends is accepted", filtered.status === 200, `got ${filtered.status}`);
  check(
    "the filtered list parses too",
    ownerPropertyListResponseSchema.safeParse(filtered.data).success,
  );
}

// 4. The public catalogue parses with the public schema, and hides the draft.
{
  const r = await owner.call("GET", "/properties?page=1&pageSize=50");
  check("GET /properties returns 200", r.status === 200, `got ${r.status}`);

  const parsed = propertyListResponseSchema.safeParse(r.data);
  check(
    "the public list parses with propertyListResponseSchema",
    parsed.success,
    parsed.success ? "" : JSON.stringify(parsed.error.issues).slice(0, 300),
  );
  if (parsed.success) {
    check(
      "a DRAFT is absent from the public catalogue",
      !parsed.data.properties.some((p) => p.id === propertyId),
    );
    check(
      "no status field leaks into the public payload",
      !parsed.data.properties.some((p) => "status" in p),
    );
  }

  /**
   * And hides it from the direct read too, not just from the list.
   *
   * The public detail page is built on this: it renders one 404 for a listing
   * that never existed and for one that is hidden, so that a stranger with a
   * list of ids cannot tell the two apart. That only holds if the single-listing
   * read refuses a DRAFT — being absent from the catalogue is not the same
   * guarantee, and it is the weaker of the two.
   *
   * Asked as the OWNER, which makes the check sharper: even the person who owns
   * the draft gets a 404 from the public route, because visibility here is the
   * listing's status and not the caller's relationship to it. The owner reads
   * their own draft through `/properties/mine/:id` instead.
   */
  const direct = await owner.call("GET", `/properties/${propertyId}`);
  check(
    "a DRAFT is 404 on the public single-listing read, even for its owner",
    direct.status === 404,
    `got ${direct.status}`,
  );
  check(
    "that 404 says nothing about the listing existing",
    !JSON.stringify(direct.data ?? {}).includes(propertyId),
    JSON.stringify(direct.data ?? {}).slice(0, 200),
  );
}

// 5. A refusal reads as a sentence, not as an axios string.
{
  /**
   * On its own throwaway listing, not on `propertyId`.
   *
   * The photo gate needs a photoless draft, and a successful submit moves a
   * listing out of DRAFT for good — so doing either to the main listing would
   * quietly change what sections 6-8 are looking at.
   */
  const photoless = await owner.call("POST", "/properties", {
    ...propertyFormSchema.parse(FORM_INPUT),
    images: [],
    title: "Draft with no photographs attached to it yet",
  });
  const photolessId = ownerPropertySchema.safeParse(photoless.data).data?.id;
  check("a photoless draft can be created", Boolean(photolessId), `got ${photoless.status}`);

  const r = await owner.call("POST", `/properties/${photolessId}/submit`);
  check(
    "submitting a photoless draft is refused",
    r.status === 422 || r.status === 400,
    `got ${r.status}`,
  );

  const message = messageFrom(r.error);
  check(
    "messageFrom() returns the backend's own sentence",
    message !== "Something went wrong. Please try again." && message.length > 10,
    message,
  );
  check(
    "that sentence mentions the photo, which is what the card's hint promises",
    /photo|image/i.test(message),
    message,
  );
  check("the error body parses with apiErrorSchema", apiErrorSchema.safeParse(r.error?.response.data).success);

  // The other half of the same claim: the gate is about the photos, so adding
  // one clears it. Without this, a backend that refused every submit would pass.
  const withPhoto = await owner.call("PATCH", `/properties/${photolessId}`, {
    images: FORM_INPUT.images.slice(0, 1),
  });
  check("adding a photo to that draft succeeds", withPhoto.status === 200, `got ${withPhoto.status}`);

  const retry = await owner.call("POST", `/properties/${photolessId}/submit`);
  check(
    "the same draft can be submitted once it has a photo",
    retry.status === 200,
    `got ${retry.status} ${messageFrom(retry.error, "").slice(0, 120)}`,
  );
  check(
    "submitting puts it in the review queue",
    ownerPropertySchema.safeParse(retry.data).data?.status === "PENDING_VERIFICATION",
    String(ownerPropertySchema.safeParse(retry.data).data?.status),
  );

  await owner.call("DELETE", `/properties/${photolessId}`);
}

// 6. A field-level rejection lands on the field.
{
  const r = await owner.call("PATCH", `/properties/${propertyId}`, { title: "short" });
  check("a too-short title is rejected", r.status === 422, `got ${r.status}`);

  const fields = fieldErrorsFrom(r.error);
  check(
    "fieldErrorsFrom() names the title field",
    fields.some((f) => f.field === "title"),
    JSON.stringify(fields),
  );
  check(
    "every named field is one the form actually renders",
    fields.every((f) => f.field in FORM_INPUT),
    JSON.stringify(fields.map((f) => f.field)),
  );
}

// 7. Another account gets 404, which is the "we couldn't find that" branch.
{
  await stranger.signUp(emailB, "LANDLORD");

  const detail = await stranger.call("GET", `/properties/mine/${propertyId}`);
  check(
    "a stranger's GET /properties/mine/:id is 404, not 403",
    statusOf(detail.error) === 404,
    `got ${detail.status}`,
  );

  const patch = await stranger.call("PATCH", `/properties/${propertyId}`, { title: "Taken over by someone else entirely" });
  check("a stranger's PATCH is 404", patch.status === 404, `got ${patch.status}`);

  const del = await stranger.call("DELETE", `/properties/${propertyId}`);
  check("a stranger's DELETE is 404", del.status === 404, `got ${del.status}`);
}

// 8. An edit by the owner goes through, and the response says what happened.
{
  const values = { ...FORM_INPUT, price: "1350000", amenities: "Borehole, Prepaid meter" };
  const form = propertyFormSchema.safeParse(values);
  check("the edited form values parse", form.success);
  if (form.success) {
    const r = await owner.call("PATCH", `/properties/${propertyId}`, form.data);
    check("PATCH /properties/:id returns 200 for its owner", r.status === 200, `got ${r.status}`);

    const parsed = ownerPropertySchema.safeParse(r.data);
    check("the updated listing parses with ownerPropertySchema", parsed.success);
    if (parsed.success) {
      check("the new price came back", parsed.data.price === 1_350_000, String(parsed.data.price));
      check(
        "amenities shrank to what was sent",
        parsed.data.amenities.length === 2,
        JSON.stringify(parsed.data.amenities),
      );
      check(
        "a draft stays a draft after an edit",
        parsed.data.status === "DRAFT",
        parsed.data.status,
      );
    }
  }
}

// 9. The vocabularies the UI offers are the ones the API accepts.
//
// Every closed list on the frontend is a duplicate of one on the backend, and a
// duplicate can drift. Drift here does not throw — it returns an empty grid, or
// a 422 on a control the visitor cannot see, which is why it is worth a live
// check rather than a comment saying "keep these in sync".
{
  for (const uni of universities) {
    const r = await owner.call("GET", `/properties?university=${uni.id}&pageSize=50`);
    const parsed = propertyListResponseSchema.safeParse(r.data);
    check(
      `?university=${uni.id} is accepted and parses`,
      r.status === 200 && parsed.success,
      `got ${r.status} ${JSON.stringify(r.data).slice(0, 200)}`,
    );
    if (parsed.success) {
      // Vacuously true for a campus with no listings yet, which is fine — the
      // claim is that the filter is applied, not that the catalogue is full.
      check(
        `every result for ${uni.short} really is tagged ${uni.id}`,
        parsed.data.properties.every((p) => p.university === uni.id),
        JSON.stringify(parsed.data.properties.map((p) => p.university)),
      );
    }
  }

  // The counterpart claim: a display name is refused rather than quietly
  // ignored. Ignoring it would return the whole catalogue and present it as
  // "listings near University of Lagos".
  const byName = await owner.call(
    "GET",
    `/properties?university=${encodeURIComponent("University of Lagos")}`,
  );
  check(
    "a university display name is refused, not silently ignored",
    byName.status === 422,
    `got ${byName.status}`,
  );

  for (const option of amenityTagOptions) {
    const r = await owner.call("GET", `/properties?amenities=${option.value}`);
    check(
      `?amenities=${option.value} ("${option.label}") is a tag the server knows`,
      r.status === 200,
      `got ${r.status} ${JSON.stringify(r.data).slice(0, 200)}`,
    );
  }

  const unknownTag = await owner.call("GET", "/properties?amenities=jacuzzi");
  check(
    "an amenity id the server does not publish is refused",
    unknownTag.status === 422,
    `got ${unknownTag.status}`,
  );

  for (const option of propertySortOptions) {
    const r = await owner.call("GET", `/properties?sort=${option.value}`);
    check(
      `?sort=${option.value} ("${option.label}") is accepted`,
      r.status === 200,
      `got ${r.status} ${JSON.stringify(r.data).slice(0, 200)}`,
    );
  }

  const unknownSort = await owner.call("GET", "/properties?sort=price");
  check(
    "an order the server does not offer is refused",
    unknownSort.status === 422,
    `got ${unknownSort.status}`,
  );
}

// 10. Filters narrow, sorting orders, and paging visits every listing once.
//
// These read the rows that come back rather than counting them, because a
// dropped filter and a working one can return the same count by coincidence but
// cannot both satisfy the rows.
{
  const all = await owner.call("GET", "/properties?pageSize=50");
  const baseline = propertyListResponseSchema.safeParse(all.data);
  check("the unfiltered catalogue parses", baseline.success);

  if (baseline.success) {
    const total = baseline.data.total;

    const twoBeds = await owner.call("GET", "/properties?minBedrooms=2&pageSize=50");
    const beds = propertyListResponseSchema.safeParse(twoBeds.data);
    check("?minBedrooms=2 is accepted and parses", twoBeds.status === 200 && beds.success);
    if (beds.success) {
      // Without something to check, "every result has 2+ bedrooms" is true of an
      // empty list, so the presence of results is part of the claim.
      check(
        "?minBedrooms=2 returned something to check",
        beds.data.properties.length > 0,
        `${beds.data.total} results`,
      );
      check(
        "every result has at least 2 bedrooms — a minimum, not an exact match",
        beds.data.properties.every((p) => p.bedrooms >= 2),
        JSON.stringify(beds.data.properties.map((p) => p.bedrooms)),
      );
    }

    const studios = await owner.call("GET", "/properties?type=studio&pageSize=50");
    const studio = propertyListResponseSchema.safeParse(studios.data);
    check("?type=studio is accepted and parses", studios.status === 200 && studio.success);
    if (studio.success) {
      check(
        "every result is a studio",
        studio.data.properties.length > 0 &&
          studio.data.properties.every((p) => p.type === "studio"),
        JSON.stringify(studio.data.properties.map((p) => p.type)),
      );
    }

    const verified = await owner.call("GET", "/properties?verifiedOnly=true&pageSize=50");
    const vetted = propertyListResponseSchema.safeParse(verified.data);
    check("?verifiedOnly=true is accepted and parses", verified.status === 200 && vetted.success);
    if (vetted.success) {
      check(
        "nothing unverified survives verifiedOnly=true",
        vetted.data.properties.every((p) => p.verified),
        JSON.stringify(vetted.data.properties.map((p) => p.verified)),
      );
      check(
        "verifiedOnly actually narrows the catalogue",
        vetted.data.total <= total,
        `${vetted.data.total} of ${total}`,
      );
    }

    const priced = await owner.call(
      "GET",
      "/properties?minPrice=400000&maxPrice=800000&pageSize=50",
    );
    const band = propertyListResponseSchema.safeParse(priced.data);
    check("a rent band is accepted and parses", priced.status === 200 && band.success);
    if (band.success) {
      check(
        "every result is inside the rent band",
        band.data.properties.length > 0 &&
          band.data.properties.every((p) => p.price >= 400_000 && p.price <= 800_000),
        JSON.stringify(band.data.properties.map((p) => p.price)),
      );
    }

    // Two ticked boxes are two requirements, not two alternatives: asking for
    // more can only ever return less. An OR would show up here as a count that
    // grows.
    const counts: Record<string, number> = {};
    for (const tags of ["water", "security", "water,security"]) {
      const r = await owner.call("GET", `/properties?amenities=${tags}&pageSize=50`);
      const parsed = propertyListResponseSchema.safeParse(r.data);
      counts[tags] = parsed.success ? parsed.data.total : -1;
    }
    check(
      "amenity tags are ANDed, not ORed",
      counts["water,security"] <= counts.water && counts["water,security"] <= counts.security,
      `water=${counts.water} security=${counts.security} both=${counts["water,security"]}`,
    );
    check(
      "the amenity filter narrows rather than being ignored",
      counts.water > 0 && counts.water <= total,
      `water=${counts.water} of ${total}`,
    );

    const cheapest = await owner.call("GET", "/properties?sort=price_asc&pageSize=50");
    const asc = propertyListResponseSchema.safeParse(cheapest.data);
    if (asc.success) {
      const prices = asc.data.properties.map((p) => p.price);
      check(
        "sort=price_asc really is cheapest first",
        prices.every((price, i) => i === 0 || prices[i - 1] <= price),
        JSON.stringify(prices),
      );
    }

    const dearest = await owner.call("GET", "/properties?sort=price_desc&pageSize=50");
    const desc = propertyListResponseSchema.safeParse(dearest.data);
    if (desc.success) {
      const prices = desc.data.properties.map((p) => p.price);
      check(
        "sort=price_desc really is dearest first",
        prices.every((price, i) => i === 0 || prices[i - 1] >= price),
        JSON.stringify(prices),
      );
    }

    const newest = await owner.call("GET", "/properties?pageSize=50");
    const byDate = propertyListResponseSchema.safeParse(newest.data);
    if (byDate.success) {
      const dates = byDate.data.properties.map((p) => Date.parse(p.createdAt));
      check(
        "the default order is newest first",
        dates.every((date, i) => i === 0 || dates[i - 1] >= date),
        JSON.stringify(byDate.data.properties.map((p) => p.createdAt)),
      );
    }

    // Paging is only meaningful if the order is total. Walk every page and the
    // ids collected must be exactly the ids that exist: no listing seen twice,
    // and none skipped past.
    const pageSize = 5;
    const seen: string[] = [];
    let pages = 0;
    for (let page = 1; ; page++) {
      const r = await owner.call(
        "GET",
        `/properties?sort=price_asc&page=${page}&pageSize=${pageSize}`,
      );
      const parsed = propertyListResponseSchema.safeParse(r.data);
      if (!parsed.success) break;
      seen.push(...parsed.data.properties.map((p) => p.id));
      pages = parsed.data.totalPages;
      if (page >= parsed.data.totalPages) break;
    }
    check(
      "walking every page visits each listing exactly once",
      seen.length === total && new Set(seen).size === total,
      `${seen.length} ids, ${new Set(seen).size} distinct, total ${total}`,
    );
    check(
      "totalPages matches the page size",
      pages === Math.max(1, Math.ceil(total / pageSize)),
      `${pages} pages for ${total} listings at ${pageSize} per page`,
    );
  }
}

// 11. The photo upload endpoint, as far as it can be checked without an account.
{
  /**
   * Whether a real Cloudinary upload works cannot be checked here — there are no
   * credentials in this environment, and putting a live account's secret in a
   * checked-in script would be worse than not testing it.
   *
   * What IS checked: who may ask, that the client cannot choose where the file
   * lands, that a secret never appears in the response, and that an unconfigured
   * server says so honestly instead of returning a broken signature. The signing
   * algorithm itself is pinned against Cloudinary's published worked examples in
   * `backend/tests/media.test.ts`.
   */
  const anon = await new Session().call("POST", "/media/upload-signature", {});
  check(
    "POST /media/upload-signature needs a session",
    anon.status === 401,
    `got ${anon.status}`,
  );

  const asTenant = new Session();
  await asTenant.signUp(`propcheck+${stamp}c@wale.test`, "TENANT");
  const tenantTry = await asTenant.call("POST", "/media/upload-signature", {});
  check(
    "a tenant cannot ask for an upload signature",
    tenantTry.status === 403,
    `got ${tenantTry.status}`,
  );

  const chosenFolder = await owner.call("POST", "/media/upload-signature", {
    folder: "wale/properties/somebody-else",
  });
  check(
    "a caller cannot choose the folder its upload lands in",
    chosenFolder.status === 422,
    `got ${chosenFolder.status}`,
  );

  const r = await owner.call("POST", "/media/upload-signature", {});
  const configured = r.status === 200;

  if (configured) {
    // Parsed with the schema the uploader itself uses, so a renamed or dropped
    // key fails here rather than inside a landlord's photo picker.
    const parsed = uploadTicketSchema.safeParse(r.data);
    check(
      "the ticket parses as uploadTicketSchema",
      parsed.success,
      parsed.success ? "" : JSON.stringify(parsed.error.issues.slice(0, 3)),
    );

    if (parsed.success) {
      const ticket = parsed.data;
      check(
        "the ticket carries a signature and an api_key",
        Boolean(ticket.fields.signature && ticket.fields.api_key),
        JSON.stringify(Object.keys(ticket.fields)),
      );
      check(
        "the upload is scoped to the caller's own folder",
        ticket.publicId.startsWith("wale/properties/") && !ticket.publicId.includes(".."),
        ticket.publicId,
      );
      check(
        "the signature has not already expired",
        Date.parse(ticket.expiresAt) > Date.now(),
        ticket.expiresAt,
      );
    }

    check(
      "the response contains no api_secret field",
      !JSON.stringify(r.data).includes("api_secret"),
    );
  } else {
    check(
      "an unconfigured server answers 503 and says photos can be added later",
      r.status === 503 && /add photos later/i.test(messageFrom(r.error, "")),
      `got ${r.status} ${messageFrom(r.error, "").slice(0, 120)}`,
    );
    console.log("        (no Cloudinary credentials here — the live upload is untested)");
  }
}

// 12. The review queue, and a decision a landlord can read.
//
// The one claim worth checking live rather than in a unit test: the sentence a
// reviewer types into the dialog is the sentence the landlord sees on their own
// dashboard, unedited, having crossed a role boundary and two schemas.
{
  const admin = new Session();
  const login = await admin.call("POST", "/auth/login", {
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
  });

  if (login.status !== 200) {
    skipped++;
    console.log(
      `  SKIP  the review queue — could not sign in as ${ADMIN_EMAIL} (got ${login.status}).`,
    );
    console.log("        Seed the shared database, or pass ADMIN_EMAIL / ADMIN_PASSWORD.");
  } else {
    check("the admin account signs in", true);

    // The role gate, before anything is decided with it.
    const anon = await new Session().call("GET", "/properties/review-queue");
    check("GET /properties/review-queue needs a session", anon.status === 401, `got ${anon.status}`);

    const asLandlord = await owner.call("GET", "/properties/review-queue");
    check("a landlord cannot read the review queue", asLandlord.status === 403, `got ${asLandlord.status}`);

    // Put our own listing in the queue. It is a DRAFT with two photos at this
    // point (section 8 edited it), so it is submittable.
    const submitted = await owner.call("POST", `/properties/${propertyId}/submit`);
    check(
      "the owner can submit the listing for review",
      submitted.status === 200 &&
        ownerPropertySchema.safeParse(submitted.data).data?.status === "PENDING_VERIFICATION",
      `got ${submitted.status} ${messageFrom(submitted.error, "").slice(0, 120)}`,
    );

    const queue = await admin.call("GET", "/properties/review-queue?page=1&pageSize=50");
    const parsedQueue = ownerPropertyListResponseSchema.safeParse(queue.data);
    check("GET /properties/review-queue returns 200 for an admin", queue.status === 200, `got ${queue.status}`);
    check(
      "the queue parses with ownerPropertyListResponseSchema",
      parsedQueue.success,
      parsedQueue.success ? "" : JSON.stringify(parsedQueue.error.issues).slice(0, 300),
    );
    if (parsedQueue.success) {
      check(
        "the submitted listing is in the queue",
        parsedQueue.data.properties.some((p) => p.id === propertyId),
        `${parsedQueue.data.total} waiting`,
      );
      check(
        "everything in the default queue is awaiting a decision",
        parsedQueue.data.properties.every((p) => p.status === "PENDING_VERIFICATION"),
        JSON.stringify([...new Set(parsedQueue.data.properties.map((p) => p.status))]),
      );
    }

    // A rejection with nothing written in it is refused, and the complaint lands
    // on the textarea rather than arriving as a banner with no field attached.
    const bare = await admin.call("PATCH", `/properties/${propertyId}/status`, {
      status: "REJECTED",
    });
    check("a rejection with no reason is refused", bare.status === 422, `got ${bare.status}`);
    check(
      "fieldErrorsFrom() puts that complaint on the reason field",
      fieldErrorsFrom(bare.error).some((f) => f.field === "reason"),
      JSON.stringify(fieldErrorsFrom(bare.error)),
    );

    // The frontend's copy of the same rule. The server is what enforces it; this
    // is only the claim that the dialog refuses first, so a reviewer learns
    // before submitting rather than after.
    check(
      "propertyDecisionSchema refuses the same body client-side",
      !propertyDecisionSchema.safeParse({ status: "REJECTED" }).success,
    );
    check(
      "propertyDecisionSchema accepts an approval with no reason",
      propertyDecisionSchema.safeParse({ status: "VERIFIED" }).success,
    );

    const REASON =
      "The second photograph is of a different building. Replace it with the actual flat and resubmit.";
    const decision = propertyDecisionSchema.safeParse({ status: "REJECTED", reason: REASON });
    check("the dialog's own payload parses", decision.success);

    const rejected = await admin.call(
      "PATCH",
      `/properties/${propertyId}/status`,
      decision.success ? decision.data : {},
    );
    check("PATCH /properties/:id/status returns 200 for an admin", rejected.status === 200, `got ${rejected.status}`);

    const parsedRejected = ownerPropertySchema.safeParse(rejected.data);
    check(
      "the decided listing parses with ownerPropertySchema",
      parsedRejected.success,
      parsedRejected.success ? "" : JSON.stringify(parsedRejected.error.issues).slice(0, 300),
    );
    if (parsedRejected.success) {
      check("it is now REJECTED", parsedRejected.data.status === "REJECTED", parsedRejected.data.status);
      check(
        "the reason comes back word for word",
        parsedRejected.data.statusReason === REASON,
        String(parsedRejected.data.statusReason),
      );
      check(
        "statusChangedAt is a date the card can format",
        Boolean(parsedRejected.data.statusChangedAt) &&
          !Number.isNaN(Date.parse(parsedRejected.data.statusChangedAt ?? "")),
        String(parsedRejected.data.statusChangedAt),
      );
    }

    // The point of the whole feature: the landlord reads it on their own page.
    const asOwner = await owner.call("GET", `/properties/mine/${propertyId}`);
    const ownerView = ownerPropertySchema.safeParse(asOwner.data);
    check(
      "the landlord sees that exact sentence on their own dashboard",
      ownerView.success && ownerView.data.statusReason === REASON,
      ownerView.success ? String(ownerView.data.statusReason) : `got ${asOwner.status}`,
    );

    // The same decision twice is a conflict, which is why the card hides the
    // button for the state a listing is already in.
    const again = await admin.call("PATCH", `/properties/${propertyId}/status`, {
      status: "REJECTED",
      reason: REASON,
    });
    check("deciding the same status twice is a conflict", again.status === 409, `got ${again.status}`);

    // A landlord cannot decide their own listing, with or without the queue.
    const selfApprove = await owner.call("PATCH", `/properties/${propertyId}/status`, {
      status: "VERIFIED",
    });
    check("a landlord cannot approve their own listing", selfApprove.status === 403, `got ${selfApprove.status}`);

    /* ------------------------------------------------------------- history -- */

    const history = await admin.call("GET", `/properties/${propertyId}/history`);
    const parsedHistory = verificationHistoryResponseSchema.safeParse(history.data);
    check("GET /properties/:id/history returns 200 for an admin", history.status === 200, `got ${history.status}`);
    check(
      "the history parses with verificationHistoryResponseSchema",
      parsedHistory.success,
      parsedHistory.success ? "" : JSON.stringify(parsedHistory.error.issues).slice(0, 300),
    );

    if (parsedHistory.success) {
      const rows = parsedHistory.data.history;
      check("both transitions were recorded", rows.length >= 2, `${rows.length} rows`);

      const dates = rows.map((row) => Date.parse(row.createdAt));
      check(
        "the history is newest first",
        dates.every((date, i) => i === 0 || dates[i - 1] >= date),
        JSON.stringify(rows.map((r) => r.createdAt)),
      );
      check(
        "the newest row is the rejection, with the reason attached",
        rows[0]?.toStatus === "REJECTED" && rows[0]?.reason === REASON,
        JSON.stringify(rows[0]),
      );
      check(
        "the reviewer is named on their own decision",
        Boolean(rows[0]?.actor?.name),
        JSON.stringify(rows[0]?.actor),
      );
      check(
        "the owner's submission was recorded too, with no invented reason",
        rows.some((row) => row.toStatus === "PENDING_VERIFICATION" && row.reason === null),
        JSON.stringify(rows.map((r) => [r.toStatus, r.reason])),
      );
      // The reviewer's identity is a name, not a mailbox. This screen is shown to
      // the landlord who is being told no.
      check(
        "no email address appears anywhere in the history payload",
        !/@/.test(JSON.stringify(rows.map((r) => r.actor))),
        JSON.stringify(rows.map((r) => r.actor)),
      );
    }

    const ownHistory = await owner.call("GET", `/properties/${propertyId}/history`);
    check(
      "the owner can read the history of their own listing",
      ownHistory.status === 200 &&
        verificationHistoryResponseSchema.safeParse(ownHistory.data).success,
      `got ${ownHistory.status}`,
    );

    const nosy = await stranger.call("GET", `/properties/${propertyId}/history`);
    check(
      "a stranger's history request is 404, not 403",
      nosy.status === 404,
      `got ${nosy.status}`,
    );

    /* ------------------------------------------- the loop closes: approval -- */

    const resubmit = await owner.call("POST", `/properties/${propertyId}/submit`);
    check(
      "a rejected listing can be fixed and resubmitted",
      resubmit.status === 200,
      `got ${resubmit.status} ${messageFrom(resubmit.error, "").slice(0, 120)}`,
    );

    const approved = await admin.call("PATCH", `/properties/${propertyId}/status`, {
      status: "VERIFIED",
    });
    const parsedApproved = ownerPropertySchema.safeParse(approved.data);
    check("an approval needs no reason", approved.status === 200, `got ${approved.status}`);
    if (parsedApproved.success) {
      check("it is VERIFIED", parsedApproved.data.status === "VERIFIED", parsedApproved.data.status);
      check("verified is now true", parsedApproved.data.verified === true);
      check(
        "the stale rejection reason is gone",
        parsedApproved.data.statusReason === null || parsedApproved.data.statusReason === undefined,
        String(parsedApproved.data.statusReason),
      );
    }

    // What a visitor sees, which is the only reason any of this happened.
    const publicList = await owner.call("GET", "/properties?verifiedOnly=true&pageSize=50");
    const publicParsed = propertyListResponseSchema.safeParse(publicList.data);
    check(
      "the approved listing is now in the verified catalogue",
      publicParsed.success && publicParsed.data.properties.some((p) => p.id === propertyId),
    );

    // Editing a verified listing sends it back for review, and the audit trail
    // says why — otherwise a reviewer cannot tell it from a fresh submission.
    const edited = await owner.call("PATCH", `/properties/${propertyId}`, {
      price: 1_400_000,
    });
    const parsedEdited = ownerPropertySchema.safeParse(edited.data);
    check(
      "editing a verified listing sends it back to the queue",
      parsedEdited.success && parsedEdited.data.status === "PENDING_VERIFICATION",
      parsedEdited.success ? parsedEdited.data.status : `got ${edited.status}`,
    );

    const afterEdit = await admin.call("GET", `/properties/${propertyId}/history`);
    const editHistory = verificationHistoryResponseSchema.safeParse(afterEdit.data);
    check(
      "the demotion is recorded with a reason a reviewer can act on",
      editHistory.success &&
        editHistory.data.history[0]?.fromStatus === "VERIFIED" &&
        /edited/i.test(editHistory.data.history[0]?.reason ?? ""),
      editHistory.success ? JSON.stringify(editHistory.data.history[0]) : "history did not parse",
    );
  }
}

// 13. Clean up after ourselves.
{
  const r = await owner.call("DELETE", `/properties/${propertyId}`);
  check("DELETE /properties/:id removes the listing", r.status === 200 || r.status === 204, `got ${r.status}`);

  const after = await owner.call("GET", `/properties/mine/${propertyId}`);
  check("it is gone afterwards", after.status === 404, `got ${after.status}`);
}

console.log(`\n${passed} passed, ${failed} failed${skipped ? `, ${skipped} skipped` : ""}`);
console.log(`Left behind: ${emailA}, ${emailB}, propcheck+${stamp}c@wale.test`);
console.log(`Clean up with: cd backend && npx tsx scripts/clean-test-accounts.ts --delete`);
process.exit(failed === 0 ? 0 : 1);
