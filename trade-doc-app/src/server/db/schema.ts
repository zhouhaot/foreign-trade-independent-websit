import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  date,
  foreignKey,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  timestamp,
  unique,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

export type Snapshot = Record<string, unknown>;

const productSnapshotKeys = sql`?& array['productId', 'productVersion', 'sku', 'nameCn', 'nameEn', 'spec', 'unit', 'hsCode', 'schemaVersion']`;
const tradeSnapshotKeys = sql`?& array['snapshotVersion', 'submittedQuoteVersion', 'seller', 'customer', 'quoteDate', 'validUntil', 'currency', 'tradeTerm', 'paymentTerm', 'remark', 'items', 'totalAmount', 'frozenAt', 'schemaVersion']`;

export const appUser = pgTable(
  "app_user",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    loginKey: varchar("login_key", { length: 100 }).notNull(),
    displayName: varchar("display_name", { length: 100 }).notNull(),
    passwordHash: varchar("password_hash", { length: 512 }).notNull(),
    roleCode: varchar("role_code", { length: 5 })
      .$type<"admin" | "sales" | "doc" | "fin" | "boss">()
      .notNull(),
    enabled: boolean("enabled").notNull(),
    authVersion: integer("auth_version").notNull().default(1),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    rowVersion: integer("row_version").notNull().default(1),
  },
  (table) => [
    unique("app_user_login_key_unique").on(table.loginKey),
    check(
      "app_user_role_code_check",
      sql`${table.roleCode} in ('admin', 'sales', 'doc', 'fin', 'boss')`,
    ),
    check("app_user_auth_version_check", sql`${table.authVersion} > 0`),
    check("app_user_row_version_check", sql`${table.rowVersion} > 0`),
  ],
);

export const userSession = pgTable(
  "user_session",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sessionKeyHash: varchar("session_key_hash", { length: 128 }).notNull(),
    userId: uuid("user_id").references(() => appUser.id),
    authVersion: integer("auth_version"),
    csrfTokenHash: varchar("csrf_token_hash", { length: 128 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
  },
  (table) => [
    unique("user_session_session_key_hash_unique").on(table.sessionKeyHash),
    check("user_session_expiry_check", sql`${table.expiresAt} > ${table.createdAt}`),
    check(
      "user_session_auth_pair_check",
      sql`(${table.userId} is null and ${table.authVersion} is null) or (${table.userId} is not null and ${table.authVersion} is not null and ${table.authVersion} > 0)`,
    ),
  ],
);

export const currencyCatalog = pgTable(
  "currency_catalog",
  {
    code: varchar("code", { length: 3 }).primaryKey(),
    displayName: varchar("display_name", { length: 100 }).notNull(),
    amountScale: integer("amount_scale").notNull(),
    enabled: boolean("enabled").notNull(),
    rowVersion: integer("row_version").notNull().default(1),
  },
  (table) => [
    check("currency_catalog_code_check", sql`${table.code} ~ '^[A-Z]{3}$'`),
    check("currency_catalog_amount_scale_check", sql`${table.amountScale} >= 0`),
    check("currency_catalog_row_version_check", sql`${table.rowVersion} > 0`),
  ],
);

const commonColumns = () => ({
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  createdBy: uuid("created_by")
    .notNull()
    .references(() => appUser.id),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  rowVersion: integer("row_version").notNull().default(1),
});

export const companyProfile = pgTable(
  "company_profile",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    nameCn: varchar("name_cn", { length: 200 }).notNull(),
    nameEn: varchar("name_en", { length: 200 }).notNull(),
    legalName: varchar("legal_name", { length: 200 }).notNull(),
    address: varchar("address", { length: 1000 }).notNull(),
    contact: varchar("contact", { length: 100 }).notNull(),
    email: varchar("email", { length: 254 }).notNull(),
    phone: varchar("phone", { length: 50 }).notNull(),
    profileKey: varchar("profile_key", { length: 30 }).notNull(),
    ...commonColumns(),
  },
  (table) => [
    unique("company_profile_profile_key_unique").on(table.profileKey),
    check(
      "company_profile_profile_key_check",
      sql`${table.profileKey} = 'PRIMARY_COMPANY'`,
    ),
    check("company_profile_row_version_check", sql`${table.rowVersion} > 0`),
  ],
);

