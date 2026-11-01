import { apiClient } from "./client";
import {
  propertySchema,
  propertyListResponseSchema,
  searchParamsSchema,
  type Property,
  type PropertyInput,
  type PropertyListResponse,
  type SearchParams,
} from "./schemas";

/**
 * Listings submitted through the app are stored server-side (ids start with
 * `lst_`). The bundled sample listings are static, so admin moderation of
 * those is still simulated in localStorage to keep the demo usable.
 */
const SAMPLE_VERIFICATION_OVERRIDES_KEY = "wale_verification_overrides";
const SAMPLE_DELETED_KEY = "wale_deleted_properties";

function isSubmittedListing(id: string): boolean {
  return id.startsWith("lst_");
}

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const stored = localStorage.getItem(key);
    return stored ? (JSON.parse(stored) as T) : fallback;
  } catch {
    return fallback;
  }
}

function applySampleOverrides(property: Property): Property {
  const overrides = readJson<Record<string, boolean>>(SAMPLE_VERIFICATION_OVERRIDES_KEY, {});
  return overrides[property.id] === undefined
    ? property
    : { ...property, verified: overrides[property.id] };
}

/** Turns an error response into an `Error` carrying the server's message. */
async function requestJson(input: string, init: RequestInit, fallback: string): Promise<unknown> {
  const response = await fetch(`${apiClient.defaults.baseURL}${input}`, {
    credentials: "include",
    ...init,
  });
  const result: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const message =
      typeof result === "object" && result !== null && "message" in result && typeof result.message === "string"
        ? result.message
        : fallback;
    throw new Error(message);
  }
  return result;
}

export const propertyApi = {
  /**
   * Fetch a paginated, filterable list of properties.
   */
  async list(params?: Partial<SearchParams>): Promise<PropertyListResponse> {
    const validated = searchParamsSchema.parse(params ?? {});
    const { data } = await apiClient.get("/properties", { params: validated });
    const response = propertyListResponseSchema.parse(data);

    const deletedIds = readJson<string[]>(SAMPLE_DELETED_KEY, []);
    const visible = response.properties.filter((p) => !deletedIds.includes(p.id));
    return {
      ...response,
      total: response.total - (response.properties.length - visible.length),
      properties: visible.map(applySampleOverrides),
    };
  },

  /**
   * Listings submitted by the signed-in landlord / lawyer / tenant.
   */
  async listMine(): Promise<PropertyListResponse> {
    const data = await requestJson("/properties/mine", { cache: "no-store" }, "Your listings could not be loaded.");
    return propertyListResponseSchema.parse(data);
  },

  /**
   * Fetch a single property by ID.
   */
  async getById(id: string): Promise<Property> {
    const { data } = await apiClient.get(`/properties/${id}`);
    return applySampleOverrides(propertySchema.parse(data));
  },

  /**
   * Submit a new listing with its photos. The server attaches the owner and
   * listing source from the session; new listings start unverified.
   */
  async create(input: PropertyInput, images: File[]): Promise<Property> {
    const body = new FormData();
    body.append("data", JSON.stringify(input));
    for (const image of images) body.append("images", image, image.name);

    const data = await requestJson(
      "/properties",
      { method: "POST", body },
      "Your listing could not be submitted. Please try again.",
    );
    return propertySchema.parse(data);
  },

  /**
   * Update verification status of a property (Admin action).
   */
  async updateVerification(id: string, verified: boolean): Promise<{ success: boolean; propertyId: string }> {
    if (isSubmittedListing(id)) {
      await requestJson(
        `/properties/${id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ verified }),
        },
        "Verification could not be updated.",
      );
      return { success: true, propertyId: id };
    }

    const overrides = readJson<Record<string, boolean>>(SAMPLE_VERIFICATION_OVERRIDES_KEY, {});
    overrides[id] = verified;
    localStorage.setItem(SAMPLE_VERIFICATION_OVERRIDES_KEY, JSON.stringify(overrides));
    return { success: true, propertyId: id };
  },

  /**
   * Delete a property listing (owner or admin).
   */
  async delete(id: string): Promise<{ success: boolean; propertyId: string }> {
    if (isSubmittedListing(id)) {
      await requestJson(`/properties/${id}`, { method: "DELETE" }, "The listing could not be deleted.");
      return { success: true, propertyId: id };
    }

    const deletedIds = readJson<string[]>(SAMPLE_DELETED_KEY, []);
    if (!deletedIds.includes(id)) {
      deletedIds.push(id);
      localStorage.setItem(SAMPLE_DELETED_KEY, JSON.stringify(deletedIds));
    }
    return { success: true, propertyId: id };
  },

  /**
   * Mark interest in a property — triggers an inspection request.
   */
  async requestInspection(propertyId: string): Promise<{ message: string }> {
    // Inspection requests for submitted listings aren't stored server-side yet.
    if (isSubmittedListing(propertyId)) {
      await new Promise((resolve) => setTimeout(resolve, 800));
      return { message: "Your inspection request has been submitted to the landlord." };
    }
    const { data } = await apiClient.post(`/properties/${propertyId}/inspect`);
    return data;
  },
};
