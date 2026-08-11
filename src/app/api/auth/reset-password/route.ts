import { NextResponse } from "next/server";
import crypto from "crypto";
import { getDb, ensureTablesExist } from "@/lib/db";

// GET /api/auth/reset-password?token=... -> Valida se o token é válido e não expirado
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token");

  if (!token) {
    return NextResponse.json({ valid: false, message: "Token de redefinição não fornecido." }, { status: 400 });
  }

  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  const sql = getDb();

  if (sql) {
    try {
      await ensureTablesExist(sql);
      const rows = await sql`
        SELECT email, expires_at, used FROM password_resets
        WHERE token_hash = ${tokenHash}
        LIMIT 1
      `;

      if (rows.length === 0) {
        return NextResponse.json({ valid: false, message: "Link de redefinição inválido ou não encontrado." }, { status: 400 });
      }

      const record = rows[0];
      if (record.used) {
        return NextResponse.json({ valid: false, message: "Este link de redefinição já foi utilizado anteriormente." }, { status: 400 });
      }

      if (new Date(record.expires_at) < new Date()) {
        return NextResponse.json({ valid: false, message: "Este link de redefinição expirou. Por favor, solicite um novo link." }, { status: 400 });
      }

      return NextResponse.json({ valid: true, email: record.email });
    } catch (err) {
      console.error("Erro ao verificar token de redefinição:", err);
    }
  }

  // Fallback para modo local / sem DB
  return NextResponse.json({ valid: true });
}

// POST /api/auth/reset-password -> Redefine a senha com o token
export async function POST(req: Request) {
  try {
    const { token, newPassword, email: optionalEmail } = await req.json();

    if (!token || !newPassword || newPassword.length < 6) {
      return NextResponse.json(
        { success: false, message: "A nova senha deve conter pelo menos 6 caracteres." },
        { status: 400 }
      );
    }

    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    const sql = getDb();
    let targetEmail = optionalEmail || "";

    if (sql) {
      try {
        await ensureTablesExist(sql);

        // 1. Verificar token no Banco de Dados
        const rows = await sql`
          SELECT id, email, expires_at, used FROM password_resets
          WHERE token_hash = ${tokenHash}
          LIMIT 1
        `;

        if (rows.length === 0) {
          return NextResponse.json({ success: false, message: "Link de redefinição inválido." }, { status: 400 });
        }

        const resetRecord = rows[0];

        if (resetRecord.used) {
          return NextResponse.json({ success: false, message: "Este link de redefinição já foi utilizado." }, { status: 400 });
        }

        if (new Date(resetRecord.expires_at) < new Date()) {
          return NextResponse.json({ success: false, message: "Este link de redefinição expirou. Solicite um novo." }, { status: 400 });
        }

        targetEmail = resetRecord.email;

        // 2. Marcar token como utilizado
        await sql`
          UPDATE password_resets 
          SET used = TRUE 
          WHERE id = ${resetRecord.id}
        `;

        // 3. Atualizar a senha do cliente no banco PostgreSQL
        await sql`
          UPDATE clients 
          SET password = ${newPassword}
          WHERE LOWER(email) = ${targetEmail.toLowerCase()}
        `;

      } catch (dbErr) {
        console.error("Erro ao atualizar senha no banco de dados:", dbErr);
      }
    }

    return NextResponse.json({
      success: true,
      message: "Sua senha foi redefinida com sucesso! Você já pode acessar sua conta.",
      email: targetEmail,
    });
  } catch (error) {
    console.error("Erro no servidor ao redefinir senha:", error);
    return NextResponse.json(
      { success: false, message: "Ocorreu um erro interno ao redefinir a senha. Tente novamente." },
      { status: 500 }
    );
  }
}
