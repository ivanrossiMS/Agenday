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
        let apptId: number | null = null;
        let extData: any = null;

        if (mpData.external_reference) {
          try {
            extData = JSON.parse(mpData.external_reference);
            apptId = Number(extData.appointmentId || extData.id);
          } catch {
            apptId = Number(mpData.external_reference);
          }
        }
        if (!apptId && mpData.metadata?.appointment_id) {
          apptId = Number(mpData.metadata.appointment_id);
        }
        if (!apptId) {
          const desc = mpData.description || "";
          const match = desc.match(/#(\d+)/);
          if (match && match[1]) apptId = Number(match[1]);
        }

        if (apptId) {
          const existing = await sql`SELECT id FROM appointments WHERE id = ${apptId} LIMIT 1`;
          if (existing && existing.length > 0) {
            await sql`
              UPDATE appointments 
              SET mp_payment_id = ${strPaymentId},
                  mp_status = ${mpStatus},
                  payment_status = ${newPaymentStatus},
                  status = ${isPaid && config.autoConfirm ? 'confirmed' : 'pending'}
              WHERE id = ${apptId}
            `;
          } else if (isPaid) {
            // Create the confirmed appointment in DB if it was paid
            const date = extData?.date || mpData.metadata?.date;
            const time = extData?.time || mpData.metadata?.time;
            const endTime = extData?.endTime || mpData.metadata?.end_time;
            const service = extData?.service || mpData.metadata?.service || mpData.description;
            const price = extData?.price || mpData.metadata?.price || mpData.transaction_amount;
            const clientName = extData?.clientName || mpData.metadata?.client_name || mpData.payer?.first_name || 'Cliente';
            const clientEmail = extData?.clientEmail || mpData.metadata?.client_email || mpData.payer?.email || '';

            if (date && time && service) {
              await sql`
                INSERT INTO appointments (
                  id, date, time, end_time, service, price, status, payment_status, client_name, client_email,
                  mp_payment_id, mp_payment_method, mp_status
                )
                VALUES (
                  ${apptId}, ${date}, ${time}, ${endTime || null}, ${service}, ${Number(price) || 0},
                  'confirmed', ${newPaymentStatus}, ${clientName}, ${clientEmail},
                  ${strPaymentId}, ${paymentMethodId || 'pix'}, ${mpStatus}
                )
              `;
            }
          }
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
