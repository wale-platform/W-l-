import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { createApp } from "../src/app";
import { API, getCsrf } from "./helpers";
import { prismaMock } from "./setup";
import { makeProperty, makeSession, makeUser, makeVerification } from "./factories";

/**
 * The verification workflow: who may decide, what gets recorded, and what the
 * landlord is told.
 *
 * Three claims, and they are separable — a change can satisfy any two and break
 * the third:
 *
 *  1. ONLY AN ADMIN decides. A landlord cannot hand themselves a verified badge,
 *     and neither can a lawyer. Enforced on the server, so it holds no matter
 *     what the frontend renders.
 *  2. EVERY TRANSITION IS RECORDED, in the same transaction as the status change.
 *     A decision that committed without its audit row would leave a landlord
 *     looking at a bare "Rejected" with nothing to act on, and would leave a
 *     dispute with no record of who decided what.
 *  3. THE REASON REACHES THE LANDLORD, word for word. It is the only thing that
 *     tells them what to fix, so it is asserted verbatim rather than by shape,
 *     and it is asserted in both places they can read it — the email and their
 *     own dashboard.
 *
 * Email delivery is mocked. What is under test is that we ASK to send the right
 * message, and — separately — that failing to send one cannot undo a decision
 * that is already committed.
 */

vi.mock("../src/lib/email", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../src/lib/email")>();
  return { ...actual, sendListingDecisionEmail: vi.fn().mockResolvedValue(undefined) };
});

import { sendListingDecisionEmail } from "../src/lib/email";

const app = createApp();
const SESSION_COOKIE = "wale_session";

function signedInAs(user: ReturnType<typeof makeUser>) {
  const session = makeSession({ userId: user.id });
  prismaMock.session.findUnique.mockResolvedValue({ ...session, user } as never);
  prismaMock.session.update.mockResolvedValue(session as never);
  return [`${SESSION_COOKIE}=valid-raw-token`];
}

const admin = () =>
  makeUser({
    id: "usr_admin",
    email: "reviewer@wale.test",
    firstName: "Chidi",
    lastName: "Reviewer",
    role: "ADMIN",
    roles: [{ role: "ADMIN" }],
  });

const landlord = () =>
  makeUser({
    id: "usr_landlord",
    email: "landlord@wale.test",
    role: "LANDLORD",
    roles: [{ role: "LANDLORD" }],
    phone: "+2348012345678",
  });

const lawyer = () =>
  makeUser({ id: "usr_lawyer", role: "LAWYER", roles: [{ role: "LAWYER" }] });

/** A rejection reason long enough to clear the floor, written like a real one. */
const REASON = "The second photo shows a different building. Replace it and resubmit.";

/** What `findUnique` returns to `setPropertyStatus` — a pending listing with an owner. */
function pendingListing(overrides: Record<string, unknown> = {}) {
  return {
    id: "prop_1",
    status: "PENDING_VERIFICATION",
    title: "Bright two-bedroom flat in Akoka",
    owner: { id: "usr_landlord", email: "landlord@wale.test" },
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
  vi.mocked(sendListingDecisionEmail).mockClear();
  vi.mocked(sendListingDecisionEmail).mockResolvedValue(undefined);
});

/* ------------------------------------------------------ the decision -- */

