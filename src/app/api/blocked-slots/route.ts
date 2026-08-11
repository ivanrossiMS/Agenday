import { NextResponse } from "next/server";
import { getDb, ensureTablesExist } from "@/lib/db";

export async function GET() {
  const sql = getDb();
  if (!sql) return NextResponse.json({ configured: false, data: [] });

  try {
    await ensureTablesExist(sql);
    const rows = await sql`SELECT slot_key FROM blocked_time_slots`;
    return NextResponse.json({ configured: true, data: rows.map((r: any) => r.slot_key) });
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
    const { slotKey } = body;
    await sql`
      INSERT INTO blocked_time_slots (slot_key) VALUES (${slotKey})
      ON CONFLICT (slot_key) DO NOTHING
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
    const slotKey = searchParams.get("slotKey");
    if (!slotKey) return NextResponse.json({ error: "Missing slotKey" }, { status: 400 });

    await sql`DELETE FROM blocked_time_slots WHERE slot_key = ${slotKey}`;
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
