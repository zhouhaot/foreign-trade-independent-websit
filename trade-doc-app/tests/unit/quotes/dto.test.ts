import { describe, expect, it } from "vitest";

import {
  confirmationCreateSchema,
  quoteCreateSchema,
  quoteSubmitSchema,
  quoteUpdateSchema,
} from "../../../src/server/modules/quotes/dto";
import { parseDto } from "../../../src/server/shared/dto";

const update = {
  expectedVersion: 1,
  validUntil: "2028-02-29",
  currency: "USD",
  tradeTerm: "FOB",
  paymentTerm: "T/T",
  remark: "",
  items: [{ lineNo: 1, quantity: "0.10", unitPrice: "1.00" }],
};

describe("quote strict request DTOs", () => {
  it("accepts complete contract-shaped commands", () => {
    // @tier durable
    expect(parseDto(quoteCreateSchema, { expectedVersion: 1, currency: "USD" })).toEqual({
      expectedVersion: 1,
      currency: "USD",
    });
    expect(parseDto(quoteUpdateSchema, update)).toEqual(update);
    expect(parseDto(quoteSubmitSchema, {
      expectedVersion: 2,
      expectedCustomerVersion: 3,
      expectedCompanyProfileVersion: 4,
    })).toEqual({
      expectedVersion: 2,
      expectedCustomerVersion: 3,
      expectedCompanyProfileVersion: 4,
    });
  });

  it("rejects client-supplied ownership, state, snapshot and computed amounts", () => {
    // @tier durable
    for (const extra of [
      { ownerUserId: crypto.randomUUID() },
      { status: "CONFIRMED" },
      { submittedSnapshot: {} },
      { totalAmount: "1.00" },
    ]) {
      expect(() => parseDto(quoteUpdateSchema, { ...update, ...extra })).toThrowError(
        expect.objectContaining({ status: 400, code: "MALFORMED_REQUEST" }),
      );
    }
  });

  it("rejects nested product replacement and JSON numeric decimals", () => {
    // @tier durable
    expect(() =>
      parseDto(quoteUpdateSchema, {
        ...update,
        items: [{ ...update.items[0], productId: crypto.randomUUID() }],
      }),
    ).toThrowError(expect.objectContaining({ status: 400 }));
    expect(() =>
      parseDto(quoteUpdateSchema, {
        ...update,
        items: [{ lineNo: 1, quantity: 0.1, unitPrice: "1.00" }],
      }),
    ).toThrowError(expect.objectContaining({ status: 400 }));
  });

  it("keeps non-empty attachments distinguishable for FEATURE_NOT_IN_SLICE", () => {
    // @tier durable
    const input = {
      expectedVersion: 3,
      method: "email",
      confirmedOn: "2026-10-29",
      note: "confirmed",
      attachmentIds: [crypto.randomUUID()],
    };
    expect(parseDto(confirmationCreateSchema, input)).toEqual(input);
    expect(() =>
      parseDto(confirmationCreateSchema, { ...input, recordedBy: crypto.randomUUID() }),
    ).toThrowError(expect.objectContaining({ status: 400 }));
  });
});
