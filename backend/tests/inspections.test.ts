import { Prisma } from "@prisma/client";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { createApp } from "../src/app";
import { API, getCsrf } from "./helpers";
import { prismaMock } from "./setup";
import { makeInspection, makeSession, makeUser } from "./factories";

/**
 * Inspection requests: who may ask, who may answer, and what each side is told.
 *
 * The claims under test, separable enough that a change can satisfy some of them
 * and quietly break the rest:
 *
 *  1. ONLY A LISTING'S OWNER answers requests on it. Holding the LANDLORD role is
 *     not enough — the ownership constraint is part of the query, so it holds no
 *     matter what the frontend renders.
 *  2. A DECLINE CARRIES A REASON, and it reaches the tenant word for word. It is
 *     the only thing that tells them whether to propose another time.
 *  3. THE APPOINTMENT IS NOT REWRITTEN. `preferredAt` is what the tenant asked
 *     for; a landlord who wants a different time declines and says so, rather
 *     than moving the meeting under someone who has been told it is confirmed.
 *  4. THE TENANT'S PHONE NUMBER reaches the landlord only once they have
 *     confirmed — and never in the request email, which is forwarded far more
 *     casually than a dashboard is shared.
 *  5. NO DUPLICATE LIVE REQUESTS. Refused by the database (a partial unique
 *     index) and surfaced as a sentence rather than a constraint name.
 *  6. NO MONEY, anywhere. The "inspection fee" is the advance-fee scam this
 *     product warns students about, so there is no field for one to land in.
 *
 * Email is mocked. What is under test is that we ASK to send the right message —
 * and, separately, that a send failure cannot undo something already recorded.
 */

vi.mock("../src/lib/email", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../src/lib/email")>();
  return {
    ...actual,
    sendInspectionRequestEmail: vi.fn().mockResolvedValue(undefined),
    sendInspectionDecisionEmail: vi.fn().mockResolvedValue(undefined),
  };
});

import { sendInspectionDecisionEmail, sendInspectionRequestEmail } from "../src/lib/email";

const app = createApp();
const SESSION_COOKIE = "wale_session";

function signedInAs(user: ReturnType<typeof makeUser>) {
  const session = makeSession({ userId: user.id });
  prismaMock.session.findUnique.mockResolvedValue({ ...session, user } as never);
  prismaMock.session.update.mockResolvedValue(session as never);
  return [`${SESSION_COOKIE}=valid-raw-token`];
}

const tenant = () =>
  makeUser({
    id: "usr_tenant",
    email: "ada@wale.test",
    role: "TENANT",
    roles: [{ role: "TENANT" }],
    phone: "+2348012345678",
  });

const landlord = () =>
  makeUser({
    id: "usr_landlord",
    email: "landlord@wale.test",
    role: "LANDLORD",
    roles: [{ role: "LANDLORD" }],
  });

const mover = () => makeUser({ id: "usr_mover", role: "MOVER", roles: [{ role: "MOVER" }] });

const admin = () => makeUser({ id: "usr_admin", role: "ADMIN", roles: [{ role: "ADMIN" }] });

const lawyer = () => makeUser({ id: "usr_lawyer", role: "LAWYER", roles: [{ role: "LAWYER" }] });

/**
 * A viewing time far enough ahead to clear both bounds on any run.
 *
 * Computed rather than hardcoded on purpose: the schema's floor is "in the
 * future", so a fixture date would pass today and start failing the day it went
 * past — and a test that rots into a false failure teaches the next person to
 * ignore the suite.
 */
const PREFERRED_AT = new Date(Date.now() + 3 * 86_400_000).toISOString();

/** A decline reason long enough to clear the floor, written like a real one. */
const DECLINE_REASON = "I'm travelling that weekend — could you do the Saturday after?";

/** What `findFirst` hands `requestInspection`: a listing that is on offer. */
function listingOnOffer(overrides: Record<string, unknown> = {}) {
  return {
    id: "prop_test_1",
    title: "Sunny Studio near UNILAG",
    ownerId: "usr_landlord",
    owner: { email: "landlord@wale.test" },
    ...overrides,
  };
}

