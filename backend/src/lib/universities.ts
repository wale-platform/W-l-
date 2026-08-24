import { z } from "zod";

/**
 * The universities WALE has catchment coverage for.
 *
 * This is a CONTROLLED VOCABULARY, not a label. `Property.university` and
 * `User.university` store the id ("unilag"), the search filter matches on the
 * id, and the frontend turns the id into a display name (see
 * `src/config/site.ts` and `universityName()` in src/lib/utils/format.ts).
 *
 * It is validated rather than left as free text because the filter is an exact
 * match on the column. A landlord who typed "University of Lagos" — or "unilag "
 * or "Unilag" — would have a listing that no `?university=unilag` search can
 * ever find, and nothing would report the problem: the listing would simply not
 * show up. Rejecting the value at the boundary turns a silent hole in search
 * into an ordinary validation error on the field.
 *
 * The frontend mirrors this list, and `scripts/verify-property-contract.mts`
 * asserts that every id the UI offers is one the API accepts, so the two cannot
 * drift apart unnoticed. Adding a campus means adding it in both places.
 */
export const UNIVERSITY_IDS = [
  "unilag",
  "ui",
  "oau",
  "abu",
  "unn",
  "uniben",
  "futa",
  "buk",
] as const;

export type UniversityId = (typeof UNIVERSITY_IDS)[number];

export const universitySchema = z.enum(UNIVERSITY_IDS, {
  errorMap: () => ({ message: "Choose one of the universities WALE covers" }),
});
