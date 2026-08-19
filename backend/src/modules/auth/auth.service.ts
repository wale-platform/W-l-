import type { Role, User } from "@prisma/client";

import { corsOrigins } from "../../config/env";
import { hashPassword, verifyPassword } from "../../lib/crypto";
import {
  sendPasswordResetEmail,
  sendVerificationEmail,
} from "../../lib/email";
import { ConflictError, UnauthorizedError } from "../../lib/errors";
import { logger } from "../../lib/logger";
import { prisma } from "../../lib/prisma";
import { isSelfClaimable, mirrorPrimaryRole } from "../users/role.service";
import { toPublicUser, type PublicUser } from "../users/user.serializer";
import { splitName, type LoginInput, type RegisterInput } from "./auth.schemas";
import {
  createSession,
  revokeAllSessions,
  type SessionContext,
} from "./session.service";
import {
  consumeEmailVerificationToken,
  consumePasswordResetToken,
  issueEmailVerificationToken,
  issuePasswordResetToken,
} from "./token.service";

/**
 * Authentication business logic. Controllers stay thin: they translate HTTP to
 * these calls and set/clear cookies. Everything security-sensitive lives here.
 */

export type AuthResult = {
  user: PublicUser;
  rawToken: string;
  expiresAt: Date;
};

const frontendBaseUrl = corsOrigins[0] ?? "http://localhost:3000";

// A constant, valid hash used to equalize verify timing when an account does
// not exist, so login can't be used to enumerate registered emails by timing.
let dummyHashPromise: Promise<string> | null = null;
function getDummyHash(): Promise<string> {
  dummyHashPromise ??= hashPassword("wale-timing-equalizer-not-a-real-password");
  return dummyHashPromise;
}

async function issueAndSendVerification(user: User): Promise<void> {
  try {
    const rawToken = await issueEmailVerificationToken(user.id);
    const verifyUrl = `${frontendBaseUrl}/verify-email?token=${encodeURIComponent(rawToken)}`;
    await sendVerificationEmail(user.email, verifyUrl);
  } catch (err) {
    // Never fail the surrounding request because email delivery hiccupped.
    logger.error({ err, userId: user.id }, "failed to send verification email");
  }
}

export async function register(
  input: RegisterInput,
  ctx: SessionContext,
): Promise<AuthResult> {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) {
    throw new ConflictError("An account with this email already exists", "EMAIL_TAKEN");
  }

  const { firstName, lastName } = splitName(input);
  const passwordHash = await hashPassword(input.password);

  // Signup may only ever produce a self-claimable role. The request body is
  // untrusted, so a client sending role:"ADMIN" must not be able to create an
  // administrator — it falls back to TENANT instead of erroring, since the
  // schema already restricts the field and this is defence in depth.
  const requestedRole = input.role;
  const role: Role =
    requestedRole && isSelfClaimable(requestedRole) ? requestedRole : "TENANT";

  const user = await prisma.$transaction(async (tx) => {
    const created = await tx.user.create({
      data: {
        email: input.email,
        firstName,
        lastName,
        phone: input.phone ?? null,
        passwordHash,
        role,
        university: input.university,
      },
    });
    // Mirror the primary role so the union is consistent immediately.
    await mirrorPrimaryRole(tx, created.id, role);
    // The only role a brand-new account can hold is the one just written, so
    // attach it directly rather than paying for a re-read.
    return { ...created, roles: [{ role }] };
  });

  await issueAndSendVerification(user);

  // Log the user in immediately (email verification is not a login gate yet).
  const { rawToken, expiresAt } = await createSession(user.id, ctx);
  return { user: toPublicUser(user), rawToken, expiresAt };
}

export async function login(input: LoginInput, ctx: SessionContext): Promise<AuthResult> {
  const user = await prisma.user.findUnique({
    where: { email: input.email },
    include: { roles: { select: { role: true } } },
  });

  if (!user) {
    // Burn comparable time, then fail with the same generic error.
    await verifyPassword(await getDummyHash(), input.password);
    throw new UnauthorizedError("Invalid email or password", "INVALID_CREDENTIALS");
  }

  const ok = await verifyPassword(user.passwordHash, input.password);
  if (!ok) {
    throw new UnauthorizedError("Invalid email or password", "INVALID_CREDENTIALS");
  }

  if (user.status !== "ACTIVE") {
    throw new UnauthorizedError("This account is not active", "ACCOUNT_INACTIVE");
  }

  const { rawToken, expiresAt } = await createSession(user.id, ctx);
  return { user: toPublicUser(user), rawToken, expiresAt };
}

export async function verifyEmail(token: string): Promise<PublicUser> {
  const userId = await consumeEmailVerificationToken(token);
  if (!userId) {
    throw new UnauthorizedError(
      "This verification link is invalid or has expired",
      "INVALID_TOKEN",
    );
  }
  const user = await prisma.user.update({
    where: { id: userId },
    data: { emailVerified: true, emailVerifiedAt: new Date() },
    include: { roles: { select: { role: true } } },
  });
  return toPublicUser(user);
}

/**
 * Resend verification. Always resolves the same way whether or not the email
 * exists or is already verified — no account enumeration.
 */
export async function resendVerification(email: string): Promise<void> {
  const user = await prisma.user.findUnique({ where: { email } });
  if (user && !user.emailVerified) {
    await issueAndSendVerification(user);
  }
}

/**
 * Begin password reset. Always resolves the same way regardless of whether the
 * account exists — no account enumeration.
 */
export async function forgotPassword(email: string): Promise<void> {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return;

  try {
    const rawToken = await issuePasswordResetToken(user.id);
    const resetUrl = `${frontendBaseUrl}/reset-password?token=${encodeURIComponent(rawToken)}`;
    await sendPasswordResetEmail(user.email, resetUrl);
  } catch (err) {
    logger.error({ err, userId: user.id }, "failed to send password reset email");
  }
}

/**
 * Complete password reset: consume the token, set the new password, and revoke
 * all existing sessions so any attacker holding an old cookie is logged out.
 */
export async function resetPassword(token: string, newPassword: string): Promise<void> {
  const userId = await consumePasswordResetToken(token);
  if (!userId) {
    throw new UnauthorizedError(
      "This reset link is invalid or has expired",
      "INVALID_TOKEN",
    );
  }
  const passwordHash = await hashPassword(newPassword);
  await prisma.user.update({ where: { id: userId }, data: { passwordHash } });
  await revokeAllSessions(userId);
}

export async function getCurrentUser(userId: string): Promise<PublicUser | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { roles: { select: { role: true } } },
  });
  return user ? toPublicUser(user) : null;
}
