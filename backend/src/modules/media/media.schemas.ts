import { z } from "zod";

/**
 * Request schema for POST /media/upload-signature.
 *
 * The client chooses nothing. Every parameter that gets signed — where the
 * asset lands, what it is called, which formats are accepted — is decided by
 * the server, because each one is a permission: a caller who could set the
 * folder or the public id could write over another account's photo, and a caller
 * who could set the formats could store whatever it liked.
 *
 * `.strict()` so a client that sends `{ folder: "…" }` gets a 422 telling it the
 * field is not accepted, rather than an upload that silently ignores it and a
 * developer wondering why.
 */
export const uploadSignatureSchema = z.object({}).strict();
