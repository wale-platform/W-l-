import { Prisma } from "@prisma/client";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { createApp } from "../src/app";
import { API, getCsrf } from "./helpers";
import { prismaMock } from "./setup";
import { makeResidence, makeSession, makeUser } from "./factories";

/**
 * Residence claims: who may claim, who may believe them, and what a claim is
 * worth before somebody does.
 *
 * This is the trust foundation the review system stands on, so the claims under
 * test are the safeguards themselves — each separable enough that a change could
 * satisfy some and quietly break the rest:
 *
 *  1. A CLAIM STARTS UNVERIFIED. Nothing a client sends can create a confirmed
 *     one, and the service does not even pass `status` on insert.
 *  2. ONLY THE PROPERTY'S OWNER decides. Holding the LANDLORD role is not enough:
 *     ownership is part of the query, so it holds whatever the frontend renders.
 *  3. NOBODY DECIDES ON THEIR OWN CLAIM — including an admin, whose scope is
 *     otherwise every claim on the platform. This is the one hole that would make
 *     the whole feature worthless.
 *  4. YOU CANNOT CLAIM YOUR OWN LISTING, which is the same hole arriving by the
 *     front door: a claim only you could confirm.
 *  5. A REJECTION CARRIES A REASON, and it reaches the claimant word for word.
 *  6. OUTSTANDING CLAIMS ARE CAPPED, so the catalogue cannot be sprayed.
 *  7. THE OWNER IS GIVEN NO WAY TO CONTACT THE CLAIMANT. A viewing request hands
 *     over a phone number once confirmed because two people must meet at a gate;
 *     deciding "do I recognise this tenant" needs no such thing, so there is no
 *     field for one.
 *  8. THE DATES ARE THE CLAIMANT'S. A decision never rewrites the period.
 *  9. A DECIDED CLAIM IS NOT WITHDRAWABLE, so a rejection cannot be deleted and
 *     re-submitted from a clean slate.
 *
 * Email is mocked. What is under test is that we ASK to send the right message —
 * and, separately, that a send failure cannot undo something already recorded.
 */

vi.mock("../src/lib/email", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../src/lib/email")>();
  return {
    ...actual,
    sendResidenceClaimEmail: vi.fn().mockResolvedValue(undefined),
    sendResidenceDecisionEmail: vi.fn().mockResolvedValue(undefined),
  };
});

import { sendResidenceClaimEmail, sendResidenceDecisionEmail } from "../src/lib/email";

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

/** A second landlord, who owns nothing under test. Role-holder, not owner. */
const otherLandlord = () =>
  makeUser({ id: "usr_landlord_2", role: "LANDLORD", roles: [{ role: "LANDLORD" }] });

const admin = () => makeUser({ id: "usr_admin", role: "ADMIN", roles: [{ role: "ADMIN" }] });

const lawyer = () => makeUser({ id: "usr_lawyer", role: "LAWYER", roles: [{ role: "LAWYER" }] });

/** A tenancy that has plainly ended, in the past on any run. */
const CLAIM = { propertyId: "prop_test_1", movedInAt: "2024-09-01", movedOutAt: "2025-08-31" };

/** A rejection long enough to clear the floor, written like a real one. */
const REJECT_REASON = "That flat was empty all of 2024 — I think you have the wrong listing.";

/** What `findFirst` hands `claimResidence`: a property that has been public. */
function claimableProperty(overrides: Record<string, unknown> = {}) {
  return {
    id: "prop_test_1",
    title: "Sunny Studio near UNILAG",
    ownerId: "usr_landlord",
    owner: { email: "landlord@wale.test" },
    ...overrides,
  };
}

/** An undecided claim, as `decide`'s narrow `select` returns it. */
function undecidedClaim(overrides: Record<string, unknown> = {}) {
  return {
    id: "res_test_1",
    userId: "usr_mover",
    status: "UNVERIFIED",
    movedInAt: new Date("2024-09-01T00:00:00.000Z"),
    movedOutAt: new Date("2025-08-31T00:00:00.000Z"),
    property: { id: "prop_test_1", title: "Sunny Studio near UNILAG" },
    user: { email: "ada@wale.test" },
    ...overrides,
  };
}

