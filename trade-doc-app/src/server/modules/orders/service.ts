import { randomUUID } from "node:crypto";

import {
  and,
  asc,
  count,
  desc,
  eq,
  isNull,
  sql,
  type SQL,
} from "drizzle-orm";

import type { AuthIdentity } from "../../auth";
import { db, withTransaction, type DbTransaction } from "../../db";
import {
  auditEvent,
  idempotencyRecord,
  orderLine,
  orderVersion,
  quote,
  quoteConfirmation,
  quoteLine,
  salesOrder,
} from "../../db/schema";
import { businessDateFromInstant } from "../../shared/date";
import { ApiError } from "../../shared/errors";
import {
  pageResult,
  type Pagination,
} from "../../shared/http";
import { normalizeDecimal } from "../../shared/money";
import {
  lockActorIdempotencyKey,
  runIdempotentTransaction,
  type AuditStore,
  type IdempotencyStore,
  type TransactionRunner,
} from "../../shared/transactions";
import {
  copyConfirmedOrderLines,
  validateFirstConversion,
} from "./conversion";
import type {
  CreateOrderInput,
  CreateOrderResult,
  Order,
} from "./types";
import type { TradeSnapshot } from "./types";

type OrderDatabase = Pick<typeof db, "select">;

const idempotencyStore: IdempotencyStore<DbTransaction> = {
  async find(transaction, actorUserId, idempotencyKey) {
    await lockActorIdempotencyKey(transaction, actorUserId, idempotencyKey);
    const rows = await transaction
      .select()
      .from(idempotencyRecord)
      .where(
        and(
          eq(idempotencyRecord.actorUserId, actorUserId),
          eq(idempotencyRecord.idempotencyKey, idempotencyKey),
        ),
      )
      .limit(1);
    const record = rows[0];
    return record
      ? {
          ...record,
          responseStatus: record.responseStatus as 200 | 201,
        }
      : null;
  },
  async insert(transaction, record) {
    await transaction.insert(idempotencyRecord).values(record);
  },
};

const auditStore: AuditStore<DbTransaction> = {
  async append(transaction, event) {
    await transaction.insert(auditEvent).values(event);
  },
};

function forbiddenRole(): ApiError {
  return new ApiError(403, "FORBIDDEN_ROLE", "当前岗位无权执行此操作");
}

function notFound(): ApiError {
  return new ApiError(404, "NOT_FOUND", "订单不存在或不在当前数据范围");
}

function readScope(identity: AuthIdentity): SQL | undefined {
  if (identity.user.role === "sales") {
    return eq(salesOrder.ownerUserId, identity.user.id);
  }
  if (identity.user.role === "boss") {
    return undefined;
  }
  throw forbiddenRole();
}

function searchScope(q: string): SQL | undefined {
  if (q === "") return undefined;
  const escaped = q.replaceAll("\\", "\\\\").replaceAll("%", "\\%").replaceAll("_", "\\_");
  const pattern = `%${escaped}%`;
  return sql`(
    ${salesOrder.id}::text ilike ${pattern}
    or ${salesOrder.sourceQuoteId}::text ilike ${pattern}
    or ${orderVersion.confirmedSnapshot}->'customer'->>'nameCn' ilike ${pattern}
    or ${orderVersion.confirmedSnapshot}->'customer'->>'nameEn' ilike ${pattern}
    or ${orderVersion.confirmedSnapshot}->'seller'->>'legalName' ilike ${pattern}
    or exists (
      select 1 from ${orderLine}
      where ${orderLine.orderVersionId} = ${orderVersion.id}
        and (
          ${orderLine.productSnapshot}->>'sku' ilike ${pattern}
          or ${orderLine.productSnapshot}->>'nameCn' ilike ${pattern}
          or ${orderLine.productSnapshot}->>'nameEn' ilike ${pattern}
        )
    )
  )`;
}

