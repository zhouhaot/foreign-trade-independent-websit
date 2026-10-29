import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  select: vi.fn(),
  from: vi.fn(),
  insert: vi.fn(),
  withTransaction: vi.fn(),
  runIdempotentTransaction: vi.fn(),
}));

vi.mock("../../../src/server/db", async () => {
  const schema = await import("../../../src/server/db/schema");
  return {
    db: { select: mocks.select, insert: mocks.insert },
    schema,
    withTransaction: mocks.withTransaction,
  };
});

vi.mock("../../../src/server/shared/transactions", () => ({
  runIdempotentTransaction: mocks.runIdempotentTransaction,
}));

import type { AuthIdentity } from "../../../src/server/auth";
import { schema } from "../../../src/server/db";
import { createInquiry } from "../../../src/server/modules/inquiries/service";

const identity: AuthIdentity = {
  sessionId: "00000000-0000-4000-8000-000000000201",
  user: {
    id: "00000000-0000-4000-8000-000000000002",
    username: "synthetic-sales-a",
    displayName: "Synthetic Sales A",
    role: "sales",
  },
};
const customerId = "00000000-0000-4000-8000-000000000103";
const productId = "00000000-0000-4000-8000-000000000102";
const inquiryId = "00000000-0000-4000-8000-000000000104";
const now = new Date("2026-01-02T01:00:00.000Z");
const customer = {
  id: customerId,
  ownerUserId: identity.user.id,
  nameCn: "合成客户",
  nameEn: "Synthetic Customer",
  country: "Testland",
  address: "Test address",
  contact: "Synthetic buyer",
  email: "buyer@example.invalid",
  phone: "",
  remark: "",
  createdAt: now,
  createdBy: identity.user.id,
  updatedAt: now,
  rowVersion: 3,
};
const product = {
  id: productId,
  sku: "SYNTHETIC-SKU-001",
  nameCn: "合成商品",
  nameEn: "Synthetic Product",
  spec: "Synthetic spec",
  unit: "piece",
  refPrice: "10.00",
  currency: "USD",
  enabled: true,
  hsCode: "000000",
  remark: "",
  createdAt: now,
  createdBy: identity.user.id,
  updatedAt: now,
  rowVersion: 2,
};
const insertedInquiry = {
  id: inquiryId,
  ownerUserId: identity.user.id,
  customerId,
  inquiryDate: "2026-01-02",
  status: "FOLLOWING" as const,
  source: "Synthetic source",
  message: "Synthetic inquiry",
  customerVersionAtCreation: 3,
  createdAt: now,
  createdBy: identity.user.id,
  updatedAt: now,
  rowVersion: 1,
};

function lockedQuery(rows: unknown[]) {
  const query = {
    where: vi.fn(),
    limit: vi.fn(),
    for: vi.fn(async () => rows),
  };
  query.where.mockReturnValue(query);
  query.limit.mockReturnValue(query);
  return query;
}

function input() {
  return {
    customerId,
    customerVersion: 3,
    inquiryDate: "2026-01-02",
    source: "Synthetic source",
    message: "Synthetic inquiry",
    items: [
      { productId, productVersion: 2, quantity: "1.2" },
      { productId, productVersion: 2, quantity: "2.00" },
    ],
  };
}

const options = {
  idempotencyKey: "00000000-0000-4000-8000-000000000301",
  requestHash: "synthetic-request-hash",
  requestId: "00000000-0000-4000-8000-000000000302",
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.select.mockReturnValue({ from: mocks.from });
  mocks.from
    .mockReturnValueOnce(lockedQuery([customer]))
    .mockReturnValueOnce(lockedQuery([product]));
  mocks.insert.mockImplementation((table: unknown) => ({
    values: vi.fn((values: unknown) => ({
      returning: vi.fn(async () => {
        if (table === schema.inquiry) return [insertedInquiry];
        if (table === schema.inquiryLine) {
          return (values as Record<string, unknown>[]).map((line, index) => ({
            ...line,
            id: `00000000-0000-4000-8000-00000000040${index}`,
          }));
        }
        throw new Error("Unexpected insert");
      }),
    })),
  }));
  mocks.runIdempotentTransaction.mockImplementation(
    async (transactionOptions: {
      work: (tx: unknown) => Promise<{
        result: unknown;
        responseStatus: 201;
      }>;
    }) => {
      const completed = await transactionOptions.work({
        select: mocks.select,
        insert: mocks.insert,
      });
      return {
        kind: "executed",
        result: completed.result,
        responseStatus: completed.responseStatus,
      };
    },
  );
});

