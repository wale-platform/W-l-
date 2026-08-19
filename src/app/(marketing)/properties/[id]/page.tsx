import type { Metadata } from "next";
import { PropertyDetail } from "@/components/property/PropertyDetail";
import { properties } from "@/lib/fixtures/properties";

export async function generateStaticParams() {
  return properties.map((property) => ({
    id: property.id,
  }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const property = properties.find((p) => p.id === id);

  if (!property) {
    return {
      title: "Hostel Details | WALE Housing",
    };
  }

  return {
    title: `${property.title} | WALE Housing`,
    description: property.description.substring(0, 150) + "...",
  };
}

export default async function PropertyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return <PropertyDetail id={id} />;
}
