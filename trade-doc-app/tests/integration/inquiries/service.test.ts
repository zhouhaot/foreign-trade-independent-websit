import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type { AuthIdentity } from "../../../src/server/auth";
import * as schema from "../../../src/server/db/schema";
import type { InquiryCreateInput } from "../../../src/server/modules/inquiries/dto";
import type { Pagination } from "../../../src/server/shared";
import {
  seedSyntheticBase,
  syntheticIds,
} from "../db/fixtures";

const runDatabaseTests =
  process.env.TRADE_DOC_RUN_DB_TESTS === "true" &&
  process.env.TRADE_DOC_ALLOW_TEST_RESET === "true" &&
  Boolean(process.env.DATABASE_URL);

let database: typeof import("../../../src/server/db").db;
let resetDatabase: typeof import("../db/reset").resetDatabase;
let service: typeof import("../../../src/server/modules/inquiries/service");

const customerA = "00000000-0000-4000-8000-000000000103";
const customerB = "00000000-0000-4000-8000-000000000104";
const disabledProduct = "00000000-0000-4000-8000-000000000105";
const inquiryOptions = {
  idempotencyKey: "00000000-0000-4000-8000-000000000301",
  requestHash: "synthetic-inquiry-request-a",
  requestId: "00000000-0000-4000-8000-000000000302",
};
const pagination: Pagination = { page: 1, pageSize: 20, offset: 0, q: "" };

function identity(
  role: "sales" | "boss",
  id: string = syntheticIds.salesA,
): AuthIdentity {
  return {
    sessionId: "00000000-0000-4000-8000-000000000201",
    user: {
      id,
      username: `synthetic-${role}`,
      displayName: `Synthetic ${role}`,
      role,
    },
  };
}

function input(customerId: string = customerA): InquiryCreateInput {
  return {
    customerId,
    customerVersion: 1,
    inquiryDate: "2026-01-02",
    source: "synthetic-shared-search",
    message: "Synthetic inquiry",
    items: [
      {
        productId: syntheticIds.product,
        productVersion: 1,
        quantity: "1.2",
      },
      {
        productId: syntheticIds.product,
        productVersion: 1,
        quantity: "2.00",
      },
    ],
  };
}

