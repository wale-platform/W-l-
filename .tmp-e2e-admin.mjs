// Temporary end-to-end check (deleted after running) for inspections, boosts,
// payouts and the admin console. Uses throwaway "E2E" accounts and cleans up.
import { createHmac } from "node:crypto";
import { readFileSync } from "node:fs";
import { neon } from "@neondatabase/serverless";

const B = "http://localhost:3100";
const env = readFileSync(".env.local", "utf8");
const envVar = (k) => env.match(new RegExp(`^${k}=(.*)$`, "m"))?.[1].trim().replace(/^["']|["']$/g, "");
const sql = neon(envVar("DATABASE_URL"));
const PAYSTACK = envVar("PAYSTACK_SECRET_KEY");
const stamp = Date.now();
let pass = 0, fail = 0;
const check = (label, ok, extra = "") => { ok ? pass++ : fail++; console.log(`${ok ? "PASS" : "FAIL"} ${label}${extra ? " — " + extra : ""}`); };

async function call(cookie, method, path, body, headers = {}) {
  const res = await fetch(B + path, {
    method, redirect: "manual",
    // FormData must set its own multipart boundary; strings set their own type via `headers`.
    headers: { ...(body && !(body instanceof FormData) && typeof body !== "string" ? { "Content-Type": "application/json" } : {}), ...(cookie ? { Cookie: cookie } : {}), ...headers },
    body: body instanceof FormData ? body : typeof body === "string" ? body : body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json = null; try { json = JSON.parse(text); } catch {}
  return { status: res.status, json, location: res.headers.get("location"), setCookie: res.headers.get("set-cookie") };
}
async function signup(name, role) {
  const email = `e2e-${role}-${stamp}@example.com`;
  const r = await call(null, "POST", "/api/auth/signup", { name, email, phone: "08031234567", role: role === "admin" ? "student" : role, password: "Password123", confirmPassword: "Password123" });
  return { email, id: r.json.user.id, cookie: r.setCookie.match(/wale_session=[^;]+/)[0] };
}
const balance = async (u) => (await call(u.cookie, "GET", "/api/wallet")).json.balanceKobo;

const L = await signup("E2E Landlord", "landlord");
const S = await signup("E2E Student", "student");
const A = await signup("E2E Admin", "admin");
await sql`UPDATE users SET role = 'admin' WHERE id = ${A.id}`;

try {
  // ---------- listing ----------
  const form = new FormData();
  form.append("data", JSON.stringify({ title: "E2E Boost Test Flat", description: "A test listing used only to check boosts and inspections.", price: 300000, type: "self_contained", bedrooms: 1, bathrooms: 1, address: "1 Test Road, Tanke", city: "Ilorin", state: "Kwara", availableDate: "2026-11-20", amenities: [] }));
  form.append("images", new Blob([readFileSync("public/listings/listing-01.jpg")], { type: "image/jpeg" }), "l.jpg");
  let r = await call(L.cookie, "POST", "/api/properties", form);
  const listingId = r.json?.id;
  check("landlord uploads listing", r.status === 201, listingId);

  // ---------- inspections ----------
  const tomorrow = new Date(Date.now() + 2 * 864e5).toISOString().slice(0, 10);
  r = await call(S.cookie, "POST", "/api/inspections", { propertyId: listingId, date: tomorrow, time: "10:00 AM - 12:00 PM" });
  const inspId = r.json?.id;
  check("student books inspection", r.status === 201 && r.json.status === "PENDING");
  r = await call(S.cookie, "POST", "/api/inspections", { propertyId: listingId, date: tomorrow, time: "2:00 PM" });
  check("duplicate open booking refused", r.status === 409);
  r = await call(L.cookie, "POST", "/api/inspections", { propertyId: listingId, date: tomorrow, time: "2:00 PM" });
  check("owner can't book own listing", r.status === 422);
  r = await call(L.cookie, "GET", "/api/inspections?scope=owner");
  check("landlord sees request with requester details", r.json?.some((i) => i.id === inspId && i.requester?.name === "E2E Student"));
  r = await call(S.cookie, "PATCH", `/api/inspections/${inspId}`, { status: "APPROVED" });
  check("requester can't approve", r.status === 403);
  r = await call(L.cookie, "PATCH", `/api/inspections/${inspId}`, { status: "APPROVED" });
  check("owner approves", r.status === 200 && r.json.status === "APPROVED");
  r = await call(S.cookie, "PATCH", `/api/inspections/${inspId}`, { status: "CANCELLED" });
  check("requester cancels approved booking", r.status === 200 && r.json.status === "CANCELLED");
  r = await call(S.cookie, "GET", "/api/inspections?scope=all");
  check("non-admin can't list all", r.status === 403);
  r = await call(A.cookie, "GET", "/api/inspections?scope=all");
  check("admin lists all appointments", r.status === 200 && r.json.some((i) => i.id === inspId));

  // ---------- boosts: wallet ----------
  r = await call(L.cookie, "POST", "/api/boosts", { propertyId: listingId, plan: "7d", method: "wallet" });
  check("wallet boost refused with empty wallet", r.status === 422, r.json?.message);
  await sql`UPDATE users SET wallet_balance_kobo = 1000000 WHERE id = ${L.id}`;
  r = await call(L.cookie, "POST", "/api/boosts", { propertyId: listingId, plan: "7d", method: "wallet" });
  check("wallet boost paid", r.status === 200 && r.json.status === "paid");
  check("₦2,000 deducted from wallet", (await balance(L)) === 800000);
  r = await call(S.cookie, "POST", "/api/boosts", { propertyId: listingId, plan: "7d", method: "wallet" });
  check("students can't boost", r.status === 403);
  r = await call(null, "GET", "/api/properties?pageSize=100&sortBy=price_asc");
  check("boosted listing ranks first even when sorting by price", r.json.properties[0]?.id === listingId && r.json.properties[0].featured === true);
  const after7 = new Date((await sql`SELECT boosted_until FROM properties WHERE id = ${listingId}`)[0].boosted_until).getTime();

  // ---------- boosts: pay directly (Paystack test) ----------
  r = await call(L.cookie, "POST", "/api/boosts", { propertyId: listingId, plan: "14d", method: "paystack" });
  check("direct boost returns Paystack checkout", r.status === 200 && new URL(r.json.authorizationUrl).host === "checkout.paystack.com");
  const pay = (await sql`SELECT reference, amount_kobo FROM payments WHERE user_id = ${L.id} AND purpose = 'purchase' ORDER BY created_at DESC LIMIT 1`)[0];
  const raw = JSON.stringify({ event: "charge.success", data: { id: 999001, status: "success", reference: pay.reference, amount: Number(pay.amount_kobo), currency: "NGN" } });
  const sig = createHmac("sha512", PAYSTACK).update(raw).digest("hex");
  r = await call(null, "POST", "/api/payments/webhook/paystack", raw, { "x-paystack-signature": sig, "Content-Type": "application/json" });
  r = await call(null, "POST", "/api/payments/webhook/paystack", raw, { "x-paystack-signature": sig, "Content-Type": "application/json" });
  const after14 = new Date((await sql`SELECT boosted_until FROM properties WHERE id = ${listingId}`)[0].boosted_until).getTime();
  const extendedDays = Math.round((after14 - after7) / 864e5);
  check("confirmed payment extends boost by exactly 14 days (webhook replayed)", extendedDays === 14, `${extendedDays} days`);
  check("direct payment doesn't touch the wallet", (await balance(L)) === 800000);
  const purchase = (await sql`SELECT p.status FROM purchases p JOIN payments x ON x.purchase_id = p.id WHERE x.reference = ${pay.reference}`)[0];
  check("purchase marked paid", purchase?.status === "paid");
  r = await call(null, "GET", `/api/payments/callback/paystack?reference=${pay.reference}`);
  check("boost callback returns to My Properties", r.location?.includes("/landlord/properties?boost=success"), r.location);

  // ---------- payouts ----------
  r = await call(L.cookie, "GET", "/api/banks");
  check("bank list loads (with test bank)", r.status === 200 && r.json.some((b) => b.code === "001"), `${r.json?.length} banks`);
  r = await call(L.cookie, "GET", "/api/payouts/resolve?bank=001&account=0000000000");
  check("account name resolved", r.status === 200 && r.json.accountName === "TEST ACCOUNT 0000000000", r.json?.accountName);
  r = await call(L.cookie, "GET", "/api/payouts/resolve?bank=001&account=12345");
  check("short account number rejected", r.status === 422);
  r = await call(L.cookie, "POST", "/api/payouts", { amount: 2000, bankCode: "001", accountNumber: "0000000000" });
  const payout1 = r.json?.id;
  check("withdrawal requested with server-resolved name", r.status === 201 && r.json.accountName === "TEST ACCOUNT 0000000000");
  check("₦2,000 held from wallet", (await balance(L)) === 600000);
  r = await call(L.cookie, "POST", "/api/payouts", { amount: 100000, bankCode: "001", accountNumber: "0000000000" });
  check("withdrawal above balance refused", r.status === 422);
  r = await call(L.cookie, "PATCH", `/api/admin/payouts/${payout1}`, { action: "paid", reference: "x" });
  check("non-admin can't process payouts", r.status === 403);
  r = await call(A.cookie, "PATCH", `/api/admin/payouts/${payout1}`, { action: "reject", note: "E2E test rejection" });
  check("admin rejects payout", r.status === 200);
  check("rejection refunds wallet", (await balance(L)) === 800000);
  r = await call(L.cookie, "POST", "/api/payouts", { amount: 1000, bankCode: "001", accountNumber: "0123456789" });
  const payout2 = r.json?.id;
  r = await call(A.cookie, "PATCH", `/api/admin/payouts/${payout2}`, { action: "paid", reference: "E2E-TRANSFER-1" });
  check("admin marks payout paid", r.status === 200);
  r = await call(A.cookie, "PATCH", `/api/admin/payouts/${payout2}`, { action: "reject", note: "late" });
  check("processed payout can't be changed again", r.status === 409);
  check("paid payout stays deducted", (await balance(L)) === 700000);

  // ---------- admin console ----------
  r = await call(S.cookie, "GET", "/api/admin/overview");
  check("non-admin blocked from admin API", r.status === 403);
  r = await call(A.cookie, "GET", "/api/admin/overview");
  check("overview loads", r.status === 200 && typeof r.json.users.total === "number" && r.json.recentActivity.length > 0);
  r = await call(A.cookie, "GET", "/api/admin/users?q=e2e-");
  check("users search", r.status === 200 && r.json.filter((u) => u.email.includes(String(stamp))).length === 3);
  r = await call(A.cookie, "PATCH", `/api/admin/users/${A.id}`, { suspended: true });
  check("admin can't suspend self", r.status === 422);
  r = await call(A.cookie, "PATCH", `/api/admin/users/${S.id}`, { suspended: true });
  check("admin suspends student", r.status === 200);
  r = await call(S.cookie, "GET", "/api/auth/me");
  check("suspended user's session ends", r.status === 401);
  r = await call(null, "POST", "/api/auth/login", { email: S.email, password: "Password123" });
  check("suspended user can't log in", r.status === 403, r.json?.message);
  r = await call(A.cookie, "PATCH", `/api/admin/users/${S.id}`, { suspended: false, role: "tenant" });
  r = await call(null, "POST", "/api/auth/login", { email: S.email, password: "Password123" });
  check("reactivated user can log in with new role", r.status === 200 && r.json.user.role === "tenant");
  r = await call(A.cookie, "DELETE", `/api/admin/users/${L.id}`);
  check("can't delete account holding wallet funds", r.status === 409);
  r = await call(A.cookie, "GET", "/api/admin/listings?status=pending&q=e2e boost");
  check("admin listings search", r.status === 200 && r.json[0]?.id === listingId && r.json[0].owner.name === "E2E Landlord");
  r = await call(A.cookie, "GET", "/api/admin/payments?q=" + L.email);
  check("admin payments show boost purpose", r.status === 200 && r.json.some((p) => p.purpose.startsWith("Boost:") && p.status === "success"));
  r = await call(A.cookie, "POST", `/api/admin/payments/${pay.reference}/verify`);
  check("re-check of a settled payment is safe", r.status === 200 && r.json.result === "already_paid", r.json?.message);
  r = await call(A.cookie, "GET", "/api/admin/activity?q=e2e");
  const actions = new Set((r.json?.entries ?? []).map((e) => e.action));
  check("activity log records the flow", ["listing.created", "inspection.requested", "purchase.paid", "payout.requested", "payout.paid", "payout.rejected", "user.suspended"].every((a) => actions.has(a)), [...actions].join(","));
  r = await call(A.cookie, "GET", "/api/admin/activity?category=payment&q=e2e");
  check("payments filter includes boost purchases", r.json?.entries.some((e) => e.action === "purchase.paid"));

  // ---------- pages ----------
  for (const p of ["/admin", "/admin/users", "/admin/listings", "/admin/verification", "/admin/inspections", "/admin/payments", "/admin/payouts", "/admin/activity"]) {
    const res = await fetch(B + p, { headers: { Cookie: A.cookie } });
    check(`page ${p}`, res.status === 200);
  }
} finally {
  const ids = [L.id, S.id, A.id];
  await sql`DELETE FROM notifications WHERE body LIKE '%E2E%'`;
  await sql`DELETE FROM activity_log WHERE actor_id = ANY(${ids}) OR summary LIKE '%E2E%'`;
  await sql`DELETE FROM contact_messages WHERE email LIKE ${`%${stamp}%`}`;
  const del = await sql`DELETE FROM users WHERE id = ANY(${ids}) RETURNING id`;
  console.log(`\n${pass} passed, ${fail} failed · cleanup: removed ${del.length} test users, their data, and their notifications/activity`);
}