describe("createInquiry", () => {
  it("locks each product once and captures every repeated line with server line numbers", async () => {
    const result = await createInquiry(identity, input(), options);

    expect(mocks.from).toHaveBeenCalledTimes(2);
    expect(result).toMatchObject({ responseStatus: 201, replayed: false });
    expect(result.inquiry.items).toMatchObject([
      { lineNo: 1, quantity: "1.20" },
      { lineNo: 2, quantity: "2.00" },
    ]);
    expect(result.inquiry.items[0]?.product).toEqual({
      productId,
      productVersion: 2,
      sku: product.sku,
      nameCn: product.nameCn,
      nameEn: product.nameEn,
      spec: product.spec,
      unit: product.unit,
      hsCode: product.hsCode,
      schemaVersion: 1,
    });
    const inquiryInsert = mocks.insert.mock.calls.find(
      ([table]) => table === schema.inquiry,
    );
    expect(inquiryInsert).toBeDefined();
    expect(mocks.runIdempotentTransaction).toHaveBeenCalledWith(
      expect.objectContaining({
        actorUserId: identity.user.id,
        operationId: "createInquiry",
        resourceType: "inquiry",
      }),
    );
  });

  it("uses BUSINESS_TIME_ZONE for the future inquiry date guard", async () => {
    const originalTimeZone = process.env.BUSINESS_TIME_ZONE;
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-01-02T01:00:00.000Z"));
    process.env.BUSINESS_TIME_ZONE = "America/Los_Angeles";
    try {
      await expect(createInquiry(identity, input(), options)).rejects.toMatchObject({
        status: 422,
        code: "VALIDATION_ERROR",
        fieldErrors: [{ path: "/inquiryDate", code: "future_date" }],
      });
      expect(mocks.runIdempotentTransaction).not.toHaveBeenCalled();
    } finally {
      if (originalTimeZone === undefined) {
        delete process.env.BUSINESS_TIME_ZONE;
      } else {
        process.env.BUSINESS_TIME_ZONE = originalTimeZone;
      }
      vi.useRealTimers();
    }
  });

  it("rejects a stale product version before inserting business rows", async () => {
    mocks.from.mockReset();
    mocks.from
      .mockReturnValueOnce(lockedQuery([customer]))
      .mockReturnValueOnce(lockedQuery([{ ...product, rowVersion: 4 }]));

    await expect(createInquiry(identity, input(), options)).rejects.toMatchObject({
      status: 409,
      code: "VERSION_CONFLICT",
      currentVersion: 4,
    });
    expect(mocks.insert).not.toHaveBeenCalled();
  });

  it("rejects a disabled product before inserting business rows", async () => {
    mocks.from.mockReset();
    mocks.from
      .mockReturnValueOnce(lockedQuery([customer]))
      .mockReturnValueOnce(lockedQuery([{ ...product, enabled: false }]));

    await expect(createInquiry(identity, input(), options)).rejects.toMatchObject({
      status: 422,
      code: "VALIDATION_ERROR",
    });
    expect(mocks.insert).not.toHaveBeenCalled();
  });

  it("returns 404 for a customer outside the actor scope", async () => {
    mocks.from.mockReset();
    mocks.from.mockReturnValueOnce(lockedQuery([]));

    await expect(createInquiry(identity, input(), options)).rejects.toMatchObject({
      status: 404,
      code: "NOT_FOUND",
    });
    expect(mocks.insert).not.toHaveBeenCalled();
  });

  it("rejects zero quantity before opening the business transaction", async () => {
    const invalid = input();
    invalid.items[0]!.quantity = "0";
    await expect(createInquiry(identity, invalid, options)).rejects.toMatchObject({
      status: 422,
      code: "VALIDATION_ERROR",
      fieldErrors: [{ path: "/items/0/quantity" }],
    });
    expect(mocks.runIdempotentTransaction).not.toHaveBeenCalled();
  });

  it("checks the service role independently of the route", async () => {
    const boss: AuthIdentity = {
      ...identity,
      user: { ...identity.user, role: "boss" },
    };
    await expect(createInquiry(boss, input(), options)).rejects.toMatchObject({
      status: 403,
      code: "FORBIDDEN_ROLE",
    });
    expect(mocks.runIdempotentTransaction).not.toHaveBeenCalled();
  });
});
