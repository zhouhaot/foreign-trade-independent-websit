import { and, eq } from "drizzle-orm";

import type { DbTransaction } from "../../db";
import { auditEvent, idempotencyRecord } from "../../db/schema";
import {
  lockActorIdempotencyKey,
  type AuditStore,
  type IdempotencyStore,
} from "../../shared/transactions";

export const quoteIdempotencyStore: IdempotencyStore<DbTransaction> = {
  async find(transaction, actorUserId, idempotencyKey) {
    await lockActorIdempotencyKey(transaction, actorUserId, idempotencyKey);
    const records = await transaction
      .select()
      .from(idempotencyRecord)
      .where(
        and(
          eq(idempotencyRecord.actorUserId, actorUserId),
          eq(idempotencyRecord.idempotencyKey, idempotencyKey),
        ),
      )
      .limit(1);
    const record = records[0];
    return record
      ? { ...record, responseStatus: record.responseStatus as 200 | 201 }
      : null;
  },

  async insert(transaction, record) {
    await transaction.insert(idempotencyRecord).values(record);
  },
};

export const quoteAuditStore: AuditStore<DbTransaction> = {
  async append(transaction, event) {
    await transaction.insert(auditEvent).values({
      ...event,
      reason: event.reason ?? null,
    });
  },
};
