import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

import { hash as argonHash, verify as argonVerify, Algorithm } from "@node-rs/argon2";

import { env } from "../config/env";

/**
 * Cryptographic primitives for auth.
 *
 * Two distinct concerns, deliberately kept separate:
 *
 *  1. PASSWORDS — hashed with Argon2id (memory-hard, GPU-resistant). Each hash
 *     carries its own random salt and parameters, so `verifyPassword` needs no
 *     external state. Never reversible; never logged.
 *
 *  2. OPAQUE TOKENS — session / email-verification / password-reset secrets.
 *     We generate a high-entropy random token, hand the RAW value to the client
 *     (cookie or email link) exactly once, and persist only its HMAC-SHA256
 *     digest keyed by SESSION_SECRET. A database leak therefore cannot yield a
 *     usable token, and lookups stay O(1) via the indexed hash column.
 */

// ─────────────────────────────────────────────────────────────── Passwords ──

// OWASP-aligned Argon2id parameters (m=19MiB, t=2, p=1).
const argonOptions = {
  algorithm: Algorithm.Argon2id,
  memoryCost: 19_456,
  timeCost: 2,
  parallelism: 1,
} as const;

export function hashPassword(plain: string): Promise<string> {
  return argonHash(plain, argonOptions);
}

/**
 * Verify a password against a stored hash. Returns false (never throws) on a
 * malformed/legacy hash, so a corrupt row reads as "wrong password" rather
 * than a 500.
 */
export async function verifyPassword(hash: string, plain: string): Promise<boolean> {
  try {
    return await argonVerify(hash, plain, argonOptions);
  } catch {
    return false;
  }
}

// ────────────────────────────────────────────────────────── Opaque tokens ──

/**
 * A fresh opaque token: `raw` goes to the client once; `hash` is stored.
 * 32 random bytes → 256 bits of entropy, URL-safe base64.
 */
export function generateToken(bytes = 32): { raw: string; hash: string } {
  const raw = randomBytes(bytes).toString("base64url");
  return { raw, hash: hashToken(raw) };
}

/** Deterministic keyed digest of a raw token, for storage and lookup. */
export function hashToken(raw: string): string {
  return createHmac("sha256", env.SESSION_SECRET).update(raw).digest("hex");
}

/**
 * Constant-time comparison of two hex digests. Lookups are already by unique
 * hash, but this is used where a token is compared directly (e.g. CSRF).
 */
export function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}
