import { NextResponse } from "next/server";
import { getDb, ensureTablesExist } from "@/lib/db";
import { getMercadoPagoConfig } from "@/lib/mercadopago";

export async function POST(req: Request) {
  try {
    const url = new URL(req.url);
    const body = await req.json().catch(() => ({}));
    
    // Mercado Pago webhook formats:
    // 1. { action: "payment.created" | "payment.updated", data: { id: "123456" } }
    // 2. Query param ?data.id=123456 or ?id=123456 & type=payment / topic=payment
    const paymentId = 
      body?.data?.id || 
      body?.id || 
      url.searchParams.get("data.id") || 
      url.searchParams.get("id");

    const topic = body?.type || body?.topic || url.searchParams.get("topic") || url.searchParams.get("type");

    if (!paymentId || (topic && topic !== "payment" && topic !== "payment.updated")) {
      return NextResponse.json({ received: true, note: "Ignored non-payment notification" });
    }

    const config = await getMercadoPagoConfig();
    if (!config.accessToken) {
      return NextResponse.json({ received: true, warning: "Mercado Pago access token not configured" });
    }

    // Query MP API for fresh payment data
    const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: {
        "Authorization": `Bearer ${config.accessToken}`
      }
    });

    if (!mpRes.ok) {
      console.error(`Failed to fetch MP payment ${paymentId} in webhook:`, mpRes.statusText);
      return NextResponse.json({ received: true, error: "Payment lookup failed" });
    }

    const mpData = await mpRes.json();
    const mpStatus = mpData.status; // approved, pending, in_process, rejected, refunded, cancelled
    const paymentMethodId = mpData.payment_method_id; // pix, visa, master, etc.

    const isPaid = mpStatus === "approved";
    let newPaymentStatus = "pending";

    if (isPaid) {
      newPaymentStatus = paymentMethodId === "pix" ? "paid_pix" : "paid_credit";
    } else if (mpStatus === "refunded") {
      newPaymentStatus = "refunded";
    } else if (mpStatus === "cancelled" || mpStatus === "rejected") {
      newPaymentStatus = "cancelled";
    }

    const sql = getDb();
    if (sql) {
      await ensureTablesExist(sql);

      // Try finding appointment by mp_payment_id
      const strPaymentId = String(paymentId);
      const updated = await sql`
        UPDATE appointments 
        SET mp_status = ${mpStatus},
            payment_status = ${newPaymentStatus},
            status = ${isPaid && config.autoConfirm ? 'confirmed' : 'pending'}
        WHERE mp_payment_id = ${strPaymentId}
        RETURNING id
      `;

      // If not updated by mp_payment_id, try description/external_reference
      if (!updated || updated.length === 0) {
        // Parse appointment ID from description e.g. "Agendamento #12345..."
        const desc = mpData.description || "";
        const match = desc.match(/#(\d+)/);
        if (match && match[1]) {
          const apptId = Number(match[1]);
          await sql`
            UPDATE appointments 
            SET mp_payment_id = ${strPaymentId},
                mp_status = ${mpStatus},
                payment_status = ${newPaymentStatus},
                status = ${isPaid && config.autoConfirm ? 'confirmed' : 'pending'}
            WHERE id = ${apptId}
          `;
        }
      }
    }

    return NextResponse.json({ success: true, paymentId, mpStatus, newPaymentStatus });
  } catch (error: any) {
    console.error("Mercado Pago Webhook error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET(req: Request) {
  return POST(req);
}
