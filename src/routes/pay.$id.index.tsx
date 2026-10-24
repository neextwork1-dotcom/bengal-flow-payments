import { Button } from "@/components/ui/button";
import { NeextBrand } from "@/components/neext-brand";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PaySuccess } from "@/components/pay-success";
import {
  CHECKOUT_BLUE,
  PROVIDER_BRAND,
  PROVIDER_ORDER,
  ProviderLogo,
  formatBdt,
} from "@/lib/providers";
import { fetchPayWindow, type PayAccount, type PayWindowData } from "@/lib/pay-window";

export const Route = createFileRoute("/pay/$id/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Checkout — Neext Pay" },
      {
        name: "description", content:
          "Pay with bKash, Nagad, Upay or Rocket. Copy the number, send from your wallet app, then verify with your transaction ID.",
      },
      { property: "og:title", content: "Checkout — Neext Pay" },
      {
        property: "og:description",
        content: "Pay with bKash, Nagad, Upay or Rocket and verify instantly.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Checkout,
});

function HeadsetIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 14v-2a8 8 0 0 1 16 0v2" strokeLinecap="round" />
      <rect x="2" y="14" width="4" height="6" rx="2" />
      <rect x="18" y="14" width="4" height="6" rx="2" />
    </svg>
  );
}

function HelpIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="9" />
      <path d="M9.5 9a2.5 2.5 0 1 1 3.7 2.2c-.7.4-1.2 1-1.2 1.8" strokeLinecap="round" />
      <circle cx="12" cy="17" r="0.5" fill="currentColor" />
    </svg>
  );
}

function InfoIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5" strokeLinecap="round" />
      <circle cx="12" cy="8" r="0.5" fill="currentColor" />
    </svg>
  );
}

function Checkout() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const [info, setInfo] = useState<PayWindowData | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [tab, setTab] = useState<"mobile" | "bank">("mobile");
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      const res = await fetchPayWindow(id);
      if (!alive) return;
      if (!res.ok) {
        setLoadError(res.error);
        return;
      }
      setInfo(res.data);
    })();
    return () => {
      alive = false;
    };
  }, [id]);

  if (loadError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="w-full max-w-sm rounded-lg bg-card p-8 text-center shadow-xl">
          <p className="text-sm text-destructive">{loadError}</p>
        </div>
      </div>
    );
  }

  if (!info) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">Loading payment…</p>
      </div>
    );
  }

  if (info.status === "complete") {
    return <PaySuccess amount={info.amount} redirectUrl={info.redirectUrl} />;
  }

  const byProvider = new Map<string, PayAccount>(
    info.accounts.map((a) => [a.provider, a]),
  );
  const initial = info.merchant.name.trim().charAt(0).toUpperCase() || "M";

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <div className="mx-auto w-full max-w-md flex-1 px-4 pb-28 pt-6">
        <div className="mb-6 flex justify-center"><NeextBrand /></div>
        {/* Merchant brand */}
        <div className="flex flex-col items-center">
          <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-full bg-card shadow-lg ring-1 ring-border">
            {info.merchant.logoUrl ? (
              <img
                src={info.merchant.logoUrl}
                alt={info.merchant.name}
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="text-3xl font-bold" >
                {initial}
              </span>
            )}
          </div>
          <p className="mt-3 text-lg font-semibold text-foreground">{info.merchant.name}</p>
          <Button
            type="button"
            onClick={() => setShowDetails((v) => !v)}
            className="mt-1 rounded-full bg-card px-3 py-0.5 text-xs font-medium shadow-sm ring-1 ring-border"
            
          >
            {showDetails ? "Hide details" : "View Details"}
          </Button>
          {showDetails ? (
            <div className="mt-2 w-full rounded-lg bg-card p-3 text-xs shadow-sm ring-1 ring-border">
              <p className="flex justify-between py-0.5">
                <span className="text-muted-foreground">Amount</span>
                <span className="font-semibold">৳{formatBdt(info.amount)}</span>
              </p>
              <p className="flex justify-between py-0.5">
                <span className="text-muted-foreground">Reference</span>
                <span className="font-mono">{info.orderId ?? "—"}</span>
              </p>
            </div>
          ) : null}
          <div className="mt-3 flex gap-3">
            {[HeadsetIcon, HelpIcon, InfoIcon].map((Icon, i) => (
              <span
                key={i}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-card shadow-sm ring-1 ring-border"
                
              >
                <Icon />
              </span>
            ))}
          </div>
        </div>

        {/* Method tabs */}
        <div className="mt-5 grid grid-cols-2 gap-1 rounded-lg bg-card/80 p-1 shadow-sm ring-1 ring-border">
          <Button
            type="button"
            onClick={() => setTab("mobile")}
            className="rounded-lg px-3 py-2 text-sm font-semibold transition-colors"
            
          >
            মোবাইল ব্যাংকিং
          </Button>
          <Button
            type="button"
            onClick={() => setTab("bank")}
            className="rounded-lg px-3 py-2 text-sm font-semibold transition-colors"
            
          >
            ব্যাংক ট্রান্সফার
          </Button>
        </div>

        {tab === "mobile" ? (
          <div className="mt-4 grid grid-cols-2 gap-3">
            {PROVIDER_ORDER.map((p) => {
              const account = byProvider.get(p);
              const brand = PROVIDER_BRAND[p];
              return (
                <Button
                  key={p}
                  type="button"
                  disabled={!account}
                  title={account ? undefined : `${brand.label} এই পেমেন্টে সক্রিয় নয়`}
                  onClick={() =>
                    navigate({ to: "/pay/$id/$provider", params: { id, provider: p } })
                  }
                  className="flex h-20 items-center justify-center rounded-lg bg-card shadow-sm ring-1 ring-border transition hover:-translate-y-0.5 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0"
                >
                  <ProviderLogo provider={p} className="h-9" />
                </Button>
              );
            })}
          </div>
        ) : (
          <div className="mt-4 rounded-lg bg-card p-6 text-center text-sm text-muted-foreground shadow-sm ring-1 ring-border">
            ব্যাংক ট্রান্সফার শীঘ্রই যোগ হচ্ছে। এখন মোবাইল ব্যাংকিং ব্যবহার করুন।
          </div>
        )}
      </div>

      {/* Bottom pay bar */}
      <div
        className="fixed inset-x-0 bottom-0 z-10 py-3 text-center"
        
      >
        <p className="text-base font-bold" >
          Pay ৳{formatBdt(info.amount)} BDT
        </p>
      </div>
    </div>
  );
}
