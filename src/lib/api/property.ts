import { apiClient } from "./client";
import {
  propertySchema,
  propertyListResponseSchema,
  searchParamsSchema,
  type Property,
  type PropertyListResponse,
  type SearchParams,
} from "./schemas";
const CUSTOM_PROPS_KEY = "wale_custom_properties";
const VERIFICATION_OVERRIDES_KEY = "wale_verification_overrides";
const DELETED_PROPS_KEY = "wale_deleted_properties";

// Helper to filter custom properties on the client side
function matchesSearchParams(property: Property, params: Partial<SearchParams>): boolean {
  const query = params.query?.toLowerCase().trim();
  if (query) {
    const haystack = [
      property.title,
      property.description,
      property.address,
      property.city,
      property.state,
    ]
      .join(" ")
      .toLowerCase();
    if (!haystack.includes(query)) return false;
  }

  if (params.university && property.university !== params.university) return false;
  if (params.type && property.type !== params.type) return false;
  if (params.minPrice && property.price < params.minPrice) return false;
  if (params.maxPrice && property.price > params.maxPrice) return false;
  if (params.source && property.source !== params.source) return false;

  if (params.verifiedOnly && !property.verified) return false;

  return true;
}

export const propertyApi = {
  /**
   * Fetch a paginated, filterable list of properties.
   */
  async list(params?: Partial<SearchParams>): Promise<PropertyListResponse> {
    const validated = searchParamsSchema.parse(params ?? {});
    
    // Fetch default ones from API
    const { data } = await apiClient.get("/properties", { params: { ...validated, page: 1, pageSize: 100 } });
    const apiProps = (data.properties || []) as Property[];

    // Retrieve custom properties, overrides, and deleted list from localStorage
    let customProps: Property[] = [];
    let overrides: Record<string, boolean> = {};
    let deletedIds: string[] = [];

    if (typeof window !== "undefined") {
      const storedProps = localStorage.getItem(CUSTOM_PROPS_KEY);
      if (storedProps) {
        try {
          customProps = JSON.parse(storedProps);
        } catch (e) {}
      }

      const storedOverrides = localStorage.getItem(VERIFICATION_OVERRIDES_KEY);
      if (storedOverrides) {
        try {
          overrides = JSON.parse(storedOverrides);
        } catch (e) {}
      }

      const storedDeleted = localStorage.getItem(DELETED_PROPS_KEY);
      if (storedDeleted) {
        try {
          deletedIds = JSON.parse(storedDeleted);
        } catch (e) {}
      }
    }

    // Apply verification overrides to both API and custom properties
    const applyOverrides = (p: Property) => {
      if (overrides[p.id] !== undefined) {
        return { ...p, verified: overrides[p.id] };
      }
      return p;
    };

    const combined = [
      ...customProps.map(applyOverrides),
      ...apiProps.map(applyOverrides)
    ];

    // Filter combined list
    const filtered = combined
      .filter((p) => !deletedIds.includes(p.id))
      .filter((p) => matchesSearchParams(p, validated));

    // Sort
    const sortBy = validated.sortBy || "newest";
    if (sortBy === "price_asc") {
      filtered.sort((a, b) => a.price - b.price);
    } else if (sortBy === "price_desc") {
      filtered.sort((a, b) => b.price - a.price);
    } else {
      filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }

    const total = filtered.length;
    const page = validated.page ?? 1;
    const pageSize = validated.pageSize ?? 12;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const start = (page - 1) * pageSize;

    return {
      properties: filtered.slice(start, start + pageSize),
      total,
      page,
      pageSize,
      totalPages,
    };
  },

  /**
   * Fetch a single property by ID.
   */
  async getById(id: string): Promise<Property> {
    // Check localStorage first
    if (typeof window !== "undefined") {
      const storedProps = localStorage.getItem(CUSTOM_PROPS_KEY);
      if (storedProps) {
        try {
          const customProps: Property[] = JSON.parse(storedProps);
          const found = customProps.find((p) => p.id === id);
          if (found) {
            // Apply override if exists
            const storedOverrides = localStorage.getItem(VERIFICATION_OVERRIDES_KEY);
            if (storedOverrides) {
              const overrides = JSON.parse(storedOverrides);
              if (overrides[id] !== undefined) {
                found.verified = overrides[id];
              }
            }
            return found;
          }
        } catch (e) {}
      }
    }

    const { data } = await apiClient.get(`/properties/${id}`);
    const property = propertySchema.parse(data);

    // Apply verification override if exists
    if (typeof window !== "undefined") {
      const storedOverrides = localStorage.getItem(VERIFICATION_OVERRIDES_KEY);
      if (storedOverrides) {
        try {
          const overrides = JSON.parse(storedOverrides);
          if (overrides[id] !== undefined) {
            property.verified = overrides[id];
          }
        } catch (e) {}
      }
    }

    return property;
  },

  /**
   * Create a new property listing.
   */
  async create(payload: Omit<Property, "id" | "verified" | "createdAt" | "updatedAt">): Promise<Property> {
    await new Promise((resolve) => setTimeout(resolve, 1000)); // Simulate network latency

    const newProperty: Property = {
      ...payload,
      id: `custom-${Math.random().toString(36).substr(2, 9)}`,
      verified: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (typeof window !== "undefined") {
      const storedProps = localStorage.getItem(CUSTOM_PROPS_KEY);
      let list: Property[] = [];
      if (storedProps) {
        try {
          list = JSON.parse(storedProps);
        } catch (e) {}
      }
      list.unshift(newProperty);
      localStorage.setItem(CUSTOM_PROPS_KEY, JSON.stringify(list));
    }

    return newProperty;
  },

  /**
   * Update verification status of a property (Admin action).
   */
  async updateVerification(id: string, verified: boolean): Promise<{ success: boolean; propertyId: string }> {
    await new Promise((resolve) => setTimeout(resolve, 800));

    if (typeof window !== "undefined") {
      // Save verification override
      const storedOverrides = localStorage.getItem(VERIFICATION_OVERRIDES_KEY);
      let overrides: Record<string, boolean> = {};
      if (storedOverrides) {
        try {
          overrides = JSON.parse(storedOverrides);
        } catch (e) {}
      }
      overrides[id] = verified;
      localStorage.setItem(VERIFICATION_OVERRIDES_KEY, JSON.stringify(overrides));

      // Also update inside custom properties if it's there
      const storedProps = localStorage.getItem(CUSTOM_PROPS_KEY);
      if (storedProps) {
        try {
          const list: Property[] = JSON.parse(storedProps);
          const updatedList = list.map((p) => (p.id === id ? { ...p, verified } : p));
          localStorage.setItem(CUSTOM_PROPS_KEY, JSON.stringify(updatedList));
        } catch (e) {}
      }
    }

    return { success: true, propertyId: id };
  },

  /**
   * Delete a property listing (Landlord / Lawyer / Tenant / Admin action).
   */
  async delete(id: string): Promise<{ success: boolean; propertyId: string }> {
    await new Promise((resolve) => setTimeout(resolve, 800));

    if (typeof window !== "undefined") {
      // 1. Remove from custom properties if exists
      const storedProps = localStorage.getItem(CUSTOM_PROPS_KEY);
      if (storedProps) {
        try {
          const list: Property[] = JSON.parse(storedProps);
          const filteredList = list.filter((p) => p.id !== id);
          localStorage.setItem(CUSTOM_PROPS_KEY, JSON.stringify(filteredList));
        } catch (e) {}
      }

      // 2. Add to deleted overrides list (in case it is an API seeded property)
      const storedDeleted = localStorage.getItem(DELETED_PROPS_KEY);
      let deletedIds: string[] = [];
      if (storedDeleted) {
        try {
          deletedIds = JSON.parse(storedDeleted);
        } catch (e) {}
      }
      if (!deletedIds.includes(id)) {
        deletedIds.push(id);
        localStorage.setItem(DELETED_PROPS_KEY, JSON.stringify(deletedIds));
      }
    }

    return { success: true, propertyId: id };
  },

  /**
   * Mark interest in a property — triggers an inspection request.
   */
  async requestInspection(propertyId: string): Promise<{ message: string }> {
    // If it's a custom property, we can mock it
    if (propertyId.startsWith("custom-")) {
      await new Promise((resolve) => setTimeout(resolve, 800));
      return { message: "Your inspection request has been submitted to the landlord." };
    }
    const { data } = await apiClient.post(`/properties/${propertyId}/inspect`);
    return data;
  },
};
