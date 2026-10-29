import { describe, expect, it } from "vitest";

import type { AuthIdentity, Role } from "../../../src/server/auth";
import type { ProductCreateInput, ProductUpdateInput } from "../../../src/server/modules/catalog/dto";
import {
  createCatalogService,
  type ProductRow,
} from "../../../src/server/modules/catalog/factory";
import { parsePagination } from "../../../src/server/shared/http";
import type {
  AuditEvent,
  IdempotencyRecord,
} from "../../../src/server/shared/transactions";

const productId = "00000000-0000-4000-8000-000000000201";
const otherProductId = "00000000-0000-4000-8000-000000000202";
const actorId = "00000000-0000-4000-8000-000000000002";
const now = new Date("2026-01-02T01:00:00.000Z");

const createInput: ProductCreateInput = {
  sku: "SKU-001",
  nameCn: "合成商品",
  nameEn: "Synthetic product",
  spec: "Test only",
  unit: "piece",
  refPrice: "10.00",
  currency: "USD",
  hsCode: "000000",
  remark: "",
};

function updateInput(expectedVersion = 1): ProductUpdateInput {
  return { ...createInput, expectedVersion, enabled: true };
}

function productRow(overrides: Partial<ProductRow> = {}): ProductRow {
  return {
    id: productId,
    ...createInput,
    enabled: true,
    createdAt: now,
    createdBy: actorId,
    updatedAt: now,
    rowVersion: 1,
    ...overrides,
  };
}

function identity(role: Role): AuthIdentity {
  return {
    sessionId: "session",
    user: {
      id: actorId,
      username: `synthetic-${role}`,
      displayName: `Synthetic ${role}`,
      role,
    },
  };
}

function command(key: string, requestHash = `hash-${key}`) {
  return { idempotencyKey: key, requestHash, requestId: productId };
}

function duplicateSkuError() {
  return Object.assign(new Error("duplicate"), {
    code: "23505",
    constraint_name: "product_sku_unique",
  });
}

function setup(initialRows: ProductRow[] = []) {
  const tx = { name: "unit-tx" };
  const products = new Map(initialRows.map((row) => [row.id, row]));
  const idempotency = new Map<string, IdempotencyRecord>();
  const audits: AuditEvent[] = [];
  const currencies = new Set(["USD", "EUR"]);
  let generatedId = 0;

  const service = createCatalogService({
    readStore: {
      listCurrencies: async () => [
        { code: "USD", displayName: "Synthetic USD", amountScale: 2 },
      ],
      listProducts: async (pagination) => {
        const query = pagination.q.toLowerCase();
        const filtered = [...products.values()].filter((row) =>
          [row.sku, row.nameCn, row.nameEn].some((value) =>
            value.toLowerCase().includes(query),
          ),
        );
        return {
          items: filtered.slice(pagination.offset, pagination.offset + pagination.pageSize),
          total: filtered.length,
        };
      },
      findProduct: async (id) => products.get(id) ?? null,
    },
    writeStore: {
      isCurrencyEnabled: async (_tx, code) => currencies.has(code),
      insertProduct: async (_tx, input, actorUserId) => {
        if ([...products.values()].some((row) => row.sku === input.sku)) {
          throw duplicateSkuError();
        }
        generatedId += 1;
        const row = productRow({
          ...input,
          id: generatedId === 1 ? productId : otherProductId,
          createdBy: actorUserId,
          enabled: true,
          rowVersion: 1,
        });
        products.set(row.id, row);
        return row;
      },
      lockProduct: async (_tx, id) => products.get(id) ?? null,
      updateProduct: async (_tx, id, expectedVersion, input) => {
        const current = products.get(id);
        if (!current || current.rowVersion !== expectedVersion) return null;
        if (
          [...products.values()].some(
            (row) => row.id !== id && row.sku === input.sku,
          )
        ) {
          throw duplicateSkuError();
        }
        const row = { ...current, ...input, rowVersion: expectedVersion + 1 };
        products.set(id, row);
        return row;
      },
    },
    runTransaction: (work) => work(tx),
    idempotencyStore: {
      find: async (_tx, _actor, key) => idempotency.get(key) ?? null,
      insert: async (_tx, record) => {
        idempotency.set(record.idempotencyKey, record);
      },
    },
    auditStore: {
      append: async (_tx, event) => {
        audits.push(event);
      },
    },
  });

  return { service, products, idempotency, audits, currencies };
}

