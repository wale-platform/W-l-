import { NextResponse, type NextRequest } from "next/server";
import { properties } from "@/lib/fixtures/properties";
import {
  LISTING_ROLES,
  PROPERTY_IMAGE_LIMITS,
  propertyInputSchema,
  type Property,
} from "@/lib/api/schemas";
import { getSql } from "@/lib/server/db";
import { notify } from "@/lib/server/notifications";
import { logActivity } from "@/lib/server/activity";
import { getDbProperty, listDbProperties, toPublicProperty } from "@/lib/server/properties";
import { jsonResponse, newId, requireUser, serverErrorResponse } from "@/lib/server/session";

export const runtime = "nodejs";

/** Artificial latency so skeleton states are actually observable in dev. */
const LATENCY_MS = 600;

function matches(property: Property, params: URLSearchParams): boolean {
  const query = params.get("query")?.toLowerCase().trim();
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

  const university = params.get("university");
  if (university && property.university !== university) return false;

  const type = params.get("type");
  if (type && property.type !== type) return false;

  const minPrice = params.get("minPrice");
  if (minPrice && property.price < Number(minPrice)) return false;

  const maxPrice = params.get("maxPrice");
  if (maxPrice && property.price > Number(maxPrice)) return false;

  // Filter by listing source (e.g. wale, landlord, agent)
  const source = params.get("source");
  if (source && property.source !== source) return false;

  // Filter by availability (e.g. "immediate" or date-based)
  const availability = params.get("availability");
  if (availability === "immediate") {
    const today = new Date().toISOString().split("T")[0];
    if (property.availableDate > today) return false;
  }

  // Only filter when explicitly true — absent means "show everything".
  if (params.get("verifiedOnly") === "true" && !property.verified) return false;

  return true;
}

export async function GET(request: NextRequest) {
  await new Promise((resolve) => setTimeout(resolve, LATENCY_MS));

  const params = request.nextUrl.searchParams;
  const page = Math.max(1, Number(params.get("page")) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(params.get("pageSize")) || 12));

  // Submitted listings come from the database. If it is unreachable, still
  // serve the sample listings rather than failing the whole search.
  let submitted: Property[] = [];
  try {
    submitted = (await listDbProperties()).map(toPublicProperty);
  } catch (error) {
    console.error("[properties] Failed to load submitted listings", error instanceof Error ? error.name : "UnknownError");
  }

  // Filter
  const filtered = [...submitted, ...properties].filter((property) => matches(property, params));

  // Sort
  const sortBy = params.get("sortBy") || "newest";
  // Active paid boosts always rank first; the chosen order applies within each group.
  const boosted = (property: Property) =>
    property.boostedUntil && new Date(property.boostedUntil).getTime() > Date.now() ? 1 : 0;
  const sorted = [...filtered];
  if (sortBy === "price_asc") {
    sorted.sort((a, b) => boosted(b) - boosted(a) || a.price - b.price);
  } else if (sortBy === "price_desc") {
    sorted.sort((a, b) => boosted(b) - boosted(a) || b.price - a.price);
  } else {
    // default to newest listing
    sorted.sort(
      (a, b) => boosted(b) - boosted(a) || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }

  const total = sorted.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const start = (page - 1) * pageSize;

  return NextResponse.json({
    properties: sorted.slice(start, start + pageSize),
    total,
    page,
    pageSize,
    totalPages,
  });
}

/* ------------------------------------------------------------- Create -- */

const MAX_REQUEST_BYTES =
  PROPERTY_IMAGE_LIMITS.maxCount * PROPERTY_IMAGE_LIMITS.maxBytes + 1024 * 1024;

/**
 * Identify the image format from its first bytes rather than trusting the
 * browser-supplied MIME type or file extension.
 */
