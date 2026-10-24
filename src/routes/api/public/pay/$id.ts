import { createFileRoute } from "@tanstack/react-router";

/**
 * Public payment-window data: amount, merchant name, provider and account
 * number only — no customer PII, no status history.
 */
export const Route = createFileRoute("/api/public/pay/$id")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: payment } = await supabaseAdmin
          .from("payments")
          .select(
            "id, amount, status, order_id, redirect_url, merchants(name, provider, account_number)",
          )
          .eq("id", params.id)
          .maybeSingle();
        if (!payment) {
          return Response.json({ error: "Payment not found" }, { status: 404 });
        }
        const merchant = Array.isArray(payment["merchants"])
          ? payment["merchants"][0]
          : payment["merchants"];
        return Response.json({
          id: payment["id"],
          amount: Number(payment["amount"]),
          status: payment["status"],
          orderId: payment["order_id"],
          merchant: {
            name: merchant?.["name"] ?? "Merchant",
            provider: merchant?.["provider"] ?? "nagad",
            accountNumber: merchant?.["account_number"] ?? "",
          },
          redirectUrl: payment["redirect_url"],
        });
      },
    },
  },
});
