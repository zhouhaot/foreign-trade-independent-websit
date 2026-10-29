import { describe, expect, it } from "vitest";

import {
  calculateLineAmount,
  decimalToMinorUnits,
  minorUnitsToDecimal,
  normalizeDecimal,
  sumAmounts,
} from "../../../src/server/shared/money";
import { expectApiError } from "./test-utils";

const MAX = "999999999999999999.99";

describe("exact minor-unit money", () => {
  it("normalizes decimal strings without binary floating point", () => {
    // @tier durable
    expect(normalizeDecimal("0.1")).toBe("0.10");
    expect(normalizeDecimal("545")).toBe("545.00");
    expect(decimalToMinorUnits("0.01")).toBe(1n);
    expect(minorUnitsToDecimal(54500n)).toBe("545.00");
  });

  it("rejects 0.01 times 0.01 because it is not an exact cent", () => {
    // @tier durable
    expectApiError(() => calculateLineAmount("0.01", "0.01", "/items/0"), {
      status: 422,
      code: "AMOUNT_NOT_EXACT",
      fieldErrors: [
        expect.objectContaining({ path: "/items/0/lineAmount" }),
      ],
    });
  });

  it("calculates exact lines and a 545.00 USD-denominated total", () => {
    // @tier durable
    const line = calculateLineAmount("10.90", "50.00");
    expect(line).toBe("545.00");
    expect(sumAmounts([line])).toBe("545.00");
    expect(calculateLineAmount("0.01", "1.00")).toBe("0.01");
  });

  it("accepts the DECIMAL(20,2) upper bound", () => {
    // @tier durable
    expect(normalizeDecimal(MAX)).toBe(MAX);
    expect(calculateLineAmount(MAX, "1.00")).toBe(MAX);
  });

  it("rejects single-field, multiplication and sum overflow before persistence", () => {
    // @tier durable
    expectApiError(() => normalizeDecimal("1000000000000000000.00"), {
      status: 422,
      code: "AMOUNT_OVERFLOW",
    });
    expectApiError(() => calculateLineAmount(MAX, "2.00"), {
      status: 422,
      code: "AMOUNT_OVERFLOW",
    });
    expectApiError(() => sumAmounts([MAX, "0.01"]), {
      status: 422,
      code: "AMOUNT_OVERFLOW",
    });
  });

  it("rejects JSON numbers, exponents, signs, whitespace and excess scale", () => {
    // @tier durable
    for (const value of [
      0.01 as unknown as string,
      "1e2",
      "-1.00",
      "+1.00",
      " 1.00",
      "01.00",
      "1.000",
      "1,000.00",
      "0x10",
    ]) {
      expectApiError(() => decimalToMinorUnits(value), { status: 422 });
    }
  });

  it("requires positive quantity and unit price at the calculation boundary", () => {
    // @tier durable
    expectApiError(() => calculateLineAmount("0", "1.00"), {
      status: 422,
      code: "VALIDATION_ERROR",
    });
    expectApiError(() => calculateLineAmount("1.00", "0.00"), {
      status: 422,
      code: "VALIDATION_ERROR",
    });
  });
});