describe("catalog service contract", () => {
  it("creates an enabled shared product with server actor, version and success audit", async () => {
    // @tier durable
    const { service, products, audits, idempotency } = setup();
    const result = await service.createProduct(identity("sales"), createInput, command("create"));

    expect(result).toMatchObject({
      responseStatus: 201,
      replayed: false,
      result: { version: 1, enabled: true, refPrice: "10.00" },
    });
    expect(products.get(productId)?.createdBy).toBe(actorId);
    expect(audits).toHaveLength(1);
    expect(audits[0]).toMatchObject({
      actorUserId: actorId,
      operationId: "createProduct",
      resourceId: productId,
      beforeVersion: null,
      afterVersion: 1,
    });
    expect(idempotency.get("create")?.resourceId).toBe(productId);
  });

  it("allows sales and boss reads while rejecting all non-sales writes", async () => {
    // @tier durable
    const { service } = setup([productRow()]);
    const pagination = parsePagination(new URLSearchParams());
    await expect(service.listProducts(identity("sales"), pagination)).resolves.toMatchObject({ total: 1 });
    await expect(service.listCurrencies(identity("boss"))).resolves.toMatchObject({ items: [{ code: "USD" }] });

    for (const role of ["boss", "admin", "doc", "fin"] as const) {
      await expect(
        service.createProduct(identity(role), createInput, command(`create-${role}`)),
      ).rejects.toMatchObject({ status: 403, code: "FORBIDDEN_ROLE" });
      await expect(
        service.updateProduct(identity(role), productId, updateInput(), command(`update-${role}`)),
      ).rejects.toMatchObject({ status: 403, code: "FORBIDDEN_ROLE" });
    }
    for (const role of ["admin", "doc", "fin"] as const) {
      await expect(service.listProducts(identity(role), pagination)).rejects.toMatchObject({ status: 403 });
      await expect(service.getProduct(identity(role), productId)).rejects.toMatchObject({ status: 403 });
    }
  });

  it("maps normalized duplicate SKU conflicts on create and update", async () => {
    // @tier durable
    const existing = productRow();
    const other = productRow({ id: otherProductId, sku: "SKU-002" });
    const { service, audits } = setup([existing, other]);

    await expect(
      service.createProduct(identity("sales"), createInput, command("duplicate-create")),
    ).rejects.toMatchObject({ status: 409, code: "DUPLICATE_SKU" });
    await expect(
      service.updateProduct(
        identity("sales"),
        otherProductId,
        updateInput(),
        command("duplicate-update"),
      ),
    ).rejects.toMatchObject({ status: 409, code: "DUPLICATE_SKU" });
    expect(audits).toHaveLength(0);
  });

  it("rejects stale versions with the authorized current version and no writes", async () => {
    // @tier durable
    const current = productRow({ rowVersion: 4 });
    const { service, products, audits, idempotency } = setup([current]);

    await expect(
      service.updateProduct(identity("sales"), productId, updateInput(3), command("stale")),
    ).rejects.toMatchObject({
      status: 409,
      code: "VERSION_CONFLICT",
      currentVersion: 4,
    });
    expect(products.get(productId)).toEqual(current);
    expect(audits).toHaveLength(0);
    expect(idempotency.size).toBe(0);
  });

  it("increments the product version and records before and after versions", async () => {
    // @tier durable
    const { service, audits } = setup([productRow()]);
    const result = await service.updateProduct(
      identity("sales"),
      productId,
      { ...updateInput(), nameEn: "Updated", enabled: false },
      command("update"),
    );

    expect(result.result).toMatchObject({ version: 2, nameEn: "Updated", enabled: false });
    expect(audits[0]).toMatchObject({ beforeVersion: 1, afterVersion: 2 });
  });

  it("replays a successful command as the current product without duplicate effects", async () => {
    // @tier durable
    const { service, products, audits } = setup();
    const originalCommand = command("replay");
    await service.createProduct(identity("sales"), createInput, originalCommand);
    await service.updateProduct(
      identity("sales"),
      productId,
      { ...updateInput(), nameEn: "Current name" },
      command("later-update"),
    );

    const replay = await service.createProduct(identity("sales"), createInput, originalCommand);
    expect(replay).toMatchObject({
      responseStatus: 200,
      replayed: true,
      result: { version: 2, nameEn: "Current name" },
    });
    expect(products.size).toBe(1);
    expect(audits).toHaveLength(2);
  });

  it("rejects disabled currencies and missing products without success records", async () => {
    // @tier durable
    const { service, audits, idempotency } = setup();
    await expect(
      service.createProduct(
        identity("sales"),
        { ...createInput, currency: "XXX" },
        command("bad-currency"),
      ),
    ).rejects.toMatchObject({ status: 422, code: "VALIDATION_ERROR" });
    await expect(
      service.updateProduct(identity("sales"), productId, updateInput(), command("missing")),
    ).rejects.toMatchObject({ status: 404, code: "NOT_FOUND" });
    await expect(service.getProduct(identity("sales"), productId)).rejects.toMatchObject({ status: 404 });
    expect(audits).toHaveLength(0);
    expect(idempotency.size).toBe(0);
  });
});
