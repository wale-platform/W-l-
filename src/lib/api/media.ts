import axios from "axios";

import { apiClient } from "./client";
import {
  cloudinaryUploadResultSchema,
  uploadTicketSchema,
  type UploadTicket,
} from "./schemas";

/**
 * Photo uploads.
 *
 * Two requests, in this order:
 *
 *   1. ask OUR backend for a signature  (authenticated, CSRF-protected)
 *   2. POST the file to CLOUDINARY      (cross-origin, no cookies, no secrets)
 *
 * The file never passes through our API. That keeps the Cloudinary secret on the
 * server, keeps image binaries out of Postgres, and means a landlord on a slow
 * connection is uploading to a CDN edge rather than holding one of our request
 * handlers open for a minute.
 *
 * Step 2 deliberately does NOT use `apiClient`: that instance sends our session
 * cookie, attaches a CSRF header, forces `Content-Type: application/json`, and
 * unwraps a `{ success, data }` envelope. Every one of those is wrong here —
 * sending our cookies to a third party most of all.
 */

/** A separate instance so no interceptor and no credential leaks to the provider. */
const providerClient = axios.create({
  // An upload is not a JSON call: photos are megabytes and phone connections are
  // slow, so the API-wide 15s would fail perfectly good uploads.
  timeout: 120_000,
  withCredentials: false,
});

/**
 * What we accept, matching the `allowed_formats` the backend signs into the
 * ticket. Checked here so a landlord is told in the form rather than by a
 * rejection from Cloudinary they cannot interpret.
 */
export const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

export const ACCEPTED_IMAGE_ACCEPT_ATTR = ACCEPTED_IMAGE_TYPES.join(",");

/**
 * Largest file we will send.
 *
 * A modern phone photo is 2–6 MB, so this is generous; it exists to catch the
 * accidental 40 MB export before it wastes ten minutes of somebody's data
 * bundle. It is not a security control — the real limits are Cloudinary's own
 * account settings and the signed `allowed_formats`.
 */
export const MAX_IMAGE_BYTES = 12 * 1024 * 1024;

/** Why a file was refused, phrased for the person who picked it. */
export function imageRejectionReason(file: File): string | null {
  if (!(ACCEPTED_IMAGE_TYPES as readonly string[]).includes(file.type)) {
    return `${file.name} isn't a JPG, PNG or WebP image`;
  }
  if (file.size > MAX_IMAGE_BYTES) {
    const mb = Math.round(MAX_IMAGE_BYTES / (1024 * 1024));
    return `${file.name} is too large — keep photos under ${mb}MB`;
  }
  return null;
}

/** Pull a readable message out of Cloudinary's own error shape. */
function providerMessage(error: unknown): string {
  const fallback = "That photo couldn't be uploaded. Please try again.";
  if (!axios.isAxiosError(error)) return fallback;

  const data: unknown = error.response?.data;
  if (typeof data === "object" && data !== null && "error" in data) {
    const inner = (data as { error: unknown }).error;
    if (typeof inner === "object" && inner !== null && "message" in inner) {
      const message = (inner as { message: unknown }).message;
      // Cloudinary's messages are aimed at developers ("Invalid image file"),
      // but they are accurate and short, so they beat a generic apology.
      if (typeof message === "string" && message.length <= 200) return message;
    }
  }
  return fallback;
}

export const mediaApi = {
  /**
   * Ask for permission to upload one photo.
   *
   * A 503 here means media is not configured on the server — a real state, not a
   * bug, and one the UI reports as "add photos later" rather than as a failure.
   */
  async uploadTicket(): Promise<UploadTicket> {
    const { data } = await apiClient.post("/media/upload-signature", {});
    return uploadTicketSchema.parse(data);
  },

  /**
   * Upload one image and return the URL to store on the listing.
   *
   * `fields` is copied into the form exactly as received — see the note on
   * `uploadTicketSchema`: editing or reordering them invalidates the signature.
   * `file` goes last, which is conventional and keeps the parameters ahead of the
   * megabytes.
   */
  async uploadImage(file: File, signal?: AbortSignal): Promise<string> {
    const ticket = await mediaApi.uploadTicket();

    const form = new FormData();
    for (const [name, value] of Object.entries(ticket.fields)) {
      form.append(name, value);
    }
    form.append("file", file);

    try {
      const { data } = await providerClient.post(ticket.uploadUrl, form, { signal });
      return cloudinaryUploadResultSchema.parse(data).secure_url;
    } catch (error) {
      if (axios.isCancel(error)) throw error;
      throw new Error(providerMessage(error));
    }
  },
};