async function send(
  method: "post" | "delete",
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

beforeEach(() => {
  vi.mocked(sendResidenceClaimEmail).mockClear().mockResolvedValue(undefined);
  vi.mocked(sendResidenceDecisionEmail).mockClear().mockResolvedValue(undefined);
  // No corroborating viewing and no open claims unless a test says otherwise.
  prismaMock.inspection.findFirst.mockResolvedValue(null as never);
  prismaMock.residenceHistory.count.mockResolvedValue(0 as never);
});

/* ------------------------------------------------------------- claiming -- */

describe("POST /residences — somebody records where they lived", () => {
  it("records the claim against the caller, not against a field they sent", async () => {
    prismaMock.property.findFirst.mockResolvedValue(claimableProperty() as never);
    prismaMock.residenceHistory.create.mockResolvedValue(makeResidence() as never);

    const res = await send(
      "post",
      "/residences",
      // `userId` and `status` are sent deliberately: both must be ignored.
      { ...CLAIM, userId: "usr_someone_else", status: "CONFIRMED" },
      signedInAs(mover()),
    );

    expect(res.status).toBe(201);
    const data = prismaMock.residenceHistory.create.mock.calls[0]?.[0]?.data as
      | Record<string, unknown>
      | undefined;
    expect(data?.userId).toBe("usr_mover");
    // Not merely "not CONFIRMED" — absent. The column's default is what sets it,
    // so there is no line here that could be edited into a pre-confirmed claim.
    expect(data).not.toHaveProperty("status");
  });

  it("starts UNVERIFIED, and says so in the payload", async () => {
    prismaMock.property.findFirst.mockResolvedValue(claimableProperty() as never);
    prismaMock.residenceHistory.create.mockResolvedValue(makeResidence() as never);

    const res = await send("post", "/residences", CLAIM, signedInAs(mover()));

    expect(res.status).toBe(201);
    expect(res.body.data.status).toBe("UNVERIFIED");
    // The frontend branches on this, so it is part of the contract rather than a
    // convenience: an unverified claim must never read as verified.
    expect(res.body.data.verified).toBe(false);
  });

  it("refuses a claim on the caller's own listing", async () => {
    prismaMock.property.findFirst.mockResolvedValue(
      claimableProperty({ ownerId: "usr_mover" }) as never,
    );

    const res = await send("post", "/residences", CLAIM, signedInAs(mover()));

    expect(res.status).toBe(409);
    expect(res.body.error.message).toMatch(/your own listing/i);
    expect(prismaMock.residenceHistory.create).not.toHaveBeenCalled();
  });

  it("404s on a property that has never been public, without saying which", async () => {
    // A DRAFT listing falls outside the `status: { in: CLAIMABLE }` filter, so the
    // service sees the same nothing it sees for an id that does not exist.
    prismaMock.property.findFirst.mockResolvedValue(null as never);

    const res = await send("post", "/residences", CLAIM, signedInAs(mover()));

    expect(res.status).toBe(404);
    expect(res.body.error.message).toBe("Property not found");
  });

  it("caps the number of undecided claims one account may hold", async () => {
    prismaMock.property.findFirst.mockResolvedValue(claimableProperty() as never);
    prismaMock.residenceHistory.count.mockResolvedValue(5 as never);

    const res = await send("post", "/residences", CLAIM, signedInAs(mover()));

    expect(res.status).toBe(409);
    expect(res.body.error.message).toMatch(/waiting to be confirmed/i);
    expect(prismaMock.residenceHistory.create).not.toHaveBeenCalled();
    // Counted on UNVERIFIED alone: a person with fifteen CONFIRMED tenancies has
    // fifteen landlords who vouched for them, which is the opposite of suspicious.
    const where = prismaMock.residenceHistory.count.mock.calls[0]?.[0]?.where as
      | Record<string, unknown>
      | undefined;
    expect(where?.status).toBe("UNVERIFIED");
  });

  it("turns the duplicate-claim constraint into a sentence, not a constraint name", async () => {
    prismaMock.property.findFirst.mockResolvedValue(claimableProperty() as never);
    prismaMock.residenceHistory.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
        code: "P2002",
        clientVersion: "6.19.3",
      }) as never,
    );

    const res = await send("post", "/residences", CLAIM, signedInAs(mover()));

    expect(res.status).toBe(409);
    expect(res.body.error.message).toMatch(/already recorded living here/i);
    expect(res.body.error.message).not.toMatch(/constraint|P2002/i);
  });

  it("attaches a completed viewing as corroboration, and only the server can", async () => {
    prismaMock.property.findFirst.mockResolvedValue(claimableProperty() as never);
    prismaMock.inspection.findFirst.mockResolvedValue({ id: "insp_done" } as never);
    prismaMock.residenceHistory.create.mockResolvedValue(
      makeResidence({ corroboratedByInspectionId: "insp_done" }) as never,
    );

    const res = await send(
      "post",
      "/residences",
      // Sent deliberately, pointing at a viewing that is not theirs. It must be
      // ignored: a client that could set this would manufacture its own evidence.
      { ...CLAIM, corroboratedByInspectionId: "insp_someone_elses" },
      signedInAs(mover()),
    );

    expect(res.status).toBe(201);
    const data = prismaMock.residenceHistory.create.mock.calls[0]?.[0]?.data as
      | Record<string, unknown>
      | undefined;
    expect(data?.corroboratedByInspectionId).toBe("insp_done");

    // And it looked for the right thing: this person, this property, COMPLETED.
    const where = prismaMock.inspection.findFirst.mock.calls[0]?.[0]?.where as
      | Record<string, unknown>
      | undefined;
    expect(where).toMatchObject({
      tenantId: "usr_mover",
      propertyId: "prop_test_1",
      status: "COMPLETED",
    });
  });

  it("does not leak the claimant's identity into the owner's email", async () => {
    prismaMock.property.findFirst.mockResolvedValue(claimableProperty() as never);
    prismaMock.residenceHistory.create.mockResolvedValue(makeResidence() as never);

    await send("post", "/residences", CLAIM, signedInAs(mover()));

    const args = vi.mocked(sendResidenceClaimEmail).mock.calls[0]?.[0];
    expect(args?.to).toBe("landlord@wale.test");
    // An email is forwarded far more casually than a dashboard is shared, so
    // identity stays on the dashboard — same rule as the viewing request email.
    expect(JSON.stringify(args)).not.toMatch(/Ada|Student|ada@wale\.test|2348012345678/);
  });

  it("records the claim even when the owner's email fails", async () => {
    prismaMock.property.findFirst.mockResolvedValue(claimableProperty() as never);
    prismaMock.residenceHistory.create.mockResolvedValue(makeResidence() as never);
    vi.mocked(sendResidenceClaimEmail).mockRejectedValue(new Error("smtp down"));

    const res = await send("post", "/residences", CLAIM, signedInAs(mover()));

    // The row is written; a mail server hiccup must not surface as a failure for
    // something that succeeded, nor roll it back.
    expect(res.status).toBe(201);
  });

  it("still records a claim against an ownerless listing", async () => {
    // Seeded and imported listings have no account behind them. The claim is
    // accepted — it will simply stay UNVERIFIED until an admin looks at it.
    prismaMock.property.findFirst.mockResolvedValue(
      claimableProperty({ ownerId: null, owner: null }) as never,
    );
    prismaMock.residenceHistory.create.mockResolvedValue(makeResidence() as never);

    const res = await send("post", "/residences", CLAIM, signedInAs(mover()));

    expect(res.status).toBe(201);
    expect(sendResidenceClaimEmail).not.toHaveBeenCalled();
  });

  it("lets a tenant claim too — the role is not the point", async () => {
    prismaMock.property.findFirst.mockResolvedValue(claimableProperty() as never);
    prismaMock.residenceHistory.create.mockResolvedValue(makeResidence() as never);

    const res = await send("post", "/residences", CLAIM, signedInAs(tenant()));

    expect(res.status).toBe(201);
  });

  it("refuses a landlord, who holds TENANT if they are also renting", async () => {
    const res = await send("post", "/residences", CLAIM, signedInAs(landlord()));

    expect(res.status).toBe(403);
    expect(prismaMock.property.findFirst).not.toHaveBeenCalled();
  });

  it("needs a session", async () => {
    const res = await send("post", "/residences", CLAIM, []);
    expect(res.status).toBe(401);
  });

  it("refuses without the CSRF header", async () => {
    const res = await request(app)
      .post(`${API}/residences`)
      .set("Cookie", signedInAs(mover()))
      .send(CLAIM);

    expect(res.status).toBe(403);
  });
});

