import nodemailer from "nodemailer";

interface SendResetEmailParams {
  to: string;
  name?: string;
  resetLink: string;
}

/**
 * Envia e-mail de redefinição de senha com design profissional e suporte a múltiplos provedores (SMTP, Resend ou Dev Console Fallback).
 */
export async function sendPasswordResetEmail({ to, name = "Cliente", resetLink }: SendResetEmailParams): Promise<{ success: boolean; messageId?: string; devUrl?: string; provider: string }> {
  const from = process.env.EMAIL_FROM || process.env.SMTP_USER || '"Fran Marinho Studio" <atendimento@agenday.com.br>';

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Redefinição de Senha • Fran Marinho</title>
    </head>
    <body style="margin:0; padding:0; background-color:#f7eeea; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
      <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f7eeea; padding: 30px 10px;">
        <tr>
          <td align="center">
            <!-- Main Card Container -->
            <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 560px; background-color: #ffffff; border-radius: 20px; overflow: hidden; border: 1px solid #f3e5e0; box-shadow: 0 10px 30px rgba(184, 87, 76, 0.15);">
              
              <!-- Header Banner with Solid Background #8f3c33 for Outlook -->
              <tr>
                <td bgcolor="#8f3c33" style="background-color: #8f3c33 !important; padding: 36px 24px; text-align: center; color: #ffffff;">
                  <!-- Badge -->
                  <div style="display: inline-block; background-color: #5c231d !important; color: #ffffff !important; padding: 6px 16px; border-radius: 20px; font-size: 11px; font-weight: 800; letter-spacing: 1px; text-transform: uppercase; border: 1px solid #b8574c; margin-bottom: 12px;">
                    ✨ FRAN MARINHO • STUDIO DE BELEZA
                  </div>
                  <h1 style="margin: 10px 0 6px 0; color: #ffffff !important; font-size: 24px; font-weight: 800; letter-spacing: -0.5px;">
                    Redefinição de Senha
                  </h1>
                  <p style="margin: 0; color: #fce7f3 !important; font-size: 14px; font-weight: 500;">
                    Sua segurança e beleza tratadas com carinho
                  </p>
                </td>
              </tr>

              <!-- Content Body -->
              <tr>
                <td style="padding: 36px 32px; background-color: #ffffff; color: #334155;">
                  <h2 style="margin: 0 0 12px 0; font-size: 20px; font-weight: 800; color: #1e293b;">
                    Olá, ${name}! 👋
                  </h2>
                  <p style="margin: 0 0 28px 0; font-size: 15px; line-height: 1.65; color: #475569;">
                    Recebemos uma solicitação para redefinir a senha de acesso da sua conta no <strong>Agenday • Fran Marinho Studio</strong>.<br><br>
                    Para cadastrar uma nova senha com segurança, clique no botão abaixo:
                  </p>

                  <!-- Action Button with Solid #b8574c Background for 100% Outlook Visibility -->
                  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin: 28px 0 32px 0;">
                    <tr>
                      <td align="center">
                        <a href="${resetLink}" target="_blank" style="display: inline-block; background-color: #b8574c !important; color: #ffffff !important; text-decoration: none; padding: 18px 40px; border-radius: 14px; font-weight: 800; font-size: 16px; border: 1px solid #8f3c33; box-shadow: 0 8px 20px rgba(184, 87, 76, 0.35);">
                          REDEFINIR MINHA SENHA
                        </a>
                      </td>
                    </tr>
                  </table>

                  <!-- Security Box -->
                  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #fff5f3; border: 1px solid #fecdd3; border-radius: 14px; margin-top: 24px;">
                    <tr>
                      <td style="padding: 18px 20px; color: #64748b; font-size: 13px; line-height: 1.55;">
                        <strong style="color: #b8574c; font-size: 14px; display: block; margin-bottom: 4px;">
                          🔒 Link de Uso Único e Seguro
                        </strong>
                        Este link expira em <strong>15 minutos</strong> e só pode ser utilizado uma vez.<br>
                        Se você não solicitou a alteração, nenhuma ação é necessária e sua senha atual permanecerá inalterada.
                      </td>
                    </tr>
                  </table>

                  <hr style="border: none; border-top: 1px solid #f1f5f9; margin: 30px 0 20px 0;">

                  <!-- Fallback Link -->
                  <p style="margin: 0; font-size: 12px; color: #94a3b8; line-height: 1.5; word-break: break-all;">
                    Se o botão não abrir automaticamente, copie e cole este link no seu navegador:<br>
                    <a href="${resetLink}" style="color: #b8574c; font-weight: 700; text-decoration: underline;">${resetLink}</a>
                  </p>
                </td>
              </tr>

              <!-- Footer -->
              <tr>
                <td bgcolor="#faf5f3" style="background-color: #faf5f3; border-top: 1px solid #f3e5e0; padding: 24px 32px; text-align: center; font-size: 12px; color: #94a3b8; line-height: 1.6;">
                  <strong style="color: #b8574c; font-size: 13px;">Fran Marinho Studio de Beleza</strong><br>
                  Agenday • Plataforma de Agendamentos Premium<br>
                  &copy; ${new Date().getFullYear()} Todos os direitos reservados.
                </td>
              </tr>

            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  // 1. Tentar enviar via SMTP se configurado
  const smtpHost = process.env.SMTP_HOST;
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;

  if (smtpHost && smtpUser && smtpPass) {
    try {
      const port = Number(process.env.SMTP_PORT) || 587;
      const secure = process.env.SMTP_SECURE === "true" || port === 465;

      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port,
        secure,
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
      });

      const info = await transporter.sendMail({
        from,
        to,
        subject: "🔒 Redefinição de Senha - Fran Marinho Studio",
        html: htmlContent,
      });

      console.log("E-mail enviado via SMTP:", info.messageId);
      return { success: true, messageId: info.messageId, provider: "smtp" };
    } catch (err) {
      console.error("Erro ao enviar e-mail via SMTP:", err);
    }
  }

  // 2. Tentar enviar via RESEND API se configurado
  const resendApiKey = process.env.RESEND_API_KEY;
  if (resendApiKey) {
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: from.includes("<") ? from : `Fran Marinho Studio <${from}>`,
          to: [to],
          subject: "🔒 Redefinição de Senha - Fran Marinho Studio",
          html: htmlContent,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        return { success: true, messageId: data.id, provider: "resend" };
      } else {
        console.error("Erro na API do Resend:", data);
      }
    } catch (err) {
      console.error("Erro ao conectar com Resend:", err);
    }
  }

  // 3. Dev Fallback: Exibir no console para testes de desenvolvimento instantâneos
  console.log("\n=======================================================");
  console.log("🔑 [DEV MODE] LINK DE REDEFINIÇÃO DE SENHA GERADO:");
  console.log(`Para: ${to} (${name})`);
  console.log(`Link: ${resetLink}`);
  console.log("=======================================================\n");

  return {
    success: true,
    devUrl: resetLink,
    provider: "dev_console",
  };
}
