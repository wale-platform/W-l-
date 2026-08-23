import request from "supertest";
import { describe, expect, it } from "vitest";

import { createApp } from "../src/app";
import { API, getCsrf } from "./helpers";
import { prismaMock } from "./setup";
import { makeProperty, makeSession, makeUser } from "./factories";

/**
 * Properties API.
 *
 * Reads assert the SERIALIZED shape the frontend parses — verified boolean,
 * YYYY-MM-DD availableDate, denormalized landlord — and that internal columns
 * (status, ownerId) never leak.
 *
 * Writes assert the two boundaries that matter, both server-side and both
 * independent of anything the frontend does:
 *
 *  1. ROLE — a tenant cannot create a listing, and only an admin can set a
 *     listing's status (i.e. hand out a verified badge).
 *  2. OWNERSHIP — holding LANDLORD is not enough; a landlord must not be able to
 *     read, edit, or delete another landlord's listing. These tests check the
 *     `ownerId` constraint is in the QUERY, not merely that the response is a
 *     404, because a 404 produced by a forgotten check would look identical.
 */

const app = createApp();
const SESSION_COOKIE = "wale_session";

/** Authenticate subsequent requests as `user` by stubbing session lookup. */
function signedInAs(user: ReturnType<typeof makeUser>) {
  const session = makeSession({ userId: user.id });
  prismaMock.session.findUnique.mockResolvedValue({ ...session, user } as never);
  prismaMock.session.update.mockResolvedValue(session as never);
  return [`${SESSION_COOKIE}=valid-raw-token`];
}

const landlord = () =>
  makeUser({
    id: "usr_landlord",
    email: "landlord@wale.test",
    firstName: "Ada",
    lastName: "Landlord",
    phone: "+2348012345678",
    role: "LANDLORD",
    roles: [{ role: "LANDLORD" }],
  });

const tenant = () => makeUser({ id: "usr_tenant", role: "TENANT", roles: [{ role: "TENANT" }] });

const admin = () => makeUser({ id: "usr_admin", role: "ADMIN", roles: [{ role: "ADMIN" }] });

const lawyer = () =>
  makeUser({ id: "usr_lawyer", role: "LAWYER", roles: [{ role: "LAWYER" }], phone: "+2348090000000" });

/** A body that passes every field-level rule, so a test failure means the rule under test. */
const VALID_LISTING = {
  title: "Bright two-bedroom flat in Akoka",
  description:
    "A tidy two-bedroom flat five minutes from the UNILAG main gate, with steady water and a fenced compound.",
  price: 1_200_000,
  type: "two_bedroom",
  bedrooms: 2,
  bathrooms: 2,
  address: "14 Akoka Road",
  city: "Yaba",
  state: "Lagos",
  availableDate: "2026-10-01",
  images: ["https://res.cloudinary.com/demo/image/upload/a.jpg"],
  amenities: ["water", "security"],
  contactName: "Ada Landlord",
  contactPhone: "08012345678",
};

/** The same body minus the public-contact fields, to exercise the profile fallback. */
const { contactName: _cn, contactPhone: _cp, ...LISTING_WITHOUT_CONTACT } = VALID_LISTING;

