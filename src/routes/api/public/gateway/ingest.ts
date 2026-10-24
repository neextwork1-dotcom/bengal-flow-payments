import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { parseSms, normalizePhone } from "@/lib/sms";
import { authenticateApiKey, sendPaymentCallback } from "@/lib/serverfns/gateway";

/**
 * SMS gateway ingest — called by the Android SMS-reader app.
 * Auth: Authorization: Bearer npk_<api key>.
 * Body: { deviceId, platform?, phoneNumber?, messages: [{ sender, body, receivedAt? }] }
 * Parses every message with the best-format reader, stores it, and auto-matches
 * credit SMS to pending payments (provider + amount + unused TRX).
 */
const messageSchema = z.object({
  sender: z.string().min(1).max(64),
  body: z.string().min(1).max(4000),
  receivedAt: z.string().datetime().optional(),
});

const ingestSchema = z.object({
  deviceId: z.string().min(1).max(64),
  platform: z.enum(["android", "ios", "other"]).default("android"),
  phoneNumber: z.string().max(20).optional(),
  messages: z.array(messageSchema).min(1).max(200),
});

export const Route = createFileRoute("/api/public/gateway/ingest")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apiKeyId = await authenticateApiKey(request);
        if (!apiKeyId) {
          return Response.json({ error: "Invalid or inactive API key" }, { status: 401 });
        }

        let json: unknown;
        try {
          json = await request.json();
        } catch {
          return Response.json({ error: "Invalid JSON body" }, { status: 400 });
        }
        const parsedInput = ingestSchema.safeParse(json);
        if (!parsedInput.success) {
          return Response.json(
            { error: "Invalid payload", issues: parsedInput.error.flatten() },
            { status: 400 },
          );
        }
        const input = parsedInput.data;

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const now = new Date().toISOString();

        await supabaseAdmin.from("gateway_devices").upsert(
          {
            api_key_id: apiKeyId,
            device_id: input.deviceId,
            platform: input.platform,
            phone_number: input.phoneNumber ? normalizePhone(input.phoneNumber) : null,
            last_seen_at: now,
            last_ip: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
          },
          { onConflict: "device_id" },
        );

        const parsedRows = input.messages.flatMap((message) => {
          const parsed = parseSms(message.sender, message.body);
          if (!parsed || !parsed.trxId) return [];
          const accountNumber = parsed.accountNumber ?? (input.phoneNumber ? normalizePhone(input.phoneNumber) : null);
          return [{ parsed: { ...parsed, accountNumber }, row: {
            sender: message.sender, body: message.body, provider: parsed.provider,
            account_type: parsed.accountType, is_credit: parsed.isCredit,
            trx_id: parsed.trxId, amount: parsed.amount, account_number: accountNumber,
            device_id: input.deviceId, received_at: message.receivedAt ?? now,
          } }];
        });
        // Skip messages whose TRX ID was already collected (app retries / duplicates).
        const trxIds = [...new Set(parsedRows.map((r) => r.row.trx_id).filter(Boolean))] as string[];
        const seen = new Set<string>();
        if (trxIds.length > 0) {
          const { data: existing } = await supabaseAdmin
            .from("sms_transactions")
            .select("trx_id, provider")
            .in("trx_id", trxIds);
          for (const e of existing ?? []) {
            seen.add(`${e["provider"]}:${e["trx_id"]}`);
          }
        }
        const fresh = parsedRows.filter(
          (r) => { const key = `${r.row.provider}:${r.row.trx_id}`; if (seen.has(key)) return false; seen.add(key); return true; },
        );

        let insertedIds: string[] = [];
        if (fresh.length > 0) {
          const { data: inserted, error } = await supabaseAdmin
            .from("sms_transactions")
            .insert(fresh.map((r) => r.row))
            .select("id");
          if (error) {
            return Response.json({ error: String(error) }, { status: 500 });
          }
          insertedIds = (inserted ?? []).map((r) => r["id"] as string);
        }

        // Auto-match credit SMS to pending payments.
        let matched = 0;
        for (let i = 0; i < fresh.length; i++) {
          const entry = fresh[i];
          if (!entry) continue;
          const { parsed } = entry;
          if (!parsed.isCredit || !parsed.trxId || parsed.amount == null) continue;
          const { data: pending } = await supabaseAdmin
            .from("payments")
            .select(
              "id, amount, order_id, status, callback_url, trx_id, verified_at, provider, account_number, account_type, merchants(name, provider, account_number, callback_secret)",
            )
            .eq("status", "pending")
            .eq("amount", parsed.amount)
            .order("created_at", { ascending: true })
            .limit(50);

          let payment: (typeof pending extends (infer T)[] | null ? T : never) | undefined;
          for (const candidate of pending ?? []) {
            const smsId = insertedIds[i];
            if (!smsId) continue;
            const { data: claimed } = await supabaseAdmin.rpc("claim_payment_sms", { p_payment: candidate["id"], p_sms: smsId });
            if (claimed) { payment = candidate; break; }
          }
          if (!payment) continue;
          matched++;
          const verifiedAt = new Date().toISOString();
          const callbackStatus = await sendPaymentCallback({
            id: payment["id"] as string,
            order_id: payment["order_id"] as string | null,
            amount: payment["amount"],
            callback_url: payment["callback_url"] as string | null,
            trx_id: parsed.trxId,
            verified_at: verifiedAt,
            merchants: payment["merchants"],
            provider: parsed.provider,
          });
          await supabaseAdmin
            .from("payments")
            .update({ callback_status: callbackStatus, callback_sent_at: new Date().toISOString() })
            .eq("id", payment["id"] as string);
        }

        return Response.json({
          received: input.messages.length,
          parsed: parsedRows.length,
          stored: insertedIds.length,
          matched,
        });
      },
    },
  },
});
