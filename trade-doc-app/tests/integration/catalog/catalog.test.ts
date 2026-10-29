import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";

import type { AuthIdentity, Role } from "../../../src/server/auth";
import { auditEvent, currencyCatalog } from "../../../src/server/db/schema";
import type { ProductCreateInput } from "../../../src/server/modules/catalog/dto";
import { parsePagination } from "../../../src/server/shared/http";
import { seedSyntheticBase, syntheticIds } from "../db/fixtures";
import { resetDatabase } from "../db/reset";

const databaseReady =
  Boolean(process.env.DATABASE_URL) &&
  process.env.TRADE_DOC_ALLOW_TEST_RESET === "true";
const describeDatabase = databaseReady ? describe : describe.skip;

function identity(role: Role): AuthIdentity {
  const userId = {
    admin: syntheticIds.admin,
    sales: syntheticIds.salesA,
    boss: syntheticIds.boss,
    doc: syntheticIds.doc,
    fin: syntheticIds.fin,
  }[role];
  return {
    sessionId: "integration-session",
    user: {
      id: userId,
      username: `synthetic-${role}`,
      displayName: `Synthetic ${role}`,
      role,
    },
  };
}

const input: ProductCreateInput = {
  sku: "INTEGRATION-SKU",
  nameCn: "集成商品",
  nameEn: "Integration product",
  spec: "Synthetic only",
  unit: "piece",
  refPrice: "12.50",
  currency: "USD",
  hsCode: "000000",
  remark: "",
};

function command(key: string, requestHash = `integration-${key}`) {
  return {
    idempotencyKey: key,
    requestHash,
    requestId: syntheticIds.product,
  };
}

describeDatabase("catalog PostgreSQL integration", () => {
  let db: typeof import("../../../src/server/db").db;
  let service: typeof import("../../../src/server/modules/catalog/service");

  beforeEach(async () => {
    if (!db) {
      const databaseModule = await import("../../../src/server/db");
      db = databaseModule.db;
      service = await import("../../../src/server/modules/catalog/service");
    }
    await resetDatabase(db);
    await db.transaction(async (tx) => {
      await seedSyntheticBase(tx, "synthetic-unused-password-hash");
    });
  });

  it("returns only enabled two-decimal currencies to sales and boss", async () => {
    // @tier live
    await db.update(currencyCatalog).set({ enabled: false }).where(eq(currencyCatalog.code, "EUR"));

    await expect(service.listCurrencies(identity("sales"))).resolves.toEqual({
      items: [{ code: "USD", displayName: "Synthetic USD", amountScale: 2 }],
    });
    await expect(service.listCurrencies(identity("boss"))).resolves.toMatchObject({
      items: [{ code: "USD" }],
    });
  });

  it("shares products across sales and boss with filtered totals and versioned updates", async () => {
    // @tier live
    const created = await service.createProduct(identity("sales"), input, command("00000000-0000-4000-8000-000000000301"));
    expect(created.responseStatus).toBe(201);
    await expect(service.getProduct(identity("boss"), created.result.id)).resolves.toMatchObject({ sku: input.sku });

    const salesB = { ...identity("sales"), user: { ...identity("sales").user, id: syntheticIds.salesB } };
    const page = await service.listProducts(salesB, parsePagination(new URLSearchParams("q=Integration")));
    expect(page).toMatchObject({ total: 1, totalPages: 1 });
    expect(page.items[0]?.id).toBe(created.result.id);

    const updated = await service.updateProduct(
      salesB,
      created.result.id,
      { ...input, nameEn: "Updated integration product", expectedVersion: 1, enabled: false },
      command("00000000-0000-4000-8000-000000000302"),
    );
    expect(updated.result).toMatchObject({ version: 2, enabled: false, refPrice: "12.50" });
    const audits = await db.select().from(auditEvent).where(eq(auditEvent.resourceId, created.result.id));
    expect(audits).toHaveLength(2);
  });

  it("serializes same-key concurrent creates and rejects a different body", async () => {
    // @tier live
    const sameCommand = command("00000000-0000-4000-8000-000000000310");
    const sameBody = await Promise.all([
      service.createProduct(identity("sales"), input, sameCommand),
      service.createProduct(identity("sales"), input, sameCommand),
    ]);
    expect(sameBody.map((result) => result.responseStatus).sort()).toEqual([200, 201]);
    expect(sameBody[0]?.result.id).toBe(sameBody[1]?.result.id);

    const results = await Promise.allSettled([
      service.createProduct(identity("sales"), { ...input, sku: "CONFLICT-SKU-A" }, command("00000000-0000-4000-8000-000000000311", "body-a")),
      service.createProduct(identity("sales"), { ...input, sku: "CONFLICT-SKU-B" }, command("00000000-0000-4000-8000-000000000311", "body-b")),
    ]);
    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect(results.find((result) => result.status === "rejected")).toMatchObject({
      reason: { status: 409, code: "IDEMPOTENCY_CONFLICT" },
    });
  });

  it("enforces the database-backed duplicate SKU boundary", async () => {
    // @tier live
    await service.createProduct(identity("sales"), input, command("00000000-0000-4000-8000-000000000303"));
    await expect(
      service.createProduct(identity("sales"), input, command("00000000-0000-4000-8000-000000000304")),
    ).rejects.toMatchObject({ status: 409, code: "DUPLICATE_SKU" });
  });

  it("rejects stale versions and non-sales writes without a success audit", async () => {
    // @tier live
    const created = await service.createProduct(identity("sales"), input, command("00000000-0000-4000-8000-000000000305"));
    await expect(
      service.createProduct(identity("boss"), { ...input, sku: "BOSS-SKU" }, command("00000000-0000-4000-8000-000000000306")),
    ).rejects.toMatchObject({ status: 403 });
    await expect(
      service.updateProduct(
        identity("sales"),
        created.result.id,
        { ...input, expectedVersion: 2, enabled: true },
        command("00000000-0000-4000-8000-000000000307"),
      ),
    ).rejects.toMatchObject({ status: 409, currentVersion: 1 });
    const audits = await db.select().from(auditEvent).where(eq(auditEvent.resourceId, created.result.id));
    expect(audits).toHaveLength(1);
  });

  it("replays the same key as the current representation without another audit", async () => {
    // @tier live
    const original = command("00000000-0000-4000-8000-000000000308");
    const created = await service.createProduct(identity("sales"), input, original);
    await service.updateProduct(
      identity("sales"),
      created.result.id,
      { ...input, nameEn: "Current database representation", expectedVersion: 1, enabled: true },
      command("00000000-0000-4000-8000-000000000309"),
    );

    const replay = await service.createProduct(identity("sales"), input, original);
    expect(replay).toMatchObject({
      responseStatus: 200,
      replayed: true,
      result: { version: 2, nameEn: "Current database representation" },
    });
    const audits = await db.select().from(auditEvent).where(eq(auditEvent.resourceId, created.result.id));
    expect(audits).toHaveLength(2);
  });
});
