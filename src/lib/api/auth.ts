import { apiClient } from "./client";
import { loginSchema, type LoginData } from "./schemas";

export const authApi = {
  /**
   * Log in a user with email and password.
   */
  async login(payload: LoginData): Promise<{ message: string; user: any; token: string }> {
    const validated = loginSchema.parse(payload);

    // Once the backend endpoints are ready, uncomment this block:
    // const { data } = await apiClient.post("/auth/login", validated);
    // return data;

    // Mock API call to demonstrate UI loading/error/success states:
    await new Promise((resolve) => setTimeout(resolve, 1200));

    if (validated.email === "error@example.com") {
      throw new Error("Invalid email or password. Use any other email to login successfully.");
    }

    return {
      message: "Welcome back!",
      user: {
        id: "usr_mock123",
        email: validated.email,
        name: "Amina Bello",
        role: "student",
        university: "unilag",
        createdAt: new Date().toISOString(),
      },
      token: "mock_jwt_token_header_payload_signature",
    };
  },

  /**
   * Register a new user account.
   */
  async signUp(payload: any): Promise<{ message: string; user: any; token: string }> {
    // Once the backend endpoints are ready, uncomment this block:
    // const { data } = await apiClient.post("/auth/signup", payload);
    // return data;

    // Mock API call:
    await new Promise((resolve) => setTimeout(resolve, 1200));

    if (payload.email === "error@example.com") {
      throw new Error("This email is already in use. Please use a different email address.");
    }

    return {
      message: "Account created successfully!",
      user: {
        id: "usr_mock124",
        email: payload.email,
        name: payload.name,
        role: "student",
        createdAt: new Date().toISOString(),
      },
      token: "mock_jwt_token_header_payload_signature",
    };
  },
};
