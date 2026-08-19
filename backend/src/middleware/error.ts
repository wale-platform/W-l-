import type { NextFunction, Request, Response } from "express";
import { Prisma } from "@prisma/client";
import { ZodError } from "zod";

import { AppError, NotFoundError, type ErrorDetail } from "../lib/errors";
import { sendError } from "../lib/http";
import { isDev } from "../config/env";

/**
 * Central error handling.
 *
 * Every thrown/forwarded error funnels through `errorHandler`, which maps it to
 * the wire error envelope. Known/operational errors (AppError, Zod, known
 * Prisma codes) produce precise status codes; anything else is treated as an
 * unexpected 500 and its internals are NOT leaked to the client.
 */

/** 404 for unmatched routes — forwarded into the error handler. */
export function notFoundHandler(req: Request, _res: Response, next: NextFunction): void {
  next(new NotFoundError(`Route not found: ${req.method} ${req.originalUrl}`));
}

/** Client-safe text for every "the database is not answering" condition. */
const DB_UNAVAILABLE_MESSAGE = "Service temporarily unavailable. Please try again in a moment.";

function zodDetails(err: ZodError): ErrorDetail[] {
  return err.issues.map((i) => ({ field: i.path.join("."), message: i.message }));
}

/**
 * A one-line, path-free summary of an unexpected error, for local debugging only.
 *
 * Prisma errors in particular stringify to a multi-line block containing absolute
 * filesystem paths and a source excerpt of the failing call. That is useful in a
 * terminal and unacceptable on the wire, so we keep the first line only and drop
 * anything that looks like a path.
 */
function devSummary(err: unknown): string {
  const raw = err instanceof Error ? `${err.name}: ${err.message}` : String(err);
  const firstLine = raw.split("\n").find((l) => l.trim().length > 0) ?? "Unknown error";
  return firstLine.replace(/([A-Za-z]:)?[\\/][^\s'"]+/g, "<path>").slice(0, 300);
}

 
export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  const log = req.log ?? console;

  // 1. Our own operational errors — already shaped correctly.
  if (err instanceof AppError) {
    if (!err.isOperational) {
      log.error({ err }, "non-operational AppError");
    }
    sendError(res, err.statusCode, err.code, err.message, err.details);
    return;
  }

  // 2. Zod errors that reached here without our validate middleware.
  if (err instanceof ZodError) {
    sendError(res, 422, "VALIDATION_ERROR", "Validation failed", zodDetails(err));
    return;
  }

  // 3. Malformed JSON body (thrown by express.json()).
  if (err instanceof SyntaxError && "body" in err) {
    sendError(res, 400, "BAD_REQUEST", "Malformed JSON in request body");
    return;
  }

  // 4. Known Prisma request errors.
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2002") {
      // Unique constraint violation.
      const target = (err.meta?.target as string[] | undefined)?.join(", ");
      sendError(
        res,
        409,
        "CONFLICT",
        target ? `A record with this ${target} already exists` : "Resource already exists",
      );
      return;
    }
    if (err.code === "P2025") {
      // Record not found for the operation.
      sendError(res, 404, "NOT_FOUND", "Resource not found");
      return;
    }
    if (err.code === "P2024") {
      // Timed out acquiring a connection from the pool — the database is
      // unreachable or saturated, not a client mistake.
      log.error({ err }, "prisma connection pool timeout");
      sendError(res, 503, "SERVICE_UNAVAILABLE", DB_UNAVAILABLE_MESSAGE);
      return;
    }
  }

  // 5. The database itself could not be reached (bad/paused host, DNS, cold
  //    pooler, exhausted pool). Retrying later is the right client behaviour, so
  //    this is a 503 — and its raw text must never reach the client, because
  //    Prisma embeds absolute paths and a source excerpt in the message.
  if (
    err instanceof Prisma.PrismaClientInitializationError ||
    err instanceof Prisma.PrismaClientRustPanicError
  ) {
    log.error({ err }, "database unavailable");
    sendError(res, 503, "SERVICE_UNAVAILABLE", DB_UNAVAILABLE_MESSAGE);
    return;
  }

  // 6. Anything else is unexpected — log the real error, return an opaque 500.
  //    Fail closed: only an explicit NODE_ENV=development gets a diagnostic
  //    hint, and even then it is a single path-free line. An unset NODE_ENV in
  //    a deployed environment must not turn into an information leak.
  log.error({ err }, "unhandled error");
  sendError(
    res,
    500,
    "INTERNAL_ERROR",
    isDev ? devSummary(err) : "Something went wrong. Please try again later.",
  );
}
