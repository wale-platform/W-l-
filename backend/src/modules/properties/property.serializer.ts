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
