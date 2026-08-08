 
import {
  PrismaClient,
  PropertySource,
  PropertyStatus,
  PropertyType,
  Role,
} from "@prisma/client";

import { hashPassword } from "../src/lib/crypto";

/**
 * Database seed.
 *
 * Ports the 12 catalogue listings the frontend currently mocks
 * (the frontend's src/lib/fixtures/properties.ts) into real rows, and creates a
 * small set of DEVELOPMENT-ONLY accounts for local testing.
 *
 * ⚠️  The credentials below are throwaway development fixtures. They use the
 *     reserved `.test` domain (never a real inbox) and passwords that exist
 *     ONLY to log in locally. They are NOT secrets and MUST NOT be seeded into
 *     any shared or production database. Real users register through /auth.
 *
 * Idempotent: re-running upserts by natural key, so `npm run db:seed` is safe
 * to repeat. Property ids intentionally match the frontend fixture ids
 * (`wale-001`…) so detail links line up during integration.
 */

const prisma = new PrismaClient();

// ────────────────────────────────────────── Development-only credentials ──
// Documented in README under "Seeded dev accounts". Change/remove freely.
const DEV_PASSWORD = {
  admin: "AdminDev123!",
  student: "StudentDev123!",
  landlord: "LandlordDev123!",
} as const;

type SeedProperty = {
  id: string;
  title: string;
  description: string;
  price: number;
  type: PropertyType;
  bedrooms: number;
  bathrooms: number;
  address: string;
  city: string;
  state: string;
  university: string;
  verified: boolean;
  availableDate: string; // YYYY-MM-DD
  images: string[];
  amenities: string[];
  lat: number;
  lng: number;
  source: PropertySource;
  contactName: string;
  contactPhone: string;
  contactEmail?: string;
  createdAt: string;
  updatedAt: string;
};

const img = (n: number) => `/listings/listing-${String(n).padStart(2, "0")}.jpg`;

// A verified fixture becomes VERIFIED; an unverified one is PENDING_VERIFICATION
// (publicly listable, but not yet vetted). We never mark a listing VERIFIED that
// the fixture did not — verification is a real state, not a default.
const statusFor = (verified: boolean): PropertyStatus =>
  verified ? PropertyStatus.VERIFIED : PropertyStatus.PENDING_VERIFICATION;

