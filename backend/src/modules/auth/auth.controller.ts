import type { Request, Response } from "express";

import { clearSessionCookie, readSessionCookie, setSessionCookie } from "../../lib/cookies";
import { sendCreated, sendSuccess } from "../../lib/http";
import { UnauthorizedError } from "../../lib/errors";
import type { SessionContext } from "./session.service";
import {
  listSessions,
  revokeAllSessions,
  revokeSessionById,
  revokeSessionByToken,
} from "./session.service";
import * as authService from "./auth.service";

/**
 * Auth controllers: translate HTTP <-> service calls and own cookie side
 * effects. Request bodies are already validated by middleware, so these read
 * `req.body` as trusted, typed input.
 */

function sessionContext(req: Request): SessionContext {
  return { userAgent: req.get("user-agent") ?? null, ip: req.ip ?? null };
}

export async function register(req: Request, res: Response): Promise<void> {
  const { user, rawToken, expiresAt } = await authService.register(
    req.body,
    sessionContext(req),
  );
  setSessionCookie(res, rawToken, expiresAt);
  sendCreated(res, { user });
}

export async function login(req: Request, res: Response): Promise<void> {
  const { user, rawToken, expiresAt } = await authService.login(
    req.body,
    sessionContext(req),
  );
  setSessionCookie(res, rawToken, expiresAt);
  sendSuccess(res, { user });
}

export async function logout(req: Request, res: Response): Promise<void> {
  const rawToken = readSessionCookie(req.cookies ?? {});
  if (rawToken) {
    await revokeSessionByToken(rawToken);
  }
  clearSessionCookie(res);
  sendSuccess(res, { message: "Signed out" });
}

export async function logoutAll(req: Request, res: Response): Promise<void> {
  if (!req.user) throw new UnauthorizedError();
  const count = await revokeAllSessions(req.user.id);
  clearSessionCookie(res);
  sendSuccess(res, { message: "Signed out of all devices", sessionsRevoked: count });
}

export async function me(req: Request, res: Response): Promise<void> {
  if (!req.user) throw new UnauthorizedError();
  sendSuccess(res, { user: req.user });
}

export async function verifyEmail(req: Request, res: Response): Promise<void> {
  const user = await authService.verifyEmail(req.body.token);
  sendSuccess(res, { user, message: "Email verified" });
}

export async function resendVerification(req: Request, res: Response): Promise<void> {
  await authService.resendVerification(req.body.email);
  // Uniform response regardless of account existence (no enumeration).
  sendSuccess(res, {
    message: "If that email needs verification, a new link has been sent.",
  });
}

export async function forgotPassword(req: Request, res: Response): Promise<void> {
  await authService.forgotPassword(req.body.email);
  sendSuccess(res, {
    message: "If an account exists for that email, a reset link has been sent.",
  });
}

export async function resetPassword(req: Request, res: Response): Promise<void> {
  await authService.resetPassword(req.body.token, req.body.password);
  // Force re-auth with the new password.
  clearSessionCookie(res);
  sendSuccess(res, { message: "Password updated. Please sign in with your new password." });
}

export async function sessions(req: Request, res: Response): Promise<void> {
  if (!req.user) throw new UnauthorizedError();
  const items = await listSessions(req.user.id, req.sessionId);
  sendSuccess(res, { sessions: items });
}

export async function revokeSession(req: Request, res: Response): Promise<void> {
  if (!req.user) throw new UnauthorizedError();
  const ok = await revokeSessionById(req.user.id, req.params.id as string);
  sendSuccess(res, { revoked: ok });
}
