export {
  parseProductCreateRequest,
  parseProductUpdateRequest,
  normalizeSku,
} from "./dto";
export type { ProductCreateInput, ProductUpdateInput } from "./dto";
export { handleCatalogApi } from "./http";
export {
  createProduct,
  getProduct,
  listCurrencies,
  listProducts,
  updateProduct,
} from "./service";
export type { Product, ProductWriteResult } from "./factory";
