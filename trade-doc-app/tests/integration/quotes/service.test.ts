import { randomUUID } from "node:crypto";

import { and, eq, sql } from "drizzle-orm";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import type { AuthIdentity } from "../../../src/server/auth";
import type { QuoteCommandContext } from "../../../src/server/modules/quotes";
import {
  addCalendarDays,
  businessDateFromInstant,
} from "../../../src/server/shared/date";
import {
  createSyntheticProductSnapshot,
  seedSyntheticBase,
  syntheticIds,
} from "../db/fixtures";
import { resetDatabase } from "../db/reset";

const enabled =
  Boolean(process.env.DATABASE_URL) &&
  process.env.TRADE_DOC_ALLOW_TEST_RESET === "true";
const customerId = "00000000-0000-4000-8000-000000000201";
const inquiryId = "00000000-0000-4000-8000-000000000202";
const inquiryLineId = "00000000-0000-4000-8000-000000000203";

let database: typeof import("../../../src/server/db");
let quotes: typeof import("../../../src/server/modules/quotes");
let schema: typeof import("../../../src/server/db/schema");

function identity(user: "salesA" | "salesB" | "boss"): AuthIdentity {
  return {
    sessionId: randomUUID(),
    user: {
      id: syntheticIds[user],
      username: `synthetic-${user}`,
      displayName: `Synthetic ${user}`,
      role: user === "boss" ? "boss" : "sales",
    },
  };
}

function command(): QuoteCommandContext {
  return {
    idempotencyKey: randomUUID(),
    requestHash: randomUUID(),
    requestId: randomUUID(),
  };
}