describe("PATCH /properties/:id/status — the audit trail", () => {
  it("writes the decision and the new status in ONE transaction", async () => {
    prismaMock.property.findUnique.mockResolvedValue(pendingListing() as never);
    prismaMock.property.update.mockResolvedValue(
      makeProperty({ status: "VERIFIED" }) as never,
    );

    const res = await send(
      "patch",
      "/properties/prop_1/status",
      { status: "VERIFIED" },
      signedInAs(admin()),
    );

    expect(res.status).toBe(200);
    expect(prismaMock.$transaction).toHaveBeenCalled();
    expect(prismaMock.propertyVerification.create).toHaveBeenCalledWith({
      data: {
        propertyId: "prop_1",
        fromStatus: "PENDING_VERIFICATION",
        toStatus: "VERIFIED",
        reason: null,
        actorId: "usr_admin",
      },
    });
  });

  it("records WHO decided, not just what was decided", async () => {
    prismaMock.property.findUnique.mockResolvedValue(pendingListing() as never);
    prismaMock.property.update.mockResolvedValue(
      makeProperty({ status: "REJECTED" }) as never,
    );

    await send(
      "patch",
      "/properties/prop_1/status",
      { status: "REJECTED", reason: REASON },
      signedInAs(admin()),
    );

    const row = prismaMock.propertyVerification.create.mock.calls[0]![0].data;
    expect(row.actorId).toBe("usr_admin");
    // Verbatim. A reviewer's words are the landlord's only instruction.
    expect(row.reason).toBe(REASON);
  });

  it("refuses to re-decide the status a listing is already in", async () => {
    prismaMock.property.findUnique.mockResolvedValue(
      pendingListing({ status: "VERIFIED" }) as never,
    );

    const res = await send(
      "patch",
      "/properties/prop_1/status",
      { status: "VERIFIED" },
      signedInAs(admin()),
    );

    expect(res.status).toBe(409);
    // No row saying nothing changed, and no pointless email.
    expect(prismaMock.propertyVerification.create).not.toHaveBeenCalled();
    expect(sendListingDecisionEmail).not.toHaveBeenCalled();
  });

  it("404s on a listing that does not exist, before writing anything", async () => {
    prismaMock.property.findUnique.mockResolvedValue(null);

    const res = await send(
      "patch",
      "/properties/prop_ghost/status",
      { status: "VERIFIED" },
      signedInAs(admin()),
    );

    expect(res.status).toBe(404);
    expect(prismaMock.propertyVerification.create).not.toHaveBeenCalled();
  });
});

describe("PATCH /properties/:id/status — a punitive decision needs a reason", () => {
  it("refuses a rejection with no reason at all", async () => {
    const res = await send(
      "patch",
      "/properties/prop_1/status",
      { status: "REJECTED" },
      signedInAs(admin()),
    );

    expect(res.status).toBe(422);
    expect(res.body.error.details).toEqual([expect.objectContaining({ field: "reason" })]);
    expect(prismaMock.property.update).not.toHaveBeenCalled();
  });

  it("refuses a reason that says nothing — 'no' is not a reason", async () => {
    const res = await send(
      "patch",
      "/properties/prop_1/status",
      { status: "REJECTED", reason: "no" },
      signedInAs(admin()),
    );

    expect(res.status).toBe(422);
    expect(prismaMock.property.update).not.toHaveBeenCalled();
  });

  it("refuses a suspension with no reason — taking a listing down needs explaining", async () => {
    const res = await send(
      "patch",
      "/properties/prop_1/status",
      { status: "SUSPENDED" },
      signedInAs(admin()),
    );

    expect(res.status).toBe(422);
    expect(prismaMock.property.update).not.toHaveBeenCalled();
  });

  it("does NOT demand one for an approval — there is nothing to explain", async () => {
    prismaMock.property.findUnique.mockResolvedValue(pendingListing() as never);
    prismaMock.property.update.mockResolvedValue(
      makeProperty({ status: "VERIFIED" }) as never,
    );

    const res = await send(
      "patch",
      "/properties/prop_1/status",
      { status: "VERIFIED" },
      signedInAs(admin()),
    );

    expect(res.status).toBe(200);
  });

  it("tells the reviewer the landlord will read what they type", async () => {
    const res = await send(
      "patch",
      "/properties/prop_1/status",
      { status: "REJECTED" },
      signedInAs(admin()),
    );

    expect(res.body.error.details[0].message).toMatch(/landlord/i);
  });
});

/* -------------------------------------------------- telling the owner -- */

