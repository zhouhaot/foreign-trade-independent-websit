import { describe, expect, it } from "vitest";

import {
  customerCreateSchema,
  customerUpdateSchema,
} from "../../../src/server/modules/customers/dto";
import { parseDto } from "../../../src/server/shared";

const validCustomer = {
  nameCn: "合成客户",
  nameEn: "Synthetic Customer",
  country: "Testland",
  contact: "Synthetic Buyer",
  email: "buyer@example.invalid",
  phone: "+1-000-0000",
  address: "1 Test Only Road",
  remark: "Test use only",
};

describe("customer DTO boundary", () => {
  // @tier durable
  it("accepts the complete create and versioned update contracts", () => {
    expect(parseDto(customerCreateSchema, validCustomer)).toEqual(validCustomer);
    expect(
      parseDto(customerUpdateSchema, { expectedVersion: 1, ...validCustomer }),
    ).toEqual({ expectedVersion: 1, ...validCustomer });
    expect(
      parseDto(customerCreateSchema, { ...validCustomer, email: "", phone: "" }),
    ).toMatchObject({ email: "", phone: "" });
  });

  // @tier durable
  it("rejects client-supplied ownership, actor, role and audit fields as malformed", () => {
    for (const field of [
      "ownerUserId",
      "actorUserId",
      "role",
      "createdBy",
      "createdAt",
      "rowVersion",
    ]) {
      expect(() =>
        parseDto(customerCreateSchema, { ...validCustomer, [field]: "forbidden" }),
      ).toThrowError(expect.objectContaining({ status: 400, code: "MALFORMED_REQUEST" }));
    }
  });

  // @tier durable
  it("rejects wrong types and invalid semantic values with distinct statuses", () => {
    expect(() =>
      parseDto(customerCreateSchema, { ...validCustomer, nameCn: 42 }),
    ).toThrowError(expect.objectContaining({ status: 400 }));
    expect(() =>
      parseDto(customerCreateSchema, { ...validCustomer, email: "not-an-email" }),
    ).toThrowError(expect.objectContaining({ status: 422 }));
    expect(() =>
      parseDto(customerUpdateSchema, { ...validCustomer, expectedVersion: 0 }),
    ).toThrowError(expect.objectContaining({ status: 422 }));
    expect(() =>
      parseDto(customerUpdateSchema, { ...validCustomer }),
    ).toThrowError(expect.objectContaining({ status: 400 }));
  });
});
