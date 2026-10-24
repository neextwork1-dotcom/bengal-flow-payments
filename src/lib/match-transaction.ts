/**
 * TRX verification rules (strict mode):
 * A collected SMS matches a payment only when ALL of these hold:
 *   1. Transaction ID matches (normalized, case-insensitive, no spaces/dashes)
 *   2. Amount matches exactly (to 0.01)
 *   3. Merchant/account number matches when the SMS carries one
 */

export function normalizeTrxId(value: string): string {
  return value.trim().toUpperCase().replace(/[\s-]+/g, "");
}

export function normalizeAccountNumber(value: string): string {
  const digits = value.replace(/\D/g, "");
  return digits;
}

/** Pull the transaction ID out of a Nagad SMS body. */
export function extractTrxIdFromSms(body: string): string | null {
  const patterns = [
    /(?:txn\s*id|trx\s*id|txm\s*id|transaction\s*id|txn\s*no|trx\s*no|ref\s*no)\s*[:.=\-]*\s*([A-Za-z0-9]{4,32})/i,
    /\bID\s*[:.=\-]\s*([A-Za-z0-9]{6,32})\b/i,
  ];
  for (const re of patterns) {
    const m = body.match(re);
    const captured = m?.[1];
    if (captured) return normalizeTrxId(captured);
  }
  return null;
}

/** Pull the credited amount out of a Nagad SMS body (BDT / Tk / ৳). */
export function extractAmountFromSms(body: string): number | null {
  const m = body.match(/(?:BDT|Tk\.?|৳)\s*([\d,]+(?:\.\d{1,2})?)/i);
  if (!m) return null;
  const value = Number((m[1] ?? "").replace(/,/g, ""));
  return Number.isFinite(value) ? value : null;
}

export type SmsLike = {
  trx_id?: string | null;
  amount?: number | string | null;
  account_number?: string | null;
  body: string;
};

export type PaymentLike = {
  amount: number | string;
};

export type MatchResult = {
  matched: boolean;
  reason:
    | "match"
    | "trx_mismatch"
    | "amount_mismatch"
    | "account_mismatch"
    | "missing_trx";
};

export function matchSmsToPayment(
  sms: SmsLike,
  payment: PaymentLike,
  merchantNumber: string,
): MatchResult {
  const smsTrx = sms.trx_id ? normalizeTrxId(sms.trx_id) : extractTrxIdFromSms(sms.body);
  if (!smsTrx) return { matched: false, reason: "missing_trx" };

  const smsAmount =
    sms.amount != null && Number(sms.amount) > 0
      ? Number(sms.amount)
      : extractAmountFromSms(sms.body);
  const payAmount = Number(payment.amount);

  if (smsAmount == null || Math.abs(smsAmount - payAmount) > 0.005) {
    return { matched: false, reason: "amount_mismatch" };
  }

  const smsAccount = sms.account_number ? normalizeAccountNumber(sms.account_number) : null;
  if (smsAccount) {
    const merchant = normalizeAccountNumber(merchantNumber);
    if (merchant && smsAccount !== merchant) {
      return { matched: false, reason: "account_mismatch" };
    }
  }

  return { matched: true, reason: "match" };
}

/** Zod-friendly shape check for a TRX ID entered by a customer. */
export function isValidTrxIdInput(value: string): boolean {
  return /^[A-Za-z0-9]{4,40}$/.test(value.trim());
}
