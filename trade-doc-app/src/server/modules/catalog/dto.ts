import { z } from "zod";

import { readJsonDto, strictDto } from "../../shared/dto";
import { validationError } from "../../shared/errors";
import { normalizeDecimal } from "../../shared/money";

const productFields = {
  sku: z.string().min(1).max(64),
  nameCn: z.string().min(1).max(200),
  nameEn: z.string().min(1).max(200),
  spec: z.string().max(1000),
  unit: z.string().min(1).max(30),
  refPrice: z.string(),
  currency: z.string().regex(/^[A-Z]{3}$/).length(3),
  hsCode: z.string().max(30),
  remark: z.string().max(2000),
};

export const productCreateDto = strictDto(productFields);
export const productUpdateDto = strictDto({
  expectedVersion: z.number().int().min(1).max(2147483647),
  ...productFields,
  enabled: z.boolean(),
});

export type ProductCreateInput = z.output<typeof productCreateDto>;
export type ProductUpdateInput = z.output<typeof productUpdateDto>;

export function normalizeSku(value: string): string {
  const sku = value.trim().toUpperCase();
  if (sku.length === 0 || sku.length > 64) {
    throw validationError("SKU 不符合要求", [
      {
        path: "/sku",
        code: "invalid_sku",
        message: "SKU 修剪后须为 1 至 64 个字符",
      },
    ]);
  }
  return sku;
}

function normalizeProduct<T extends { sku: string; refPrice: string }>(
  input: T,
): T {
  return {
    ...input,
    sku: normalizeSku(input.sku),
    refPrice: normalizeDecimal(input.refPrice, { path: "/refPrice" }),
  };
}

export async function parseProductCreateRequest(
  request: Request,
): Promise<ProductCreateInput> {
  return normalizeProduct(await readJsonDto(request, productCreateDto));
}

export async function parseProductUpdateRequest(
  request: Request,
): Promise<ProductUpdateInput> {
  return normalizeProduct(await readJsonDto(request, productUpdateDto));
}
