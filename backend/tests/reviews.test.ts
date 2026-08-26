import { Prisma } from "@prisma/client";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { createApp } from "../src/app";
import { API, getCsrf } from "./helpers";
import { prismaMock } from "./setup";
import { makeReview, makeReviewReport, makeSession, makeUser } from "./factories";

/**
 * Lived-experience reviews: whose experience counts, and what the platform is
 * willing to call a rating.
 *
 * The claims under test are the trust rules. Each is separable enough that a change
 * could satisfy some and quietly break the rest — which is the whole risk with a
 * review system, because a broken one still looks like a working one:
 *
 *  1. NO RATING IS EVER INVENTED. With no verified reviews the averages are `null`,
 *     not `0` — a zero would render as one star out of five about somebody's home.
 *  2. AN UNVERIFIED REVIEW IS NEVER COUNTED into the verified average, and is
 *     labelled `verified: false` everywhere it appears.
 *  3. A REVIEW REQUIRES A RESIDENCE CLAIM belonging to the caller AND naming the
 *     property in the path. All three must agree; any mismatch is one 404.
 *  4. `propertyId` COMES FROM THE CLAIM, never from the request, so a review cannot
 *     be filed against a flat the author never claimed.
 *  5. A REJECTED CLAIM CANNOT BE REVIEWED. The owner has said they did not live
 *     there; letting them review anyway would make rejection decorative.
 *  6. ONE REVIEW PER TENANCY, and a second attempt is a sentence rather than a
 *     constraint name.
 *  7. REPORTING DOES NOT HIDE. The report write touches no field of the review —
 *     otherwise a landlord could bury every bad review they received.
 *  8. AN ADMIN MOVES `status` AND NOTHING ELSE. No admin route can rewrite a word
 *     of what somebody wrote.
 *  9. AN AUTHOR IS NOT PUBLICLY NAMED IN FULL, and their account id is never in a
 *     public payload — a review says where somebody lived, and a stable id would let
 *     anybody reassemble one person's address history.
 *
 * Email is mocked: what is under test is that the right message is ASKED for, and
 * that a send failure cannot undo something already published.
 */

vi.mock("../src/lib/email", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../src/lib/email")>();
  return {
    ...actual,
    sendReviewPostedEmail: vi.fn().mockResolvedValue(undefined),
  };
});

import { sendReviewPostedEmail } from "../src/lib/email";

const app = createApp();
const SESSION_COOKIE = "wale_session";

function signedInAs(user: ReturnType<typeof makeUser>) {
  const session = makeSession({ userId: user.id });
  prismaMock.session.findUnique.mockResolvedValue({ ...session, user } as never);
  prismaMock.session.update.mockResolvedValue(session as never);
  return [`${SESSION_COOKIE}=valid-raw-token`];
}

const mover = () =>
  makeUser({
    id: "usr_mover",
    email: "ada@wale.test",
    role: "MOVER",
    roles: [{ role: "MOVER" }],
    phone: "+2348012345678",
  });

const tenant = () =>
  makeUser({ id: "usr_tenant", role: "TENANT", roles: [{ role: "TENANT" }] });

const landlord = () =>
  makeUser({
    id: "usr_landlord",
    email: "landlord@wale.test",
    role: "LANDLORD",
    roles: [{ role: "LANDLORD" }],
  });

const admin = () => makeUser({ id: "usr_admin", role: "ADMIN", roles: [{ role: "ADMIN" }] });

/** A review body comfortably over the floor, written like a real one. */
const BODY =
  "Water ran every day of the two years. Power is the problem — plan for at least four hours off most evenings.";

const RATINGS = { overall: 4, water: 5, power: 2, security: 4, landlord: 3 };

const NEW_REVIEW = { residenceId: "res_test_1", ...RATINGS, body: BODY };

/** What the service's narrow `select` returns for the claim behind a new review. */
function claimBehindReview(overrides: Record<string, unknown> = {}) {
  return {
    id: "res_test_1",
    propertyId: "prop_test_1",
    status: "CONFIRMED",
    property: {
      title: "Sunny Studio near UNILAG",
      owner: { email: "landlord@wale.test" },
    },
    ...overrides,
  };
}

async function send(
  method: "post" | "patch",
  path: string,
  body: object | undefined,
  cookies: string[],
) {
  const { token, cookie } = await getCsrf(app);
  const req = request(app)
    [method](`${API}${path}`)
    .set("Cookie", [...cookie, ...cookies])
    .set("X-CSRF-Token", token);
  return body ? req.send(body) : req.send();
}

/** An `aggregate` result for `n` verified reviews with the given averages. */
function aggregateOf(n: number, avg: Partial<typeof RATINGS> = {}) {
  return {
    _count: { _all: n },
    _avg: {
      overall: avg.overall ?? null,
      water: avg.water ?? null,
      power: avg.power ?? null,
      security: avg.security ?? null,
      landlord: avg.landlord ?? null,
    },
  };
}

beforeEach(() => {
  vi.mocked(sendReviewPostedEmail).mockClear().mockResolvedValue(undefined);
});

/* --------------------------------------------------------------- writing -- */