export const product = pgTable(
  "product",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sku: varchar("sku", { length: 64 }).notNull(),
    nameCn: varchar("name_cn", { length: 200 }).notNull(),
    nameEn: varchar("name_en", { length: 200 }).notNull(),
    spec: varchar("spec", { length: 1000 }).notNull(),
    unit: varchar("unit", { length: 30 }).notNull(),
    refPrice: numeric("ref_price", { precision: 20, scale: 2 }).notNull(),
    currency: varchar("currency", { length: 3 })
      .notNull()
      .references(() => currencyCatalog.code),
    enabled: boolean("enabled").notNull().default(true),
    hsCode: varchar("hs_code", { length: 30 }).notNull(),
    remark: varchar("remark", { length: 2000 }).notNull(),
    ...commonColumns(),
  },
  (table) => [
    unique("product_sku_unique").on(table.sku),
    check("product_ref_price_check", sql`${table.refPrice} >= 0`),
    check("product_row_version_check", sql`${table.rowVersion} > 0`),
    index("product_sku_idx").on(table.sku),
    index("product_name_en_id_idx").on(table.nameEn, table.id),
  ],
);

export const customer = pgTable(
  "customer",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ownerUserId: uuid("owner_user_id")
      .notNull()
      .references(() => appUser.id),
    nameCn: varchar("name_cn", { length: 200 }).notNull(),
    nameEn: varchar("name_en", { length: 200 }).notNull(),
    country: varchar("country", { length: 100 }).notNull(),
    address: varchar("address", { length: 1000 }).notNull(),
    contact: varchar("contact", { length: 100 }).notNull(),
    email: varchar("email", { length: 254 }).notNull(),
    phone: varchar("phone", { length: 50 }).notNull(),
    remark: varchar("remark", { length: 2000 }).notNull(),
    ...commonColumns(),
  },
  (table) => [
    unique("customer_id_owner_user_id_unique").on(table.id, table.ownerUserId),
    check("customer_row_version_check", sql`${table.rowVersion} > 0`),
    index("customer_owner_created_id_idx").on(
      table.ownerUserId,
      table.createdAt,
      table.id,
    ),
  ],
);

export const inquiry = pgTable(
  "inquiry",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ownerUserId: uuid("owner_user_id").notNull(),
    customerId: uuid("customer_id").notNull(),
    inquiryDate: date("inquiry_date").notNull(),
    status: varchar("status", { length: 9 })
      .$type<"FOLLOWING" | "QUOTED">()
      .notNull()
      .default("FOLLOWING"),
    source: varchar("source", { length: 100 }).notNull(),
    message: varchar("message", { length: 5000 }).notNull(),
    customerVersionAtCreation: integer("customer_version_at_creation").notNull(),
    ...commonColumns(),
  },
  (table) => [
    unique("inquiry_id_owner_user_id_unique").on(table.id, table.ownerUserId),
    unique("inquiry_id_owner_customer_unique").on(
      table.id,
      table.ownerUserId,
      table.customerId,
    ),
    foreignKey({
      name: "inquiry_customer_owner_fk",
      columns: [table.customerId, table.ownerUserId],
      foreignColumns: [customer.id, customer.ownerUserId],
    }),
    check(
      "inquiry_status_check",
      sql`${table.status} in ('FOLLOWING', 'QUOTED')`,
    ),
    check(
      "inquiry_customer_version_check",
      sql`${table.customerVersionAtCreation} > 0`,
    ),
    check("inquiry_row_version_check", sql`${table.rowVersion} > 0`),
    index("inquiry_owner_created_id_idx").on(
      table.ownerUserId,
      table.createdAt,
      table.id,
    ),
  ],
);

export const inquiryLine = pgTable(
  "inquiry_line",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    inquiryId: uuid("inquiry_id")
      .notNull()
      .references(() => inquiry.id),
    lineNo: integer("line_no").notNull(),
    productId: uuid("product_id")
      .notNull()
      .references(() => product.id),
    productVersion: integer("product_version").notNull(),
    productSnapshot: jsonb("product_snapshot").$type<Snapshot>().notNull(),
    quantity: numeric("quantity", { precision: 20, scale: 2 }).notNull(),
  },
  (table) => [
    unique("inquiry_line_inquiry_line_no_unique").on(table.inquiryId, table.lineNo),
    unique("inquiry_line_inquiry_id_id_unique").on(table.inquiryId, table.id),
    check("inquiry_line_line_no_check", sql`${table.lineNo} between 1 and 100`),
    check("inquiry_line_product_version_check", sql`${table.productVersion} > 0`),
    check("inquiry_line_quantity_check", sql`${table.quantity} > 0`),
    check(
      "inquiry_line_product_snapshot_check",
      sql`jsonb_typeof(${table.productSnapshot}) = 'object' and ${table.productSnapshot} ${productSnapshotKeys}`,
    ),
  ],
);

