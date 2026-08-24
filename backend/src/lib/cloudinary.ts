import { createHash, randomBytes } from "node:crypto";

import { env } from "../config/env";

/**
 * Cloudinary: signing an upload, and recognising a URL that came from one.
 *
 * Photos go from the browser STRAIGHT to Cloudinary. This server never sees the
 * bytes — it only hands out a short-lived signature saying "this upload is
 * allowed". That keeps `CLOUDINARY_API_SECRET` on the server, keeps large
 * binaries out of our API and out of Postgres, and means a slow upload never
 * occupies a request handler.
 *
 * Implemented against node's `crypto` rather than the `cloudinary` SDK: the
 * signature is fifteen lines of well-documented string handling, and the SDK
 * would pull a large dependency in to do that one thing.
 */

/**
 * The one host Cloudinary delivers assets from.
 *
 * Also the only remote host `next.config.ts` lets `next/image` load, so
 * accepting any other host when storing a listing photo would save a URL the
 * site cannot render.
 */
export const CLOUDINARY_DELIVERY_HOST = "res.cloudinary.com";

/** Where uploads land. A prefix, not the whole id — see `uploadPublicId`. */
const UPLOAD_FOLDER = "wale/properties";

/**
 * Formats we accept. Signed into the upload, so the ticket cannot be used to
 * store a PDF or a video, and narrowed to what every browser can display —
 * there is no point storing a photo we then cannot show to a student.
 */
const ALLOWED_FORMATS = "jpg,jpeg,png,webp";

/** Cloudinary honours a signature for one hour from its timestamp. */
const SIGNATURE_TTL_SECONDS = 60 * 60;

export type CloudinaryConfig = {
  cloudName: string;
  apiKey: string;
  apiSecret: string;
};

/**
 * The credentials, or `null` when media is not configured.
 *
 * All three or nothing: two out of three cannot sign anything, and a partially
 * configured deployment should fail the same visible way as an unconfigured one
 * rather than half-working.
 *
 * Read at call time, not at import, so a test can exercise both states.
 */
export function cloudinaryConfig(): CloudinaryConfig | null {
  const cloudName = env.CLOUDINARY_CLOUD_NAME;
  const apiKey = env.CLOUDINARY_API_KEY;
  const apiSecret = env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) return null;
  return { cloudName, apiKey, apiSecret };
}

/** Which of the three are missing — for an operator's log, never for a response. */
export function missingCloudinaryVars(): string[] {
  return (
    [
      ["CLOUDINARY_CLOUD_NAME", env.CLOUDINARY_CLOUD_NAME],
      ["CLOUDINARY_API_KEY", env.CLOUDINARY_API_KEY],
      ["CLOUDINARY_API_SECRET", env.CLOUDINARY_API_SECRET],
    ] as const
  )
    .filter(([, value]) => !value)
    .map(([name]) => name);
}

export type UploadParams = Record<string, string | number | string[] | undefined>;

/**
 * Parameters Cloudinary excludes from the signature.
 *
 * `file` is the binary, `cloud_name` and `resource_type` are part of the URL,
 * and `api_key` identifies the account rather than authorising the call.
 * `signature` obviously cannot sign itself.
 *
 * Filtered here rather than trusted to callers: a signature computed over a
 * parameter Cloudinary does not include is simply rejected, with no clue as to
 * why, so the exclusion belongs at the one place that hashes.
 */
const UNSIGNED_PARAMS = new Set([
  "file",
  "cloud_name",
  "resource_type",
  "api_key",
  "signature",
]);

/**
 * The exact string Cloudinary hashes: `name=value` pairs sorted by name and
 * joined with `&`.
 *
 * Array values are joined with commas (`tags=a,b`), which is also how they must
 * be sent. Empty and absent values are dropped — a parameter that is not POSTed
 * must not be signed, or every upload fails.
 *
 * Sorted by code unit (`<`) rather than `localeCompare`, which is
 * locale-sensitive and would order the same parameters differently on a machine
 * with a different default locale.
 */
export function canonicalUploadParams(params: UploadParams): string {
  return Object.entries(params)
    .filter(
      ([name, value]) =>
        !UNSIGNED_PARAMS.has(name) && value !== undefined && value !== "",
    )
    .map(
      ([name, value]) =>
        [name, Array.isArray(value) ? value.join(",") : String(value)] as const,
    )
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([name, value]) => `${name}=${value}`)
    .join("&");
}

