import "dotenv/config";
import { z } from "zod";

/**
 * Environment validation.
 *
 * Every external input is validated — including the environment. The process
 * refuses to boot with a misconfigured or insecure setup rather than failing
 * deep inside a request. Import `env` anywhere; it is parsed exactly once.
 */

const booleanish = z
  .enum(["true", "false", "1", "0"])
  .transform((v) => v === "true" || v === "1");

const envSchema = z
  .object({
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
    PORT: z.coerce.number().int().positive().default(4000),
    LOG_LEVEL: z
      .enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"])
      .default("info"),

    // Database
    DATABASE_URL: z.string().url(),
    DIRECT_URL: z.string().url().optional(),

    // CORS allowlist (comma-separated)
    FRONTEND_URL: z.string().default("http://localhost:3000"),

    // Sessions & cookies
    SESSION_SECRET: z
      .string()
      .min(32, "SESSION_SECRET must be at least 32 characters"),
    SESSION_COOKIE_NAME: z.string().default("wale_session"),
    SESSION_TTL_DAYS: z.coerce.number().int().positive().default(7),
    COOKIE_SAMESITE: z.enum(["lax", "strict", "none"]).default("lax"),
    COOKIE_SECURE: booleanish.default("false"),
    COOKIE_DOMAIN: z.string().optional(),

    // CSRF
    CSRF_ENABLED: booleanish.default("true"),
    CSRF_COOKIE_NAME: z.string().default("wale_csrf"),

    // Email
    EMAIL_TRANSPORT: z.enum(["log", "smtp"]).default("log"),
    EMAIL_FROM: z.string().default("Wale Housing <no-reply@walehousing.ng>"),
    SMTP_HOST: z.string().optional(),
    SMTP_PORT: z.coerce.number().int().positive().default(587),
    SMTP_SECURE: booleanish.default("false"),
    SMTP_USER: z.string().optional(),
    SMTP_PASS: z.string().optional(),

    // Rate limiting
    RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(900_000),
    RATE_LIMIT_MAX: z.coerce.number().int().positive().default(300),
    AUTH_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(20),

    // Cloudinary (optional; media wiring is a later phase)
    CLOUDINARY_CLOUD_NAME: z.string().optional(),
    CLOUDINARY_API_KEY: z.string().optional(),
    CLOUDINARY_API_SECRET: z.string().optional(),
  })
  .superRefine((val, ctx) => {
    if (val.EMAIL_TRANSPORT === "smtp" && !val.SMTP_HOST) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["SMTP_HOST"],
        message: "SMTP_HOST is required when EMAIL_TRANSPORT=smtp",
      });
    }
    if (val.COOKIE_SAMESITE === "none" && !val.COOKIE_SECURE) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["COOKIE_SECURE"],
        message: 'COOKIE_SECURE must be true when COOKIE_SAMESITE="none"',
      });
    }
    if (val.NODE_ENV === "production" && !val.COOKIE_SECURE) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["COOKIE_SECURE"],
        message: "COOKIE_SECURE must be true in production",
      });
    }
  });

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const issues = parsed.error.issues
    .map((i) => `  - ${i.path.join(".") || "(root)"}: ${i.message}`)
    .join("\n");
  // Fail fast and loud, but never echo the offending values (they may be secrets).
  throw new Error(`Invalid environment configuration:\n${issues}`);
}

export const env = parsed.data;

export const isProd = env.NODE_ENV === "production";
export const isTest = env.NODE_ENV === "test";
export const isDev = env.NODE_ENV === "development";

/** CORS allowlist derived from FRONTEND_URL (comma-separated). */
export const corsOrigins = env.FRONTEND_URL.split(",")
  .map((o) => o.trim())
  .filter(Boolean);
