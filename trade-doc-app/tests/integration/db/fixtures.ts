import type { DbTransaction } from "../../../src/server/db";
import {
  appUser,
  companyProfile,
  currencyCatalog,
  product,
} from "../../../src/server/db/schema";

export const syntheticIds = {
  admin: "00000000-0000-4000-8000-000000000001",
  salesA: "00000000-0000-4000-8000-000000000002",
  salesB: "00000000-0000-4000-8000-000000000003",
  boss: "00000000-0000-4000-8000-000000000004",
  doc: "00000000-0000-4000-8000-000000000005",
  fin: "00000000-0000-4000-8000-000000000006",
  companyProfile: "00000000-0000-4000-8000-000000000101",
  product: "00000000-0000-4000-8000-000000000102",
} as const;

export function createSyntheticProductSnapshot() {
  return {
    productId: syntheticIds.product,
    productVersion: 1,
    sku: "SYNTHETIC-SKU-001",
    nameCn: "合成商品",
    nameEn: "Synthetic product",
    spec: "Test use only",
    unit: "piece",
    hsCode: "000000",
    schemaVersion: 1,
  };
}

export function createSyntheticTradeSnapshot() {
  return {
    snapshotVersion: 1,
    submittedQuoteVersion: 2,
    seller: {
      companyProfileId: syntheticIds.companyProfile,
      companyProfileVersion: 1,
      legalName: "Synthetic Company Ltd.",
      address: "1 Test Only Road",
      contact: "Synthetic contact",
      email: "synthetic@example.invalid",
      phone: "+86-000-0000",
      schemaVersion: 1,
    },
    customer: {
      customerId: "00000000-0000-4000-8000-000000000103",
      customerVersion: 1,
      nameCn: "合成客户",
      nameEn: "Synthetic Customer Ltd.",
      country: "Testland",
      contact: "Synthetic buyer",
      email: "buyer@example.invalid",
      phone: "+1-000-0000",
      address: "2 Test Only Road",
      schemaVersion: 1,
    },
    quoteDate: "2026-01-02",
    validUntil: "2026-01-17",
    currency: "USD",
    tradeTerm: "FOB TEST PORT",
    paymentTerm: "Synthetic payment term",
    remark: "Test use only",
    items: [
      {
        lineNo: 1,
        product: createSyntheticProductSnapshot(),
        quantity: "1.00",
        unitPrice: "10.00",
        lineAmount: "10.00",
        schemaVersion: 1,
      },
    ],
    totalAmount: "10.00",
    frozenAt: "2026-01-02T01:00:00.000Z",
    schemaVersion: 1,
  };
}

export async function seedSyntheticBase(
  transaction: DbTransaction,
  passwordHash: string,
) {
  const users = [
    ["admin", "admin"],
    ["salesA", "sales"],
    ["salesB", "sales"],
    ["boss", "boss"],
    ["doc", "doc"],
    ["fin", "fin"],
  ] as const;

  await transaction.insert(appUser).values(
    users.map(([key, roleCode]) => ({
      id: syntheticIds[key],
      loginKey: `synthetic-${key}`,
      displayName: `Synthetic ${key}`,
      passwordHash,
      roleCode,
      enabled: true,
    })),
  );

  await transaction.insert(currencyCatalog).values([
    { code: "USD", displayName: "Synthetic USD", amountScale: 2, enabled: true },
    { code: "EUR", displayName: "Synthetic EUR", amountScale: 2, enabled: true },
    { code: "JPY", displayName: "Synthetic JPY", amountScale: 0, enabled: true },
    { code: "KWD", displayName: "Synthetic KWD", amountScale: 3, enabled: true },
  ]);

  await transaction.insert(companyProfile).values({
    id: syntheticIds.companyProfile,
    nameCn: "合成公司",
    nameEn: "Synthetic Company",
    legalName: "Synthetic Company Ltd.",
    address: "1 Test Only Road",
    contact: "Synthetic contact",
    email: "synthetic@example.invalid",
    phone: "+86-000-0000",
    profileKey: "PRIMARY_COMPANY",
    createdBy: syntheticIds.admin,
  });

  await transaction.insert(product).values({
    id: syntheticIds.product,
    sku: "SYNTHETIC-SKU-001",
    nameCn: "合成商品",
    nameEn: "Synthetic product",
    spec: "Test use only",
    unit: "piece",
    refPrice: "10.00",
    currency: "USD",
    hsCode: "000000",
    remark: "Test use only",
    createdBy: syntheticIds.salesA,
  });
}
