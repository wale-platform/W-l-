import type { AuthRole } from "@/lib/api/schemas";

export type InspectionStatus = "pending" | "approved" | "rejected" | "cancelled" | "completed";

export interface InspectionRow {
  id: string;
  property_id: string;
  property_title: string;
  property_image: string | null;
  property_price: number;
  owner_id: string | null;
  requester_id: string;
  preferred_date: string | Date;
  time_slot: string;
  status: InspectionStatus;
  created_at: string | Date;
  updated_at: string | Date;
  requester_name?: string | null;
  requester_email?: string | null;
  requester_phone?: string | null;
  owner_name?: string | null;
}

function dateOnly(value: string | Date): string {
  if (typeof value === "string") return value.slice(0, 10);
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${value.getFullYear()}-${month}-${day}`;
}

/** API shape; status is upper-case to match the existing client type. */
export function toInspection(row: InspectionRow) {
  return {
    id: row.id,
    propertyId: row.property_id,
    propertyTitle: row.property_title,
    propertyImage: row.property_image ?? "",
    price: row.property_price,
    date: dateOnly(row.preferred_date),
    time: row.time_slot,
    status: row.status.toUpperCase(),
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString(),
    requester: row.requester_name
      ? { name: row.requester_name, email: row.requester_email ?? "", phone: row.requester_phone ?? undefined }
      : undefined,
    ownerName: row.owner_name ?? null,
  };
}

/**
 * Which status changes a user may make on an inspection:
 * - the requester can cancel a pending or approved request;
 * - the listing owner can approve/decline a pending one and complete an approved one;
 * - admins can set any status.
 */
export function allowedTransition(
  row: Pick<InspectionRow, "status" | "requester_id" | "owner_id">,
  user: { id: string; role: AuthRole },
  next: InspectionStatus,
): boolean {
  if (user.role === "admin") return next !== row.status;
  if (user.id === row.requester_id && next === "cancelled") {
    return row.status === "pending" || row.status === "approved";
  }
  if (user.id === row.owner_id) {
    if (row.status === "pending") return next === "approved" || next === "rejected";
    if (row.status === "approved") return next === "completed" || next === "cancelled";
  }
  return false;
}

export const statusVerb: Record<InspectionStatus, string> = {
  pending: "reopened",
  approved: "approved",
  rejected: "declined",
  cancelled: "cancelled",
  completed: "marked as completed",
};

/** Where an owner manages their incoming inspection requests. */
export function ownerInspectionsPath(role: AuthRole | null | undefined): string {
  if (role === "landlord") return "/landlord/inspections";
  if (role === "admin") return "/admin/inspections";
  return "/notifications";
}
