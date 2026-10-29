import { and, asc, desc, eq, ilike, or, sql, type SQL } from "drizzle-orm";

import type {
  CompanySnapshot,
  CustomerSnapshot,
  Page,
  ProductSnapshot,
  Quote,
  TradeSnapshot,
} from "../../../lib/contracts";
import { requireRole, type AuthIdentity } from "../../auth";
import { db, withTransaction, type DbTransaction } from "../../db";
import {
  companyProfile,
  currencyCatalog,
  customer,
  inquiry,
  inquiryLine,
  quote,
  quoteConfirmation,
  quoteLine,
  salesOrder,
} from "../../db/schema";
import {
  addCalendarDays,
  businessDateFromInstant,
  isDateBefore,
  parseCalendarDate,
} from "../../shared/date";
import { ApiError, validationError } from "../../shared/errors";
import {
  pageResult,
  type Pagination,
} from "../../shared/http";
import { normalizeDecimal } from "../../shared/money";
import {
  runIdempotentTransaction,
  type BusinessWorkResult,
} from "../../shared/transactions";
import { calculateQuoteCandidate } from "./domain";
import type {
  ConfirmationCreateInput,
  QuoteCreateInput,
  QuoteSubmitInput,
  QuoteUpdateInput,
} from "./dto";
import { quoteAuditStore, quoteIdempotencyStore } from "./stores";
import type { QuoteCommandContext, QuoteCommandResult } from "./types";

type QuoteDatabase = Pick<typeof db, "select">;
type QuoteRecord = typeof quote.$inferSelect;
type CustomerRecord = typeof customer.$inferSelect;
type CompanyProfileRecord = typeof companyProfile.$inferSelect;

function notFound(): ApiError {
  return new ApiError(404, "NOT_FOUND", "报价或来源对象不存在");
}

function stateConflict(message: string): ApiError {
  return new ApiError(409, "STATE_CONFLICT", message);
}

function versionConflict(currentVersion: number): ApiError {
  return new ApiError(409, "VERSION_CONFLICT", "对象版本已变化，请重新审阅", {
    currentVersion,
  });
}

function companySnapshot(record: CompanyProfileRecord): CompanySnapshot {
  return {
    companyProfileId: record.id,
    companyProfileVersion: record.rowVersion,
    legalName: record.legalName,
    address: record.address,
    contact: record.contact,
    email: record.email,
    phone: record.phone,
    schemaVersion: 1,
  };
}

function customerSnapshot(record: CustomerRecord): CustomerSnapshot {
  return {
    customerId: record.id,
    customerVersion: record.rowVersion,
    nameCn: record.nameCn,
    nameEn: record.nameEn,
    country: record.country,
    contact: record.contact,
    email: record.email,
    phone: record.phone,
    address: record.address,
    schemaVersion: 1,
  };
}

async function findQuote(
  database: QuoteDatabase,
  identity: AuthIdentity,
  id: string,
  lock = false,
): Promise<QuoteRecord | null> {
  const conditions = [eq(quote.id, id)];
  if (identity.user.role === "sales") {
    conditions.push(eq(quote.ownerUserId, identity.user.id));
  }
  const query = database
    .select()
    .from(quote)
    .where(and(...conditions))
    .limit(1);
  const records = await (lock ? query.for("update") : query);
  return records[0] ?? null;
}

