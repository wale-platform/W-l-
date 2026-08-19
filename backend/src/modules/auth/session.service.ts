import type { Session, User } from "@prisma/client";

import { prisma } from "../../lib/prisma";
import { generateToken, hashToken } from "../../lib/crypto";
import { SESSION_TTL_MS } from "../../lib/cookies";

/**
 * Session lifecycle.
 *
 * A session is an opaque random token. The RAW token is returned once (to be
 * placed in the httpOnly cookie); only its HMAC hash is stored, so a database
 * leak cannot reconstruct a live session. This backs logout, "log out
 * everywhere", and per-device revocation — capabilities a stateless JWT cannot
 * offer without extra machinery.
 */

// Only rewrite lastUsedAt when it's meaningfully stale, to avoid a DB write on
// every authenticated request while still surfacing "active recently".
const LAST_USED_REFRESH_MS = 5 * 60 * 1000;

export type SessionContext = { userAgent?: string | null; ip?: string | null };

export async function createSession(
  userId: string,
  ctx: SessionContext = {},
): Promise<{ rawToken: string; expiresAt: Date }> {
  const { raw, hash } = generateToken(32);
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

  await prisma.session.create({
    data: {
      userId,
      tokenHash: hash,
      expiresAt,
      userAgent: ctx.userAgent ?? null,
      ip: ctx.ip ?? null,
    },
  });

  return { rawToken: raw, expiresAt };
}

/**
 * Resolve a raw session token to its user, or null if missing/expired.
 * Expired rows are pruned lazily on lookup.
 */
export async function validateSession(
  rawToken: string,
): Promise<{ user: User; session: Session } | null> {
  const tokenHash = hashToken(rawToken);
  const session = await prisma.session.findUnique({
    where: { tokenHash },
    include: { user: true },
  });

  if (!session) return null;

  if (session.expiresAt.getTime() <= Date.now()) {
    await prisma.session.delete({ where: { id: session.id } }).catch(() => undefined);
    return null;
  }

  if (Date.now() - session.lastUsedAt.getTime() > LAST_USED_REFRESH_MS) {
    await prisma.session
      .update({ where: { id: session.id }, data: { lastUsedAt: new Date() } })
      .catch(() => undefined);
  }

  const { user, ...rest } = session;
  return { user, session: rest as Session };
}

/** Revoke a single session by its raw token (logout on this device). */
export async function revokeSessionByToken(rawToken: string): Promise<void> {
  const tokenHash = hashToken(rawToken);
  await prisma.session.deleteMany({ where: { tokenHash } });
}

/** Revoke one of the user's sessions by id (per-device revocation). */
export async function revokeSessionById(userId: string, sessionId: string): Promise<boolean> {
  const result = await prisma.session.deleteMany({ where: { id: sessionId, userId } });
  return result.count > 0;
}

/** Revoke every session for a user (log out everywhere). */
export async function revokeAllSessions(userId: string): Promise<number> {
  const result = await prisma.session.deleteMany({ where: { userId } });
  return result.count;
}

/** List a user's active sessions (for a "devices" view). Never exposes hashes. */
export async function listSessions(userId: string, currentSessionId?: string) {
  const sessions = await prisma.session.findMany({
    where: { userId, expiresAt: { gt: new Date() } },
    orderBy: { lastUsedAt: "desc" },
    select: {
      id: true,
      userAgent: true,
      ip: true,
      createdAt: true,
      lastUsedAt: true,
      expiresAt: true,
    },
  });
  return sessions.map((s) => ({ ...s, current: s.id === currentSessionId }));
}