const PROPERTIES: SeedProperty[] = [
  {
    id: "wale-001",
    title: "Modern self-contained studio at Akoka",
    description:
      "A newly finished self-contained studio a seven-minute walk from the UNILAG main gate. Tiled throughout, with a private bathroom, fitted kitchenette, and a prepaid meter so you only pay for what you use. The compound is gated with a resident caretaker and 24-hour power on a shared inverter.",
    price: 850000,
    type: PropertyType.studio,
    bedrooms: 1,
    bathrooms: 1,
    address: "12 Akoka Road, Akoka",
    city: "Lagos",
    state: "Lagos",
    university: "unilag",
    verified: true,
    availableDate: "2026-09-01",
    images: [img(1), img(2), img(3)],
    amenities: ["Prepaid meter", "Water borehole", "Gated compound", "Tiled floors", "Wardrobe"],
    lat: 6.5158,
    lng: 3.3898,
    source: PropertySource.wale,
    contactName: "Adebayo Ogunlesi",
    contactPhone: "+2348012345678",
    contactEmail: "adebayo@example.com",
    createdAt: "2026-06-01T09:00:00.000Z",
    updatedAt: "2026-07-20T09:00:00.000Z",
  },
  {
    id: "wale-002",
    title: "Shared 2-bedroom flat near UI Second Gate",
    description:
      "One room available in a well-kept two-bedroom flat shared with a final-year student. Quiet street, five minutes from UI Second Gate, with a small balcony overlooking the compound garden. Rent covers water and refuse; electricity is split between tenants.",
    price: 420000,
    type: PropertyType.shared,
    bedrooms: 2,
    bathrooms: 1,
    address: "8 Ajibode Street, Agbowo",
    city: "Ibadan",
    state: "Oyo",
    university: "ui",
    verified: true,
    availableDate: "2026-08-15",
    images: [img(4), img(5)],
    amenities: ["Furnished", "Water included", "Balcony", "Study desk", "Shared kitchen"],
    lat: 7.4415,
    lng: 3.8964,
    source: PropertySource.wale,
    contactName: "Funmilayo Adeyemi",
    contactPhone: "+2348023456789",
    createdAt: "2026-05-14T09:00:00.000Z",
    updatedAt: "2026-07-11T09:00:00.000Z",
  },
  {
    id: "wale-003",
    title: "One-bedroom apartment, Ede Road",
    description:
      "Spacious one-bedroom with a separate sitting room, ideal for a postgraduate student who needs room to work. Fifteen minutes from OAU campus by keke. Fitted kitchen, en-suite bathroom, and a parking space in the compound.",
    price: 650000,
    type: PropertyType.one_bedroom,
    bedrooms: 1,
    bathrooms: 1,
    address: "24 Ede Road, Ile-Ife",
    city: "Ile-Ife",
    state: "Osun",
    university: "oau",
    verified: false,
    availableDate: "2026-10-01",
    images: [img(6), img(7)],
    amenities: ["Parking space", "En-suite bathroom", "Fitted kitchen", "Security doors"],
    lat: 7.5171,
    lng: 4.5271,
    source: PropertySource.agent,
    contactName: "Yemi Falade",
    contactPhone: "+2348034567890",
    createdAt: "2026-06-22T09:00:00.000Z",
    updatedAt: "2026-07-25T09:00:00.000Z",
  },
  {
    id: "wale-004",
    title: "Budget single room at Samaru",
    description:
      "Affordable single room in a student-friendly compound at Samaru, walking distance to ABU Main Campus. Shared bathroom and kitchen with four other rooms. Best suited to undergraduates on a tight budget who want to stay close to lectures.",
    price: 220000,
    type: PropertyType.shared,
    bedrooms: 1,
    bathrooms: 1,
    address: "5 Samaru Market Road",
    city: "Zaria",
    state: "Kaduna",
    university: "abu",
    verified: true,
    availableDate: "2026-08-01",
    images: [img(8)],
    amenities: ["Shared kitchen", "Water tank", "Close to campus", "Caretaker on site"],
    lat: 11.1553,
    lng: 7.6503,
    source: PropertySource.landlord,
    contactName: "Musa Ibrahim",
    contactPhone: "+2348045678901",
    createdAt: "2026-04-30T09:00:00.000Z",
    updatedAt: "2026-06-18T09:00:00.000Z",
  },
  {
    id: "wale-005",
    title: "Two-bedroom flat at Nsukka Town",
    description:
      "Family-sized two-bedroom flat available to a pair of students willing to share. Both rooms are en-suite, and the flat comes with a generator backup. Ten minutes from UNN by bus, on a tarred road that stays passable through the rainy season.",
    price: 780000,
    type: PropertyType.two_bedroom,
    bedrooms: 2,
    bathrooms: 2,
    address: "17 Enugu Road, Nsukka",
    city: "Nsukka",
    state: "Enugu",
    university: "unn",
    verified: true,
    availableDate: "2026-09-15",
    images: [img(9), img(10)],
    amenities: ["Generator backup", "Two en-suite rooms", "Tarred road access", "Water borehole"],
    lat: 6.8567,
    lng: 7.3958,
    source: PropertySource.wale,
    contactName: "Chinedu Okafor",
    contactPhone: "+2348056789012",
    contactEmail: "chinedu@example.com",
    createdAt: "2026-06-10T09:00:00.000Z",
    updatedAt: "2026-07-28T09:00:00.000Z",
  },
  {
    id: "wale-006",
    title: "Ekosodin self-contained with inverter",
    description:
      "Self-contained room in the Ekosodin student belt, the closest residential area to UNIBEN. Comes with a 1.5kVA inverter already installed, which matters on this street. Freshly painted, with a security gate locked from 11pm.",
    price: 480000,
    type: PropertyType.studio,
    bedrooms: 1,
    bathrooms: 1,
    address: "31 Ekosodin Road",
    city: "Benin City",
    state: "Edo",
    university: "uniben",
    verified: false,
    availableDate: "2026-08-20",
    images: [img(11), img(12)],
    amenities: ["Inverter installed", "Security gate", "Freshly painted", "Prepaid meter"],
    lat: 6.3986,
    lng: 5.6236,
    source: PropertySource.agent,
    contactName: "Osaz Igbinedion",
    contactPhone: "+2348067890123",
    createdAt: "2026-07-02T09:00:00.000Z",
    updatedAt: "2026-07-30T09:00:00.000Z",
  },
  {
    id: "wale-007",
    title: "Serviced studio near FUTA South Gate",
    description:
      "Purpose-built student studio in a serviced block managed on site. Rent is all-inclusive: electricity, water, refuse, and cleaning of common areas. Study desk and wardrobe built in. Four minutes on foot to FUTA South Gate.",
    price: 920000,
    type: PropertyType.studio,
    bedrooms: 1,
    bathrooms: 1,
    address: "Block C, Obakekere Student Village",
    city: "Akure",
    state: "Ondo",
    university: "futa",
    verified: true,
    availableDate: "2026-09-01",
    images: [img(13), img(14)],
    amenities: ["All bills included", "On-site management", "Built-in desk", "CCTV", "Cleaning service"],
    lat: 7.3008,
    lng: 5.1355,
    source: PropertySource.wale,
    contactName: "Obakekere Estates",
    contactPhone: "+2348078901234",
    contactEmail: "info@example.com",
    createdAt: "2026-05-28T09:00:00.000Z",
    updatedAt: "2026-07-15T09:00:00.000Z",
  },
  {
    id: "wale-008",
    title: "Single room, Gwarzo Road, Kano",
    description:
      "Clean single room in a quiet family compound on Gwarzo Road, a short ride from BUK New Campus. Suits a student who prefers a calm environment away from the busier student blocks. Shared facilities, well maintained.",
    price: 260000,
    type: PropertyType.shared,
    bedrooms: 1,
    bathrooms: 1,
    address: "44 Gwarzo Road",
    city: "Kano",
    state: "Kano",
    university: "buk",
    verified: false,
    availableDate: "2026-08-10",
    images: [img(15)],
    amenities: ["Quiet compound", "Shared bathroom", "Water tank", "Family-run"],
    lat: 11.9804,
    lng: 8.5264,
    source: PropertySource.landlord,
    contactName: "Aisha Bello",
    contactPhone: "+2348089012345",
    createdAt: "2026-06-05T09:00:00.000Z",
    updatedAt: "2026-07-09T09:00:00.000Z",
  },
  {
    id: "wale-009",
    title: "Yaba loft for postgraduate students",
    description:
      "Open-plan loft in Yaba with high ceilings and good natural light, a fifteen-minute commute to UNILAG. Popular with postgraduate and part-time students who also work in the Yaba tech cluster. Fibre internet already connected.",
    price: 1450000,
    type: PropertyType.one_bedroom,
    bedrooms: 1,
    bathrooms: 1,
    address: "9 Herbert Macaulay Way, Yaba",
    city: "Lagos",
    state: "Lagos",
    university: "unilag",
    verified: true,
    availableDate: "2026-11-01",
    images: [img(16), img(17)],
    amenities: ["Fibre internet", "High ceilings", "Open plan", "Lift access", "Estate security"],
    lat: 6.5095,
    lng: 3.3711,
    source: PropertySource.wale,
    contactName: "Tolu Bankole",
    contactPhone: "+2348090123456",
    contactEmail: "tolu@example.com",
    createdAt: "2026-07-08T09:00:00.000Z",
    updatedAt: "2026-08-01T09:00:00.000Z",
  },
  {
    id: "wale-010",
    title: "Two-bedroom sharing option at Agbowo",
    description:
      "Two rooms available in a refurbished flat at Agbowo, the main student area for UI. Each tenant gets a lockable room; the sitting room and kitchen are shared. Landlord lives off site but the caretaker responds quickly.",
    price: 380000,
    type: PropertyType.shared,
    bedrooms: 2,
    bathrooms: 1,
    address: "62 Agbowo Express, Ibadan",
    city: "Ibadan",
    state: "Oyo",
    university: "ui",
    verified: false,
    availableDate: "2026-08-25",
    images: [img(18), img(19)],
    amenities: ["Lockable rooms", "Refurbished", "Shared sitting room", "Caretaker"],
    lat: 7.4402,
    lng: 3.9109,
    source: PropertySource.agent,
    contactName: "Segun Adewale",
    contactPhone: "+2348101234567",
    createdAt: "2026-06-19T09:00:00.000Z",
    updatedAt: "2026-07-22T09:00:00.000Z",
  },
  {
    id: "wale-011",
    title: "En-suite room in OAU staff quarters area",
    description:
      "En-suite room in the quieter staff quarters neighbourhood, popular with students who want to avoid the noise of the main student belt. Twenty minutes to campus. Includes a small private veranda and space for a reading table.",
    price: 540000,
    type: PropertyType.studio,
    bedrooms: 1,
    bathrooms: 1,
    address: "3 Road, OAU Staff Quarters",
    city: "Ile-Ife",
    state: "Osun",
    university: "oau",
    verified: true,
    availableDate: "2026-09-10",
    images: [img(20), img(21)],
    amenities: ["Private veranda", "En-suite", "Quiet area", "Water borehole", "Prepaid meter"],
    lat: 7.5223,
    lng: 4.5198,
    source: PropertySource.wale,
    contactName: "Dupe Oyelaran",
    contactPhone: "+2348112345678",
    contactEmail: "dupe@example.com",
    createdAt: "2026-05-03T09:00:00.000Z",
    updatedAt: "2026-07-06T09:00:00.000Z",
  },
  {
    id: "wale-012",
    title: "Newly built block near ABU Kongo Campus",
    description:
      "Brand-new self-contained units in a purpose-built block near Kongo Campus, letting for the first time this session. Solar backup for lighting, borehole water, and a resident security guard. Early applicants get first pick of the ground-floor rooms.",
    price: 600000,
    type: PropertyType.studio,
    bedrooms: 1,
    bathrooms: 1,
    address: "Kongo Campus Road",
    city: "Zaria",
    state: "Kaduna",
    university: "abu",
    verified: true,
    availableDate: "2026-10-15",
    images: [img(22), img(23)],
    amenities: ["Solar backup", "Newly built", "Borehole water", "Security guard", "Ground floor available"],
    lat: 11.1442,
    lng: 7.6497,
    source: PropertySource.landlord,
    contactName: "Kongo Properties",
    contactPhone: "+2348123456789",
    contactEmail: "kongo@example.com",
    createdAt: "2026-07-18T09:00:00.000Z",
    updatedAt: "2026-08-02T09:00:00.000Z",
  },
];

