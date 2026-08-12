import { NextResponse } from "next/server";
import { getDb, ensureTablesExist } from "@/lib/db";
import { getMercadoPagoConfig, getUniqueKey } from "@/lib/mercadopago";

export async function POST(req: Request) {
  const sql = getDb();

  try {
    const body = await req.json();
    const { appointmentId, paymentId } = body;

    let targetPaymentId = paymentId;

    if (sql && appointmentId && !targetPaymentId) {
      await ensureTablesExist(sql);
      const rows = await sql`SELECT mp_payment_id FROM appointments WHERE id = ${Number(appointmentId)} LIMIT 1`;
      if (rows && rows.length > 0) {
        targetPaymentId = rows[0].mp_payment_id;
      }
    }

    if (!targetPaymentId) {
      return NextResponse.json({ error: "ID de pagamento do Mercado Pago não encontrado." }, { status: 400 });
    }

    const config = await getMercadoPagoConfig();

    if (config.accessToken && !targetPaymentId.startsWith("PIX_SIM_") && !targetPaymentId.startsWith("CARD_SIM_")) {
      const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${targetPaymentId}/refunds`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${config.accessToken}`,
          "Content-Type": "application/json",
          "X-Idempotency-Key": getUniqueKey()
        }
      });

      const mpData = await mpRes.json();

      if (!mpRes.ok) {
        console.error("Mercado Pago Refund error:", mpData);
        return NextResponse.json({ error: `Erro no estorno MP: ${mpData.message || "Falha na API"}` }, { status: 400 });
      }
    }

    // Update appointment in DB to refunded
    if (sql && (appointmentId || targetPaymentId)) {
      await ensureTablesExist(sql);
      if (appointmentId) {
        await sql`
          UPDATE appointments 
          SET mp_status = 'refunded',
              payment_status = 'refunded',
              status = 'canceled'
          WHERE id = ${Number(appointmentId)}
        `;
      } else {
        await sql`
          UPDATE appointments 
          SET mp_status = 'refunded',
              payment_status = 'refunded',
              status = 'canceled'
          WHERE mp_payment_id = ${targetPaymentId}
        `;
      }
    }

    return NextResponse.json({ success: true, message: "Pagamento estornado/reembolsado com sucesso!" });

  } catch (error: any) {
    console.error("Refund API error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
