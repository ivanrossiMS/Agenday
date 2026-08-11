import { NextResponse } from "next/server";
import crypto from "crypto";
import { getDb, ensureTablesExist } from "@/lib/db";
import { sendPasswordResetEmail } from "@/lib/email";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email } = body;

    if (!email || typeof email !== "string" || !email.includes("@")) {
      return NextResponse.json(
        { success: false, message: "Por favor, informe um endereço de e-mail válido." },
        { status: 400 }
      );
    }

    const cleanEmail = email.trim().toLowerCase();

    // 1. Gerar Token Seguro e Hash SHA-256
    const rawToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 Minutos de Validade
    const resetId = "reset_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7);

    let clientName = "Cliente";
    const sql = getDb();

    if (sql) {
      try {
        await ensureTablesExist(sql);

        // Buscar nome do cliente se existir no banco
        const clientRes = await sql`
          SELECT name FROM clients WHERE LOWER(email) = ${cleanEmail} LIMIT 1
        `;
        if (clientRes.length > 0 && clientRes[0].name) {
          clientName = clientRes[0].name;
        }

        // Invalidar tokens antigos não utilizados para este e-mail
        await sql`
          UPDATE password_resets 
          SET used = TRUE 
          WHERE LOWER(email) = ${cleanEmail} AND used = FALSE
        `;

        // Inserir novo token de redefinição
        await sql`
          INSERT INTO password_resets (id, email, token_hash, expires_at, used)
          VALUES (${resetId}, ${cleanEmail}, ${tokenHash}, ${expiresAt}, FALSE)
        `;
      } catch (dbErr) {
        console.error("Erro no banco de dados ao salvar token de redefinição:", dbErr);
      }
    }

    // 2. Construir URL de Redefinição
    const rawOrigin = req.headers.get("origin") || (req.headers.get("host") ? `https://${req.headers.get("host")}` : "") || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const origin = rawOrigin.replace(/\/$/, "");

    const resetLink = `${origin}/redefinir-senha?token=${rawToken}&email=${encodeURIComponent(cleanEmail)}`;

    // 3. Disparar E-mail
    const emailResult = await sendPasswordResetEmail({
      to: cleanEmail,
      name: clientName,
      resetLink,
    });

    // 4. Retornar resposta padronizada para prevenir Enumeração de Usuários (OWASP Security Standard)
    return NextResponse.json({
      success: true,
      message: "Se o e-mail estiver cadastrado em nossa plataforma, você receberá o link de redefinição em alguns instantes.",
      provider: emailResult.provider,
      devUrl: process.env.NODE_ENV !== "production" ? emailResult.devUrl : undefined,
    });
  } catch (error) {
    console.error("Erro ao processar solicitação de esqueci senha:", error);
    return NextResponse.json(
      { success: false, message: "Ocorreu um erro ao processar sua solicitação. Tente novamente." },
      { status: 500 }
    );
  }
}
