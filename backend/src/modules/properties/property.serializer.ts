import type { Property, PropertyImage } from "@prisma/client";

/**
 * Property serialization → the frontend's exact `propertySchema` shape.
 *
 * Deliberate mappings (see docs/frontend-analysis.md):
 *  - `verified` is DERIVED: status === "VERIFIED". The internal lifecycle
 *    (DRAFT/PENDING/…) never crosses the wire.
 *  - `availableDate` is a plain `YYYY-MM-DD` string (frontend uses a date, not
 *    a datetime); timestamps stay full ISO.
 *  - public `landlord` contact is assembled from the denormalized contact*
 *    columns; the internal `ownerId` relation is not exposed.
 *  - `coordinates` is included only when both lat & lng are present.
 */

export type PropertyWithImages = Property & { images: PropertyImage[] };

export type SerializedProperty = {
  id: string;
  title: string;
  description: string;
  price: number;
  type: Property["type"];
  bedrooms: number;
  bathrooms: number;
  address: string;
  city: string;
  state: string;
  university?: string;
  verified: boolean;
  availableDate: string;
  images: string[];
  amenities: string[];
  coordinates?: { lat: number; lng: number };
  source: Property["source"];
  landlord: { name: string; phone: string; email?: string };
  createdAt: string;
  updatedAt: string;
};

/** Format a `@db.Date` value as YYYY-MM-DD using its UTC parts (no TZ drift). */
function toDateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function toSerializedProperty(p: PropertyWithImages): SerializedProperty {
  const images = [...p.images]
    .sort((a, b) => a.position - b.position)
    .map((img) => img.url);

  const result: SerializedProperty = {
    id: p.id,
    title: p.title,
    description: p.description,
    price: p.price,
    type: p.type,
    bedrooms: p.bedrooms,
    bathrooms: p.bathrooms,
    address: p.address,
    city: p.city,
    state: p.state,
    verified: p.status === "VERIFIED",
    availableDate: toDateOnly(p.availableDate),
    images,
    amenities: p.amenities,
    source: p.source,
    landlord: {
      name: p.contactName,
      phone: p.contactPhone,
      ...(p.contactEmail ? { email: p.contactEmail } : {}),
    },
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  };

  if (p.university) result.university = p.university;
  if (p.latitude !== null && p.longitude !== null) {
    result.coordinates = { lat: p.latitude, lng: p.longitude };
  }

  return result;
}

/**
 * What a listing looks like to the person who owns it (and to an admin).
 *
 * `status`, because the public payload deliberately reduces the lifecycle to a
 * `verified` boolean, but an owner staring at their own dashboard has to be able
 * to tell "still a draft" from "waiting on review" from "rejected" — collapsing
 * those three into `verified: false` would leave them with no idea why the
 * listing isn't live.
 *
 * `neighborhood`, because it is writable and the public payload has no field for
 * it. Without it the edit form could not show what was saved, and an area the
 * owner typed once would be invisible to them forever.
 *
 * `statusReason` / `statusChangedAt`, because "Rejected" on its own is a dead
 * end. They come from the newest audit row (see PropertyVerification) and only
 * when that row is the one that produced the CURRENT status — otherwise a
 * landlord who fixed the problem and resubmitted would still be staring at the
 * old complaint while the listing sits in the queue.
 */
export type OwnerProperty = SerializedProperty & {
  status: Property["status"];
  neighborhood?: string;
  statusReason?: string;
  statusChangedAt?: string;
};

/**
 * The newest audit row, when the caller has included one.
 *
 * Prisma's `include: { verifications: { take: 1 } }` yields an array, so this is
 * shaped to accept that directly rather than making every call site unwrap it.
 */
export type LatestDecision = {
  toStatus: Property["status"];
  reason: string | null;
  createdAt: Date;
};

export function toOwnerProperty(
  p: PropertyWithImages & { verifications?: LatestDecision[] },
): OwnerProperty {
  const latest = p.verifications?.[0];
  // Only when it explains the status the listing is in right now. A stale reason
  // is worse than none: it describes a problem that may already be fixed.
  const explains = latest !== undefined && latest.toStatus === p.status;

  return {
    ...toSerializedProperty(p),
    status: p.status,
    ...(p.neighborhood ? { neighborhood: p.neighborhood } : {}),
    ...(explains && latest.reason ? { statusReason: latest.reason } : {}),
    ...(explains ? { statusChangedAt: latest.createdAt.toISOString() } : {}),
  };
}
