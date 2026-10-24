import { describe, expect, it } from "vitest";
import {
  extractAmountFromSms,
  extractTrxIdFromSms,
  parseSms,
} from "@/lib/sms";

describe("bKash formats", () => {
  it("parses a personal receive SMS", () => {
    const parsed = parseSms(
      "bKash",
      "You have received Tk 500.00 from 01712345678. Fee Tk 0.00. Balance Tk 1,250.50. TrxID 9F7Z2K1ABC at 24/10/2026 14:30",
    );
    expect(parsed?.provider).toBe("bkash");
    expect(parsed?.isCredit).toBe(true);
    expect(parsed?.accountType).toBe("personal");
    expect(parsed?.trxId).toBe("9F7Z2K1ABC");
    expect(parsed?.amount).toBe(500);
    expect(parsed?.balance).toBe(1250.5);
    expect(parsed?.counterparty).toBe("01712345678");
  });

  it("parses a merchant payment-received SMS", () => {
    const parsed = parseSms(
      "bKash",
      "Payment received. Amount Tk 750.00. From 01812345678. Fee Tk 7.50. Balance Tk 10,250.50. TrxID 8A6B4C2D0E at 24/10/2026 09:15",
    );
    expect(parsed?.provider).toBe("bkash");
    expect(parsed?.accountType).toBe("merchant");
    expect(parsed?.isCredit).toBe(true);
    expect(parsed?.trxId).toBe("8A6B4C2D0E");
    expect(parsed?.amount).toBe(750);
    expect(parsed?.balance).toBe(10250.5);
  });
});

describe("Nagad formats", () => {
  it("parses a personal credit SMS", () => {
    const parsed = parseSms(
      "Nagad",
      "You have received BDT 500.00 in your Nagad account from 01712345678. TxnID: 9F7Z2K1ABC, Fee Tk 0.00, Balance 12,340.50",
    );
    expect(parsed?.provider).toBe("nagad");
    expect(parsed?.isCredit).toBe(true);
    expect(parsed?.trxId).toBe("9F7Z2K1ABC");
    expect(parsed?.amount).toBe(500);
    expect(parsed?.balance).toBe(12340.5);
  });

  it("parses a merchant payment SMS with Merchant ID", () => {
    const parsed = parseSms(
      "16167",
      "You have received a payment of Tk 1,200.00 (Merchant ID: 1234567890) from 01912345678. TxnID: MERCH12345, Balance 22,340.50",
    );
    expect(parsed?.provider).toBe("nagad");
    expect(parsed?.accountType).toBe("merchant");
    expect(parsed?.accountNumber).toBe("1234567890");
    expect(parsed?.trxId).toBe("MERCH12345");
    expect(parsed?.amount).toBe(1200);
    expect(parsed?.counterparty).toBe("01912345678");
  });
});

describe("Upay formats", () => {
  it("parses a personal receive SMS", () => {
    const parsed = parseSms(
      "Upay",
      "You have received Tk 320.00 from 01612345678. Fee Tk 0.00. Balance Tk 5,320.00. TXN ID: UPAY77X9Q2",
    );
    expect(parsed?.provider).toBe("upay");
    expect(parsed?.isCredit).toBe(true);
    expect(parsed?.trxId).toBe("UPAY77X9Q2");
    expect(parsed?.amount).toBe(320);
  });

  it("parses a merchant credit SMS", () => {
    const parsed = parseSms(
      "16793",
      "You have received a merchant payment of Tk 99.00 from 01512345678. Merchant ID: 5550011223. TxnID: UPMERCH99, Balance 1,099.00",
    );
    expect(parsed?.provider).toBe("upay");
    expect(parsed?.accountType).toBe("merchant");
    expect(parsed?.trxId).toBe("UPMERCH99");
    expect(parsed?.amount).toBe(99);
  });
});

describe("Rocket formats", () => {
  it("parses a personal receive SMS with numeric TxnId", () => {
    const parsed = parseSms(
      "Rocket",
      "You have received Tk 450.00 from 01712345678. Fee Tk 0.00. Balance Tk 4,450.00. TxnId: 123456789012345",
    );
    expect(parsed?.provider).toBe("rocket");
    expect(parsed?.isCredit).toBe(true);
    expect(parsed?.trxId).toBe("123456789012345");
    expect(parsed?.amount).toBe(450);
  });

  it("parses a merchant receive SMS", () => {
    const parsed = parseSms(
      "DBBL",
      "You have received a payment Tk 2,000.00 from 01812345678 in your merchant account. Fee Tk 0.00. Balance Tk 12,000.00. TxnId: 987654321098765",
    );
    expect(parsed?.provider).toBe("rocket");
    expect(parsed?.accountType).toBe("merchant");
    expect(parsed?.trxId).toBe("987654321098765");
    expect(parsed?.amount).toBe(2000);
  });
});

describe("best-format selection", () => {
  it("detects the provider from the sender when the body omits it", () => {
    const parsed = parseSms(
      "bKash",
      "You have received Tk 100.00 from 01712345678. Fee Tk 0.00. Balance Tk 900.00. TrxID ZZ99XX88YY",
    );
    expect(parsed?.provider).toBe("bkash");
    expect(parsed?.trxId).toBe("ZZ99XX88YY");
  });

  it("never takes the Fee or Balance figure as the paid amount", () => {
    const body =
      "You have received Tk 500.00 from 01712345678. Fee Tk 5.00. Balance Tk 1,250.50. TrxID 9F7Z2K1ABC";
    expect(extractAmountFromSms(body)).toBe(500);
  });

  it("marks debit messages as not credit", () => {
    const parsed = parseSms(
      "bKash",
      "You have sent Tk 200.00 to 01812345678. Fee Tk 2.00. Balance Tk 700.00. TrxID SEND000111",
    );
    expect(parsed?.isCredit).toBe(false);
    expect(parsed?.amount).toBe(200);
  });

  it("returns null for unrelated messages", () => {
    expect(parseSms("Grameenphone", "Your internet pack expires tomorrow")).toBeNull();
  });

  it("reads every TRX format variant", () => {
    expect(extractTrxIdFromSms("TrxID : ab12cd34 received")).toBe("AB12CD34");
    expect(extractTrxIdFromSms("TxnID: XYZ123456")).toBe("XYZ123456");
    expect(extractTrxIdFromSms("TXN ID: UPAY77X9Q2")).toBe("UPAY77X9Q2");
    expect(extractTrxIdFromSms("no id here")).toBeNull();
  });
});