export const quote = pgTable(
  "quote",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    inquiryId: uuid("inquiry_id").notNull(),
    ownerUserId: uuid("owner_user_id").notNull(),
    customerId: uuid("customer_id").notNull(),
    state: varchar("state", { length: 18 })
      .$type<"DRAFT" | "AWAITING_CUSTOMER" | "CONFIRMED">()
      .notNull()
      .default("DRAFT"),
    quoteDate: date("quote_date").notNull(),
    validUntil: date("valid_until"),
    currency: varchar("currency", { length: 3 })
      .notNull()
      .references(() => currencyCatalog.code),
    tradeTerm: varchar("trade_term", { length: 200 }).notNull(),
    paymentTerm: varchar("payment_term", { length: 500 }).notNull(),
    remark: varchar("remark", { length: 2000 }).notNull(),
    totalAmount: numeric("total_amount", { precision: 20, scale: 2 }),
    issuedSnapshot: jsonb("issued_snapshot").$type<Snapshot>(),
    issuedAt: timestamp("issued_at", { withTimezone: true }),
    convertedAt: timestamp("converted_at", { withTimezone: true }),
    ...commonColumns(),
  },
  (table) => [
    unique("quote_inquiry_id_unique").on(table.inquiryId),
    unique("quote_id_owner_user_id_unique").on(table.id, table.ownerUserId),
    unique("quote_id_inquiry_id_unique").on(table.id, table.inquiryId),
    foreignKey({
      name: "quote_inquiry_owner_customer_fk",
      columns: [table.inquiryId, table.ownerUserId, table.customerId],
      foreignColumns: [inquiry.id, inquiry.ownerUserId, inquiry.customerId],
    }),
    check(
      "quote_state_check",
      sql`${table.state} in ('DRAFT', 'AWAITING_CUSTOMER', 'CONFIRMED')`,
    ),
    check(
      "quote_valid_until_check",
      sql`${table.validUntil} is null or ${table.validUntil} >= ${table.quoteDate}`,
    ),
    check("quote_total_amount_check", sql`${table.totalAmount} is null or ${table.totalAmount} > 0`),
    check(
      "quote_state_snapshot_check",
      sql`(${table.state} = 'DRAFT' and ${table.issuedSnapshot} is null and ${table.issuedAt} is null) or (${table.state} in ('AWAITING_CUSTOMER', 'CONFIRMED') and ${table.issuedSnapshot} is not null and ${table.issuedAt} is not null and ${table.validUntil} is not null and ${table.totalAmount} is not null)`,
    ),
    check(
      "quote_issued_snapshot_check",
      sql`${table.issuedSnapshot} is null or (jsonb_typeof(${table.issuedSnapshot}) = 'object' and ${table.issuedSnapshot} ${tradeSnapshotKeys})`,
    ),
    check(
      "quote_converted_state_check",
      sql`${table.convertedAt} is null or ${table.state} = 'CONFIRMED'`,
    ),
    check("quote_row_version_check", sql`${table.rowVersion} > 0`),
    index("quote_owner_state_created_id_idx").on(
      table.ownerUserId,
      table.state,
      table.createdAt,
      table.id,
    ),
  ],
);

