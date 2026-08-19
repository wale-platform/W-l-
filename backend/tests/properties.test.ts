import request from "supertest";
import { describe, expect, it } from "vitest";

import { createApp } from "../src/app";
import { API } from "./helpers";
import { prismaMock } from "./setup";
import { makeProperty } from "./factories";

/**
 * Read-only properties API. GET is a safe method, so no CSRF handshake is
 * needed. We assert the SERIALIZED shape the frontend parses — verified boolean,
 * YYYY-MM-DD availableDate, denormalized landlord — and that internal columns
 * (status, ownerId) never leak.
 */

const app = createApp();

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
