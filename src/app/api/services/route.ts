import { NextResponse } from "next/server";
import { getDb, ensureTablesExist } from "@/lib/db";

export async function GET() {
  const sql = getDb();
  if (!sql) return NextResponse.json({ configured: false, data: [] });

  try {
    await ensureTablesExist(sql);
    const rows = await sql`SELECT * FROM services ORDER BY created_at ASC`;
    return NextResponse.json({ configured: true, data: rows });
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
    const { id, name, description, price, duration, imageUrl, professionalName, professionalPhotoUrl } = body;
    await sql`
      INSERT INTO services (id, name, description, price, duration, image_url, professional_name, professional_photo_url)
      VALUES (${id}, ${name}, ${description || ''}, ${Number(price) || 0}, ${Number(duration) || 60}, ${imageUrl || ''}, ${professionalName || ''}, ${professionalPhotoUrl || ''})
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        description = EXCLUDED.description,
        price = EXCLUDED.price,
        duration = EXCLUDED.duration,
        image_url = EXCLUDED.image_url,
        professional_name = EXCLUDED.professional_name,
        professional_photo_url = EXCLUDED.professional_photo_url
    `;
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  return POST(req);
}

export async function DELETE(req: Request) {
  const sql = getDb();
  if (!sql) return NextResponse.json({ configured: false });

  try {
    await ensureTablesExist(sql);
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    await sql`DELETE FROM services WHERE id = ${id}`;
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

