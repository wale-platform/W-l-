import { NextResponse, type NextRequest } from "next/server";
import { properties } from "@/lib/fixtures/properties";
import type { Property } from "@/lib/api/schemas";

/**
 * Mock properties endpoint.
 *
 * This stands in for the real backend. The client talks to it over real
 * HTTP through the same axios layer it will use in production, so
 * swapping to the live API is a `NEXT_PUBLIC_API_BASE_URL` change and
 * nothing else — no component or hook is aware this is a fixture.
 */

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

  // Only filter when explicitly true — absent means "show everything".
  if (params.get("verifiedOnly") === "true" && !property.verified) return false;

  return true;
}

export async function GET(request: NextRequest) {
  await new Promise((resolve) => setTimeout(resolve, LATENCY_MS));

  const params = request.nextUrl.searchParams;
  const page = Math.max(1, Number(params.get("page")) || 1);
  const pageSize = Math.min(50, Math.max(1, Number(params.get("pageSize")) || 12));

  const filtered = properties.filter((property) => matches(property, params));

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const start = (page - 1) * pageSize;

  return NextResponse.json({
    properties: filtered.slice(start, start + pageSize),
    total,
    page,
    pageSize,
    totalPages,
  });
}
