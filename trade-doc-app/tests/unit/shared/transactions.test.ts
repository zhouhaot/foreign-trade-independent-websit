import { describe, expect, it, vi } from "vitest";

import {
  runIdempotentTransaction,
  type AuditEvent,
  type IdempotencyRecord,
  type IdempotencyStore,
  type TransactionRunner,
} from "../../../src/server/shared/transactions";

type Tx = { name: string };
const tx: Tx = { name: "unit-transaction" };
const runTransaction: TransactionRunner<Tx> = (work) => work(tx);

function setup(existing: IdempotencyRecord | null = null) {
  const records = new Map<string, IdempotencyRecord>();
  if (existing !== null) {
    records.set(existing.idempotencyKey, existing);
  }
  const events: AuditEvent[] = [];
  const idempotencyStore: IdempotencyStore<Tx> = {
    find: vi.fn(async (_tx, _actor, key) => records.get(key) ?? null),
    insert: vi.fn(async (_tx, record) => {
      records.set(record.idempotencyKey, record);
    }),
  };
  const auditStore = {
    append: vi.fn(async (_tx: Tx, event: AuditEvent) => {
      events.push(event);
    }),
  };
  return { records, events, idempotencyStore, auditStore };
}

const optionsBase = {
  runTransaction,
  actorUserId: "actor-1",
  idempotencyKey: "key-1",
  operationId: "createCustomer",
  requestHash: "hash-1",
  resourceType: "customer",
  requestId: "request-1",
};

describe("idempotent business transaction composition", () => {
  it("commits one business result, idempotency record and success audit", async () => {
    // @tier durable
    const stores = setup();
    const result = await runIdempotentTransaction({
      ...optionsBase,
      ...stores,
      work: async (transaction) => {
        expect(transaction).toBe(tx);
        return {
          result: { id: "customer-1" },
          resourceId: "customer-1",
          responseStatus: 201,
          beforeVersion: null,
          afterVersion: 1,
        };
      },
    });

    expect(result).toEqual({
      kind: "executed",
      result: { id: "customer-1" },
      responseStatus: 201,
    });
    expect(stores.records.get("key-1")).toMatchObject({
      actorUserId: "actor-1",
      operationId: "createCustomer",
      requestHash: "hash-1",
      resourceId: "customer-1",
      responseStatus: 201,
    });
    expect(stores.events).toHaveLength(1);
    expect(stores.events[0]).toMatchObject({
      resourceId: "customer-1",
      beforeVersion: null,
      afterVersion: 1,
      requestId: "request-1",
    });
  });

  it("replays the same hash without executing business work or adding audit", async () => {
    // @tier durable
    const stores = setup({
      id: "idem-1",
      actorUserId: "actor-1",
      idempotencyKey: "key-1",
      operationId: "createCustomer",
      requestHash: "hash-1",
      resourceId: "customer-1",
      responseStatus: 201,
      createdAt: new Date("2026-01-01T00:00:00Z"),
    });
    const work = vi.fn();
    const result = await runIdempotentTransaction({
      ...optionsBase,
      ...stores,
      work,
    });

    expect(result).toEqual({
      kind: "replayed",
      resourceId: "customer-1",
      responseStatus: 200,
    });
    expect(work).not.toHaveBeenCalled();
    expect(stores.events).toHaveLength(0);
  });

  it("rejects key reuse with a different request hash before business work", async () => {
    // @tier durable
    const stores = setup({
      id: "idem-1",
      actorUserId: "actor-1",
      idempotencyKey: "key-1",
      operationId: "createCustomer",
      requestHash: "hash-1",
      resourceId: "customer-1",
      responseStatus: 201,
      createdAt: new Date("2026-01-01T00:00:00Z"),
    });
    const work = vi.fn();

    await expect(
      runIdempotentTransaction({
        ...optionsBase,
        ...stores,
        requestHash: "different-hash",
        work,
      }),
    ).rejects.toMatchObject({ status: 409, code: "IDEMPOTENCY_CONFLICT" });
    expect(work).not.toHaveBeenCalled();
    expect(stores.events).toHaveLength(0);
  });
});
