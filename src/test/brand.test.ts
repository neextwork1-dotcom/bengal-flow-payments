import { describe, expect, it } from "vitest";
import { PAYMENT_INTRO_MS } from "@/lib/brand";
describe("Payment intro timing", () => {
  it("lasts five seconds", () => expect(PAYMENT_INTRO_MS).toBe(5000));
});