/** An unanswered request, as `respondToInspection`'s narrow `select` returns it. */
function pendingRequest(overrides: Record<string, unknown> = {}) {
  return {
    id: "insp_test_1",
    status: "REQUESTED",
    preferredAt: new Date(PREFERRED_AT),
    property: { title: "Sunny Studio near UNILAG" },
    tenant: { email: "ada@wale.test" },
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

beforeEach(() => {
  vi.mocked(sendInspectionRequestEmail).mockClear().mockResolvedValue(undefined);
  vi.mocked(sendInspectionDecisionEmail).mockClear().mockResolvedValue(undefined);
});

/* -------------------------------------------------------- asking to view -- */

describe("POST /inspections/properties/:id — a tenant asks", () => {
  it("records the request against the caller, not against a field they sent", async () => {
    prismaMock.property.findFirst.mockResolvedValue(listingOnOffer() as never);
    prismaMock.inspection.create.mockResolvedValue(makeInspection() as never);

    const res = await send(
      "post",
      "/inspections/properties/prop_test_1",
      // `tenantId` and `status` are sent deliberately: both must be ignored.
      {
        preferredAt: PREFERRED_AT,
        note: "I can only do mornings",
        tenantId: "usr_someone_else",
        status: "CONFIRMED",
      },
      signedInAs(tenant()),
    );

    expect(res.status).toBe(201);
    const data = prismaMock.inspection.create.mock.calls[0]![0].data;
    expect(data.tenantId).toBe("usr_tenant");
    expect(data.note).toBe("I can only do mornings");
    // Absent entirely rather than defaulted here: only a landlord moves a
    // request off REQUESTED, and the column default is what starts it there.
    expect(data).not.toHaveProperty("status");
  });

  it("refuses a request on a listing that is not on offer", async () => {
    // The service's own WHERE clause admits only VERIFIED and
    // PENDING_VERIFICATION, so a draft or suspended listing simply is not found.
    prismaMock.property.findFirst.mockResolvedValue(null);

    const res = await send(
      "post",
      "/inspections/properties/prop_draft",
      { preferredAt: PREFERRED_AT },
      signedInAs(tenant()),
    );

    // 404, not 403: "exists but is hidden" must be indistinguishable from "does
    // not exist" to somebody working through a list of ids.
    expect(res.status).toBe(404);
    expect(prismaMock.inspection.create).not.toHaveBeenCalled();
  });

  it("refuses somebody booking a viewing of their own listing", async () => {
    prismaMock.property.findFirst.mockResolvedValue(
      listingOnOffer({ ownerId: "usr_admin" }) as never,
    );

    const res = await send(
      "post",
      "/inspections/properties/prop_test_1",
      { preferredAt: PREFERRED_AT },
      // An admin holds a role that may ask, and owns this listing.
      signedInAs(admin()),
    );

    expect(res.status).toBe(409);
    expect(prismaMock.inspection.create).not.toHaveBeenCalled();
  });

  it("lets a MOVER ask — somebody moving between places needs this most", async () => {
    prismaMock.property.findFirst.mockResolvedValue(listingOnOffer() as never);
    prismaMock.inspection.create.mockResolvedValue(
      makeInspection({ tenantId: "usr_mover" }) as never,
    );

    const res = await send(
      "post",
      "/inspections/properties/prop_test_1",
      { preferredAt: PREFERRED_AT },
      signedInAs(mover()),
    );

    expect(res.status).toBe(201);
  });

  it("refuses a LANDLORD asking — the request would land in their own queue", async () => {
    const res = await send(
      "post",
      "/inspections/properties/prop_test_1",
      { preferredAt: PREFERRED_AT },
      signedInAs(landlord()),
    );

    // A landlord who is also house-hunting holds the TENANT role too — that is
    // what the multi-role model is for.
    expect(res.status).toBe(403);
    expect(prismaMock.property.findFirst).not.toHaveBeenCalled();
    expect(prismaMock.inspection.create).not.toHaveBeenCalled();
  });

  it("requires a session — a viewing is a named person at a time", async () => {
    const res = await send(
      "post",
      "/inspections/properties/prop_test_1",
      { preferredAt: PREFERRED_AT },
      [],
    );

    expect(res.status).toBe(401);
  });

  it("turns a duplicate live request into a sentence, not a constraint name", async () => {
    prismaMock.property.findFirst.mockResolvedValue(listingOnOffer() as never);
    prismaMock.inspection.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
        code: "P2002",
        clientVersion: "6.19.3",
      }),
    );

    const res = await send(
      "post",
      "/inspections/properties/prop_test_1",
      { preferredAt: PREFERRED_AT },
      signedInAs(tenant()),
    );

    expect(res.status).toBe(409);
    // The tenant is told what to do about it — wait, or cancel and ask again.
    expect(res.body.error.message).toMatch(/already asked/i);
    expect(res.body.error.message).toMatch(/cancel/i);
    // And nothing about indexes, columns, or Prisma reaches them.
    expect(res.body.error.message).not.toMatch(/constraint|index|propertyId|P2002/i);
  });

  it("has no field for an inspection fee, because that is the scam", async () => {
    prismaMock.property.findFirst.mockResolvedValue(listingOnOffer() as never);
    prismaMock.inspection.create.mockResolvedValue(makeInspection() as never);

    const res = await send(
      "post",
      "/inspections/properties/prop_test_1",
      // "Pay ₦5,000 to view" is the advance-fee scam the listing page warns
      // about. A client sending one must not find anything waiting for it.
      { preferredAt: PREFERRED_AT, fee: 5000, amount: 5000 },
      signedInAs(tenant()),
    );

    expect(res.status).toBe(201);
    const data = prismaMock.inspection.create.mock.calls[0]![0].data;
    expect(data).not.toHaveProperty("fee");
    expect(data).not.toHaveProperty("amount");
    // The listing's rent is legitimately in the payload; a charge for the
    // viewing itself is not, under any name.
    const body = JSON.stringify(res.body.data);
    expect(body).not.toMatch(/fee/i);
    expect(body).not.toMatch(/amount/i);
  });
});

