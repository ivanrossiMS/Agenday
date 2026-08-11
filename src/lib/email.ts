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
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
          background-color: #f7eeea;
          margin: 0;
          padding: 0;
          -webkit-font-smoothing: antialiased;
        }
        .wrapper {
          width: 100%;
          background-color: #f7eeea;
          padding: 40px 12px;
        }
        .main-card {
          max-width: 560px;
          margin: 0 auto;
          background: #ffffff;
          border-radius: 24px;
          overflow: hidden;
          box-shadow: 0 20px 40px rgba(184, 87, 76, 0.12), 0 4px 12px rgba(0, 0, 0, 0.03);
          border: 1px solid #f3e5e0;
        }
        .header-banner {
          background: linear-gradient(135deg, #1e1919 0%, #382124 50%, #b8574c 100%);
          padding: 42px 32px;
          text-align: center;
          color: #ffffff;
        }
        .badge {
          display: inline-block;
          background: rgba(255, 255, 255, 0.15);
          border: 1px solid rgba(255, 255, 255, 0.25);
          padding: 6px 16px;
          border-radius: 20px;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 1.5px;
          text-transform: uppercase;
          color: #fce7f3;
          margin-bottom: 16px;
        }
        .header-banner h1 {
          margin: 0;
          font-size: 26px;
          font-weight: 800;
          letter-spacing: -0.5px;
          color: #ffffff;
        }
        .header-banner p {
          margin: 8px 0 0 0;
          font-size: 14px;
          opacity: 0.9;
          color: #fce7f3;
        }
        .content-body {
          padding: 40px 36px;
        }
        .greeting {
          font-size: 20px;
          font-weight: 800;
          color: #1e293b;
          margin-bottom: 12px;
          letter-spacing: -0.01em;
        }
        .paragraph {
          font-size: 15px;
          line-height: 1.65;
          color: #475569;
          margin-bottom: 32px;
        }
        .btn-container {
          text-align: center;
          margin: 32px 0 36px 0;
        }
        .action-btn {
          display: inline-block;
          background: linear-gradient(135deg, #b8574c 0%, #8f3c33 100%);
          color: #ffffff !important;
          text-decoration: none;
          padding: 18px 40px;
          border-radius: 16px;
          font-weight: 700;
          font-size: 16px;
          box-shadow: 0 10px 25px rgba(184, 87, 76, 0.35);
          letter-spacing: -0.01em;
        }
        .security-card {
          background-color: #fff5f3;
          border: 1px solid #fecdd3;
          border-radius: 16px;
          padding: 20px;
          margin-top: 28px;
        }
        .security-title {
          font-size: 14px;
          font-weight: 700;
          color: #b8574c;
          margin-bottom: 6px;
        }
        .security-text {
          font-size: 13px;
          color: #64748b;
          line-height: 1.55;
          margin: 0;
        }
        .divider {
          height: 1px;
          background: #f1f5f9;
          margin: 32px 0 24px 0;
        }
        .fallback-link {
          font-size: 12px;
          color: #94a3b8;
          line-height: 1.5;
          word-break: break-all;
        }
        .footer {
          background-color: #faf5f3;
          border-top: 1px solid #f3e5e0;
          padding: 28px 36px;
          text-align: center;
          font-size: 12px;
          color: #94a3b8;
          line-height: 1.6;
        }
        .footer-brand {
          font-weight: 700;
          color: #b8574c;
          margin-bottom: 4px;
        }
      </style>
    </head>
    <body>
      <div class="wrapper">
        <div class="main-card">
          <div class="header-banner">
            <div class="badge">✨ FRAN MARINHO • STUDIO DE BELEZA</div>
            <h1>Redefinição de Senha</h1>
            <p>Sua segurança e beleza tratadas com carinho</p>
          </div>

          <div class="content-body">
            <div class="greeting">Olá, ${name}! 👋</div>
            <div class="paragraph">
              Recebemos uma solicitação para redefinir a senha de acesso da sua conta no <strong>Agenday • Fran Marinho Studio</strong>.
              Para cadastrar uma nova senha com segurança, clique no botão abaixo:
            </div>

            <div class="btn-container">
              <a href="${resetLink}" class="btn action-btn" target="_blank">Redefinir Minha Senha</a>
            </div>

            <div class="security-card">
              <div class="security-title">🔒 Link de Uso Único e Seguro</div>
              <div class="security-text">
                Este link expira em <strong>15 minutos</strong> e só pode ser utilizado uma vez.<br>
                Se você não solicitou a alteração, nenhuma ação é necessária e sua conta continuará protegida.
              </div>
            </div>

            <div class="divider"></div>

            <div class="fallback-link">
              Se o botão não abrir automaticamente, copie e cole o link no seu navegador:<br>
              <a href="${resetLink}" style="color: #b8574c; font-weight: 600;">${resetLink}</a>
            </div>
          </div>

          <div class="footer">
            <div class="footer-brand">Fran Marinho Studio de Beleza</div>
            Agenday • Plataforma de Agendamentos Premium<br>
            &copy; ${new Date().getFullYear()} Todos os direitos reservados.
          </div>
        </div>
      </div>
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