async function readOrder(
  database: OrderDatabase,
  identity: AuthIdentity,
  orderId: string,
): Promise<Order | null> {
  const rows = await database
    .select({
      order: salesOrder,
      version: orderVersion,
      customerConfirmationId: quoteConfirmation.id,
    })
    .from(salesOrder)
    .innerJoin(
      orderVersion,
      and(
        eq(orderVersion.orderId, salesOrder.id),
        eq(orderVersion.versionNo, 1),
      ),
    )
    .innerJoin(
      quoteConfirmation,
      eq(quoteConfirmation.quoteId, salesOrder.sourceQuoteId),
    )
    .where(and(eq(salesOrder.id, orderId), readScope(identity)))
    .limit(1);
  const row = rows[0];
  if (!row) return null;

  const trade = row.version.confirmedSnapshot as TradeSnapshot;
  if (
    !Number.isInteger(trade.snapshotVersion) ||
    trade.snapshotVersion < 1
  ) {
    throw new Error("Order snapshot has no valid snapshot version");
  }
  const lines = await database
    .select()
    .from(orderLine)
    .where(eq(orderLine.orderVersionId, row.version.id))
    .orderBy(asc(orderLine.lineNo));
  if (!Array.isArray(trade.items) || trade.items.length !== lines.length) {
    throw new Error("Order lines do not match the confirmed snapshot");
  }

  return {
    id: row.order.id,
    version: row.order.rowVersion,
    ownerUserId: row.order.ownerUserId,
    sourceQuoteId: row.order.sourceQuoteId,
    sourceQuoteSnapshotVersion: trade.snapshotVersion,
    customerConfirmationId: row.customerConfirmationId,
    deliveryDate: row.version.deliveryDate,
    trade,
    orderProgress: row.order.orderProgress,
    documentProgress: "NOT_STARTED",
    paymentProgress: "UNPAID",
    createdAt: row.order.createdAt.toISOString(),
    updatedAt: row.order.updatedAt.toISOString(),
  };
}

export async function getOrder(
  identity: AuthIdentity,
  orderId: string,
  database: OrderDatabase = db,
): Promise<Order> {
  const order = await readOrder(database, identity, orderId);
  if (!order) throw notFound();
  return order;
}

export async function listOrders(
  identity: AuthIdentity,
  pagination: Pagination,
  database: OrderDatabase = db,
) {
  const where = and(readScope(identity), searchScope(pagination.q));
  const totals = await database
    .select({ total: count() })
    .from(salesOrder)
    .innerJoin(
      orderVersion,
      and(
        eq(orderVersion.orderId, salesOrder.id),
        eq(orderVersion.versionNo, 1),
      ),
    )
    .where(where);
  const total = totals[0]?.total ?? 0;
  const rows = await database
    .select({ id: salesOrder.id })
    .from(salesOrder)
    .innerJoin(
      orderVersion,
      and(
        eq(orderVersion.orderId, salesOrder.id),
        eq(orderVersion.versionNo, 1),
      ),
    )
    .where(where)
    .orderBy(desc(salesOrder.createdAt), desc(salesOrder.id))
    .limit(pagination.pageSize)
    .offset(pagination.offset);
  const items = await Promise.all(
    rows.map(async ({ id }) => {
      const order = await readOrder(database, identity, id);
      if (!order) throw new Error("Authorized order disappeared during listing");
      return order;
    }),
  );
  return pageResult(items, pagination, total);
}

export interface CreateOrderContext {
  idempotencyKey: string;
  requestHash: string;
  requestId: string;
}

export interface CreateOrderDependencies {
  runTransaction?: TransactionRunner<DbTransaction>;
  now?: () => Date;
  businessTimeZone?: string;
}

async function findReplay(
  transaction: DbTransaction,
  identity: AuthIdentity,
  context: CreateOrderContext,
): Promise<CreateOrderResult | null> {
  const existing = await idempotencyStore.find(
    transaction,
    identity.user.id,
    context.idempotencyKey,
  );
  if (!existing) return null;
  if (existing.requestHash !== context.requestHash) {
    throw new ApiError(409, "IDEMPOTENCY_CONFLICT", "幂等键已用于其他请求");
  }
  const order = await readOrder(transaction, identity, existing.resourceId);
  if (!order) throw notFound();
  return { order, status: 200, replayed: true };
}

async function findOrderBySourceQuote(
  transaction: DbTransaction,
  identity: AuthIdentity,
  sourceQuoteId: string,
): Promise<Order | null> {
  const rows = await transaction
    .select({ id: salesOrder.id })
    .from(salesOrder)
    .where(eq(salesOrder.sourceQuoteId, sourceQuoteId))
    .limit(1);
  const id = rows[0]?.id;
  return id ? readOrder(transaction, identity, id) : null;
}