async function toQuoteDto(
  database: QuoteDatabase,
  record: QuoteRecord,
): Promise<Quote> {
  const lines = await database
    .select()
    .from(quoteLine)
    .where(eq(quoteLine.quoteId, record.id))
    .orderBy(asc(quoteLine.lineNo));
  const confirmations = await database
    .select()
    .from(quoteConfirmation)
    .where(eq(quoteConfirmation.quoteId, record.id))
    .limit(1);
  const orders = await database
    .select({ id: salesOrder.id })
    .from(salesOrder)
    .where(eq(salesOrder.sourceQuoteId, record.id))
    .limit(1);
  const confirmation = confirmations[0] ?? null;
  const submittedSnapshot =
    record.issuedSnapshot === null
      ? null
      : (record.issuedSnapshot as unknown as TradeSnapshot);

  let currentCustomerSnapshot: CustomerSnapshot;
  let currentCompanySnapshot: CompanySnapshot | null;
  if (submittedSnapshot !== null) {
    currentCustomerSnapshot = submittedSnapshot.customer;
    currentCompanySnapshot = submittedSnapshot.seller;
  } else {
    const previews = await database
      .select({ customer, companyProfile })
      .from(customer)
      .leftJoin(
        companyProfile,
        eq(companyProfile.profileKey, "PRIMARY_COMPANY"),
      )
      .where(
        and(
          eq(customer.id, record.customerId),
          eq(customer.ownerUserId, record.ownerUserId),
        ),
      )
      .limit(1);
    const preview = previews[0];
    if (!preview) {
      throw notFound();
    }
    currentCustomerSnapshot = customerSnapshot(preview.customer);
    currentCompanySnapshot = preview.companyProfile
      ? companySnapshot(preview.companyProfile)
      : null;
  }

  return {
    id: record.id,
    version: record.rowVersion,
    ownerUserId: record.ownerUserId,
    inquiryId: record.inquiryId,
    quoteDate: record.quoteDate,
    validUntil: record.validUntil,
    currency: record.currency,
    tradeTerm: record.tradeTerm,
    paymentTerm: record.paymentTerm,
    remark: record.remark,
    items: lines.map((line) => ({
      lineNo: line.lineNo,
      product: line.productSnapshot as unknown as ProductSnapshot,
      quantity: normalizeDecimal(line.quantity),
      unitPrice:
        line.unitPrice === null ? null : normalizeDecimal(line.unitPrice),
      lineAmount:
        line.lineAmount === null ? null : normalizeDecimal(line.lineAmount),
    })),
    totalAmount:
      record.totalAmount === null ? null : normalizeDecimal(record.totalAmount),
    status: record.state,
    submittedSnapshot,
    customerConfirmation:
      confirmation === null
        ? null
        : {
            id: confirmation.id,
            quoteSnapshotVersion: submittedSnapshot!.snapshotVersion,
            method: confirmation.method,
            confirmedOn: confirmation.confirmedOn,
            note: confirmation.note,
            attachmentIds: [],
            recordedBy: confirmation.recordedBy,
            recordedAt: confirmation.recordedAt.toISOString(),
          },
    orderId: orders[0]?.id ?? null,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
    convertedAt: record.convertedAt?.toISOString() ?? null,
    customerId: record.customerId,
    customerSnapshot: currentCustomerSnapshot,
    companySnapshot: currentCompanySnapshot,
    sourceVersions: {
      customerVersion: currentCustomerSnapshot.customerVersion,
      companyProfileVersion:
        currentCompanySnapshot?.companyProfileVersion ?? null,
    },
  };
}

async function readQuote(
  database: QuoteDatabase,
  identity: AuthIdentity,
  id: string,
): Promise<Quote> {
  const record = await findQuote(database, identity, id);
  if (!record) {
    throw notFound();
  }
  return toQuoteDto(database, record);
}

export async function getQuote(
  identity: AuthIdentity,
  id: string,
): Promise<Quote> {
  requireRole(identity, ["sales", "boss"]);
  return readQuote(db, identity, id);
}

