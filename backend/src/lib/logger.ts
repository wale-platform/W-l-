import { pino } from "pino";

import { env, isProd, isTest } from "../config/env";

/**
 * Application logger (pino).
 *
 * - Development: pretty-printed via `pino-pretty` for readability.
 * - Production: line-delimited JSON to stdout, for log shippers.
 * - Test: silent, to keep the test runner output clean.
 *
 * Redaction strips obvious secrets from any object we log. This is a safety
 * net — we still avoid logging sensitive fields in the first place.
 */

const redactPaths = [
  "req.headers.authorization",
  "req.headers.cookie",
  "res.headers['set-cookie']",
  "*.password",
  "*.passwordHash",
  "*.token",
  "*.tokenHash",
  "*.sessionToken",
  "password",
  "passwordHash",
  "token",
];

export const logger = pino({
  level: isTest ? "silent" : env.LOG_LEVEL,
  redact: { paths: redactPaths, censor: "[redacted]" },
  base: undefined, // drop pid/hostname noise; add a service tag if we centralize logs
  ...(isProd
    ? {}
    : {
        transport: {
          target: "pino-pretty",
          options: {
            colorize: true,
            translateTime: "SYS:HH:MM:ss.l",
            ignore: "pid,hostname",
          },
        },
      }),
});

export type Logger = typeof logger;
