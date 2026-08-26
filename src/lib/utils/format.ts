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

/**
 * A date and a time, for an appointment two people have to keep.
 *
 * Rendered in the reader's own timezone, which is the honest thing to do and
 * almost always WAT for both of them anyway. The weekday is included because
 * "Saturday the 5th" is how someone checks a viewing against their week —
 * "05/09" is not.
 */
export function formatDateTime(iso: string): string {
  return new Intl.DateTimeFormat("en-NG", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}

/**
 * A `YYYY-MM-DD` calendar date, formatted without moving it.
 *
 * `formatDate` cannot be used for these. `new Date("2024-09-01")` is UTC midnight,
 * and rendering that in a UTC-negative timezone shows 31 August — so somebody's
 * move-in date would be off by a day depending on where they read it from. A
 * calendar date has no time and no offset (the server slices it straight out of the
 * ISO string for the same reason), so it is formatted in UTC and stays the day it
 * was.
 */
export function formatDateOnly(date: string): string {
  return new Intl.DateTimeFormat("en-NG", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${date.slice(0, 10)}T00:00:00.000Z`));
}

/**
 * Just the month and year — "September 2024".
 *
 * How a tenancy is actually remembered and described: nobody says "I moved in on
 * the 1st of September", they say "I was there from September". Accepts both
 * `YYYY-MM-DD` (a residence claim's dates) and `YYYY-MM` (the period a public
 * review carries, deliberately coarsened so a reader cannot pin down the exact day
 * somebody moved into a flat), so the two read identically on the page.
 */
export function formatMonthYear(value: string): string {
  const day = value.length === 7 ? `${value}-01` : value.slice(0, 10);
  return new Intl.DateTimeFormat("en-NG", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${day}T00:00:00.000Z`));
}

/**
 * A `datetime-local` input's value for a given instant, in LOCAL time.
 *
 * `toISOString()` cannot be used for this: it converts to UTC, so a Nigerian
 * picking 09:00 would find the field showing 08:00. The input has no timezone of
 * its own — it means whatever the person in front of it means — so the string has
 * to be assembled from the local parts.
 */
export function toDateTimeLocalValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}`
  );
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