describe("POST /properties/:id/reviews — a former resident writes one", () => {
  it("files the review against the claim's property, not against anything sent", async () => {
    prismaMock.residenceHistory.findFirst.mockResolvedValue(claimBehindReview() as never);
    prismaMock.propertyReview.create.mockResolvedValue(makeReview() as never);

    const res = await send(
      "post",
      "/properties/prop_test_1/reviews",
      // Every one of these must be ignored: the property comes from the claim, the
      // author from the session, and the status from the column default.
      {
        ...NEW_REVIEW,
        propertyId: "prop_somewhere_else",
        authorId: "usr_someone_else",
        status: "HIDDEN",
      },
      signedInAs(mover()),
    );

    expect(res.status).toBe(201);
    const data = prismaMock.propertyReview.create.mock.calls[0]?.[0]?.data as
      | Record<string, unknown>
      | undefined;
    expect(data?.propertyId).toBe("prop_test_1");
    expect(data?.authorId).toBe("usr_mover");
    expect(data?.residenceId).toBe("res_test_1");
    // Absent, not merely "not HIDDEN". The default publishes it, so there is no
    // line here that could be edited into letting a client set visibility.
    expect(data).not.toHaveProperty("status");
  });

  it("requires the claim to be the caller's own and to name this property", async () => {
    prismaMock.residenceHistory.findFirst.mockResolvedValue(claimBehindReview() as never);
    prismaMock.propertyReview.create.mockResolvedValue(makeReview() as never);

    await send("post", "/properties/prop_test_1/reviews", NEW_REVIEW, signedInAs(mover()));

    // All three in one WHERE clause. A claim that is real but somebody else's, and
    // one that is theirs but for another flat, are the same 404 as a missing id.
    expect(prismaMock.residenceHistory.findFirst.mock.calls[0]?.[0]?.where).toEqual({
      id: "res_test_1",
      userId: "usr_mover",
      propertyId: "prop_test_1",
    });
  });

  it("404s when the claim is not the caller's, and never reaches the create", async () => {
    prismaMock.residenceHistory.findFirst.mockResolvedValue(null as never);

    const res = await send(
      "post",
      "/properties/prop_test_1/reviews",
      NEW_REVIEW,
      signedInAs(mover()),
    );

    expect(res.status).toBe(404);
    expect(prismaMock.propertyReview.create).not.toHaveBeenCalled();
  });

  it("refuses a review from a claim the owner rejected", async () => {
    prismaMock.residenceHistory.findFirst.mockResolvedValue(
      claimBehindReview({ status: "REJECTED" }) as never,
    );

    const res = await send(
      "post",
      "/properties/prop_test_1/reviews",
      NEW_REVIEW,
      signedInAs(mover()),
    );

    expect(res.status).toBe(409);
    expect(res.body.error.message).toMatch(/did not accept your residence claim/i);
    expect(prismaMock.propertyReview.create).not.toHaveBeenCalled();
  });

  it("allows a review from an unconfirmed claim, and labels it unverified", async () => {
    prismaMock.residenceHistory.findFirst.mockResolvedValue(
      claimBehindReview({ status: "UNVERIFIED" }) as never,
    );
    prismaMock.propertyReview.create.mockResolvedValue(
      makeReview({
        residence: {
          status: "UNVERIFIED",
          movedInAt: new Date("2024-09-01T00:00:00.000Z"),
          movedOutAt: new Date("2025-08-31T00:00:00.000Z"),
        },
      }) as never,
    );

    const res = await send(
      "post",
      "/properties/prop_test_1/reviews",
      NEW_REVIEW,
      signedInAs(mover()),
    );

    // Published, because the person who confirms a claim is the person being
    // reviewed — silencing the unconfirmed would hand them a mute button.
    expect(res.status).toBe(201);
    expect(res.body.data.verified).toBe(false);
    expect(res.body.data.status).toBe("PUBLISHED");
  });

  it("turns a second review of the same tenancy into a sentence, not a constraint name", async () => {
    prismaMock.residenceHistory.findFirst.mockResolvedValue(claimBehindReview() as never);
    prismaMock.propertyReview.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
        code: "P2002",
        clientVersion: "6.19.3",
      }) as never,
    );

    const res = await send(
      "post",
      "/properties/prop_test_1/reviews",
      NEW_REVIEW,
      signedInAs(mover()),
    );

    expect(res.status).toBe(409);
    expect(res.body.error.message).toMatch(/already reviewed that tenancy/i);
    expect(res.body.error.message).not.toMatch(/constraint|P2002|residenceId/);
  });

  it("tells the owner, without quoting the review or naming its author", async () => {
    prismaMock.residenceHistory.findFirst.mockResolvedValue(claimBehindReview() as never);
    prismaMock.propertyReview.create.mockResolvedValue(makeReview() as never);

    await send("post", "/properties/prop_test_1/reviews", NEW_REVIEW, signedInAs(mover()));

    expect(sendReviewPostedEmail).toHaveBeenCalledTimes(1);
    const args = JSON.stringify(vi.mocked(sendReviewPostedEmail).mock.calls[0]?.[0]);
    // The email exists so the landlord knows to look — reporting a fake review is
    // the safeguard, and one nobody hears about is not a safeguard. What it must
    // NOT carry is identity or the accusation itself, out of the context of the
    // page where the reply and report controls live.
    expect(args).toMatch(/landlord@wale\.test/);
    expect(args).not.toMatch(/Ada|Student|ada@wale\.test|2348012345678/);
    expect(args).not.toMatch(/Water ran every day/);
  });

  it("publishes the review even when the email fails", async () => {
    prismaMock.residenceHistory.findFirst.mockResolvedValue(claimBehindReview() as never);
    prismaMock.propertyReview.create.mockResolvedValue(makeReview() as never);
    vi.mocked(sendReviewPostedEmail).mockRejectedValue(new Error("smtp down"));

    const res = await send(
      "post",
      "/properties/prop_test_1/reviews",
      NEW_REVIEW,
      signedInAs(mover()),
    );

    expect(res.status).toBe(201);
  });

  it("accepts a review of an ownerless listing, with nobody to email", async () => {
    prismaMock.residenceHistory.findFirst.mockResolvedValue(
      claimBehindReview({
        property: { title: "Sunny Studio near UNILAG", owner: null },
      }) as never,
    );
    prismaMock.propertyReview.create.mockResolvedValue(makeReview() as never);

    const res = await send(
      "post",
      "/properties/prop_test_1/reviews",
      NEW_REVIEW,
      signedInAs(mover()),
    );

    // Seeded listings have no account behind them. The review is still worth
    // having; there is simply nobody to notify.
    expect(res.status).toBe(201);
    expect(sendReviewPostedEmail).not.toHaveBeenCalled();
  });

  it("lets a tenant review, and refuses a landlord before any query runs", async () => {
    prismaMock.residenceHistory.findFirst.mockResolvedValue(
      claimBehindReview({ id: "res_test_1" }) as never,
    );
    prismaMock.propertyReview.create.mockResolvedValue(makeReview() as never);

    const asTenant = await send(
      "post",
      "/properties/prop_test_1/reviews",
      NEW_REVIEW,
      signedInAs(tenant()),
    );
    expect(asTenant.status).toBe(201);

    prismaMock.residenceHistory.findFirst.mockClear();
    const asLandlord = await send(
      "post",
      "/properties/prop_test_1/reviews",
      NEW_REVIEW,
      signedInAs(landlord()),
    );

    expect(asLandlord.status).toBe(403);
    // A landlord who also rents holds the TENANT role. The gate is the role, and it
    // is checked before anything touches the database.
    expect(prismaMock.residenceHistory.findFirst).not.toHaveBeenCalled();
  });

  it("needs a session", async () => {
    // Through `send`, so the CSRF token is present and 401 is the only thing left
    // for the request to fail on. Without the token the guard answers first, which
    // is the next test.
    const res = await send("post", "/properties/prop_test_1/reviews", NEW_REVIEW, []);
    expect(res.status).toBe(401);
  });

  it("refuses without the CSRF header", async () => {
    const res = await request(app)
      .post(`${API}/properties/prop_test_1/reviews`)
      .set("Cookie", signedInAs(mover()))
      .send(NEW_REVIEW);

    expect(res.status).toBe(403);
  });
});

