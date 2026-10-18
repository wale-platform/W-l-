import type { Metadata } from "next";
import { MapSearch } from "@/components/marketing/MapSearch";

export const metadata: Metadata = {
  title: "Find Homes on the Map",
  description:
    "Search WALE homes by postcode, postal code, neighbourhood, or city and explore nearby listings on an interactive map.",
};

export default async function MapPage({
  searchParams,
}: {
  searchParams: Promise<{ location?: string | string[] }>;
}) {
  const params = await searchParams;
  const location = Array.isArray(params.location)
    ? params.location[0] ?? ""
    : params.location ?? "";

  return <MapSearch initialLocation={location} />;
}
