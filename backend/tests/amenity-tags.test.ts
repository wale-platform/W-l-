import { describe, expect, it } from "vitest";

import { AMENITY_TAGS, deriveAmenityTags } from "../src/modules/properties/amenity-tags";

/**
 * Amenity tags are a claim WALE makes on a landlord's behalf: a listing that
 * appears under "Running water" is telling a student there is water. So the two
 * things worth testing are that real phrasing is recognised, and that nothing is
 * invented from phrasing that never said it.
 *
 * The strings below are taken from the live catalogue, not made up — every one of
 * them is currently stored on a property.
 */
describe("deriveAmenityTags", () => {
  it("recognises the different ways landlords say the same thing", () => {
    expect(deriveAmenityTags(["Water borehole"])).toEqual(["water"]);
    expect(deriveAmenityTags(["Borehole water"])).toEqual(["water"]);
    expect(deriveAmenityTags(["Water tank"])).toEqual(["water"]);
    expect(deriveAmenityTags(["Water included"])).toEqual(["water"]);

    expect(deriveAmenityTags(["Security guard"])).toEqual(["security"]);
    expect(deriveAmenityTags(["Security gate"])).toEqual(["security"]);
    expect(deriveAmenityTags(["Estate security"])).toEqual(["security"]);
    expect(deriveAmenityTags(["Gated compound"])).toEqual(["security"]);
    expect(deriveAmenityTags(["CCTV"])).toEqual(["security"]);

    expect(deriveAmenityTags(["Solar backup"])).toEqual(["backup_power"]);
    expect(deriveAmenityTags(["Inverter installed"])).toEqual(["backup_power"]);
    expect(deriveAmenityTags(["Generator backup"])).toEqual(["backup_power"]);

    expect(deriveAmenityTags(["Fibre internet"])).toEqual(["internet"]);
    expect(deriveAmenityTags(["En-suite bathroom"])).toEqual(["ensuite"]);
    expect(deriveAmenityTags(["Parking space"])).toEqual(["parking"]);
    expect(deriveAmenityTags(["Prepaid meter"])).toEqual(["prepaid_meter"]);
  });

  it("does not invent an amenity nobody claimed", () => {
    // All real entries in the catalogue. None of them promises water, power,
    // security, parking, furnishing, internet, or an en-suite.
    expect(
      deriveAmenityTags([
        "Newly built",
        "Freshly painted",
        "Quiet compound",
        "High ceilings",
        "Open plan",
        "Family-run",
        "Close to campus",
        "Refurbished",
        "Ground floor available",
        "Lockable rooms",
        "Shared sitting room",
        "All bills included",
      ]),
    ).toEqual([]);
  });

  it("is case-insensitive, because nobody types consistently", () => {
    expect(deriveAmenityTags(["PREPAID METER"])).toEqual(["prepaid_meter"]);
    expect(deriveAmenityTags(["prepaid meter"])).toEqual(["prepaid_meter"]);
  });

  it("returns tags in vocabulary order, not input order", () => {
    // Two listings that offer the same things get identical arrays whichever way
    // round they were typed — which is what makes re-deriving a row a no-op.
    const a = deriveAmenityTags(["Security gate", "Prepaid meter", "Borehole water"]);
    const b = deriveAmenityTags(["Borehole water", "Security gate", "Prepaid meter"]);
    expect(a).toEqual(b);
    expect(a).toEqual(["water", "prepaid_meter", "security"]);
  });

  it("never returns a tag outside the published vocabulary", () => {
    const known = new Set(AMENITY_TAGS.map((t) => t.id));
    const tags = deriveAmenityTags([
      "Water borehole",
      "Prepaid meter",
      "Solar backup",
      "Estate security",
      "Parking space",
      "Fully furnished",
      "Fibre internet",
      "En-suite",
    ]);

    expect(tags.length).toBeGreaterThan(0);
    for (const tag of tags) expect(known.has(tag)).toBe(true);
  });

  it("handles a listing with no amenities at all", () => {
    expect(deriveAmenityTags([])).toEqual([]);
  });
});
