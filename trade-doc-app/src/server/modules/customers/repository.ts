import { and, count, desc, eq, ilike, or, type SQL } from "drizzle-orm";

import { db, schema, type DbTransaction } from "../../db";
import {
  lockActorIdempotencyKey,
  type AuditEvent,
  type IdempotencyRecord,
  type Pagination,
} from "../../shared";
import type { CustomerCreateInput, CustomerUpdateInput } from "./dto";

export type CustomerDatabase = Pick<typeof db, "select" | "insert" | "update">;
export type CustomerRecord = typeof schema.customer.$inferSelect;

export interface CustomerRepository {
  list(
    database: CustomerDatabase,
    ownerUserId: string | null,
    pagination: Pagination,
  ): Promise<{ items: CustomerRecord[]; total: number }>;
  find(
    database: CustomerDatabase,
    id: string,
    ownerUserId: string | null,
    lock?: boolean,
  ): Promise<CustomerRecord | null>;
  insert(
    transaction: DbTransaction,
    ownerUserId: string,
    input: CustomerCreateInput,
  ): Promise<CustomerRecord>;
  update(
    transaction: DbTransaction,
    id: string,
    ownerUserId: string,
    expectedVersion: number,
    input: CustomerUpdateInput,
    updatedAt: Date,
  ): Promise<CustomerRecord | null>;
}

function customerFilter(ownerUserId: string | null, q: string): SQL | undefined {
  const scope = ownerUserId === null
    ? undefined
    : eq(schema.customer.ownerUserId, ownerUserId);
  const pattern = `%${q.replaceAll("\\", "\\\\").replaceAll("%", "\\%").replaceAll("_", "\\_")}%`;
  const search = q === ""
    ? undefined
    : or(
        ilike(schema.customer.nameCn, pattern),
        ilike(schema.customer.nameEn, pattern),
        ilike(schema.customer.country, pattern),
        ilike(schema.customer.contact, pattern),
        ilike(schema.customer.email, pattern),
        ilike(schema.customer.phone, pattern),
        ilike(schema.customer.address, pattern),
        ilike(schema.customer.remark, pattern),
      );
  return and(scope, search);
}

export const customerRepository: CustomerRepository = {
  async list(database, ownerUserId, pagination) {
    const filter = customerFilter(ownerUserId, pagination.q);
    const [items, totals] = await Promise.all([
      database
        .select()
        .from(schema.customer)
        .where(filter)
        .orderBy(desc(schema.customer.createdAt), desc(schema.customer.id))
        .limit(pagination.pageSize)
        .offset(pagination.offset),
      database.select({ value: count() }).from(schema.customer).where(filter),
    ]);
    return { items, total: totals[0]?.value ?? 0 };
  },

  async find(database, id, ownerUserId, lock = false) {
    const filter = and(
      eq(schema.customer.id, id),
      ownerUserId === null
        ? undefined
        : eq(schema.customer.ownerUserId, ownerUserId),
    );
    const query = database.select().from(schema.customer).where(filter).limit(1);
    const records = await (lock ? query.for("update") : query);
    return records[0] ?? null;
  },

  async insert(transaction, ownerUserId, input) {
    const records = await transaction
      .insert(schema.customer)
      .values({ ...input, ownerUserId, createdBy: ownerUserId })
      .returning();
    return records[0]!;
  },

  async update(transaction, id, ownerUserId, expectedVersion, input, updatedAt) {
    const fields = {
      nameCn: input.nameCn,
      nameEn: input.nameEn,
      country: input.country,
      contact: input.contact,
      email: input.email,
      phone: input.phone,
      address: input.address,
      remark: input.remark,
    };
    const records = await transaction
      .update(schema.customer)
      .set({
        ...fields,
        rowVersion: expectedVersion + 1,
        updatedAt,
      })
      .where(
        and(
          eq(schema.customer.id, id),
          eq(schema.customer.ownerUserId, ownerUserId),
          eq(schema.customer.rowVersion, expectedVersion),
        ),
      )
      .returning();
    return records[0] ?? null;
  },
};

export const idempotencyStore = {
  async find(
    transaction: DbTransaction,
    actorUserId: string,
    idempotencyKey: string,
  ) {
    await lockActorIdempotencyKey(transaction, actorUserId, idempotencyKey);
    const records = await transaction
      .select()
      .from(schema.idempotencyRecord)
      .where(
        and(
          eq(schema.idempotencyRecord.actorUserId, actorUserId),
          eq(schema.idempotencyRecord.idempotencyKey, idempotencyKey),
        ),
      )
      .limit(1)
      .for("update");
    const record = records[0];
    return record
      ? { ...record, responseStatus: record.responseStatus as 200 | 201 }
      : null;
  },

  async insert(transaction: DbTransaction, record: IdempotencyRecord) {
    await transaction.insert(schema.idempotencyRecord).values(record);
  },
};

export const auditStore = {
  async append(transaction: DbTransaction, event: AuditEvent) {
    await transaction.insert(schema.auditEvent).values(event);
  },
};
