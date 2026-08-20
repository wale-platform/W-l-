import { apiClient } from "./client";
import {
  authResponseSchema,
  forgotPasswordSchema,
  loginSchema,
  messageResponseSchema,
  myRolesResponseSchema,
  registerSchema,
  resendVerificationSchema,
  resetPasswordSchema,
  userSchema,
  verifyEmailResponseSchema,
  type AuthResponse,
  type ForgotPasswordData,
  type LoginData,
  type MessageResponse,
  type MyRolesResponse,
  type RegisterData,
  type ResendVerificationData,
  type ResetPasswordData,
  type SignupRole,
  type User,
  type VerifyEmailResponse,
} from "./schemas";

/**
 * Auth API.
 *
 * The session lives in an httpOnly `wale_session` cookie that JavaScript cannot
 * read, so there is no token to store and nothing here persists to
 * localStorage. `withCredentials` on the shared client sends the cookie; the
 * server is the only thing that can tell us who we are, which is why `me()`
 * exists and why it is the source of truth for the UI.
 *
 * Every response is parsed at the boundary, so a backend contract change fails
 * loudly here instead of leaking `undefined` into the UI.
 */

/** Fields the register form collects that the API does not want. */
type RegisterPayload = Omit<RegisterData, "acceptTerms">;

export const authApi = {
  /** Create an account. The response cookie signs the user straight in. */
  async register(payload: RegisterData): Promise<AuthResponse> {
    // Validate the full form (including the terms checkbox), then build the
    // wire body explicitly. Listing the fields beats spreading-minus-omitting:
    // a new UI-only field can't silently ride along to the server.
    const v = registerSchema.parse(payload);
    const body: RegisterPayload = {
      firstName: v.firstName,
      lastName: v.lastName,
      email: v.email,
      phone: v.phone,
      password: v.password,
      confirmPassword: v.confirmPassword,
      role: v.role,
      university: v.university,
    };
    const { data } = await apiClient.post("/auth/register", body);
    return authResponseSchema.parse(data);
  },

  async login(payload: LoginData): Promise<AuthResponse> {
    const validated = loginSchema.parse(payload);
    const { data } = await apiClient.post("/auth/login", validated);
    return authResponseSchema.parse(data);
  },

  /** Revoke this session and clear the cookie. */
  async logout(): Promise<MessageResponse> {
    const { data } = await apiClient.post("/auth/logout");
    return messageResponseSchema.parse(data);
  },

  /** Revoke every session for the account — "sign out everywhere". */
  async logoutAll(): Promise<MessageResponse> {
    const { data } = await apiClient.post("/auth/logout-all");
    return messageResponseSchema.parse(data);
  },

  /**
   * The signed-in user, or `null` when there is no valid session.
   *
   * A 401 here is the normal answer for a guest, not an error, so it is
   * translated rather than thrown — otherwise every page load by a visitor
   * would surface a failure.
   */
  async me(): Promise<User | null> {
    try {
      const { data } = await apiClient.get("/auth/me");
      return userSchema.parse(authResponseSchema.parse(data).user);
    } catch (error) {
      if (isUnauthorized(error)) return null;
      throw error;
    }
  },

  async forgotPassword(payload: ForgotPasswordData): Promise<MessageResponse> {
    const validated = forgotPasswordSchema.parse(payload);
    const { data } = await apiClient.post("/auth/forgot-password", validated);
    return messageResponseSchema.parse(data);
  },

  async resetPassword(payload: ResetPasswordData): Promise<MessageResponse> {
    // confirmPassword is a client-side concern; the server takes token+password.
    const v = resetPasswordSchema.parse(payload);
    const { data } = await apiClient.post("/auth/reset-password", {
      token: v.token,
      password: v.password,
    });
    return messageResponseSchema.parse(data);
  },

  async verifyEmail(token: string): Promise<VerifyEmailResponse> {
    const { data } = await apiClient.post("/auth/verify-email", { token });
    return verifyEmailResponseSchema.parse(data);
  },

  async resendVerification(payload: ResendVerificationData): Promise<MessageResponse> {
    const validated = resendVerificationSchema.parse(payload);
    const { data } = await apiClient.post("/auth/resend-verification", validated);
    return messageResponseSchema.parse(data);
  },

  /* --------------------------------------------------------------- Roles -- */

  /** Every role the signed-in account holds, plus which ones it may self-claim. */
  async myRoles(): Promise<MyRolesResponse> {
    const { data } = await apiClient.get("/users/me/roles");
    return myRolesResponseSchema.parse(data);
  },

  /**
   * Add a self-claimable role to the signed-in account, so one person can be
   * both a tenant and a mover. Only TENANT/LANDLORD/MOVER are accepted — the
   * server rejects LAWYER and ADMIN regardless of what is sent.
   */
  async claimRole(role: SignupRole): Promise<{ roles: string[] }> {
    const { data } = await apiClient.post("/users/me/roles", { role });
    return data as { roles: string[] };
  },

  async dropRole(role: SignupRole): Promise<{ roles: string[] }> {
    const { data } = await apiClient.delete(`/users/me/roles/${role}`);
    return data as { roles: string[] };
  },
};

/**
 * True for a 401. Kept local and structural rather than importing axios just to
 * call `isAxiosError` — the error interceptor has already flattened the body by
 * the time we see it.
 */
function isUnauthorized(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "response" in error &&
    typeof (error as { response?: { status?: unknown } }).response?.status === "number" &&
    (error as { response: { status: number } }).response.status === 401
  );
}
