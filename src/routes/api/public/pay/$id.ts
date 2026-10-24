import { createFileRoute } from "@tanstack/react-router";

/**
 * Public payment-window data: amount, merchant name/logo and the active
 * collection accounts (provider, number, personal/merchant) only — no customer
 * PII, no status history. When the payment was created for one provider, only
 * that snapshotted account is returned.
 */
type AccountRow = {
  provider: string;
  account_number: string;
  account_type: string;
  is_active: boolean;
};

export const Route = createFileRoute("/api/public/pay/$id")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: payment } = await supabaseAdmin
          .from("payments")
          .select(
            "id, amount, status, order_id, redirect_url, provider, account_number, account_type, merchants(name, logo_url, merchant_accounts(provider, account_number, account_type, is_active))",
          )
          .eq("id", params.id)
          .maybeSingle();
        if (!payment) {
          return Response.json({ error: "Payment not found" }, { status: 404 });
        }
        const merchantRaw = payment["merchants"] as unknown;
        const merchant = (Array.isArray(merchantRaw) ? merchantRaw[0] : merchantRaw) as
          | { name?: string; logo_url?: string | null; merchant_accounts?: AccountRow[] }
          | null
          | undefined;

        let accounts = (merchant?.merchant_accounts ?? [])
          .filter((a) => a.is_active)
          .map((a) => ({
            provider: a.provider,
            accountNumber: a.account_number,
            accountType: a.account_type,
          }));

        if (payment["provider"] && payment["account_number"]) {
          accounts = [
            {
              provider: payment["provider"],
              accountNumber: payment["account_number"],
              accountType: payment["account_type"] ?? "personal",
            },
          ];
        }

        return Response.json({
          id: payment["id"],
          amount: Number(payment["amount"]),
          status: payment["status"],
          orderId: payment["order_id"],
          redirectUrl: payment["redirect_url"],
          merchant: {
            name: merchant?.name ?? "Merchant",
            logoUrl: merchant?.logo_url ?? null,
          },
          accounts,
        });
      },
    },
  },
});
