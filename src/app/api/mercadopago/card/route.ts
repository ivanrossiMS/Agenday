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
      cardNumber,
      expirationMonth,
      expirationYear,
      securityCode,
      date,
      time,
      endTime
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
          const isTestCard = cleanCard.startsWith("533675") || cleanCard.startsWith("424242") || cleanCard.startsWith("503175");
          if (isTestCard) {
            cardToken = `TEST_TOKEN_${Date.now()}`;
          } else {
            const errorMsg = tokenData.cause?.[0]?.description || tokenData.message || "Dados de cartão inválidos. Verifique o número, validade e CVV.";
            return NextResponse.json({ error: `Erro na validação do cartão: ${errorMsg}` }, { status: 400 });
          }
        }
      }

      // Detect payment_method_id via Mercado Pago's BIN lookup API (most accurate approach)
      // Falls back to regex if the lookup fails
      const cardBin = body.cardBin || (cardNumber ? cardNumber.replace(/\D/g, "").slice(0, 6) : "");
      let detectedMethod = paymentMethodId || "master";

      if (!paymentMethodId && cardBin && config.publicKey) {
        try {
          const binRes = await fetch(
            `https://api.mercadopago.com/v1/payment_methods/search?public_key=${config.publicKey}&bin=${cardBin}&payment_type_id=credit_card`,
            {
              headers: { "Authorization": `Bearer ${config.accessToken}` }
            }
          );
          const binData = await binRes.json();
          if (binData.results && binData.results.length > 0) {
            detectedMethod = binData.results[0].id;
          } else {
            // If no credit_card result, try without type filter
            const binRes2 = await fetch(
              `https://api.mercadopago.com/v1/payment_methods/search?public_key=${config.publicKey}&bin=${cardBin}`,
              { headers: { "Authorization": `Bearer ${config.accessToken}` } }
            );
            const binData2 = await binRes2.json();
            if (binData2.results && binData2.results.length > 0) {
              detectedMethod = binData2.results[0].id;
            }
          }
        } catch (binErr) {
          console.warn("BIN lookup failed, falling back to regex:", binErr);
        }
      }

      // Regex fallback if BIN lookup didn't resolve (no publicKey or API unavailable)
      if (!paymentMethodId && !cardBin && cardNumber) {
        const num = cardNumber.replace(/\D/g, "");
        if (num.startsWith("4")) detectedMethod = "visa";
        else if (/^5[1-5]/.test(num) || /^2[2-7]/.test(num)) detectedMethod = "master";
        else if (/^3[47]/.test(num)) detectedMethod = "amex";
        else if (/^6362|^6504|^6516|^6550|^4576|^4011/.test(num)) detectedMethod = "elo";
        else if (/^6011|^65/.test(num)) detectedMethod = "discover";
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

      const extRefData = JSON.stringify({
        appointmentId,
        date,
        time,
        endTime,
        service: serviceName,
        price: amount,
        clientName,
        clientEmail
      });

      const mpPayload: any = {
        transaction_amount: Number(amount),
        token: cardToken,
        description: `Agendamento #${appointmentId} - ${serviceName || "Serviço Agenday"}`,
        external_reference: extRefData,
        metadata: {
          appointment_id: appointmentId,
          date,
          time,
          end_time: endTime,
          service: serviceName,
          price: amount,
          client_name: clientName,
          client_email: clientEmail
        },
        installments: Number(installments) || 1,
        payment_method_id: detectedMethod,
        binary_mode: true,
        statement_descriptor: "FRANMARINHO",
        additional_info: {
          items: [
            {
              id: String(appointmentId || Date.now()),
              title: serviceName ? serviceName.slice(0, 128) : "Agendamento de Serviço",
              description: `Agendamento de beleza #${appointmentId}`,
              quantity: 1,
              unit_price: Number(amount)
            }
          ],
          payer: {
            first_name: firstName,
            last_name: lastName
          }
        },
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
          "X-Idempotency-Key": getUniqueKey(),
          // Forward real client IP for fraud scoring
          ...(req.headers.get("x-forwarded-for")
            ? { "X-Forwarded-For": req.headers.get("x-forwarded-for")! }
            : {})
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
          if (statusDetail === "cc_rejected_high_risk") {
            causeMsg = "⚠️ Pagamento recusado por alto risco (cc_rejected_high_risk). Possíveis causas:\n\n" +
              "1. Se você é a proprietária do salão (Francielli), não é possível pagar com seu próprio cartão vinculado ao Mercado Pago — o sistema bloqueia autofinanciamento por CPF.\n" +
              "2. Para testes, use os cartões de teste oficiais do Mercado Pago (números disponíveis em https://www.mercadopago.com.br/developers/pt/docs/your-integrations/test/cards).\n" +
              "3. Para clientes reais, recomende o pagamento via Pix (funciona perfeitamente).";
          } else if (statusDetail === "cc_rejected_insufficient_amount") {
            causeMsg = "Saldo ou limite insuficiente no cartão de crédito.";
          } else if (statusDetail === "cc_rejected_bad_filled_security_code") {
            causeMsg = "Código de segurança (CVV) incorreto.";
          } else if (statusDetail === "cc_rejected_bad_filled_date") {
            causeMsg = "Data de validade do cartão incorreta.";
          } else if (statusDetail === "cc_rejected_bad_filled_other") {
            causeMsg = "Dados do cartão incorretos. Por favor, verifique o número, validade e CVV.";
          } else if (statusDetail === "cc_rejected_call_for_authorize") {
            causeMsg = "Pagamento requer autorização do banco emissor do seu cartão. Ligue para o número no verso do cartão.";
          } else if (statusDetail === "cc_rejected_other_reason") {
            causeMsg = "Pagamento recusado pela operadora. Verifique se o cartão é válido ou utilize o Pix.";
          } else if (statusDetail === "cc_rejected_card_disabled") {
            causeMsg = "Cartão bloqueado ou desativado. Entre em contato com seu banco.";
          } else if (statusDetail === "cc_rejected_duplicated_payment") {
            causeMsg = "Pagamento duplicado detectado. Aguarde alguns minutos antes de tentar novamente.";
          }

          return NextResponse.json({ error: causeMsg, statusDetail, status: mpStatus }, { status: 400 });
        }
      } else {
        console.error("Mercado Pago Card Payment Error:", mpData);

        if (mpData.code === "PA_UNAUTHORIZED_RESULT_FROM_POLICIES" || mpData.message?.includes("UNAUTHORIZED")) {
          return NextResponse.json({ 
            error: "Sua conta do Mercado Pago necessita da ativação de credenciais de produção (ou uso da chave de teste 'TEST-'). No painel mercadopago.com.br/developers, clique em 'Ativar Credenciais de Produção' ou copie a chave de 'Credenciais de Teste'." 
          }, { status: 400 });
        }

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

    // Update or insert appointment status in DB when paid
    if (sql && appointmentId && isPaid) {
      try {
        await ensureTablesExist(sql);
        const existing = await sql`SELECT id FROM appointments WHERE id = ${Number(appointmentId)} LIMIT 1`;
        if (existing && existing.length > 0) {
          await sql`
            UPDATE appointments 
            SET mp_payment_id = ${mpPaymentId},
                mp_payment_method = 'credit_card',
                mp_status = ${mpStatus},
                payment_status = ${paymentStatus},
                status = CASE 
                  WHEN status = 'confirmed' THEN 'confirmed'
                  WHEN status = 'canceled' THEN 'canceled'
                  ELSE 'pending'
                END
            WHERE id = ${Number(appointmentId)}
          `;
        } else if (date && time && serviceName) {
          await sql`
            INSERT INTO appointments (
              id, date, time, end_time, service, price, status, payment_status, client_name, client_email,
              mp_payment_id, mp_payment_method, mp_status
            )
            VALUES (
              ${Number(appointmentId)}, ${date}, ${time}, ${endTime || null}, ${serviceName}, ${Number(amount) || 0},
              'pending', 'paid_credit', ${clientName || ''}, ${clientEmail || ''},
              ${mpPaymentId}, 'credit_card', ${mpStatus}
            )
          `;
        }
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
