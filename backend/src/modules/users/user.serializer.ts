import type { Role, User } from "@prisma/client";

import { unionRoles } from "./role.service";

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
 *  - `role` is the PRIMARY role (TENANT|LANDLORD|LAWYER|MOVER|ADMIN) and decides
 *    the default dashboard; `roles` is every role the account holds. Authorization
 *    must use `roles`, never `role` alone — see role.service.ts.
 *  - `createdAt` is serialized as an ISO datetime string.
 *  - `firstName`/`lastName`/`phone`/`emailVerified` are extra, non-sensitive
 *    fields the dashboard uses.
 */

/** A user row loaded with its granted roles. */
export type UserWithRoles = User & { roles: { role: Role }[] };

export type PublicUser = {
  id: string;
  email: string;
  name: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  /** Primary role — default dashboard only. Do not authorize against this. */
  role: Role;
  /** Every role held, including the primary. Authorize against this. */
  roles: Role[];
  university: string | null;
  avatar: string | null;
  emailVerified: boolean;
  createdAt: string;
};

export function fullName(firstName: string, lastName: string): string {
  return `${firstName} ${lastName}`.trim();
}

export function toPublicUser(user: UserWithRoles): PublicUser {
  return {
    id: user.id,
    email: user.email,
    name: fullName(user.firstName, user.lastName),
    firstName: user.firstName,
    lastName: user.lastName,
    phone: user.phone,
    role: user.role,
    roles: unionRoles(user.role, user.roles),
    university: user.university,
    avatar: user.avatar,
    emailVerified: user.emailVerified,
    createdAt: user.createdAt.toISOString(),
  };
}
