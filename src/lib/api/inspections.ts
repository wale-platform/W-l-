import { z } from "zod";

export type InspectionStatus = "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED" | "COMPLETED";

const inspectionSchema = z.object({
  id: z.string(),
  propertyId: z.string(),
  propertyTitle: z.string(),
  propertyImage: z.string(),
  price: z.number(),
  date: z.string(),
  time: z.string(),
  status: z.enum(["PENDING", "APPROVED", "REJECTED", "CANCELLED", "COMPLETED"]),
  createdAt: z.string(),
  updatedAt: z.string().optional(),
  /** Who asked to inspect (shown to listing owners and admins). */
  requester: z.object({ name: z.string(), email: z.string(), phone: z.string().optional() }).optional(),
  ownerName: z.string().nullable().optional(),
});

export type InspectionRequest = z.infer<typeof inspectionSchema>;

/** `mine` = requests I made · `owner` = requests for my listings · `all` = admin. */
export type InspectionScope = "mine" | "owner" | "all";

async function request(path: string, init?: RequestInit): Promise<unknown> {
  const response = await fetch(path, {
    credentials: "same-origin",
    cache: "no-store",
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  const result: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const message =
      typeof result === "object" && result !== null && "message" in result && typeof result.message === "string"
        ? result.message
        : "Something went wrong. Please try again.";
    throw new Error(message);
  }
  return result;
}

export const inspectionsApi = {
  /** Inspection requests, newest first. */
  async listRequests(scope: InspectionScope = "mine"): Promise<InspectionRequest[]> {
    return z.array(inspectionSchema).parse(await request(`/api/inspections?scope=${scope}`));
  },

  /** Book an inspection of a listing. Requires being signed in. */
  async createRequest(propertyId: string, date: string, time: string): Promise<InspectionRequest> {
    return inspectionSchema.parse(
      await request("/api/inspections", { method: "POST", body: JSON.stringify({ propertyId, date, time }) }),
    );
  },

  async cancelRequest(id: string): Promise<InspectionRequest> {
    return inspectionsApi.updateStatus(id, "CANCELLED");
  },

  async updateStatus(id: string, status: InspectionStatus): Promise<InspectionRequest> {
    return inspectionSchema.parse(
      await request(`/api/inspections/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify({ status }) }),
    );
  },
};
