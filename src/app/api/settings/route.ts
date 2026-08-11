import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET() {
  const sql = getDb();
  if (!sql) return NextResponse.json({ configured: false, settings: null });

  try {
    const rows = await sql`SELECT * FROM site_settings WHERE id = 'default' LIMIT 1`;
    return NextResponse.json({ configured: true, settings: rows[0] || null });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const sql = getDb();
  if (!sql) return NextResponse.json({ configured: false });

  try {
    const body = await req.json();
    const {
      heroTitle, heroSubtitle, heroImage,
      aboutTitle, aboutText, aboutImage,
      businessStart, businessEnd, whatsappNumber,
      salonAddress, mapsLink, preparationSteps, logoUrl
    } = body;

    await sql`
      INSERT INTO site_settings (
        id, hero_title, hero_subtitle, hero_image,
        about_title, about_text, about_image,
        business_start, business_end, whatsapp_number,
        salon_address, maps_link, preparation_steps, logo_url, updated_at
      )
      VALUES (
        'default', ${heroTitle}, ${heroSubtitle}, ${heroImage},
        ${aboutTitle}, ${aboutText}, ${aboutImage},
        ${businessStart}, ${businessEnd}, ${whatsappNumber},
        ${salonAddress}, ${mapsLink}, ${JSON.stringify(preparationSteps)}, ${logoUrl || ''}, NOW()
      )
      ON CONFLICT (id) DO UPDATE SET
        hero_title = EXCLUDED.hero_title,
        hero_subtitle = EXCLUDED.hero_subtitle,
        hero_image = EXCLUDED.hero_image,
        about_title = EXCLUDED.about_title,
        about_text = EXCLUDED.about_text,
        about_image = EXCLUDED.about_image,
        business_start = EXCLUDED.business_start,
        business_end = EXCLUDED.business_end,
        whatsapp_number = EXCLUDED.whatsapp_number,
        salon_address = EXCLUDED.salon_address,
        maps_link = EXCLUDED.maps_link,
        preparation_steps = EXCLUDED.preparation_steps,
        logo_url = EXCLUDED.logo_url,
        updated_at = NOW()
    `;
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  return POST(req);
}