describe("POST /inspections/properties/:id — bounding the time", () => {
  it("refuses a time in the past", async () => {
    const res = await send(
      "post",
      "/inspections/properties/prop_test_1",
      { preferredAt: new Date(Date.now() - 86_400_000).toISOString() },
      signedInAs(tenant()),
    );

    expect(res.status).toBe(422);
    expect(res.body.error.details).toEqual([
      expect.objectContaining({ field: "preferredAt" }),
    ]);
    expect(prismaMock.inspection.create).not.toHaveBeenCalled();
  });

  it("refuses a time years out — a typo would sit in the queue looking like work", async () => {
    const res = await send(
      "post",
      "/inspections/properties/prop_test_1",
      { preferredAt: new Date(Date.now() + 500 * 86_400_000).toISOString() },
      signedInAs(tenant()),
    );

    expect(res.status).toBe(422);
    expect(prismaMock.inspection.create).not.toHaveBeenCalled();
  });

  it("refuses a bare date — nobody can be at a property for 'Saturday'", async () => {
    const res = await send(
      "post",
      "/inspections/properties/prop_test_1",
      { preferredAt: "2026-09-05" },
      signedInAs(tenant()),
    );

    expect(res.status).toBe(422);
    expect(prismaMock.inspection.create).not.toHaveBeenCalled();
  });

  it("accepts a time seconds old — a slow tap is not a bad request", async () => {
    prismaMock.property.findFirst.mockResolvedValue(listingOnOffer() as never);
    prismaMock.inspection.create.mockResolvedValue(makeInspection() as never);

    const res = await send(
      "post",
      "/inspections/properties/prop_test_1",
      { preferredAt: new Date(Date.now() - 20_000).toISOString() },
      signedInAs(tenant()),
    );

    // The floor is a few minutes back rather than exactly now, so a tenant on a
    // slow connection is not rejected for taking eleven seconds to hit send.
    expect(res.status).toBe(201);
  });
});

/* -------------------------------------------------------- who may answer -- */

describe("PATCH /inspections/:id/respond — ownership is the query", () => {
  it("scopes a landlord to their own listings", async () => {
    prismaMock.inspection.findFirst.mockResolvedValue(null);

    const res = await send(
      "patch",
      "/inspections/insp_test_1/respond",
      { status: "CONFIRMED" },
      signedInAs(landlord()),
    );

    // A request on somebody else's listing is not found, rather than forbidden.
    expect(res.status).toBe(404);
    expect(prismaMock.inspection.update).not.toHaveBeenCalled();
    // The constraint is part of the lookup, not a check afterwards that a later
    // refactor could drop while the tests still passed.
    expect(prismaMock.inspection.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "insp_test_1", property: { ownerId: "usr_landlord" } },
      }),
    );
  });

  it("does not scope an admin, who reviews every listing's requests", async () => {
    prismaMock.inspection.findFirst.mockResolvedValue(null);

    await send(
      "patch",
      "/inspections/insp_test_1/respond",
      { status: "CONFIRMED" },
      signedInAs(admin()),
    );

    expect(prismaMock.inspection.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "insp_test_1" } }),
    );
  });

  it("refuses a tenant answering their own request", async () => {
    const res = await send(
      "patch",
      "/inspections/insp_test_1/respond",
      { status: "CONFIRMED" },
      signedInAs(tenant()),
    );

    expect(res.status).toBe(403);
    expect(prismaMock.inspection.findFirst).not.toHaveBeenCalled();
  });

  it("lets a lawyer answer, as they can already act on listings", async () => {
    prismaMock.inspection.findFirst.mockResolvedValue(null);

    const res = await send(
      "patch",
      "/inspections/insp_test_1/respond",
      { status: "CONFIRMED" },
      signedInAs(lawyer()),
    );

    // Past the role gate — the 404 is the ownership scope doing its job, which
    // is a different refusal from the role being wrong.
    expect(res.status).toBe(404);
    expect(prismaMock.inspection.findFirst).toHaveBeenCalled();
  });
});