async function send(
  method: "post" | "patch" | "delete",
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

describe("GET /properties", () => {
  it("returns a paginated, serialized list", async () => {
    prismaMock.property.findMany.mockResolvedValue([makeProperty()] as never);
    prismaMock.property.count.mockResolvedValue(1);

    const res = await request(app).get(`${API}/properties`);

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({
      total: 1,
      page: 1,
      pageSize: 12,
      totalPages: 1,
    });

    const p = res.body.data.properties[0];
    expect(p.verified).toBe(true);
    expect(p.availableDate).toBe("2026-09-01");
    expect(p.landlord.name).toBe("Wale Housing");
    expect(p.coordinates).toEqual({ lat: 6.5158, lng: 3.3898 });
    expect(p.images).toEqual(["/listings/listing-01.jpg"]);
    // Internal fields must never cross the wire.
    expect(p.status).toBeUndefined();
    expect(p.ownerId).toBeUndefined();
  });

  it("orders images by position regardless of DB order", async () => {
    const now = new Date("2026-01-01T00:00:00.000Z");
    prismaMock.property.findMany.mockResolvedValue([
      makeProperty({
        images: [
          { id: "b", propertyId: "prop_test_1", url: "/b.jpg", position: 1, createdAt: now },
          { id: "a", propertyId: "prop_test_1", url: "/a.jpg", position: 0, createdAt: now },
        ],
      }),
    ] as never);
    prismaMock.property.count.mockResolvedValue(1);

    const res = await request(app).get(`${API}/properties`);

    expect(res.body.data.properties[0].images).toEqual(["/a.jpg", "/b.jpg"]);
  });

  it("narrows to VERIFIED-only when verifiedOnly=true", async () => {
    prismaMock.property.findMany.mockResolvedValue([] as never);
    prismaMock.property.count.mockResolvedValue(0);

    await request(app).get(`${API}/properties?verifiedOnly=true`);

    expect(prismaMock.property.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ status: "VERIFIED" }) }),
    );
  });

  it("rejects an out-of-range pageSize with 422", async () => {
    const res = await request(app).get(`${API}/properties?pageSize=999`);

    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
    expect(prismaMock.property.findMany).not.toHaveBeenCalled();
  });
});

describe("GET /properties/:id", () => {
  it("returns a single serialized property", async () => {
    prismaMock.property.findFirst.mockResolvedValue(
      makeProperty({ id: "prop_abc" }) as never,
    );

    const res = await request(app).get(`${API}/properties/prop_abc`);

    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe("prop_abc");
    expect(res.body.data.verified).toBe(true);
  });

  it("returns 404 when the property is absent or not publicly listable", async () => {
    prismaMock.property.findFirst.mockResolvedValue(null);

    const res = await request(app).get(`${API}/properties/nope`);

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("NOT_FOUND");
  });
});

/* ------------------------------------------------------ role boundary -- */

describe("POST /properties — who may create", () => {
  it("rejects an unauthenticated caller with 401", async () => {
    const res = await send("post", "/properties", VALID_LISTING, []);

    expect(res.status).toBe(401);
    expect(prismaMock.property.create).not.toHaveBeenCalled();
  });

  it("FORBIDS a tenant, whose dashboard never offers this", async () => {
    const res = await send("post", "/properties", VALID_LISTING, signedInAs(tenant()));

    expect(res.status).toBe(403);
    expect(prismaMock.property.create).not.toHaveBeenCalled();
  });

  it("still requires the CSRF header from a valid session", async () => {
    // No X-CSRF-Token, so the double-submit check must fail before the service.
    const res = await request(app)
      .post(`${API}/properties`)
      .set("Cookie", signedInAs(landlord()))
      .send(VALID_LISTING);

    expect(res.status).toBe(403);
    expect(prismaMock.property.create).not.toHaveBeenCalled();
  });
});