/* ------------------------------------------------------- rating validation -- */

describe("review validation — what a rating is allowed to be", () => {
  const cases: [string, object, string][] = [
    ["a rating of 0", { ...NEW_REVIEW, water: 0 }, "water"],
    ["a rating of 6", { ...NEW_REVIEW, security: 6 }, "security"],
    ["a fractional rating", { ...NEW_REVIEW, overall: 4.5 }, "overall"],
    ["a rating that is not a number", { ...NEW_REVIEW, power: "quite bad" }, "power"],
    ["a missing rating", { residenceId: "res_test_1", overall: 4, body: BODY }, "water"],
    ["a body of two words", { ...NEW_REVIEW, body: "It was fine" }, "body"],
    ["no residence at all", { ...RATINGS, body: BODY }, "residenceId"],
  ];

  for (const [name, body, field] of cases) {
    it(`rejects ${name}, naming the field`, async () => {
      const res = await send(
        "post",
        "/properties/prop_test_1/reviews",
        body,
        signedInAs(mover()),
      );

      // 422, not 400: the request was well-formed and its contents were wrong.
      expect(res.status).toBe(422);
      expect(res.body.error.details.some((d: { field?: string }) => d.field === field)).toBe(
        true,
      );
      expect(prismaMock.propertyReview.create).not.toHaveBeenCalled();
    });
  }

  it("keeps a rating out of range away from the database entirely", async () => {
    await send(
      "post",
      "/properties/prop_test_1/reviews",
      { ...NEW_REVIEW, overall: 99 },
      signedInAs(mover()),
    );

    // The CHECK constraint in the migration is the backstop. This is the layer
    // that means the backstop is never the thing a user meets.
    expect(prismaMock.residenceHistory.findFirst).not.toHaveBeenCalled();
  });
});

/* --------------------------------------------------------------- editing -- */

