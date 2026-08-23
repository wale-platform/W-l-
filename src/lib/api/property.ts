import { apiClient } from "./client";
import {
  myPropertiesParamsSchema,
  ownerPropertyListResponseSchema,
  ownerPropertySchema,
  propertySchema,
  propertyListResponseSchema,
  searchParamsSchema,
  type MyPropertiesParams,
  type OwnerProperty,
  type OwnerPropertyListResponse,
  type Property,
  type PropertyListResponse,
  type PropertyPayload,
  type SearchParams,
} from "./schemas";

export const propertyApi = {
  /**
   * Fetch a paginated, filterable list of properties.
   */
  async list(params?: Partial<SearchParams>): Promise<PropertyListResponse> {
    const validated = searchParamsSchema.parse(params ?? {});
    const { data } = await apiClient.get("/properties", { params: validated });
    return propertyListResponseSchema.parse(data);
  },

  /**
   * Fetch a single property by ID.
   */
  async getById(id: string): Promise<Property> {
    const { data } = await apiClient.get(`/properties/${id}`);
    return propertySchema.parse(data);
  },

  /**
   * Mark interest in a property — triggers an inspection request email.
   */
  async requestInspection(propertyId: string): Promise<{ message: string }> {
    const { data } = await apiClient.post(`/properties/${propertyId}/inspect`);
    return data;
  },

  /* ------------------------------------------------- the caller's own -- */

  /**
   * The signed-in owner's listings, in any state.
   *
   * A separate endpoint rather than a filter on `list`, because the public
   * catalogue must never return a DRAFT — that decision belongs on the server,
   * not in a query parameter the client chooses.
   */
  async listMine(params?: Partial<MyPropertiesParams>): Promise<OwnerPropertyListResponse> {
    const validated = myPropertiesParamsSchema.parse(params ?? {});
    const { data } = await apiClient.get("/properties/mine", { params: validated });
    return ownerPropertyListResponseSchema.parse(data);
  },

  /** One of the caller's own listings, including its lifecycle state. */
  async getMine(id: string): Promise<OwnerProperty> {
    const { data } = await apiClient.get(`/properties/mine/${id}`);
    return ownerPropertySchema.parse(data);
  },

  /**
   * Create a listing. It always lands in DRAFT — the server decides that, and
   * ignores `status`, `source`, or `ownerId` if they are sent.
   */
  async create(payload: PropertyPayload): Promise<OwnerProperty> {
    const { data } = await apiClient.post("/properties", payload);
    return ownerPropertySchema.parse(data);
  },

  /**
   * Update a listing.
   *
   * Editing a VERIFIED listing sends it back to PENDING_VERIFICATION — the
   * server does that so an approved listing cannot be rewritten into something
   * else while keeping its badge. The response carries the new status, so the
   * caller can tell the owner what just happened rather than guessing.
   */
  async update(id: string, payload: Partial<PropertyPayload>): Promise<OwnerProperty> {
    const { data } = await apiClient.patch(`/properties/${id}`, payload);
    return ownerPropertySchema.parse(data);
  },

  async remove(id: string): Promise<void> {
    await apiClient.delete(`/properties/${id}`);
  },

  /**
   * Send a DRAFT or REJECTED listing to the review queue.
   *
   * Submitting is not approving: only an admin can grant the verified badge, so
   * this returns a listing in PENDING_VERIFICATION.
   */
  async submit(id: string): Promise<OwnerProperty> {
    const { data } = await apiClient.post(`/properties/${id}/submit`);
    return ownerPropertySchema.parse(data);
  },
};
