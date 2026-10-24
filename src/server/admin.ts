import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type Ctx = {
  supabase: any;
  userId: string;
};

async function requireAdmin(context: unknown): Promise<Ctx> {
  const ctx = context as Ctx;
  const { data, error } = await ctx.supabase.rpc("has_role", {
    _user_id: ctx.userId,
    _role: "admin",
  });
  if (error || !data) {
    throw new Error("Forbidden");
  }
  return ctx;
}

function randomHex(bytes: number) {
  const buf = new Uint8Array(bytes);
  crypto.getRandomValues(buf);
  return Array.from(buf)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function sha256Hex(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// ---------- Dashboard ----------

export const getDashboard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = await requireAdmin(context);
    const { data: payments } = await supabase
      .from("payments")
      .select("id, amount, status, order_id, created_at, merchant_id, merchants(name, provider)")
      .order("created_at", { ascending: false })
      .limit(500);
    const rows = payments ?? [];
    const completed = rows.filter((r: any) => r["status"] === "complete");
    const pending = rows.filter((r: any) => r["status"] === "pending");
    const total = completed.reduce(
      (sum: number, r: any) => sum + Number(r["amount"] ?? 0),
      0,
    );
    return {
      totalPayments: rows.length,
      completedCount: completed.length,
      pendingCount: pending.length,
      completedTotal: total,
      recent: rows.slice(0, 10),
    };
  });

// ---------- Transactions ----------

export const listTransactions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { status?: string; search?: string } | undefined) => input ?? {})
  .handler(async ({ data, context }) => {
    const { supabase } = await requireAdmin(context);
    let query = supabase
      .from("payments")
      .select("*, merchants(name, provider, account_number)")
      .order("created_at", { ascending: false })
      .limit(300);
    if (data.status && data.status !== "all") {
      query = query.eq("status", data.status);
    }
    if (data.search && data.search.trim()) {
      const q = data.search.trim();
      query = query.or(`order_id.ilike.%${q}%,trx_id.ilike.%${q}%,customer_phone.ilike.%${q}%`);
    }
    const { data: rows, error } = await query;
    if (error) throw new Error(String(error));
    return rows;
  });

export const updatePaymentStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: { id: string; status: "pending" | "complete" | "failed"; trxId?: string }) => input,
  )
  .handler(async ({ data, context }) => {
    const { supabase } = await requireAdmin(context);
    const patch: Record<string, unknown> = {
      status: data.status,
      updated_at: new Date().toISOString(),
    };
    if (data.status === "complete") {
      patch["verified_at"] = new Date().toISOString();
      if (data.trxId) patch["trx_id"] = data.trxId.trim().toUpperCase();
    }
    if (data.status === "pending") {
      patch["trx_id"] = null;
      patch["verified_at"] = null;
    }
    const { error } = await supabase.from("payments").update(patch).eq("id", data.id);
    if (error) throw new Error(String(error));

    // Completing a payment fires the merchant callback, same as auto-verify.
    if (data.status === "complete") {
      const { data: payment } = await supabase
        .from("payments")
        .select(
          "id, amount, order_id, callback_url, trx_id, verified_at, merchants(name, provider, account_number, callback_secret)",
        )
        .eq("id", data.id)
        .maybeSingle();
      if (payment?.["callback_url"]) {
        const { sendPaymentCallback } = await import("@/server/gateway.server");
        const callbackStatus = await sendPaymentCallback({
          id: payment["id"],
          order_id: payment["order_id"],
          amount: payment["amount"],
          callback_url: payment["callback_url"],
          trx_id: payment["trx_id"],
          verified_at: payment["verified_at"],
          merchants: payment["merchants"],
        });
        await supabase
          .from("payments")
          .update({
            callback_status: callbackStatus,
            callback_sent_at: new Date().toISOString(),
          })
          .eq("id", data.id);
      }
    }
    return { ok: true };
  });

// ---------- Merchants ----------

export const listMerchants = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = await requireAdmin(context);
    const { data, error } = await supabase
      .from("merchants")
      .select("*")
      .order("created_at", { ascending: true });
    if (error) throw new Error(String(error));
    return data;
  });

const PROVIDER_VALUES = ["nagad", "bkash", "upay", "rocket"] as const;

