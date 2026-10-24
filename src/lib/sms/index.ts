/**
 * Multi-provider MFS SMS format reader — bKash, Nagad, Upay, Rocket.
 *
 * Handles both PERSONAL and MERCHANT account message formats. The reader runs
 * every provider's format rules over the message, scores each candidate
 * (provider hint strength + extracted field completeness) and returns the best
 * parse — so unknown senders or renamed sender IDs still parse correctly.
 */

export const PROVIDERS = ["bkash", "nagad", "upay", "rocket"] as const;
export type Provider = (typeof PROVIDERS)[number];

export const PROVIDER_META: Record<
  Provider,
  { label: string; color: string; softColor: string }
> = {
  bkash: { label: "bKash", color: "#E2136E", softColor: "#FDE7F1" },
  nagad: { label: "Nagad", color: "#EC6608", softColor: "#FDEFE3" },
  upay: { label: "Upay", color: "#009CA6", softColor: "#E4F5F6" },
  rocket: { label: "Rocket", color: "#8C3494", softColor: "#F4E8F5" },
};

export type AccountType = "personal" | "merchant" | "agent";

export type ParsedSms = {
  provider: Provider;
  /** 0–1: provider certainty + field completeness. */
  confidence: number;
  accountType: AccountType;
  /** True when money came IN (receive / payment received / cash in). */
  isCredit: boolean;
  trxId: string | null;
  amount: number | null;
  balance: number | null;
  /** Customer number on a credit, receiver on a debit. Normalized 01… form. */
  counterparty: string | null;
  /** Merchant ID / account number when the SMS carries one. */
  accountNumber: string | null;
};

const PROVIDER_HINTS: Record<Provider, RegExp> = {
  bkash: /b\s?kash|16247/i,
  nagad: /nagad|16167/i,
  upay: /upay|16793/i,
  rocket: /rocket|dutch[- ]?bangla|\bdbbl\b|16286/i,
};

const CREDIT_RE =
  /\b(?:received|credited|cash[- ]?in|payment\s+received|got\s+(?:Tk|BDT|Taka|৳)|added)\b/i;
const DEBIT_RE =
  /\b(?:sent|cash[- ]?out|withdraw|payment\s+to|paid\s+to|transfer(?:red)?\s+to)\b/i;
const MERCHANT_RE = /\bmerchant\b|\bpayment\s+received\b/i;
const AGENT_RE = /\bagent\b/i;

const MONEY_RE = /(?:BDT|Tk\.?|Taka|৳)\s*([\d,]+(?:\.\d{1,2})?)/gi;
const BALANCE_RE =
  /\bBalance\s*(?:is)?\s*[:.\-]?\s*(?:BDT|Tk\.?|Taka|৳)?\s*([\d,]+(?:\.\d{1,2})?)/i;
const TRX_RES = [
  /\b(?:trx\s*id|txm\s*id|txn\s*id|txnid|trxid|txid|transaction\s*id|ref(?:erence)?\s*(?:no|number)?)\s*[:.=\-#]?\s*([A-Za-z0-9]{6,20})\b/i,
  /\bTrxID\s+([A-Za-z0-9]{6,20})\b/,
];
const COUNTERPARTY_RE =
  /(?:from|to)\s*(?:a\/?c\s*\/?|acc(?:ount)?\s*|no\.?\s*:?\s*)?((?:\+?8801|01)[3-9]\d{8})/i;
const MERCHANT_ID_RE =
  /\b(?:merchant\s*id|merchant\s*no|mid)\s*[:.=\-]?\s*([A-Za-z0-9]{4,20})\b/i;

function toNumber(raw: string): number | null {
  const value = Number(raw.replace(/,/g, ""));
  return Number.isFinite(value) ? value : null;
}

/** Money amount, preferring the one tied to a receive/payment keyword and skipping Fee/Balance figures. */
export function extractAmountFromSms(body: string): number | null {
  let fallback: number | null = null;
  for (const m of body.matchAll(MONEY_RE)) {
    const value = toNumber(m[1] ?? "");
    if (value == null) continue;
    const start = m.index ?? 0;
    const before = body.slice(Math.max(0, start - 28), start).toLowerCase();
    if (/\b(?:fee|charge|cash[- ]?out)\b|\bbalance\b/.test(before)) continue;
    if (
      /\b(?:received|credited|payment|cash[- ]?in|got|added)\b/.test(before)
    ) {
      return value;
    }
    if (fallback == null) fallback = value;
  }
  return fallback;
}

export function extractTrxIdFromSms(body: string): string | null {
  for (const re of TRX_RES) {
    const m = body.match(re);
    if (m?.[1]) return m[1].toUpperCase();
  }
  return null;
}

export function extractBalanceFromSms(body: string): number | null {
  const m = body.match(BALANCE_RE);
  return m ? toNumber(m[1] ?? "") : null;
}

/** Normalize +8801XXXXXXXXX / 8801XXXXXXXXX / 1XXXXXXXXX → 01XXXXXXXXX. */
export function normalizePhone(value: string): string | null {
  const digits = value.replace(/\D/g, "");
  if (digits.startsWith("8801")) return "0" + digits.slice(3);
  if (digits.startsWith("01")) return digits;
  return null;
}

export function extractCounterpartyFromSms(body: string): string | null {
  const m = body.match(COUNTERPARTY_RE);
  return m ? normalizePhone(m[1] ?? "") : null;
}

export function extractAccountNumberFromSms(body: string): string | null {
  const m = body.match(MERCHANT_ID_RE);
  if (m?.[1]) return m[1].replace(/\D/g, "") || m[1];
  return null;
}

function providerStrength(provider: Provider, sender: string, body: string): number {
  let strength = 0;
  if (PROVIDER_HINTS[provider].test(sender)) strength += 2;
  if (PROVIDER_HINTS[provider].test(body)) strength += 1;
  return strength;
}

/**
 * Best-format reader: parse the SMS once and get provider, personal/merchant
 * type, TRX ID, amount, balance, counterparty and account number.
 */
export function parseSms(sender: string, body: string): ParsedSms | null {
  const trxId = extractTrxIdFromSms(body);
  const amount = extractAmountFromSms(body);
  const balance = extractBalanceFromSms(body);
  const counterparty = extractCounterpartyFromSms(body);
  const accountNumber = extractAccountNumberFromSms(body);
  const accountType: AccountType = MERCHANT_RE.test(body)
    ? "merchant"
    : AGENT_RE.test(body)
      ? "agent"
      : "personal";
  const isCredit = CREDIT_RE.test(body) && !DEBIT_RE.test(body);

  if (trxId == null && amount == null && balance == null && counterparty == null) {
    return null;
  }

  const best = PROVIDERS.map((provider) => {
    const strength = providerStrength(provider, sender, body);
    let confidence = strength >= 2 ? 0.55 : strength === 1 ? 0.4 : 0.15;
    if (trxId) confidence += 0.15;
    if (amount != null) confidence += 0.15;
    if (counterparty) confidence += 0.05;
    if (balance != null) confidence += 0.05;
    return { provider, confidence, strength };
  }).sort((a, b) => b.confidence - a.confidence)[0]!;

  return {
    provider: best.provider,
    confidence: Math.min(1, Number(best.confidence.toFixed(2))),
    accountType,
    isCredit,
    trxId,
    amount,
    balance,
    counterparty,
    accountNumber,
  };
}
