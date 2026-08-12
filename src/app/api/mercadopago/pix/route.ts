import { NextResponse } from "next/server";
import { getDb, ensureTablesExist } from "@/lib/db";
import { getMercadoPagoConfig, getUniqueKey } from "@/lib/mercadopago";

export async function POST(req: Request) {
  const sql = getDb();
  
  try {
    const body = await req.json();
    const { appointmentId, amount, serviceName, clientName, clientEmail, clientCpf } = body;

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: "Valor do agendamento inválido." }, { status: 400 });
    }

    const config = await getMercadoPagoConfig();

    let mpPaymentId = "";
    let qrCode = "";
    let qrCodeBase64 = "";
    let ticketUrl = "";
    let mpStatus = "pending";

    // Call Mercado Pago API if access token is present
    if (config.accessToken && config.accessToken.length > 10) {
      const names = (clientName || "Cliente Agenday").trim().split(" ");
      const firstName = names[0] || "Cliente";
      const lastName = names.slice(1).join(" ") || "Agenday";
      const cleanCpf = (clientCpf || "").replace(/\D/g, "");

      const origin = req.headers.get("origin") || "";
      const notificationUrl = origin.startsWith("https://")
        ? `${origin}/api/mercadopago/webhook`
        : "https://franmarinho.netlify.app/api/mercadopago/webhook";

      const mpPayload: any = {
        transaction_amount: Number(amount),
        description: `Agendamento #${appointmentId} - ${serviceName || "Serviço Agenday"}`,
        payment_method_id: "pix",
        payer: {
          email: clientEmail || "cliente@agenday.com",
          first_name: firstName,
          last_name: lastName,
          ...(cleanCpf.length === 11 ? { identification: { type: "CPF", number: cleanCpf } } : {})
        },
        notification_url: notificationUrl
      };

      const mpRes = await fetch("https://api.mercadopago.com/v1/payments", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${config.accessToken}`,
          "Content-Type": "application/json",
          "X-Idempotency-Key": getUniqueKey()
        },
        body: JSON.stringify(mpPayload)
      });

      const mpData = await mpRes.json();

      if (mpRes.ok && mpData.id) {
        mpPaymentId = String(mpData.id);
        mpStatus = mpData.status || "pending";
        qrCode = mpData.point_of_interaction?.transaction_data?.qr_code || "";
        qrCodeBase64 = mpData.point_of_interaction?.transaction_data?.qr_code_base64 || "";
        ticketUrl = mpData.point_of_interaction?.transaction_data?.ticket_url || "";
      } else {
        console.error("Mercado Pago Pix Error:", mpData);
        
        const isUnauthorizedLive = (mpData.message || "").toLowerCase().includes("unauthorized use of live credentials");
        
        if (!isUnauthorizedLive && mpData.message) {
          return NextResponse.json({ 
            error: `Erro Mercado Pago: ${mpData.message} ${mpData.cause?.[0]?.description || ""}` 
          }, { status: 400 });
        }
      }
    }

    // Fallback simulation mode if credentials not configured yet or testing
    if (!qrCode) {
      mpPaymentId = `PIX_SIM_${Date.now()}`;
      qrCode = `00020126580014br.gov.bcb.pix0136${mpPaymentId}5204000053039865405${Number(amount).toFixed(2)}5802BR5915AGENDAY BEAUTY6009SAO PAULO62070503***6304ABCD`;
      // SVG / PNG Base64 mock placeholder for demonstration
      qrCodeBase64 = ""; 
    }

    // Update appointment in DB if appointmentId provided
    if (sql && appointmentId) {
      try {
        await ensureTablesExist(sql);
        await sql`
          UPDATE appointments 
          SET mp_payment_id = ${mpPaymentId},
              mp_payment_method = 'pix',
              mp_qr_code = ${qrCode},
              mp_qr_code_base64 = ${qrCodeBase64},
              mp_status = ${mpStatus},
              payment_status = 'pending'
          WHERE id = ${Number(appointmentId)}
        `;
      } catch (dbErr) {
        console.error("Error updating appointment with Pix data:", dbErr);
      }
    }

    return NextResponse.json({
      success: true,
      paymentId: mpPaymentId,
      status: mpStatus,
      qrCode,
      qrCodeBase64,
      ticketUrl,
      isSimulated: !config.accessToken
    });
  } catch (error: any) {
    console.error("Pix API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
