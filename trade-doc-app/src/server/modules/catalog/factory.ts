import { forbiddenRole } from "../../auth/errors";
import type { AuthIdentity, Role } from "../../auth/types";
import type { product as productTable } from "../../db/schema";
import { ApiError, validationError } from "../../shared/errors";
import { pageResult, type Pagination } from "../../shared/http";
import {
  runIdempotentTransaction,
  type AuditStore,
  type IdempotencyStore,
  type TransactionRunner,
} from "../../shared/transactions";
import type { ProductCreateInput, ProductUpdateInput } from "./dto";

export type ProductRow = typeof productTable.$inferSelect;
export type ProductUpdateValues = Omit<ProductUpdateInput, "expectedVersion">;

export interface Currency {
  code: string;
  displayName: string;
  amountScale: number;
}

export interface Product {
  id: string;
  version: number;
  sku: string;
  nameCn: string;
  nameEn: string;
  spec: string;
  unit: string;
  refPrice: string;
  currency: string;
  hsCode: string;
  remark: string;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CatalogCommand {
  idempotencyKey: string;
  requestHash: string;
  requestId: string;
}

export interface CatalogReadStore {
  listCurrencies(): Promise<Currency[]>;
  listProducts(
    pagination: Pagination,
  ): Promise<{ items: ProductRow[]; total: number }>;
  findProduct(id: string): Promise<ProductRow | null>;
}

export interface CatalogWriteStore<Tx> {
  isCurrencyEnabled(tx: Tx, code: string): Promise<boolean>;
  insertProduct(
    tx: Tx,
    input: ProductCreateInput,
    actorUserId: string,
  ): Promise<ProductRow>;
  lockProduct(tx: Tx, id: string): Promise<ProductRow | null>;
  updateProduct(
    tx: Tx,
    id: string,
    expectedVersion: number,
    input: ProductUpdateValues,
  ): Promise<ProductRow | null>;
}

export interface CatalogServiceOptions<Tx> {
  readStore: CatalogReadStore;
  writeStore: CatalogWriteStore<Tx>;
  runTransaction: TransactionRunner<Tx>;
  idempotencyStore: IdempotencyStore<Tx>;
  auditStore: AuditStore<Tx>;
}

export interface ProductWriteResult {
  result: Product;
  responseStatus: 200 | 201;
  replayed: boolean;
}

function toProduct(row: ProductRow): Product {
  return {
    id: row.id,
    version: row.rowVersion,
    sku: row.sku,
    nameCn: row.nameCn,
    nameEn: row.nameEn,
    spec: row.spec,
    unit: row.unit,
    refPrice: row.refPrice,
    currency: row.currency,
    hsCode: row.hsCode,
    remark: row.remark,
    enabled: row.enabled,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function notFound(): ApiError {
  return new ApiError(404, "NOT_FOUND", "商品不存在或无权访问");
}

function duplicateSku(): ApiError {
  return new ApiError(409, "DUPLICATE_SKU", "SKU 已存在");
}

function isDuplicateSkuError(error: unknown): boolean {
  let current = error;
  for (let depth = 0; depth < 4 && current !== null; depth += 1) {
    if (typeof current !== "object") return false;
    const candidate = current as {
      code?: unknown;
      constraint?: unknown;
      constraint_name?: unknown;
      cause?: unknown;
    };
    if (
      candidate.code === "23505" &&
      (candidate.constraint === "product_sku_unique" ||
        candidate.constraint_name === "product_sku_unique")
    ) {
      return true;
    }
    current = candidate.cause;
  }
  return false;
}

async function requireCurrency<Tx>(
  store: CatalogWriteStore<Tx>,
  tx: Tx,
  code: string,
): Promise<void> {
  if (!(await store.isCurrencyEnabled(tx, code))) {
    throw validationError("币种未启用或不受支持", [
      {
        path: "/currency",
        code: "currency_not_enabled",
        message: "必须选择启用的两位金额币种",
      },
    ]);
  }
}

function requireRole(
  identity: AuthIdentity,
  allowedRoles: readonly Role[],
): void {
  if (!allowedRoles.includes(identity.user.role)) throw forbiddenRole();
}

export function createCatalogService<Tx>(options: CatalogServiceOptions<Tx>) {
  async function listCurrencies(identity: AuthIdentity): Promise<{ items: Currency[] }> {
    requireRole(identity, ["sales", "boss"]);
    return { items: await options.readStore.listCurrencies() };
  }

  async function listProducts(identity: AuthIdentity, pagination: Pagination) {
    requireRole(identity, ["sales", "boss"]);
    const page = await options.readStore.listProducts(pagination);
    return pageResult(page.items.map(toProduct), pagination, page.total);
  }

  async function getProduct(identity: AuthIdentity, id: string): Promise<Product> {
    requireRole(identity, ["sales", "boss"]);
    const row = await options.readStore.findProduct(id);
    if (row === null) throw notFound();
    return toProduct(row);
  }

  async function createProduct(
    identity: AuthIdentity,
    input: ProductCreateInput,
    command: CatalogCommand,
  ): Promise<ProductWriteResult> {
    requireRole(identity, ["sales"]);
    const outcome = await runIdempotentTransaction({
      runTransaction: options.runTransaction,
      idempotencyStore: options.idempotencyStore,
      auditStore: options.auditStore,
      actorUserId: identity.user.id,
      idempotencyKey: command.idempotencyKey,
      operationId: "createProduct",
      requestHash: command.requestHash,
      resourceType: "product",
      requestId: command.requestId,
      work: async (tx) => {
        await requireCurrency(options.writeStore, tx, input.currency);
        let row: ProductRow;
        try {
          row = await options.writeStore.insertProduct(tx, input, identity.user.id);
        } catch (error) {
          if (isDuplicateSkuError(error)) throw duplicateSku();
          throw error;
        }
        return {
          result: toProduct(row),
          resourceId: row.id,
          responseStatus: 201 as const,
          beforeVersion: null,
          afterVersion: row.rowVersion,
        };
      },
    });

    if (outcome.kind === "replayed") {
      return {
        result: await getProduct(identity, outcome.resourceId),
        responseStatus: 200,
        replayed: true,
      };
    }
    return {
      result: outcome.result,
      responseStatus: outcome.responseStatus,
      replayed: false,
    };
  }

  async function updateProduct(
    identity: AuthIdentity,
    id: string,
    input: ProductUpdateInput,
    command: CatalogCommand,
  ): Promise<ProductWriteResult> {
    requireRole(identity, ["sales"]);
    const outcome = await runIdempotentTransaction({
      runTransaction: options.runTransaction,
      idempotencyStore: options.idempotencyStore,
      auditStore: options.auditStore,
      actorUserId: identity.user.id,
      idempotencyKey: command.idempotencyKey,
      operationId: "updateProduct",
      requestHash: command.requestHash,
      resourceType: "product",
      requestId: command.requestId,
      work: async (tx) => {
        const existing = await options.writeStore.lockProduct(tx, id);
        if (existing === null) throw notFound();
        if (existing.rowVersion !== input.expectedVersion) {
          throw new ApiError(409, "VERSION_CONFLICT", "商品版本已变化", {
            currentVersion: existing.rowVersion,
          });
        }
        const changes: ProductUpdateValues = {
          sku: input.sku,
          nameCn: input.nameCn,
          nameEn: input.nameEn,
          spec: input.spec,
          unit: input.unit,
          refPrice: input.refPrice,
          currency: input.currency,
          hsCode: input.hsCode,
          remark: input.remark,
          enabled: input.enabled,
        };
        await requireCurrency(options.writeStore, tx, input.currency);
        let row: ProductRow | null;
        try {
          row = await options.writeStore.updateProduct(
            tx,
            id,
            input.expectedVersion,
            changes,
          );
        } catch (error) {
          if (isDuplicateSkuError(error)) throw duplicateSku();
          throw error;
        }
        if (row === null) {
          const current = await options.writeStore.lockProduct(tx, id);
          if (current === null) throw notFound();
          throw new ApiError(409, "VERSION_CONFLICT", "商品版本已变化", {
            currentVersion: current.rowVersion,
          });
        }
        return {
          result: toProduct(row),
          resourceId: row.id,
          responseStatus: 200 as const,
          beforeVersion: existing.rowVersion,
          afterVersion: row.rowVersion,
        };
      },
    });

    if (outcome.kind === "replayed") {
      return {
        result: await getProduct(identity, outcome.resourceId),
        responseStatus: 200,
        replayed: true,
      };
    }
    return {
      result: outcome.result,
      responseStatus: outcome.responseStatus,
      replayed: false,
    };
  }

  return {
    listCurrencies,
    listProducts,
    createProduct,
    getProduct,
    updateProduct,
  };
}