describe("POST /properties — creating a listing", () => {
  it("creates it as a DRAFT owned by the caller", async () => {
    prismaMock.property.create.mockResolvedValue(
      makeProperty({ id: "prop_new", ownerId: "usr_landlord", status: "DRAFT" }) as never,
    );

    const res = await send("post", "/properties", VALID_LISTING, signedInAs(landlord()));

    expect(res.status).toBe(201);
    // The owner sees the lifecycle; the public payload never does.
    expect(res.body.data.status).toBe("DRAFT");
    expect(res.body.data.verified).toBe(false);

    const { data } = prismaMock.property.create.mock.calls[0]![0];
    expect(data.ownerId).toBe("usr_landlord");
    // Nothing is publishable on creation alone.
    expect(data.status).toBe("DRAFT");
  });

  it("IGNORES a client-supplied status, source and ownerId", async () => {
    prismaMock.property.create.mockResolvedValue(
      makeProperty({ ownerId: "usr_landlord", status: "DRAFT" }) as never,
    );

    const res = await send(
      "post",
      "/properties",
      {
        ...VALID_LISTING,
        // All three are trust signals. A client that sets them must not win.
        status: "VERIFIED",
        source: "wale",
        ownerId: "usr_someone_else",
        verified: true,
      },
      signedInAs(landlord()),
    );

    expect(res.status).toBe(201);
    const { data } = prismaMock.property.create.mock.calls[0]![0];
    expect(data.status).toBe("DRAFT");
    expect(data.source).toBe("landlord");
    expect(data.ownerId).toBe("usr_landlord");
    expect(data).not.toHaveProperty("verified");
  });

  it("marks a lawyer's listing as agent-sourced, not first-party", async () => {
    prismaMock.property.create.mockResolvedValue(makeProperty({ status: "DRAFT" }) as never);

    await send("post", "/properties", VALID_LISTING, signedInAs(lawyer()));

    expect(prismaMock.property.create.mock.calls[0]![0].data.source).toBe("agent");
  });

  it("stores images in the order given", async () => {
    prismaMock.property.create.mockResolvedValue(makeProperty({ status: "DRAFT" }) as never);

    await send(
      "post",
      "/properties",
      { ...VALID_LISTING, images: ["https://cdn.test/a.jpg", "https://cdn.test/b.jpg"] },
      signedInAs(landlord()),
    );

    expect(prismaMock.property.create.mock.calls[0]![0].data.images).toEqual({
      create: [
        { url: "https://cdn.test/a.jpg", position: 0 },
        { url: "https://cdn.test/b.jpg", position: 1 },
      ],
    });
  });

  it("falls back to the owner's own name and phone as the public contact", async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      firstName: "Ada",
      lastName: "Landlord",
      phone: "+2348012345678",
    } as never);
    prismaMock.property.create.mockResolvedValue(makeProperty({ status: "DRAFT" }) as never);

    await send("post", "/properties", LISTING_WITHOUT_CONTACT, signedInAs(landlord()));

    const { data } = prismaMock.property.create.mock.calls[0]![0];    expect(data.contactName).toBe("Ada Landlord");
    expect(data.contactPhone).toBe("+2348012345678");
    // The account email is a login credential; it is not published by default.
    expect(data.contactEmail).toBeNull();
  });

  it("asks for a contact number rather than 500ing when the profile has none", async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      firstName: "Ada",
      lastName: "Landlord",
      phone: null,
    } as never);

    const res = await send(
      "post",
      "/properties",
      LISTING_WITHOUT_CONTACT,
      signedInAs(landlord()),
    );

    expect(res.status).toBe(422);
    expect(res.body.error.details).toEqual([
      expect.objectContaining({ field: "contactPhone" }),
    ]);
    expect(prismaMock.property.create).not.toHaveBeenCalled();
  });

  it("normalizes the contact phone the same way registration does", async () => {
    prismaMock.property.create.mockResolvedValue(makeProperty({ status: "DRAFT" }) as never);

    await send(
      "post",
      "/properties",
      { ...VALID_LISTING, contactPhone: "0801 234 5678" },
      signedInAs(landlord()),
    );

    expect(prismaMock.property.create.mock.calls[0]![0].data.contactPhone).toBe(
      "+2348012345678",
    );
  });

  it("rejects a protocol-relative image URL that would load from any host", async () => {
    const res = await send(
      "post",
      "/properties",
      { ...VALID_LISTING, images: ["//evil.test/a.jpg"] },
      signedInAs(landlord()),
    );

    expect(res.status).toBe(422);
    expect(prismaMock.property.create).not.toHaveBeenCalled();
  });

  it("rejects a date that does not exist", async () => {
    const res = await send(
      "post",
      "/properties",
      { ...VALID_LISTING, availableDate: "2026-02-31" },
      signedInAs(landlord()),
    );

    expect(res.status).toBe(422);
    expect(res.body.error.details).toEqual([
      expect.objectContaining({ field: "availableDate" }),
    ]);
  });

  it("rejects half a map pin", async () => {
    const res = await send(
      "post",
      "/properties",
      { ...VALID_LISTING, latitude: 6.5 },
      signedInAs(landlord()),
    );

    expect(res.status).toBe(422);
  });
});

/* -------------------------------------------------- ownership boundary -- */