export async function createOrderFromQuote(
  identity: AuthIdentity,
  quoteId: string,
  input: CreateOrderInput,
  context: CreateOrderContext,
  dependencies: CreateOrderDependencies = {},
): Promise<CreateOrderResult> {
  if (identity.user.role !== "sales") throw forbiddenRole();
  const runTransaction = dependencies.runTransaction ?? withTransaction;
  const now = (dependencies.now ?? (() => new Date()))();

  return runTransaction(async (transaction) => {
    const replay = await findReplay(transaction, identity, context);
    if (replay) return replay;

    const quotes = await transaction
      .select()
      .from(quote)
      .where(
        and(
          eq(quote.id, quoteId),
          eq(quote.ownerUserId, identity.user.id),
        ),
      )
      .limit(1)
      .for("update");
    const sourceQuote = quotes[0];
    if (!sourceQuote) {
      throw new ApiError(404, "NOT_FOUND", "报价不存在或不在当前数据范围");
    }

    const lockedReplay = await findReplay(transaction, identity, context);
    if (lockedReplay) return lockedReplay;

    const existingOrder = await findOrderBySourceQuote(
      transaction,
      identity,
      quoteId,
    );
    if (existingOrder) {
      if (existingOrder.deliveryDate !== input.deliveryDate) {
        throw new ApiError(
          409,
          "SOURCE_ALREADY_CONVERTED",
          "来源报价已成单，不能更改交期",
        );
      }
      await idempotencyStore.insert(transaction, {
        id: randomUUID(),
        actorUserId: identity.user.id,
        idempotencyKey: context.idempotencyKey,
        operationId: "createOrderFromQuote",
        requestHash: context.requestHash,
        resourceId: existingOrder.id,
        responseStatus: 200,
        createdAt: now,
      });
      return { order: existingOrder, status: 200, replayed: true };
    }

    const outcome = await runIdempotentTransaction({
      runTransaction: (work) => work(transaction),
      idempotencyStore,
      auditStore,
      actorUserId: identity.user.id,
      idempotencyKey: context.idempotencyKey,
      operationId: "createOrderFromQuote",
      requestHash: context.requestHash,
      resourceType: "order",
      requestId: context.requestId,
      work: async (workTransaction) => {
        const confirmations = await workTransaction
          .select()
          .from(quoteConfirmation)
          .where(eq(quoteConfirmation.quoteId, quoteId))
          .limit(1);
        const confirmation = confirmations[0] ?? null;
        const businessDate = businessDateFromInstant(
          now,
          dependencies.businessTimeZone ?? process.env.BUSINESS_TIME_ZONE,
        );
        validateFirstConversion(
          sourceQuote,
          confirmation,
          input.expectedVersion,
          input.deliveryDate,
          businessDate,
        );
        if (!confirmation) throw new Error("Confirmation disappeared");
        const snapshot = confirmation.confirmedSnapshot as TradeSnapshot;
        if (
          snapshot.currency !== sourceQuote.currency ||
          sourceQuote.totalAmount === null ||
          normalizeDecimal(sourceQuote.totalAmount) !==
            normalizeDecimal(snapshot.totalAmount)
        ) {
          throw new Error("Confirmed snapshot does not match source quote");
        }

        const sourceLines = await workTransaction
          .select({ id: quoteLine.id, lineNo: quoteLine.lineNo })
          .from(quoteLine)
          .where(eq(quoteLine.quoteId, quoteId))
          .orderBy(asc(quoteLine.lineNo));
        const lines = copyConfirmedOrderLines(
          sourceLines,
          confirmation.confirmedSnapshot,
        );
        const orderId = randomUUID();
        const versionId = randomUUID();
        await workTransaction.insert(salesOrder).values({
          id: orderId,
          sourceQuoteId: quoteId,
          ownerUserId: sourceQuote.ownerUserId,
          orderProgress: "PENDING_EXECUTION",
          createdAt: now,
          createdBy: identity.user.id,
          updatedAt: now,
          rowVersion: 1,
        });
        await workTransaction.insert(orderVersion).values({
          id: versionId,
          orderId,
          sourceQuoteId: quoteId,
          versionNo: 1,
          deliveryDate: input.deliveryDate,
          currency: snapshot.currency,
          totalAmount: normalizeDecimal(snapshot.totalAmount),
          confirmedSnapshot: confirmation.confirmedSnapshot,
          createdAt: now,
          createdBy: identity.user.id,
        });
        await workTransaction.insert(orderLine).values(
          lines.map((line) => ({
            id: randomUUID(),
            orderVersionId: versionId,
            sourceQuoteId: quoteId,
            ...line,
          })),
        );
        const converted = await workTransaction
          .update(quote)
          .set({
            convertedAt: now,
            updatedAt: now,
            rowVersion: sourceQuote.rowVersion + 1,
          })
          .where(
            and(
              eq(quote.id, quoteId),
              eq(quote.ownerUserId, identity.user.id),
              eq(quote.rowVersion, input.expectedVersion),
              eq(quote.state, "CONFIRMED"),
              isNull(quote.convertedAt),
            ),
          )
          .returning({ id: quote.id });
        if (converted.length !== 1) {
          throw new ApiError(
            409,
            "SOURCE_ALREADY_CONVERTED",
            "来源报价已成单或版本已变化",
          );
        }
        const order = await readOrder(workTransaction, identity, orderId);
        if (!order) throw new Error("Created order could not be read");
        return {
          result: order,
          resourceId: orderId,
          responseStatus: 201 as const,
          beforeVersion: null,
          afterVersion: 1,
        };
      },
    });

    if (outcome.kind === "replayed") {
      const order = await readOrder(transaction, identity, outcome.resourceId);
      if (!order) throw notFound();
      return { order, status: 200, replayed: true };
    }
    return { order: outcome.result, status: 201, replayed: false };
  });
}
