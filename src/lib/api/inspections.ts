import { properties } from "@/lib/fixtures/properties";

export type InspectionStatus = "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED" | "COMPLETED";

export interface InspectionRequest {
  id: string;
  propertyId: string;
  propertyTitle: string;
  propertyImage: string;
  price: number;
  date: string;
  time: string;
  status: InspectionStatus;
  createdAt: string;
}

const LOCAL_STORAGE_KEY = "wale_inspections";

// Initial seed data to make the dashboard look realistic on first visit
const defaultInspections: InspectionRequest[] = [
  {
    id: "insp-001",
    propertyId: "wale-001",
    propertyTitle: "Modern self-contained studio at Tanke",
    propertyImage: "/listings/listing-01.jpg",
    price: 850000,
    date: "2026-08-25",
    time: "10:00 AM - 12:00 PM",
    status: "APPROVED",
    createdAt: "2026-08-18T10:00:00.000Z",
  },
  {
    id: "insp-002",
    propertyId: "wale-002",
    propertyTitle: "Shared 2-bedroom flat near UI Second Gate",
    propertyImage: "/listings/listing-04.jpg",
    price: 420000,
    date: "2026-08-28",
    time: "02:00 PM - 04:00 PM",
    status: "PENDING",
    createdAt: "2026-08-19T08:30:00.000Z",
  },
];

export const inspectionsApi = {
  /**
   * List all inspection requests.
   */
  async listRequests(): Promise<InspectionRequest[]> {
    await new Promise((resolve) => setTimeout(resolve, 600)); // Simulate API delay

    if (typeof window === "undefined") return defaultInspections;

    const data = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!data) {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(defaultInspections));
      return defaultInspections;
    }

    try {
      return JSON.parse(data) as InspectionRequest[];
    } catch {
      return defaultInspections;
    }
  },

  /**
   * Create a new inspection request.
   */
  async createRequest(
    propertyId: string,
    date: string,
    time: string
  ): Promise<InspectionRequest> {
    await new Promise((resolve) => setTimeout(resolve, 1000)); // Simulate API delay

    const property = properties.find((p) => p.id === propertyId);
    if (!property) {
      throw new Error("Property not found");
    }

    const newRequest: InspectionRequest = {
      id: `insp-${Math.random().toString(36).substr(2, 9)}`,
      propertyId,
      propertyTitle: property.title,
      propertyImage: property.images[0],
      price: property.price,
      date,
      time,
      status: "PENDING",
      createdAt: new Date().toISOString(),
    };

    if (typeof window !== "undefined") {
      const current = await inspectionsApi.listRequests();
      const updated = [newRequest, ...current];
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
    }

    return newRequest;
  },

  /**
   * Cancel an inspection request.
   */
  async cancelRequest(id: string): Promise<InspectionRequest> {
    await new Promise((resolve) => setTimeout(resolve, 800)); // Simulate API delay

    if (typeof window === "undefined") {
      throw new Error("Cannot modify state on server side");
    }

    const current = await inspectionsApi.listRequests();
    const target = current.find((r) => r.id === id);
    
    if (!target) {
      throw new Error("Inspection request not found");
    }

    const updated = current.map((r) =>
      r.id === id ? { ...r, status: "CANCELLED" as InspectionStatus } : r
    );
    
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));

    return { ...target, status: "CANCELLED" };
  },

  /**
   * Update status of an inspection request (Landlord / Admin action).
   */
  async updateStatus(id: string, status: InspectionStatus): Promise<InspectionRequest> {
    await new Promise((resolve) => setTimeout(resolve, 800));

    if (typeof window === "undefined") {
      throw new Error("Cannot modify state on server side");
    }

    const current = await inspectionsApi.listRequests();
    const target = current.find((r) => r.id === id);
    
    if (!target) {
      throw new Error("Inspection request not found");
    }

    const updated = current.map((r) =>
      r.id === id ? { ...r, status } : r
    );
    
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));

    return { ...target, status };
  },
};