async function seedUsers() {
  const [adminHash, studentHash, landlordHash] = await Promise.all([
    hashPassword(DEV_PASSWORD.admin),
    hashPassword(DEV_PASSWORD.student),
    hashPassword(DEV_PASSWORD.landlord),
  ]);

  await prisma.user.upsert({
    where: { email: "admin@wale.test" },
    update: {},
    create: {
      email: "admin@wale.test",
      firstName: "Wale",
      lastName: "Admin",
      passwordHash: adminHash,
      role: Role.ADMIN,
      emailVerified: true,
      emailVerifiedAt: new Date(),
    },
  });

  await prisma.user.upsert({
    where: { email: "student@wale.test" },
    update: {},
    create: {
      email: "student@wale.test",
      firstName: "Ada",
      lastName: "Student",
      passwordHash: studentHash,
      role: Role.USER,
      university: "unilag",
      emailVerified: true,
      emailVerifiedAt: new Date(),
    },
  });

  await prisma.user.upsert({
    where: { email: "landlord@wale.test" },
    update: {},
    create: {
      email: "landlord@wale.test",
      firstName: "Bola",
      lastName: "Landlord",
      passwordHash: landlordHash,
      role: Role.LANDLORD,
      emailVerified: true,
      emailVerifiedAt: new Date(),
    },
  });

  console.log("  ✓ 3 development accounts (admin/student/landlord @wale.test)");
}

async function seedProperties() {
  for (const p of PROPERTIES) {
    await prisma.property.upsert({
      where: { id: p.id },
      update: {},
      create: {
        id: p.id,
        title: p.title,
        description: p.description,
        price: p.price,
        type: p.type,
        bedrooms: p.bedrooms,
        bathrooms: p.bathrooms,
        source: p.source,
        status: statusFor(p.verified),
        address: p.address,
        city: p.city,
        state: p.state,
        university: p.university,
        latitude: p.lat,
        longitude: p.lng,
        amenities: p.amenities,
        availableDate: new Date(`${p.availableDate}T00:00:00.000Z`),
        contactName: p.contactName,
        contactPhone: p.contactPhone,
        contactEmail: p.contactEmail ?? null,
        createdAt: new Date(p.createdAt),
        updatedAt: new Date(p.updatedAt),
        images: {
          create: p.images.map((url, position) => ({ url, position })),
        },
      },
    });
  }

  console.log(`  ✓ ${PROPERTIES.length} catalogue listings (wale-001…wale-012)`);
}

async function main() {
  console.log("Seeding database…");
  await seedUsers();
  await seedProperties();
  console.log("Seed complete.");
}

main()
  .catch((err) => {
    console.error("Seed failed:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
