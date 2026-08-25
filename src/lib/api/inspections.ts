import { apiClient } from "./client";
import {
  createInspectionSchema,
  inspectionDecisionSchema,
  inspectionListParamsSchema,
  inspectionListResponseSchema,
  inspectionSchema,
  landlordInspectionListResponseSchema,
  landlordInspectionSchema,
  myInspectionResponseSchema,
  type CreateInspectionInput,
  type Inspection,
  type InspectionDecision,
  type InspectionListParams,
  type InspectionListResponse,
  type LandlordInspection,
  type LandlordInspectionListResponse,
} from "./schemas";

/**
 * Viewing requests: a tenant asks, the listing's owner answers.
 *
 * Two audiences, one module — unlike `propertyApi` and `adminApi`, which are
 * split because their operations are literally different endpoints. Here the
 * split is per call: `/mine` is the tenant's own requests, `/incoming` is the
 * landlord's queue, and the same `id` routes to whichever side the session is.
 *
 * The server decides which side a caller is on from the session; nothing here
 * says "I am the landlord", so a tenant calling `respond` gets a 404 like a
 * stranger guessing an id, and nothing this file does changes that.
 */
export const inspectionApi = {
  /**
   * Ask to view a listing.
   *
   * The listing has to be one that is actually on offer and not the caller's
   * own — both are the server's calls. A 409 here means "you have already asked"
   * or "this is your own listing"; show the message as given, it is the one the
   * server wrote for seeing in the UI.
   */
  async request(propertyId: string, payload: CreateInspectionInput): Promise<Inspection> {
    const validated = createInspectionSchema.parse(payload);
    const { data } = await apiClient.post(`/inspections/properties/${propertyId}`, validated);
    return inspectionSchema.parse(data);
  },

  /** Whether this tenant already has a live request on this listing. */
  async mineFor(propertyId: string): Promise<Inspection | null> {
    const { data } = await apiClient.get(`/inspections/properties/${propertyId}/mine`);
    return myInspectionResponseSchema.parse(data).inspection;
  },

  /** The requests this tenant has made, newest first. */
  async mine(params?: Partial<InspectionListParams>): Promise<InspectionListResponse> {
    const validated = inspectionListParamsSchema.parse(params ?? {});
    const { data } = await apiClient.get("/inspections/mine", { params: validated });
    return inspectionListResponseSchema.parse(data);
  },

  /** The requests made on this landlord's listings, soonest first. */
  async incoming(params?: Partial<InspectionListParams>): Promise<LandlordInspectionListResponse> {
    const validated = inspectionListParamsSchema.parse(params ?? {});
    const { data } = await apiClient.get("/inspections/incoming", { params: validated });
    return landlordInspectionListResponseSchema.parse(data);
  },

  /**
   * Confirm, decline, or mark as viewed.
   *
   * `preferredAt` intentionally cannot be changed from here — a landlord who
   * wants a different time declines and says so rather than rewriting the
   * appointment under the tenant.
   */
  async respond(id: string, decision: InspectionDecision): Promise<LandlordInspection> {
    const validated = inspectionDecisionSchema.parse(decision);
    const { data } = await apiClient.patch(`/inspections/${id}/respond`, validated);
    return landlordInspectionSchema.parse(data);
  },

  /** The tenant calls off a request, live or confirmed. */
  async cancel(id: string): Promise<Inspection> {
    const { data } = await apiClient.post(`/inspections/${id}/cancel`);
    return inspectionSchema.parse(data);
  },
};
