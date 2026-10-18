import { NextResponse, type NextRequest } from "next/server";

type NominatimResult = {
  lat: string;
  lon: string;
  display_name: string;
};

function isNominatimResult(value: unknown): value is NominatimResult {
  return (
    typeof value === "object" &&
    value !== null &&
    "lat" in value &&
    typeof value.lat === "string" &&
    "lon" in value &&
    typeof value.lon === "string" &&
    "display_name" in value &&
    typeof value.display_name === "string"
  );
}

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q")?.trim();
  if (!query || query.length > 120) {
    return NextResponse.json(
      { message: "Enter a location of up to 120 characters." },
      { status: 400 },
    );
  }

  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", query);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("limit", "1");

  let response: Response;
  try {
    response = await fetch(url, {
      headers: {
        "User-Agent": "WALE Housing (hello@walehousing.ng)",
        "Accept-Language": "en",
      },
      next: { revalidate: 86_400 },
      signal: AbortSignal.timeout(8_000),
    });
  } catch (error) {
    console.error("WALE location lookup failed", error);
    return NextResponse.json(
      { message: "Location search is temporarily unavailable. Please try again." },
      { status: 502 },
    );
  }

  if (!response.ok) {
    console.error("WALE location provider returned", response.status);
    return NextResponse.json(
      { message: "Location search is temporarily unavailable. Please try again." },
      { status: 502 },
    );
  }

  const results: unknown = await response.json();
  if (!Array.isArray(results)) {
    return NextResponse.json(
      { message: "The location provider returned an invalid response." },
      { status: 502 },
    );
  }

  const firstResult: unknown = results[0];
  if (firstResult === undefined) {
    return NextResponse.json(
      { message: "We couldn't find that postcode or location. Try a nearby area or city." },
      { status: 404 },
    );
  }

  if (!isNominatimResult(firstResult)) {
    return NextResponse.json(
      { message: "The location provider returned an invalid response." },
      { status: 502 },
    );
  }

  const lat = Number(firstResult.lat);
  const lng = Number(firstResult.lon);
  if (
    !Number.isFinite(lat) ||
    !Number.isFinite(lng) ||
    lat < -90 ||
    lat > 90 ||
    lng < -180 ||
    lng > 180
  ) {
    return NextResponse.json(
      { message: "The location provider returned invalid coordinates." },
      { status: 502 },
    );
  }

  return NextResponse.json({
    location: {
      lat,
      lng,
      label: firstResult.display_name,
    },
  });
}
