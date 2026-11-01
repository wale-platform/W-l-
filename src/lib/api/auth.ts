import {
  authUserSchema,
  loginSchema,
  type AuthUser,
  type ChangePasswordData,
  type ForgotPasswordData,
  type LoginData,
  type ResetPasswordData,
  type SignUpFormData,
} from "./schemas";

export type { AuthUser };

/**
 * Auth always talks to this app's own route handlers (`/api/auth/*`), not
 * `NEXT_PUBLIC_API_BASE_URL`, because the session cookie is set on this
 * origin. The cookie is httpOnly, so nothing here can read or store the
 * session token — the browser sends it automatically.
 */
async function authFetch(
  path: string,
  init: RequestInit,
  fallbackMessage: string,
): Promise<{ message: string; result: unknown }> {
  const response = await fetch(`/api/auth/${path}`, {
    ...init,
    credentials: "same-origin",
    headers: { "Content-Type": "application/json", ...init.headers },
  });

  const result: unknown = await response.json().catch(() => null);
  const message =
    typeof result === "object" &&
    result !== null &&
    "message" in result &&
    typeof result.message === "string"
      ? result.message
      : fallbackMessage;

  if (!response.ok) throw new Error(message);
  return { message, result };
}

/** For endpoints that sign the user in and return their account. */
async function authRequest(
  path: string,
  init: RequestInit,
  fallbackMessage: string,
): Promise<{ message: string; user: AuthUser }> {
  const { message, result } = await authFetch(path, init, fallbackMessage);
  const user = authUserSchema.safeParse(
    typeof result === "object" && result !== null && "user" in result ? result.user : null,
  );
  if (!user.success) throw new Error("The server returned an invalid account response.");

  return { message, user: user.data };
}

const post = (body: unknown): RequestInit => ({ method: "POST", body: JSON.stringify(body) });

export const authApi = {
  /**
   * Log in a user with email and password.
   */
  async login(payload: LoginData): Promise<{ message: string; user: AuthUser }> {
    const validated = loginSchema.parse(payload);
    return authRequest(
      "login",
      post(validated),
      "Login could not be completed.",
    );
  },

  /**
   * Register a new user account. The server signs the new user in.
   */
  async signUp(payload: SignUpFormData): Promise<{ message: string; user: AuthUser }> {
    return authRequest(
      "signup",
      post(payload),
      "Your account could not be created.",
    );
  },

  /** Emails a reset link. Resolves the same way whether or not the account exists. */
  async forgotPassword(payload: ForgotPasswordData): Promise<{ message: string }> {
    const { message } = await authFetch("forgot-password", post(payload), "The reset link could not be sent.");
    return { message };
  },

  /** Sets a new password from an emailed link and signs the user in. */
  async resetPassword(payload: ResetPasswordData): Promise<{ message: string; user: AuthUser }> {
    return authRequest("reset-password", post(payload), "Your password could not be reset.");
  },

  async verifyEmail(token: string): Promise<{ message: string }> {
    const { message } = await authFetch("verify-email", post({ token }), "Your email could not be confirmed.");
    return { message };
  },

  async resendVerification(): Promise<{ message: string }> {
    const { message } = await authFetch("resend-verification", post({}), "The link could not be sent.");
    return { message };
  },

  async changePassword(payload: ChangePasswordData): Promise<{ message: string; user: AuthUser }> {
    return authRequest("change-password", post(payload), "Your password could not be changed.");
  },

  async logout(): Promise<void> {
    await fetch("/api/auth/logout", { method: "POST", credentials: "same-origin" });
  },

  /**
   * The signed-in user, or `null` when there is no valid session.
   */
  async me(): Promise<AuthUser | null> {
    const response = await fetch("/api/auth/me", { credentials: "same-origin", cache: "no-store" });
    if (response.status === 401) return null;
    if (!response.ok) throw new Error("Your session could not be checked. Please try again.");

    const result: unknown = await response.json();
    const user = authUserSchema.safeParse(
      typeof result === "object" && result !== null && "user" in result ? result.user : null,
    );
    if (!user.success) throw new Error("The server returned an invalid account response.");
    return user.data;
  },
};
