// Brand data, logos and Bengali payment instructions for the four supported
// MFS providers. Client-safe: no server imports.

export type Provider = "bkash" | "nagad" | "upay" | "rocket";
export type PayAccountType = "personal" | "merchant";

export const PROVIDER_ORDER: Provider[] = ["bkash", "nagad", "upay", "rocket"];

export type ProviderBrand = {
  label: string;
  /** Primary brand color (logos, buttons). */
  color: string;
  /** Background of the step-by-step instructions panel. */
  panelColor: string;
  /** Soft tint used behind logos / avatars. */
  softColor: string;
  ussd: string;
  appName: string;
  /** Wallet-app option name for personal vs merchant collection accounts. */
  options: Record<PayAccountType, string>;
};

export const PROVIDER_BRAND: Record<Provider, ProviderBrand> = {
  bkash: {
    label: "bKash",
    color: "#E2136E",
    panelColor: "#E2136E",
    softColor: "#FDE7F1",
    ussd: "*247#",
    appName: "bKash",
    options: { personal: "Send Money", merchant: "Payment" },
  },
  nagad: {
    label: "Nagad",
    color: "#EC6608",
    panelColor: "#D5252B",
    softColor: "#FDEFE3",
    ussd: "*167#",
    appName: "NAGAD",
    options: { personal: "Send Money", merchant: "Payment" },
  },
  upay: {
    label: "Upay",
    color: "#009CA6",
    panelColor: "#009CA6",
    softColor: "#E4F5F6",
    ussd: "*268#",
    appName: "Upay",
    options: { personal: "Send Money", merchant: "Payment" },
  },
  rocket: {
    label: "Rocket",
    color: "#8C3494",
    panelColor: "#8C3494",
    softColor: "#F4E8F5",
    ussd: "*322#",
    appName: "Rocket",
    options: { personal: "Send Money", merchant: "Payment" },
  },
};

/** Checkout chrome blue (tabs, pay bar) from the reference design. */
export const CHECKOUT_BLUE = "#2E6BC6";

export function isProviderId(value: string): value is Provider {
  return (PROVIDER_ORDER as string[]).includes(value);
}

export function formatBdt(amount: number | string | null | undefined): string {
  const n = Number(amount);
  return (Number.isFinite(n) ? n : 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export type PayStep =
  | { kind: "text"; text: string }
  | { kind: "number"; text: string; number: string }
  | { kind: "amount"; text: string; amount: string };

/**
 * Bengali step-by-step payment instructions, matching the reference checkout:
 * dial/app → option (Send Money for personal, Payment for merchant accounts) →
 * number + copy → charge-inclusive amount → PIN → confirmation SMS → TRX ID.
 */
export function buildPaySteps(
  provider: Provider,
  accountType: PayAccountType,
  accountNumber: string,
  amount: number | string,
): PayStep[] {
  const brand = PROVIDER_BRAND[provider];
  return [
    {
      kind: "text",
      text: `${brand.ussd} ডায়াল করে অথবা ${brand.appName} অ্যাপে লগইন করে অপশন সিলেক্ট করুন`,
    },
    { kind: "text", text: `"${brand.options[accountType]}" অপশন সিলেক্ট করুন` },
    { kind: "number", text: "নিচের নাম্বারটি সেখানে লিখুন", number: accountNumber },
    { kind: "amount", text: "চার্জ সহ পরিমাণ", amount: formatBdt(amount) },
    { kind: "text", text: `নির্দেশ অনুযায়ী ${brand.label} পিন দিন` },
    {
      kind: "text",
      text: `সম্পন্ন হিসেবে আসলে ${brand.label} থেকে আপনার ফোনে একটি নিশ্চিতকরণ এসএমএস পাবেন`,
    },
    {
      kind: "text",
      text: "অনুগ্রহ করে আপনার Transaction ID নিচের বক্সে লিখে VERIFY বাটনে চাপ দিন",
    },
  ];
}

/** Stylized provider logo marks (SVG) for the checkout grid and headers. */
export function ProviderLogo({
  provider,
  className = "h-9",
}: {
  provider: Provider;
  className?: string;
}) {
  const bengali = "'Noto Sans Bengali', 'Hind Siliguri', sans-serif";
  const latin = "Arial, Helvetica, sans-serif";
  switch (provider) {
    case "bkash":
      return (
        <svg viewBox="0 0 140 44" className={className} role="img" aria-label="bKash">
          <path
            d="M8 33 C 36 12, 94 7, 134 15 C 100 11, 46 17, 14 35 Z"
            fill="#E2136E"
            opacity="0.85"
          />
          <text
            x="10"
            y="29"
            fontStyle="italic"
            fontWeight="800"
            fontSize="25"
            fill="#E2136E"
            fontFamily={latin}
          >
            bKash
          </text>
        </svg>
      );
    case "nagad":
      return (
        <svg viewBox="0 0 140 44" className={className} role="img" aria-label="Nagad">
          <circle cx="21" cy="21" r="17" fill="#EC6608" />
          <path
            d="M21 7 C 30 12, 30 23, 21 34 C 18 25, 18 14, 21 7 Z"
            fill="#ffffff"
            opacity="0.9"
          />
          <text x="46" y="27" fontWeight="800" fontSize="20" fill="#EC6608" fontFamily={bengali}>
            নগদ
          </text>
          <text x="46" y="38" fontSize="8" letterSpacing="3" fill="#6b6b6b" fontFamily={latin}>
            NAGAD
          </text>
        </svg>
      );
    case "upay":
      return (
        <svg viewBox="0 0 140 44" className={className} role="img" aria-label="Upay">
          <rect x="5" y="5" width="32" height="32" rx="9" fill="#009CA6" />
          <text
            x="21"
            y="28"
            textAnchor="middle"
            fontWeight="800"
            fontSize="19"
            fill="#ffffff"
            fontFamily={latin}
          >
            U
          </text>
          <text x="46" y="27" fontWeight="800" fontSize="20" fill="#15568C" fontFamily={bengali}>
            উপায়
          </text>
          <text x="46" y="38" fontSize="8" letterSpacing="2" fill="#6b6b6b" fontFamily={latin}>
            UPAY
          </text>
        </svg>
      );
    case "rocket":
      return (
        <svg viewBox="0 0 150 44" className={className} role="img" aria-label="Rocket">
          <path
            d="M14 34 C 12 20, 20 10, 29 6 C 32 15, 28 27, 20 34 Z"
            fill="#8C3494"
          />
          <path d="M20 34 L 13 41 L 18 32 Z" fill="#B85FC0" />
          <text x="40" y="30" fontWeight="800" fontSize="22" fill="#8C3494" fontFamily={latin}>
            Rocket
          </text>
        </svg>
      );
  }
}
