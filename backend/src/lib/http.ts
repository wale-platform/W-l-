import type { Response } from "express";

import type { ErrorDetail } from "./errors";

/**
 * The API's response envelope.
 *
 * Every response — success or failure — is wrapped so the client can branch on
 * one consistent shape:
 *
 *   success: { success: true,  data: <T> }
 *   failure: { success: false, error: { code, message, details? } }
 *
 * The frontend's Zod schemas describe the *inner* payload (e.g. the property
 * list), so it unwraps `data` in a thin axios interceptor before parsing.
 * See docs/frontend-integration.md.
 */

export type ApiSuccess<T> = { success: true; data: T };
export type ApiError = {
  success: false;
  error: { code: string; message: string; details?: ErrorDetail[] };
};
export type ApiEnvelope<T> = ApiSuccess<T> | ApiError;

/** Send a success envelope with an explicit status (default 200). */
export function sendSuccess<T>(res: Response, data: T, status = 200): Response {
  const body: ApiSuccess<T> = { success: true, data };
  return res.status(status).json(body);
}

/** Convenience for 201 Created. */
export function sendCreated<T>(res: Response, data: T): Response {
  return sendSuccess(res, data, 201);
}

/** Send a failure envelope. Used by the central error handler. */
export function sendError(
  res: Response,
  status: number,
  code: string,
  message: string,
  details?: ErrorDetail[],
): Response {
  const body: ApiError = {
    success: false,
    error: { code, message, ...(details?.length ? { details } : {}) },
  };
  return res.status(status).json(body);
}
