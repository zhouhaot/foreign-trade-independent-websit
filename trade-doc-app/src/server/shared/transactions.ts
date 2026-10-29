import { randomUUID } from "node:crypto";

import { sql } from "drizzle-orm";

import type { DbTransaction } from "../db";
import { ApiError } from "./errors";

export async function lockActorIdempotencyKey(
  transaction: Pick<DbTransaction, "execute">,
  actorUserId: string,
  idempotencyKey: string,
): Promise<void> {
  await transaction.execute(sql`
    select pg_advisory_xact_lock(
      hashtextextended(${actorUserId} || ':' || ${idempotencyKey}, 0)
    )
  `);
}

export type TransactionRunner<Tx> = <T>(
  work: (tx: Tx) => Promise<T>,
) => Promise<T>;

export interface IdempotencyRecord {
  id: string;
  actorUserId: string;
  idempotencyKey: string;
  operationId: string;
  requestHash: string;
  resourceId: string;
  responseStatus: 200 | 201;
  createdAt: Date;
}

export interface IdempotencyStore<Tx> {
  find(
    tx: Tx,
    actorUserId: string,
    idempotencyKey: string,
  ): Promise<IdempotencyRecord | null>;
  insert(tx: Tx, record: IdempotencyRecord): Promise<void>;
}

export interface AuditEvent {
  id: string;
  actorUserId: string;
  operationId: string;
  resourceType: string;
  resourceId: string;
  requestId: string;
  beforeVersion: number | null;
  afterVersion: number;
  occurredAt: Date;
  reason?: string;
}

export interface AuditStore<Tx> {
  append(tx: Tx, event: AuditEvent): Promise<void>;
}

export interface BusinessWorkResult<T> {
  result: T;
  resourceId: string;
  responseStatus: 200 | 201;
  beforeVersion: number | null;
  afterVersion: number;
  reason?: string;
}

export type IdempotentTransactionResult<T> =
  | { kind: "executed"; result: T; responseStatus: 200 | 201 }
  | { kind: "replayed"; resourceId: string; responseStatus: 200 };

export interface IdempotentTransactionOptions<Tx, T> {
  runTransaction: TransactionRunner<Tx>;
  idempotencyStore: IdempotencyStore<Tx>;
  auditStore: AuditStore<Tx>;
  actorUserId: string;
  idempotencyKey: string;
  operationId: string;
  requestHash: string;
  resourceType: string;
  requestId: string;
  work: (tx: Tx) => Promise<BusinessWorkResult<T>>;
}

export async function runIdempotentTransaction<Tx, T>(
  options: IdempotentTransactionOptions<Tx, T>,
): Promise<IdempotentTransactionResult<T>> {
  return options.runTransaction(async (tx) => {
    const existing = await options.idempotencyStore.find(
      tx,
      options.actorUserId,
      options.idempotencyKey,
    );
    if (existing !== null) {
      if (existing.requestHash !== options.requestHash) {
        throw new ApiError(
          409,
          "IDEMPOTENCY_CONFLICT",
          "幂等键已用于其他请求",
        );
      }
      return {
        kind: "replayed" as const,
        resourceId: existing.resourceId,
        responseStatus: 200 as const,
      };
    }

    const completed = await options.work(tx);
    const createdAt = new Date();
    const id = randomUUID();
    await options.idempotencyStore.insert(tx, {
      id,
      actorUserId: options.actorUserId,
      idempotencyKey: options.idempotencyKey,
      operationId: options.operationId,
      requestHash: options.requestHash,
      resourceId: completed.resourceId,
      responseStatus: completed.responseStatus,
      createdAt,
    });
    await options.auditStore.append(tx, {
      id: randomUUID(),
      actorUserId: options.actorUserId,
      operationId: options.operationId,
      resourceType: options.resourceType,
      resourceId: completed.resourceId,
      requestId: options.requestId,
      beforeVersion: completed.beforeVersion,
      afterVersion: completed.afterVersion,
      occurredAt: createdAt,
      ...(completed.reason === undefined ? {} : { reason: completed.reason }),
    });
    return {
      kind: "executed" as const,
      result: completed.result,
      responseStatus: completed.responseStatus,
    };
  });
}
