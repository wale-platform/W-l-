import type { Request, Response } from "express";

import { UnauthorizedError } from "../../lib/errors";
import { sendSuccess } from "../../lib/http";
import * as roleService from "./role.service";

/**
 * User controllers.
 *
 * Note the asymmetry between the two "add a role" endpoints — it is deliberate:
 * `claimMyRole` can only ever add a self-claimable role, while `grantRole`
 * accepts any role but is reachable only by an admin (route-level
 * `requireRole("ADMIN")`, re-checked in the service).
 */

export async function myRoles(req: Request, res: Response): Promise<void> {
  if (!req.user) throw new UnauthorizedError();
  sendSuccess(res, {
    primaryRole: req.user.role,
    roles: req.user.roles,
    claimable: roleService.SELF_CLAIMABLE_ROLES,
  });
}

export async function claimMyRole(req: Request, res: Response): Promise<void> {
  if (!req.user) throw new UnauthorizedError();
  const roles = await roleService.claimRole(req.user.id, req.body.role);
  sendSuccess(res, { roles });
}

export async function dropMyRole(req: Request, res: Response): Promise<void> {
  if (!req.user) throw new UnauthorizedError();
  const roles = await roleService.revokeRole(req.user.id, req.params.role as never);
  sendSuccess(res, { roles });
}

export async function grantRole(req: Request, res: Response): Promise<void> {
  if (!req.user) throw new UnauthorizedError();
  const roles = await roleService.grantRole({
    targetUserId: req.params.id as string,
    role: req.body.role,
    grantedByUserId: req.user.id,
  });
  sendSuccess(res, { roles });
}