/* ---------------------------------------------------------- claim dates -- */

describe("POST /residences — the dates have to describe a real tenancy", () => {
  beforeEach(() => {
    prismaMock.property.findFirst.mockResolvedValue(claimableProperty() as never);
  });

  it("refuses a move-in date in the future", async () => {
    const tomorrow = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);

    const res = await send(
      "post",
      "/residences",
      { propertyId: "prop_test_1", movedInAt: tomorrow },
      signedInAs(mover()),
    );

    expect(res.status).toBe(422);
    expect(res.body.error.details).toEqual(
      expect.arrayContaining([expect.objectContaining({ field: "movedInAt" })]),
    );
  });

  it("refuses moving out before moving in", async () => {
    const res = await send(
      "post",
      "/residences",
      { propertyId: "prop_test_1", movedInAt: "2025-01-01", movedOutAt: "2024-01-01" },
      signedInAs(mover()),
    );

    expect(res.status).toBe(422);
    expect(res.body.error.details).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: "movedOutAt", message: expect.stringMatching(/before/i) }),
      ]),
    );
  });

  it("refuses a future move-out date, pointing at the way to say 'still here'", async () => {
    const nextYear = new Date(Date.now() + 300 * 86_400_000).toISOString().slice(0, 10);

    const res = await send(
      "post",
      "/residences",
      { propertyId: "prop_test_1", movedInAt: "2025-01-01", movedOutAt: nextYear },
      signedInAs(mover()),
    );

    expect(res.status).toBe(422);
    expect(res.body.error.details).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          field: "movedOutAt",
          message: expect.stringMatching(/still live here/i),
        }),
      ]),
    );
  });

  it("accepts an open-ended claim from somebody still living there", async () => {
    prismaMock.residenceHistory.create.mockResolvedValue(
      makeResidence({ movedOutAt: null }) as never,
    );

    const res = await send(
      "post",
      "/residences",
      { propertyId: "prop_test_1", movedInAt: "2025-01-01" },
      signedInAs(mover()),
    );

    expect(res.status).toBe(201);
    // Absent rather than null: the frontend's optional field is the single source
    // of "is this tenancy over".
    expect(res.body.data).not.toHaveProperty("movedOutAt");
  });

  it("refuses a date that does not exist", async () => {
    const res = await send(
      "post",
      "/residences",
      { propertyId: "prop_test_1", movedInAt: "2025-02-30" },
      signedInAs(mover()),
    );

    expect(res.status).toBe(422);
  });

  it("refuses a claim reaching further back than the bound", async () => {
    const res = await send(
      "post",
      "/residences",
      { propertyId: "prop_test_1", movedInAt: "1974-01-01" },
      signedInAs(mover()),
    );

    expect(res.status).toBe(422);
  });
});

