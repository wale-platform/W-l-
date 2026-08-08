import type { NextFunction, Request, Response } from "express";
import type { ZodTypeAny, z } from "zod";

import { ValidationError, type ErrorDetail } from "../lib/errors";

/**
 * Request validation middleware.
 *
 * We NEVER trust the frontend's own validation — every request is re-validated
 * here against a Zod schema before a controller runs. On success the parsed
 * (and coerced/defaulted) value replaces the raw input, so controllers receive
 * fully-typed data. On failure we throw a ValidationError carrying field-level
 * details in the shape the frontend understands (`{ field, message }`).
 *
 * Express 5's `req.query` is a getter without a setter, so validated query
 * values are stashed on `req.validatedQuery` (see src/types/express.d.ts)
 * rather than reassigned.
 */

function toDetails(error: z.ZodError): ErrorDetail[] {
  return error.issues.map((issue) => ({
    field: issue.path.join("."),
    message: issue.message,
  }));
}

export function validateBody<S extends ZodTypeAny>(schema: S) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      throw new ValidationError("Validation failed", toDetails(result.error));
    }
    req.body = result.data;
    next();
  };
}

export function validateQuery<S extends ZodTypeAny>(schema: S) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      throw new ValidationError("Validation failed", toDetails(result.error));
    }
    req.validatedQuery = result.data;
    next();
  };
}

export function validateParams<S extends ZodTypeAny>(schema: S) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.params);
    if (!result.success) {
      throw new ValidationError("Invalid request parameters", toDetails(result.error));
    }
    req.params = result.data as typeof req.params;
    next();
  };
}
