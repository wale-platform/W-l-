import type {
  EmailVerificationToken,
  PasswordResetToken,
  Property,
  PropertyImage,
  Session,
} from "@prisma/client";

import type { UserWithRoles } from "../src/modules/users/user.serializer";

/**
 * Factories for the DB rows the mocked Prisma client returns. Overrides let a
 * test express intent ("an unverified user", "a suspended account") in one line.
 */

export function makeUser(overrides: Partial<UserWithRoles> = {}): UserWithRoles {
  const now = new Date("2026-01-01T00:00:00.000Z");
  const role = overrides.role ?? "TENANT";
  return {
    id: "usr_test_1",
    email: "ada@wale.test",
    firstName: "Ada",
    lastName: "Student",
    phone: null,
    // A syntactically-valid Argon2id hash placeholder. It will NOT verify against
    // any password, so tests that exercise a real login must build the user with
    // `makeUserWithPassword` (which hashes for real) instead of this default.
    passwordHash:
      "$argon2id$v=19$m=19456,t=2,p=1$c29tZXNhbHR2YWx1ZXg$3s7d0m3aQ0Zp3m0mVdE8oQ",
    role,
    status: "ACTIVE",
    avatar: null,
    university: "unilag",
    emailVerified: true,
    emailVerifiedAt: now,
    createdAt: now,
    updatedAt: now,
    // Mirrors the primary role, exactly as the real rows do (see the backfill in
    // the roles migration). Pass `roles` explicitly to model a multi-role account.
    roles: [{ role }],
    ...overrides,
  };
}

/**
 * Like `makeUser`, but with a REAL Argon2id hash of `password` so
 * `verifyPassword` succeeds — for end-to-end login/reset flows that must not
 * stub crypto. Async because hashing is.
 */
export async function makeUserWithPassword(
  password: string,
  overrides: Partial<UserWithRoles> = {},
): Promise<UserWithRoles> {
  const { hashPassword } = await import("../src/lib/crypto");
  const passwordHash = await hashPassword(password);
  return makeUser({ passwordHash, ...overrides });
}

export function makeSession(overrides: Partial<Session> = {}): Session {
  const now = new Date("2026-01-01T00:00:00.000Z");
  return {
    id: "ses_test_1",
    userId: "usr_test_1",
    tokenHash: "hash",
    userAgent: "vitest",
    ip: "127.0.0.1",
    // Comfortably in the future so validateSession treats it as live.
    expiresAt: new Date("2030-01-01T00:00:00.000Z"),
    createdAt: now,
    lastUsedAt: now,
    ...overrides,
  };
}

/** A live, unused email-verification token row (future expiry, usedAt: null). */
export function makeEmailToken(
  overrides: Partial<EmailVerificationToken> = {},
): EmailVerificationToken {
  return {
    id: "evt_test_1",
    userId: "usr_test_1",
    tokenHash: "token-hash",
    expiresAt: new Date("2030-01-01T00:00:00.000Z"),
    usedAt: null,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    ...overrides,
  };
}

/** A live, unused password-reset token row (future expiry, usedAt: null). */
export function makeResetToken(
  overrides: Partial<PasswordResetToken> = {},
): PasswordResetToken {
  return {
    id: "prt_test_1",
    userId: "usr_test_1",
    tokenHash: "token-hash",
    expiresAt: new Date("2030-01-01T00:00:00.000Z"),
    usedAt: null,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    ...overrides,
  };
}

type PropertyWithImages = Property & { images: PropertyImage[] };

/**
 * A VERIFIED property row with one image, matching what the service's
 * `include: { images: true }` returns. Overrides shape edge cases (unverified,
 * no coordinates, multiple images).
 */
export function makeProperty(
  overrides: Partial<PropertyWithImages> = {},
): PropertyWithImages {
  const now = new Date("2026-01-01T00:00:00.000Z");
  const { images, ...rest } = overrides;
  return {
    id: "prop_test_1",
    ownerId: null,
    title: "Sunny Studio near UNILAG",
    description: "A tidy, well-lit studio a short walk from the main gate.",
    price: 850_000,
    type: "studio",
    bedrooms: 1,
    bathrooms: 1,
    source: "wale",
    status: "VERIFIED",
    address: "12 Akoka Road",
    city: "Yaba",
    state: "Lagos",
    country: "Nigeria",
    neighborhood: "Akoka",
    latitude: 6.5158,
    longitude: 3.3898,
    university: "unilag",
    amenities: ["wifi", "water", "security"],
    // What the service would have stored for those words, so a fixture row is a
    // row the amenity filter could actually have returned.
    amenityTags: ["water", "security", "internet"],
    availableDate: new Date("2026-09-01T00:00:00.000Z"),
    contactName: "Wale Housing",
    contactPhone: "+2348012345678",
    contactEmail: "listings@walehousing.ng",
    createdAt: now,
    updatedAt: now,
    images: images ?? [
      {
        id: "img_test_1",
        propertyId: "prop_test_1",
        url: "/listings/listing-01.jpg",
        position: 0,
        createdAt: now,
      },
    ],
    ...rest,
  };
}
