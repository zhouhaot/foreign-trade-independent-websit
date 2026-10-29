import { describe, expect, it } from "vitest";

import { calculateQuoteCandidate } from "../../../src/server/modules/quotes/domain";

function item(lineNo: number, quantity: string, unitPrice: string | null) {
  return { lineNo, quantity, unitPrice };
}

describe("quote complete candidate calculation", () => {
  it("normalizes every line and sums exact minor units in original line order", () => {
    // @tier durable
    const result = calculateQuoteCandidate([1, 2], [
      item(2, "2", "1.25"),
      item(1, "0.01", "1.00"),
    ]);

    expect(result).toEqual({
      lines: [
        { lineNo: 1, quantity: "0.01", unitPrice: "1.00", lineAmount: "0.01" },
        { lineNo: 2, quantity: "2.00", unitPrice: "1.25", lineAmount: "2.50" },
      ],
      totalAmount: "2.51",
    });
  });

  it("keeps line and total amounts null when a price is not supplied", () => {
    // @tier durable
    const result = calculateQuoteCandidate([1, 2], [
      item(1, "1.00", null),
      item(2, "2.00", "3.00"),
    ]);

    expect(result.lines[0]?.lineAmount).toBeNull();
    expect(result.totalAmount).toBeNull();
  });

  it("rejects missing, duplicate and unknown line numbers as one complete-set contract", () => {
    // @tier durable
    for (const items of [
      [item(1, "1.00", "1.00")],
      [item(1, "1.00", "1.00"), item(1, "1.00", "1.00")],
      [item(1, "1.00", "1.00"), item(3, "1.00", "1.00")],
    ]) {
      expect(() => calculateQuoteCandidate([1, 2], items)).toThrowError(
        expect.objectContaining({ status: 422, code: "VALIDATION_ERROR" }),
      );
    }
  });

  it("rejects fractional cents instead of rounding", () => {
    // @tier durable
    expect(() =>
      calculateQuoteCandidate([1], [item(1, "0.01", "0.01")]),
    ).toThrowError(
      expect.objectContaining({ status: 422, code: "AMOUNT_NOT_EXACT" }),
    );
  });

  it("rejects multiplication and aggregate overflow before persistence", () => {
    // @tier durable
    const max = "999999999999999999.99";
    expect(() =>
      calculateQuoteCandidate([1], [item(1, max, "2.00")]),
    ).toThrowError(
      expect.objectContaining({ status: 422, code: "AMOUNT_OVERFLOW" }),
    );
    expect(() =>
      calculateQuoteCandidate([1, 2], [
        item(1, "1.00", max),
        item(2, "1.00", "0.01"),
      ]),
    ).toThrowError(
      expect.objectContaining({ status: 422, code: "AMOUNT_OVERFLOW" }),
    );
  });
});