export const saveMerchant = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      id?: string;
      name: string;
      provider: string;
      accountNumber: string;
      isActive?: boolean;
    }) => input,
  )
  .handler(async ({ data, context }) => {
    const { supabase } = await requireAdmin(context);
    if (!(PROVIDER_VALUES as readonly string[]).includes(data.provider)) {
      throw new Error("Unknown provider");
    }
    const account = data.accountNumber.trim();
    if (!account) throw new Error("Account number is required");
    const row: Record<string, unknown> = {
      name: data.name.trim(),
      provider: data.provider,
      account_number: account,
      nagad_number: account, // legacy column, kept in sync
      is_active: data.isActive ?? true,
    };
    if (data.id) {
      const { error } = await supabase.from("merchants").update(row).eq("id", data.id);
      if (error) throw new Error(String(error));
      return { ok: true };
    }
    row["callback_secret"] = randomHex(24);
    const { data: created, error } = await supabase
      .from("merchants")
      .insert(row)
      .select("id")
      .single();
    if (error) throw new Error(String(error));
    return { ok: true, id: created["id"] as string };
  });

// ---------- Payment links (manual payment creation) ----------

export const createPaymentLink = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      merchantId: string;
      amount: number;
      orderId?: string;
      customerName?: string;
      customerPhone?: string;
      redirectUrl?: string;
      callbackUrl?: string;
    }) => input,
  )
  .handler(async ({ data, context }) => {
    const { supabase } = await requireAdmin(context);
    if (!(data.amount > 0) || data.amount > 10_000_000) {
      throw new Error("Amount must be greater than 0");
    }
    const { data: created, error } = await supabase
      .from("payments")
      .insert({
        merchant_id: data.merchantId,
        amount: data.amount,
        order_id: data.orderId?.trim() || null,
        customer_name: data.customerName?.trim() || null,
        customer_phone: data.customerPhone?.trim() || null,
        redirect_url: data.redirectUrl?.trim() || null,
        callback_url: data.callbackUrl?.trim() || null,
      })
      .select("id")
      .single();
    if (error) throw new Error(String(error));
    return { id: created["id"] as string };
  });

// ---------- API keys ----------

export const listApiKeys = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = await requireAdmin(context);
    const { data, error } = await supabase
      .from("api_keys")
      .select("id, label, key_prefix, is_active, last_used_at, created_at")
      .order("created_at", { ascending: false });
    if (error) throw new Error(String(error));
    return data;
  });

export const createApiKey = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { label: string }) => input)
  .handler(async ({ data, context }) => {
    const { supabase } = await requireAdmin(context);
    const plaintext = "npk_" + randomHex(24);
    const keyHash = await sha256Hex(plaintext);
    const { data: created, error } = await supabase
      .from("api_keys")
      .insert({
        label: data.label.trim() || "Untitled key",
        key_hash: keyHash,
        key_prefix: plaintext.slice(0, 12),
      })
      .select("id, key_prefix, created_at")
      .single();
    if (error) throw new Error(String(error));
    // Plaintext is returned exactly once — only here, never from listApiKeys.
    return { ...created, key: plaintext };
  });

export const toggleApiKey = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string; isActive: boolean }) => input)
  .handler(async ({ data, context }) => {
    const { supabase } = await requireAdmin(context);
    const { error } = await supabase
      .from("api_keys")
      .update({ is_active: data.isActive })
      .eq("id", data.id);
    if (error) throw new Error(String(error));
    return { ok: true };
  });

export const deleteApiKey = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ data, context }) => {
    const { supabase } = await requireAdmin(context);
    const { error } = await supabase.from("api_keys").delete().eq("id", data.id);
    if (error) throw new Error(String(error));
    return { ok: true };
  });

// ---------- Gateway (collected SMS + devices) ----------

export const listGateway = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = await requireAdmin(context);
    const [devices, messages] = await Promise.all([
      supabase
        .from("gateway_devices")
        .select("*")
        .order("last_seen_at", { ascending: false, nullsFirst: false })
        .limit(50),
      supabase
        .from("sms_transactions")
        .select(
          "id, sender, body, provider, account_type, trx_id, amount, account_number, device_id, matched_payment_id, received_at",
        )
        .order("created_at", { ascending: false })
        .limit(100),
    ]);
    if (devices.error) throw new Error(String(devices.error));
    if (messages.error) throw new Error(String(messages.error));
    return { devices: devices.data ?? [], messages: messages.data ?? [] };
  });