/* --------------------------------------------------------- the claimant's -- */

describe("GET /residences/mine", () => {
  it("is scoped to the caller, with no way to ask for somebody else's", async () => {
    prismaMock.residenceHistory.findMany.mockResolvedValue([makeResidence()] as never);
    prismaMock.residenceHistory.count.mockResolvedValue(1 as never);

    const res = await request(app)
      .get(`${API}/residences/mine?userId=usr_someone_else`)
      .set("Cookie", signedInAs(mover()));

    expect(res.status).toBe(200);
    const where = prismaMock.residenceHistory.findMany.mock.calls[0]?.[0]?.where as
      | Record<string, unknown>
      | undefined;
    expect(where?.userId).toBe("usr_mover");
  });

  it("does not carry the claimant's own details back to them", async () => {
    prismaMock.residenceHistory.findMany.mockResolvedValue([makeResidence()] as never);
    prismaMock.residenceHistory.count.mockResolvedValue(1 as never);

    const res = await request(app)
      .get(`${API}/residences/mine`)
      .set("Cookie", signedInAs(mover()));

    expect(res.status).toBe(200);
    // The claimant knows who they are. `claimant` belongs to the owner's view,
    // and a shared serializer would be how it leaked into the wrong one.
    expect(res.body.data.residences[0]).not.toHaveProperty("claimant");
    expect(res.body.data.residences[0]).not.toHaveProperty("corroborated");
  });

  it("reports whether a review has been written, without carrying the review", async () => {
    prismaMock.residenceHistory.findMany.mockResolvedValue([
      makeResidence({ status: "CONFIRMED", review: { id: "rev_1" } }),
      makeResidence({ id: "res_test_2", status: "CONFIRMED", review: null }),
    ] as never);
    prismaMock.residenceHistory.count.mockResolvedValue(2 as never);

    const res = await request(app)
      .get(`${API}/residences/mine`)
      .set("Cookie", signedInAs(mover()));

    expect(res.body.data.residences[0].hasReview).toBe(true);
    expect(res.body.data.residences[1].hasReview).toBe(false);
    expect(res.body.data.residences[0]).not.toHaveProperty("review");
  });

  it("returns calendar dates, not timestamps", async () => {
    prismaMock.residenceHistory.findMany.mockResolvedValue([makeResidence()] as never);
    prismaMock.residenceHistory.count.mockResolvedValue(1 as never);

    const res = await request(app)
      .get(`${API}/residences/mine`)
      .set("Cookie", signedInAs(mover()));

    // What a `<input type="date">` wants, and what the fact actually is: nobody
    // remembers the hour they moved in.
    expect(res.body.data.residences[0].movedInAt).toBe("2024-09-01");
    expect(res.body.data.residences[0].movedOutAt).toBe("2025-08-31");
  });

  it("needs a session", async () => {
    const res = await request(app).get(`${API}/residences/mine`);
    expect(res.status).toBe(401);
  });
});

