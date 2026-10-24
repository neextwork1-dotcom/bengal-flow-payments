import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { PaySuccess } from "@/components/pay-success";
import {
  PROVIDER_BRAND,
  ProviderLogo,
  buildPaySteps,
  formatBdt,
  isProviderId,
} from "@/lib/providers";
import {
  fetchPayWindow,
  verifyTrx,
  type PayWindowData,
  type VerifyResult,
} from "@/lib/pay-window";

export const Route = createFileRoute("/pay/$id/$provider")({
  ssr: false,
  head: ({ params }: { params: { provider: string } }) => ({
    meta: [
      {
        title: `${PROVIDER_BRAND[isProviderId(params.provider) ? params.provider : "nagad"].label} payment — verify instantly`,
      },
      {
        description:
          "Copy the number, pay from your wallet app, then enter your transaction ID to verify instantly.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ProviderPayPage,
});

function CopyIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="9" y="9" width="11" height="11" rx="2" />
      <path d="M5 15V5a2 2 0 0 1 2-2h10" strokeLinecap="round" />
    </svg>
  );
}

function ProviderPayPage() {
  const { id, provider: providerParam } = Route.useParams();
  const valid = isProviderId(providerParam);
  const provider = valid ? providerParam : "nagad";
  const brand = PROVIDER_BRAND[provider];

  const [info, setInfo] = useState<PayWindowData | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [phase, setPhase] = useState<"loading" | "ready" | "verifying" | "complete">("loading");
  const [notice, setNotice] = useState<string | null>(null);
  const [trx, setTrx] = useState("");
  const [copied, setCopied] = useState(false);
  const retries = useRef(0);

  useEffect(() => {
    let alive = true;
    (async () => {
      const res = await fetchPayWindow(id);
      if (!alive) return;
      if (!res.ok) {
        setLoadError(res.error);
        setPhase("ready");
        return;
      }
      setInfo(res.data);
      setPhase("ready");
    })();
    return () => {
      alive = false;
    };
  }, [id]);

  async function verify() {
    if (!info) return;
    setPhase("verifying");
    setNotice(null);
    const data: VerifyResult = await verifyTrx(info.id, trx);
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
  }

  function copyNumber() {
    if (!account) return;
    void navigator.clipboard?.writeText(account.accountNumber);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (!valid) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F3F7FC] px-4">
        <div className="w-full max-w-sm rounded-3xl bg-white p-8 text-center shadow-xl">
          <p className="text-sm text-destructive">Unknown payment method.</p>
          <Link to="/pay/$id" params={{ id }} className="mt-3 inline-block text-sm font-medium text-primary">
            ← Back to checkout
          </Link>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F3F7FC] px-4">
        <div className="w-full max-w-sm rounded-3xl bg-white p-8 text-center shadow-xl">
          <p className="text-sm text-destructive">{loadError}</p>
        </div>
      </div>
    );
  }

  if (phase === "complete" && info) {
    return <PaySuccess amount={info.amount} redirectUrl={info.redirectUrl} />;
  }

  const account = info?.accounts.find((a) => a.provider === provider);

  return (
    <div className="flex min-h-screen flex-col bg-[#F3F7FC]">
      <div className="mx-auto w-full max-w-md px-4 pb-10 pt-5">
        {/* Provider header */}
        <div className="flex items-center justify-center rounded-2xl bg-white py-4 shadow-sm ring-1 ring-black/5">
          <ProviderLogo provider={provider} className="h-10" />
        </div>

        {!info || phase === "loading" ? (
          <p className="py-10 text-center text-sm text-muted-foreground">Loading payment…</p>
        ) : !account ? (
          <div className="mt-4 rounded-2xl bg-white p-6 text-center shadow-sm ring-1 ring-black/5">
            <p className="text-sm text-muted-foreground">
              {brand.label} এই পেমেন্টের জন্য সক্রিয় নয়।
            </p>
            <Link
              to="/pay/$id"
              params={{ id }}
              className="mt-3 inline-block text-sm font-medium text-primary"
            >
              ← অন্য মাধ্যম বেছে নিন
            </Link>
          </div>
        ) : (
          <>
            {/* Merchant card */}
            <div className="mt-4 flex items-center gap-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5">
              <div
                className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg"
                style={{ backgroundColor: brand.softColor }}
              >
                {info.merchant.logoUrl ? (
                  <img
                    src={info.merchant.logoUrl}
                    alt={info.merchant.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="text-lg font-bold" style={{ color: brand.color }}>
                    {info.merchant.name.trim().charAt(0).toUpperCase() || "M"}
                  </span>
                )}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-foreground">
                  {info.merchant.name}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  Reference: {info.orderId ?? "—"}
                </p>
              </div>
            </div>

            {/* Amount box */}
            <div className="mt-3 rounded-2xl bg-white px-4 py-3 shadow-sm ring-1 ring-black/5">
              <p className="text-xl font-bold tabular-nums text-foreground">
                ৳ {formatBdt(info.amount)}
              </p>
            </div>

            {/* Instructions panel */}
            <div
              className="mt-4 rounded-2xl p-4 text-white shadow-md"
              style={{ backgroundColor: brand.panelColor }}
            >
              <p className="mb-3 rounded-lg bg-white/95 px-3 py-2 text-center text-sm font-semibold text-neutral-700">
                নির্দেশনা অনুসরণ করুন
              </p>
              <ul className="space-y-2.5 text-xs leading-relaxed">
                {buildPaySteps(provider, account.accountType, account.accountNumber, info.amount).map(
                  (step, i) => (
                    <li key={i} className="flex gap-2">
                      <span className="mt-1 block h-1 w-1 shrink-0 rounded-full bg-white/80" />
                      <div>
                        <span>{step.text}</span>
                        {step.kind === "number" ? (
                          <span className="mt-1 flex items-center gap-2">
                            <b className="text-sm tracking-wide">{step.number}</b>
                            <button
                              type="button"
                              onClick={copyNumber}
                              className="flex items-center gap-1 rounded-md bg-white px-2 py-0.5 text-[11px] font-bold text-neutral-800"
                            >
                              <CopyIcon /> Copy
                            </button>
                            {copied ? (
                              <span className="text-[11px] font-bold text-white">Copied ✓</span>
                            ) : null}
                          </span>
                        ) : null}
                        {step.kind === "amount" ? (
                          <b className="text-sm" style={{ color: "#FFE24D" }}>
                            {" "}
                            {step.amount}
                          </b>
                        ) : null}
                      </div>
                    </li>
                  ),
                )}
              </ul>

              {/* TRX input inside the branded panel */}
              <input
                value={trx}
                onChange={(e) => setTrx(e.target.value.toUpperCase())}
                placeholder="Transaction ID লিখুন"
                autoComplete="off"
                className="mt-4 w-full rounded-xl border-0 bg-white px-3 py-2.5 text-sm font-medium tracking-wide text-neutral-900 outline-none placeholder:text-neutral-400"
              />
            </div>

            {notice ? (
              <p className="mt-3 rounded-xl bg-white px-3 py-2 text-center text-xs text-neutral-700 shadow-sm">
                {notice}
              </p>
            ) : null}

            <button
              type="button"
              onClick={() => void verify()}
              disabled={phase === "verifying" || trx.trim().length < 4}
              className="mt-4 w-full rounded-xl px-4 py-3 text-sm font-bold tracking-wide text-white shadow-md transition-opacity disabled:opacity-50"
              style={{ backgroundColor: brand.panelColor }}
            >
              {phase === "verifying" ? "VERIFYING…" : "VERIFY"}
            </button>

            <Link
              to="/pay/$id"
              params={{ id }}
              className="mt-3 block text-center text-xs font-medium"
              style={{ color: brand.color }}
            >
              ← অন্য পেমেন্ট মাধ্যম
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
