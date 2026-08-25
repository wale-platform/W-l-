import "server-only";

import { cache } from "react";

import { propertySchema, type Property } from "./schemas";

/**
 * Server-side read of one public listing.
 *
 * A listing page is rendered on the server rather than fetched in the browser
 * for two reasons that matter more here than convenience: it has to be
 * indexable, and it has to unfurl. A listing link is shared to a WhatsApp group
 * far more often than it is found through search, and an unfurl card is built
 * from the metadata in the initial HTML — a client-fetched title arrives long
 * after the crawler has left.
 *
 * `cache()` memoizes per render pass, so `generateMetadata` and the page itself
 * cost one round trip between them rather than two.
 *
 * Sends no cookies. This is the public projection of a listing — the same bytes
 * for a signed-in tenant and a stranger — so there is nothing to personalize and
 * no reason to hand the backend a session it does not need. Anything
 * viewer-specific on the page (whether you already asked to inspect it, say) is
 * fetched by the client from its own authenticated session.
 */

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000/api/v1";

/**
 * The listing, or null when it is not there to be seen.
 *
 * Null covers three different situations on purpose — no such id, a listing
 * still in draft, and one that was rejected or suspended — because the page
 * above must render the same 404 for all of them. Distinguishing them would let
 * a stranger enumerate ids and learn that a listing exists but is hidden, which
 * is precisely what a suspended listing must not advertise.
 *
 * A transport failure returns null too, and so renders a 404 for a listing that
 * does exist. That is the wrong answer, but it is a safe wrong answer, and the
 * alternative — an exception — renders a 500 page for a visitor who can do
 * nothing about it either way.
 */
export const getPublicProperty = cache(async (id: string): Promise<Property | null> => {
  // The id lands in a path segment, so it is encoded rather than trusted. Next
  // has already decoded it out of the URL by the time it reaches us.
  const path = `${API_BASE}/properties/${encodeURIComponent(id)}`;

  try {
    const response = await fetch(path, {
      headers: { Accept: "application/json" },
      // A listing changes when its owner edits it or an admin decides on it,
      // neither of which this page can predict. Revalidating on a short clock
      // keeps a stale price from outliving a correction by more than a minute,
      // while still absorbing the burst of requests that one shared link causes.
      next: { revalidate: 60 },
      signal: AbortSignal.timeout(5_000),
    });

    // A 404 is the ordinary answer for an id that is not on offer, and is not
    // worth a log line. Anything else means the backend answered badly, which is
    // our problem and not the visitor's.
    if (!response.ok) {
      if (response.status !== 404) {
        console.error(`[property] ${response.status} from ${path}`);
      }
      return null;
    }

    const body: unknown = await response.json();
    const payload =
      typeof body === "object" && body !== null && "data" in body
        ? (body as { data: unknown }).data
        : body;

    // Parsed, not cast. A field the backend renamed should show up as a missing
    // listing rather than as a page that renders "undefined" where the rent goes.
    const parsed = propertySchema.safeParse(payload);
    if (!parsed.success) {
      // Named fields, not the whole payload: this line goes to a server log that
      // is not necessarily private, and the payload carries the landlord's phone
      // number. The field paths are enough to find the drift.
      console.error(
        `[property] ${id} did not match the schema: ${parsed.error.issues
          .map((issue) => `${issue.path.join(".") || "(root)"} ${issue.message}`)
          .join("; ")}`,
      );
      return null;
    }

    return parsed.data;
  } catch (error) {
    // The one branch that renders a 404 for a listing that does exist. It must
    // not be silent — a swallowed transport error looks exactly like a deleted
    // listing from the outside, and nothing in the page can tell them apart.
    console.error(
      `[property] could not reach ${path}: ${error instanceof Error ? `${error.name}: ${error.message}` : String(error)}`,
    );
    return null;
  }
});