describe("PATCH /properties/:id — ownership", () => {
  it("scopes the lookup by ownerId, so another landlord's listing is 404", async () => {
    prismaMock.property.findFirst.mockResolvedValue(null);

    const res = await send(
      "patch",
      "/properties/prop_someone_else",
      { price: 950_000 },
      signedInAs(landlord()),
    );

    expect(res.status).toBe(404);
    expect(prismaMock.property.update).not.toHaveBeenCalled();
    // The check has to be IN the query — a 404 alone would also be produced by
    // an unscoped lookup that simply missed.
    expect(prismaMock.property.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "prop_someone_else", ownerId: "usr_landlord" },
      }),
    );
  });

  it("lets an admin edit any listing (no ownerId constraint)", async () => {
    prismaMock.property.findFirst.mockResolvedValue({
      id: "prop_someone_else",
      status: "DRAFT",
    } as never);
    prismaMock.property.update.mockResolvedValue(makeProperty({ status: "DRAFT" }) as never);

    const res = await send(
      "patch",
      "/properties/prop_someone_else",
      { price: 900_000 },
      signedInAs(admin()),
    );

    expect(res.status).toBe(200);
    expect(prismaMock.property.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "prop_someone_else" } }),
    );
  });

  it("sends an edited VERIFIED listing back for re-verification", async () => {
    prismaMock.property.findFirst.mockResolvedValue({
      id: "prop_1",
      status: "VERIFIED",
    } as never);
    prismaMock.property.update.mockResolvedValue(
      makeProperty({ status: "PENDING_VERIFICATION" }) as never,
    );

    const res = await send(
      "patch",
      "/properties/prop_1",
      { price: 4_000_000, address: "Somewhere entirely different" },
      signedInAs(landlord()),
    );

    expect(res.status).toBe(200);
    // Otherwise "get approved, then rewrite it" would launder anything into a
    // verified listing.
    expect(prismaMock.property.update.mock.calls[0]![0].data.status).toBe(
      "PENDING_VERIFICATION",
    );
    expect(res.body.data.verified).toBe(false);
  });

  it("leaves a DRAFT's status alone when edited", async () => {
    prismaMock.property.findFirst.mockResolvedValue({ id: "prop_1", status: "DRAFT" } as never);
    prismaMock.property.update.mockResolvedValue(makeProperty({ status: "DRAFT" }) as never);

    await send("patch", "/properties/prop_1", { price: 900_000 }, signedInAs(landlord()));

    expect(prismaMock.property.update.mock.calls[0]![0].data).not.toHaveProperty("status");
  });

  it("does not touch the gallery when `images` is omitted", async () => {
    prismaMock.property.findFirst.mockResolvedValue({ id: "prop_1", status: "DRAFT" } as never);
    prismaMock.property.update.mockResolvedValue(makeProperty({ status: "DRAFT" }) as never);

    await send("patch", "/properties/prop_1", { title: "A renamed listing" }, signedInAs(landlord()));

    expect(prismaMock.propertyImage.deleteMany).not.toHaveBeenCalled();
  });

  it("replaces the gallery wholesale when `images` is sent", async () => {
    prismaMock.property.findFirst.mockResolvedValue({ id: "prop_1", status: "DRAFT" } as never);
    prismaMock.property.update.mockResolvedValue(makeProperty({ status: "DRAFT" }) as never);
    prismaMock.propertyImage.deleteMany.mockResolvedValue({ count: 1 } as never);
    prismaMock.propertyImage.createMany.mockResolvedValue({ count: 1 } as never);

    await send(
      "patch",
      "/properties/prop_1",
      { images: ["https://cdn.test/new.jpg"] },
      signedInAs(landlord()),
    );

    expect(prismaMock.propertyImage.deleteMany).toHaveBeenCalledWith({
      where: { propertyId: "prop_1" },
    });
    expect(prismaMock.propertyImage.createMany).toHaveBeenCalledWith({
      data: [{ propertyId: "prop_1", url: "https://cdn.test/new.jpg", position: 0 }],
    });
  });

  it("rejects an empty body instead of reporting a save that changed nothing", async () => {
    const res = await send("patch", "/properties/prop_1", {}, signedInAs(landlord()));

    expect(res.status).toBe(422);
    expect(prismaMock.property.findFirst).not.toHaveBeenCalled();
  });
});

