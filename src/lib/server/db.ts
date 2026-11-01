import { neon, type NeonQueryFunction } from "@neondatabase/serverless";

/**
 * Server-only database access. Never import this from a client component —
 * it reads `DATABASE_URL`, which must stay on the server.
 */

export class DatabaseNotConfiguredError extends Error {
  constructor() {
    super("DATABASE_URL is not configured");
    this.name = "DatabaseNotConfiguredError";
  }
}

let cachedSql: NeonQueryFunction<false, false> | null = null;
let schemaReady: Promise<void> | null = null;

export function getSql(): NeonQueryFunction<false, false> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new DatabaseNotConfiguredError();
  cachedSql ??= neon(databaseUrl);
  return cachedSql;
}

export function isDatabaseConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

/**
 * Creates the auth and listing tables on first use. The promise is memoised per
 * server instance so the DDL runs once, not on every request.
 */
export function ensureSchema(): Promise<void> {
  schemaReady ??= createSchema().catch((error: unknown) => {
    schemaReady = null;
    throw error;
  });
  return schemaReady;
}

async function createSchema() {
  const sql = getSql();

  await sql`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      full_name VARCHAR(120) NOT NULL,
      email VARCHAR(254) NOT NULL UNIQUE,
      phone VARCHAR(32),
      role VARCHAR(20) NOT NULL CHECK (
        role IN ('student', 'landlord', 'lawyer', 'tenant', 'admin')
      ),
      university VARCHAR(120),
      password_hash TEXT,
      google_sub TEXT UNIQUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS sessions (
      token_hash TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires_at TIMESTAMPTZ NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS sessions_user_id_idx ON sessions (user_id)`;

  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMPTZ`;

  // Single-use links emailed to users (password reset, email verification).
  // Like sessions, only the SHA-256 of each token is stored.
  await sql`
    CREATE TABLE IF NOT EXISTS auth_tokens (
      token_hash TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      purpose VARCHAR(30) NOT NULL CHECK (purpose IN ('password_reset', 'email_verification')),
      expires_at TIMESTAMPTZ NOT NULL,
      used_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS auth_tokens_user_idx ON auth_tokens (user_id, purpose)`;

  // Messages from the contact page, kept even if the notification email fails.
  await sql`
    CREATE TABLE IF NOT EXISTS contact_messages (
      id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      topic VARCHAR(30) NOT NULL,
      name VARCHAR(120) NOT NULL,
      email VARCHAR(254) NOT NULL,
      phone VARCHAR(32),
      subject VARCHAR(150) NOT NULL,
      message TEXT NOT NULL,
      user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS contact_messages_email_idx ON contact_messages (email, created_at)`;

  // Wallet balance in kobo (₦1 = 100 kobo) so money is never a float.
  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS wallet_balance_kobo BIGINT NOT NULL DEFAULT 0`;

  await sql`
    CREATE TABLE IF NOT EXISTS notifications (
      id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title VARCHAR(150) NOT NULL,
      body TEXT NOT NULL,
      link TEXT,
      read_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS notifications_user_idx ON notifications (user_id, created_at DESC)`;

  // Wallet top-ups through Paystack or Flutterwave. `reference` is ours and
  // is sent to the gateway, so a payment can only ever be credited once.
  await sql`
    CREATE TABLE IF NOT EXISTS payments (
      reference TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      provider VARCHAR(20) NOT NULL CHECK (provider IN ('paystack', 'flutterwave')),
      amount_kobo BIGINT NOT NULL CHECK (amount_kobo > 0),
      currency CHAR(3) NOT NULL DEFAULT 'NGN',
      status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'success', 'failed')),
      provider_transaction_id TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      paid_at TIMESTAMPTZ
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS payments_user_idx ON payments (user_id, created_at DESC)`;

  // Admin can suspend an account: it can't sign in and its sessions end.
  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS suspended_at TIMESTAMPTZ`;

  // Inspection appointments. property_id may be a sample listing (not in the
  // properties table), so the listing details are copied in; owner_id is the
  // listing owner for submitted listings, NULL for WALE's sample listings.
  await sql`
    CREATE TABLE IF NOT EXISTS inspections (
      id TEXT PRIMARY KEY,
      property_id TEXT NOT NULL,
      property_title VARCHAR(150) NOT NULL,
      property_image TEXT,
      property_price INTEGER NOT NULL,
      owner_id TEXT REFERENCES users(id) ON DELETE SET NULL,
      requester_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      preferred_date DATE NOT NULL,
      time_slot VARCHAR(40) NOT NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled', 'completed')),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS inspections_requester_idx ON inspections (requester_id, created_at DESC)`;
  await sql`CREATE INDEX IF NOT EXISTS inspections_owner_idx ON inspections (owner_id, created_at DESC)`;

  // Withdrawals from the wallet. The amount is deducted when requested
  // (held), then admin either marks it paid or rejects it (refunded).
  await sql`
    CREATE TABLE IF NOT EXISTS payouts (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      amount_kobo BIGINT NOT NULL CHECK (amount_kobo > 0),
      bank_name VARCHAR(80) NOT NULL,
      account_number VARCHAR(10) NOT NULL,
      account_name VARCHAR(120) NOT NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'rejected')),
      transfer_reference VARCHAR(120),
      admin_note TEXT,
      processed_by TEXT REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      processed_at TIMESTAMPTZ
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS payouts_user_idx ON payouts (user_id, created_at DESC)`;
  await sql`CREATE INDEX IF NOT EXISTS payouts_status_idx ON payouts (status, created_at DESC)`;
  await sql`ALTER TABLE payouts ADD COLUMN IF NOT EXISTS bank_code VARCHAR(20)`;

  // Paid items. Today that's listing boosts; paid from the wallet or
  // directly through a gateway (then linked to a payments row).
  await sql`
    CREATE TABLE IF NOT EXISTS purchases (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      item_type VARCHAR(30) NOT NULL CHECK (item_type IN ('listing_boost')),
      item_id TEXT NOT NULL,
      item_label VARCHAR(200) NOT NULL,
      plan VARCHAR(20) NOT NULL,
      amount_kobo BIGINT NOT NULL CHECK (amount_kobo > 0),
      method VARCHAR(20) NOT NULL CHECK (method IN ('wallet', 'paystack', 'flutterwave')),
      status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'failed')),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      paid_at TIMESTAMPTZ
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS purchases_user_idx ON purchases (user_id, created_at DESC)`;

  // What a gateway payment is for: a wallet top-up (credited to the wallet)
  // or a purchase (applied to the item instead), and where to send the
  // payer afterwards.
  await sql`ALTER TABLE payments ADD COLUMN IF NOT EXISTS purpose VARCHAR(20) NOT NULL DEFAULT 'wallet_top_up'`;
  await sql`ALTER TABLE payments ADD COLUMN IF NOT EXISTS purchase_id TEXT REFERENCES purchases(id) ON DELETE SET NULL`;

  // Boosted listings rank first in search until this time.
  await sql`ALTER TABLE properties ADD COLUMN IF NOT EXISTS boosted_until TIMESTAMPTZ`;

  // Audit trail of what happened on the platform, shown to admins.
  await sql`
    CREATE TABLE IF NOT EXISTS activity_log (
      id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      actor_id TEXT REFERENCES users(id) ON DELETE SET NULL,
      action VARCHAR(60) NOT NULL,
      summary TEXT NOT NULL,
      target_type VARCHAR(30),
      target_id TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS activity_log_created_idx ON activity_log (created_at DESC)`;
  await sql`CREATE INDEX IF NOT EXISTS activity_log_action_idx ON activity_log (action, created_at DESC)`;

  await sql`
    CREATE TABLE IF NOT EXISTS properties (
      id TEXT PRIMARY KEY,
      owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      source VARCHAR(20) NOT NULL CHECK (source IN ('landlord', 'lawyer', 'tenant', 'wale')),
      title VARCHAR(120) NOT NULL,
      description TEXT NOT NULL,
      price INTEGER NOT NULL CHECK (price > 0),
      type VARCHAR(20) NOT NULL,
      bedrooms SMALLINT NOT NULL CHECK (bedrooms >= 0),
      bathrooms SMALLINT NOT NULL CHECK (bathrooms >= 1),
      address VARCHAR(200) NOT NULL,
      city VARCHAR(80) NOT NULL,
      state VARCHAR(80) NOT NULL,
      university VARCHAR(120),
      available_date DATE NOT NULL,
      amenities JSONB NOT NULL DEFAULT '[]'::jsonb,
      contact_name VARCHAR(120) NOT NULL,
      contact_phone VARCHAR(32) NOT NULL,
      contact_email VARCHAR(254),
      verified BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS properties_owner_id_idx ON properties (owner_id)`;

  // Apartment types are flat / self_contained / room / studio / shared. The
  // original constraint allowed one_bedroom / two_bedroom, so migrate any
  // such rows to "flat" (bedrooms keeps the count) and replace the check.
  await sql`ALTER TABLE properties DROP CONSTRAINT IF EXISTS properties_type_check`;
  await sql`UPDATE properties SET type = 'flat' WHERE type IN ('one_bedroom', 'two_bedroom')`;
  await sql`
    ALTER TABLE properties ADD CONSTRAINT properties_type_check
    CHECK (type IN ('flat', 'self_contained', 'room', 'studio', 'shared'))
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS property_images (
      id TEXT PRIMARY KEY,
      property_id TEXT NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
      position SMALLINT NOT NULL,
      content_type VARCHAR(40) NOT NULL,
      data BYTEA NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS property_images_property_id_idx
    ON property_images (property_id, position)
  `;
}
