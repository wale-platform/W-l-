import { apiClient } from "./client";
import {
  propertySchema,
  propertyListResponseSchema,
  searchParamsSchema,
  type Property,
  type PropertyListResponse,
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
};