describe("PATCH /inspections/:id/respond — a decline needs a reason", () => {
  it("refuses a decline with no reason at all", async () => {
    const res = await send(
      "patch",
      "/inspections/insp_test_1/respond",
      { status: "DECLINED" },
      signedInAs(landlord()),
    );

    expect(res.status).toBe(422);
    expect(res.body.error.details).toEqual([expect.objectContaining({ field: "response" })]);
    expect(prismaMock.inspection.update).not.toHaveBeenCalled();
  });

  it("refuses a reason that says nothing — 'no' is not a reason", async () => {
    const res = await send(
      "patch",
      "/inspections/insp_test_1/respond",
      { status: "DECLINED", response: "no" },
      signedInAs(landlord()),
    );

    expect(res.status).toBe(422);
    expect(prismaMock.inspection.update).not.toHaveBeenCalled();
  });

  it("tells the landlord the tenant will read what they type", async () => {
    const res = await send(
      "patch",
      "/inspections/insp_test_1/respond",
      { status: "DECLINED" },
      signedInAs(landlord()),
    );

    expect(res.body.error.details[0].message).toMatch(/tenant/i);
  });

  it("does NOT demand one to confirm — there is nothing to explain", async () => {
    prismaMock.inspection.findFirst.mockResolvedValue(pendingRequest() as never);
    prismaMock.inspection.update.mockResolvedValue(
      makeInspection({ status: "CONFIRMED", respondedAt: new Date() }) as never,
    );

    const res = await send(
      "patch",
      "/inspections/insp_test_1/respond",
      { status: "CONFIRMED" },
      signedInAs(landlord()),
    );

    expect(res.status).toBe(200);
  });

  it("passes the decline reason to the tenant word for word", async () => {
    prismaMock.inspection.findFirst.mockResolvedValue(pendingRequest() as never);
    prismaMock.inspection.update.mockResolvedValue(
      makeInspection({
        status: "DECLINED",
        response: DECLINE_REASON,
        respondedAt: new Date(),
      }) as never,
    );

    const res = await send(
      "patch",
      "/inspections/insp_test_1/respond",
      { status: "DECLINED", response: DECLINE_REASON },
      signedInAs(landlord()),
    );

    expect(res.status).toBe(200);
    // Stored verbatim...
    expect(prismaMock.inspection.update.mock.calls[0]![0].data.response).toBe(DECLINE_REASON);
    // ...emailed verbatim...
    expect(sendInspectionDecisionEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "ada@wale.test",
        status: "DECLINED",
        response: DECLINE_REASON,
      }),
    );
    // ...and readable verbatim on the tenant's own dashboard. Asserted in both
    // places because a landlord's words are the tenant's only instruction.
    expect(res.body.data.response).toBe(DECLINE_REASON);
  });

  it("links the tenant to the listing so they can ask for another time", async () => {
    prismaMock.inspection.findFirst.mockResolvedValue(pendingRequest() as never);
    prismaMock.inspection.update.mockResolvedValue(
      makeInspection({
        status: "DECLINED",
        response: DECLINE_REASON,
        respondedAt: new Date(),
      }) as never,
    );

    await send(
      "patch",
      "/inspections/insp_test_1/respond",
      { status: "DECLINED", response: DECLINE_REASON },
      signedInAs(landlord()),
    );

    const { listingUrl } = vi.mocked(sendInspectionDecisionEmail).mock.calls[0]![0];
    expect(listingUrl).toContain("prop_test_1");
    expect(listingUrl).toMatch(/^https?:\/\//);
  });
});

