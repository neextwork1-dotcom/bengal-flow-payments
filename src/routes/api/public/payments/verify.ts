import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { isValidTrxIdInput } from "@/lib/match-transaction";
import { normalizeAccountNumber, normalizeTrxId } from "@/lib/match-transaction";
import { sendPaymentCallback } from "@/lib/serverfns/gateway";

/**
 * Customer-facing TRX verification from the payment window.
 * Body: { paymentId, trxId }.
 * Strict check: the TRX ID must exist in collected SMS with the same amount
 * and the payment's merchant provider/account — then the payment completes
 * and the merchant's callback URL is called.
 */
const verifySchema = z.object({
  paymentId: z.string().uuid(),
  trxId: z.string().min(4).max(40),
});

export const Route = createFileRoute("/api/public/payments/verify")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let json: unknown;
        try {
          json = await request.json();
        } catch {
          return Response.json({ error: "Invalid JSON body" }, { status: 400 });
        }
        const parsedInput = verifySchema.safeParse(json);
        if (!parsedInput.success) {
          return Response.json({ error: "Invalid payload" }, { status: 400 });
        }
        const trx = normalizeTrxId(parsedInput.data.trxId);
        if (!isValidTrxIdInput(trx)) {
          return Response.json({ error: "Invalid transaction ID format" }, { status: 400 });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const { data: payment } = await supabaseAdmin
          .from("payments")
          .select(
            "id, amount, status, order_id, trx_id, callback_url, redirect_url, verified_at, merchants(name, provider, account_number, callback_secret)",
          )
          .eq("id", parsedInput.data.paymentId)
          .maybeSingle();
        if (!payment) {
          return Response.json({ error: "Payment not found" }, { status: 404 });
        }

        if (payment["status"] === "complete") {
          return Response.json({ status: "complete", redirectUrl: payment["redirect_url"] });
        }

        const { data: sms } = await supabaseAdmin
          .from("sms_transactions")
          .select("id, amount, account_number, provider, matched_payment_id")
          .eq("trx_id", trx)
          .is("matched_payment_id", null)
          .order("created_at", { ascending: true })
          .limit(1)
          .maybeSingle();

        if (!sms) {
          return Response.json({
            status: "pending",
            message:
              "We haven't received the payment SMS for this TRX ID yet. Wait a few seconds and try again.",
          });
        }

        const merchant = Array.isArray(payment["merchants"])
          ? payment["merchants"][0]
          : payment["merchants"];
        const payAmount = Number(payment["amount"]);
        if (sms["amount"] == null || Math.abs(Number(sms["amount"]) - payAmount) > 0.005) {
          return Response.json({
            status: "invalid",
            reason: "amount_mismatch",
            message: "The collected amount for this TRX ID does not match this payment.",
          });
        }
        if (
          merchant?.["provider"] &&
          sms["provider"] &&
          merchant["provider"] !== sms["provider"]
        ) {
          return Response.json({
            status: "invalid",
            reason: "provider_mismatch",
            message: `This TRX ID was collected on a different wallet (${sms["provider"]}).`,
          });
        }
        if (
          merchant?.["account_number"] &&
          sms["account_number"] &&
          normalizeAccountNumber(String(merchant["account_number"])) !==
            normalizeAccountNumber(String(sms["account_number"]))
        ) {
          return Response.json({
            status: "invalid",
            reason: "account_mismatch",
            message: "This TRX ID was not paid to this merchant account.",
          });
        }

        const verifiedAt = new Date().toISOString();
        const { error } = await supabaseAdmin
          .from("payments")
          .update({
            status: "complete",
            trx_id: trx,
            verified_at: verifiedAt,
            updated_at: verifiedAt,
          })
          .eq("id", payment["id"] as string)
          .eq("status", "pending");
        if (error) {
          return Response.json({ error: String(error) }, { status: 500 });
        }
        await supabaseAdmin
          .from("sms_transactions")
          .update({ matched_payment_id: payment["id"] })
          .eq("id", sms["id"] as string);

        const callbackStatus = await sendPaymentCallback({
          id: payment["id"] as string,
          order_id: payment["order_id"] as string | null,
          amount: payment["amount"],
          callback_url: payment["callback_url"] as string | null,
          trx_id: trx,
          verified_at: verifiedAt,
          merchants: payment["merchants"],
        });
        await supabaseAdmin
          .from("payments")
          .update({ callback_status: callbackStatus, callback_sent_at: new Date().toISOString() })
          .eq("id", payment["id"] as string);

        return Response.json({ status: "complete", redirectUrl: payment["redirect_url"] });
      },
    },
  },
});