describe("PATCH /reviews/:id — the author revises", () => {
  it("scopes the lookup to the author, with no admin widening", async () => {
    prismaMock.propertyReview.findFirst.mockResolvedValue({
      id: "rev_test_1",
      status: "PUBLISHED",
    } as never);
    prismaMock.propertyReview.update.mockResolvedValue(makeReview() as never);

    const res = await send("patch", "/reviews/rev_test_1", { power: 1 }, signedInAs(mover()));

    expect(res.status).toBe(200);
    expect(prismaMock.propertyReview.findFirst.mock.calls[0]?.[0]?.where).toEqual({
      id: "rev_test_1",
      authorId: "usr_mover",
    });
  });

  it("refuses an admin editing somebody's words", async () => {
    prismaMock.propertyReview.findFirst.mockResolvedValue(null as never);

    const res = await send(
      "patch",
      "/reviews/rev_test_1",
      { body: BODY },
      signedInAs(admin()),
    );

    // An admin's power over a review is `status`, and only `status`. The WHERE
    // clause is `authorId`, so an admin editing another account's review finds
    // nothing — exactly as a stranger would.
    expect(res.status).toBe(404);
    expect(prismaMock.propertyReview.findFirst.mock.calls[0]?.[0]?.where).toEqual({
      id: "rev_test_1",
      authorId: "usr_admin",
    });
    expect(prismaMock.propertyReview.update).not.toHaveBeenCalled();
  });

  it("changes only the fields sent, and cannot move the review to another tenancy", async () => {
    prismaMock.propertyReview.findFirst.mockResolvedValue({
      id: "rev_test_1",
      status: "PUBLISHED",
    } as never);
    prismaMock.propertyReview.update.mockResolvedValue(makeReview() as never);

    await send(
      "patch",
      "/reviews/rev_test_1",
      { power: 1, residenceId: "res_other", propertyId: "prop_other", status: "PUBLISHED" },
      signedInAs(mover()),
    );

    const data = prismaMock.propertyReview.update.mock.calls[0]?.[0]?.data as Record<
      string,
      unknown
    >;
    expect(data).toEqual({ power: 1 });
    // Moving a review between tenancies would silently change which property it
    // counts towards, so the schema has no field for it and nothing strips one.
    expect(data).not.toHaveProperty("residenceId");
    expect(data).not.toHaveProperty("propertyId");
    expect(data).not.toHaveProperty("status");
  });

  it("refuses to edit a review an admin has taken down", async () => {
    prismaMock.propertyReview.findFirst.mockResolvedValue({
      id: "rev_test_1",
      status: "HIDDEN",
    } as never);

    const res = await send("patch", "/reviews/rev_test_1", { power: 5 }, signedInAs(mover()));

    expect(res.status).toBe(409);
    expect(res.body.error.message).toMatch(/taken down by an admin/i);
    expect(prismaMock.propertyReview.update).not.toHaveBeenCalled();
  });

  it("rejects an empty patch", async () => {
    const res = await send("patch", "/reviews/rev_test_1", {}, signedInAs(mover()));

    expect(res.status).toBe(422);
    expect(prismaMock.propertyReview.findFirst).not.toHaveBeenCalled();
  });
});

/* ------------------------------------------------------------ public reads -- */

describe("GET /properties/:id/reviews — what a stranger sees", () => {
  beforeEach(() => {
    prismaMock.property.findFirst.mockResolvedValue({ id: "prop_test_1" } as never);
    prismaMock.propertyReview.count.mockResolvedValue(1 as never);
  });

  it("reads without a session", async () => {
    prismaMock.propertyReview.findMany.mockResolvedValue([makeReview()] as never);

    const res = await request(app).get(`${API}/properties/prop_test_1/reviews`);

    expect(res.status).toBe(200);
    expect(res.body.data.reviews).toHaveLength(1);
    expect(res.body.data.reviews[0].mine).toBe(false);
  });

  it("names the author by initial only, and never gives out an account id", async () => {
    prismaMock.propertyReview.findMany.mockResolvedValue([makeReview()] as never);

    const res = await request(app).get(`${API}/properties/prop_test_1/reviews`);

    const review = res.body.data.reviews[0];
    expect(review.author).toEqual({ name: "Ada S." });
    // A review says where somebody lived. A full name beside that publishes an
    // address history; a stable id lets anybody reassemble one across listings.
    const serialized = JSON.stringify(res.body);
    expect(serialized).not.toMatch(/Student/);
    expect(serialized).not.toMatch(/usr_mover/);
    expect(serialized).not.toMatch(/ada@wale\.test|2348012345678/);
  });

  it("gives the tenancy to the month, not to the day", async () => {
    prismaMock.propertyReview.findMany.mockResolvedValue([makeReview()] as never);

    const res = await request(app).get(`${API}/properties/prop_test_1/reviews`);

    const review = res.body.data.reviews[0];
    expect(review.residedFrom).toBe("2024-09");
    expect(review.residedTo).toBe("2025-08");
    // The day of the month tells a reader nothing about how recent the experience
    // is, and a great deal about who wrote it.
    expect(JSON.stringify(review)).not.toMatch(/2024-09-01/);
  });

  it("marks the reader's own review as theirs", async () => {
    prismaMock.propertyReview.findMany.mockResolvedValue([makeReview()] as never);

    const res = await request(app)
      .get(`${API}/properties/prop_test_1/reviews`)
      .set("Cookie", signedInAs(mover()));

    expect(res.body.data.reviews[0].mine).toBe(true);
  });

  it("shows only published reviews", async () => {
    prismaMock.propertyReview.findMany.mockResolvedValue([] as never);

    await request(app).get(`${API}/properties/prop_test_1/reviews`);

    const where = prismaMock.propertyReview.findMany.mock.calls[0]?.[0]?.where as Record<
      string,
      unknown
    >;
    expect(where.status).toBe("PUBLISHED");
    // Hidden and removed reviews are gone from every public read. This is the one
    // place the moderation status does any work.
    expect(where.propertyId).toBe("prop_test_1");
  });

  it("includes unverified reviews by default, and can narrow on request", async () => {
    prismaMock.propertyReview.findMany.mockResolvedValue([] as never);

    await request(app).get(`${API}/properties/prop_test_1/reviews`);
    const openWhere = prismaMock.propertyReview.findMany.mock.calls[0]?.[0]?.where as Record<
      string,
      unknown
    >;
    // No residence filter: hiding the unconfirmed by default would delete the
    // experience of everyone whose landlord never clicked confirm — and that
    // landlord is the person being reviewed.
    expect(openWhere).not.toHaveProperty("residence");

    prismaMock.propertyReview.findMany.mockClear();
    await request(app).get(`${API}/properties/prop_test_1/reviews?verifiedOnly=true`);
    const narrowWhere = prismaMock.propertyReview.findMany.mock.calls[0]?.[0]?.where as Record<
      string,
      unknown
    >;
    expect(narrowWhere.residence).toEqual({ status: "CONFIRMED" });
  });

  it("404s for a listing that is not public, without reading any review", async () => {
    prismaMock.property.findFirst.mockResolvedValue(null as never);

    const res = await request(app).get(`${API}/properties/prop_draft/reviews`);

    // The reviews are shown ON the listing page. If that page is a 404, its review
    // list has to be one too.
    expect(res.status).toBe(404);
    expect(prismaMock.propertyReview.findMany).not.toHaveBeenCalled();
  });

  it("marks a revised review as edited, and a fresh one as not", async () => {
    prismaMock.propertyReview.findMany.mockResolvedValue([
      makeReview({ id: "rev_fresh" }),
      makeReview({
        id: "rev_edited",
        updatedAt: new Date("2026-03-01T00:00:00.000Z"),
      }),
    ] as never);

    const res = await request(app).get(`${API}/properties/prop_test_1/reviews`);

    expect(res.body.data.reviews[0].edited).toBe(false);
    expect(res.body.data.reviews[1].edited).toBe(true);
  });
});