describe("PATCH /inspections/:id/respond — the appointment stays the tenant's", () => {
  it("never rewrites preferredAt, even when the body asks it to", async () => {
    prismaMock.inspection.findFirst.mockResolvedValue(pendingRequest() as never);
    prismaMock.inspection.update.mockResolvedValue(
      makeInspection({ status: "CONFIRMED", respondedAt: new Date() }) as never,
    );

    await send(
      "patch",
      "/inspections/insp_test_1/respond",
      // A landlord moving the appointment silently would leave the tenant at the
      // gate at the time they proposed, having been told it was confirmed.
      {
        status: "CONFIRMED",
        preferredAt: new Date(Date.now() + 40 * 86_400_000).toISOString(),
      },
      signedInAs(landlord()),
    );

    const data = prismaMock.inspection.update.mock.calls[0]![0].data;
    expect(data).not.toHaveProperty("preferredAt");
    expect(data.status).toBe("CONFIRMED");
    expect(data.respondedAt).toBeInstanceOf(Date);
  });

  it("emails the time the TENANT asked for, not one the landlord slipped in", async () => {
    prismaMock.inspection.findFirst.mockResolvedValue(pendingRequest() as never);
    prismaMock.inspection.update.mockResolvedValue(
      makeInspection({ status: "CONFIRMED", respondedAt: new Date() }) as never,
    );

    await send(
      "patch",
      "/inspections/insp_test_1/respond",
      {
        status: "CONFIRMED",
        preferredAt: new Date(Date.now() + 40 * 86_400_000).toISOString(),
      },
      signedInAs(landlord()),
    );

    const { preferredAt } = vi.mocked(sendInspectionDecisionEmail).mock.calls[0]![0];
    expect(preferredAt.toISOString()).toBe(PREFERRED_AT);
  });

  it("refuses to re-decide a request that is already closed", async () => {
    prismaMock.inspection.findFirst.mockResolvedValue(
      pendingRequest({ status: "DECLINED" }) as never,
    );

    const res = await send(
      "patch",
      "/inspections/insp_test_1/respond",
      { status: "CONFIRMED" },
      signedInAs(landlord()),
    );

    // A declined request cannot be quietly confirmed weeks later.
    expect(res.status).toBe(409);
    expect(prismaMock.inspection.update).not.toHaveBeenCalled();
    expect(sendInspectionDecisionEmail).not.toHaveBeenCalled();
  });

  it("says the tenant cancelled, rather than a bare 'already answered'", async () => {
    prismaMock.inspection.findFirst.mockResolvedValue(
      pendingRequest({ status: "CANCELLED" }) as never,
    );

    const res = await send(
      "patch",
      "/inspections/insp_test_1/respond",
      { status: "CONFIRMED" },
      signedInAs(landlord()),
    );

    expect(res.status).toBe(409);
    expect(res.body.error.message).toMatch(/cancelled/i);
  });

  it("refuses to re-confirm something already confirmed", async () => {
    prismaMock.inspection.findFirst.mockResolvedValue(
      pendingRequest({ status: "CONFIRMED" }) as never,
    );

    const res = await send(
      "patch",
      "/inspections/insp_test_1/respond",
      { status: "CONFIRMED" },
      signedInAs(landlord()),
    );

    // And no second confirmation email for a decision that has not changed.
    expect(res.status).toBe(409);
    expect(sendInspectionDecisionEmail).not.toHaveBeenCalled();
  });

  it("still lets a confirmed viewing be declined — plans fall through", async () => {
    prismaMock.inspection.findFirst.mockResolvedValue(
      pendingRequest({ status: "CONFIRMED" }) as never,
    );
    prismaMock.inspection.update.mockResolvedValue(
      makeInspection({
        status: "DECLINED",
        response: DECLINE_REASON,
        respondedAt: new Date(),
      }) as never,
    );

    const res = await send(
      "patch",
      "/inspections/insp_test_1/respond",
      { status: "DECLINED", response: DECLINE_REASON },
      signedInAs(landlord()),
    );

    expect(res.status).toBe(200);
    // And the tenant hears about it, which is the whole point of allowing it.
    expect(sendInspectionDecisionEmail).toHaveBeenCalled();
  });

  it("refuses marking a viewing done that was never confirmed", async () => {
    prismaMock.inspection.findFirst.mockResolvedValue(pendingRequest() as never);

    const res = await send(
      "patch",
      "/inspections/insp_test_1/respond",
      { status: "COMPLETED" },
      signedInAs(landlord()),
    );

    expect(res.status).toBe(409);
    expect(res.body.error.message).toMatch(/confirm/i);
    expect(prismaMock.inspection.update).not.toHaveBeenCalled();
  });

  it("does not email a tenant that the viewing they attended happened", async () => {
    prismaMock.inspection.findFirst.mockResolvedValue(
      pendingRequest({ status: "CONFIRMED" }) as never,
    );
    prismaMock.inspection.update.mockResolvedValue(
      makeInspection({ status: "COMPLETED", respondedAt: new Date() }) as never,
    );

    const res = await send(
      "patch",
      "/inspections/insp_test_1/respond",
      { status: "COMPLETED" },
      signedInAs(landlord()),
    );

    expect(res.status).toBe(200);
    // COMPLETED is bookkeeping between the landlord and us; the tenant was there.
    expect(sendInspectionDecisionEmail).not.toHaveBeenCalled();
  });

  it("does not undo a committed decision because the mail server failed", async () => {
    prismaMock.inspection.findFirst.mockResolvedValue(pendingRequest() as never);
    prismaMock.inspection.update.mockResolvedValue(
      makeInspection({ status: "CONFIRMED", respondedAt: new Date() }) as never,
    );
    vi.mocked(sendInspectionDecisionEmail).mockRejectedValue(new Error("smtp is down"));

    const res = await send(
      "patch",
      "/inspections/insp_test_1/respond",
      { status: "CONFIRMED" },
      signedInAs(landlord()),
    );

    // Both sides can see the decision on their dashboard. A 500 here would
    // invite the landlord to click again on something that already happened.
    expect(res.status).toBe(200);
    expect(prismaMock.inspection.update).toHaveBeenCalled();
  });

  it("refuses a status the landlord has no business setting", async () => {
    for (const status of ["REQUESTED", "CANCELLED", "NONSENSE"]) {
      const res = await send(
        "patch",
        "/inspections/insp_test_1/respond",
        { status },
        signedInAs(landlord()),
      );

      // Un-answering would leave a tenant holding a confirmation they can no
      // longer rely on; cancelling belongs to the person who cannot make it.
      expect(res.status).toBe(422);
    }
    expect(prismaMock.inspection.update).not.toHaveBeenCalled();
  });
});