/* ------------------------------------------------------------ the owner's -- */

describe("GET /residences/incoming", () => {
  beforeEach(() => {
    prismaMock.residenceHistory.findMany.mockResolvedValue([makeResidence()] as never);
    prismaMock.residenceHistory.count.mockResolvedValue(1 as never);
  });

  it("scopes a landlord to claims against their own properties", async () => {
    const res = await request(app)
      .get(`${API}/residences/incoming`)
      .set("Cookie", signedInAs(landlord()));

    expect(res.status).toBe(200);
    const where = prismaMock.residenceHistory.findMany.mock.calls[0]?.[0]?.where as
      | Record<string, unknown>
      | undefined;
    expect(where?.property).toEqual({ ownerId: "usr_landlord" });
  });

  it("widens for an admin, which is what makes the admin view possible", async () => {
    const res = await request(app)
      .get(`${API}/residences/incoming`)
      .set("Cookie", signedInAs(admin()));

    expect(res.status).toBe(200);
    const where = prismaMock.residenceHistory.findMany.mock.calls[0]?.[0]?.where as
      | Record<string, unknown>
      | undefined;
    expect(where).not.toHaveProperty("property");
  });

  it("gives the owner a name but no way to contact the claimant", async () => {
    const res = await request(app)
      .get(`${API}/residences/incoming`)
      .set("Cookie", signedInAs(landlord()));

    const row = res.body.data.residences[0];
    expect(row.claimant).toEqual({ id: "usr_mover", name: "Ada Student" });
    // Deciding "do I recognise this tenant" needs a name, a period and a note.
    // It does not need a phone number, so the payload has nowhere to put one.
    expect(JSON.stringify(row)).not.toMatch(/2348012345678|ada@wale\.test/);
  });

  it("shows whether the platform holds evidence for the claim", async () => {
    prismaMock.residenceHistory.findMany.mockResolvedValue([
      makeResidence({ corroboratedByInspectionId: "insp_done" }),
    ] as never);

    const res = await request(app)
      .get(`${API}/residences/incoming`)
      .set("Cookie", signedInAs(landlord()));

    expect(res.body.data.residences[0].corroborated).toBe(true);
    // The id itself is not sent. Which viewing it was is not the owner's
    // business; whether one happened is.
    expect(res.body.data.residences[0]).not.toHaveProperty("corroboratedByInspectionId");
  });

  it("lets a lawyer see the queue, as with listings", async () => {
    const res = await request(app)
      .get(`${API}/residences/incoming`)
      .set("Cookie", signedInAs(lawyer()));

    expect(res.status).toBe(200);
  });

  it("refuses a plain mover", async () => {
    const res = await request(app)
      .get(`${API}/residences/incoming`)
      .set("Cookie", signedInAs(mover()));

    expect(res.status).toBe(403);
  });
});

