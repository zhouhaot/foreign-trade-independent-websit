import { randomUUID } from "node:crypto";

import { describe, expect, it, vi } from "vitest";

vi.hoisted(() => {
  process.env.DATABASE_URL ??= "postgresql://synthetic:synthetic@127.0.0.1:5432/trade_doc_test";
});

import type { AuthIdentity, Role } from "../../../src/server/auth";
import type { DbTransaction } from "../../../src/server/db";
import {
  createCustomer,
  getCustomer,
  listCustomers,
  updateCustomer,
  type CustomerCommand,
  type CustomerServiceDependencies,
} from "../../../src/server/modules/customers/service";
import type { CustomerCreateInput } from "../../../src/server/modules/customers/dto";
import type {
  CustomerDatabase,
  CustomerRecord,
  CustomerRepository,
} from "../../../src/server/modules/customers/repository";
import type {
  AuditEvent,
  IdempotencyRecord,
  Pagination,
  TransactionRunner,
} from "../../../src/server/shared";

const salesA = "00000000-0000-4000-8000-000000000002";
const salesB = "00000000-0000-4000-8000-000000000003";
const boss = "00000000-0000-4000-8000-000000000004";

function identity(id: string, role: Role): AuthIdentity {
  return {
    sessionId: randomUUID(),
    user: { id, username: `synthetic-${role}`, displayName: role, role },
  };
}

const input: CustomerCreateInput = {
  nameCn: "合成客户",
  nameEn: "Shared Synthetic Customer",
  country: "Testland",
  contact: "Synthetic Buyer",
  email: "buyer@example.invalid",
  phone: "+1-000-0000",
  address: "1 Test Only Road",
  remark: "Test use only",
};

function command(key: string = randomUUID(), requestHash = key): CustomerCommand {
  return { idempotencyKey: key, requestHash, requestId: randomUUID() };
}

function pagination(page = 1, pageSize = 20, q = ""): Pagination {
  return { page, pageSize, offset: (page - 1) * pageSize, q };
}

function setup() {
  const records: CustomerRecord[] = [];
  const idempotencyRecords = new Map<string, IdempotencyRecord>();
  const auditEvents: AuditEvent[] = [];
  let sequence = 0;
  const nextId = () => {
    sequence += 1;
    return `00000000-0000-4000-8000-${String(sequence + 1000).padStart(12, "0")}`;
  };
  const repository: CustomerRepository = {
    async list(_database, ownerUserId, page) {
      const filtered = records
        .filter((record) => ownerUserId === null || record.ownerUserId === ownerUserId)
        .filter((record) =>
          page.q === ""
            ? true
            : Object.values(record).some(
                (value) => typeof value === "string" && value.toLowerCase().includes(page.q.toLowerCase()),
              ),
        )
        .sort((left, right) =>
          right.createdAt.getTime() - left.createdAt.getTime() || right.id.localeCompare(left.id),
        );
      return {
        items: filtered.slice(page.offset, page.offset + page.pageSize),
        total: filtered.length,
      };
    },
    async find(_database, id, ownerUserId) {
      return records.find(
        (record) =>
          record.id === id &&
          (ownerUserId === null || record.ownerUserId === ownerUserId),
      ) ?? null;
    },
    async insert(_transaction, ownerUserId, values) {
      const now = new Date(`2026-01-01T00:00:${String(sequence).padStart(2, "0")}.000Z`);
      const record: CustomerRecord = {
        id: nextId(),
        ...values,
        ownerUserId,
        createdBy: ownerUserId,
        rowVersion: 1,
        createdAt: now,
        updatedAt: now,
      };
      records.push(record);
      return record;
    },
    async update(_transaction, id, ownerUserId, expectedVersion, values, updatedAt) {
      const index = records.findIndex(
        (record) =>
          record.id === id &&
          record.ownerUserId === ownerUserId &&
          record.rowVersion === expectedVersion,
      );
      if (index < 0) return null;
      const fields = {
        nameCn: values.nameCn,
        nameEn: values.nameEn,
        country: values.country,
        contact: values.contact,
        email: values.email,
        phone: values.phone,
        address: values.address,
        remark: values.remark,
      };
      const updated = {
        ...records[index]!,
        ...fields,
        rowVersion: expectedVersion + 1,
        updatedAt,
      };
      records[index] = updated;
      return updated;
    },
  };
  const runTransaction: TransactionRunner<DbTransaction> = (work) =>
    work({} as DbTransaction);
  const dependencies: CustomerServiceDependencies = {
    database: {} as CustomerDatabase,
    repository,
    runTransaction,
    idempotencyStore: {
      async find(_transaction, actorUserId, idempotencyKey) {
        return idempotencyRecords.get(`${actorUserId}:${idempotencyKey}`) ?? null;
      },
      async insert(_transaction, record) {
        idempotencyRecords.set(`${record.actorUserId}:${record.idempotencyKey}`, record);
      },
    },
    auditStore: {
      async append(_transaction, event) {
        auditEvents.push(event);
      },
    },
  };
  return { records, idempotencyRecords, auditEvents, dependencies };
}

