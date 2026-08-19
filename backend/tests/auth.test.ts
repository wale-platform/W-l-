import request from "supertest";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";

import { createApp } from "../src/app";
import { API, getCsrf } from "./helpers";
import { prismaMock } from "./setup";
import {
  makeEmailToken,
  makeResetToken,
  makeSession,
  makeUser,
  makeUserWithPassword,
} from "./factories";

/**
 * Auth flow tests.
 *
 * These run the REAL app end-to-end (routing → middleware → controller →
 * service → Argon2 → session/CSRF logic); only the Prisma layer is a deep mock,
 * so no database is required. Every state-changing request goes through the
 * double-submit CSRF handshake, exactly as the browser client does.
 */

const app = createApp();
const PASSWORD = "Password123";

/** Helper name for the session cookie under test. */
const SESSION_COOKIE = "wale_session";

function setCookies(res: request.Response): string[] {
  return (res.headers["set-cookie"] as unknown as string[] | undefined) ?? [];
}

function hasCookie(res: request.Response, name: string): boolean {
  return setCookies(res).some((c) => c.startsWith(`${name}=`));
}

/** POST with a fresh CSRF token + cookie (and any extra session cookies). */
async function postCsrf(path: string, body: object, extraCookies: string[] = []) {
  const { token, cookie } = await getCsrf(app);
  return request(app)
    .post(`${API}${path}`)
    .set("Cookie", [...cookie, ...extraCookies])
    .set("X-CSRF-Token", token)
    .send(body);
}

let hashedUser: Awaited<ReturnType<typeof makeUserWithPassword>>;

beforeAll(async () => {
  // Hash once; reused across the login/reset cases that need a real verify.
  hashedUser = await makeUserWithPassword(PASSWORD, { email: "ada@wale.test" });
});

describe("POST /auth/register", () => {
  beforeEach(() => {
    prismaMock.user.findUnique.mockResolvedValue(null); // no existing account
    prismaMock.user.create.mockResolvedValue(makeUser({ email: "new@wale.test" }));
    prismaMock.emailVerificationToken.deleteMany.mockResolvedValue({ count: 0 });
    prismaMock.emailVerificationToken.create.mockResolvedValue(makeEmailToken());
    prismaMock.session.create.mockResolvedValue(makeSession());
  });

  it("creates an account, returns the public user, and sets the session cookie", async () => {
    const res = await postCsrf("/auth/register", {
      name: "New Student",
      email: "new@wale.test",
      password: PASSWORD,
      university: "unilag",
    });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.email).toBe("new@wale.test");
    // The password hash must never cross the wire.
    expect(res.body.data.user.passwordHash).toBeUndefined();
    expect(hasCookie(res, SESSION_COOKIE)).toBe(true);
    expect(prismaMock.user.create).toHaveBeenCalledOnce();
  });

  it("rejects a duplicate email with 409 EMAIL_TAKEN", async () => {
    prismaMock.user.findUnique.mockResolvedValue(makeUser({ email: "ada@wale.test" }));

    const res = await postCsrf("/auth/register", {
      name: "Ada Again",
      email: "ada@wale.test",
      password: PASSWORD,
      university: "unilag",
    });

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe("EMAIL_TAKEN");
    expect(prismaMock.user.create).not.toHaveBeenCalled();
  });

  it("rejects a weak password with 422 before touching the database", async () => {
    const res = await postCsrf("/auth/register", {
      name: "Weak Pw",
      email: "weak@wale.test",
      password: "short",
      university: "unilag",
    });

    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
    expect(prismaMock.user.findUnique).not.toHaveBeenCalled();
  });

  it("registers a landlord with no university (they don't have one)", async () => {
    // Wale started student-focused, but university is nullable in the schema and
    // requiring it here would make LANDLORD/MOVER signup impossible.
    prismaMock.user.create.mockResolvedValue(
      makeUser({ email: "owner@wale.test", role: "LANDLORD", university: null }),
    );

    const res = await postCsrf("/auth/register", {
      firstName: "Bola",
      lastName: "Owner",
      email: "owner@wale.test",
      phone: "08031234567",
      password: PASSWORD,
      confirmPassword: PASSWORD,
      role: "LANDLORD",
    });

    expect(res.status).toBe(201);
    expect(res.body.data.user.role).toBe("LANDLORD");
    expect(res.body.data.user.roles).toEqual(["LANDLORD"]);
  });

  it("normalizes a Nigerian phone number to +234 form", async () => {
    const res = await postCsrf("/auth/register", {
      firstName: "Chidi",
      lastName: "Mover",
      email: "new@wale.test",
      phone: "0803 123 4567",
      password: PASSWORD,
      confirmPassword: PASSWORD,
      role: "MOVER",
    });

    expect(res.status).toBe(201);
    expect(prismaMock.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ phone: "+2348031234567" }),
      }),
    );
  });

  it("rejects mismatched password confirmation with 422", async () => {
    const res = await postCsrf("/auth/register", {
      firstName: "Typo",
      lastName: "Fingers",
      email: "typo@wale.test",
      password: PASSWORD,
      confirmPassword: `${PASSWORD}x`,
    });

    expect(res.status).toBe(422);
    expect(res.body.error.details).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: "confirmPassword" }),
      ]),
    );
    expect(prismaMock.user.create).not.toHaveBeenCalled();
  });

  it("REFUSES to register a self-assigned ADMIN or LAWYER role", async () => {
    // Privilege escalation at the front door. The signup enum omits both, so
    // this never reaches the service.
    for (const role of ["ADMIN", "LAWYER"]) {
      const res = await postCsrf("/auth/register", {
        firstName: "Esc",
        lastName: "Alate",
        email: `esc-${role}@wale.test`,
        password: PASSWORD,
        confirmPassword: PASSWORD,
        role,
      });

      expect(res.status).toBe(422);
    }
    expect(prismaMock.user.create).not.toHaveBeenCalled();
  });
});