/* -------------------------------------------- the tenant's phone number -- */

describe("the tenant's phone number", () => {
  it("is withheld from the landlord while the request is unanswered", async () => {
    prismaMock.inspection.findMany.mockResolvedValue([makeInspection()] as never);
    prismaMock.inspection.count.mockResolvedValue(1 as never);

    const res = await request(app)
      .get(`${API}/inspections/incoming`)
      .set("Cookie", signedInAs(landlord()));

    expect(res.status).toBe(200);
    const [row] = res.body.data.inspections;
    // The name, yes — a landlord needs to know who is asking.
    expect(row.tenant.name).toBe("Ada Student");
    expect(row.tenant.phone).toBeUndefined();
    // And it is nowhere else in the payload either. Without this, a stream of
    // requests is a stream of students' phone numbers to whoever posts a listing.
    expect(JSON.stringify(res.body)).not.toContain("2348012345678");
  });

  it("reaches the landlord once they have confirmed the viewing", async () => {
    prismaMock.inspection.findMany.mockResolvedValue([
      makeInspection({ status: "CONFIRMED", respondedAt: new Date() }),
    ] as never);
    prismaMock.inspection.count.mockResolvedValue(1 as never);

    const res = await request(app)
      .get(`${API}/inspections/incoming`)
      .set("Cookie", signedInAs(landlord()));

    expect(res.status).toBe(200);
    // Two people have now arranged to meet at an address; withholding it here
    // would be obstruction rather than privacy.
    expect(res.body.data.inspections[0].tenant.phone).toBe("+2348012345678");
  });

  it("is withheld again once the request is cancelled", async () => {
    prismaMock.inspection.findMany.mockResolvedValue([
      makeInspection({ status: "CANCELLED", respondedAt: new Date() }),
    ] as never);
    prismaMock.inspection.count.mockResolvedValue(1 as never);

    const res = await request(app)
      .get(`${API}/inspections/incoming`)
      .set("Cookie", signedInAs(landlord()));

    expect(res.body.data.inspections[0].tenant.phone).toBeUndefined();
  });

  it("is not in the email that tells the landlord about the request", async () => {
    prismaMock.property.findFirst.mockResolvedValue(listingOnOffer() as never);
    prismaMock.inspection.create.mockResolvedValue(makeInspection() as never);

    await send(
      "post",
      "/inspections/properties/prop_test_1",
      { preferredAt: PREFERRED_AT, note: "I can only do mornings" },
      signedInAs(tenant()),
    );

    expect(sendInspectionRequestEmail).toHaveBeenCalled();
    const args = vi.mocked(sendInspectionRequestEmail).mock.calls[0]![0];
    // An email is forwarded far more casually than a dashboard is shared.
    expect(JSON.stringify(args)).not.toContain("2348012345678");
    // It still has to be actionable away from the dashboard: the time and note.
    expect(args.note).toBe("I can only do mornings");
    expect(args.queueUrl).toMatch(/^https?:\/\//);
  });

  it("still records the request when no account is behind the listing", async () => {
    // The seeded catalogue is ownerless. A request on one of those must work.
    prismaMock.property.findFirst.mockResolvedValue(
      listingOnOffer({ ownerId: null, owner: null }) as never,
    );
    prismaMock.inspection.create.mockResolvedValue(makeInspection() as never);

    const res = await send(
      "post",
      "/inspections/properties/prop_test_1",
      { preferredAt: PREFERRED_AT },
      signedInAs(tenant()),
    );

    expect(res.status).toBe(201);
    expect(sendInspectionRequestEmail).not.toHaveBeenCalled();
  });
});

/* --------------------------------------------------------- the two lists -- */

describe("GET /inspections/mine — the tenant's own requests", () => {
  it("is scoped to the caller, with no way to ask for somebody else's", async () => {
    prismaMock.inspection.findMany.mockResolvedValue([makeInspection()] as never);
    prismaMock.inspection.count.mockResolvedValue(1 as never);

    const res = await request(app)
      .get(`${API}/inspections/mine?tenantId=usr_landlord`)
      .set("Cookie", signedInAs(tenant()));

    expect(res.status).toBe(200);
    // The smuggled `tenantId` is not in the WHERE clause at all.
    expect(prismaMock.inspection.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { tenantId: "usr_tenant" } }),
    );
  });

  it("narrows to what is still outstanding when asked", async () => {
    prismaMock.inspection.findMany.mockResolvedValue([] as never);
    prismaMock.inspection.count.mockResolvedValue(0 as never);

    await request(app)
      .get(`${API}/inspections/mine?status=REQUESTED`)
      .set("Cookie", signedInAs(tenant()));

    expect(prismaMock.inspection.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { tenantId: "usr_tenant", status: "REQUESTED" } }),
    );
  });

  it("rejects a status that is not a real one", async () => {
    const res = await request(app)
      .get(`${API}/inspections/mine?status=NONSENSE`)
      .set("Cookie", signedInAs(tenant()));

    expect(res.status).toBe(422);
    expect(prismaMock.inspection.findMany).not.toHaveBeenCalled();
  });

  it("does not hand the tenant a block about themselves", async () => {
    prismaMock.inspection.findMany.mockResolvedValue([makeInspection()] as never);
    prismaMock.inspection.count.mockResolvedValue(1 as never);

    const res = await request(app)
      .get(`${API}/inspections/mine`)
      .set("Cookie", signedInAs(tenant()));

    // Their view carries the listing and the landlord's answer, nothing else.
    expect(res.body.data.inspections[0]).not.toHaveProperty("tenant");
    expect(res.body.data.inspections[0].property.title).toBe("Sunny Studio near UNILAG");
  });

  it("requires a session", async () => {
    const res = await request(app).get(`${API}/inspections/mine`);

    expect(res.status).toBe(401);
  });
});

