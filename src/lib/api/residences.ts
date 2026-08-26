import { apiClient } from "./client";
import {
  createResidenceSchema,
  ownerResidenceListResponseSchema,
  ownerResidenceSchema,
  rejectResidenceSchema,
  residenceListParamsSchema,
  residenceListResponseSchema,
  residenceSchema,
  type CreateResidenceInput,
  type OwnerResidence,
  type OwnerResidenceListResponse,
  type RejectResidenceInput,
  type Residence,
  type ResidenceListParams,
  type ResidenceListResponse,
} from "./schemas";

/**
 * Residence history: someone records a place they lived, its owner confirms it.
 *
 * A confirmed claim is what entitles a person to review a property, so this is the
 * gate in front of the whole review domain — which is why `verified` is read off
 * the response and never computed here. The server recomputes it from the claim's
 * status on every read; anything in the browser that decided for itself would
 * eventually call a rejected claim verified.
 *
 * Two audiences, one module, like `inspectionApi`: `mine` is the claimant's own
 * history, `incoming` is the queue of claims against the caller's properties, and
 * the same `id` routes to whichever side the session is on. Nothing here says "I am
 * the owner" — `confirm` and `reject` are scoped to `property.ownerId` on the
 * server, so a claimant calling them gets a 404 like a stranger guessing an id.
 */
export const residenceApi = {
  /**
   * Record a place you lived.
   *
   * Lands UNVERIFIED — the status is the server's, and sending one is ignored
   * rather than trusted. A 409 means either "you have already recorded living here
   * from that date" or "you have too many claims still waiting"; show the message
   * as given, it is the one the server wrote to be read.
   */
  async claim(payload: CreateResidenceInput): Promise<Residence> {
    const validated = createResidenceSchema.parse(payload);
    const { data } = await apiClient.post("/residences", validated);
    return residenceSchema.parse(data);
  },

  /** The claims this person has made, most recent tenancy first. */
  async mine(params?: Partial<ResidenceListParams>): Promise<ResidenceListResponse> {
    const validated = residenceListParamsSchema.parse(params ?? {});
    const { data } = await apiClient.get("/residences/mine", { params: validated });
    return residenceListResponseSchema.parse(data);
  },

  /** Claims made against the caller's properties, oldest first — everyone's, for an admin. */
  async incoming(params?: Partial<ResidenceListParams>): Promise<OwnerResidenceListResponse> {
    const validated = residenceListParamsSchema.parse(params ?? {});
    const { data } = await apiClient.get("/residences/incoming", { params: validated });
    return ownerResidenceListResponseSchema.parse(data);
  },

  /**
   * Yes, this person lived here.
   *
   * No body at all, which is the asymmetry the two endpoints exist to express:
   * agreeing needs no words, refusing does. It also cannot change the dates — an
   * owner who remembers the tenancy differently rejects and says so, because the
   * record is the claimant's history and not the owner's.
   */
  async confirm(id: string): Promise<OwnerResidence> {
    const { data } = await apiClient.post(`/residences/${id}/confirm`);
    return ownerResidenceSchema.parse(data);
  },

  /** No, they did not — in words the claimant is shown verbatim. */
  async reject(id: string, payload: RejectResidenceInput): Promise<OwnerResidence> {
    const validated = rejectResidenceSchema.parse(payload);
    const { data } = await apiClient.post(`/residences/${id}/reject`, validated);
    return ownerResidenceSchema.parse(data);
  },

  /**
   * The claimant takes back a claim nobody has decided on yet.
   *
   * Only ever an UNVERIFIED one — a rejection is not the claimant's to delete, or
   * it would be a clean slate to re-submit from. The server answers
   * `{ withdrawn: true }`; there is nothing to do with it that the absence of an
   * error does not already say, so it is discarded here.
   */
  async withdraw(id: string): Promise<void> {
    await apiClient.delete(`/residences/${id}`);
  },
};
