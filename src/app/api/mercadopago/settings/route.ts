import { NextResponse } from "next/server";
import { getDb, ensureTablesExist } from "@/lib/db";

export async function GET() {
  const sql = getDb();
  
  let accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN || "";
  let publicKey = process.env.MERCADOPAGO_PUBLIC_KEY || "";
  let sandbox = true;
  let autoConfirm = true;

  if (sql) {
    try {
      await ensureTablesExist(sql);
      const rows = await sql`SELECT mp_access_token, mp_public_key, mp_sandbox, mp_auto_confirm FROM site_settings WHERE id = 'default' LIMIT 1`;
      if (rows && rows.length > 0) {
        if (rows[0].mp_access_token) accessToken = rows[0].mp_access_token;
        if (rows[0].mp_public_key) publicKey = rows[0].mp_public_key;
        if (typeof rows[0].mp_sandbox === "boolean") sandbox = rows[0].mp_sandbox;
        if (typeof rows[0].mp_auto_confirm === "boolean") autoConfirm = rows[0].mp_auto_confirm;
      }
    } catch (err: any) {
      console.error("Error reading MP settings from DB:", err);
    }
  }

  const isConfigured = Boolean(accessToken && accessToken.trim().length > 10);

  return NextResponse.json({
    isConfigured,
    accessToken,
    publicKey,
    sandbox,
    autoConfirm
  });
}

export async function POST(req: Request) {
  const sql = getDb();
  if (!sql) {
    return NextResponse.json({ error: "Banco de dados não conectado." }, { status: 500 });
  }

  try {
    await ensureTablesExist(sql);
    const body = await req.json();
    const { accessToken, publicKey, sandbox, autoConfirm } = body;

    await sql`
      INSERT INTO site_settings (id, mp_access_token, mp_public_key, mp_sandbox, mp_auto_confirm)
      VALUES ('default', ${accessToken || ''}, ${publicKey || ''}, ${Boolean(sandbox)}, ${Boolean(autoConfirm)})
      ON CONFLICT (id) DO UPDATE SET
        mp_access_token = EXCLUDED.mp_access_token,
        mp_public_key = EXCLUDED.mp_public_key,
        mp_sandbox = EXCLUDED.mp_sandbox,
        mp_auto_confirm = EXCLUDED.mp_auto_confirm,
        updated_at = NOW()
    `;

    return NextResponse.json({ success: true, message: "Configurações do Mercado Pago salvas com sucesso!" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
