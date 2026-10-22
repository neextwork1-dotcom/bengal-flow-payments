import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type AuthedContext = {
  supabase: {
    rpc: (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }>;
    from: (table: string) => any;
  };
  userId: string;
};

async function assertAdmin(context: AuthedContext) {
  const { data, error } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (error || !data) {
    throw new Error("Forbidden");
  }
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
    await assertAdmin(context as AuthedContext);
    const supabase = (context as AuthedContext).supabase;
    const { data: payments } = await supabase
      .from("payments")
      .select("id, amount, status, order_id, created_at, merchant_id, merchants(name)")
      .order("created_at", { ascending: false })
      .limit(500);
    const rows = payments ?? [];
    const completed = rows.filter((r: any) => r.status === "complete");
    const pending = rows.filter((r: any) => r.status === "pending");
    const total = completed.reduce(
      (sum: number, r: any) => sum + Number(r.amount ?? 0),
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
    await assertAdmin(context as AuthedContext);
    const supabase = (context as AuthedContext).supabase;
    let query = supabase
      .from("payments")
      .select("*, merchants(name, nagad_number)")
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
    await assertAdmin(context as AuthedContext);
    const supabase = (context as AuthedContext).supabase;
    const patch: Record<string, unknown> = {
      status: data.status,
      updated_at: new Date().toISOString(),
    };
    if (data.status === "complete") {
      patch.verified_at = new Date().toISOString();
      if (data.trxId) patch.trx_id = data.trxId.trim().toUpperCase();
    }
    if (data.status === "pending") {
      patch.trx_id = null;
      patch.verified_at = null;
    }
    const { error } = await supabase.from("payments").update(patch).eq("id", data.id);
    if (error) throw new Error(String(error));
    return { ok: true };
  });

// ---------- Merchants ----------

export const listMerchants = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context as AuthedContext);
    const { data, error } = await (context as AuthedContext).supabase
      .from("merchants")
      .select("*")
      .order("created_at", { ascending: true });
    if (error) throw new Error(String(error));
    return data;
  });

export const saveMerchant = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: { id?: string; name: string; nagadNumber: string; isActive?: boolean }) => input,
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context as AuthedContext);
    const supabase = (context as AuthedContext).supabase;
    const row = {
      name: data.name.trim(),
      nagad_number: data.nagadNumber.trim(),
      is_active: data.isActive ?? true,
    };
    if (data.id) {
      const { error } = await supabase.from("merchants").update(row).eq("id", data.id);
      if (error) throw new Error(String(error));
      return { ok: true };
    }
    const { data: created, error } = await supabase
      .from("merchants")
      .insert(row)
      .select("id")
      .single();
    if (error) throw new Error(String(error));
    return { ok: true, id: created.id };
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
    await assertAdmin(context as AuthedContext);
    const supabase = (context as AuthedContext).supabase;
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
    return { id: created.id };
  });

// ---------- API keys ----------

export const listApiKeys = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context as AuthedContext);
    const { data, error } = await (context as AuthedContext).supabase
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
    await assertAdmin(context as AuthedContext);
    const plaintext = "npk_" + randomHex(24);
    const keyHash = await sha256Hex(plaintext);
    const { data: created, error } = await (context as AuthedContext)
      .supabase
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
    await assertAdmin(context as AuthedContext);
    const { error } = await (context as AuthedContext)
      .supabase
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
    await assertAdmin(context as AuthedContext);
    const { error } = await (context as AuthedContext)
      .supabase
      .from("api_keys")
      .delete()
      .eq("id", data.id);
    if (error) throw new Error(String(error));
    return { ok: true };
  });
