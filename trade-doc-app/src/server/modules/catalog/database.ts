import { and, asc, count, desc, eq, ilike, or } from "drizzle-orm";

import { db, schema, type DbTransaction } from "../../db";
import type { Pagination } from "../../shared/http";
import {
  lockActorIdempotencyKey,
  type AuditEvent,
  type AuditStore,
  type IdempotencyRecord,
  type IdempotencyStore,
} from "../../shared/transactions";
import type { ProductCreateInput } from "./dto";
import type {
  CatalogReadStore,
  CatalogWriteStore,
  ProductRow,
  ProductUpdateValues,
} from "./factory";

const productFields = {
  id: schema.product.id,
  sku: schema.product.sku,
  nameCn: schema.product.nameCn,
  nameEn: schema.product.nameEn,
  spec: schema.product.spec,
  unit: schema.product.unit,
  refPrice: schema.product.refPrice,
  currency: schema.product.currency,
  enabled: schema.product.enabled,
  hsCode: schema.product.hsCode,
  remark: schema.product.remark,
  createdAt: schema.product.createdAt,
  createdBy: schema.product.createdBy,
  updatedAt: schema.product.updatedAt,
  rowVersion: schema.product.rowVersion,
};

function searchCondition(q: string) {
  if (q.length === 0) return undefined;
  const escaped = q.replaceAll("\\", "\\\\").replaceAll("%", "\\%").replaceAll("_", "\\_");
  const pattern = `%${escaped}%`;
  return or(
    ilike(schema.product.sku, pattern),
    ilike(schema.product.nameCn, pattern),
    ilike(schema.product.nameEn, pattern),
  );
}

export const catalogReadStore: CatalogReadStore = {
  async listCurrencies() {
    return db
      .select({
        code: schema.currencyCatalog.code,
        displayName: schema.currencyCatalog.displayName,
        amountScale: schema.currencyCatalog.amountScale,
      })
      .from(schema.currencyCatalog)
      .where(
        and(
          eq(schema.currencyCatalog.enabled, true),
          eq(schema.currencyCatalog.amountScale, 2),
        ),
      )
      .orderBy(asc(schema.currencyCatalog.code));
  },

  async listProducts(pagination: Pagination) {
    const where = searchCondition(pagination.q);
    const [items, totals] = await Promise.all([
      db
        .select(productFields)
        .from(schema.product)
        .where(where)
        .orderBy(desc(schema.product.createdAt), desc(schema.product.id))
        .limit(pagination.pageSize)
        .offset(pagination.offset),
      db.select({ total: count() }).from(schema.product).where(where),
    ]);
    return { items, total: totals[0]?.total ?? 0 };
  },

  async findProduct(id: string) {
    const rows = await db
      .select(productFields)
      .from(schema.product)
      .where(eq(schema.product.id, id))
      .limit(1);
    return rows[0] ?? null;
  },
};

export const catalogWriteStore: CatalogWriteStore<DbTransaction> = {
  async isCurrencyEnabled(tx, code) {
    const rows = await tx
      .select({ code: schema.currencyCatalog.code })
      .from(schema.currencyCatalog)
      .where(
        and(
          eq(schema.currencyCatalog.code, code),
          eq(schema.currencyCatalog.enabled, true),
          eq(schema.currencyCatalog.amountScale, 2),
        ),
      )
      .limit(1);
    return rows.length === 1;
  },

  async insertProduct(tx, input: ProductCreateInput, actorUserId: string) {
    const rows = await tx
      .insert(schema.product)
      .values({ ...input, enabled: true, createdBy: actorUserId })
      .returning(productFields);
    return rows[0]!;
  },

  async lockProduct(tx, id) {
    const rows = await tx
      .select(productFields)
      .from(schema.product)
      .where(eq(schema.product.id, id))
      .limit(1)
      .for("update");
    return rows[0] ?? null;
  },

  async updateProduct(
    tx,
    id,
    expectedVersion,
    input: ProductUpdateValues,
  ): Promise<ProductRow | null> {
    const rows = await tx
      .update(schema.product)
      .set({
        ...input,
        rowVersion: expectedVersion + 1,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(schema.product.id, id),
          eq(schema.product.rowVersion, expectedVersion),
        ),
      )
      .returning(productFields);
    return rows[0] ?? null;
  },
};

export const catalogIdempotencyStore: IdempotencyStore<DbTransaction> = {
  async find(tx, actorUserId, idempotencyKey): Promise<IdempotencyRecord | null> {
    await lockActorIdempotencyKey(tx, actorUserId, idempotencyKey);
    const rows = await tx
      .select()
      .from(schema.idempotencyRecord)
      .where(
        and(
          eq(schema.idempotencyRecord.actorUserId, actorUserId),
          eq(schema.idempotencyRecord.idempotencyKey, idempotencyKey),
        ),
      )
      .limit(1);
    const row = rows[0];
    return row
      ? { ...row, responseStatus: row.responseStatus as 200 | 201 }
      : null;
  },

  async insert(tx, record) {
    await tx.insert(schema.idempotencyRecord).values(record);
  },
};

export const catalogAuditStore: AuditStore<DbTransaction> = {
  async append(tx, event: AuditEvent) {
    await tx.insert(schema.auditEvent).values(event);
  },
};