/* ------------------------------------------------------------- deciding -- */

describe("POST /residences/:id/confirm", () => {
  it("confirms, records who decided, and promotes the claim to verified", async () => {
    prismaMock.residenceHistory.findFirst.mockResolvedValue(undecidedClaim() as never);
    prismaMock.residenceHistory.update.mockResolvedValue(
      makeResidence({
        status: "CONFIRMED",
        confirmedById: "usr_landlord",
        decidedAt: new Date("2026-03-01T00:00:00.000Z"),
      }) as never,
    );

    const res = await send(
      "post",
      "/residences/res_test_1/confirm",
      undefined,
      signedInAs(landlord()),
    );

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe("CONFIRMED");
    // Derived from the status at read time, never a stored column — so a claim
    // rejected later takes its review's badge back down with it.
    expect(res.body.data.verified).toBe(true);

    const data = prismaMock.residenceHistory.update.mock.calls[0]?.[0]?.data as
      | Record<string, unknown>
      | undefined;
    expect(data?.confirmedById).toBe("usr_landlord");
    expect(data?.decidedAt).toBeInstanceOf(Date);
  });

  it("never rewrites the period — the history is the claimant's", async () => {
    prismaMock.residenceHistory.findFirst.mockResolvedValue(undecidedClaim() as never);
    prismaMock.residenceHistory.update.mockResolvedValue(
      makeResidence({ status: "CONFIRMED" }) as never,
    );

    await send(
      "post",
      "/residences/res_test_1/confirm",
      // Sent deliberately. An owner who remembers the tenancy differently rejects
      // and says so; silently moving the dates would leave the claimant with a
      // confirmed record they never made.
      { movedInAt: "2020-01-01", movedOutAt: "2020-02-01", userId: "usr_someone_else" },
      signedInAs(landlord()),
    );

    const data = prismaMock.residenceHistory.update.mock.calls[0]?.[0]?.data as
      | Record<string, unknown>
      | undefined;
    expect(data).not.toHaveProperty("movedInAt");
    expect(data).not.toHaveProperty("movedOutAt");
    expect(data).not.toHaveProperty("userId");
  });

  it("scopes a landlord to their own properties' claims", async () => {
    // The row exists but belongs to another landlord's property, so the
    // ownership clause in the WHERE finds nothing.
    prismaMock.residenceHistory.findFirst.mockResolvedValue(null as never);

    const res = await send(
      "post",
      "/residences/res_test_1/confirm",
      undefined,
      signedInAs(otherLandlord()),
    );

    // 404, not 403: "exists, not yours" and "does not exist" must look the same
    // to somebody guessing ids.
    expect(res.status).toBe(404);
    const where = prismaMock.residenceHistory.findFirst.mock.calls[0]?.[0]?.where as
      | Record<string, unknown>
      | undefined;
    expect(where?.property).toEqual({ ownerId: "usr_landlord_2" });
  });

  it("refuses an admin confirming their own claim", async () => {
    // An admin's scope is every claim on the platform, which is exactly why this
    // check has to exist: they are the only actor who can reach their own.
    prismaMock.residenceHistory.findFirst.mockResolvedValue(
      undecidedClaim({ userId: "usr_admin" }) as never,
    );

    const res = await send(
      "post",
      "/residences/res_test_1/confirm",
      undefined,
      signedInAs(admin()),
    );

    expect(res.status).toBe(409);
    expect(res.body.error.message).toMatch(/your own residence claim/i);
    expect(prismaMock.residenceHistory.update).not.toHaveBeenCalled();
  });

  it("refuses a claim that has already been decided", async () => {
    prismaMock.residenceHistory.findFirst.mockResolvedValue(
      undecidedClaim({ status: "REJECTED" }) as never,
    );

    const res = await send(
      "post",
      "/residences/res_test_1/confirm",
      undefined,
      signedInAs(landlord()),
    );

    expect(res.status).toBe(409);
    expect(res.body.error.message).toMatch(/already been rejected/i);
    expect(prismaMock.residenceHistory.update).not.toHaveBeenCalled();
  });

  it("tells the claimant what it unlocks", async () => {
    prismaMock.residenceHistory.findFirst.mockResolvedValue(undecidedClaim() as never);
    prismaMock.residenceHistory.update.mockResolvedValue(
      makeResidence({ status: "CONFIRMED" }) as never,
    );

    await send("post", "/residences/res_test_1/confirm", undefined, signedInAs(landlord()));

    const args = vi.mocked(sendResidenceDecisionEmail).mock.calls[0]?.[0];
    expect(args?.to).toBe("ada@wale.test");
    expect(args?.status).toBe("CONFIRMED");
  });

  it("refuses a mover, whatever the frontend renders", async () => {
    const res = await send(
      "post",
      "/residences/res_test_1/confirm",
      undefined,
      signedInAs(mover()),
    );

    expect(res.status).toBe(403);
    expect(prismaMock.residenceHistory.findFirst).not.toHaveBeenCalled();
  });
});

