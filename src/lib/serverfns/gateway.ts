// Server-only helpers for the SMS gateway: API-key auth and signed callbacks.
// Plain module — safe to import from server functions and server routes.
import { createHash, createHmac } from "crypto";
import { normalizeAccountNumber } from "@/lib/match-transaction";

export type MerchantInfo = {
  name: string;
  provider: string | null;
  account_number: string | null;
  callback_secret: string | null;
};

export function sha256Hex(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

/** Accepts either a nested object or a PostgREST single-object embed. */
export function unwrapMerchant(row: unknown): MerchantInfo | null {
  const m = (row as { merchants?: unknown })?.merchants;
  const merchant = Array.isArray(m) ? m[0] : m;
  return (merchant as MerchantInfo) ?? null;
}

/** Validates a Bearer npk_… API key; returns the key id or null. */
export async function authenticateApiKey(request: Request): Promise<string | null> {
  const header = request.headers.get("authorization") ?? "";
  const key = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (!key.startsWith("npk_") || key.length > 128) return null;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("api_keys")
    .select("id, is_active")
    .eq("key_hash", sha256Hex(key))
    .maybeSingle();
  if (!data || !data["is_active"]) return null;
  void supabaseAdmin
    .from("api_keys")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", data["id"] as string);
  return data["id"] as string;
}

export type CallbackPayment = {
  id: string;
  order_id: string | null;
  amount: number | string;
  callback_url: string | null;
  trx_id?: string | null;
  verified_at?: string | null;
  provider?: string | null;
  merchants?: MerchantInfo | MerchantInfo[] | null;
};

/**
 * POSTs the completion payload to the merchant's callback URL, signed with the
 * merchant's callback secret (HMAC-SHA256 over the raw body,
 * `x-nagadpay-signature: sha256=<hex>`). Returns a status string for logging.
 */
export async function sendPaymentCallback(payment: CallbackPayment): Promise<string> {
  if (!payment.callback_url) return "no_url";
  const merchant = Array.isArray(payment.merchants)
    ? payment.merchants[0] ?? null
    : payment.merchants ?? null;
  const payload = {
    event: "payment.completed",
    paymentId: payment.id,
    orderId: payment.order_id,
    amount: Number(payment.amount),
    trxId: payment.trx_id ?? null,
    provider: payment.provider ?? merchant?.provider ?? "nagad",
    status: "complete",
    verifiedAt: payment.verified_at ?? new Date().toISOString(),
  };
  const raw = JSON.stringify(payload);
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (merchant?.callback_secret) {
    headers["x-neextpay-signature"] =
      "sha256=" +
      createHmac("sha256", merchant.callback_secret).update(raw).digest("hex");
  }
  try {
    const res = await fetch(payment.callback_url, {
      redirect: "error",
      method: "POST",
      headers,
      body: raw,
      signal: AbortSignal.timeout(8000),
    });
    return res.ok ? "sent" : `http_${res.status}`;
  } catch {
    return "error";
  }
}

export { normalizeAccountNumber };
