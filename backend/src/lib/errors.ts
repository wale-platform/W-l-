/**
 * Application error taxonomy.
 *
 * Controllers and services throw these; the central error handler
 * (src/middleware/error.ts) turns them into the wire error envelope
 * `{ success: false, error: { code, message, details? } }`.
 *
 * `code` is a stable, machine-readable string the frontend can branch on
 * (it maps onto the frontend's apiError `code`). `message` is safe to show
 * to a user. `details` optionally carries field-level validation info.
 * `isOperational` distinguishes expected, handled conditions from bugs.
 */

export type ErrorDetail = { field?: string; message: string };

export class AppError extends Error {
  readonly statusCode: number;
  readonly code: string;
  readonly details?: ErrorDetail[];
  readonly isOperational: boolean;

  constructor(
    statusCode: number,
    code: string,
    message: string,
    options?: { details?: ErrorDetail[]; isOperational?: boolean; cause?: unknown },
  ) {
    super(message, options?.cause ? { cause: options.cause } : undefined);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    this.details = options?.details;
    this.isOperational = options?.isOperational ?? true;
    Error.captureStackTrace?.(this, this.constructor);
  }
}

export class BadRequestError extends AppError {
  constructor(message = "Bad request", details?: ErrorDetail[]) {
    super(400, "BAD_REQUEST", message, { details });
  }
}

export class ValidationError extends AppError {
  constructor(message = "Validation failed", details?: ErrorDetail[]) {
    super(422, "VALIDATION_ERROR", message, { details });
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "Authentication required", code = "UNAUTHORIZED") {
    super(401, code, message);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "You do not have permission to perform this action") {
    super(403, "FORBIDDEN", message);
  }
}

export class NotFoundError extends AppError {
  constructor(message = "Resource not found") {
    super(404, "NOT_FOUND", message);
  }
}

export class ConflictError extends AppError {
  constructor(message = "Resource already exists", code = "CONFLICT") {
    super(409, code, message);
  }
}

export class TooManyRequestsError extends AppError {
  constructor(message = "Too many requests, please try again later") {
    super(429, "RATE_LIMITED", message);
  }
}