/* -------------------------------------------------------- experience summary -- */

describe("GET /properties/:id/experience-summary — the only number called a rating", () => {
  beforeEach(() => {
    prismaMock.property.findFirst.mockResolvedValue({ id: "prop_test_1" } as never);
  });

  it("returns null averages when nobody has reviewed it — never zero", async () => {
    prismaMock.propertyReview.aggregate.mockResolvedValue(aggregateOf(0) as never);
    prismaMock.propertyReview.count.mockResolvedValue(0 as never);
    prismaMock.residenceHistory.count.mockResolvedValue(0 as never);

    const res = await request(app).get(`${API}/properties/prop_test_1/experience-summary`);

    expect(res.status).toBe(200);
    expect(res.body.data.verified).toEqual({ count: 0, averages: null });
    // The single most important assertion in this file, and the reason it is
    // `toEqual` rather than a check on each average: `{ overall: 0, ... }` would pass
    // any per-field assertion that only looked for "a number", and would render as
    // one star out of five — a rating the platform invented about somebody's home
    // because nobody had reviewed it yet.
    expect(res.body.data.verified.averages).toBeNull();
  });

  it("averages only the verified reviews", async () => {
    prismaMock.propertyReview.aggregate.mockResolvedValue(
      aggregateOf(3, { overall: 4.333333, water: 5, power: 1.5, security: 4, landlord: 3 }) as never,
    );
    prismaMock.propertyReview.count.mockResolvedValue(7 as never);
    prismaMock.residenceHistory.count.mockResolvedValue(4 as never);

    const res = await request(app).get(`${API}/properties/prop_test_1/experience-summary`);

    expect(res.body.data.verified.count).toBe(3);
    expect(res.body.data.verified.averages.overall).toBe(4.3);
    expect(res.body.data.verified.averages.power).toBe(1.5);
    // Seven unverified reviews exist and are shown on the page. Not one of them is
    // inside the number above.
    expect(res.body.data.unverifiedCount).toBe(7);
    expect(res.body.data.residents).toBe(4);
  });

  it("aggregates over confirmed claims only, and counts the rest separately", async () => {
    prismaMock.propertyReview.aggregate.mockResolvedValue(aggregateOf(1, { overall: 4 }) as never);
    prismaMock.propertyReview.count.mockResolvedValue(0 as never);
    prismaMock.residenceHistory.count.mockResolvedValue(1 as never);

    await request(app).get(`${API}/properties/prop_test_1/experience-summary`);

    const aggWhere = prismaMock.propertyReview.aggregate.mock.calls[0]?.[0]?.where as Record<
      string,
      unknown
    >;
    expect(aggWhere.status).toBe("PUBLISHED");
    expect(aggWhere.residence).toEqual({ status: "CONFIRMED" });

    const countWhere = prismaMock.propertyReview.count.mock.calls[0]?.[0]?.where as Record<
      string,
      unknown
    >;
    // The complement, so a review belongs to exactly one of the two figures and
    // neither double-counts nor silently disappears.
    expect(countWhere.residence).toEqual({ status: { not: "CONFIRMED" } });
  });

  it("counts residents from confirmed claims, review or no review", async () => {
    prismaMock.propertyReview.aggregate.mockResolvedValue(aggregateOf(0) as never);
    prismaMock.propertyReview.count.mockResolvedValue(0 as never);
    prismaMock.residenceHistory.count.mockResolvedValue(5 as never);

    const res = await request(app).get(`${API}/properties/prop_test_1/experience-summary`);

    expect(prismaMock.residenceHistory.count.mock.calls[0]?.[0]?.where).toEqual({
      propertyId: "prop_test_1",
      status: "CONFIRMED",
    });
    // "Five people have lived here and none has reviewed it" is a more honest
    // summary than a blank space.
    expect(res.body.data.residents).toBe(5);
  });

  it("404s for a listing that is not public", async () => {
    prismaMock.property.findFirst.mockResolvedValue(null as never);

    const res = await request(app).get(`${API}/properties/prop_draft/experience-summary`);

    expect(res.status).toBe(404);
    expect(prismaMock.propertyReview.aggregate).not.toHaveBeenCalled();
  });
});

