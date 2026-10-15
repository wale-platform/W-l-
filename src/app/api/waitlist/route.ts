import { neon } from "@neondatabase/serverless";
import { NextResponse } from "next/server";
import { waitlistSignupSchema } from "@/lib/api/schemas";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = waitlistSignupSchema.safeParse(body);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return NextResponse.json(
      { message: first.message, field: String(first.path[0] ?? "") },
      { status: 422 },
    );
  }

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error("[waitlist] DATABASE_URL is not configured");
    return NextResponse.json(
      { message: "Waitlist signups are temporarily unavailable. Please try again later." },
      { status: 503 },
    );
  }

  try {
    const sql = neon(databaseUrl);

    await sql`
      CREATE TABLE IF NOT EXISTS waitlist_signups (
        id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        name VARCHAR(120) NOT NULL,
        email VARCHAR(254) NOT NULL UNIQUE,
        phone VARCHAR(32),
        role VARCHAR(20) NOT NULL CHECK (
          role IN ('student', 'tenant', 'landlord', 'lawyer')
        ),
        consent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `;

    await sql`
      ALTER TABLE waitlist_signups
      ADD COLUMN IF NOT EXISTS phone VARCHAR(32)
    `;

    await sql`
      INSERT INTO waitlist_signups (name, email, phone, role, consent_at, created_at)
      VALUES (
        ${parsed.data.fullName},
        ${parsed.data.email},
        ${parsed.data.phone},
        ${parsed.data.userType},
        NOW(),
        NOW()
      )
      ON CONFLICT (email) DO NOTHING
    `;
  } catch (error) {
    console.error(
      "[waitlist] Failed to save signup",
      error instanceof Error ? error.name : "UnknownError",
    );
    return NextResponse.json(
      { message: "We couldn't save your details right now. Please try again." },
      { status: 500 },
    );
  }

  return NextResponse.json(
    { message: "Thanks for your interest! Your details have been saved." },
    { status: 201 },
  );
}
