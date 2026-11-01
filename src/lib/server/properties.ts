import type { Property } from "@/lib/api/schemas";
import { ensureSchema, getSql, isDatabaseConfigured } from "./db";

/**
 * Listings submitted through the app live in Neon; the sample listings in
 * `src/lib/fixtures/properties.ts` are merged in alongside them. Database
 * listing ids are prefixed `lst_` so the two never collide.
 */

export const DB_LISTING_PREFIX = "lst_";

interface PropertyRow {
  boosted_until: string | Date | null;
  id: string;
  owner_id: string;
  source: Property["source"];
  title: string;
  description: string;
  price: number;
  type: Property["type"];
  bedrooms: number;
  bathrooms: number;
  address: string;
  city: string;
  state: string;
  university: string | null;
  available_date: string | Date;
  amenities: string[];
  contact_name: string;
  contact_phone: string;
  contact_email: string | null;
  verified: boolean;
  created_at: string | Date;
  updated_at: string | Date;
  image_ids: string[];
}

export function propertyImageUrl(imageId: string): string {
  return `/api/property-images/${imageId}`;
}

function toDateOnly(value: string | Date): string {
  if (typeof value === "string") return value.slice(0, 10);
  // DATE columns arrive as local-midnight Dates; format without UTC shifting.
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${value.getFullYear()}-${month}-${day}`;
}

export function toProperty(row: PropertyRow): Property & { ownerId: string } {
  return {
    id: row.id,
    ownerId: row.owner_id,
    title: row.title,
    description: row.description,
    price: row.price,
    type: row.type,
    bedrooms: row.bedrooms,
    bathrooms: row.bathrooms,
    address: row.address,
    city: row.city,
    state: row.state,
    university: row.university ?? undefined,
    verified: row.verified,
    boostedUntil: row.boosted_until ? new Date(row.boosted_until).toISOString() : null,
    // An active boost shows as featured.
    featured: row.boosted_until ? new Date(row.boosted_until).getTime() > Date.now() : false,
    availableDate: toDateOnly(row.available_date),
    images: row.image_ids.map(propertyImageUrl),
    amenities: row.amenities,
    source: row.source,
    landlord: {
      name: row.contact_name,
      phone: row.contact_phone,
      email: row.contact_email ?? undefined,
    },
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString(),
  };
}

/** Strip the owner id before sending a listing to the public. */
export function toPublicProperty(property: Property & { ownerId: string }): Property {
  const publicProperty: Property & { ownerId?: string } = { ...property };
  delete publicProperty.ownerId;
  return publicProperty;
}

export async function listDbProperties(options: { ownerId?: string } = {}) {
  if (!isDatabaseConfigured()) return [];
  await ensureSchema();
  const sql = getSql();
  const ownerId = options.ownerId ?? null;

  const rows = (await sql`
    SELECT p.*,
      COALESCE(
        (SELECT json_agg(i.id ORDER BY i.position) FROM property_images i WHERE i.property_id = p.id),
        '[]'::json
      ) AS image_ids
    FROM properties p
    WHERE ${ownerId}::text IS NULL OR p.owner_id = ${ownerId}
    ORDER BY p.created_at DESC
  `) as PropertyRow[];

  return rows.map(toProperty);
}

export async function getDbProperty(id: string) {
  if (!id.startsWith(DB_LISTING_PREFIX) || !isDatabaseConfigured()) return null;
  await ensureSchema();

  const rows = (await getSql()`
    SELECT p.*,
      COALESCE(
        (SELECT json_agg(i.id ORDER BY i.position) FROM property_images i WHERE i.property_id = p.id),
        '[]'::json
      ) AS image_ids
    FROM properties p
    WHERE p.id = ${id}
    LIMIT 1
  `) as PropertyRow[];

  return rows[0] ? toProperty(rows[0]) : null;
}