describe("POST /residences/:id/reject", () => {
  it("requires words, because the claimant reads them", async () => {
    const res = await send(
      "post",
      "/residences/res_test_1/reject",
      { reason: "no" },
      signedInAs(landlord()),
    );

    expect(res.status).toBe(422);
    expect(res.body.error.details).toEqual(
      expect.arrayContaining([expect.objectContaining({ field: "reason" })]),
    );
    expect(prismaMock.residenceHistory.update).not.toHaveBeenCalled();
  });

  it("stores the reason and passes it to the claimant verbatim", async () => {
    prismaMock.residenceHistory.findFirst.mockResolvedValue(undecidedClaim() as never);
    prismaMock.residenceHistory.update.mockResolvedValue(
      makeResidence({ status: "REJECTED", decisionReason: REJECT_REASON }) as never,
    );

    const res = await send(
      "post",
      "/residences/res_test_1/reject",
      { reason: REJECT_REASON },
      signedInAs(landlord()),
    );

    expect(res.status).toBe(200);
    expect(res.body.data.decisionReason).toBe(REJECT_REASON);

    const data = prismaMock.residenceHistory.update.mock.calls[0]?.[0]?.data as
      | Record<string, unknown>
      | undefined;
    expect(data?.decisionReason).toBe(REJECT_REASON);
    expect(vi.mocked(sendResidenceDecisionEmail).mock.calls[0]?.[0]?.reason).toBe(REJECT_REASON);
  });

  it("keeps the rejected row rather than deleting it", async () => {
    prismaMock.residenceHistory.findFirst.mockResolvedValue(undecidedClaim() as never);
    prismaMock.residenceHistory.update.mockResolvedValue(
      makeResidence({ status: "REJECTED" }) as never,
    );

    await send(
      "post",
      "/residences/res_test_1/reject",
      { reason: REJECT_REASON },
      signedInAs(landlord()),
    );

    // A rejected claim is the record that somebody tried. Deleting it would hand
    // them a clean slate to try again from.
    expect(prismaMock.residenceHistory.delete).not.toHaveBeenCalled();
    expect(prismaMock.residenceHistory.update).toHaveBeenCalled();
  });

  it("marks the claim unverified in the payload", async () => {
    prismaMock.residenceHistory.findFirst.mockResolvedValue(undecidedClaim() as never);
    prismaMock.residenceHistory.update.mockResolvedValue(
      makeResidence({ status: "REJECTED" }) as never,
    );

    const res = await send(
      "post",
      "/residences/res_test_1/reject",
      { reason: REJECT_REASON },
      signedInAs(landlord()),
    );

    expect(res.body.data.verified).toBe(false);
  });
});

