import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";

import { createApp } from "../src/app";
import { API, getCsrf } from "./helpers";
import { prismaMock } from "./setup";
import { makeSession, makeUser } from "./factories";
import { unionRoles } from "../src/modules/users/role.service";

/**
 * Role model tests.
 *
 * The point of these is the PRIVILEGE BOUNDARY: one account may hold several
 * roles, but the roles that confer trust (LAWYER) or power (ADMIN) must not be
 * self-assignable, and admin-only endpoints must be unreachable without the
 * ADMIN role — regardless of what the frontend renders.
 *
 * As elsewhere, only Prisma is mocked; routing, auth middleware, CSRF and the
 * services all run for real.
 */

const app = createApp();
const SESSION_COOKIE = "wale_session";

/** Authenticate subsequent requests as `user` by stubbing session lookup. */
function signedInAs(user: ReturnType<typeof makeUser>) {
  const session = makeSession({ userId: user.id });
  prismaMock.session.findUnique.mockResolvedValue({ ...session, user } as never);
  // makeSession's lastUsedAt is deliberately stale, so validateSession refreshes
  // it. Without this stub the mock returns undefined and the `.catch()` on it
  // throws, surfacing as a 500 on every authenticated request.
  prismaMock.session.update.mockResolvedValue(session as never);
  return [`${SESSION_COOKIE}=valid-raw-token`];
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

describe("unionRoles", () => {
  it("always includes the primary role, even with no granted rows", () => {
    expect(unionRoles("LANDLORD", [])).toEqual(["LANDLORD"]);
  });

  it("tolerates a missing relation instead of throwing", () => {
    // A query that forgets `include: { roles: true }` must degrade to
    // primary-only rather than 500 on every authenticated request.
    expect(unionRoles("TENANT", undefined)).toEqual(["TENANT"]);
    expect(unionRoles("TENANT", null)).toEqual(["TENANT"]);
  });

  it("merges without duplicating the mirrored primary row", () => {
    expect(unionRoles("TENANT", [{ role: "TENANT" }, { role: "MOVER" }])).toEqual([
      "TENANT",
      "MOVER",
    ]);
  });
});

describe("GET /users/me/roles", () => {
  it("returns the full role set, not just the primary role", async () => {
    const user = makeUser({
      role: "TENANT",
      roles: [{ role: "TENANT" }, { role: "MOVER" }],
    });
    const res = await request(app)
      .get(`${API}/users/me/roles`)
      .set("Cookie", signedInAs(user));

    expect(res.status).toBe(200);
    expect(res.body.data.primaryRole).toBe("TENANT");
    expect(res.body.data.roles).toEqual(["TENANT", "MOVER"]);
  });

  it("requires authentication", async () => {
    const res = await request(app).get(`${API}/users/me/roles`);
    expect(res.status).toBe(401);
  });
});

describe("POST /users/me/roles (self-claim)", () => {
  beforeEach(() => {
    prismaMock.userRole.upsert.mockResolvedValue({} as never);
  });

  it("lets a tenant claim MOVER, so one account can be both", async () => {
    const user = makeUser({ role: "TENANT", roles: [{ role: "TENANT" }] });
    const cookies = signedInAs(user);
    // The post-claim read that userRoles() performs.
    prismaMock.user.findUnique.mockResolvedValue({
      role: "TENANT",
      roles: [{ role: "TENANT" }, { role: "MOVER" }],
    } as never);

    const res = await send("post", "/users/me/roles", { role: "MOVER" }, cookies);

    expect(res.status).toBe(200);
    expect(res.body.data.roles).toEqual(["TENANT", "MOVER"]);
    expect(prismaMock.userRole.upsert).toHaveBeenCalledOnce();
  });

  it("REJECTS a self-claimed ADMIN role (privilege escalation)", async () => {
    const user = makeUser({ role: "TENANT", roles: [{ role: "TENANT" }] });
    const res = await send(
      "post",
      "/users/me/roles",
      { role: "ADMIN" },
      signedInAs(user),
    );

    // Blocked by the schema's narrowed enum before it reaches the service.
    expect(res.status).toBe(422);
    expect(prismaMock.userRole.upsert).not.toHaveBeenCalled();
  });

  it("REJECTS a self-claimed LAWYER role (must be vetted)", async () => {
    const user = makeUser({ role: "TENANT", roles: [{ role: "TENANT" }] });
    const res = await send(
      "post",
      "/users/me/roles",
      { role: "LAWYER" },
      signedInAs(user),
    );

    expect(res.status).toBe(422);
    expect(prismaMock.userRole.upsert).not.toHaveBeenCalled();
  });
});

describe("POST /users/:id/roles (admin grant)", () => {
  beforeEach(() => {
    prismaMock.userRole.upsert.mockResolvedValue({} as never);
  });

  it("is forbidden for a non-admin", async () => {
    const tenant = makeUser({ role: "TENANT", roles: [{ role: "TENANT" }] });
    const res = await send(
      "post",
      "/users/usr_other/roles",
      { role: "LAWYER" },
      signedInAs(tenant),
    );

    expect(res.status).toBe(403);
    expect(prismaMock.userRole.upsert).not.toHaveBeenCalled();
  });

  it("is forbidden for a landlord (not just tenants)", async () => {
    const landlord = makeUser({ role: "LANDLORD", roles: [{ role: "LANDLORD" }] });
    const res = await send(
      "post",
      "/users/usr_other/roles",
      { role: "ADMIN" },
      signedInAs(landlord),
    );

    expect(res.status).toBe(403);
  });

  it("lets an admin grant LAWYER and records who granted it", async () => {
    const admin = makeUser({
      id: "usr_admin",
      role: "ADMIN",
      roles: [{ role: "ADMIN" }],
    });
    const cookies = signedInAs(admin);
    // hasRole(admin, ADMIN) then userRoles(target).
    prismaMock.user.findUnique
      .mockResolvedValueOnce({ role: "ADMIN", roles: [{ role: "ADMIN" }] } as never)
      .mockResolvedValueOnce({
        role: "TENANT",
        roles: [{ role: "TENANT" }, { role: "LAWYER" }],
      } as never);

    const res = await send("post", "/users/usr_target/roles", { role: "LAWYER" }, cookies);

    expect(res.status).toBe(200);
    expect(res.body.data.roles).toEqual(["TENANT", "LAWYER"]);
    expect(prismaMock.userRole.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: { userId: "usr_target", role: "LAWYER", grantedByUserId: "usr_admin" },
      }),
    );
  });
});

describe("DELETE /users/me/roles/:role", () => {
  it("refuses to revoke the primary role", async () => {
    const user = makeUser({ role: "LANDLORD", roles: [{ role: "LANDLORD" }] });
    const cookies = signedInAs(user);
    prismaMock.user.findUnique.mockResolvedValue({ role: "LANDLORD" } as never);

    const res = await send("delete", "/users/me/roles/LANDLORD", undefined, cookies);

    expect(res.status).toBe(403);
    expect(prismaMock.userRole.deleteMany).not.toHaveBeenCalled();
  });

  it("drops a secondary role", async () => {
    const user = makeUser({
      role: "TENANT",
      roles: [{ role: "TENANT" }, { role: "MOVER" }],
    });
    const cookies = signedInAs(user);
    prismaMock.userRole.deleteMany.mockResolvedValue({ count: 1 } as never);
    prismaMock.user.findUnique
      .mockResolvedValueOnce({ role: "TENANT" } as never)
      .mockResolvedValueOnce({ role: "TENANT", roles: [{ role: "TENANT" }] } as never);

    const res = await send("delete", "/users/me/roles/MOVER", undefined, cookies);

    expect(res.status).toBe(200);
    expect(res.body.data.roles).toEqual(["TENANT"]);
  });
});
