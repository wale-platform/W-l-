import { universities } from "@/config/site";
import type { Property } from "@/lib/api/schemas";

/** Naira, no decimals — matches how Nigerian rents are quoted. */
export function formatNaira(amount: number): string {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(amount);
}

/** Rents here are annual, so label them explicitly to avoid ambiguity. */
export function formatRent(amount: number): string {
  return `${formatNaira(amount)}/year`;
}

export function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("en-NG", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(iso));
}

const typeLabels: Record<Property["type"], string> = {
  studio: "Self-contained",
  one_bedroom: "1 bedroom",
  two_bedroom: "2 bedroom",
  shared: "Shared / single room",
};

export function formatPropertyType(type: Property["type"]): string {
  return typeLabels[type];
}

const sourceLabels: Record<Property["source"], string> = {
  wale: "Listed by WALE",
  agent: "Via agent",
  landlord: "Direct from landlord",
};

export function formatSource(source: Property["source"]): string {
  return sourceLabels[source];
}

export function universityName(id?: string): string | undefined {
  return universities.find((u) => u.id === id)?.short;
}