export const quoteLine = pgTable(
  "quote_line",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    quoteId: uuid("quote_id").notNull(),
    inquiryId: uuid("inquiry_id").notNull(),
    inquiryLineId: uuid("inquiry_line_id").notNull(),
    lineNo: integer("line_no").notNull(),
    productSnapshot: jsonb("product_snapshot").$type<Snapshot>().notNull(),
    quantity: numeric("quantity", { precision: 20, scale: 2 }).notNull(),
    unitPrice: numeric("unit_price", { precision: 20, scale: 2 }),
    lineAmount: numeric("line_amount", { precision: 20, scale: 2 }),
  },
  (table) => [
    unique("quote_line_quote_line_no_unique").on(table.quoteId, table.lineNo),
    unique("quote_line_quote_inquiry_line_unique").on(
      table.quoteId,
      table.inquiryLineId,
    ),
    unique("quote_line_quote_id_id_unique").on(table.quoteId, table.id),
    foreignKey({
      name: "quote_line_quote_inquiry_fk",
      columns: [table.quoteId, table.inquiryId],
      foreignColumns: [quote.id, quote.inquiryId],
    }),
    foreignKey({
      name: "quote_line_inquiry_line_fk",
      columns: [table.inquiryId, table.inquiryLineId],
      foreignColumns: [inquiryLine.inquiryId, inquiryLine.id],
    }),
    check("quote_line_line_no_check", sql`${table.lineNo} between 1 and 100`),
    check("quote_line_quantity_check", sql`${table.quantity} > 0`),
    check(
      "quote_line_product_snapshot_check",
      sql`jsonb_typeof(${table.productSnapshot}) = 'object' and ${table.productSnapshot} ${productSnapshotKeys}`,
    ),
    check(
      "quote_line_exact_amount_check",
      sql`(${table.unitPrice} is null and ${table.lineAmount} is null) or (${table.unitPrice} is not null and ${table.lineAmount} is not null and ${table.unitPrice} > 0 and ${table.lineAmount} = ${table.quantity} * ${table.unitPrice})`,
    ),
  ],
);

export const quoteConfirmation = pgTable(
  "quote_confirmation",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    quoteId: uuid("quote_id")
      .notNull()
      .references(() => quote.id),
    method: varchar("method", { length: 100 }).notNull(),
    confirmedOn: date("confirmed_on").notNull(),
    note: varchar("note", { length: 2000 }).notNull(),
    confirmedSnapshot: jsonb("confirmed_snapshot").$type<Snapshot>().notNull(),
    recordedAt: timestamp("recorded_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    recordedBy: uuid("recorded_by")
      .notNull()
      .references(() => appUser.id),
  },
  (table) => [
    unique("quote_confirmation_quote_id_unique").on(table.quoteId),
    check(
      "quote_confirmation_method_check",
      sql`char_length(btrim(${table.method})) > 0`,
    ),
    check(
      "quote_confirmation_note_check",
      sql`char_length(btrim(${table.note})) > 0`,
    ),
    check(
      "quote_confirmation_snapshot_check",
      sql`jsonb_typeof(${table.confirmedSnapshot}) = 'object' and ${table.confirmedSnapshot} ${tradeSnapshotKeys}`,
    ),
  ],
);

export const salesOrder = pgTable(
  "sales_order",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sourceQuoteId: uuid("source_quote_id").notNull(),
    ownerUserId: uuid("owner_user_id").notNull(),
    orderProgress: varchar("order_progress", { length: 17 })
      .$type<"PENDING_EXECUTION">()
      .notNull()
      .default("PENDING_EXECUTION"),
    ...commonColumns(),
  },
  (table) => [
    unique("sales_order_source_quote_id_unique").on(table.sourceQuoteId),
    unique("sales_order_id_source_quote_id_unique").on(table.id, table.sourceQuoteId),
    foreignKey({
      name: "sales_order_quote_owner_fk",
      columns: [table.sourceQuoteId, table.ownerUserId],
      foreignColumns: [quote.id, quote.ownerUserId],
    }),
    foreignKey({
      name: "sales_order_quote_confirmation_fk",
      columns: [table.sourceQuoteId],
      foreignColumns: [quoteConfirmation.quoteId],
    }),
    check(
      "sales_order_order_progress_check",
      sql`${table.orderProgress} = 'PENDING_EXECUTION'`,
    ),
    check("sales_order_row_version_check", sql`${table.rowVersion} > 0`),
    index("sales_order_owner_created_id_idx").on(
      table.ownerUserId,
      table.createdAt,
      table.id,
    ),
  ],
);

