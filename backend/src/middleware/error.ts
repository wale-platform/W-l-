import type { NextFunction, Request, Response } from "express";
import { Prisma } from "@prisma/client";
import { ZodError } from "zod";

import { AppError, NotFoundError, type ErrorDetail } from "../lib/errors";
import { sendError } from "../lib/http";
import { isProd } from "../config/env";

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

function zodDetails(err: ZodError): ErrorDetail[] {
  return err.issues.map((i) => ({ field: i.path.join("."), message: i.message }));
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
  }

  // 5. Anything else is unexpected — log the real error, return an opaque 500.
  log.error({ err }, "unhandled error");
  sendError(
    res,
    500,
    "INTERNAL_ERROR",
    isProd ? "Something went wrong. Please try again later." : String(err),
  );
}