describe("DELETE /properties/:id", () => {
  it("authorizes and deletes in one statement, scoped to the owner", async () => {
    prismaMock.property.deleteMany.mockResolvedValue({ count: 1 } as never);

    const res = await send("delete", "/properties/prop_1", undefined, signedInAs(landlord()));

    expect(res.status).toBe(200);
    expect(prismaMock.property.deleteMany).toHaveBeenCalledWith({
      where: { id: "prop_1", ownerId: "usr_landlord" },
    });
  });

  it("is a 404 when the listing is not the caller's", async () => {
    prismaMock.property.deleteMany.mockResolvedValue({ count: 0 } as never);

    const res = await send("delete", "/properties/prop_other", undefined, signedInAs(landlord()));

    expect(res.status).toBe(404);
  });

  it("is forbidden for a tenant", async () => {
    const res = await send("delete", "/properties/prop_1", undefined, signedInAs(tenant()));

    expect(res.status).toBe(403);
    expect(prismaMock.property.deleteMany).not.toHaveBeenCalled();
  });
});

/* --------------------------------------------------- verification gate -- */

describe("POST /properties/:id/submit", () => {
  it("moves a DRAFT with photos into the review queue", async () => {
    prismaMock.property.findFirst.mockResolvedValue({
      id: "prop_1",
      status: "DRAFT",
      _count: { images: 2 },
    } as never);
    prismaMock.property.update.mockResolvedValue(
      makeProperty({ status: "PENDING_VERIFICATION" }) as never,
    );

    const res = await send("post", "/properties/prop_1/submit", undefined, signedInAs(landlord()));

    expect(res.status).toBe(200);
    expect(prismaMock.property.update.mock.calls[0]![0].data).toEqual({
      status: "PENDING_VERIFICATION",
    });
    // Submitting is not approving.
    expect(res.body.data.verified).toBe(false);
  });

  it("cannot be used to skip review and self-verify", async () => {
    prismaMock.property.findFirst.mockResolvedValue({
      id: "prop_1",
      status: "DRAFT",
      _count: { images: 1 },
    } as never);
    prismaMock.property.update.mockResolvedValue(
      makeProperty({ status: "PENDING_VERIFICATION" }) as never,
    );

    await send("post", "/properties/prop_1/submit", { status: "VERIFIED" }, signedInAs(landlord()));

    expect(prismaMock.property.update.mock.calls[0]![0].data.status).toBe(
      "PENDING_VERIFICATION",
    );
  });

  it("refuses a listing with no photos", async () => {
    prismaMock.property.findFirst.mockResolvedValue({
      id: "prop_1",
      status: "DRAFT",
      _count: { images: 0 },
    } as never);

    const res = await send("post", "/properties/prop_1/submit", undefined, signedInAs(landlord()));

    expect(res.status).toBe(422);
    expect(res.body.error.details).toEqual([expect.objectContaining({ field: "images" })]);
    expect(prismaMock.property.update).not.toHaveBeenCalled();
  });

  it("refuses a second submission of an already-pending listing", async () => {
    prismaMock.property.findFirst.mockResolvedValue({
      id: "prop_1",
      status: "PENDING_VERIFICATION",
      _count: { images: 1 },
    } as never);

    const res = await send("post", "/properties/prop_1/submit", undefined, signedInAs(landlord()));

    expect(res.status).toBe(409);
    expect(prismaMock.property.update).not.toHaveBeenCalled();
  });

  it("does not let an owner re-list a SUSPENDED listing", async () => {
    prismaMock.property.findFirst.mockResolvedValue({
      id: "prop_1",
      status: "SUSPENDED",
      _count: { images: 1 },
    } as never);

    const res = await send("post", "/properties/prop_1/submit", undefined, signedInAs(landlord()));

    expect(res.status).toBe(409);
    expect(prismaMock.property.update).not.toHaveBeenCalled();
  });
});

