import { describe, expect, it } from "vitest";

import { orderCreateDto } from "../../../src/server/modules/orders/dto";
import { parseDto } from "../../../src/server/shared/dto";

describe("order create DTO", () => {
  it("accepts only expectedVersion and deliveryDate", () => {
    // @tier durable
    expect(
      parseDto(orderCreateDto, {
        expectedVersion: 3,
        deliveryDate: "2026-02-01",
      }),
    ).toEqual({ expectedVersion: 3, deliveryDate: "2026-02-01" });
  });

  it.each(["items", "totalAmount", "customerId", "ownerUserId", "status"])(
    "rejects client-supplied %s with HTTP 400",
    (field) => {
      // @tier durable
      expect(() =>
        parseDto(orderCreateDto, {
          expectedVersion: 3,
          deliveryDate: "2026-02-01",
          [field]: "not-allowed",
        }),
      ).toThrowError(expect.objectContaining({
        status: 400,
        code: "MALFORMED_REQUEST",
      }));
    },
  );

  it("requires deliveryDate and a positive integer version", () => {
    // @tier durable
    expect(() =>
      parseDto(orderCreateDto, { expectedVersion: 3 }),
    ).toThrowError(expect.objectContaining({ status: 400 }));
    expect(() =>
      parseDto(orderCreateDto, {
        expectedVersion: 0,
        deliveryDate: "2026-02-01",
      }),
    ).toThrowError(expect.objectContaining({ status: 422 }));
  });
});
