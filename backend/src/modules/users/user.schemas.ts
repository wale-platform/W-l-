import { z } from "zod";

/**
 * User/role request schemas.
 *
 * `roleParamSchema` covers every role because an ADMIN may grant any of them.
 * Self-service claims are narrowed to the self-claimable set instead — the
 * distinction is the whole point, so it is expressed in the schema rather than
 * left to a runtime check alone (role.service.ts enforces it a second time).
 */

export const anyRoleSchema = z.enum(["TENANT", "LANDLORD", "LAWYER", "MOVER", "ADMIN"]);

export const claimableRoleSchema = z.enum(["TENANT", "LANDLORD", "MOVER"]);

/** Body for POST /users/me/roles — a user adding a role to themselves. */
export const claimRoleSchema = z.object({
  role: claimableRoleSchema,
});

/** Body for POST /users/:id/roles — an admin granting any role. */
export const grantRoleSchema = z.object({
  role: anyRoleSchema,
});

/** Params for DELETE /users/me/roles/:role. */
export const roleParamSchema = z.object({
  role: anyRoleSchema,
});

export type ClaimRoleInput = z.infer<typeof claimRoleSchema>;
export type GrantRoleInput = z.infer<typeof grantRoleSchema>;
