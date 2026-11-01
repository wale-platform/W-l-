import { universities } from "@/config/site";
import { PROPERTY_TYPES, type Property } from "@/lib/api/schemas";

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

export function formatPropertyType(type: Property["type"]): string {
  return PROPERTY_TYPES.find((option) => option.value === type)?.label ?? type;
}

const sourceLabels: Record<Property["source"], string> = {
  wale: "Listed by WALE",
  agent: "Via agent",
  landlord: "Direct from landlord",
  lawyer: "Listed by lawyer",
  tenant: "Listed by outgoing tenant",
};

export function formatSource(source: Property["source"]): string {
  return sourceLabels[source];
}

export function universityName(id?: string): string | undefined {
  return universities.find((u) => u.id === id)?.short;
}

/**
 * Today's date as `YYYY-MM-DD` in the user's own time zone — the format a
 * `<input type="date">` expects. (`toISOString()` would use UTC, which is
 * already tomorrow late at night in Lagos.)
 */
export function todayDateInputValue(date = new Date()): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}
