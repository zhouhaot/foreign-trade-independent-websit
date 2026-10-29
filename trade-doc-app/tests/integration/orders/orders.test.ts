import { count, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import {
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from "vitest";

import * as schema from "../../../src/server/db/schema";
import {
  auditEvent,
  idempotencyRecord,
  orderLine,
  orderVersion,
  quote,
  salesOrder,
} from "../../../src/server/db/schema";
import { resetDatabase } from "../db/reset";
import {
  orderCommand,
  orderDependencies,
  orderFixtureIds,
  orderIdentity,
  orderInput,
  seedConfirmedQuote,
} from "./fixtures";

const databaseUrl = process.env.DATABASE_URL;
const runDatabaseTests =
  process.env.TRADE_DOC_RUN_DB_TESTS === "true" &&
  process.env.TRADE_DOC_ALLOW_TEST_RESET === "true" &&
  Boolean(databaseUrl);

describe.skipIf(!runDatabaseTests)("orders on real PostgreSQL", () => {
  let database: (typeof import("../../../src/server/db"))["db"];
  let orders: typeof import("../../../src/server/modules/orders/service");

  beforeAll(async () => {
    ({ db: database } = await import("../../../src/server/db"));
    orders = await import("../../../src/server/modules/orders/service");
  });

  beforeEach(async () => {
    await resetDatabase(database);
    await database.transaction(seedConfirmedQuote);
  });

  async function conversionCounts() {
    const tables = [
      salesOrder,
      orderVersion,
      orderLine,
      idempotencyRecord,
      auditEvent,
    ] as const;
    const values = await Promise.all(
      tables.map(async (table) => {
        const rows = await database
          .select({ total: count() })
          .from(table);
        return rows[0]?.total ?? 0;
      }),
    );
    return {
      orders: values[0],
      versions: values[1],
      lines: values[2],
      idempotency: values[3],
      audits: values[4],
    };
  }

  it("ORDER-01 creates one V1 with every confirmed line and independent progress", async () => {
    // @tier durable
    const result = await orders.createOrderFromQuote(
      orderIdentity("salesA"),
      orderFixtureIds.quote,
      orderInput,
      orderCommand(),
      orderDependencies,
    );

    expect(result.status).toBe(201);
    expect(result.replayed).toBe(false);
    expect(result.order).toMatchObject({
      ownerUserId: orderIdentity("salesA").user.id,
      sourceQuoteId: orderFixtureIds.quote,
      sourceQuoteSnapshotVersion: 1,
      customerConfirmationId: orderFixtureIds.confirmation,
      deliveryDate: "2026-02-01",
      orderProgress: "PENDING_EXECUTION",
      documentProgress: "NOT_STARTED",
      paymentProgress: "UNPAID",
      version: 1,
    });
    expect(result.order.trade.items).toHaveLength(2);
    expect(result.order.trade.totalAmount).toBe("15.00");
    expect(await conversionCounts()).toEqual({
      orders: 1,
      versions: 1,
      lines: 2,
      idempotency: 1,
      audits: 1,
    });
    const source = await database
      .select()
      .from(quote)
      .where(eq(quote.id, orderFixtureIds.quote));
    expect(source[0]).toMatchObject({ state: "CONFIRMED", rowVersion: 4 });
    expect(source[0]?.convertedAt).not.toBeNull();
    expect(
      await orders.getOrder(orderIdentity("salesA"), result.order.id),
    ).toEqual(result.order);
  });

  it("ORDER-02 rejects unconfirmed, expired and invalid-delivery first conversions without writes", async () => {
    // @tier durable
    await database
      .update(quote)
      .set({ state: "AWAITING_CUSTOMER" })
      .where(eq(quote.id, orderFixtureIds.quote));
    await expect(
      orders.createOrderFromQuote(
        orderIdentity("salesA"),
        orderFixtureIds.quote,
        orderInput,
        orderCommand(),
        orderDependencies,
      ),
    ).rejects.toMatchObject({ status: 409, code: "STATE_CONFLICT" });

    await database
      .update(quote)
      .set({ state: "CONFIRMED", validUntil: "2026-01-09" })
      .where(eq(quote.id, orderFixtureIds.quote));
    await expect(
      orders.createOrderFromQuote(
        orderIdentity("salesA"),
        orderFixtureIds.quote,
        orderInput,
        orderCommand(),
        orderDependencies,
      ),
    ).rejects.toMatchObject({ status: 422, code: "QUOTE_EXPIRED" });

    await database
      .update(quote)
      .set({ validUntil: "2026-01-17" })
      .where(eq(quote.id, orderFixtureIds.quote));
    await expect(
      orders.createOrderFromQuote(
        orderIdentity("salesA"),
        orderFixtureIds.quote,
        { ...orderInput, deliveryDate: "2026-01-01" },
        orderCommand(randomUUIDInput(), {
          ...orderInput,
          deliveryDate: "2026-01-01",
        }),
        orderDependencies,
      ),
    ).rejects.toMatchObject({ status: 422, code: "VALIDATION_ERROR" });
    expect(await conversionCounts()).toEqual({
      orders: 0,
      versions: 0,
      lines: 0,
      idempotency: 0,
      audits: 0,
    });
  });

  it("serializes same-key same-body and different-body concurrent conversions", async () => {
    // @tier durable
    const sameCommand = orderCommand();
    const sameBody = await Promise.all([
      orders.createOrderFromQuote(orderIdentity("salesA"), orderFixtureIds.quote, orderInput, sameCommand, orderDependencies),
      orders.createOrderFromQuote(orderIdentity("salesA"), orderFixtureIds.quote, orderInput, sameCommand, orderDependencies),
    ]);
    expect(sameBody.map((result) => result.status).sort()).toEqual([200, 201]);
    expect(sameBody[0]?.order.id).toBe(sameBody[1]?.order.id);
    expect(await conversionCounts()).toMatchObject({ orders: 1, idempotency: 1, audits: 1 });
  });

  it("rejects a different conversion body racing on the same key", async () => {
    // @tier durable
    const key = randomUUIDInput();
    const changedInput = { ...orderInput, deliveryDate: "2026-02-02" };
    const results = await Promise.allSettled([
      orders.createOrderFromQuote(orderIdentity("salesA"), orderFixtureIds.quote, orderInput, orderCommand(key), orderDependencies),
      orders.createOrderFromQuote(orderIdentity("salesA"), orderFixtureIds.quote, changedInput, orderCommand(key, changedInput), orderDependencies),
    ]);
    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect(results.find((result) => result.status === "rejected")).toMatchObject({
      reason: { status: 409, code: "IDEMPOTENCY_CONFLICT" },
    });
    expect(await conversionCounts()).toMatchObject({ orders: 1, idempotency: 1, audits: 1 });
  });

  it("uses BUSINESS_TIME_ZONE for order date guards", async () => {
    // @tier durable
    const originalTimeZone = process.env.BUSINESS_TIME_ZONE;
    process.env.BUSINESS_TIME_ZONE = "America/Los_Angeles";
    const input = { ...orderInput, deliveryDate: "2026-01-09" };
    try {
      await database.update(schema.quoteConfirmation).set({ confirmedOn: "2026-01-09" }).where(eq(schema.quoteConfirmation.id, orderFixtureIds.confirmation));
      const result = await orders.createOrderFromQuote(
        orderIdentity("salesA"),
        orderFixtureIds.quote,
        input,
        orderCommand(randomUUIDInput(), input),
        orderDependencies,
      );
      expect(result.status).toBe(201);
      expect(result.order.deliveryDate).toBe("2026-01-09");
    } finally {
      if (originalTimeZone === undefined) {
        delete process.env.BUSINESS_TIME_ZONE;
      } else {
        process.env.BUSINESS_TIME_ZONE = originalTimeZone;
      }
    }
  });

  it("ORDER-03 serializes different-key concurrent creation to one order and one audit", async () => {
    // @tier durable
    const results = await Promise.all([
      orders.createOrderFromQuote(
        orderIdentity("salesA"),
        orderFixtureIds.quote,
        orderInput,
        orderCommand(),
        orderDependencies,
      ),
      orders.createOrderFromQuote(
        orderIdentity("salesA"),
        orderFixtureIds.quote,
        orderInput,
        orderCommand(),
        orderDependencies,
      ),
    ]);

    expect(results.map((result) => result.status).sort()).toEqual([200, 201]);
    expect(results[0]?.order.id).toBe(results[1]?.order.id);
    expect(await conversionCounts()).toEqual({
      orders: 1,
      versions: 1,
      lines: 2,
      idempotency: 2,
      audits: 1,
    });
  });

  it("ORDER-04 rejects a different delivery date after conversion", async () => {
    // @tier durable
    const created = await orders.createOrderFromQuote(
      orderIdentity("salesA"),
      orderFixtureIds.quote,
      orderInput,
      orderCommand(),
      orderDependencies,
    );
    const changedInput = { ...orderInput, deliveryDate: "2026-03-01" };
    await expect(
      orders.createOrderFromQuote(
        orderIdentity("salesA"),
        orderFixtureIds.quote,
        changedInput,
        orderCommand(randomUUIDInput(), changedInput),
        orderDependencies,
      ),
    ).rejects.toMatchObject({
      status: 409,
      code: "SOURCE_ALREADY_CONVERTED",
    });
    expect(await conversionCounts()).toMatchObject({
      orders: 1,
      versions: 1,
      lines: 2,
      audits: 1,
    });
    expect(
      (await orders.getOrder(orderIdentity("salesA"), created.order.id))
        .deliveryDate,
    ).toBe("2026-02-01");
  });

  it("ORDER-05 replays by key or same delivery date despite later expiry and version growth", async () => {
    // @tier durable
    const command = orderCommand();
    const created = await orders.createOrderFromQuote(
      orderIdentity("salesA"),
      orderFixtureIds.quote,
      orderInput,
      command,
      orderDependencies,
    );
    await database
      .update(quote)
      .set({ validUntil: "2026-01-03", rowVersion: 99 })
      .where(eq(quote.id, orderFixtureIds.quote));

    const sameKey = await orders.createOrderFromQuote(
      orderIdentity("salesA"),
      orderFixtureIds.quote,
      orderInput,
      command,
      orderDependencies,
    );
    const sameDateNewKey = await orders.createOrderFromQuote(
      orderIdentity("salesA"),
      orderFixtureIds.quote,
      { ...orderInput, expectedVersion: 3 },
      orderCommand(),
      orderDependencies,
    );
    expect(sameKey).toMatchObject({ status: 200, replayed: true });
    expect(sameDateNewKey).toMatchObject({ status: 200, replayed: true });
    expect(sameKey.order.id).toBe(created.order.id);
    expect(sameDateNewKey.order.id).toBe(created.order.id);
    expect(await conversionCounts()).toEqual({
      orders: 1,
      versions: 1,
      lines: 2,
      idempotency: 2,
      audits: 1,
    });
  });

  it("SCOPE-01/02/03 applies the same owner filter to detail, search and totals", async () => {
    // @tier durable
    const created = await orders.createOrderFromQuote(
      orderIdentity("salesA"),
      orderFixtureIds.quote,
      orderInput,
      orderCommand(),
      orderDependencies,
    );
    await expect(
      orders.getOrder(orderIdentity("salesB"), created.order.id),
    ).rejects.toMatchObject({ status: 404, code: "NOT_FOUND" });
    await expect(
      orders.getOrder(orderIdentity("admin"), created.order.id),
    ).rejects.toMatchObject({ status: 403, code: "FORBIDDEN_ROLE" });
    await expect(
      orders.createOrderFromQuote(
        orderIdentity("boss"),
        orderFixtureIds.quote,
        orderInput,
        orderCommand(),
        orderDependencies,
      ),
    ).rejects.toMatchObject({ status: 403, code: "FORBIDDEN_ROLE" });
    await expect(
      orders.createOrderFromQuote(
        orderIdentity("salesB"),
        orderFixtureIds.quote,
        orderInput,
        orderCommand(),
        orderDependencies,
      ),
    ).rejects.toMatchObject({ status: 404, code: "NOT_FOUND" });

    const empty = await orders.listOrders(orderIdentity("salesB"), {
      page: 1,
      pageSize: 20,
      offset: 0,
      q: "Synthetic Customer",
    });
    const owner = await orders.listOrders(orderIdentity("salesA"), {
      page: 2,
      pageSize: 1,
      offset: 1,
      q: "SYNTHETIC-SKU-002",
    });
    const boss = await orders.listOrders(orderIdentity("boss"), {
      page: 1,
      pageSize: 20,
      offset: 0,
      q: "Synthetic Customer",
    });
    expect(empty).toMatchObject({ items: [], total: 0, totalPages: 0 });
    expect(owner).toMatchObject({ items: [], total: 1, totalPages: 1 });
    expect(boss.items).toHaveLength(1);
    expect(boss.total).toBe(1);

    const byId = await orders.listOrders(orderIdentity("salesA"), {
      page: 1,
      pageSize: 20,
      offset: 0,
      q: created.order.id,
    });
    expect(byId).toMatchObject({ total: 1, totalPages: 1 });
    expect(byId.items[0]?.id).toBe(created.order.id);
    for (const q of ["%", "_", "\\"]) {
      const wildcards = await orders.listOrders(orderIdentity("salesA"), {
        page: 1,
        pageSize: 20,
        offset: 0,
        q,
      });
      expect(wildcards).toMatchObject({ items: [], total: 0, totalPages: 0 });
    }
  });

  it("TX-01 rolls back business and idempotency writes when the success audit fails", async () => {
    // @tier durable
    const command = { ...orderCommand(), requestId: "invalid-uuid" };
    await expect(
      orders.createOrderFromQuote(
        orderIdentity("salesA"),
        orderFixtureIds.quote,
        orderInput,
        command,
        orderDependencies,
      ),
    ).rejects.toThrow();
    expect(await conversionCounts()).toEqual({
      orders: 0,
      versions: 0,
      lines: 0,
      idempotency: 0,
      audits: 0,
    });
    expect(
      (await database.select().from(quote))[0]?.convertedAt,
    ).toBeNull();

    const retry = await orders.createOrderFromQuote(
      orderIdentity("salesA"),
      orderFixtureIds.quote,
      orderInput,
      { ...command, requestId: randomUUIDInput() },
      orderDependencies,
    );
    expect(retry.status).toBe(201);
  });

  it("RESTART-01 preserves snapshots and replay semantics across a fresh database connection", async () => {
    // @tier durable
    const command = orderCommand();
    const created = await orders.createOrderFromQuote(
      orderIdentity("salesA"),
      orderFixtureIds.quote,
      orderInput,
      command,
      orderDependencies,
    );
    const client = postgres(databaseUrl!, { max: 1 });
    const freshDatabase = drizzle(client, { schema });
    try {
      expect(
        await orders.getOrder(
          orderIdentity("salesA"),
          created.order.id,
          freshDatabase,
        ),
      ).toEqual(created.order);
      const replayed = await orders.createOrderFromQuote(
        orderIdentity("salesA"),
        orderFixtureIds.quote,
        orderInput,
        command,
        {
          ...orderDependencies,
          runTransaction: (work) => freshDatabase.transaction(work),
        },
      );
      expect(replayed).toMatchObject({ status: 200, replayed: true });
      expect(replayed.order).toEqual(created.order);
    } finally {
      await client.end({ timeout: 1 });
    }
  });
});

function randomUUIDInput(): string {
  return crypto.randomUUID();
}