describe("GET /inspections/incoming — the landlord's queue", () => {
  it("shows only the caller's own listings' requests, soonest first", async () => {
    prismaMock.inspection.findMany.mockResolvedValue([] as never);
    prismaMock.inspection.count.mockResolvedValue(0 as never);

    await request(app)
      .get(`${API}/inspections/incoming`)
      .set("Cookie", signedInAs(landlord()));

    expect(prismaMock.inspection.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { property: { ownerId: "usr_landlord" } },
        // By the requested TIME, not by arrival: a queue sorted newest-first
        // buries tomorrow's viewing under three requests for next month.
        orderBy: [{ preferredAt: "asc" }, { id: "desc" }],
      }),
    );
  });

  it("shows an admin every listing's requests", async () => {
    prismaMock.inspection.findMany.mockResolvedValue([] as never);
    prismaMock.inspection.count.mockResolvedValue(0 as never);

    await request(app)
      .get(`${API}/inspections/incoming`)
      .set("Cookie", signedInAs(admin()));

    expect(prismaMock.inspection.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: {} }),
    );
  });

  it("FORBIDS a tenant — this is not their queue", async () => {
    const res = await request(app)
      .get(`${API}/inspections/incoming`)
      .set("Cookie", signedInAs(tenant()));

    expect(res.status).toBe(403);
    expect(prismaMock.inspection.findMany).not.toHaveBeenCalled();
  });

  it("requires a session", async () => {
    const res = await request(app).get(`${API}/inspections/incoming`);

    expect(res.status).toBe(401);
  });
});

/* ------------------------------------------- what the listing page asks -- */

describe("GET /inspections/properties/:id/mine", () => {
  it("answers 'you have not asked' with a success, not a 404", async () => {
    prismaMock.inspection.findFirst.mockResolvedValue(null);

    const res = await request(app)
      .get(`${API}/inspections/properties/prop_test_1/mine`)
      .set("Cookie", signedInAs(tenant()));

    // It is the answer to the question the listing page asked, not a missing
    // resource — the button has to render either way.
    expect(res.status).toBe(200);
    expect(res.body.data.inspection).toBeNull();
  });

  it("returns the live request so the button can say so", async () => {
    prismaMock.inspection.findFirst.mockResolvedValue(makeInspection() as never);

    const res = await request(app)
      .get(`${API}/inspections/properties/prop_test_1/mine`)
      .set("Cookie", signedInAs(tenant()));

    expect(res.status).toBe(200);
    expect(res.body.data.inspection.status).toBe("REQUESTED");
    // Scoped to the caller and to live requests only: a declined one from last
    // month must not stop them asking again.
    expect(prismaMock.inspection.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          propertyId: "prop_test_1",
          tenantId: "usr_tenant",
          status: { in: ["REQUESTED", "CONFIRMED"] },
        },
      }),
    );
  });

  it("requires a session — the answer is per-viewer", async () => {
    const res = await request(app).get(`${API}/inspections/properties/prop_test_1/mine`);

    expect(res.status).toBe(401);
  });
});