export async function listQuotes(
  identity: AuthIdentity,
  pagination: Pagination,
): Promise<Page<Quote>> {
  requireRole(identity, ["sales", "boss"]);
  const conditions: SQL[] = [];
  if (identity.user.role === "sales") {
    conditions.push(eq(quote.ownerUserId, identity.user.id));
  }
  if (pagination.q !== "") {
    const escaped = pagination.q.replaceAll("\\", "\\\\").replaceAll("%", "\\%").replaceAll("_", "\\_");
    const pattern = `%${escaped}%`;
    conditions.push(
      or(
        ilike(sql`${quote.id}::text`, pattern),
        ilike(quote.tradeTerm, pattern),
        ilike(quote.paymentTerm, pattern),
        ilike(quote.remark, pattern),
        ilike(customer.nameCn, pattern),
        ilike(customer.nameEn, pattern),
      )!,
    );
  }
  const where = conditions.length > 0 ? and(...conditions) : undefined;
  const customerJoin = and(
    eq(quote.customerId, customer.id),
    eq(quote.ownerUserId, customer.ownerUserId),
  );
  const counts = await db
    .select({ value: sql<number>`count(*)::int` })
    .from(quote)
    .innerJoin(customer, customerJoin)
    .where(where);
  const total = counts[0]?.value ?? 0;
  const records = await db
    .select({ quote })
    .from(quote)
    .innerJoin(customer, customerJoin)
    .where(where)
    .orderBy(desc(quote.createdAt), desc(quote.id))
    .limit(pagination.pageSize)
    .offset(pagination.offset);
  const items: Quote[] = [];
  for (const row of records) {
    items.push(await toQuoteDto(db, row.quote));
  }
  return { ...pageResult(items, pagination, total), items };
}

async function executeQuoteCommand(
  identity: AuthIdentity,
  operationId: string,
  context: QuoteCommandContext,
  work: (transaction: DbTransaction) => Promise<BusinessWorkResult<Quote>>,
): Promise<QuoteCommandResult> {
  requireRole(identity, ["sales"]);
  const outcome = await runIdempotentTransaction({
    runTransaction: withTransaction,
    idempotencyStore: quoteIdempotencyStore,
    auditStore: quoteAuditStore,
    actorUserId: identity.user.id,
    idempotencyKey: context.idempotencyKey,
    operationId,
    requestHash: context.requestHash,
    resourceType: "quote",
    requestId: context.requestId,
    work,
  });
  if (outcome.kind === "replayed") {
    return {
      data: await getQuote(identity, outcome.resourceId),
      status: 200,
      replayed: true,
    };
  }
  return {
    data: outcome.result,
    status: outcome.responseStatus,
    replayed: false,
  };
}

async function requireEnabledCurrency(
  database: QuoteDatabase,
  code: string,
): Promise<void> {
  const currencies = await database
    .select({ code: currencyCatalog.code })
    .from(currencyCatalog)
    .where(
      and(
        eq(currencyCatalog.code, code),
        eq(currencyCatalog.enabled, true),
        eq(currencyCatalog.amountScale, 2),
      ),
    )
    .limit(1);
  if (!currencies[0]) {
    throw new ApiError(422, "CURRENCY_NOT_AVAILABLE", "币种未启用或不受支持", {
      fieldErrors: [
        {
          path: "/currency",
          code: "currency_not_available",
          message: "请选择启用的两位金额币种",
        },
      ],
    });
  }
}

