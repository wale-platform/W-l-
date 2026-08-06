import axios from "axios";
import { apiErrorSchema } from "./schemas";

/**
 * Base axios instance.
 *
 * `NEXT_PUBLIC_API_BASE_URL` defaults to `/api` (route handlers served
 * from this same app), but can be overridden to point at a separate
 * backend once it exists. The `NEXT_PUBLIC_` prefix makes the var
 * inlinable by the bundler — it is not sent to the server at all.
 */
export const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL ?? "/api",
  timeout: 15_000,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true, // Send cookies on cross-origin requests
});

/**
 * Response interceptor: parse API errors into a predictable shape.
 *
 * The backend may return many error formats; Zod normalizes them here
 * so every consumer can rely on `error.response.data.message`.
 */
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.data) {
      const parsed = apiErrorSchema.safeParse(error.response.data);
      if (parsed.success) {
        error.response.data = parsed.data;
      } else {
        // The backend sent something unparseable; coerce to the shape.
        error.response.data = {
          message:
            typeof error.response.data === "string"
              ? error.response.data
              : "An unexpected error occurred",
        };
      }
    }

    return Promise.reject(error);
  },
);
