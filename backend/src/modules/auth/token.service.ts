import { prisma } from "../../lib/prisma";
import { generateToken, hashToken } from "../../lib/crypto";

/**
 * Short-lived, single-use tokens for email verification and password reset.
 *
 * Same discipline as sessions: hand out the RAW token once (in an email link),
 * store only its hash. `consume*` enforces not-expired AND not-already-used,
 * then marks the row used — so a link works exactly once. We return only a
 * userId, never the raw token, from consume.
 */

export const EMAIL_VERIFICATION_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
export const PASSWORD_RESET_TTL_MS = 60 * 60 * 1000; // 1 hour

export async function issueEmailVerificationToken(userId: string): Promise<string> {
  const { raw, hash } = generateToken(32);
  // Invalidate any outstanding verification tokens for this user first.
  await prisma.emailVerificationToken.deleteMany({ where: { userId, usedAt: null } });
  await prisma.emailVerificationToken.create({
    data: { userId, tokenHash: hash, expiresAt: new Date(Date.now() + EMAIL_VERIFICATION_TTL_MS) },
  });
  return raw;
}

export async function consumeEmailVerificationToken(rawToken: string): Promise<string | null> {
  const tokenHash = hashToken(rawToken);
  const record = await prisma.emailVerificationToken.findUnique({ where: { tokenHash } });
  if (!record || record.usedAt || record.expiresAt.getTime() <= Date.now()) {
    return null;
  }
  await prisma.emailVerificationToken.update({
    where: { id: record.id },
    data: { usedAt: new Date() },
  });
  return record.userId;
}

export async function issuePasswordResetToken(userId: string): Promise<string> {
  const { raw, hash } = generateToken(32);
  await prisma.passwordResetToken.deleteMany({ where: { userId, usedAt: null } });
  await prisma.passwordResetToken.create({
    data: { userId, tokenHash: hash, expiresAt: new Date(Date.now() + PASSWORD_RESET_TTL_MS) },
  });
  return raw;
}

export async function consumePasswordResetToken(rawToken: string): Promise<string | null> {
  const tokenHash = hashToken(rawToken);
  const record = await prisma.passwordResetToken.findUnique({ where: { tokenHash } });
  if (!record || record.usedAt || record.expiresAt.getTime() <= Date.now()) {
    return null;
  }
  await prisma.passwordResetToken.update({
    where: { id: record.id },
    data: { usedAt: new Date() },
  });
  return record.userId;
}
