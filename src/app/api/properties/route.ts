import { NextResponse, type NextRequest } from "next/server";
import { properties } from "@/lib/fixtures/properties";
import type { Property } from "@/lib/api/schemas";

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
  const pageSize = Math.min(50, Math.max(1, Number(params.get("pageSize")) || 12));

  // Filter
  const filtered = properties.filter((property) => matches(property, params));

  // Sort
  const sortBy = params.get("sortBy") || "newest";
  const sorted = [...filtered];
  if (sortBy === "price_asc") {
    sorted.sort((a, b) => a.price - b.price);
  } else if (sortBy === "price_desc") {
    sorted.sort((a, b) => b.price - a.price);
  } else {
    // default to newest listing
    sorted.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
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