describe("PATCH /properties/:id/status — the owner is told", () => {
  it("emails the owner the decision and the reviewer's own words", async () => {
    prismaMock.property.findUnique.mockResolvedValue(pendingListing() as never);
    prismaMock.property.update.mockResolvedValue(
      makeProperty({ status: "REJECTED" }) as never,
    );

    await send(
      "patch",
      "/properties/prop_1/status",
      { status: "REJECTED", reason: REASON },
      signedInAs(admin()),
    );

    expect(sendListingDecisionEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "landlord@wale.test",
        title: "Bright two-bedroom flat in Akoka",
        status: "REJECTED",
        reason: REASON,
      }),
    );
  });

  it("links them to the listing, not to a bare dashboard", async () => {
    prismaMock.property.findUnique.mockResolvedValue(pendingListing() as never);
    prismaMock.property.update.mockResolvedValue(
      makeProperty({ status: "REJECTED" }) as never,
    );

    await send(
      "patch",
      "/properties/prop_1/status",
      { status: "REJECTED", reason: REASON },
      signedInAs(admin()),
    );

    const { listingUrl } = vi.mocked(sendListingDecisionEmail).mock.calls[0]![0];
    expect(listingUrl).toContain("prop_1");
    expect(listingUrl).toMatch(/^https?:\/\//);
  });

  it("still decides when the listing has no owner account behind it", async () => {
    // The seeded catalogue is ownerless. A decision on one of those must work.
    prismaMock.property.findUnique.mockResolvedValue(pendingListing({ owner: null }) as never);
    prismaMock.property.update.mockResolvedValue(
      makeProperty({ status: "VERIFIED" }) as never,
    );

    const res = await send(
      "patch",
      "/properties/prop_1/status",
      { status: "VERIFIED" },
      signedInAs(admin()),
    );

    expect(res.status).toBe(200);
    expect(prismaMock.propertyVerification.create).toHaveBeenCalled();
    expect(sendListingDecisionEmail).not.toHaveBeenCalled();
  });

  it("does not undo a committed decision because the mail server failed", async () => {
    prismaMock.property.findUnique.mockResolvedValue(pendingListing() as never);
    prismaMock.property.update.mockResolvedValue(
      makeProperty({ status: "VERIFIED" }) as never,
    );
    vi.mocked(sendListingDecisionEmail).mockRejectedValue(new Error("smtp is down"));

    const res = await send(
      "patch",
      "/properties/prop_1/status",
      { status: "VERIFIED" },
      signedInAs(admin()),
    );

    // The decision was made and recorded; the landlord still sees it on their
    // dashboard. A 500 here would invite the admin to click again and append a
    // second row for a decision that already happened.
    expect(res.status).toBe(200);
    expect(prismaMock.property.update).toHaveBeenCalled();
  });
});

/* ---------------------------------------- what the owner sees afterwards -- */

describe("the reason travels with the listing", () => {
  it("shows the owner why their listing was rejected", async () => {
    prismaMock.property.findFirst.mockResolvedValue(
      makeProperty({
        id: "prop_1",
        ownerId: "usr_landlord",
        status: "REJECTED",
        verifications: [makeVerification({ reason: REASON })],
      } as never) as never,
    );

    const res = await request(app)
      .get(`${API}/properties/mine/prop_1`)
      .set("Cookie", signedInAs(landlord()));

    expect(res.status).toBe(200);
    expect(res.body.data.statusReason).toBe(REASON);
    expect(res.body.data.statusChangedAt).toBeTruthy();
  });

  it("hides a reason that no longer explains the current status", async () => {
    // Rejected, fixed, resubmitted. The listing is pending again; showing the old
    // complaint would describe a problem the landlord has already dealt with.
    prismaMock.property.findFirst.mockResolvedValue(
      makeProperty({
        id: "prop_1",
        ownerId: "usr_landlord",
        status: "PENDING_VERIFICATION",
        verifications: [makeVerification({ toStatus: "REJECTED", reason: REASON })],
      } as never) as never,
    );

    const res = await request(app)
      .get(`${API}/properties/mine/prop_1`)
      .set("Cookie", signedInAs(landlord()));

    expect(res.body.data.statusReason).toBeUndefined();
  });

  it("never leaks the reason onto the PUBLIC listing", async () => {
    prismaMock.property.findFirst.mockResolvedValue(
      makeProperty({
        status: "VERIFIED",
        verifications: [makeVerification({ toStatus: "VERIFIED", reason: "internal note" })],
      } as never) as never,
    );

    const res = await request(app).get(`${API}/properties/prop_1`);

    expect(res.status).toBe(200);
    expect(res.body.data.statusReason).toBeUndefined();
    expect(res.body.data.status).toBeUndefined();
  });
});

/* -------------------------------------------------------- review queue -- */

