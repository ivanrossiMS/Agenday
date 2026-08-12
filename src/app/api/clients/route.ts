import { NextResponse } from "next/server";
import { getDb, ensureTablesExist } from "@/lib/db";

export async function GET() {
  const sql = getDb();
  if (!sql) return NextResponse.json({ configured: false, data: [] });

  try {
    await ensureTablesExist(sql);
    const rows = await sql`SELECT * FROM clients ORDER BY created_at DESC`;
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
    const { id, name, email, phone, address, birthDate, photoUrl, status, password } = body;

    const cleanEmail = email ? email.trim().toLowerCase() : "";
    if (!cleanEmail) {
      return NextResponse.json({ success: false, message: "E-mail é obrigatório." }, { status: 400 });
    }

    // Verificar se já existe outro cliente cadastrado com este mesmo e-mail
    const existing = await sql`
      SELECT id FROM clients WHERE LOWER(email) = ${cleanEmail} AND id <> ${id || ''} LIMIT 1
    `;
    if (existing.length > 0) {
      return NextResponse.json(
        { success: false, message: "Este e-mail já está cadastrado por outro usuário. O e-mail deve ser único." },
        { status: 400 }
      );
    }

    await sql`
      INSERT INTO clients (id, name, email, phone, address, birth_date, photo_url, status, password)
      VALUES (${id}, ${name}, ${cleanEmail}, ${phone || ''}, ${address || ''}, ${birthDate || ''}, ${photoUrl || ''}, ${status || 'active'}, ${password || ''})
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        email = EXCLUDED.email,
        phone = EXCLUDED.phone,
        address = EXCLUDED.address,
        birth_date = EXCLUDED.birth_date,
        photo_url = EXCLUDED.photo_url,
        status = EXCLUDED.status,
        password = CASE WHEN EXCLUDED.password <> '' THEN EXCLUDED.password ELSE clients.password END
    `;
    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error.message && (error.message.includes("unique") || error.message.includes("clients_email_lower_idx"))) {
      return NextResponse.json({ success: false, message: "Este e-mail já está cadastrado por outro usuário." }, { status: 400 });
    }
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
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
    const emailParam = searchParams.get("email");

    if (!id && !emailParam) return NextResponse.json({ error: "Missing id or email" }, { status: 400 });

    let clientEmail = emailParam ? emailParam.trim().toLowerCase() : "";

    if (id && !clientEmail) {
      const rows = await sql`SELECT email FROM clients WHERE id = ${id} LIMIT 1`;
      if (rows.length > 0 && rows[0].email) {
        clientEmail = rows[0].email.trim().toLowerCase();
      }
    }

    // Excluir todos os registros vinculados ao cliente (agendamentos, cartões fidelidade, resets de senha)
    if (clientEmail) {
      await sql`DELETE FROM appointments WHERE LOWER(client_email) = ${clientEmail}`;
      await sql`DELETE FROM loyalty_claims WHERE LOWER(client_email) = ${clientEmail}`;
      await sql`DELETE FROM password_resets WHERE LOWER(email) = ${clientEmail}`;
      await sql`DELETE FROM clients WHERE LOWER(email) = ${clientEmail}`;
    }

    if (id) {
      await sql`DELETE FROM clients WHERE id = ${id}`;
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}


