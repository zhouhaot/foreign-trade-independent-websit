import { describe, expect, it } from "vitest";

import { inquiryCreateSchema } from "../../../src/server/modules/inquiries/dto";
import { parseDto } from "../../../src/server/shared";

const productId = "00000000-0000-4000-8000-000000000102";
const customerId = "00000000-0000-4000-8000-000000000103";

function validInput() {
  return {
    customerId,
    customerVersion: 1,
    inquiryDate: "2026-01-02",
    source: "Synthetic source",
    message: "Synthetic inquiry",
    items: [{ productId, productVersion: 1, quantity: "1.25" }],
  };
}

describe("inquiry create DTO", () => {
  it("accepts repeated products and rejects client ownership fields", () => {
    const input = validInput();
    input.items.push({ productId, productVersion: 1, quantity: "2.00" });
    expect(parseDto(inquiryCreateSchema, input).items).toHaveLength(2);

    expect(() =>
      parseDto(inquiryCreateSchema, {
        ...validInput(),
        ownerUserId: "00000000-0000-4000-8000-000000000003",
      }),
    ).toThrowError(expect.objectContaining({ status: 400, code: "MALFORMED_REQUEST" }));
  });

  it.each([
    ["empty items", { items: [] }],
    [
      "101 items",
      {
        items: Array.from({ length: 101 }, () => ({
          productId,
          productVersion: 1,
          quantity: "1.00",
        })),
      },
    ],
    ["three decimal places", { items: [{ productId, productVersion: 1, quantity: "1.001" }] }],
    ["exponent quantity", { items: [{ productId, productVersion: 1, quantity: "1e2" }] }],
    ["impossible date", { inquiryDate: "2026-02-29" }],
  ])("rejects %s", (_name, override) => {
    expect(() =>
      parseDto(inquiryCreateSchema, { ...validInput(), ...override }),
    ).toThrowError(expect.objectContaining({ status: 422 }));
  });
});
