import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { PROVIDER_META, type Provider } from "@/lib/sms";

export const Route = createFileRoute("/pay/$id")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Payment window — NagadPay" },
      {
        description:
          "Copy the merchant number, pay with your mobile wallet app, then enter your transaction ID to verify instantly.",
      },
      { property: "og:title", content: "Payment window — NagadPay" },
      {
        property: "og:description",
        content: "Complete your payment and verify your transaction ID instantly.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PayWindow,
});

type PayInfo = {
  id: string;
  amount: number;
  status: string;
  orderId: string | null;
  merchant: { name: string; provider: Provider; accountNumber: string };
  redirectUrl: string | null;
};

type VerifyResult = {
  status: "complete" | "pending" | "invalid";
  redirectUrl?: string | null;
  message?: string;
};

function PayWindow() {
  const { id } = Route.useParams();
  const [info, setInfo] = useState<PayInfo | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [phase, setPhase] = useState<"loading" | "ready" | "verifying" | "complete">("loading");
  const [notice, setNotice] = useState<string | null>(null);
  const [trx, setTrx] = useState("");
  const [copied, setCopied] = useState(false);
  const retries = useRef(0);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch(`/api/public/pay/${id}`);
        const data = await res.json();
        if (!alive) return;
        if (!res.ok) {
          setLoadError(data?.error ?? "Payment not found");
          setPhase("ready");
          return;
        }
        setInfo(data as PayInfo);
        setPhase(data["status"] === "complete" ? "complete" : "ready");
      } catch {
        if (alive) setLoadError("Could not load this payment");
      }
    })();
    return () => {
      alive = false;
    };
  }, [id]);

  // Redirect to the merchant site shortly after success.
  useEffect(() => {
    if (phase !== "complete" || !info?.redirectUrl) return;
    const timer = setTimeout(() => {
      window.location.href = info.redirectUrl!;
    }, 2500);
    return () => clearTimeout(timer);
  }, [phase, info]);

  async function verify() {
    if (!info) return;
    setPhase("verifying");
    setNotice(null);
    try {
      const res = await fetch("/api/public/payments/verify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ paymentId: info.id, trxId: trx }),
      });
      const data = (await res.json()) as VerifyResult;
      if (data.status === "complete") {
        setPhase("complete");
        return;
      }
      retries.current += 1;
      if (data.status === "pending" && retries.current < 15) {
        setNotice(data.message ?? "Payment SMS not received yet — retrying…");
        setTimeout(() => void verify(), 4000);
        return;
      }
      setNotice(data.message ?? "Verification failed. Check the TRX ID and try again.");
      setPhase("ready");
    } catch {
      setNotice("Network error — please try again.");
      setPhase("ready");
    }
  }

  function copyNumber() {
    if (!info) return;
    void navigator.clipboard?.writeText(info.merchant.accountNumber);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (loadError) {
    return (
      <Center>
        <Card>
          <p className="text-center text-sm text-destructive">{loadError}</p>
        </Card>
      </Center>
    );
  }

  const meta = info ? PROVIDER_META[info.merchant.provider] ?? PROVIDER_META["nagad"] : null;

  return (
    <Center>
      <Card>
        {phase === "loading" || !info || !meta ? (
          <p className="py-10 text-center text-sm text-muted-foreground">Loading payment…</p>
        ) : phase === "complete" ? (
          <div className="py-8 text-center">
            <div
              className="mx-auto flex h-14 w-14 items-center justify-center rounded-full text-2xl font-bold"
              style={{ backgroundColor: meta.softColor, color: meta.color }}
            >
              ✓
            </div>
            <h2 className="mt-4 text-xl font-bold text-foreground">Payment verified</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              ৳{info.amount.toLocaleString("en-BD", { minimumFractionDigits: 2 })} received.
            </p>
            {info.redirectUrl ? (
              <p className="mt-3 text-xs text-muted-foreground">Redirecting you back…</p>
            ) : null}
          </div>
        ) : (
          <>
            <div
              className="-mx-6 -mt-6 mb-5 rounded-t-3xl px-6 py-4"
              style={{ backgroundColor: meta.color }}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-white">{meta.label} payment</span>
                {info.orderId ? (
                  <span className="text-xs text-white/80">Order {info.orderId}</span>
                ) : null}
              </div>
              <p className="mt-1 text-3xl font-bold tabular-nums text-white">
                ৳{info.amount.toLocaleString("en-BD", { minimumFractionDigits: 2 })}
              </p>
              <p className="mt-0.5 text-xs text-white/80">to {info.merchant.name}</p>
            </div>

            <ol className="mb-5 space-y-1 text-xs text-muted-foreground">
              <li>1. Copy the {meta.label} number below.</li>
              <li>2. Open your {meta.label} app and send the exact amount.</li>
              <li>3. Enter the transaction (TRX) ID here to verify.</li>
            </ol>

            <div className="mb-5 rounded-2xl border border-border bg-muted/40 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {meta.label} number
              </p>
              <div className="mt-1 flex items-center justify-between gap-2">
                <span className="text-lg font-bold tabular-nums text-foreground">
                  {info.merchant.accountNumber}
                </span>
                <button
                  type="button"
                  onClick={copyNumber}
                  className="rounded-lg px-3 py-1.5 text-xs font-semibold text-white"
                  style={{ backgroundColor: meta.color }}
                >
                  {copied ? "Copied ✓" : "Copy"}
                </button>
              </div>
            </div>

            <label htmlFor="trx" className="mb-1 block text-sm font-medium text-foreground">
              Transaction ID (TRX ID)
            </label>
            <input
              id="trx"
              value={trx}
              onChange={(e) => setTrx(e.target.value.toUpperCase())}
              placeholder="e.g. 9F7Z2K1ABC"
              autoComplete="off"
              className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm font-medium tracking-wide text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/30"
            />

            {notice ? (
              <p className="mt-3 rounded-xl bg-accent px-3 py-2 text-xs text-accent-foreground">
                {notice}
              </p>
            ) : null}

            <button
              type="button"
              onClick={() => void verify()}
              disabled={phase === "verifying" || trx.trim().length < 4}
              className="mt-4 w-full rounded-xl px-4 py-3 text-sm font-semibold text-white shadow-card transition-opacity disabled:opacity-50"
              style={{ backgroundColor: meta.color }}
            >
              {phase === "verifying" ? "Verifying…" : "Verify payment"}
            </button>
          </>
        )}
      </Card>
    </Center>
  );
}

function Center({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-nagad-soft px-4 py-10">
      {children}
    </div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-full max-w-sm rounded-3xl bg-card p-6 shadow-card-lg">{children}</div>
  );
}
