import type { User } from "@prisma/client";

/**
 * User serialization.
 *
 * The database row carries fields that must NEVER cross the wire
 * (`passwordHash`, internal status, token relations). `toPublicUser` is the
 * single chokepoint that builds the safe DTO the API returns, so sensitive
 * columns cannot leak by accident.
 *
 * Shape reconciles the backend model with the frontend `userSchema`:
 *  - `name` is computed from `firstName`/`lastName` (frontend uses one field).
 *  - `role` is the authoritative backend enum (USER|LANDLORD|ADMIN); the
 *    frontend widens its enum when it builds auth (see docs/frontend-analysis.md #4).
 *  - `createdAt` is serialized as an ISO datetime string.
 *  - `firstName`/`lastName`/`emailVerified` are extra, non-sensitive fields the
 *    dashboard can use; the frontend's strict Zod parse simply ignores them.
 */

export type PublicUser = {
  id: string;
  email: string;
  name: string;
  firstName: string;
  lastName: string;
  role: User["role"];
  university: string | null;
  avatar: string | null;
  emailVerified: boolean;
  createdAt: string;
};

export function fullName(firstName: string, lastName: string): string {
  return `${firstName} ${lastName}`.trim();
}

export function toPublicUser(user: User): PublicUser {
  return {
    id: user.id,
    email: user.email,
    name: fullName(user.firstName, user.lastName),
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role,
    university: user.university,
    avatar: user.avatar,
    emailVerified: user.emailVerified,
    createdAt: user.createdAt.toISOString(),
  };
}
