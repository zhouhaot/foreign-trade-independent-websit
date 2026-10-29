import { describe, expect, it } from "vitest";

import {
  copyConfirmedOrderLines,
  validateFirstConversion,
} from "../../../src/server/modules/orders/conversion";
import { createSyntheticTradeSnapshot } from "../../integration/db/fixtures";

const quote = {
  state: "CONFIRMED",
  rowVersion: 3,
  validUntil: "2026-01-17",
};
const confirmation = {
  confirmedOn: "2026-01-10",
  confirmedSnapshot: createSyntheticTradeSnapshot(),
};

function validate(
  overrides: Partial<Parameters<typeof validateFirstConversion>[0]> = {},
  version = 3,
  deliveryDate = "2026-02-01",
) {
  return validateFirstConversion(
    { ...quote, ...overrides },
    confirmation,
    version,
    deliveryDate,
    "2026-01-10",
  );
}

describe("first order conversion guards", () => {
  it("accepts a confirmed current-version quote with a valid delivery date", () => {
    // @tier durable
    expect(() => validate()).not.toThrow();
  });

  it("rejects unconfirmed state and stale versions", () => {
    // @tier durable
    expect(() => validate({ state: "AWAITING_CUSTOMER" })).toThrowError(
      expect.objectContaining({ status: 409, code: "STATE_CONFLICT" }),
    );
    expect(() => validate({}, 2)).toThrowError(
      expect.objectContaining({
        status: 409,
        code: "VERSION_CONFLICT",
        currentVersion: 3,
      }),
    );
  });

  it("rejects expired quotes and delivery dates before today or confirmation", () => {
    // @tier durable
    expect(() => validate({ validUntil: "2026-01-09" })).toThrowError(
      expect.objectContaining({ status: 422, code: "QUOTE_EXPIRED" }),
    );
    expect(() => validate({}, 3, "2026-01-09")).toThrowError(
      expect.objectContaining({ status: 422, code: "VALIDATION_ERROR" }),
    );
    expect(() => validate({}, 3, "2026-02-30")).toThrowError(
      expect.objectContaining({ status: 422, code: "VALIDATION_ERROR" }),
    );
  });
});

describe("confirmed snapshot order lines", () => {
  it("copies monetary values and product snapshots from confirmation, not live rows", () => {
    // @tier durable
    const snapshot = createSyntheticTradeSnapshot();
    snapshot.items[0]!.quantity = "0.10";
    snapshot.items[0]!.unitPrice = "10.0";
    snapshot.items[0]!.lineAmount = "1.0";
    snapshot.totalAmount = "1.0";
    const lines = copyConfirmedOrderLines(
      [{ id: "quote-line-1", lineNo: 1 }],
      snapshot,
    );

    expect(lines).toEqual([
      {
        sourceQuoteLineId: "quote-line-1",
        lineNo: 1,
        productSnapshot: snapshot.items[0]!.product,
        quantity: "0.10",
        unitPrice: "10.00",
        lineAmount: "1.00",
      },
    ]);
  });

  it("rejects missing or extra lines and inconsistent totals", () => {
    // @tier durable
    expect(() =>
      copyConfirmedOrderLines([], createSyntheticTradeSnapshot()),
    ).toThrow("Confirmed snapshot lines do not match source quote lines");
    const snapshot = createSyntheticTradeSnapshot();
    snapshot.totalAmount = "11.00";
    expect(() =>
      copyConfirmedOrderLines(
        [{ id: "quote-line-1", lineNo: 1 }],
        snapshot,
      ),
    ).toThrow("Confirmed snapshot total amount is inconsistent");
  });
});