export async function createQuote(
  identity: AuthIdentity,
  inquiryId: string,
  input: QuoteCreateInput,
  context: QuoteCommandContext,
): Promise<QuoteCommandResult> {
  return executeQuoteCommand(identity, "createQuote", context, async (transaction) => {
    const inquiries = await transaction
      .select()
      .from(inquiry)
      .where(
        and(
          eq(inquiry.id, inquiryId),
          eq(inquiry.ownerUserId, identity.user.id),
        ),
      )
      .limit(1)
      .for("update");
    const source = inquiries[0];
    if (!source) {
      throw notFound();
    }
    if (source.status !== "FOLLOWING") {
      throw stateConflict("该询盘已经起草报价");
    }
    if (source.rowVersion !== input.expectedVersion) {
      throw versionConflict(source.rowVersion);
    }
    await requireEnabledCurrency(transaction, input.currency);

    const sourceLines = await transaction
      .select()
      .from(inquiryLine)
      .where(eq(inquiryLine.inquiryId, source.id))
      .orderBy(asc(inquiryLine.lineNo));
    if (sourceLines.length === 0) {
      throw validationError("询盘缺少可报价明细");
    }

    const now = new Date();
    const quoteDate = businessDateFromInstant(now, process.env.BUSINESS_TIME_ZONE);
    const created = await transaction
      .insert(quote)
      .values({
        inquiryId: source.id,
        ownerUserId: identity.user.id,
        customerId: source.customerId,
        state: "DRAFT",
        quoteDate,
        validUntil: addCalendarDays(quoteDate, 15),
        currency: input.currency,
        tradeTerm: "",
        paymentTerm: "",
        remark: "",
        totalAmount: null,
        createdAt: now,
        createdBy: identity.user.id,
        updatedAt: now,
      })
      .returning();
    const record = created[0]!;
    await transaction.insert(quoteLine).values(
      sourceLines.map((line) => ({
        quoteId: record.id,
        inquiryId: source.id,
        inquiryLineId: line.id,
        lineNo: line.lineNo,
        productSnapshot: line.productSnapshot,
        quantity: line.quantity,
        unitPrice: null,
        lineAmount: null,
      })),
    );
    await transaction
      .update(inquiry)
      .set({
        status: "QUOTED",
        rowVersion: source.rowVersion + 1,
        updatedAt: now,
      })
      .where(
        and(
          eq(inquiry.id, source.id),
          eq(inquiry.rowVersion, input.expectedVersion),
          eq(inquiry.status, "FOLLOWING"),
        ),
      );

    return {
      result: await readQuote(transaction, identity, record.id),
      resourceId: record.id,
      responseStatus: 201,
      beforeVersion: null,
      afterVersion: 1,
    };
  });
}

export async function updateQuote(
  identity: AuthIdentity,
  id: string,
  input: QuoteUpdateInput,
  context: QuoteCommandContext,
): Promise<QuoteCommandResult> {
  return executeQuoteCommand(identity, "updateQuote", context, async (transaction) => {
    const record = await findQuote(transaction, identity, id, true);
    if (!record) {
      throw notFound();
    }
    if (record.state !== "DRAFT") {
      throw stateConflict("仅草稿报价可以修改");
    }
    if (record.rowVersion !== input.expectedVersion) {
      throw versionConflict(record.rowVersion);
    }
    if (
      input.validUntil !== null &&
      isDateBefore(parseCalendarDate(input.validUntil, "/validUntil"), record.quoteDate)
    ) {
      throw validationError("有效期不得早于报价日期", [
        {
          path: "/validUntil",
          code: "date_before_quote",
          message: "有效期不得早于报价日期",
        },
      ]);
    }
    await requireEnabledCurrency(transaction, input.currency);

    const lines = await transaction
      .select()
      .from(quoteLine)
      .where(eq(quoteLine.quoteId, record.id))
      .orderBy(asc(quoteLine.lineNo));
    const candidate = calculateQuoteCandidate(
      lines.map((line) => line.lineNo),
      input.items,
    );
    const now = new Date();
    for (const line of candidate.lines) {
      await transaction
        .update(quoteLine)
        .set({
          quantity: line.quantity,
          unitPrice: line.unitPrice,
          lineAmount: line.lineAmount,
        })
        .where(
          and(
            eq(quoteLine.quoteId, record.id),
            eq(quoteLine.lineNo, line.lineNo),
          ),
        );
    }
    await transaction
      .update(quote)
      .set({
        validUntil: input.validUntil,
        currency: input.currency,
        tradeTerm: input.tradeTerm,
        paymentTerm: input.paymentTerm,
        remark: input.remark,
        totalAmount: candidate.totalAmount,
        rowVersion: record.rowVersion + 1,
        updatedAt: now,
      })
      .where(
        and(
          eq(quote.id, record.id),
          eq(quote.rowVersion, input.expectedVersion),
          eq(quote.state, "DRAFT"),
        ),
      );

    return {
      result: await readQuote(transaction, identity, record.id),
      resourceId: record.id,
      responseStatus: 200,
      beforeVersion: record.rowVersion,
      afterVersion: record.rowVersion + 1,
    };
  });
}

