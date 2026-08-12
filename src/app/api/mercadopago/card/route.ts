import { NextResponse } from "next/server";
import { getDb, ensureTablesExist } from "@/lib/db";
import { getMercadoPagoConfig, getUniqueKey } from "@/lib/mercadopago";

export async function POST(req: Request) {
  const sql = getDb();

  try {
    const body = await req.json();
    const { 
      appointmentId, 
      amount, 
      serviceName, 
      clientName, 
      clientEmail, 
      token, 
      paymentMethodId, 
      installments,
      cardholderName,
      cpf,
      // Direct raw card details if token is created server-side or in sandbox
      cardNumber,
      expirationMonth,
      expirationYear,
      securityCode
    } = body;

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: "Valor do agendamento inválido." }, { status: 400 });
    }

    const config = await getMercadoPagoConfig();

    let mpPaymentId = "";
    let mpStatus = "pending";
    let statusDetail = "";

    if (config.accessToken && config.accessToken.length > 10) {
      let cardToken = token;

      // If token not provided directly, tokenize card details server-side via MP API v1 /card_tokens
      if (!cardToken && cardNumber) {
        const cleanCard = cardNumber.replace(/\D/g, "");
        const cleanCpf = (cpf || "").replace(/\D/g, "");

        const tokenRes = await fetch("https://api.mercadopago.com/v1/card_tokens", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${config.accessToken}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            card_number: cleanCard,
            security_code: securityCode,
            expiration_month: Number(expirationMonth),
            expiration_year: Number(expirationYear.length === 2 ? `20${expirationYear}` : expirationYear),
            cardholder: {
              name: cardholderName || clientName || "CLIENTE AGENDAY",
              identification: {
                type: "CPF",
                number: cleanCpf || "11111111111"
              }
            }
          })
        });

        const tokenData = await tokenRes.json();
        if (tokenRes.ok && tokenData.id) {
          cardToken = tokenData.id;
        } else {
          console.error("Card Token error:", tokenData);
          const errorMsg = tokenData.cause?.[0]?.description || tokenData.message || "Dados de cartão inválidos.";
          return NextResponse.json({ error: `Erro na validação do cartão: ${errorMsg}` }, { status: 400 });
        }
      }

      // Infer payment_method_id if not supplied (e.g. visa, master)
      let detectedMethod = paymentMethodId || "visa";
      if (!paymentMethodId && cardNumber) {
        const num = cardNumber.replace(/\D/g, "");
        if (num.startsWith("4")) detectedMethod = "visa";
        else if (/^5[1-5]/.test(num) || /^2[2-7]/.test(num)) detectedMethod = "master";
        else if (/^3[47]/.test(num)) detectedMethod = "amex";
        else if (/^6011|^65/.test(num)) detectedMethod = "elo";
        else if (/^38|^60/.test(num)) detectedMethod = "hipercard";
      }

      const names = (clientName || cardholderName || "Cliente Agenday").trim().split(" ");
      const firstName = names[0] || "Cliente";
      const lastName = names.slice(1).join(" ") || "Agenday";
      const cleanCpf = (cpf || "").replace(/\D/g, "");

      const origin = req.headers.get("origin") || "";
      const notificationUrl = origin.startsWith("https://")
        ? `${origin}/api/mercadopago/webhook`
        : "https://franmarinho.netlify.app/api/mercadopago/webhook";

      const mpPayload: any = {
        transaction_amount: Number(amount),
        token: cardToken,
        description: `Agendamento #${appointmentId} - ${serviceName || "Serviço Agenday"}`,
        installments: Number(installments) || 1,
        payment_method_id: detectedMethod,
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
        mpStatus = mpData.status || "approved";
        statusDetail = mpData.status_detail || "";

        if (mpStatus === "rejected") {
          let causeMsg = "Pagamento recusado pela operadora do cartão.";
          if (statusDetail === "cc_rejected_insufficient_amount") causeMsg = "Saldo insuficiente no cartão.";
          else if (statusDetail === "cc_rejected_bad_filled_security_code") causeMsg = "Código de segurança (CVV) incorreto.";
          else if (statusDetail === "cc_rejected_bad_filled_date") causeMsg = "Data de validade incorreta.";
          else if (statusDetail === "cc_rejected_bad_filled_other") causeMsg = "Por favor, verifique os dados do cartão.";
          else if (statusDetail === "cc_rejected_call_for_authorize") causeMsg = "Pagamento requer autorização da sua instituição financeira.";
          else if (statusDetail === "cc_rejected_high_risk") causeMsg = "Recusado pelo Mercado Pago (Nota: Em modo de teste, a conta do vendedor não pode comprar de si mesma).";
          else if (statusDetail === "cc_rejected_other_reason") causeMsg = "Pagamento recusado pelo Mercado Pago. Verifique os dados do cartão.";

          return NextResponse.json({ error: causeMsg, statusDetail, status: mpStatus }, { status: 400 });
        }
      } else {
        console.error("Mercado Pago Card Payment Error:", mpData);
        const errorMsg = mpData.cause?.[0]?.description || mpData.message || "Não foi possível processar o pagamento com cartão.";
        return NextResponse.json({ error: `Erro Mercado Pago: ${errorMsg}` }, { status: 400 });
      }
    } else {
      // Direct simulation mode ONLY when Access Token is not configured at all
      mpPaymentId = `CARD_SIM_${Date.now()}`;
      mpStatus = "approved";
    }

    const isPaid = mpStatus === "approved";
    const paymentStatus = isPaid ? "paid_credit" : "pending";

    // Update appointment status in DB
    if (sql && appointmentId) {
      try {
        await ensureTablesExist(sql);
        await sql`
          UPDATE appointments 
          SET mp_payment_id = ${mpPaymentId},
              mp_payment_method = 'credit_card',
              mp_status = ${mpStatus},
              payment_status = ${paymentStatus},
              status = ${isPaid && config.autoConfirm ? 'confirmed' : 'pending'}
          WHERE id = ${Number(appointmentId)}
        `;
      } catch (dbErr) {
        console.error("Error updating appointment with Card payment:", dbErr);
      }
    }

    return NextResponse.json({
      success: isPaid,
      paymentId: mpPaymentId,
      status: mpStatus,
      statusDetail,
      isSimulated: !config.accessToken
    });

  } catch (error: any) {
    console.error("Card API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
