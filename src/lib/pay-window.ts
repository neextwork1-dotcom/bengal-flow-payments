// Client helpers shared by the payment-window pages (checkout + provider).
import type { PayAccountType, Provider } from "@/lib/providers";

export type { Provider, PayAccountType };

export const SUCCESS_GREEN = "#16A34A";

export type PayAccount = {
  provider: Provider;
  accountNumber: string;
  accountType: PayAccountType;
};

export type PayWindowData = {
  id: string;
  amount: number;
  status: string;
  orderId: string | null;
  redirectUrl: string | null;
  merchant: { name: string; logoUrl: string | null };
  accounts: PayAccount[];
};

export type FetchResult =
  | { ok: true; data: PayWindowData }
  | { ok: false; error: string };

export async function fetchPayWindow(id: string): Promise<FetchResult> {
  try {
    const res = await fetch(`/api/public/pay/${id}`);
    const json = (await res.json().catch(() => null)) as
      | (PayWindowData & { error?: string })
      | { error?: string }
      | null;
    if (!res.ok || !json || "error" in (json as object)) {
      return { ok: false, error: (json as { error?: string })?.error ?? "Payment not found" };
    }
    return { ok: true, data: json as PayWindowData };
  } catch {
    return { ok: false, error: "Could not load this payment" };
  }
}

export type VerifyResult = {
  status: "complete" | "pending" | "invalid";
  redirectUrl?: string | null;
  message?: string | undefined;
};

export async function verifyTrx(paymentId: string, trxId: string): Promise<VerifyResult> {
  try {
    const res = await fetch("/api/public/payments/verify", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ paymentId, trxId }),
    });
    const json = (await res.json().catch(() => ({}))) as {
      status?: string;
      redirectUrl?: string | null;
      message?: string;
      error?: string;
    };
    if (!res.ok) {
      return { status: "invalid", message: json.error ?? "Verification failed" };
    }
    return {
      status: (json.status as VerifyResult["status"]) ?? "invalid",
      redirectUrl: json.redirectUrl ?? null,
      message: json.message,
    };
  } catch {
    return { status: "invalid", message: "Network error — please try again." };
  }
}
