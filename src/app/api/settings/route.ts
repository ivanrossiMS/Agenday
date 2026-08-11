import { NextResponse } from "next/server";
import { getDb, ensureTablesExist } from "@/lib/db";

export async function GET() {
  const sql = getDb();
  if (!sql) return NextResponse.json({ configured: false, settings: null });

  try {
    await ensureTablesExist(sql);
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
    await ensureTablesExist(sql);
    const body = await req.json();
    const {
      heroTitle, heroSubtitle, heroImage,
      aboutTitle, aboutText, aboutImage,
      businessStart, businessEnd, workDays, whatsappNumber,
      salonAddress, mapsLink, preparationSteps, logoUrl,
      loginHeroImage, loginQuote, loginQuoteAuthor
    } = body;

    const stepsJson = JSON.stringify(preparationSteps || []);
    const workDaysJson = JSON.stringify(workDays || [1, 2, 3, 4, 5, 6]);

    await sql`
      INSERT INTO site_settings (
        id, hero_title, hero_subtitle, hero_image,
        about_title, about_text, about_image,
        business_start, business_end, work_days, whatsapp_number,
        salon_address, maps_link, preparation_steps, logo_url,
        login_hero_image, login_quote, login_quote_author, updated_at
      )
      VALUES (
        'default', ${heroTitle || ''}, ${heroSubtitle || ''}, ${heroImage || ''},
        ${aboutTitle || ''}, ${aboutText || ''}, ${aboutImage || ''},
        ${businessStart || '09:00'}, ${businessEnd || '18:00'}, ${workDaysJson}::jsonb, ${whatsappNumber || ''},
        ${salonAddress || ''}, ${mapsLink || ''}, ${stepsJson}::jsonb, ${logoUrl || ''},
        ${loginHeroImage || ''}, ${loginQuote || ''}, ${loginQuoteAuthor || ''}, NOW()
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
        work_days = EXCLUDED.work_days,
        whatsapp_number = EXCLUDED.whatsapp_number,
        salon_address = EXCLUDED.salon_address,
        maps_link = EXCLUDED.maps_link,
        preparation_steps = EXCLUDED.preparation_steps,
        logo_url = EXCLUDED.logo_url,
        login_hero_image = EXCLUDED.login_hero_image,
        login_quote = EXCLUDED.login_quote,
        login_quote_author = EXCLUDED.login_quote_author,
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