function sniffImageType(bytes: Uint8Array): string | null {
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (
    bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 &&
    bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a
  ) {
    return "image/png";
  }
  const ascii = (from: number, to: number) => String.fromCharCode(...bytes.subarray(from, to));
  if (ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP") return "image/webp";
  return null;
}

/**
 * Submit a listing. Multipart body: `data` is the JSON listing details and
 * `images` holds 1–8 photos. New listings start unverified until an admin
 * inspects them.
 */
export async function POST(request: Request) {
  const auth = await requireUser(LISTING_ROLES);
  if (auth instanceof NextResponse) return auth;
  const user = auth;

  const declaredLength = Number(request.headers.get("content-length"));
  if (declaredLength > MAX_REQUEST_BYTES) {
    return jsonResponse({ message: "The upload is too large. Use fewer or smaller photos." }, 413);
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return jsonResponse({ message: "Invalid upload. Please try again." }, 400);
  }

  let data: unknown;
  try {
    data = JSON.parse(String(form.get("data") ?? ""));
  } catch {
    return jsonResponse({ message: "Listing details are missing." }, 400);
  }

  const parsed = propertyInputSchema.safeParse(data);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return jsonResponse({ message: first.message, field: String(first.path[0] ?? "") }, 422);
  }
  const input = parsed.data;

  // Accounts created with Google have no phone on file, so ask for one.
  const contactPhone = input.contactPhone ?? user.phone;
  if (!contactPhone) {
    return jsonResponse(
      { message: "Add a phone number students can call about this property.", field: "contactPhone" },
      422,
    );
  }

  const files = form.getAll("images").filter((value): value is File => value instanceof File);
  if (files.length === 0) {
    return jsonResponse({ message: "Add at least one photo of the property.", field: "images" }, 422);
  }
  if (files.length > PROPERTY_IMAGE_LIMITS.maxCount) {
    return jsonResponse(
      { message: `Add no more than ${PROPERTY_IMAGE_LIMITS.maxCount} photos.`, field: "images" },
      422,
    );
  }

  const images: { contentType: string; base64: string }[] = [];
  for (const file of files) {
    if (file.size > PROPERTY_IMAGE_LIMITS.maxBytes) {
      return jsonResponse({ message: `"${file.name}" is larger than 5 MB.`, field: "images" }, 422);
    }
    const bytes = new Uint8Array(await file.arrayBuffer());
    const contentType = sniffImageType(bytes);
    if (!contentType) {
      return jsonResponse(
        { message: `"${file.name}" isn't a JPEG, PNG or WebP image.`, field: "images" },
        422,
      );
    }
    images.push({ contentType, base64: Buffer.from(bytes).toString("base64") });
  }

  const propertyId = newId("lst"); // matches DB_LISTING_PREFIX
  const source = user.role as (typeof LISTING_ROLES)[number];

  try {
    const sql = getSql();
    await sql`
      INSERT INTO properties (
        id, owner_id, source, title, description, price, type, bedrooms, bathrooms,
        address, city, state, university, available_date, amenities,
        contact_name, contact_phone, contact_email
      ) VALUES (
        ${propertyId}, ${user.id}, ${source}, ${input.title}, ${input.description},
        ${input.price}, ${input.type}, ${input.bedrooms}, ${input.bathrooms},
        ${input.address}, ${input.city}, ${input.state}, ${input.university || null},
        ${input.availableDate}, ${JSON.stringify(input.amenities)}::jsonb,
        ${input.contactName ?? user.fullName},
        ${contactPhone},
        ${user.email}
      )
    `;

    try {
      // One statement per photo keeps each request to the database small.
      for (const [position, image] of images.entries()) {
        await sql`
          INSERT INTO property_images (id, property_id, position, content_type, data)
          VALUES (${newId("img")}, ${propertyId}, ${position}, ${image.contentType}, decode(${image.base64}, 'base64'))
        `;
      }
    } catch (error) {
      // Don't leave a listing behind with missing photos.
      await sql`DELETE FROM properties WHERE id = ${propertyId}`;
      throw error;
    }

    await logActivity(user.id, "listing.created", `${user.fullName} submitted "${input.title}"`, { type: "listing", id: propertyId });
    await notify(user.id, {
      title: "Listing submitted",
      body: `"${input.title}" is pending verification. We'll let you know once a WALE agent has checked it.`,
      link: `/properties/${propertyId}`,
    });

    const created = await getDbProperty(propertyId);
    return jsonResponse(created ? toPublicProperty(created) : { id: propertyId }, 201);
  } catch (error) {
    return serverErrorResponse("properties:create", error);
  }
}
