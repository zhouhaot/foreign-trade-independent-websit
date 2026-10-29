import { withTransaction } from "../../db";
import {
  catalogAuditStore,
  catalogIdempotencyStore,
  catalogReadStore,
  catalogWriteStore,
} from "./database";
import { createCatalogService } from "./factory";

const catalogService = createCatalogService({
  readStore: catalogReadStore,
  writeStore: catalogWriteStore,
  runTransaction: withTransaction,
  idempotencyStore: catalogIdempotencyStore,
  auditStore: catalogAuditStore,
});

export const listCurrencies = catalogService.listCurrencies;
export const listProducts = catalogService.listProducts;
export const createProduct = catalogService.createProduct;
export const getProduct = catalogService.getProduct;
export const updateProduct = catalogService.updateProduct;