export const orderVersion = pgTable(
  "order_version",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderId: uuid("order_id").notNull(),
    sourceQuoteId: uuid("source_quote_id").notNull(),
    versionNo: integer("version_no").notNull().default(1),
    deliveryDate: date("delivery_date").notNull(),
    currency: varchar("currency", { length: 3 })
      .notNull()
      .references(() => currencyCatalog.code),
    totalAmount: numeric("total_amount", { precision: 20, scale: 2 }).notNull(),
    confirmedSnapshot: jsonb("confirmed_snapshot").$type<Snapshot>().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => appUser.id),
  },
  (table) => [
    unique("order_version_order_version_no_unique").on(table.orderId, table.versionNo),
    unique("order_version_id_source_quote_id_unique").on(table.id, table.sourceQuoteId),
    foreignKey({
      name: "order_version_order_quote_fk",
      columns: [table.orderId, table.sourceQuoteId],
      foreignColumns: [salesOrder.id, salesOrder.sourceQuoteId],
    }),
    check("order_version_version_no_check", sql`${table.versionNo} = 1`),
    check("order_version_total_amount_check", sql`${table.totalAmount} > 0`),
    check(
      "order_version_snapshot_check",
      sql`jsonb_typeof(${table.confirmedSnapshot}) = 'object' and ${table.confirmedSnapshot} ${tradeSnapshotKeys}`,
    ),
  ],
);

export const orderLine = pgTable(
  "order_line",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderVersionId: uuid("order_version_id").notNull(),
    sourceQuoteId: uuid("source_quote_id").notNull(),
    sourceQuoteLineId: uuid("source_quote_line_id").notNull(),
    lineNo: integer("line_no").notNull(),
    productSnapshot: jsonb("product_snapshot").$type<Snapshot>().notNull(),
    quantity: numeric("quantity", { precision: 20, scale: 2 }).notNull(),
    unitPrice: numeric("unit_price", { precision: 20, scale: 2 }).notNull(),
    lineAmount: numeric("line_amount", { precision: 20, scale: 2 }).notNull(),
  },
  (table) => [
    unique("order_line_version_line_no_unique").on(table.orderVersionId, table.lineNo),
    unique("order_line_version_quote_line_unique").on(
      table.orderVersionId,
      table.sourceQuoteLineId,
    ),
    foreignKey({
      name: "order_line_order_version_quote_fk",
      columns: [table.orderVersionId, table.sourceQuoteId],
      foreignColumns: [orderVersion.id, orderVersion.sourceQuoteId],
    }),
    foreignKey({
      name: "order_line_source_quote_line_fk",
      columns: [table.sourceQuoteId, table.sourceQuoteLineId],
      foreignColumns: [quoteLine.quoteId, quoteLine.id],
    }),
    check("order_line_line_no_check", sql`${table.lineNo} between 1 and 100`),
    check("order_line_quantity_check", sql`${table.quantity} > 0`),
    check("order_line_unit_price_check", sql`${table.unitPrice} > 0`),
    check(
      "order_line_exact_amount_check",
      sql`${table.lineAmount} = ${table.quantity} * ${table.unitPrice}`,
    ),
    check(
      "order_line_product_snapshot_check",
      sql`jsonb_typeof(${table.productSnapshot}) = 'object' and ${table.productSnapshot} ${productSnapshotKeys}`,
    ),
  ],
);

export const idempotencyRecord = pgTable(
  "idempotency_record",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    actorUserId: uuid("actor_user_id")
      .notNull()
      .references(() => appUser.id),
    idempotencyKey: varchar("idempotency_key", { length: 128 }).notNull(),
    operationId: varchar("operation_id", { length: 100 }).notNull(),
    requestHash: varchar("request_hash", { length: 128 }).notNull(),
    resourceId: uuid("resource_id").notNull(),
    responseStatus: integer("response_status").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    unique("idempotency_record_actor_key_unique").on(
      table.actorUserId,
      table.idempotencyKey,
    ),
    check(
      "idempotency_record_response_status_check",
      sql`${table.responseStatus} in (200, 201)`,
    ),
  ],
);

export const auditEvent = pgTable(
  "audit_event",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    actorUserId: uuid("actor_user_id")
      .notNull()
      .references(() => appUser.id),
    operationId: varchar("operation_id", { length: 100 }).notNull(),
    resourceType: varchar("resource_type", { length: 50 }).notNull(),
    resourceId: uuid("resource_id").notNull(),
    requestId: uuid("request_id").notNull(),
    beforeVersion: integer("before_version"),
    afterVersion: integer("after_version").notNull(),
    occurredAt: timestamp("occurred_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    reason: varchar("reason", { length: 2000 }),
  },
  (table) => [
    check("audit_event_after_version_check", sql`${table.afterVersion} > 0`),
    index("audit_event_resource_occurred_id_idx").on(
      table.resourceType,
      table.resourceId,
      table.occurredAt,
      table.id,
    ),
  ],
);
