import type { AuthIdentity } from "../../auth";
import { db, withTransaction, type DbTransaction } from "../../db";
import {
  ApiError,
  pageResult,
  runIdempotentTransaction,
  type AuditStore,
  type BusinessWorkResult,
  type IdempotencyStore,
  type Pagination,
  type TransactionRunner,
} from "../../shared";
import type { CustomerCreateInput, CustomerUpdateInput } from "./dto";
import {
  auditStore,
  customerRepository,
  idempotencyStore,
  type CustomerDatabase,
  type CustomerRecord,
  type CustomerRepository,
} from "./repository";

export interface Customer {
  id: string;
  version: number;
  ownerUserId: string;
  nameCn: string;
  nameEn: string;
  country: string;
  contact: string;
  email: string;
  phone: string;
  address: string;
  remark: string;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerCommand {
  idempotencyKey: string;
  requestHash: string;
  requestId: string;
}

export interface CustomerServiceDependencies {
  database: CustomerDatabase;
  repository: CustomerRepository;
  runTransaction: TransactionRunner<DbTransaction>;
  idempotencyStore: IdempotencyStore<DbTransaction>;
  auditStore: AuditStore<DbTransaction>;
}

const defaultDependencies: CustomerServiceDependencies = {
  database: db,
  repository: customerRepository,
  runTransaction: withTransaction,
  idempotencyStore,
  auditStore,
};

function toCustomer(record: CustomerRecord): Customer {
  return {
    id: record.id,
    version: record.rowVersion,
    ownerUserId: record.ownerUserId,
    nameCn: record.nameCn,
    nameEn: record.nameEn,
    country: record.country,
    contact: record.contact,
    email: record.email,
    phone: record.phone,
    address: record.address,
    remark: record.remark,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}

function forbidden(): ApiError {
  return new ApiError(403, "FORBIDDEN_ROLE", "当前岗位无权执行此操作");
}

function notFound(): ApiError {
  return new ApiError(404, "NOT_FOUND", "客户不存在或无权访问");
}

function readScope(identity: AuthIdentity): string | null {
  if (identity.user.role === "boss") return null;
  if (identity.user.role === "sales") return identity.user.id;
  throw forbidden();
}

function requireSales(identity: AuthIdentity): string {
  if (identity.user.role !== "sales") throw forbidden();
  return identity.user.id;
}

export async function listCustomers(
  identity: AuthIdentity,
  pagination: Pagination,
  dependencies: CustomerServiceDependencies = defaultDependencies,
) {
  const ownerUserId = readScope(identity);
  const { items, total } = await dependencies.repository.list(
    dependencies.database,
    ownerUserId,
    pagination,
  );
  return pageResult(items.map(toCustomer), pagination, total);
}

async function readCustomer(
  identity: AuthIdentity,
  id: string,
  dependencies: CustomerServiceDependencies,
): Promise<Customer> {
  const ownerUserId = readScope(identity);
  const record = await dependencies.repository.find(
    dependencies.database,
    id,
    ownerUserId,
  );
  if (!record) throw notFound();
  return toCustomer(record);
}

export async function getCustomer(
  identity: AuthIdentity,
  id: string,
  dependencies: CustomerServiceDependencies = defaultDependencies,
): Promise<Customer> {
  return readCustomer(identity, id, dependencies);
}

export async function createCustomer(
  identity: AuthIdentity,
  input: CustomerCreateInput,
  command: CustomerCommand,
  dependencies: CustomerServiceDependencies = defaultDependencies,
) {
  const ownerUserId = requireSales(identity);
  const outcome = await runIdempotentTransaction({
    runTransaction: dependencies.runTransaction,
    idempotencyStore: dependencies.idempotencyStore,
    auditStore: dependencies.auditStore,
    actorUserId: ownerUserId,
    idempotencyKey: command.idempotencyKey,
    operationId: "createCustomer",
    requestHash: command.requestHash,
    resourceType: "customer",
    requestId: command.requestId,
    work: async (transaction): Promise<BusinessWorkResult<Customer>> => {
      requireSales(identity);
      const record = await dependencies.repository.insert(
        transaction,
        ownerUserId,
        input,
      );
      return {
        result: toCustomer(record),
        resourceId: record.id,
        responseStatus: 201,
        beforeVersion: null,
        afterVersion: record.rowVersion,
      };
    },
  });

  if (outcome.kind === "replayed") {
    return {
      customer: await readCustomer(identity, outcome.resourceId, dependencies),
      status: 200 as const,
      replayed: true,
    };
  }
  return { customer: outcome.result, status: outcome.responseStatus, replayed: false };
}

export async function updateCustomer(
  identity: AuthIdentity,
  id: string,
  input: CustomerUpdateInput,
  command: CustomerCommand,
  dependencies: CustomerServiceDependencies = defaultDependencies,
) {
  const ownerUserId = requireSales(identity);
  const outcome = await runIdempotentTransaction({
    runTransaction: dependencies.runTransaction,
    idempotencyStore: dependencies.idempotencyStore,
    auditStore: dependencies.auditStore,
    actorUserId: ownerUserId,
    idempotencyKey: command.idempotencyKey,
    operationId: "updateCustomer",
    requestHash: command.requestHash,
    resourceType: "customer",
    requestId: command.requestId,
    work: async (transaction): Promise<BusinessWorkResult<Customer>> => {
      requireSales(identity);
      const existing = await dependencies.repository.find(
        transaction,
        id,
        ownerUserId,
        true,
      );
      if (!existing) throw notFound();
      if (existing.rowVersion !== input.expectedVersion) {
        throw new ApiError(409, "VERSION_CONFLICT", "客户版本已变化", {
          currentVersion: existing.rowVersion,
        });
      }
      const record = await dependencies.repository.update(
        transaction,
        id,
        ownerUserId,
        input.expectedVersion,
        input,
        new Date(),
      );
      if (!record) {
        throw new ApiError(409, "VERSION_CONFLICT", "客户版本已变化", {
          currentVersion: existing.rowVersion,
        });
      }
      return {
        result: toCustomer(record),
        resourceId: record.id,
        responseStatus: 200,
        beforeVersion: existing.rowVersion,
        afterVersion: record.rowVersion,
      };
    },
  });

  if (outcome.kind === "replayed") {
    return {
      customer: await readCustomer(identity, outcome.resourceId, dependencies),
      status: 200 as const,
      replayed: true,
    };
  }
  return { customer: outcome.result, status: outcome.responseStatus, replayed: false };
}
