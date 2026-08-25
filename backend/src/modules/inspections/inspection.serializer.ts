import type { Inspection, Property, PropertyImage, User } from "@prisma/client";

/**
 * Inspection serialization.
 *
 * Two shapes, because the two sides of a request need different things and must
 * NOT be given each other's:
 *
 *  - `toTenantInspection` — what the person who asked sees. Carries the listing
 *    (they need to know which flat this was) and the landlord's answer.
 *  - `toLandlordInspection` — what the listing's owner sees. Carries who is
 *    asking, because a viewing needs a name to expect at the gate.
 *
 * The contact rule is the one thing worth being careful about here, so it is
 * stated once: the tenant's phone number reaches the landlord only after the
 * landlord has CONFIRMED the viewing. Before that a request is just an ask, and
 * a stream of requests would otherwise be a stream of student phone numbers to
 * whoever posts a listing. After it, the two people have arranged to meet at an
 * address and withholding it would be obstruction rather than privacy.
 *
 * Note what this does not claim: a landlord can confirm a viewing they never
 * intend to attend and get the number that way. This makes harvesting cost
 * something and leave a record, not impossible.
 */

/** Just enough of the listing for a row in either side's list. */
export type InspectionListing = {
  id: string;
  title: string;
  address: string;
  city: string;
  state: string;
  price: number;
  image?: string;
};

export type SerializedInspection = {
  id: string;
  status: Inspection["status"];
  preferredAt: string;
  note?: string;
  response?: string;
  respondedAt?: string;
  createdAt: string;
  property: InspectionListing;
};

/** The landlord's view adds who is asking. */
export type LandlordInspection = SerializedInspection & {
  tenant: { id: string; name: string; phone?: string };
};

type PropertySummary = Pick<
  Property,
  "id" | "title" | "address" | "city" | "state" | "price"
> & { images?: Pick<PropertyImage, "url" | "position">[] };

type TenantSummary = Pick<User, "id" | "firstName" | "lastName" | "phone">;

export type InspectionWithProperty = Inspection & { property: PropertySummary };
export type InspectionWithParties = InspectionWithProperty & { tenant: TenantSummary };

function toListing(p: PropertySummary): InspectionListing {
  // The first photo by position, matching what the listing card shows, so the
  // same flat looks the same in both places.
  const cover = [...(p.images ?? [])].sort((a, b) => a.position - b.position)[0];

  return {
    id: p.id,
    title: p.title,
    address: p.address,
    city: p.city,
    state: p.state,
    price: p.price,
    ...(cover ? { image: cover.url } : {}),
  };
}

function base(i: InspectionWithProperty): SerializedInspection {
  return {
    id: i.id,
    status: i.status,
    preferredAt: i.preferredAt.toISOString(),
    ...(i.note ? { note: i.note } : {}),
    ...(i.response ? { response: i.response } : {}),
    ...(i.respondedAt ? { respondedAt: i.respondedAt.toISOString() } : {}),
    createdAt: i.createdAt.toISOString(),
    property: toListing(i.property),
  };
}

export function toTenantInspection(i: InspectionWithProperty): SerializedInspection {
  return base(i);
}

export function toLandlordInspection(i: InspectionWithParties): LandlordInspection {
  const name = `${i.tenant.firstName} ${i.tenant.lastName}`.trim();

  return {
    ...base(i),
    tenant: {
      id: i.tenant.id,
      name,
      // See the note at the top: only once the landlord has confirmed. Omitted
      // rather than nulled, so the frontend's optional field is the single source
      // of "do I have a number to show".
      ...(i.status === "CONFIRMED" && i.tenant.phone ? { phone: i.tenant.phone } : {}),
    },
  };
}