describe("GET /properties/review-queue", () => {
  it("is not reachable without a session", async () => {
    const res = await request(app).get(`${API}/properties/review-queue`);

    expect(res.status).toBe(401);
  });

  it("FORBIDS a landlord — this is not their queue", async () => {
    const res = await request(app)
      .get(`${API}/properties/review-queue`)
      .set("Cookie", signedInAs(landlord()));

    expect(res.status).toBe(403);
    expect(prismaMock.property.findMany).not.toHaveBeenCalled();
  });

  it("shows an admin what is waiting, oldest first", async () => {
    prismaMock.property.findMany.mockResolvedValue([
      makeProperty({ status: "PENDING_VERIFICATION" }),
    ] as never);
    prismaMock.property.count.mockResolvedValue(1);

    const res = await request(app)
      .get(`${API}/properties/review-queue`)
      .set("Cookie", signedInAs(admin()));

    expect(res.status).toBe(200);
    expect(res.body.data.properties[0].status).toBe("PENDING_VERIFICATION");
    // "review-queue" must not have been read as a property id.
    expect(prismaMock.property.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { status: "PENDING_VERIFICATION" },
        // Nobody starves: whoever has waited longest is reviewed first.
        orderBy: [{ updatedAt: "asc" }, { id: "desc" }],
      }),
    );
  });

  it("lets an admin go back over what was rejected", async () => {
    prismaMock.property.findMany.mockResolvedValue([] as never);
    prismaMock.property.count.mockResolvedValue(0);

    await request(app)
      .get(`${API}/properties/review-queue?status=REJECTED`)
      .set("Cookie", signedInAs(admin()));

    expect(prismaMock.property.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { status: "REJECTED" } }),
    );
  });

  it("rejects a status that is not a real lifecycle state", async () => {
    const res = await request(app)
      .get(`${API}/properties/review-queue?status=NONSENSE`)
      .set("Cookie", signedInAs(admin()));

    expect(res.status).toBe(422);
    expect(prismaMock.property.findMany).not.toHaveBeenCalled();
  });
});

/* ------------------------------------------------------------- history -- */

describe("GET /properties/:id/history", () => {
  const historyRows = [
    {
      ...makeVerification(),
      actor: { id: "usr_admin", firstName: "Chidi", lastName: "Reviewer" },
    },
  ];

  it("requires a session", async () => {
    const res = await request(app).get(`${API}/properties/prop_1/history`);

    expect(res.status).toBe(401);
  });

  it("lets an owner read the history of their own listing", async () => {
    prismaMock.property.findFirst.mockResolvedValue({ id: "prop_1" } as never);
    prismaMock.propertyVerification.findMany.mockResolvedValue(historyRows as never);

    const res = await request(app)
      .get(`${API}/properties/prop_1/history`)
      .set("Cookie", signedInAs(landlord()));

    expect(res.status).toBe(200);
    expect(res.body.data.history).toHaveLength(1);
    expect(res.body.data.history[0]).toMatchObject({
      fromStatus: "PENDING_VERIFICATION",
      toStatus: "REJECTED",
      actor: { name: "Chidi Reviewer" },
    });
    // Scoped by ownership in the query, not by a check the handler could skip.
    expect(prismaMock.property.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "prop_1", ownerId: "usr_landlord" } }),
    );
  });

  it("does not hand a reviewer's email address to the landlord", async () => {
    prismaMock.property.findFirst.mockResolvedValue({ id: "prop_1" } as never);
    prismaMock.propertyVerification.findMany.mockResolvedValue(historyRows as never);

    const res = await request(app)
      .get(`${API}/properties/prop_1/history`)
      .set("Cookie", signedInAs(landlord()));

    expect(JSON.stringify(res.body)).not.toContain("reviewer@wale.test");
    expect(res.body.data.history[0].actor).not.toHaveProperty("email");
  });

  it("404s on someone else's listing rather than confirming it exists", async () => {
    prismaMock.property.findFirst.mockResolvedValue(null);

    const res = await request(app)
      .get(`${API}/properties/prop_other/history`)
      .set("Cookie", signedInAs(landlord()));

    expect(res.status).toBe(404);
    expect(prismaMock.propertyVerification.findMany).not.toHaveBeenCalled();
  });

  it("lets an admin read any listing's history", async () => {
    prismaMock.property.findFirst.mockResolvedValue({ id: "prop_1" } as never);
    prismaMock.propertyVerification.findMany.mockResolvedValue(historyRows as never);

    const res = await request(app)
      .get(`${API}/properties/prop_1/history`)
      .set("Cookie", signedInAs(admin()));

    expect(res.status).toBe(200);
    expect(prismaMock.property.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "prop_1" } }),
    );
  });

  it("survives a decision whose actor account has since been deleted", async () => {
    // actorId is SET NULL, deliberately: what was decided outlives who decided it.
    prismaMock.property.findFirst.mockResolvedValue({ id: "prop_1" } as never);
    prismaMock.propertyVerification.findMany.mockResolvedValue([
      { ...makeVerification({ actorId: null }), actor: null },
    ] as never);

    const res = await request(app)
      .get(`${API}/properties/prop_1/history`)
      .set("Cookie", signedInAs(landlord()));

    expect(res.status).toBe(200);
    expect(res.body.data.history[0].actor).toBeNull();
    expect(res.body.data.history[0].reason).toBe(makeVerification().reason);
  });
});

