import { randomUUID } from "node:crypto";

import type { AuthIdentity, Role } from "../../../src/server/auth";
import type { DbTransaction } from "../../../src/server/db";
import {
  customer,
  inquiry,
  inquiryLine,
  quote,
  quoteConfirmation,
  quoteLine,
} from "../../../src/server/db/schema";
import { createRequestFingerprint } from "../../../src/server/shared";
import type { CreateOrderInput } from "../../../src/server/modules/orders";
import {
  createSyntheticProductSnapshot,
  createSyntheticTradeSnapshot,
  seedSyntheticBase,
  syntheticIds,
} from "../db/fixtures";

export const orderFixtureIds = {
  customer: "00000000-0000-4000-8000-000000000103",
  inquiry: "00000000-0000-4000-8000-000000000104",
  quote: "00000000-0000-4000-8000-000000000105",
  inquiryLine1: "00000000-0000-4000-8000-000000000106",
  inquiryLine2: "00000000-0000-4000-8000-000000000107",
  quoteLine1: "00000000-0000-4000-8000-000000000108",
  quoteLine2: "00000000-0000-4000-8000-000000000109",
  confirmation: "00000000-0000-4000-8000-000000000110",
} as const;

export const orderInput: CreateOrderInput = {
  expectedVersion: 3,
  deliveryDate: "2026-02-01",
};

export function orderIdentity(
  user: keyof Pick<
    typeof syntheticIds,
    "admin" | "salesA" | "salesB" | "boss" | "doc" | "fin"
  >,
): AuthIdentity {
  const roleByUser = {
    admin: "admin",
    salesA: "sales",
    salesB: "sales",
    boss: "boss",
    doc: "doc",
    fin: "fin",
  } as const satisfies Record<typeof user, Role>;
  return {
    sessionId: randomUUID(),
    user: {
      id: syntheticIds[user],
      username: `synthetic-${user}`,
      displayName: `Synthetic ${user}`,
      role: roleByUser[user],
    },
  };
}

export function orderCommand(
  idempotencyKey: string = randomUUID(),
  input: CreateOrderInput = orderInput,
) {
  const path = `/api/v1/quotes/${orderFixtureIds.quote}/orders`;
  return {
    idempotencyKey,
    requestHash: createRequestFingerprint({
      operationId: "createOrderFromQuote",
      method: "POST",
      path,
      body: input,
    }),
    requestId: randomUUID(),
  };
}

export const orderDependencies = {
  now: () => new Date("2026-01-10T02:00:00.000Z"),
};

export async function seedConfirmedQuote(
  transaction: DbTransaction,
  owner: keyof Pick<typeof syntheticIds, "salesA" | "salesB"> = "salesA",
) {
  const ownerUserId = syntheticIds[owner];
  await seedSyntheticBase(transaction, "synthetic-password-hash");
  const snapshot = createSyntheticTradeSnapshot();
  snapshot.items.push({
    lineNo: 2,
    product: {
      ...createSyntheticProductSnapshot(),
      sku: "SYNTHETIC-SKU-002",
    },
    quantity: "0.50",
    unitPrice: "10.00",
    lineAmount: "5.00",
    schemaVersion: 1,
  });
  snapshot.totalAmount = "15.00";

  await transaction.insert(customer).values({
    id: orderFixtureIds.customer,
    ownerUserId,
    nameCn: "合成客户",
    nameEn: "Synthetic Customer Ltd.",
    country: "Testland",
    address: "2 Test Only Road",
    contact: "Synthetic buyer",
    email: "buyer@example.invalid",
    phone: "+1-000-0000",
    remark: "Test use only",
    createdBy: ownerUserId,
  });
  await transaction.insert(inquiry).values({
    id: orderFixtureIds.inquiry,
    ownerUserId,
    customerId: orderFixtureIds.customer,
    inquiryDate: "2026-01-02",
    status: "QUOTED",
    source: "Synthetic source",
    message: "Test use only",
    customerVersionAtCreation: 1,
    createdBy: ownerUserId,
  });
  await transaction.insert(inquiryLine).values([
    {
      id: orderFixtureIds.inquiryLine1,
      inquiryId: orderFixtureIds.inquiry,
      lineNo: 1,
      productId: syntheticIds.product,
      productVersion: 1,
      productSnapshot: createSyntheticProductSnapshot(),
      quantity: "1.00",
    },
    {
      id: orderFixtureIds.inquiryLine2,
      inquiryId: orderFixtureIds.inquiry,
      lineNo: 2,
      productId: syntheticIds.product,
      productVersion: 1,
      productSnapshot: {
        ...createSyntheticProductSnapshot(),
        sku: "SYNTHETIC-SKU-002",
      },
      quantity: "0.50",
    },
  ]);
  await transaction.insert(quote).values({
    id: orderFixtureIds.quote,
    inquiryId: orderFixtureIds.inquiry,
    ownerUserId,
    customerId: orderFixtureIds.customer,
    state: "CONFIRMED",
    quoteDate: "2026-01-02",
    validUntil: "2026-01-17",
    currency: "USD",
    tradeTerm: "FOB TEST PORT",
    paymentTerm: "Synthetic payment term",
    remark: "Test use only",
    totalAmount: "15.00",
    issuedSnapshot: snapshot,
    issuedAt: new Date("2026-01-02T01:00:00.000Z"),
    rowVersion: 3,
    createdBy: ownerUserId,
  });
  await transaction.insert(quoteLine).values([
    {
      id: orderFixtureIds.quoteLine1,
      quoteId: orderFixtureIds.quote,
      inquiryId: orderFixtureIds.inquiry,
      inquiryLineId: orderFixtureIds.inquiryLine1,
      lineNo: 1,
      productSnapshot: createSyntheticProductSnapshot(),
      quantity: "1.00",
      unitPrice: "10.00",
      lineAmount: "10.00",
    },
    {
      id: orderFixtureIds.quoteLine2,
      quoteId: orderFixtureIds.quote,
      inquiryId: orderFixtureIds.inquiry,
      inquiryLineId: orderFixtureIds.inquiryLine2,
      lineNo: 2,
      productSnapshot: {
        ...createSyntheticProductSnapshot(),
        sku: "SYNTHETIC-SKU-002",
      },
      quantity: "0.50",
      unitPrice: "10.00",
      lineAmount: "5.00",
    },
  ]);
  await transaction.insert(quoteConfirmation).values({
    id: orderFixtureIds.confirmation,
    quoteId: orderFixtureIds.quote,
    method: "Synthetic email",
    confirmedOn: "2026-01-10",
    note: "Test use only",
    confirmedSnapshot: snapshot,
    recordedAt: new Date("2026-01-10T01:00:00.000Z"),
    recordedBy: ownerUserId,
  });
  return snapshot;
}
