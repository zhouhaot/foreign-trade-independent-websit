import { describe, expect, it } from "vitest";

import {
  normalizeSku,
  parseProductCreateRequest,
  parseProductUpdateRequest,
} from "../../../src/server/modules/catalog/dto";

const validProduct = {
  sku: " ab-001 ",
  nameCn: "合成商品",
  nameEn: "Synthetic product",
  spec: "Test only",
  unit: "piece",
  refPrice: "0.1",
  currency: "USD",
  hsCode: "000000",
  remark: "",
};

function jsonRequest(body: unknown, method = "POST"): Request {
  return new Request("http://localhost/api/v1/products", {
    method,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("product DTO contract", () => {
  it("normalizes SKU and reference price without binary floating point", async () => {
    // @tier durable
    const result = await parseProductCreateRequest(jsonRequest(validProduct));

    expect(result.sku).toBe("AB-001");
    expect(result.refPrice).toBe("0.10");
    expect(normalizeSku("sales-01")).toBe("SALES-01");
  });

  it("rejects unknown authorization and server-managed fields", async () => {
    // @tier durable
    await expect(
      parseProductCreateRequest(
        jsonRequest({ ...validProduct, ownerUserId: "another-user" }),
      ),
    ).rejects.toMatchObject({ status: 400, code: "MALFORMED_REQUEST" });
    await expect(
      parseProductCreateRequest(jsonRequest({ ...validProduct, enabled: false })),
    ).rejects.toMatchObject({ status: 400, code: "MALFORMED_REQUEST" });
    await expect(
      parseProductUpdateRequest(
        jsonRequest(
          { ...validProduct, expectedVersion: 1, enabled: true, createdBy: "user" },
          "PUT",
        ),
      ),
    ).rejects.toMatchObject({ status: 400, code: "MALFORMED_REQUEST" });
  });

  it.each(["-1.00", "+1.00", " 1.00", "01.00", "1.000", "1e2", "1,000.00", "0x10"])(
    "rejects illegal reference price %s",
    async (refPrice) => {
      // @tier durable
      await expect(
        parseProductCreateRequest(jsonRequest({ ...validProduct, refPrice })),
      ).rejects.toMatchObject({ status: 422 });
    },
  );

  it("rejects numeric amounts and overflowing amounts before persistence", async () => {
    // @tier durable
    await expect(
      parseProductCreateRequest(jsonRequest({ ...validProduct, refPrice: 1.25 })),
    ).rejects.toMatchObject({ status: 400, code: "MALFORMED_REQUEST" });
    await expect(
      parseProductCreateRequest(
        jsonRequest({ ...validProduct, refPrice: "1000000000000000000.00" }),
      ),
    ).rejects.toMatchObject({ status: 422, code: "AMOUNT_OVERFLOW" });
  });

  it("requires a complete versioned update including enabled state", async () => {
    // @tier durable
    const result = await parseProductUpdateRequest(
      jsonRequest({ ...validProduct, expectedVersion: 3, enabled: false }, "PUT"),
    );
    expect(result).toMatchObject({ expectedVersion: 3, enabled: false });

    await expect(
      parseProductUpdateRequest(
        jsonRequest({ ...validProduct, expectedVersion: 3 }, "PUT"),
      ),
    ).rejects.toMatchObject({ status: 400, code: "MALFORMED_REQUEST" });
  });

  it("rejects a whitespace-only SKU after normalization", async () => {
    // @tier durable
    await expect(
      parseProductCreateRequest(jsonRequest({ ...validProduct, sku: "   " })),
    ).rejects.toMatchObject({ status: 422, code: "VALIDATION_ERROR" });
  });
});