/* ------------------------------------------------------------- my reviews -- */

describe("GET /reviews/mine — the author's own copies", () => {
  it("is scoped to the caller whatever the query says", async () => {
    prismaMock.propertyReview.findMany.mockResolvedValue([makeReview()] as never);
    prismaMock.propertyReview.count.mockResolvedValue(1 as never);

    const res = await request(app)
      .get(`${API}/reviews/mine?authorId=usr_someone_else`)
      .set("Cookie", signedInAs(mover()));

    expect(res.status).toBe(200);
    expect(prismaMock.propertyReview.findMany.mock.calls[0]?.[0]?.where).toEqual({
      authorId: "usr_mover",
    });
  });

  it("includes reviews an admin has taken down, and says so", async () => {
    prismaMock.propertyReview.findMany.mockResolvedValue([
      makeReview({ status: "HIDDEN" }),
    ] as never);
    prismaMock.propertyReview.count.mockResolvedValue(1 as never);

    const res = await request(app).get(`${API}/reviews/mine`).set("Cookie", signedInAs(mover()));

    // Being told your review was hidden is the difference between moderation and a
    // review that silently stopped existing.
    expect(res.body.data.reviews[0].status).toBe("HIDDEN");
    const where = prismaMock.propertyReview.findMany.mock.calls[0]?.[0]?.where as Record<
      string,
      unknown
    >;
    expect(where).not.toHaveProperty("status");
  });

  it("gives the author their full dates and their whole text back", async () => {
    prismaMock.propertyReview.findMany.mockResolvedValue([makeReview()] as never);
    prismaMock.propertyReview.count.mockResolvedValue(1 as never);

    const res = await request(app).get(`${API}/reviews/mine`).set("Cookie", signedInAs(mover()));

    const review = res.body.data.reviews[0];
    // Their own tenancy: nothing is being protected from them, and the edit form
    // needs the exact dates and the body to prefill.
    expect(review.residedFrom).toBe("2024-09-01");
    expect(review.residedTo).toBe("2025-08-31");
    expect(review.residenceId).toBe("res_test_1");
    expect(review.body).toMatch(/Water never once went off/);
  });

  it("401s without a session", async () => {
    const res = await request(app).get(`${API}/reviews/mine`);
    expect(res.status).toBe(401);
  });
});

/* --------------------------------------------------------------- reporting -- */

describe("POST /reviews/:id/report — a complaint, and nothing more", () => {
  it("records the report without touching the review", async () => {
    prismaMock.propertyReview.findUnique.mockResolvedValue({
      id: "rev_test_1",
      authorId: "usr_mover",
    } as never);
    prismaMock.reviewReport.create.mockResolvedValue(makeReviewReport() as never);

    const res = await send(
      "post",
      "/reviews/rev_test_1/report",
      { reason: "I have never let this flat to anybody by that name." },
      signedInAs(landlord()),
    );

    expect(res.status).toBe(201);
    expect(res.body.data).toEqual({ reported: true });
    // THE assertion of this whole describe block. A landlord who could bury a bad
    // review by reporting it would make every rating on the platform worthless.
    expect(prismaMock.propertyReview.update).not.toHaveBeenCalled();
    expect(prismaMock.propertyReview.updateMany).not.toHaveBeenCalled();
  });

  it("tells the reporter nothing about the review", async () => {
    prismaMock.propertyReview.findUnique.mockResolvedValue({
      id: "rev_test_1",
      authorId: "usr_mover",
    } as never);
    prismaMock.reviewReport.create.mockResolvedValue(makeReviewReport() as never);

    const res = await send(
      "post",
      "/reviews/rev_test_1/report",
      { reason: "The dates given are years before the block was finished." },
      signedInAs(landlord()),
    );

    // Not the status, not the author, not an admin's eventual decision. Reporting
    // is not a read endpoint wearing a POST.
    expect(Object.keys(res.body.data)).toEqual(["reported"]);
  });

  it("refuses a report of your own review", async () => {
    prismaMock.propertyReview.findUnique.mockResolvedValue({
      id: "rev_test_1",
      authorId: "usr_mover",
    } as never);

    const res = await send(
      "post",
      "/reviews/rev_test_1/report",
      { reason: "I have changed my mind about what I wrote here." },
      signedInAs(mover()),
    );

    expect(res.status).toBe(409);
    expect(res.body.error.message).toMatch(/your own review/i);
    expect(prismaMock.reviewReport.create).not.toHaveBeenCalled();
  });

  it("turns a duplicate report into a sentence, not a constraint name", async () => {
    prismaMock.propertyReview.findUnique.mockResolvedValue({
      id: "rev_test_1",
      authorId: "usr_mover",
    } as never);
    prismaMock.reviewReport.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
        code: "P2002",
        clientVersion: "6.19.3",
      }) as never,
    );

    const res = await send(
      "post",
      "/reviews/rev_test_1/report",
      { reason: "Reporting this a second time to make the queue notice it." },
      signedInAs(landlord()),
    );

    expect(res.status).toBe(409);
    expect(res.body.error.message).toMatch(/already reported this review/i);
    // One complaint must not be able to look like ten in the queue.
    expect(res.body.error.message).not.toMatch(/constraint|P2002/);
  });

  it("requires a reason with something in it", async () => {
    const res = await send(
      "post",
      "/reviews/rev_test_1/report",
      { reason: "fake" },
      signedInAs(landlord()),
    );

    expect(res.status).toBe(422);
    expect(prismaMock.propertyReview.findUnique).not.toHaveBeenCalled();
  });

  it("needs a session", async () => {
    const res = await send(
      "post",
      "/reviews/rev_test_1/report",
      { reason: "Reporting this while not signed in at all." },
      [],
    );
    expect(res.status).toBe(401);
  });

  it("refuses without the CSRF header", async () => {
    const res = await request(app)
      .post(`${API}/reviews/rev_test_1/report`)
      .set("Cookie", signedInAs(landlord()))
      .send({ reason: "Reporting without a CSRF token in the header." });

    expect(res.status).toBe(403);
  });
});