describe("POST /auth/login", () => {
  it("logs in with valid credentials and sets the session cookie", async () => {
    prismaMock.user.findUnique.mockResolvedValue(hashedUser);
    prismaMock.session.create.mockResolvedValue(makeSession());

    const res = await postCsrf("/auth/login", {
      email: "ada@wale.test",
      password: PASSWORD,
    });

    expect(res.status).toBe(200);
    expect(res.body.data.user.email).toBe("ada@wale.test");
    expect(hasCookie(res, SESSION_COOKIE)).toBe(true);
  });

  it("rejects a wrong password with a generic 401", async () => {
    prismaMock.user.findUnique.mockResolvedValue(hashedUser);

    const res = await postCsrf("/auth/login", {
      email: "ada@wale.test",
      password: "WrongPassword9",
    });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("INVALID_CREDENTIALS");
    expect(hasCookie(res, SESSION_COOKIE)).toBe(false);
  });

  it("rejects an unknown email with the same generic 401 (no enumeration)", async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);

    const res = await postCsrf("/auth/login", {
      email: "ghost@wale.test",
      password: PASSWORD,
    });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("INVALID_CREDENTIALS");
  });

  it("rejects a suspended account with 401 ACCOUNT_INACTIVE", async () => {
    prismaMock.user.findUnique.mockResolvedValue(
      await makeUserWithPassword(PASSWORD, { status: "SUSPENDED" }),
    );

    const res = await postCsrf("/auth/login", {
      email: "ada@wale.test",
      password: PASSWORD,
    });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("ACCOUNT_INACTIVE");
  });
});

describe("POST /auth/logout", () => {
  it("revokes the current session and clears the cookie", async () => {
    prismaMock.session.deleteMany.mockResolvedValue({ count: 1 });

    const res = await postCsrf("/auth/logout", {}, [`${SESSION_COOKIE}=some-raw-token`]);

    expect(res.status).toBe(200);
    expect(prismaMock.session.deleteMany).toHaveBeenCalledOnce();
    // clearCookie emits an empty-valued cookie for the same name.
    expect(setCookies(res).some((c) => c.startsWith(`${SESSION_COOKIE}=;`))).toBe(true);
  });
});