/* ----------------------------------------------------------- withdrawing -- */

describe("DELETE /residences/:id", () => {
  it("lets the claimant take back a claim nobody has decided on", async () => {
    prismaMock.residenceHistory.findFirst.mockResolvedValue(
      { id: "res_test_1", status: "UNVERIFIED" } as never,
    );
    prismaMock.residenceHistory.delete.mockResolvedValue({ id: "res_test_1" } as never);

    const res = await send("delete", "/residences/res_test_1", undefined, signedInAs(mover()));

    expect(res.status).toBe(200);
    expect(res.body.data.withdrawn).toBe(true);
    const where = prismaMock.residenceHistory.findFirst.mock.calls[0]?.[0]?.where as
      | Record<string, unknown>
      | undefined;
    expect(where?.userId).toBe("usr_mover");
  });

  it("refuses to withdraw a rejection", async () => {
    prismaMock.residenceHistory.findFirst.mockResolvedValue(
      { id: "res_test_1", status: "REJECTED" } as never,
    );

    const res = await send("delete", "/residences/res_test_1", undefined, signedInAs(mover()));

    // Otherwise a rejection is deletable and immediately re-submittable, which
    // is precisely what keeping rejected rows is for.
    expect(res.status).toBe(409);
    expect(res.body.error.message).toMatch(/stays on your history/i);
    expect(prismaMock.residenceHistory.delete).not.toHaveBeenCalled();
  });

  it("refuses to withdraw a confirmed claim", async () => {
    prismaMock.residenceHistory.findFirst.mockResolvedValue(
      { id: "res_test_1", status: "CONFIRMED" } as never,
    );

    const res = await send("delete", "/residences/res_test_1", undefined, signedInAs(mover()));

    expect(res.status).toBe(409);
    expect(prismaMock.residenceHistory.delete).not.toHaveBeenCalled();
  });

  it("404s on somebody else's claim", async () => {
    prismaMock.residenceHistory.findFirst.mockResolvedValue(null as never);

    const res = await send("delete", "/residences/res_test_1", undefined, signedInAs(mover()));

    expect(res.status).toBe(404);
  });

  it("refuses without the CSRF header", async () => {
    const res = await request(app)
      .delete(`${API}/residences/res_test_1`)
      .set("Cookie", signedInAs(mover()));

    expect(res.status).toBe(403);
  });
});

/* ------------------------------------------------------------ no money -- */

describe("no money anywhere in the residence domain", () => {
  it("accepts no amount, fee, or price on a claim", async () => {
    prismaMock.property.findFirst.mockResolvedValue(claimableProperty() as never);
    prismaMock.residenceHistory.create.mockResolvedValue(makeResidence() as never);

    await send(
      "post",
      "/residences",
      { ...CLAIM, amount: 50_000, fee: 5_000, price: 850_000 },
      signedInAs(mover()),
    );

    const data = prismaMock.residenceHistory.create.mock.calls[0]?.[0]?.data as
      | Record<string, unknown>
      | undefined;
    expect(data).not.toHaveProperty("amount");
    expect(data).not.toHaveProperty("fee");
    expect(data).not.toHaveProperty("price");
  });

  it("says nothing about money in what it returns", async () => {
    prismaMock.residenceHistory.findMany.mockResolvedValue([makeResidence()] as never);
    prismaMock.residenceHistory.count.mockResolvedValue(1 as never);

    const res = await request(app)
      .get(`${API}/residences/mine`)
      .set("Cookie", signedInAs(mover()));

    // The residence serializer deliberately omits `price`, unlike the inspection
    // one: a claim is about a tenancy that has already happened, and the rent it
    // was let at now is not part of it.
    expect(res.body.data.residences[0].property).not.toHaveProperty("price");
  });
});