/* -------------------------------------------------------------- moderation -- */

describe("the admin report queue", () => {
  it("shows what is outstanding, oldest first", async () => {
    prismaMock.reviewReport.findMany.mockResolvedValue([makeReviewReport()] as never);
    prismaMock.reviewReport.count.mockResolvedValue(1 as never);

    const res = await request(app).get(`${API}/reviews/reported`).set("Cookie", signedInAs(admin()));

    expect(res.status).toBe(200);
    expect(prismaMock.reviewReport.findMany.mock.calls[0]?.[0]?.where).toEqual({
      resolvedAt: null,
    });
    // Somebody is waiting on each of these, and the fair order is the order they
    // asked in — the same argument as the residence queue.
    expect(prismaMock.reviewReport.findMany.mock.calls[0]?.[0]?.orderBy).toEqual([
      { createdAt: "asc" },
      { id: "asc" },
    ]);
  });

  it("can show what has already been handled", async () => {
    prismaMock.reviewReport.findMany.mockResolvedValue([] as never);
    prismaMock.reviewReport.count.mockResolvedValue(0 as never);

    await request(app).get(`${API}/reviews/reported?resolved=true`).set("Cookie", signedInAs(admin()));

    // A moderation record you cannot audit after the fact is not a record.
    expect(prismaMock.reviewReport.findMany.mock.calls[0]?.[0]?.where).toEqual({
      resolvedAt: { not: null },
    });
  });

  it("gives the admin the full names and ids it needs to act", async () => {
    prismaMock.reviewReport.findMany.mockResolvedValue([makeReviewReport()] as never);
    prismaMock.reviewReport.count.mockResolvedValue(1 as never);

    const res = await request(app).get(`${API}/reviews/reported`).set("Cookie", signedInAs(admin()));

    const row = res.body.data.reviews[0];
    expect(row.reporter).toEqual({ id: "usr_landlord", name: "Bola Owner" });
    // Full name and id here, unlike the public shape: acting on an account needs to
    // know whose. Still no email and no phone number.
    expect(row.review.author).toEqual({ id: "usr_mover", name: "Ada Student" });
    expect(JSON.stringify(res.body)).not.toMatch(/ada@wale\.test|2348012345678/);
    expect(row.review.body).toMatch(/Water never once went off/);
    expect(row.reason).toMatch(/never let this flat/);
  });

  it("is closed to a landlord and to a tenant", async () => {
    for (const user of [landlord(), tenant()]) {
      const res = await request(app).get(`${API}/reviews/reported`).set("Cookie", signedInAs(user));
      expect(res.status).toBe(403);
    }
    expect(prismaMock.reviewReport.findMany).not.toHaveBeenCalled();
  });

  it("401s without a session", async () => {
    const res = await request(app).get(`${API}/reviews/reported`);
    expect(res.status).toBe(401);
  });
});

