import { NextResponse } from "next/server";
import { getDb, ensureTablesExist } from "@/lib/db";

export async function GET() {
  const sql = getDb();
  if (!sql) return NextResponse.json({ configured: false, data: [] });

  try {
    await ensureTablesExist(sql);
    const rows = await sql`SELECT date_str FROM closed_dates`;
    return NextResponse.json({ configured: true, data: rows.map((r: any) => r.date_str) });
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
    const { dateStr } = body;
    await sql`
      INSERT INTO closed_dates (date_str) VALUES (${dateStr})
      ON CONFLICT (date_str) DO NOTHING
    `;
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const sql = getDb();
  if (!sql) return NextResponse.json({ configured: false });

  try {
    await ensureTablesExist(sql);
    const { searchParams } = new URL(req.url);
    const dateStr = searchParams.get("dateStr");
    if (!dateStr) return NextResponse.json({ error: "Missing dateStr" }, { status: 400 });

    await sql`DELETE FROM closed_dates WHERE date_str = ${dateStr}`;
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

