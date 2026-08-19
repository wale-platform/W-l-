import type { Prisma, Role } from "@prisma/client";

import { ForbiddenError } from "../../lib/errors";
import { prisma } from "../../lib/prisma";

/**
 * Role assignment.
 *
 * A Wale account is one identity that may hold several roles: the same person
 * can rent a flat, offer moving services, and later list a property. `User.role`
 * is only the PRIMARY role (which dashboard they land on); the full set lives in
 * `UserRole`, and every authorization decision uses the union of the two.
 *
 * Which roles may be self-claimed is a security decision, so it is enforced here
 * rather than left to callers:
 *
 *  - TENANT, LANDLORD, MOVER are self-claimable. None of them is a claim of
 *    trust on its own: a landlord's listings must still pass property
 *    verification, and a mover's residence claims must still be verified before
 *    anything they say is presented as verified.
 *  - LAWYER and ADMIN are NOT self-claimable. A lawyer is presented to users as
 *    vetted, and an admin can see and change everything, so both require an
 *    existing admin to grant them. Without this, `POST /users/me/roles` would be
 *    a self-service privilege escalation into the admin surface.
 */

/** Roles a user may add to their own account without review. */
export const SELF_CLAIMABLE_ROLES: readonly Role[] = ["TENANT", "LANDLORD", "MOVER"];

/** Roles that only an existing ADMIN may grant. */
export const ADMIN_GRANTED_ROLES: readonly Role[] = ["LAWYER", "ADMIN"];

export function isSelfClaimable(role: Role): boolean {
  return SELF_CLAIMABLE_ROLES.includes(role);
}

/**
 * The union of a user's primary role and their granted roles.
 *
 * Primary is always included even if the mirror row is somehow missing, so a
 * failed backfill can never lock a user out of their own account. `granted` is
 * tolerated as null/undefined because a query that forgets
 * `include: { roles: true }` is a runtime-only mistake — degrading to
 * primary-only is a far better failure than a 500 on every authed request.
 */
export function unionRoles(
  primary: Role,
  granted?: readonly { role: Role }[] | null,
): Role[] {
  return [...new Set<Role>([primary, ...(granted ?? []).map((r) => r.role)])];
}

/** Every role the user holds. Prefer `req.user.roles`, which avoids this query. */
export async function userRoles(userId: string): Promise<Role[]> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true, roles: { select: { role: true } } },
  });
  if (!user) return [];
  return unionRoles(user.role, user.roles);
}

export async function hasRole(userId: string, role: Role): Promise<boolean> {
  return (await userRoles(userId)).includes(role);
}

/**
 * Mirror a user's primary role into UserRole. Called inside the registration
 * transaction so the union is consistent from the moment the account exists.
 */
export async function mirrorPrimaryRole(
  tx: Prisma.TransactionClient,
  userId: string,
  role: Role,
): Promise<void> {
  await tx.userRole.upsert({
    where: { userId_role: { userId, role } },
    create: { userId, role },
    update: {},
  });
}

/**
 * Add a role to the caller's own account. Rejects roles that require review —
 * this is the guard that keeps the endpoint from being a privilege escalation.
 */
export async function claimRole(userId: string, role: Role): Promise<Role[]> {
  if (!isSelfClaimable(role)) {
    throw new ForbiddenError(
      `The ${role} role has to be granted by an administrator and cannot be self-assigned`,
    );
  }
  await prisma.userRole.upsert({
    where: { userId_role: { userId, role } },
    create: { userId, role },
    update: {},
  });
  return userRoles(userId);
}

/**
 * Grant any role to another user. Callers MUST already have established that
 * `grantedByUserId` is an admin (see requireRole("ADMIN") on the route); the
 * check is repeated here so this can never be called safely by mistake.
 */
export async function grantRole(params: {
  targetUserId: string;
  role: Role;
  grantedByUserId: string;
}): Promise<Role[]> {
  const { targetUserId, role, grantedByUserId } = params;

  if (!(await hasRole(grantedByUserId, "ADMIN"))) {
    throw new ForbiddenError("Only an administrator can grant roles");
  }

  await prisma.userRole.upsert({
    where: { userId_role: { userId: targetUserId, role } },
    create: { userId: targetUserId, role, grantedByUserId },
    update: { grantedByUserId },
  });
  return userRoles(targetUserId);
}

/**
 * Remove a granted role. The primary role cannot be revoked — it is the
 * account's identity, and removing it would leave a user with no dashboard.
 * Demoting someone is a separate, deliberate operation on `User.role`.
 */
export async function revokeRole(userId: string, role: Role): Promise<Role[]> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
  if (!user) return [];

  if (user.role === role) {
    throw new ForbiddenError(
      "Cannot revoke a user's primary role; change their primary role instead",
    );
  }

  await prisma.userRole.deleteMany({ where: { userId, role } });
  return userRoles(userId);
}
