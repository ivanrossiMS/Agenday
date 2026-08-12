import { NextResponse } from "next/server";
import { getDb, ensureTablesExist } from "@/lib/db";

export async function GET() {
  const sql = getDb();
  if (!sql) return NextResponse.json({ configured: false, data: [] });

  try {
    await ensureTablesExist(sql);
    // Delete any incomplete/unpaid Pix or Credit Card appointments created before payment confirmation
    await sql`
      DELETE FROM appointments 
      WHERE (mp_payment_method IS NOT NULL OR mp_payment_id IS NOT NULL) 
        AND (payment_status = 'open' OR payment_status = 'pending')
    `;

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
    await ensureTablesExist(sql);
    const body = await req.json();
    const { 
      id, date, time, endTime, service, price, status, paymentStatus, clientName, clientEmail,
      mpPaymentId, mpPaymentMethod, mpQrCode, mpQrCodeBase64, mpStatus
    } = body;

    const numId = Number(id);

    await sql`
      INSERT INTO appointments (
        id, date, time, end_time, service, price, status, payment_status, client_name, client_email,
        mp_payment_id, mp_payment_method, mp_qr_code, mp_qr_code_base64, mp_status
      )
      VALUES (
        ${numId}, ${date}, ${time}, ${endTime || null}, ${service}, ${Number(price) || 0}, 
        ${status || 'pending'}, ${paymentStatus || 'open'}, ${clientName || ''}, ${clientEmail || ''},
        ${mpPaymentId || null}, ${mpPaymentMethod || null}, ${mpQrCode || null}, ${mpQrCodeBase64 || null}, ${mpStatus || null}
      )
      ON CONFLICT (id) DO UPDATE SET
        date = EXCLUDED.date,
        time = EXCLUDED.time,
        end_time = EXCLUDED.end_time,
        service = EXCLUDED.service,
        price = EXCLUDED.price,
        status = EXCLUDED.status,
        payment_status = EXCLUDED.payment_status,
        client_name = EXCLUDED.client_name,
        client_email = EXCLUDED.client_email,
        mp_payment_id = COALESCE(EXCLUDED.mp_payment_id, appointments.mp_payment_id),
        mp_payment_method = COALESCE(EXCLUDED.mp_payment_method, appointments.mp_payment_method),
        mp_qr_code = COALESCE(EXCLUDED.mp_qr_code, appointments.mp_qr_code),
        mp_qr_code_base64 = COALESCE(EXCLUDED.mp_qr_code_base64, appointments.mp_qr_code_base64),
        mp_status = COALESCE(EXCLUDED.mp_status, appointments.mp_status)
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

    await sql`DELETE FROM appointments WHERE id = ${Number(id)}`;
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

