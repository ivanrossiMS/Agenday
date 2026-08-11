import { NextResponse } from "next/server";
import { getDb, ensureTablesExist } from "@/lib/db";

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { success: false, message: "Por favor, preencha o e-mail e a senha." },
        { status: 400 }
      );
    }

    const cleanEmail = email.trim().toLowerCase();

    // 1. Login do Administrador
    if (cleanEmail === "brasilfrancielli@gmail.com") {
      if (password === "ivanross") {
        return NextResponse.json({
          success: true,
          user: {
            id: "admin1",
            name: "Francielli",
            email: cleanEmail,
            role: "admin",
            phone: "(11) 98888-7777",
            birthDate: "1995-05-15",
            status: "active",
          },
        });
      } else {
        return NextResponse.json(
          { success: false, message: "Senha incorreta. Por favor, verifique a senha digitada ou clique em 'Esqueci minha senha'." },
          { status: 401 }
        );
      }
    }

    // 2. Login no banco de dados PostgreSQL (Neon)
    const sql = getDb();
    if (sql) {
      await ensureTablesExist(sql);
      const rows = await sql`
        SELECT * FROM clients WHERE LOWER(email) = ${cleanEmail} LIMIT 1
      `;

      if (rows.length > 0) {
        const dbClient = rows[0];

        // Se o cliente possui senha no banco, valida se é idêntica
        if (dbClient.password && dbClient.password.trim() !== "") {
          if (dbClient.password !== password) {
            return NextResponse.json(
              { success: false, message: "Senha incorreta. Por favor, verifique a senha digitada ou clique em 'Esqueci minha senha'." },
              { status: 401 }
            );
          }
        } else {
          // Se for um cliente antigo cadastrado sem senha, atualiza a senha dele com a nova senha digitada
          await sql`
            UPDATE clients SET password = ${password} WHERE id = ${dbClient.id}
          `;
        }

        return NextResponse.json({
          success: true,
          user: {
            id: dbClient.id,
            name: dbClient.name,
            email: dbClient.email,
            role: "client",
            phone: dbClient.phone || "",
            birthDate: dbClient.birth_date || "",
            photo: dbClient.photo_url || "",
            status: dbClient.status || "active",
          },
        });
      }
    }

    return NextResponse.json(
      { success: false, message: "USER_NOT_FOUND" },
      { status: 404 }
    );
  } catch (error) {
    console.error("Erro no login via API:", error);
    return NextResponse.json(
      { success: false, message: "Erro de servidor ao processar o login." },
      { status: 500 }
    );
  }
}