export async function submitQuote(
  identity: AuthIdentity,
  id: string,
  input: QuoteSubmitInput,
  context: QuoteCommandContext,
): Promise<QuoteCommandResult> {
  return executeQuoteCommand(identity, "submitQuote", context, async (transaction) => {
    const record = await findQuote(transaction, identity, id, true);
    if (!record) {
      throw notFound();
    }
    if (record.state !== "DRAFT") {
      throw stateConflict("仅草稿报价可以提交");
    }
    if (record.rowVersion !== input.expectedVersion) {
      throw versionConflict(record.rowVersion);
    }
    if (record.validUntil === null) {
      throw validationError("提交前必须填写有效期", [
        {
          path: "/validUntil",
          code: "required",
          message: "提交前必须填写有效期",
        },
      ]);
    }
    if (record.tradeTerm.trim() === "") {
      throw validationError("提交前必须填写贸易条款", [
        { path: "/tradeTerm", code: "required", message: "贸易条款不能为空" },
      ]);
    }
    if (record.paymentTerm.trim() === "") {
      throw validationError("提交前必须填写付款条款", [
        { path: "/paymentTerm", code: "required", message: "付款条款不能为空" },
      ]);
    }
    const now = new Date();
    if (isDateBefore(record.validUntil, businessDateFromInstant(now, process.env.BUSINESS_TIME_ZONE))) {
      throw new ApiError(422, "QUOTE_EXPIRED", "报价已过有效期");
    }
    await requireEnabledCurrency(transaction, record.currency);

    const lines = await transaction
      .select()
      .from(quoteLine)
      .where(eq(quoteLine.quoteId, record.id))
      .orderBy(asc(quoteLine.lineNo));
    const candidate = calculateQuoteCandidate(
      lines.map((line) => line.lineNo),
      lines.map((line) => ({
        lineNo: line.lineNo,
        quantity: line.quantity,
        unitPrice: line.unitPrice,
      })),
    );
    if (candidate.totalAmount === null) {
      throw validationError("提交前必须填写每一行成交单价", [
        {
          path: "/items",
          code: "unit_price_required",
          message: "每一行成交单价均必填",
        },
      ]);
    }

    const customers = await transaction
      .select()
      .from(customer)
      .where(
        and(
          eq(customer.id, record.customerId),
          eq(customer.ownerUserId, record.ownerUserId),
        ),
      )
      .limit(1)
      .for("update");
    const sourceCustomer = customers[0];
    if (!sourceCustomer) {
      throw notFound();
    }
    const companies = await transaction
      .select()
      .from(companyProfile)
      .where(eq(companyProfile.profileKey, "PRIMARY_COMPANY"))
      .limit(1)
      .for("update");
    const sourceCompany = companies[0];
    if (!sourceCompany) {
      throw new ApiError(
        422,
        "COMPANY_PROFILE_REQUIRED",
        "提交报价前必须配置真实公司资料",
      );
    }
    if (sourceCustomer.rowVersion !== input.expectedCustomerVersion) {
      throw versionConflict(sourceCustomer.rowVersion);
    }
    if (sourceCompany.rowVersion !== input.expectedCompanyProfileVersion) {
      throw versionConflict(sourceCompany.rowVersion);
    }

    const nextVersion = record.rowVersion + 1;
    const seller = companySnapshot(sourceCompany);
    const buyer = customerSnapshot(sourceCustomer);
    const snapshot: TradeSnapshot = {
      snapshotVersion: 1,
      submittedQuoteVersion: nextVersion,
      seller,
      customer: buyer,
      quoteDate: record.quoteDate,
      validUntil: record.validUntil,
      currency: record.currency,
      tradeTerm: record.tradeTerm,
      paymentTerm: record.paymentTerm,
      remark: record.remark,
      items: candidate.lines.map((line, index) => ({
        lineNo: line.lineNo,
        product: structuredClone(
          lines[index]!.productSnapshot,
        ) as unknown as ProductSnapshot,
        quantity: line.quantity,
        unitPrice: line.unitPrice!,
        lineAmount: line.lineAmount!,
        schemaVersion: 1,
      })),
      totalAmount: candidate.totalAmount,
      frozenAt: now.toISOString(),
      schemaVersion: 1,
    };
    await transaction
      .update(quote)
      .set({
        state: "AWAITING_CUSTOMER",
        totalAmount: candidate.totalAmount,
        issuedSnapshot: snapshot,
        issuedAt: now,
        rowVersion: nextVersion,
        updatedAt: now,
      })
      .where(
        and(
          eq(quote.id, record.id),
          eq(quote.rowVersion, input.expectedVersion),
          eq(quote.state, "DRAFT"),
        ),
      );

    return {
      result: await readQuote(transaction, identity, record.id),
      resourceId: record.id,
      responseStatus: 200,
      beforeVersion: record.rowVersion,
      afterVersion: nextVersion,
    };
  });
}