describe("customer service", () => {
  // @tier durable CUST-01
  it("creates with server ownership and updates with version and success audit", async () => {
    const state = setup();
    const created = await createCustomer(
      identity(salesA, "sales"),
      input,
      command(),
      state.dependencies,
    );
    expect(created.status).toBe(201);
    expect(created.customer).toMatchObject({ ownerUserId: salesA, version: 1 });

    const read = await getCustomer(identity(salesA, "sales"), created.customer.id, state.dependencies);
    expect(read.id).toBe(created.customer.id);
    const updated = await updateCustomer(
      identity(salesA, "sales"),
      created.customer.id,
      { ...input, nameEn: "Updated Customer", expectedVersion: 1 },
      command(),
      state.dependencies,
    );
    expect(updated.customer).toMatchObject({ nameEn: "Updated Customer", version: 2 });
    expect(state.auditEvents).toHaveLength(2);
    expect(state.auditEvents.map((event) => [event.actorUserId, event.beforeVersion, event.afterVersion])).toEqual([
      [salesA, null, 1],
      [salesA, 1, 2],
    ]);
  });

  // @tier durable CUST-02
  it("uses the same owner scope for list, search, total and pages beyond the end", async () => {
    const state = setup();
    await createCustomer(identity(salesA, "sales"), input, command(), state.dependencies);
    await createCustomer(identity(salesA, "sales"), input, command(), state.dependencies);
    await createCustomer(identity(salesB, "sales"), input, command(), state.dependencies);

    const firstPage = await listCustomers(identity(salesA, "sales"), pagination(1, 1, "shared"), state.dependencies);
    expect(firstPage).toMatchObject({ total: 2, totalPages: 2, page: 1 });
    expect(firstPage.items).toHaveLength(1);
    expect(firstPage.items.every((item) => item.ownerUserId === salesA)).toBe(true);
    const beyondEnd = await listCustomers(identity(salesA, "sales"), pagination(3, 1, "shared"), state.dependencies);
    expect(beyondEnd).toMatchObject({ items: [], total: 2, totalPages: 2, page: 3 });
    const noMatch = await listCustomers(identity(salesA, "sales"), pagination(1, 20, "absent"), state.dependencies);
    expect(noMatch).toMatchObject({ items: [], total: 0, totalPages: 0 });
    const bossPage = await listCustomers(identity(boss, "boss"), pagination(1, 20, "shared"), state.dependencies);
    expect(bossPage.total).toBe(3);
  });

  // @tier durable SCOPE-01 SCOPE-03
  it("hides cross-owner details and rejects roles outside the slice", async () => {
    const state = setup();
    const created = await createCustomer(identity(salesA, "sales"), input, command(), state.dependencies);
    for (const id of [created.customer.id, randomUUID()]) {
      await expect(getCustomer(identity(salesB, "sales"), id, state.dependencies)).rejects.toMatchObject({
        status: 404,
        code: "NOT_FOUND",
        currentVersion: undefined,
      });
    }
    await expect(
      updateCustomer(
        identity(salesB, "sales"),
        created.customer.id,
        { ...input, expectedVersion: 1 },
        command(),
        state.dependencies,
      ),
    ).rejects.toMatchObject({ status: 404, currentVersion: undefined });
    for (const role of ["admin", "doc", "fin"] as const) {
      await expect(listCustomers(identity(salesA, role), pagination(), state.dependencies)).rejects.toMatchObject({ status: 403 });
    }
    await expect(createCustomer(identity(boss, "boss"), input, command(), state.dependencies)).rejects.toMatchObject({ status: 403 });
    await expect(
      updateCustomer(
        identity(boss, "boss"),
        created.customer.id,
        { ...input, expectedVersion: 1 },
        command(),
        state.dependencies,
      ),
    ).rejects.toMatchObject({ status: 403 });
  });

  // @tier durable ERROR-01
  it("returns the current version only for an authorized version conflict", async () => {
    const state = setup();
    const created = await createCustomer(identity(salesA, "sales"), input, command(), state.dependencies);
    await expect(
      updateCustomer(
        identity(salesA, "sales"),
        created.customer.id,
        { ...input, expectedVersion: 2 },
        command(),
        state.dependencies,
      ),
    ).rejects.toMatchObject({ status: 409, code: "VERSION_CONFLICT", currentVersion: 1 });
  });

  // @tier durable IDEM-01 IDEM-02
  it("replays the current representation without duplicate business effects or audit", async () => {
    const state = setup();
    const createCommand = command();
    const created = await createCustomer(identity(salesA, "sales"), input, createCommand, state.dependencies);
    await updateCustomer(
      identity(salesA, "sales"),
      created.customer.id,
      { ...input, nameEn: "Current Name", expectedVersion: 1 },
      command(),
      state.dependencies,
    );
    const replayed = await createCustomer(identity(salesA, "sales"), input, createCommand, state.dependencies);
    expect(replayed).toMatchObject({
      status: 200,
      replayed: true,
      customer: { id: created.customer.id, version: 2, nameEn: "Current Name" },
    });
    expect(state.records).toHaveLength(1);
    expect(state.idempotencyRecords).toHaveLength(2);
    expect(state.auditEvents).toHaveLength(2);
    await expect(
      createCustomer(identity(salesA, "sales"), input, command(createCommand.idempotencyKey, "different"), state.dependencies),
    ).rejects.toMatchObject({ status: 409, code: "IDEMPOTENCY_CONFLICT" });
    expect(state.records).toHaveLength(1);
    expect(state.auditEvents).toHaveLength(2);
  });
});
