import type { NextFunction, Request, RequestHandler, Response } from "express";

/**
 * Wrap an async route handler so a rejected promise is forwarded to Express's
 * error-handling middleware instead of becoming an unhandled rejection.
 *
 * Express 5 already forwards rejected promises returned from handlers, but
 * wrapping is explicit, version-independent, and keeps controllers free of
 * repetitive try/catch.
 */
export function asyncHandler<
  P = Record<string, string>,
  ResBody = unknown,
  ReqBody = unknown,
  ReqQuery = unknown,
>(
  fn: (
    req: Request<P, ResBody, ReqBody, ReqQuery>,
    res: Response<ResBody>,
    next: NextFunction,
  ) => Promise<unknown>,
): RequestHandler<P, ResBody, ReqBody, ReqQuery> {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
}