export async function recordCustomerConfirmation(
  identity: AuthIdentity,
  id: string,
  input: ConfirmationCreateInput,
  context: QuoteCommandContext,
): Promise<QuoteCommandResult> {
  return executeQuoteCommand(
    identity,
    "recordCustomerConfirmation",
    context,
    async (transaction) => {
      const record = await findQuote(transaction, identity, id, true);
      if (!record) {
        throw notFound();
      }
      if (record.state !== "AWAITING_CUSTOMER") {
        throw stateConflict("仅待客户确认的报价可以登记确认");
      }
      if (record.rowVersion !== input.expectedVersion) {
        throw versionConflict(record.rowVersion);
      }
      if ((input.attachmentIds?.length ?? 0) > 0) {
        throw new ApiError(
          422,
          "FEATURE_NOT_IN_SLICE",
          "首切片不支持确认附件",
          {
            fieldErrors: [
              {
                path: "/attachmentIds",
                code: "feature_not_in_slice",
                message: "附件上传与关联不在首切片范围",
              },
            ],
          },
        );
      }
      const method = input.method.trim();
      const note = input.note.trim();
      if (method === "") {
        throw validationError("确认方式不能为空", [
          { path: "/method", code: "required", message: "确认方式不能为空" },
        ]);
      }
      if (note === "") {
        throw validationError("确认说明不能为空", [
          { path: "/note", code: "required", message: "确认说明不能为空" },
        ]);
      }
      const confirmedOn = parseCalendarDate(input.confirmedOn, "/confirmedOn");
      const now = new Date();
      const today = businessDateFromInstant(now, process.env.BUSINESS_TIME_ZONE);
      if (record.validUntil === null || isDateBefore(record.validUntil, today)) {
        throw new ApiError(422, "QUOTE_EXPIRED", "报价已过有效期");
      }
      if (
        isDateBefore(confirmedOn, record.quoteDate) ||
        isDateBefore(record.validUntil, confirmedOn) ||
        isDateBefore(today, confirmedOn)
      ) {
        throw validationError("确认日期不在允许范围内", [
          {
            path: "/confirmedOn",
            code: "date_out_of_range",
            message: "确认日期须在报价日期、有效期及业务今天范围内",
          },
        ]);
      }
      if (record.issuedSnapshot === null) {
        throw stateConflict("报价缺少提交冻结快照");
      }
      const snapshot = structuredClone(
        record.issuedSnapshot,
      ) as unknown as TradeSnapshot;
      await transaction.insert(quoteConfirmation).values({
        quoteId: record.id,
        method,
        confirmedOn,
        note,
        confirmedSnapshot: snapshot,
        recordedAt: now,
        recordedBy: identity.user.id,
      });
      await transaction
        .update(quote)
        .set({
          state: "CONFIRMED",
          rowVersion: record.rowVersion + 1,
          updatedAt: now,
        })
        .where(
          and(
            eq(quote.id, record.id),
            eq(quote.rowVersion, input.expectedVersion),
            eq(quote.state, "AWAITING_CUSTOMER"),
          ),
        );

      return {
        result: await readQuote(transaction, identity, record.id),
        resourceId: record.id,
        responseStatus: 200,
        beforeVersion: record.rowVersion,
        afterVersion: record.rowVersion + 1,
      };
    },
  );
}