/* ------------------------------------------------------------ cancelling -- */

describe("POST /inspections/:id/cancel — the tenant's alone", () => {
  it("is scoped to the caller's own requests", async () => {
    prismaMock.inspection.findFirst.mockResolvedValue(null);

    const res = await send(
      "post",
      "/inspections/insp_test_1/cancel",
      undefined,
      signedInAs(tenant()),
    );

    expect(res.status).toBe(404);
    expect(prismaMock.inspection.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "insp_test_1", tenantId: "usr_tenant" } }),
    );
  });

  it("marks the row cancelled rather than deleting it", async () => {
    prismaMock.inspection.findFirst.mockResolvedValue({
      id: "insp_test_1",
      status: "REQUESTED",
    } as never);
    prismaMock.inspection.update.mockResolvedValue(
      makeInspection({ status: "CANCELLED", respondedAt: new Date() }) as never,
    );

    const res = await send(
      "post",
      "/inspections/insp_test_1/cancel",
      undefined,
      signedInAs(tenant()),
    );

    expect(res.status).toBe(200);
    // A landlord who blocked out Saturday morning should see it was called off,
    // not find the request vanished.
    expect(prismaMock.inspection.delete).not.toHaveBeenCalled();
    expect(prismaMock.inspection.update.mock.calls[0]![0].data.status).toBe("CANCELLED");
  });

  it("lets a tenant cancel a CONFIRMED viewing — the alternative is a landlord at a gate", async () => {
    prismaMock.inspection.findFirst.mockResolvedValue({
      id: "insp_test_1",
      status: "CONFIRMED",
    } as never);
    prismaMock.inspection.update.mockResolvedValue(
      makeInspection({ status: "CANCELLED", respondedAt: new Date() }) as never,
    );

    const res = await send(
      "post",
      "/inspections/insp_test_1/cancel",
      undefined,
      signedInAs(tenant()),
    );

    expect(res.status).toBe(200);
  });

  it("refuses to cancel one that is already closed", async () => {
    prismaMock.inspection.findFirst.mockResolvedValue({
      id: "insp_test_1",
      status: "DECLINED",
    } as never);

    const res = await send(
      "post",
      "/inspections/insp_test_1/cancel",
      undefined,
      signedInAs(tenant()),
    );

    expect(res.status).toBe(409);
    expect(prismaMock.inspection.update).not.toHaveBeenCalled();
  });

  it("does not let a landlord cancel on the tenant's behalf", async () => {
    prismaMock.inspection.findFirst.mockResolvedValue(null);

    const res = await send(
      "post",
      "/inspections/insp_test_1/cancel",
      undefined,
      signedInAs(landlord()),
    );

    // There is no role gate on this route — the tenant scope in the query is
    // what stops it, and a landlord's own id will never match the tenant's.
    expect(res.status).toBe(404);
    expect(prismaMock.inspection.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "insp_test_1", tenantId: "usr_landlord" } }),
    );
    expect(prismaMock.inspection.update).not.toHaveBeenCalled();
  });
});

/* ------------------------------------------------------------------ CSRF -- */

describe("CSRF", () => {
  it("refuses a request with no CSRF token", async () => {
    const res = await request(app)
      .post(`${API}/inspections/properties/prop_test_1`)
      .set("Cookie", signedInAs(tenant()))
      .send({ preferredAt: PREFERRED_AT });

    expect(res.status).toBe(403);
    expect(prismaMock.inspection.create).not.toHaveBeenCalled();
  });

  it("refuses a decision with no CSRF token", async () => {
    const res = await request(app)
      .patch(`${API}/inspections/insp_test_1/respond`)
      .set("Cookie", signedInAs(landlord()))
      .send({ status: "CONFIRMED" });

    expect(res.status).toBe(403);
    expect(prismaMock.inspection.update).not.toHaveBeenCalled();
  });

  it("refuses a cancellation with no CSRF token", async () => {
    const res = await request(app)
      .post(`${API}/inspections/insp_test_1/cancel`)
      .set("Cookie", signedInAs(tenant()));

    expect(res.status).toBe(403);
    expect(prismaMock.inspection.update).not.toHaveBeenCalled();
  });
});
