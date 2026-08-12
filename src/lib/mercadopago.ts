import { getDb, ensureTablesExist } from "@/lib/db";

export interface MercadoPagoConfig {
  accessToken: string;
  publicKey: string;
  sandbox: boolean;
  autoConfirm: boolean;
}

export async function getMercadoPagoConfig(): Promise<MercadoPagoConfig> {
  let accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN || "";
  let publicKey = process.env.MERCADOPAGO_PUBLIC_KEY || "";
  let sandbox = false;
  let autoConfirm = true;

  const sql = getDb();
  if (sql) {
    try {
      await ensureTablesExist(sql);
      const rows = await sql`SELECT mp_access_token, mp_public_key, mp_sandbox, mp_auto_confirm FROM site_settings WHERE id = 'default' LIMIT 1`;
      if (rows && rows.length > 0) {
        if (rows[0].mp_access_token && rows[0].mp_access_token.trim()) accessToken = rows[0].mp_access_token.trim();
        if (rows[0].mp_public_key && rows[0].mp_public_key.trim()) publicKey = rows[0].mp_public_key.trim();
        if (typeof rows[0].mp_sandbox === "boolean") sandbox = rows[0].mp_sandbox;
        if (typeof rows[0].mp_auto_confirm === "boolean") autoConfirm = rows[0].mp_auto_confirm;
      }
    } catch (err) {
      console.error("Error reading Mercado Pago settings:", err);
    }
  }

  // If token is a production token (starts with APP_USR-), force sandbox = false
  if (accessToken.startsWith("APP_USR-")) {
    sandbox = false;
  }

  return { accessToken, publicKey, sandbox, autoConfirm };
}

/**
 * Generates a unique idempotency key for Mercado Pago requests
 */
export function getUniqueKey(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}
