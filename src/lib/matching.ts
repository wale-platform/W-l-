import type { Property } from "@/lib/api/schemas";

export type MatchPreferences = {
  location: string;
  maxBudget?: number;
  propertyType: Property["type"] | "any";
  minBedrooms: number;
  verifiedOnly: boolean;
};

export function matchesRequirements(
  property: Property,
  preferences: MatchPreferences,
): boolean {
  return (
    (preferences.maxBudget === undefined ||
      property.price <= preferences.maxBudget) &&
    (preferences.propertyType === "any" ||
      property.type === preferences.propertyType) &&
    property.bedrooms >= preferences.minBedrooms &&
    (!preferences.verifiedOnly || property.verified)
  );
}

export function getMatchScore(
  property: Property,
  preferences: MatchPreferences,
): number {
  let possiblePoints = 0;
  let earnedPoints = 0;

  if (preferences.location.trim()) {
    const terms = preferences.location
      .trim()
      .toLowerCase()
      .split(/[\s,]+/)
      .filter(Boolean);
    const listingDetails = [
      property.title,
      property.description,
      property.address,
      property.city,
      property.state,
    ]
      .join(" ")
      .toLowerCase();
    const matchedTerms = terms.filter((term) => listingDetails.includes(term));

    possiblePoints += 40;
    earnedPoints += (matchedTerms.length / terms.length) * 40;
  }

  if (preferences.maxBudget !== undefined) {
    possiblePoints += 30;
    if (property.price <= preferences.maxBudget) earnedPoints += 30;
  }

  if (preferences.propertyType !== "any") {
    possiblePoints += 20;
    if (property.type === preferences.propertyType) earnedPoints += 20;
  }

  if (preferences.minBedrooms > 0) {
    possiblePoints += 10;
    if (property.bedrooms >= preferences.minBedrooms) earnedPoints += 10;
  }

  if (preferences.verifiedOnly) {
    possiblePoints += 10;
    if (property.verified) earnedPoints += 10;
  }

  return possiblePoints === 0
    ? 100
    : Math.round((earnedPoints / possiblePoints) * 100);
}