describe("PATCH /properties/:id/status — admin only", () => {
  it("FORBIDS a landlord from verifying their own listing", async () => {
    const res = await send(
      "patch",
      "/properties/prop_1/status",
      { status: "VERIFIED" },
      signedInAs(landlord()),
    );

    expect(res.status).toBe(403);
    expect(prismaMock.property.update).not.toHaveBeenCalled();
  });

  it("FORBIDS a lawyer too — the badge is not theirs to grant", async () => {
    const res = await send(
      "patch",
      "/properties/prop_1/status",
      { status: "VERIFIED" },
      signedInAs(lawyer()),
    );

    expect(res.status).toBe(403);
  });

  it("lets an admin verify a pending listing", async () => {
    prismaMock.property.findUnique.mockResolvedValue({ id: "prop_1" } as never);
    prismaMock.property.update.mockResolvedValue(makeProperty({ status: "VERIFIED" }) as never);

    const res = await send(
      "patch",
      "/properties/prop_1/status",
      { status: "VERIFIED" },
      signedInAs(admin()),
    );

    expect(res.status).toBe(200);
    expect(res.body.data.verified).toBe(true);
  });

  it("rejects a status outside the moderation set", async () => {
    const res = await send(
      "patch",
      "/properties/prop_1/status",
      { status: "DRAFT" },
      signedInAs(admin()),
    );

    expect(res.status).toBe(422);
    expect(prismaMock.property.update).not.toHaveBeenCalled();
  });
});

/* ------------------------------------------------------- owner listing -- */

describe("GET /properties/mine", () => {
  it("requires a session", async () => {
    const res = await request(app).get(`${API}/properties/mine`);

    expect(res.status).toBe(401);
  });

  it("returns the caller's own listings with their status, any status", async () => {
    prismaMock.property.findMany.mockResolvedValue([
      makeProperty({ ownerId: "usr_landlord", status: "REJECTED" }),
    ] as never);
    prismaMock.property.count.mockResolvedValue(1);

    const res = await request(app)
      .get(`${API}/properties/mine`)
      .set("Cookie", signedInAs(landlord()));

    expect(res.status).toBe(200);
    // "mine" must not have been read as a property id.
    expect(res.body.data.properties).toHaveLength(1);
    // The owner needs to know WHY it isn't live; `verified: false` alone can't say.
    expect(res.body.data.properties[0].status).toBe("REJECTED");
    expect(prismaMock.property.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { ownerId: "usr_landlord" } }),
    );
  });

  it("is scoped to the caller even for an admin — 'mine' means mine", async () => {
    prismaMock.property.findMany.mockResolvedValue([] as never);
    prismaMock.property.count.mockResolvedValue(0);

    await request(app).get(`${API}/properties/mine`).set("Cookie", signedInAs(admin()));

    expect(prismaMock.property.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { ownerId: "usr_admin" } }),
    );
  });

  it("filters by status when asked", async () => {
    prismaMock.property.findMany.mockResolvedValue([] as never);
    prismaMock.property.count.mockResolvedValue(0);

    await request(app)
      .get(`${API}/properties/mine?status=DRAFT`)
      .set("Cookie", signedInAs(landlord()));

    expect(prismaMock.property.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { ownerId: "usr_landlord", status: "DRAFT" } }),
    );
  });

  it("rejects a status that is not a real lifecycle state", async () => {
    const res = await request(app)
      .get(`${API}/properties/mine?status=NOT_A_STATUS`)
      .set("Cookie", signedInAs(landlord()));

    expect(res.status).toBe(422);
    expect(prismaMock.property.findMany).not.toHaveBeenCalled();
  });
});

describe("GET /properties/mine/:id", () => {
  it("loads the caller's own DRAFT for editing", async () => {
    prismaMock.property.findFirst.mockResolvedValue(
      makeProperty({ id: "prop_1", ownerId: "usr_landlord", status: "DRAFT" }) as never,
    );

    const res = await request(app)
      .get(`${API}/properties/mine/prop_1`)
      .set("Cookie", signedInAs(landlord()));

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe("DRAFT");
    expect(prismaMock.property.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "prop_1", ownerId: "usr_landlord" } }),
    );
  });

  it("will not disclose another owner's unpublished listing", async () => {
    prismaMock.property.findFirst.mockResolvedValue(null);

    const res = await request(app)
      .get(`${API}/properties/mine/prop_other`)
      .set("Cookie", signedInAs(landlord()));

    // 404, not 403: "exists but isn't yours" would itself confirm the listing.
    expect(res.status).toBe(404);
  });
});

