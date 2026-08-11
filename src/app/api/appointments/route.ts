import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET() {
  const sql = getDb();
  if (!sql) return NextResponse.json({ configured: false, data: [] });

  try {
    const rows = await sql`SELECT * FROM appointments ORDER BY id DESC`;
    return NextResponse.json({ configured: true, data: rows });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const sql = getDb();
  if (!sql) return NextResponse.json({ configured: false });

  try {
    const body = await req.json();
    const { id, date, time, endTime, service, price, status, paymentStatus, clientName, clientEmail } = body;

    await sql`
      INSERT INTO appointments (id, date, time, end_time, service, price, status, payment_status, client_name, client_email)
      VALUES (${id}, ${date}, ${time}, ${endTime || null}, ${service}, ${price}, ${status || 'pending'}, ${paymentStatus || 'open'}, ${clientName}, ${clientEmail})
      ON CONFLICT (id) DO UPDATE SET
        date = EXCLUDED.date,
        time = EXCLUDED.time,
        end_time = EXCLUDED.end_time,
        service = EXCLUDED.service,
        price = EXCLUDED.price,
        status = EXCLUDED.status,
        payment_status = EXCLUDED.payment_status,
        client_name = EXCLUDED.client_name,
        client_email = EXCLUDED.client_email
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
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    await sql`DELETE FROM appointments WHERE id = ${BigInt(id)}`;
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