/* --------------------------------------- the owner's half of the trail -- */

describe("owner transitions are recorded too", () => {
  it("records a submission, with the owner as the actor", async () => {
    prismaMock.property.findFirst.mockResolvedValue({
      id: "prop_1",
      status: "DRAFT",
      _count: { images: 2 },
    } as never);
    prismaMock.property.update.mockResolvedValue(
      makeProperty({ status: "PENDING_VERIFICATION" }) as never,
    );

    await send("post", "/properties/prop_1/submit", undefined, signedInAs(landlord()));

    expect(prismaMock.propertyVerification.create).toHaveBeenCalledWith({
      data: {
        propertyId: "prop_1",
        fromStatus: "DRAFT",
        toStatus: "PENDING_VERIFICATION",
        // Nobody wrote the owner an explanation, so there is none to show them.
        reason: null,
        actorId: "usr_landlord",
      },
    });
  });

  it("dates a resubmission after a rejection — it says the landlord responded", async () => {
    prismaMock.property.findFirst.mockResolvedValue({
      id: "prop_1",
      status: "REJECTED",
      _count: { images: 2 },
    } as never);
    prismaMock.property.update.mockResolvedValue(
      makeProperty({ status: "PENDING_VERIFICATION" }) as never,
    );

    await send("post", "/properties/prop_1/submit", undefined, signedInAs(landlord()));

    expect(prismaMock.propertyVerification.create.mock.calls[0]![0].data.fromStatus).toBe(
      "REJECTED",
    );
  });

  it("writes nothing when a submission is refused", async () => {
    prismaMock.property.findFirst.mockResolvedValue({
      id: "prop_1",
      status: "DRAFT",
      _count: { images: 0 },
    } as never);

    const res = await send("post", "/properties/prop_1/submit", undefined, signedInAs(landlord()));

    expect(res.status).toBe(422);
    expect(prismaMock.propertyVerification.create).not.toHaveBeenCalled();
  });

  it("records WHY a verified listing went back to pending after an edit", async () => {
    prismaMock.property.findFirst.mockResolvedValue({
      id: "prop_1",
      status: "VERIFIED",
    } as never);
    prismaMock.property.update.mockResolvedValue(
      makeProperty({ status: "PENDING_VERIFICATION" }) as never,
    );

    await send(
      "patch",
      "/properties/prop_1",
      { price: 2_000_000 },
      signedInAs(landlord()),
    );

    const row = prismaMock.propertyVerification.create.mock.calls[0]![0].data;
    expect(row).toMatchObject({
      fromStatus: "VERIFIED",
      toStatus: "PENDING_VERIFICATION",
      actorId: "usr_landlord",
    });
    // An admin picking this out of the queue can tell it from a fresh submission.
    expect(row.reason).toMatch(/edited/i);
  });

  it("writes no row for an edit that does not change the status", async () => {
    prismaMock.property.findFirst.mockResolvedValue({
      id: "prop_1",
      status: "DRAFT",
    } as never);
    prismaMock.property.update.mockResolvedValue(makeProperty({ status: "DRAFT" }) as never);

    await send("patch", "/properties/prop_1", { price: 900_000 }, signedInAs(landlord()));

    expect(prismaMock.propertyVerification.create).not.toHaveBeenCalled();
  });
});

/* --------------------------------------------------------- role gates -- */

describe("only an admin decides", () => {
  it("FORBIDS a landlord from verifying their own listing", async () => {
    const res = await send(
      "patch",
      "/properties/prop_1/status",
      { status: "VERIFIED" },
      signedInAs(landlord()),
    );

    expect(res.status).toBe(403);
    expect(prismaMock.propertyVerification.create).not.toHaveBeenCalled();
  });

  it("FORBIDS a lawyer too — the badge is not theirs to grant", async () => {
    const res = await send(
      "patch",
      "/properties/prop_1/status",
      { status: "VERIFIED" },
      signedInAs(lawyer()),
    );

    expect(res.status).toBe(403);
    expect(prismaMock.propertyVerification.create).not.toHaveBeenCalled();
  });
});
