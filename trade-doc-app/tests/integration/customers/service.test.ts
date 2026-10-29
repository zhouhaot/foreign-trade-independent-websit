import { randomUUID } from "node:crypto";

import { describe, expect, it, beforeAll, beforeEach } from "vitest";

import type { AuthIdentity, Role } from "../../../src/server/auth";
import { createRequestFingerprint } from "../../../src/server/shared";

const enabled = process.env.TRADE_DOC_RUN_DB_TESTS === "true";
const describeDatabase = enabled ? describe : describe.skip;

let database: typeof import("../../../src/server/db").db;
let withTransaction: typeof import("../../../src/server/db").withTransaction;
let customers: typeof import("../../../src/server/modules/customers/service");
let fixtures: typeof import("../db/fixtures");
let reset: typeof import("../db/reset");
let schema: typeof import("../../../src/server/db/schema");

function identity(id: string, role: Role): AuthIdentity {
  return {
    sessionId: randomUUID(),
    user: { id, username: `synthetic-${role}`, displayName: role, role },
  };
}

function command(operationId: string, method: string, path: string, body: unknown, key: string = randomUUID()) {
  return {
    idempotencyKey: key,
    requestHash: createRequestFingerprint({ operationId, method, path, body }),
    requestId: randomUUID(),
  };
}

const input = {
  nameCn: "合成客户",
  nameEn: "Shared Synthetic Customer",
  country: "Testland",
  contact: "Synthetic Buyer",
  email: "buyer@example.invalid",
  phone: "+1-000-0000",
  address: "1 Test Only Road",
  remark: "Test use only",
};

const pagination = (page = 1, pageSize = 20, q = "") => ({
  page,
  pageSize,
  offset: (page - 1) * pageSize,
  q,
});

beforeAll(async () => {
  if (!enabled) return;
  ({ db: database, withTransaction } = await import("../../../src/server/db"));
  customers = await import("../../../src/server/modules/customers/service");
  fixtures = await import("../db/fixtures");
  reset = await import("../db/reset");
  schema = await import("../../../src/server/db/schema");
});

beforeEach(async () => {
  if (!enabled) return;
  await reset.resetDatabase(database);
  await withTransaction((transaction) => fixtures.seedSyntheticBase(transaction, "synthetic-password-not-used"));
});

describeDatabase("customers against PostgreSQL", () => {
  // @tier durable CUST-01 IDEM-01
  it("creates, updates and replays with one resource and no duplicate audit", async () => {
    const actor = identity(fixtures.syntheticIds.salesA, "sales");
    const createKey = randomUUID();
    const created = await customers.createCustomer(
      actor,
      input,
      command("createCustomer", "POST", "/api/v1/customers", input, createKey),
    );
    expect(created.customer).toMatchObject({ ownerUserId: fixtures.syntheticIds.salesA, version: 1 });

    const updateInput = { ...input, nameEn: "Current Customer", expectedVersion: 1 };
    const path = `/api/v1/customers/${created.customer.id}`;
    const updated = await customers.updateCustomer(
      actor,
      created.customer.id,
      updateInput,
      command("updateCustomer", "PUT", path, updateInput),
    );
    expect(updated.customer.version).toBe(2);

    const replayed = await customers.createCustomer(
      actor,
      input,
      command("createCustomer", "POST", "/api/v1/customers", input, createKey),
    );
    expect(replayed).toMatchObject({
      status: 200,
      replayed: true,
      customer: { id: created.customer.id, version: 2, nameEn: "Current Customer" },
    });
    const storedCustomers = await database.select().from(schema.customer);
    const audits = await database.select().from(schema.auditEvent);
    const idempotency = await database.select().from(schema.idempotencyRecord);
    expect(storedCustomers).toHaveLength(1);
    expect(audits).toHaveLength(2);
    expect(idempotency).toHaveLength(2);
  });

  it("serializes same-key bodies and cross-endpoint commands", async () => {
    const actor = identity(fixtures.syntheticIds.salesA, "sales");
    const sameKey = randomUUID();
    const sameCommand = command("createCustomer", "POST", "/api/v1/customers", input, sameKey);
    const sameBody = await Promise.all([
      customers.createCustomer(actor, input, sameCommand),
      customers.createCustomer(actor, input, sameCommand),
    ]);
    expect(sameBody.map((result) => result.status).sort()).toEqual([200, 201]);
    expect(sameBody[0]?.customer.id).toBe(sameBody[1]?.customer.id);

    const changedInput = { ...input, nameEn: "Different Synthetic Customer" };
    const differentKey = randomUUID();
    const differentBody = await Promise.allSettled([
      customers.createCustomer(actor, input, command("createCustomer", "POST", "/api/v1/customers", input, differentKey)),
      customers.createCustomer(actor, changedInput, command("createCustomer", "POST", "/api/v1/customers", changedInput, differentKey)),
    ]);
    expect(differentBody.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect(differentBody.find((result) => result.status === "rejected")).toMatchObject({
      reason: { status: 409, code: "IDEMPOTENCY_CONFLICT" },
    });

    const catalog = await import("../../../src/server/modules/catalog/service");
    const productInput = {
      sku: "CROSS-ENDPOINT-SKU",
      nameCn: "跨接口商品",
      nameEn: "Cross endpoint product",
      spec: "Synthetic only",
      unit: "piece",
      refPrice: "1.00",
      currency: "USD",
      hsCode: "000000",
      remark: "",
    };
    const crossKey = randomUUID();
    const crossEndpoint = await Promise.allSettled([
      customers.createCustomer(actor, input, command("createCustomer", "POST", "/api/v1/customers", input, crossKey)),
      catalog.createProduct(actor, productInput, command("createProduct", "POST", "/api/v1/products", productInput, crossKey)),
    ]);
    expect(crossEndpoint.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect(crossEndpoint.find((result) => result.status === "rejected")).toMatchObject({
      reason: { status: 409, code: "IDEMPOTENCY_CONFLICT" },
    });
  });

  // @tier durable CUST-02 SCOPE-01 SCOPE-03
  it("keeps list counts and details inside the current role scope", async () => {
    const salesA = identity(fixtures.syntheticIds.salesA, "sales");
    const salesB = identity(fixtures.syntheticIds.salesB, "sales");
    await customers.createCustomer(salesA, input, command("createCustomer", "POST", "/api/v1/customers", input));
    const second = await customers.createCustomer(salesA, input, command("createCustomer", "POST", "/api/v1/customers", input));
    await customers.createCustomer(salesB, input, command("createCustomer", "POST", "/api/v1/customers", input));

    const page = await customers.listCustomers(salesA, pagination(3, 1, "shared"));
    expect(page).toMatchObject({ items: [], total: 2, totalPages: 2 });
    const bossPage = await customers.listCustomers(identity(fixtures.syntheticIds.boss, "boss"), pagination(1, 20, "shared"));
    expect(bossPage.total).toBe(3);
    await expect(customers.getCustomer(salesB, second.customer.id)).rejects.toMatchObject({ status: 404 });
    for (const role of ["admin", "doc", "fin"] as const) {
      const id = fixtures.syntheticIds[role];
      await expect(customers.listCustomers(identity(id, role), pagination())).rejects.toMatchObject({ status: 403 });
    }
  });
});