describe("POST /auth/verify-email", () => {
  it("marks the email verified for a valid token", async () => {
    prismaMock.emailVerificationToken.findUnique.mockResolvedValue(makeEmailToken());
    prismaMock.emailVerificationToken.update.mockResolvedValue(
      makeEmailToken({ usedAt: new Date() }),
    );
    prismaMock.user.update.mockResolvedValue(makeUser({ emailVerified: true }));

    const res = await postCsrf("/auth/verify-email", { token: "raw-token" });

    expect(res.status).toBe(200);
    expect(res.body.data.user.emailVerified).toBe(true);
    expect(prismaMock.user.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ emailVerified: true }) }),
    );
  });

  it("rejects an expired token with 401 INVALID_TOKEN", async () => {
    prismaMock.emailVerificationToken.findUnique.mockResolvedValue(
      makeEmailToken({ expiresAt: new Date("2020-01-01T00:00:00.000Z") }),
    );

    const res = await postCsrf("/auth/verify-email", { token: "raw-token" });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("INVALID_TOKEN");
    expect(prismaMock.user.update).not.toHaveBeenCalled();
  });
});

describe("password reset", () => {
  it("forgot-password responds uniformly whether or not the account exists", async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);
    const res = await postCsrf("/auth/forgot-password", { email: "ghost@wale.test" });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it("reset-password sets the new hash and revokes all sessions", async () => {
    prismaMock.passwordResetToken.findUnique.mockResolvedValue(makeResetToken());
    prismaMock.passwordResetToken.update.mockResolvedValue(
      makeResetToken({ usedAt: new Date() }),
    );
    prismaMock.user.update.mockResolvedValue(makeUser());
    prismaMock.session.deleteMany.mockResolvedValue({ count: 3 });

    const res = await postCsrf("/auth/reset-password", {
      token: "raw-token",
      password: "BrandNew123",
    });

    expect(res.status).toBe(200);
    expect(prismaMock.user.update).toHaveBeenCalledOnce();
    // Every session is revoked so any leaked cookie is dead.
    expect(prismaMock.session.deleteMany).toHaveBeenCalledWith({
      where: { userId: "usr_test_1" },
    });
  });

  it("rejects an already-used reset token with 401", async () => {
    prismaMock.passwordResetToken.findUnique.mockResolvedValue(
      makeResetToken({ usedAt: new Date("2026-01-02T00:00:00.000Z") }),
    );

    const res = await postCsrf("/auth/reset-password", {
      token: "raw-token",
      password: "BrandNew123",
    });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("INVALID_TOKEN");
    expect(prismaMock.user.update).not.toHaveBeenCalled();
  });
});

describe("GET /auth/me", () => {
  it("returns the current user for a valid session cookie", async () => {
    prismaMock.session.findUnique.mockResolvedValue({
      ...makeSession(),
      user: makeUser({ email: "ada@wale.test" }),
    } as never);
    // makeSession's lastUsedAt is stale, so validateSession refreshes it.
    prismaMock.session.update.mockResolvedValue(makeSession());

    const res = await request(app)
      .get(`${API}/auth/me`)
      .set("Cookie", [`${SESSION_COOKIE}=valid-raw-token`]);

    expect(res.status).toBe(200);
    expect(res.body.data.user.email).toBe("ada@wale.test");
  });

  it("returns 401 with no session cookie", async () => {
    const res = await request(app).get(`${API}/auth/me`);

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it("returns 401 when the session is expired (pruned lazily)", async () => {
    prismaMock.session.findUnique.mockResolvedValue({
      ...makeSession({ expiresAt: new Date("2020-01-01T00:00:00.000Z") }),
      user: makeUser(),
    } as never);
    prismaMock.session.delete.mockResolvedValue(makeSession());

    const res = await request(app)
      .get(`${API}/auth/me`)
      .set("Cookie", [`${SESSION_COOKIE}=expired-raw-token`]);

    expect(res.status).toBe(401);
    expect(prismaMock.session.delete).toHaveBeenCalledOnce();
  });
});

describe("CSRF protection", () => {
  it("rejects an unsafe request with no CSRF token (403)", async () => {
    const res = await request(app)
      .post(`${API}/auth/login`)
      .send({ email: "ada@wale.test", password: PASSWORD });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("FORBIDDEN");
  });

  it("rejects a mismatched CSRF header vs cookie (403)", async () => {
    const { cookie } = await getCsrf(app);
    const res = await request(app)
      .post(`${API}/auth/login`)
      .set("Cookie", cookie)
      .set("X-CSRF-Token", "not-the-cookie-value")
      .send({ email: "ada@wale.test", password: PASSWORD });

    expect(res.status).toBe(403);
  });
});
