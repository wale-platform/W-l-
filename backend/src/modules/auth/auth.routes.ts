import { Router } from "express";

import { asyncHandler } from "../../lib/async-handler";
import { requireAuth } from "../../middleware/auth";
import { issueCsrfToken } from "../../middleware/csrf";
import { authRateLimiter } from "../../middleware/security";
import { validateBody } from "../../middleware/validate";
import * as authController from "./auth.controller";
import {
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resendVerificationSchema,
  resetPasswordSchema,
  verifyEmailSchema,
} from "./auth.schemas";

/**
 * Auth routes, mounted at /api/v1/auth.
 *
 * The stricter `authRateLimiter` guards credential and token-issuing endpoints
 * against brute force / abuse. CSRF is enforced globally on unsafe methods
 * (see app.ts); clients bootstrap a token from GET /auth/csrf.
 */
export const authRouter = Router();

// CSRF bootstrap (safe method; no auth required).
authRouter.get("/csrf", issueCsrfToken);

authRouter.post(
  "/register",
  authRateLimiter,
  validateBody(registerSchema),
  asyncHandler(authController.register),
);

authRouter.post(
  "/login",
  authRateLimiter,
  validateBody(loginSchema),
  asyncHandler(authController.login),
);

authRouter.post("/logout", asyncHandler(authController.logout));

authRouter.post("/logout-all", requireAuth, asyncHandler(authController.logoutAll));

authRouter.get("/me", requireAuth, asyncHandler(authController.me));

authRouter.post(
  "/verify-email",
  validateBody(verifyEmailSchema),
  asyncHandler(authController.verifyEmail),
);

authRouter.post(
  "/resend-verification",
  authRateLimiter,
  validateBody(resendVerificationSchema),
  asyncHandler(authController.resendVerification),
);

authRouter.post(
  "/forgot-password",
  authRateLimiter,
  validateBody(forgotPasswordSchema),
  asyncHandler(authController.forgotPassword),
);

authRouter.post(
  "/reset-password",
  authRateLimiter,
  validateBody(resetPasswordSchema),
  asyncHandler(authController.resetPassword),
);

authRouter.get("/sessions", requireAuth, asyncHandler(authController.sessions));

authRouter.delete("/sessions/:id", requireAuth, asyncHandler(authController.revokeSession));