/**
 * Sign upload parameters.
 *
 * The secret is appended to the canonical string with NO delimiter — that is
 * Cloudinary's scheme, not an oversight — and the result is SHA-1 hex.
 * `tests/media.test.ts` pins both worked examples from Cloudinary's own
 * documentation, which is the only way to know this is right without an account.
 */
export function signUploadParams(params: UploadParams, apiSecret: string): string {
  return createHash("sha1")
    .update(`${canonicalUploadParams(params)}${apiSecret}`)
    .digest("hex");
}

/**
 * A public id for one upload, scoped to the uploader.
 *
 * Random rather than derived from the filename: two landlords both uploading
 * `IMG_0001.jpg` must not collide, and a client that could choose the id could
 * overwrite an existing photo — including, if the path were not scoped, someone
 * else's. Since the id is signed, the browser cannot change it either.
 *
 * The user id is reduced to safe characters. Our ids already are, but a `.` or
 * `/` arriving here would change which folder the asset lands in, and that is
 * not a thing to leave to the shape of a primary key.
 */
export function uploadPublicId(userId: string): string {
  const scope = userId.replace(/[^A-Za-z0-9_-]/g, "");
  return `${UPLOAD_FOLDER}/${scope}/${randomBytes(16).toString("hex")}`;
}

export type UploadTicket = {
  /** Where the browser POSTs the file. */
  uploadUrl: string;
  /** Sent verbatim alongside the file. Built here so the signed set and the posted set cannot drift. */
  fields: Record<string, string>;
  /** The id the asset will have, for logging and later cleanup. */
  publicId: string;
  /** When the signature stops being accepted, ISO-8601. */
  expiresAt: string;
};

/**
 * A one-shot permission slip for a single image upload.
 *
 * `fields` is deliberately a bag the client copies into its FormData without
 * interpreting: every signed parameter must be POSTed exactly as signed, so the
 * server that computed the signature also decides the payload. A client cannot
 * add, drop, or edit a field without invalidating the signature.
 *
 * @param now - current epoch seconds; injected so a test can pin the timestamp.
 */
export function createUploadTicket(
  userId: string,
  config: CloudinaryConfig,
  now: number = Math.floor(Date.now() / 1000),
): UploadTicket {
  const publicId = uploadPublicId(userId);

  const signed = {
    public_id: publicId,
    timestamp: now,
    allowed_formats: ALLOWED_FORMATS,
  };

  return {
    uploadUrl: `https://api.cloudinary.com/v1_1/${config.cloudName}/image/upload`,
    fields: {
      ...Object.fromEntries(
        Object.entries(signed).map(([name, value]) => [name, String(value)]),
      ),
      api_key: config.apiKey,
      signature: signUploadParams(signed, config.apiSecret),
    },
    publicId,
    expiresAt: new Date((now + SIGNATURE_TTL_SECONDS) * 1000).toISOString(),
  };
}

/**
 * Is this a Cloudinary delivery URL we are willing to store?
 *
 * The host must match exactly — `evil.res.cloudinary.com` and
 * `https://res.cloudinary.com@evil.example` both parse to a different host, and
 * a port is a different host too. When a cloud name is configured, the path must
 * also start with it, so a listing cannot point at an asset in somebody else's
 * Cloudinary account: that asset can be deleted or replaced by its owner, which
 * would silently change the photos on a listing we had already verified.
 *
 * With no cloud name configured the host is all we can check. That is the local
 * and test situation, and it is why the check is a function rather than a regex
 * literal.
 *
 * Reads `CLOUDINARY_CLOUD_NAME` directly rather than through `cloudinaryConfig`:
 * knowing which account is ours is not the same as being able to upload to it,
 * and a deployment that has the name but no secret should still validate
 * strictly rather than fall back to accepting any cloud.
 */
export function isCloudinaryDeliveryUrl(value: string): boolean {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return false;
  }

  if (url.protocol !== "https:") return false;
  if (url.host !== CLOUDINARY_DELIVERY_HOST) return false;

  const cloudName = env.CLOUDINARY_CLOUD_NAME;
  if (!cloudName) return true;

  return url.pathname.startsWith(`/${cloudName}/`);
}
