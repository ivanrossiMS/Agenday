import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET() {
  const sql = getDb();
  if (!sql) return NextResponse.json({ configured: false, settings: null, claims: [] });

  try {
    const settings = await sql`SELECT * FROM loyalty_settings WHERE id = 'default' LIMIT 1`;
    const claims = await sql`SELECT * FROM loyalty_claims ORDER BY created_at DESC`;
    return NextResponse.json({
      configured: true,
      settings: settings[0] || null,
      claims: claims || []
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const sql = getDb();
  if (!sql) return NextResponse.json({ configured: false });

  try {
    const body = await req.json();
    const { action } = body;

    if (action === "updateSettings") {
      const { stampsRequired, prizeName, expirationDays, isActive } = body.settings;
      await sql`
        INSERT INTO loyalty_settings (id, stamps_required, prize_name, expiration_days, is_active, updated_at)
        VALUES ('default', ${stampsRequired}, ${prizeName}, ${expirationDays}, ${isActive}, NOW())
        ON CONFLICT (id) DO UPDATE SET
          stamps_required = EXCLUDED.stamps_required,
          prize_name = EXCLUDED.prize_name,
          expiration_days = EXCLUDED.expiration_days,
          is_active = EXCLUDED.is_active,
          updated_at = NOW()
      `;
      return NextResponse.json({ success: true });
    }

    if (action === "claimPrize") {
      const { id, clientEmail, clientName, prizeName, date } = body.claim;
      await sql`
        INSERT INTO loyalty_claims (id, client_email, client_name, prize_name, date)
        VALUES (${id}, ${clientEmail}, ${clientName}, ${prizeName}, ${date})
        ON CONFLICT (id) DO NOTHING
      `;
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