describe("PATCH /reviews/:id/moderate — the only route that changes visibility", () => {
  beforeEach(() => {
    prismaMock.propertyReview.findUnique.mockResolvedValue({
      id: "rev_test_1",
      status: "PUBLISHED",
    } as never);
    prismaMock.propertyReview.update.mockResolvedValue({
      id: "rev_test_1",
      status: "HIDDEN",
    } as never);
    prismaMock.reviewReport.updateMany.mockResolvedValue({ count: 2 } as never);
  });

  it("hides a review and closes its outstanding reports together", async () => {
    const res = await send(
      "patch",
      "/reviews/rev_test_1/moderate",
      { status: "HIDDEN", note: "Names a neighbour and accuses them of theft." },
      signedInAs(admin()),
    );

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({ id: "rev_test_1", status: "HIDDEN", reportsResolved: 2 });
    // One transaction: a queue still showing a complaint an admin has acted on is a
    // queue people stop trusting.
    expect(prismaMock.$transaction).toHaveBeenCalled();
    expect(prismaMock.reviewReport.updateMany.mock.calls[0]?.[0]?.where).toEqual({
      reviewId: "rev_test_1",
      resolvedAt: null,
    });
  });

  it("changes the status and not one word of the review", async () => {
    await send(
      "patch",
      "/reviews/rev_test_1/moderate",
      { status: "REMOVED", body: "rewritten by an admin", overall: 5 },
      signedInAs(admin()),
    );

    const data = prismaMock.propertyReview.update.mock.calls[0]?.[0]?.data as Record<
      string,
      unknown
    >;
    // A moderator may take a review down. A moderator may not make it say something
    // else — so the schema has no body and no ratings, and the data is one field.
    expect(data).toEqual({ status: "REMOVED" });
  });

  it("dismisses a report by re-publishing, with no separate endpoint to drift", async () => {
    prismaMock.propertyReview.update.mockResolvedValue({
      id: "rev_test_1",
      status: "PUBLISHED",
    } as never);
    prismaMock.reviewReport.updateMany.mockResolvedValue({ count: 1 } as never);

    const res = await send(
      "patch",
      "/reviews/rev_test_1/moderate",
      { status: "PUBLISHED", note: "Checked the tenancy — the complaint does not hold up." },
      signedInAs(admin()),
    );

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe("PUBLISHED");
    expect(res.body.data.reportsResolved).toBe(1);
  });

  it("keeps an admin's note out of the response entirely", async () => {
    const res = await send(
      "patch",
      "/reviews/rev_test_1/moderate",
      { status: "HIDDEN", note: "Second offence from this account — watch it." },
      signedInAs(admin()),
    );

    // The note is an admin aside, logged and not stored. It must not travel back
    // through a response the author could ever be shown.
    expect(JSON.stringify(res.body)).not.toMatch(/Second offence/);
    const data = prismaMock.propertyReview.update.mock.calls[0]?.[0]?.data as Record<
      string,
      unknown
    >;
    expect(data).not.toHaveProperty("note");
  });

  it("refuses a landlord moderating a review of their own property", async () => {
    const res = await send(
      "patch",
      "/reviews/rev_test_1/moderate",
      { status: "REMOVED" },
      signedInAs(landlord()),
    );

    // The landlord's route for a review they dispute is `/report`, which cannot
    // hide anything. This one is admin-only, and refused before any query runs.
    expect(res.status).toBe(403);
    expect(prismaMock.propertyReview.update).not.toHaveBeenCalled();
  });

  it("refuses an author moderating their own", async () => {
    const res = await send(
      "patch",
      "/reviews/rev_test_1/moderate",
      { status: "PUBLISHED" },
      signedInAs(mover()),
    );

    expect(res.status).toBe(403);
    expect(prismaMock.propertyReview.update).not.toHaveBeenCalled();
  });

  it("rejects a status that is not a moderation state", async () => {
    const res = await send(
      "patch",
      "/reviews/rev_test_1/moderate",
      { status: "VERIFIED" },
      signedInAs(admin()),
    );

    expect(res.status).toBe(422);
    expect(prismaMock.propertyReview.findUnique).not.toHaveBeenCalled();
  });

  it("404s for a review that does not exist", async () => {
    prismaMock.propertyReview.findUnique.mockResolvedValue(null as never);

    const res = await send(
      "patch",
      "/reviews/rev_nope/moderate",
      { status: "HIDDEN" },
      signedInAs(admin()),
    );

    expect(res.status).toBe(404);
    expect(prismaMock.propertyReview.update).not.toHaveBeenCalled();
  });
});

/* ------------------------------------------------------- no money anywhere -- */

describe("a review is not a transaction", () => {
  it("carries no price, no fee and no amount in or out", async () => {
    prismaMock.residenceHistory.findFirst.mockResolvedValue(claimBehindReview() as never);
    prismaMock.propertyReview.create.mockResolvedValue(makeReview() as never);

    const res = await send(
      "post",
      "/properties/prop_test_1/reviews",
      { ...NEW_REVIEW, amount: 5000, fee: 250 },
      signedInAs(mover()),
    );

    expect(res.status).toBe(201);
    const data = prismaMock.propertyReview.create.mock.calls[0]?.[0]?.data as Record<
      string,
      unknown
    >;
    for (const field of ["amount", "fee", "price"]) {
      expect(data).not.toHaveProperty(field);
    }
    // And the listing summary that comes back has no price either, matching the
    // residence serializer: a review is about what living there was like.
    expect(res.body.data.property).not.toHaveProperty("price");
  });
});

/* --------------------------------------------------------- listing contract -- */

describe("the review list's own shape", () => {
  it("paginates like every other list in this API", async () => {
    prismaMock.property.findFirst.mockResolvedValue({ id: "prop_test_1" } as never);
    prismaMock.propertyReview.findMany.mockResolvedValue([makeReview()] as never);
    prismaMock.propertyReview.count.mockResolvedValue(23 as never);

    const res = await request(app).get(`${API}/properties/prop_test_1/reviews?page=2&pageSize=10`);

    expect(res.body.data).toMatchObject({ total: 23, page: 2, pageSize: 10, totalPages: 3 });
    expect(prismaMock.propertyReview.findMany.mock.calls[0]?.[0]?.skip).toBe(10);
    expect(prismaMock.propertyReview.findMany.mock.calls[0]?.[0]?.take).toBe(10);
  });

  it("refuses a page size big enough to be a scrape", async () => {
    const res = await request(app).get(`${API}/properties/prop_test_1/reviews?pageSize=500`);

    expect(res.status).toBe(422);
    expect(prismaMock.property.findFirst).not.toHaveBeenCalled();
  });

  it("orders newest first, so a stale review is never the first thing read", async () => {
    prismaMock.property.findFirst.mockResolvedValue({ id: "prop_test_1" } as never);
    prismaMock.propertyReview.findMany.mockResolvedValue([] as never);
    prismaMock.propertyReview.count.mockResolvedValue(0 as never);

    await request(app).get(`${API}/properties/prop_test_1/reviews`);

    expect(prismaMock.propertyReview.findMany.mock.calls[0]?.[0]?.orderBy).toEqual([
      { createdAt: "desc" },
      { id: "desc" },
    ]);
  });
});
