import {
  and,
  count,
  desc,
  eq,
  ilike,
  inArray,
  or,
  sql,
  type SQL,
} from "drizzle-orm";

import { requireRole, type AuthIdentity } from "../../auth";
import { db, schema, withTransaction, type DbTransaction } from "../../db";
import {
  ApiError,
  businessDateFromInstant,
  isDateBefore,
  lockActorIdempotencyKey,
  normalizeDecimal,
  pageResult,
  runIdempotentTransaction,
  validationError,
  type AuditEvent,
  type AuditStore,
  type IdempotencyRecord,
  type IdempotencyStore,
  type Pagination,
} from "../../shared";
import type { InquiryCreateInput } from "./dto";

type ProductSnapshotDto = {
  productId: string;
  productVersion: number;
  sku: string;
  nameCn: string;
  nameEn: string;
  spec: string;
  unit: string;
  hsCode: string;
  schemaVersion: 1;
};

export interface InquiryItemDto {
  lineNo: number;
  product: ProductSnapshotDto;
  quantity: string;
}

export interface InquiryDto {
  id: string;
  version: number;
  ownerUserId: string;
  inquiryDate: string;
  source: string;
  message: string;
  items: InquiryItemDto[];
  status: "FOLLOWING" | "QUOTED";
  quoteId: string | null;
  createdAt: string;
  updatedAt: string;
  customerId: string;
  customerVersion: number;
}

export interface CreateInquiryResult {
  inquiry: InquiryDto;
  responseStatus: 200 | 201;
  replayed: boolean;
}

interface CreateInquiryOptions {
  idempotencyKey: string;
  requestHash: string;
  requestId: string;
}

type InquiryDatabase = Pick<typeof db, "select" | "insert">;
type InquiryRecord = typeof schema.inquiry.$inferSelect;
type InquiryLineRecord = typeof schema.inquiryLine.$inferSelect;

const idempotencyStore: IdempotencyStore<DbTransaction> = {
  async find(transaction, actorUserId, idempotencyKey) {
    await lockActorIdempotencyKey(transaction, actorUserId, idempotencyKey);
    const query = transaction
      .select()
      .from(schema.idempotencyRecord)
      .where(
        and(
          eq(schema.idempotencyRecord.actorUserId, actorUserId),
          eq(schema.idempotencyRecord.idempotencyKey, idempotencyKey),
        ),
      )
      .limit(1);
    const records = await query.for("update");
    return (records[0] ?? null) as IdempotencyRecord | null;
  },
  async insert(transaction, record: IdempotencyRecord) {
    await transaction.insert(schema.idempotencyRecord).values(record);
  },
};

const auditStore: AuditStore<DbTransaction> = {
  async append(transaction, event: AuditEvent) {
    await transaction.insert(schema.auditEvent).values(event);
  },
};

function scopeCondition(identity: AuthIdentity): SQL | undefined {
  return identity.user.role === "sales"
    ? eq(schema.inquiry.ownerUserId, identity.user.id)
    : undefined;
}

function notFound(): ApiError {
  return new ApiError(404, "NOT_FOUND", "询盘不存在或无权访问");
}

function toInquiryDto(
  record: InquiryRecord,
  lines: readonly InquiryLineRecord[],
  quoteId: string | null,
): InquiryDto {
  return {
    id: record.id,
    version: record.rowVersion,
    ownerUserId: record.ownerUserId,
    inquiryDate: record.inquiryDate,
    source: record.source,
    message: record.message,
    items: lines.map((line) => ({
      lineNo: line.lineNo,
      product: line.productSnapshot as unknown as ProductSnapshotDto,
      quantity: line.quantity,
    })),
    status: record.status,
    quoteId,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
    customerId: record.customerId,
    customerVersion: record.customerVersionAtCreation,
  };
}