describe.skipIf(!runDatabaseTests)("inquiry PostgreSQL integration", () => {
  beforeAll(async () => {
    const databaseModule = await import("../../../src/server/db");
    database = databaseModule.db;
    service = await import("../../../src/server/modules/inquiries/service");
    ({ resetDatabase } = await import("../db/reset"));
    await resetDatabase(database);
    await database.transaction(async (transaction) => {
      await seedSyntheticBase(transaction, "synthetic-password-hash");
      await transaction.insert(schema.customer).values([
        {
          id: customerA,
          ownerUserId: syntheticIds.salesA,
          nameCn: "合成客户 A",
          nameEn: "Synthetic Customer A",
          country: "Testland",
          address: "Test address A",
          contact: "Synthetic buyer A",
          email: "",
          phone: "",
          remark: "",
          createdBy: syntheticIds.salesA,
        },
        {
          id: customerB,
          ownerUserId: syntheticIds.salesB,
          nameCn: "合成客户 B",
          nameEn: "Synthetic Customer B",
          country: "Testland",
          address: "Test address B",
          contact: "Synthetic buyer B",
          email: "",
          phone: "",
          remark: "",
          createdBy: syntheticIds.salesB,
        },
      ]);
    });
  });

  afterAll(async () => {
    if (runDatabaseTests) await resetDatabase(database);
  });

  it("keeps list, total and search in scope and preserves snapshots", async () => {
    const createdA = await service.createInquiry(
      identity("sales"),
      input(),
      inquiryOptions,
    );
    const createdB = await service.createInquiry(
      identity("sales", syntheticIds.salesB),
      input(customerB),
      {
        ...inquiryOptions,
        idempotencyKey: "00000000-0000-4000-8000-000000000303",
        requestHash: "synthetic-inquiry-request-b",
      },
    );

    expect(createdA.inquiry.items).toMatchObject([
      { lineNo: 1, quantity: "1.20" },
      { lineNo: 2, quantity: "2.00" },
    ]);
    const salesPage = await service.listInquiries(identity("sales"), {
      ...pagination,
      q: "shared-search",
    });
    const bossPage = await service.listInquiries(identity("boss", syntheticIds.boss), {
      ...pagination,
      q: "shared-search",
    });
    expect(salesPage.total).toBe(1);
    expect(salesPage.items[0]?.id).toBe(createdA.inquiry.id);
    expect(bossPage.total).toBe(2);

    const byId = await service.listInquiries(identity("sales"), {
      ...pagination,
      q: createdA.inquiry.id,
    });
    expect(byId).toMatchObject({ total: 1, totalPages: 1 });
    expect(byId.items[0]?.id).toBe(createdA.inquiry.id);
    for (const q of ["%", "_", "\\"]) {
      const wildcards = await service.listInquiries(identity("sales"), {
        ...pagination,
        q,
      });
      expect(wildcards).toMatchObject({ items: [], total: 0, totalPages: 0 });
    }

    await expect(
      service.getInquiry(identity("sales"), createdB.inquiry.id),
    ).rejects.toMatchObject({ status: 404, code: "NOT_FOUND" });

    await database
      .update(schema.product)
      .set({ nameEn: "Changed catalog name", rowVersion: 2 })
      .where(eq(schema.product.id, syntheticIds.product));
    const reread = await service.getInquiry(identity("sales"), createdA.inquiry.id);
    expect(reread.items[0]?.product.nameEn).toBe("Synthetic product");
    expect(reread.items[0]?.product.productVersion).toBe(1);
    await database
      .update(schema.product)
      .set({ nameEn: "Synthetic product", rowVersion: 1 })
      .where(eq(schema.product.id, syntheticIds.product));
  });

  it("rolls back business, idempotency and audit work on any line failure", async () => {
    await database.insert(schema.product).values({
      id: disabledProduct,
      sku: "SYNTHETIC-DISABLED-001",
      nameCn: "停用商品",
      nameEn: "Disabled synthetic product",
      spec: "",
      unit: "piece",
      refPrice: "1.00",
      currency: "USD",
      enabled: false,
      hsCode: "",
      remark: "",
      createdBy: syntheticIds.salesA,
    });
    const before = await database.transaction(async (transaction) => ({
      inquiries: await transaction.select().from(schema.inquiry),
      idempotency: await transaction.select().from(schema.idempotencyRecord),
      audits: await transaction.select().from(schema.auditEvent),
    }));
    const disabledInput = input();
    disabledInput.items = [
      {
        productId: disabledProduct,
        productVersion: 1,
        quantity: "1.00",
      },
    ];

    await expect(
      service.createInquiry(identity("sales"), disabledInput, {
        ...inquiryOptions,
        idempotencyKey: "00000000-0000-4000-8000-000000000304",
        requestHash: "synthetic-disabled-product",
      }),
    ).rejects.toMatchObject({ status: 422, code: "VALIDATION_ERROR" });
    await expect(
      service.createInquiry(
        identity("sales"),
        { ...input(), customerVersion: 99 },
        {
          ...inquiryOptions,
          idempotencyKey: "00000000-0000-4000-8000-000000000305",
          requestHash: "synthetic-stale-customer",
        },
      ),
    ).rejects.toMatchObject({ status: 409, code: "VERSION_CONFLICT" });

    expect(await database.select().from(schema.inquiry)).toHaveLength(
      before.inquiries.length,
    );
    expect(await database.select().from(schema.idempotencyRecord)).toHaveLength(
      before.idempotency.length,
    );
    expect(await database.select().from(schema.auditEvent)).toHaveLength(
      before.audits.length,
    );
  });

  it("serializes same-key same-body and different-body concurrent creates", async () => {
    const sameCommand = {
      ...inquiryOptions,
      idempotencyKey: "00000000-0000-4000-8000-000000000307",
      requestHash: "synthetic-concurrent-same-body",
    };
    const sameBody = await Promise.all([
      service.createInquiry(identity("sales"), input(), sameCommand),
      service.createInquiry(identity("sales"), input(), sameCommand),
    ]);
    expect(sameBody.map((result) => result.responseStatus).sort()).toEqual([200, 201]);
    expect(sameBody[0]?.inquiry.id).toBe(sameBody[1]?.inquiry.id);

    const differentBody = { ...input(), message: "Different synthetic inquiry" };
    const results = await Promise.allSettled([
      service.createInquiry(identity("sales"), input(), {
        ...inquiryOptions,
        idempotencyKey: "00000000-0000-4000-8000-000000000308",
        requestHash: "synthetic-concurrent-body-a",
      }),
      service.createInquiry(identity("sales"), differentBody, {
        ...inquiryOptions,
        idempotencyKey: "00000000-0000-4000-8000-000000000308",
        requestHash: "synthetic-concurrent-body-b",
      }),
    ]);
    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect(results.find((result) => result.status === "rejected")).toMatchObject({
      reason: { status: 409, code: "IDEMPOTENCY_CONFLICT" },
    });
  });

  it("replays the same successful command without new business or audit rows", async () => {
    const command = {
      ...inquiryOptions,
      idempotencyKey: "00000000-0000-4000-8000-000000000306",
      requestHash: "synthetic-replay-command",
    };
    const first = await service.createInquiry(identity("sales"), input(), command);
    const beforeAudits = await database.select().from(schema.auditEvent);
    const replay = await service.createInquiry(identity("sales"), input(), command);

    expect(first.responseStatus).toBe(201);
    expect(replay).toMatchObject({ responseStatus: 200, replayed: true });
    expect(replay.inquiry.id).toBe(first.inquiry.id);
    expect(await database.select().from(schema.auditEvent)).toHaveLength(
      beforeAudits.length,
    );
  });
});
