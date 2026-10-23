import { timingSafeEqual } from "node:crypto";
import { neon } from "@neondatabase/serverless";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const allowedStatuses = ["new", "contacted", "invited", "converted", "unsubscribed"] as const;
type WaitlistStatus = (typeof allowedStatuses)[number];

function getConfiguredAdminKey(): string | null {
  const key = process.env.ADMIN_API_KEY;
  return key && Buffer.byteLength(key) >= 32 ? key : null;
}

function isAuthorized(request: Request, expectedKey: string): boolean {
  const authorization = request.headers.get("authorization") ?? "";
  const suppliedKey = authorization.startsWith("Bearer ")
    ? authorization.slice("Bearer ".length)
    : "";
  const expected = Buffer.from(expectedKey);
  const supplied = Buffer.from(suppliedKey);
  return expected.length === supplied.length && timingSafeEqual(expected, supplied);
}

function database() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL is not configured.");
  return neon(databaseUrl);
}

async function ensureWaitlistStatusColumn() {
  const sql = database();
  await sql`
    CREATE TABLE IF NOT EXISTS waitlist_signups (
      id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      name VARCHAR(120) NOT NULL,
      email VARCHAR(254) NOT NULL UNIQUE,
      phone VARCHAR(32),
      role VARCHAR(20) NOT NULL CHECK (
        role IN ('student', 'tenant', 'landlord', 'lawyer')
      ),
      status VARCHAR(20) NOT NULL DEFAULT 'new',
      consent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await sql`
    ALTER TABLE waitlist_signups
    ADD COLUMN IF NOT EXISTS phone VARCHAR(32)
  `;
  await sql`
    ALTER TABLE waitlist_signups
    ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'new'
  `;
  return sql;
}

export async function GET(request: Request) {
  const adminKey = getConfiguredAdminKey();
  if (!adminKey) {
    return NextResponse.json(
      { message: "Waitlist administration requires an ADMIN_API_KEY of at least 32 characters." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
  if (!isAuthorized(request, adminKey)) {
    return NextResponse.json(
      { message: "Admin access is required." },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  }

  try {
    const sql = await ensureWaitlistStatusColumn();
    const signups = await sql`
      SELECT
        id::text AS id,
        name,
        email,
        phone,
        role,
        status,
        consent_at,
        created_at
      FROM waitlist_signups
      ORDER BY created_at DESC, id DESC
    `;
    return NextResponse.json(signups, {
      headers: { "Cache-Control": "no-store, private" },
    });
  } catch (error) {
    console.error(
      "[admin-waitlist] Failed to load signups",
      error instanceof Error ? error.name : "UnknownError",
    );
    return NextResponse.json(
      { message: "Waitlist records could not be loaded." },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}

export async function PATCH(request: Request) {
  const adminKey = getConfiguredAdminKey();
  if (!adminKey) {
    return NextResponse.json(
      { message: "Waitlist administration requires an ADMIN_API_KEY of at least 32 characters." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
  if (!isAuthorized(request, adminKey)) {
    return NextResponse.json(
      { message: "Admin access is required." },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { message: "Invalid JSON body." },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  if (
    typeof body !== "object" ||
    body === null ||
    !("id" in body) ||
    !("status" in body) ||
    typeof body.id !== "string" ||
    !/^\d+$/.test(body.id) ||
    typeof body.status !== "string" ||
    !allowedStatuses.includes(body.status as WaitlistStatus)
  ) {
    return NextResponse.json(
      { message: "A valid signup id and status are required." },
      { status: 422, headers: { "Cache-Control": "no-store" } },
    );
  }

  try {
    const sql = await ensureWaitlistStatusColumn();
    const updated = await sql`
      UPDATE waitlist_signups
      SET status = ${body.status}
      WHERE id = ${body.id}::bigint
      RETURNING
        id::text AS id,
        name,
        email,
        phone,
        role,
        status,
        consent_at,
        created_at
    `;

    if (updated.length === 0) {
      return NextResponse.json(
        { message: "Waitlist signup not found." },
        { status: 404, headers: { "Cache-Control": "no-store" } },
      );
    }

    return NextResponse.json(updated[0], {
      headers: { "Cache-Control": "no-store, private" },
    });
  } catch (error) {
    console.error(
      "[admin-waitlist] Failed to update signup",
      error instanceof Error ? error.name : "UnknownError",
    );
    return NextResponse.json(
      { message: "Waitlist status could not be updated." },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}
