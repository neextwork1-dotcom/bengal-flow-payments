import { describe, expect, it } from "vitest";
import {
  extractAmountFromSms,
  extractTrxIdFromSms,
  isValidTrxIdInput,
  matchSmsToPayment,
  normalizeTrxId,
} from "@/lib/match-transaction";

describe("normalizeTrxId", () => {
  it("uppercases and strips spaces and dashes", () => {
    expect(normalizeTrxId(" ab-cd 12 ")).toBe("ABCD12");
  });
});

describe("extractTrxIdFromSms", () => {
  it("reads TxnID from a Nagad credit SMS", () => {
    expect(
      extractTrxIdFromSms(
        "You have received BDT 500.00 in your Nagad account from 01712345678. TxnID: 9F7Z2K1ABC, Fee Tk 0.00, Balance 12,340.50",
      ),
    ).toBe("9F7Z2K1ABC");
  });

  it("reads TrxID variant", () => {
    expect(extractTrxIdFromSms("TrxID : ab12cd34 received")).toBe("AB12CD34");
  });

  it("returns null when no ID present", () => {
    expect(extractTrxIdFromSms("Balance 500 only")).toBeNull();
  });
});

describe("extractAmountFromSms", () => {
  it("parses BDT amounts with commas", () => {
    expect(extractAmountFromSms("received BDT 1,250.50 today")).toBe(1250.5);
  });
  it("parses Tk amounts", () => {
    expect(extractAmountFromSms("Tk 300.00")).toBe(300);
  });
});

describe("matchSmsToPayment — strict rules", () => {
  const payment = { amount: 500 };
  const merchant = "012345678901";

  it("matches exact TRX + amount + merchant", () => {
    const result = matchSmsToPayment(
      { trx_id: "abc123", amount: 500, account_number: "0123-45678901", body: "" },
      payment,
      merchant,
    );
    expect(result).toEqual({ matched: true, reason: "match" });
  });

  it("rejects amount mismatch even when TRX matches", () => {
    expect(
      matchSmsToPayment(
        { trx_id: "abc123", amount: 499, account_number: merchant, body: "" },
        payment,
        merchant,
      ).reason,
    ).toBe("amount_mismatch");
  });

  it("rejects account mismatch", () => {
    expect(
      matchSmsToPayment(
        { trx_id: "abc123", amount: 500, account_number: "099999999999", body: "" },
        payment,
        merchant,
      ).reason,
    ).toBe("account_mismatch");
  });

  it("falls back to parsing the SMS body when fields are missing", () => {
    expect(
      matchSmsToPayment(
        {
          trx_id: null,
          amount: null,
          account_number: null,
          body:
            "You have received BDT 500.00 in your Nagad account from 01700000000. TxnID: ABC123XYZ, Balance 1,500",
        },
        payment,
        merchant,
      ).matched,
    ).toBe(true);
  });
});

describe("isValidTrxIdInput", () => {
  it("accepts simple alphanumeric IDs", () => {
    expect(isValidTrxIdInput("AB12CD34")).toBe(true);
  });
  it("rejects symbols and short values", () => {
    expect(isValidTrxIdInput("AB!")).toBe(false);
    expect(isValidTrxIdInput("AB1")).toBe(false);
  });
});
