import { neon } from "@neondatabase/serverless";

export const getDb = () => {
  const connectionString = process.env.DATABASE_URL || process.env.NEON_DATABASE_URL || "";
  if (!connectionString || !connectionString.startsWith("postgres")) {
    return null;
  }
  return neon(connectionString);
};

let tablesInitialized = false;

export async function ensureTablesExist(sql: any) {
  if (tablesInitialized || !sql) return;
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS services (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT DEFAULT '',
        price NUMERIC NOT NULL DEFAULT 0,
        duration INT NOT NULL DEFAULT 60,
        image_url TEXT DEFAULT '',
        professional_name TEXT DEFAULT '',
        professional_photo_url TEXT DEFAULT '',
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS appointments (
        id BIGINT PRIMARY KEY,
        date TEXT NOT NULL,
        time TEXT NOT NULL,
        end_time TEXT,
        service TEXT NOT NULL,
        price NUMERIC NOT NULL DEFAULT 0,
        status TEXT NOT NULL DEFAULT 'pending',
        payment_status TEXT NOT NULL DEFAULT 'open',
        client_name TEXT NOT NULL,
        client_email TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS closed_dates (
        date_str TEXT PRIMARY KEY,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS blocked_time_slots (
        slot_key TEXT PRIMARY KEY,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS clients (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT NOT NULL,
        phone TEXT DEFAULT '',
        address TEXT DEFAULT '',
        birth_date TEXT DEFAULT '',
        photo_url TEXT DEFAULT '',
        status TEXT DEFAULT 'active',
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `;

    await sql`ALTER TABLE clients ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';`;

    await sql`CREATE UNIQUE INDEX IF NOT EXISTS clients_email_lower_idx ON clients (LOWER(email));`;

    await sql`
      CREATE TABLE IF NOT EXISTS loyalty_settings (
        id TEXT PRIMARY KEY,
        stamps_required INT DEFAULT 5,
        prize_name TEXT DEFAULT '1 Hidratação Grátis',
        expiration_days INT DEFAULT 90,
        is_active BOOLEAN DEFAULT TRUE,
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS loyalty_claims (
        id BIGINT PRIMARY KEY,
        client_email TEXT NOT NULL,
        client_name TEXT NOT NULL,
        prize_name TEXT NOT NULL,
        date TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS site_settings (
        id TEXT PRIMARY KEY,
        hero_title TEXT,
        hero_subtitle TEXT,
        hero_image TEXT,
        about_title TEXT,
        about_text TEXT,
        about_image TEXT,
        business_start TEXT,
        business_end TEXT,
        work_days JSONB,
        whatsapp_number TEXT,
        salon_address TEXT,
        maps_link TEXT,
        preparation_steps JSONB,
        logo_url TEXT,
        login_hero_image TEXT,
        login_quote TEXT,
        login_quote_author TEXT,
        testimonials JSONB,
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `;

    await sql`ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS work_days JSONB;`;
    await sql`ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS login_hero_image TEXT;`;
    await sql`ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS login_quote TEXT;`;
    await sql`ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS login_quote_author TEXT;`;
    await sql`ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS testimonials JSONB;`;

    await sql`ALTER TABLE clients ADD COLUMN IF NOT EXISTS password TEXT DEFAULT '';`;

    await sql`
      CREATE TABLE IF NOT EXISTS password_resets (
        id TEXT PRIMARY KEY,
        email TEXT NOT NULL,
        token_hash TEXT NOT NULL,
        expires_at TIMESTAMPTZ NOT NULL,
        used BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `;

    await sql`ALTER TABLE appointments ADD COLUMN IF NOT EXISTS mp_payment_id TEXT;`;
    await sql`ALTER TABLE appointments ADD COLUMN IF NOT EXISTS mp_payment_method TEXT;`;
    await sql`ALTER TABLE appointments ADD COLUMN IF NOT EXISTS mp_qr_code TEXT;`;
    await sql`ALTER TABLE appointments ADD COLUMN IF NOT EXISTS mp_qr_code_base64 TEXT;`;
    await sql`ALTER TABLE appointments ADD COLUMN IF NOT EXISTS mp_status TEXT;`;

    await sql`ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS mp_access_token TEXT;`;
    await sql`ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS mp_public_key TEXT;`;
    await sql`ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS mp_sandbox BOOLEAN DEFAULT true;`;
    await sql`ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS mp_auto_confirm BOOLEAN DEFAULT true;`;

    tablesInitialized = true;
  } catch (err) {
    console.error("Error initializing database tables:", err);
  }
}