async function hydrateInquiries(
  records: readonly InquiryRecord[],
  database: InquiryDatabase,
): Promise<InquiryDto[]> {
  if (records.length === 0) return [];
  const inquiryIds = records.map((record) => record.id);
  const [lines, quotes] = await Promise.all([
    database
      .select()
      .from(schema.inquiryLine)
      .where(inArray(schema.inquiryLine.inquiryId, inquiryIds))
      .orderBy(schema.inquiryLine.lineNo),
    database
      .select({ id: schema.quote.id, inquiryId: schema.quote.inquiryId })
      .from(schema.quote)
      .where(inArray(schema.quote.inquiryId, inquiryIds)),
  ]);
  const linesByInquiry = new Map<string, InquiryLineRecord[]>();
  for (const line of lines) {
    const existing = linesByInquiry.get(line.inquiryId) ?? [];
    existing.push(line);
    linesByInquiry.set(line.inquiryId, existing);
  }
  const quoteByInquiry = new Map(
    quotes.map((quote) => [quote.inquiryId, quote.id]),
  );
  return records.map((record) =>
    toInquiryDto(
      record,
      linesByInquiry.get(record.id) ?? [],
      quoteByInquiry.get(record.id) ?? null,
    ),
  );
}

export async function listInquiries(
  identity: AuthIdentity,
  pagination: Pagination,
) {
  requireRole(identity, ["sales", "boss"]);
  const escaped = pagination.q.replaceAll("\\", "\\\\").replaceAll("%", "\\%").replaceAll("_", "\\_");
  const pattern = `%${escaped}%`;
  const search = pagination.q
    ? or(
        ilike(sql`${schema.inquiry.id}::text`, pattern),
        ilike(schema.inquiry.source, pattern),
        ilike(schema.inquiry.message, pattern),
      )
    : undefined;
  const where = and(scopeCondition(identity), search);
  const records = await db
    .select()
    .from(schema.inquiry)
    .where(where)
    .orderBy(desc(schema.inquiry.createdAt), desc(schema.inquiry.id))
    .limit(pagination.pageSize)
    .offset(pagination.offset);
  const totals = await db
    .select({ value: count() })
    .from(schema.inquiry)
    .where(where);
  const items = await hydrateInquiries(records, db);
  return pageResult(items, pagination, Number(totals[0]?.value ?? 0));
}

export async function getInquiry(
  identity: AuthIdentity,
  id: string,
  database: InquiryDatabase = db,
): Promise<InquiryDto> {
  requireRole(identity, ["sales", "boss"]);
  const records = await database
    .select()
    .from(schema.inquiry)
    .where(and(eq(schema.inquiry.id, id), scopeCondition(identity)))
    .limit(1);
  const record = records[0];
  if (!record) throw notFound();
  const inquiries = await hydrateInquiries([record], database);
  return inquiries[0]!;
}