describe.skipIf(!enabled)("quote service with real PostgreSQL", () => {
  beforeAll(async () => {
    database = await import("../../../src/server/db");
    quotes = await import("../../../src/server/modules/quotes");
    schema = await import("../../../src/server/db/schema");
  });

  beforeEach(async () => {
    await resetDatabase(database.db);
    await database.withTransaction(async (transaction) => {
      await seedSyntheticBase(transaction, "synthetic-test-only");
      await transaction.insert(schema.customer).values({
        id: customerId,
        ownerUserId: syntheticIds.salesA,
        nameCn: "原客户名称",
        nameEn: "Original customer",
        country: "Testland",
        address: "2 Test Only Road",
        contact: "Buyer",
        email: "",
        phone: "",
        remark: "",
        createdBy: syntheticIds.salesA,
      });
      await transaction.insert(schema.inquiry).values({
        id: inquiryId,
        ownerUserId: syntheticIds.salesA,
        customerId,
        inquiryDate: "2026-01-02",
        status: "FOLLOWING",
        source: "Synthetic source",
        message: "Synthetic inquiry",
        customerVersionAtCreation: 1,
        createdBy: syntheticIds.salesA,
      });
      await transaction.insert(schema.inquiryLine).values({
        id: inquiryLineId,
        inquiryId,
        lineNo: 1,
        productId: syntheticIds.product,
        productVersion: 1,
        productSnapshot: createSyntheticProductSnapshot(),
        quantity: "1.00",
      });
    });
  });

  it("keeps the full workflow, replay, audit and frozen snapshot consistent", async () => {
    // @tier live
    const sales = identity("salesA");
    const created = await quotes.createQuote(
      sales,
      inquiryId,
      { expectedVersion: 1, currency: "USD" },
      command(),
    );
    expect(created.status).toBe(201);
    expect(created.data).toMatchObject({
      status: "DRAFT",
      version: 1,
      ownerUserId: syntheticIds.salesA,
      customerId,
      totalAmount: null,
    });
    expect(created.data.validUntil).toBe(
      addCalendarDays(businessDateFromInstant(new Date()), 15),
    );
    expect(created.data.items).toHaveLength(1);
    expect(created.data.items[0]?.unitPrice).toBeNull();

    const updated = await quotes.updateQuote(
      sales,
      created.data.id,
      {
        expectedVersion: 1,
        validUntil: created.data.validUntil,
        currency: "USD",
        tradeTerm: "FOB TEST",
        paymentTerm: "T/T",
        remark: "Synthetic quote",
        items: [{ lineNo: 1, quantity: "0.01", unitPrice: "1.00" }],
      },
      command(),
    );
    expect(updated.data).toMatchObject({ version: 2, totalAmount: "0.01" });

    const submitted = await quotes.submitQuote(
      sales,
      created.data.id,
      {
        expectedVersion: 2,
        expectedCustomerVersion: 1,
        expectedCompanyProfileVersion: 1,
      },
      command(),
    );
    expect(submitted.data).toMatchObject({
      status: "AWAITING_CUSTOMER",
      version: 3,
    });
    const frozen = submitted.data.submittedSnapshot!;

    await database.withTransaction(async (transaction) => {
      await transaction
        .update(schema.customer)
        .set({ nameCn: "实时新客户", rowVersion: 2 })
        .where(eq(schema.customer.id, customerId));
      await transaction
        .update(schema.companyProfile)
        .set({ legalName: "Live Replacement Ltd.", rowVersion: 2 })
        .where(eq(schema.companyProfile.id, syntheticIds.companyProfile));
    });
    const afterMasterDataChange = await quotes.getQuote(sales, created.data.id);
    expect(afterMasterDataChange.customerSnapshot).toEqual(frozen.customer);
    expect(afterMasterDataChange.companySnapshot).toEqual(frozen.seller);
    expect(afterMasterDataChange.sourceVersions).toEqual({
      customerVersion: 1,
      companyProfileVersion: 1,
    });

    await expect(
      quotes.recordCustomerConfirmation(
        sales,
        created.data.id,
        {
          expectedVersion: 3,
          method: "email",
          confirmedOn: created.data.quoteDate,
          note: "Synthetic confirmation",
          attachmentIds: [randomUUID()],
        },
        command(),
      ),
    ).rejects.toMatchObject({ status: 422, code: "FEATURE_NOT_IN_SLICE" });

    const confirmationInput = {
      expectedVersion: 3,
      method: "  email  ",
      confirmedOn: created.data.quoteDate,
      note: "  Synthetic confirmation  ",
      attachmentIds: [],
    };
    const confirmationCommand = command();
    const confirmed = await quotes.recordCustomerConfirmation(
      sales,
      created.data.id,
      confirmationInput,
      confirmationCommand,
    );
    expect(confirmed.data).toMatchObject({ status: "CONFIRMED", version: 4 });
    expect(confirmed.data.customerConfirmation).toMatchObject({
      method: "email",
      note: "Synthetic confirmation",
      recordedBy: syntheticIds.salesA,
      quoteSnapshotVersion: 1,
    });

    const replayed = await quotes.recordCustomerConfirmation(
      sales,
      created.data.id,
      confirmationInput,
      confirmationCommand,
    );
    expect(replayed).toMatchObject({ status: 200, replayed: true });
    expect(replayed.data.version).toBe(4);

    const persisted = await database.db
      .select({ quote: schema.quote, confirmation: schema.quoteConfirmation })
      .from(schema.quote)
      .innerJoin(
        schema.quoteConfirmation,
        eq(schema.quoteConfirmation.quoteId, schema.quote.id),
      )
      .where(eq(schema.quote.id, created.data.id));
    expect(persisted[0]?.confirmation.confirmedSnapshot).toEqual(
      persisted[0]?.quote.issuedSnapshot,
    );
    const audits = await database.db
      .select({ count: sql<number>`count(*)::int` })
      .from(schema.auditEvent)
      .where(
        and(
          eq(schema.auditEvent.resourceId, created.data.id),
          eq(schema.auditEvent.resourceType, "quote"),
        ),
      );
    expect(audits[0]?.count).toBe(4);

    await expect(quotes.getQuote(identity("salesB"), created.data.id)).rejects.toMatchObject({
      status: 404,
      code: "NOT_FOUND",
    });
    expect((await quotes.getQuote(identity("boss"), created.data.id)).id).toBe(created.data.id);
    await expect(
      quotes.updateQuote(identity("boss"), created.data.id, {
        expectedVersion: 4,
        validUntil: created.data.validUntil,
        currency: "USD",
        tradeTerm: "FOB TEST",
        paymentTerm: "T/T",
        remark: "",
        items: [{ lineNo: 1, quantity: "0.01", unitPrice: "1.00" }],
      }, command()),
    ).rejects.toMatchObject({ status: 403, code: "FORBIDDEN_ROLE" });
    const listed = await quotes.listQuotes(sales, {
      page: 1,
      pageSize: 20,
      offset: 0,
      q: "FOB",
    });
    expect(listed).toMatchObject({ total: 1, totalPages: 1 });
    expect(listed.items[0]?.id).toBe(created.data.id);

    const byId = await quotes.listQuotes(sales, {
      page: 1,
      pageSize: 20,
      offset: 0,
      q: created.data.id,
    });
    expect(byId).toMatchObject({ total: 1, totalPages: 1 });
    expect(byId.items[0]?.id).toBe(created.data.id);
    for (const q of ["%", "_", "\\"]) {
      const wildcards = await quotes.listQuotes(sales, {
        page: 1,
        pageSize: 20,
        offset: 0,
        q,
      });
      expect(wildcards).toMatchObject({ items: [], total: 0, totalPages: 0 });
    }
  });

  it("serializes same-key concurrent quote commands across body fingerprints", async () => {
    // @tier live
    const sales = identity("salesA");
    const sameCommand = command();
    const input = { expectedVersion: 1, currency: "USD" };
    const sameBody = await Promise.all([
      quotes.createQuote(sales, inquiryId, input, sameCommand),
      quotes.createQuote(sales, inquiryId, input, sameCommand),
    ]);
    expect(sameBody.map((result) => result.status).sort()).toEqual([200, 201]);
    expect(sameBody[0]?.data.id).toBe(sameBody[1]?.data.id);
  });

  it("rejects a different body racing on the same quote idempotency key", async () => {
    // @tier live
    const sales = identity("salesA");
    const sameCommand = command();
    const results = await Promise.allSettled([
      quotes.createQuote(sales, inquiryId, { expectedVersion: 1, currency: "USD" }, sameCommand),
      quotes.createQuote(sales, inquiryId, { expectedVersion: 1, currency: "EUR" }, {
        ...sameCommand,
        requestHash: randomUUID(),
      }),
    ]);
    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect(results.find((result) => result.status === "rejected")).toMatchObject({
      reason: { status: 409, code: "IDEMPOTENCY_CONFLICT" },
    });
  });

  it("uses BUSINESS_TIME_ZONE for quote dates", async () => {
    // @tier live
    const originalTimeZone = process.env.BUSINESS_TIME_ZONE;
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-01-10T01:00:00.000Z"));
    process.env.BUSINESS_TIME_ZONE = "America/Los_Angeles";
    try {
      const created = await quotes.createQuote(
        identity("salesA"),
        inquiryId,
        { expectedVersion: 1, currency: "USD" },
        command(),
      );
      expect(created.data).toMatchObject({
        quoteDate: "2026-01-09",
        validUntil: "2026-01-24",
      });
    } finally {
      if (originalTimeZone === undefined) {
        delete process.env.BUSINESS_TIME_ZONE;
      } else {
        process.env.BUSINESS_TIME_ZONE = originalTimeZone;
      }
      vi.useRealTimers();
    }
  });

  it("allows only one first quote under competing idempotency keys", async () => {
    // @tier live
    const sales = identity("salesA");
    const results = await Promise.allSettled([
      quotes.createQuote(sales, inquiryId, { expectedVersion: 1, currency: "USD" }, command()),
      quotes.createQuote(sales, inquiryId, { expectedVersion: 1, currency: "USD" }, command()),
    ]);
    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    const rejected = results.find((result) => result.status === "rejected");
    expect(rejected).toMatchObject({
      reason: { status: 409, code: "STATE_CONFLICT" },
    });
    const persisted = await database.db
      .select({ count: sql<number>`count(*)::int` })
      .from(schema.quote)
      .where(eq(schema.quote.inquiryId, inquiryId));
    expect(persisted[0]?.count).toBe(1);
    const audits = await database.db
      .select({ count: sql<number>`count(*)::int` })
      .from(schema.auditEvent)
      .where(eq(schema.auditEvent.operationId, "createQuote"));
    expect(audits[0]?.count).toBe(1);
  });
});
