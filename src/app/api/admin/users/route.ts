import { NextResponse, type NextRequest } from "next/server";
import { getSql } from "@/lib/server/db";
import { jsonResponse, requireUser, serverErrorResponse } from "@/lib/server/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ROLES = ["student", "landlord", "lawyer", "tenant", "admin"];

/** All accounts: `?q=` searches name/email/phone, `?role=`, `?status=active|suspended`. */
export async function GET(request: NextRequest) {
  const auth = await requireUser(["admin"]);
  if (auth instanceof NextResponse) return auth;

  const params = request.nextUrl.searchParams;
  const q = (params.get("q") ?? "").trim().toLowerCase().slice(0, 100);
  const role = ROLES.includes(params.get("role") ?? "") ? params.get("role") : null;
  const status = params.get("status");

  try {
    const rows = await getSql()`
      SELECT u.id, u.full_name, u.email, u.phone, u.role, u.created_at, u.suspended_at,
             u.email_verified_at IS NOT NULL AS email_verified,
             u.password_hash IS NOT NULL AS has_password,
             u.google_sub IS NOT NULL AS uses_google,
             u.wallet_balance_kobo,
             (SELECT COUNT(*) FROM properties p WHERE p.owner_id = u.id)::int AS listings,
             (SELECT MAX(s.created_at) FROM sessions s WHERE s.user_id = u.id) AS last_login
      FROM users u
      WHERE (${q} = '' OR LOWER(u.full_name) LIKE ${`%${q}%`} OR LOWER(u.email) LIKE ${`%${q}%`} OR COALESCE(u.phone, '') LIKE ${`%${q}%`})
        AND (${role}::text IS NULL OR u.role = ${role})
        AND (${status}::text IS NULL OR ${status} NOT IN ('active', 'suspended')
             OR (${status} = 'active' AND u.suspended_at IS NULL)
             OR (${status} = 'suspended' AND u.suspended_at IS NOT NULL))
      ORDER BY u.created_at DESC
      LIMIT 500
    `;

    return jsonResponse(
      rows.map((row) => ({
        id: row.id,
        fullName: row.full_name,
        email: row.email,
        phone: row.phone,
        role: row.role,
        createdAt: new Date(row.created_at).toISOString(),
        suspended: row.suspended_at !== null,
        emailVerified: row.email_verified,
        signIn: row.uses_google && row.has_password ? "Google + password" : row.uses_google ? "Google" : "Password",
        walletBalanceKobo: Number(row.wallet_balance_kobo),
        listings: row.listings,
        lastLoginAt: row.last_login ? new Date(row.last_login).toISOString() : null,
        isYou: row.id === auth.id,
      })),
    );
  } catch (error) {
    return serverErrorResponse("admin:users", error);
  }
}
