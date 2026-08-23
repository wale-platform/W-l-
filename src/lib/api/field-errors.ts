import { apiErrorSchema } from "./schemas";

/**
 * Pull field-level validation errors out of a failed mutation.
 *
 * The API client's error interceptor has already flattened the backend's
 * `{ error: { code, message, details } }` into `response.data`, so a 422 from
 * Zod arrives as `details: [{ field, message }]`. Mapping those back onto the
 * matching inputs is what makes a server-side rejection feel like ordinary
 * validation instead of a wall of red at the top of the form.
 *
 * Returns an empty list for anything that isn't a field-level failure, so
 * callers can always iterate without checking first.
 */
export function fieldErrorsFrom(
  error: unknown,
): { field: string; message: string }[] {
  if (typeof error !== "object" || error === null || !("response" in error)) {
    return [];
  }

  const body = (error as { response?: { data?: unknown } }).response?.data;
  const parsed = apiErrorSchema.safeParse(body);
  if (!parsed.success) return [];

  const { details, field, message } = parsed.data;

  if (details?.length) {
    return details
      .filter((d): d is { field: string; message: string } => Boolean(d.field))
      .map((d) => ({ field: d.field, message: d.message }));
  }

  // Some errors carry a single field instead of a details array (e.g. a
  // duplicate-email conflict).
  return field ? [{ field, message }] : [];
}

/** Status code of a failed request, when there is one. */
export function statusOf(error: unknown): number | undefined {
  if (typeof error !== "object" || error === null || !("response" in error)) {
    return undefined;
  }
  const status = (error as { response?: { status?: unknown } }).response?.status;
  return typeof status === "number" ? status : undefined;
}

/**
 * The message to show a person when a request fails.
 *
 * Only ever the backend's own wording, which is written for a human and has
 * already been flattened by the client's error interceptor. Anything else — an
 * axios "Request failed with status code 422", a Zod parse failure, a transport
 * error — becomes the fallback, because raw error objects are not something to
 * put in front of a user.
 *
 * A lone `details` entry wins over the top-level message: one detail means one
 * reason, and the reason ("Add at least one photo before submitting for review")
 * is what the person needs, where the top-level message may only be the category
 * it falls under ("Validation failed"). With several details there is no single
 * sentence to promote, so the umbrella stands and the individual messages go on
 * their fields via `fieldErrorsFrom`.
 */
export function messageFrom(
  error: unknown,
  fallback = "Something went wrong. Please try again.",
): string {
  if (typeof error !== "object" || error === null || !("response" in error)) {
    return fallback;
  }

  const body = (error as { response?: { data?: unknown } }).response?.data;
  const parsed = apiErrorSchema.safeParse(body);
  if (!parsed.success) return fallback;

  const { message, details } = parsed.data;

  if (details?.length === 1 && details[0].message.length > 0) return details[0].message;

  return message.length > 0 ? message : fallback;
}