export async function createInquiry(
  identity: AuthIdentity,
  input: InquiryCreateInput,
  options: CreateInquiryOptions,
): Promise<CreateInquiryResult> {
  requireRole(identity, ["sales"]);
  const today = businessDateFromInstant(
    new Date(),
    process.env.BUSINESS_TIME_ZONE,
  );
  if (isDateBefore(today, input.inquiryDate)) {
    throw validationError("询盘日期不能晚于服务器业务日期", [
      {
        path: "/inquiryDate",
        code: "future_date",
        message: "询盘日期不能晚于服务器业务日期",
      },
    ]);
  }
  const normalizedItems = input.items.map((item, index) => ({
    ...item,
    quantity: normalizeDecimal(item.quantity, {
      allowZero: false,
      path: `/items/${index}/quantity`,
    }),
  }));

  const outcome = await runIdempotentTransaction({
    runTransaction: withTransaction,
    idempotencyStore,
    auditStore,
    actorUserId: identity.user.id,
    idempotencyKey: options.idempotencyKey,
    operationId: "createInquiry",
    requestHash: options.requestHash,
    resourceType: "inquiry",
    requestId: options.requestId,
    async work(transaction) {
      const customerQuery = transaction
        .select()
        .from(schema.customer)
        .where(
          and(
            eq(schema.customer.id, input.customerId),
            eq(schema.customer.ownerUserId, identity.user.id),
          ),
        )
        .limit(1);
      const customers = await customerQuery.for("update");
      const customer = customers[0];
      if (!customer) {
        throw new ApiError(404, "NOT_FOUND", "客户不存在或无权访问");
      }
      if (customer.rowVersion !== input.customerVersion) {
        throw new ApiError(409, "VERSION_CONFLICT", "客户资料已更新，请重新审阅", {
          currentVersion: customer.rowVersion,
          fieldErrors: [
            {
              path: "/customerVersion",
              code: "version_conflict",
              message: "客户版本不匹配",
            },
          ],
        });
      }

      const productIds = [
        ...new Set(normalizedItems.map((item) => item.productId)),
      ].sort();
      const products = new Map<string, typeof schema.product.$inferSelect>();
      for (const productId of productIds) {
        const productQuery = transaction
          .select()
          .from(schema.product)
          .where(eq(schema.product.id, productId))
          .limit(1);
        const records = await productQuery.for("update");
        const product = records[0];
        if (product) products.set(productId, product);
      }

      for (const [index, item] of normalizedItems.entries()) {
        const product = products.get(item.productId);
        if (!product) {
          throw validationError("商品不存在", [
            {
              path: `/items/${index}/productId`,
              code: "product_not_found",
              message: "商品不存在",
            },
          ]);
        }
        if (product.rowVersion !== item.productVersion) {
          throw new ApiError(409, "VERSION_CONFLICT", "商品资料已更新，请重新审阅", {
            currentVersion: product.rowVersion,
            fieldErrors: [
              {
                path: `/items/${index}/productVersion`,
                code: "version_conflict",
                message: "商品版本不匹配",
              },
            ],
          });
        }
        if (!product.enabled) {
          throw validationError("商品已停用", [
            {
              path: `/items/${index}/productId`,
              code: "product_disabled",
              message: "商品已停用",
            },
          ]);
        }
      }

      const insertedInquiries = await transaction
        .insert(schema.inquiry)
        .values({
          ownerUserId: identity.user.id,
          customerId: customer.id,
          inquiryDate: input.inquiryDate,
          status: "FOLLOWING",
          source: input.source,
          message: input.message,
          customerVersionAtCreation: customer.rowVersion,
          createdBy: identity.user.id,
        })
        .returning();
      const insertedInquiry = insertedInquiries[0];
      if (!insertedInquiry) throw new Error("Inquiry insert returned no row");

      const insertedLines = await transaction
        .insert(schema.inquiryLine)
        .values(
          normalizedItems.map((item, index) => {
            const product = products.get(item.productId)!;
            const snapshot: ProductSnapshotDto = {
              productId: product.id,
              productVersion: product.rowVersion,
              sku: product.sku,
              nameCn: product.nameCn,
              nameEn: product.nameEn,
              spec: product.spec,
              unit: product.unit,
              hsCode: product.hsCode,
              schemaVersion: 1,
            };
            return {
              inquiryId: insertedInquiry.id,
              lineNo: index + 1,
              productId: product.id,
              productVersion: product.rowVersion,
              productSnapshot: snapshot,
              quantity: item.quantity,
            };
          }),
        )
        .returning();
      insertedLines.sort((left, right) => left.lineNo - right.lineNo);
      const result = toInquiryDto(insertedInquiry, insertedLines, null);
      return {
        result,
        resourceId: insertedInquiry.id,
        responseStatus: 201 as const,
        beforeVersion: null,
        afterVersion: insertedInquiry.rowVersion,
      };
    },
  });

  if (outcome.kind === "replayed") {
    return {
      inquiry: await getInquiry(identity, outcome.resourceId),
      responseStatus: 200,
      replayed: true,
    };
  }
  return {
    inquiry: outcome.result,
    responseStatus: outcome.responseStatus,
    replayed: false,
  };
}
