import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import process from "node:process";

import { request } from "@playwright/test";

export { assert };

export class BlockedCase extends Error {
  constructor(message, evidence = {}) {
    super(message);
    this.name = "BlockedCase";
    this.evidence = evidence;
  }
}

export function blocked(message, evidence) {
  throw new BlockedCase(message, evidence);
}

export function key() {
  return randomUUID();
}

export function today() {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: process.env.BUSINESS_TIME_ZONE ?? "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const values = new Map(parts.map((part) => [part.type, part.value]));
  return `${values.get("year")}-${values.get("month")}-${values.get("day")}`;
}

export function addDays(date, count) {
  const value = new Date(`${date}T00:00:00Z`);
  value.setUTCDate(value.getUTCDate() + count);
  return value.toISOString().slice(0, 10);
}

export function customerInput(tag, suffix = "") {
  return {
    nameCn: `合成验收客户 ${tag}${suffix}`,
    nameEn: `Synthetic Acceptance ${tag}${suffix}`,
    country: "Testland",
    contact: "Synthetic buyer",
    email: "buyer@example.invalid",
    phone: "+1-000-0000",
    address: "2 Synthetic Test Road",
    remark: "Synthetic acceptance only",
  };
}

export function productInput(tag, suffix = "") {
  return {
    sku: `ACC-${tag.toUpperCase()}${suffix}`.slice(0, 64),
    nameCn: `合成验收商品 ${tag}${suffix}`,
    nameEn: `Synthetic Product ${tag}${suffix}`,
    spec: "Test use only",
    unit: "piece",
    refPrice: "1.00",
    currency: "USD",
    hsCode: "000000",
    remark: "Synthetic acceptance only",
  };
}

export class Http {
  constructor(baseURL) {
    this.baseURL = baseURL;
  }

  async context() {
    return request.newContext({ baseURL: this.baseURL });
  }

  async csrf(context) {
    const response = await context.get("/api/v1/auth/csrf");
    assert.equal(response.status(), 200, "CSRF acquisition must succeed");
    assert.equal(response.headers()["cache-control"], "no-store");
    return (await response.json()).token;
  }

  async login(account) {
    const context = await this.context();
    const csrfResponse = await context.get("/api/v1/auth/csrf");
    assert.equal(csrfResponse.status(), 200);
    const anonymousCookie = csrfResponse.headers()["set-cookie"]?.split(";", 1)[0];
    const csrf = (await csrfResponse.json()).token;
    const response = await context.post("/api/v1/auth/login", {
      headers: { "X-CSRF-TOKEN": csrf },
      data: { username: account.username, password: account.password },
    });
    assert.equal(response.status(), 200, `Synthetic login failed for ${account.role}`);
    const body = await response.json();
    const authenticatedCookie = response.headers()["set-cookie"].split(";", 1)[0];
    assert.ok(anonymousCookie && authenticatedCookie !== anonymousCookie, "Login must rotate the opaque session");
    return {
      context,
      user: body.user,
      loginResponse: response,
      anonymousCsrfHash: createHash("sha256").update(csrf, "utf8").digest("hex"),
      sessionRotated: true,
    };
  }

  async send(context, method, path, body, options = {}) {
    const headers = { ...(options.headers ?? {}) };
    if (body !== undefined && !Object.keys(headers).some((name) => name.toLowerCase() === "content-type")) {
      headers["Content-Type"] = "application/json";
    }
    if (options.csrf !== null && !["GET", "HEAD"].includes(method)) {
      headers["X-CSRF-TOKEN"] = options.csrf ?? (await this.csrf(context));
    }
    if (options.key !== null && !["GET", "HEAD"].includes(method) && !path.startsWith("/api/v1/auth/")) {
      headers["Idempotency-Key"] = options.key ?? key();
    }
    const response = await context.fetch(path, { method, headers, ...(body === undefined ? {} : { data: body }) });
    const text = await response.text();
    let json = null;
    if (text) {
      try {
        json = JSON.parse(text);
      } catch {
        // The response status and sanitized text remain available to assertions.
      }
    }
    return { response, status: response.status(), body: json, text };
  }

  async expect(context, method, path, body, statuses = [200], options = {}) {
    const result = await this.send(context, method, path, body, options);
    assert.ok(
      statuses.includes(result.status),
      `${method} ${path}: expected ${statuses.join("/")}, got ${result.status}: ${safeSummary(result.body)}`,
    );
    return result;
  }

  get(context, path, statuses = [200]) {
    return this.expect(context, "GET", path, undefined, statuses);
  }

  write(context, method, path, body, statuses = [200], options = {}) {
    return this.expect(context, method, path, body, statuses, options);
  }
}

function safeSummary(body) {
  if (!body || typeof body !== "object") return "non-JSON response";
  return JSON.stringify({ status: body.status, code: body.code, requestId: body.requestId });
}

export async function seedFixture(ctx, label) {
  const tag = `${ctx.runId}-${label}-${key().replaceAll("-", "").slice(0, 8)}`;
  const roles = { salesA: "sales", salesB: "sales", boss: "boss", admin: "admin", doc: "doc", fin: "fin" };
  const accounts = Object.fromEntries(
    Object.entries(roles).map(([name, role]) => [name, {
      id: key(),
      username: `acc-${ctx.runId}-${label}-${name}-${key().slice(0, 8)}`.slice(0, 100),
      password: ctx.syntheticPassword,
      role,
    }]),
  );
  const products = [1, 2].map((line) => ({ id: key(), sku: `ACC-${ctx.runId.toUpperCase()}-${label.toUpperCase()}-${line}-${key().slice(0, 8)}`.slice(0, 64) }));
  await ctx.sql.begin(async (sql) => {
    for (const account of Object.values(accounts)) {
      await sql`
        insert into app_user (id, login_key, display_name, password_hash, role_code, enabled, auth_version, created_at, row_version)
        values (${account.id}, ${account.username}, ${`Synthetic ${label}`}, ${ctx.passwordHash}, ${account.role}, true, 1, ${new Date()}, 1)
      `;
    }
    await sql`
      insert into currency_catalog (code, display_name, amount_scale, enabled, row_version)
      values ('USD', 'Synthetic Acceptance USD', 2, true, 1)
      on conflict (code) do nothing
    `;
    const currencies = await sql`select enabled, amount_scale as "amountScale" from currency_catalog where code = 'USD'`;
    assert.deepEqual(currencies[0], { enabled: true, amountScale: 2 }, "Acceptance requires enabled two-decimal USD");
    const companies = await sql`select legal_name as "legalName" from company_profile where profile_key = 'PRIMARY_COMPANY'`;
    if (companies[0]) assert.ok(companies[0].legalName.startsWith("Synthetic"), "Non-synthetic company profile is forbidden");
    if (!companies[0]) {
      await sql`
        insert into company_profile (id, name_cn, name_en, legal_name, address, contact, email, phone, profile_key, created_by)
        values (${key()}, '合成验收公司', 'Synthetic Acceptance Company', 'Synthetic Acceptance Company Ltd.',
          '1 Synthetic Test Road', 'Synthetic contact', 'acceptance@example.invalid', '+86-000-0000', 'PRIMARY_COMPANY', ${accounts.admin.id})
      `;
    }
    for (const [index, product] of products.entries()) {
      await sql`
        insert into product (id, sku, name_cn, name_en, spec, unit, ref_price, currency, enabled, hs_code, remark, created_by)
        values (${product.id}, ${product.sku}, ${`合成商品 ${index + 1}`}, ${`Synthetic Product ${index + 1}`},
          'Test use only', 'piece', '1.00', 'USD', true, '000000', 'Synthetic acceptance only', ${accounts.salesA.id})
      `;
    }
  });
  return { tag, accounts, products };
}

export async function sessions(ctx, fixture, names = ["salesA"]) {
  const result = {};
  for (const name of names) result[name] = await ctx.http.login(fixture.accounts[name]);
  return result;
}

export async function closeSessions(sessionsByName) {
  await Promise.all(Object.values(sessionsByName).map(async (session) => {
    await session.context.dispose();
  }));
}

export async function createCustomer(ctx, sales, fixture, suffix = "") {
  const input = customerInput(fixture.tag, suffix);
  const result = await ctx.http.write(sales.context, "POST", "/api/v1/customers", input, [201]);
  return { input, value: result.body, response: result };
}

export async function createInquiry(ctx, sales, fixture, customer, options = {}) {
  const input = {
    customerId: customer.id,
    customerVersion: customer.version,
    inquiryDate: options.inquiryDate ?? today(),
    source: options.source ?? `Synthetic ${fixture.tag}`,
    message: options.message ?? "合成验收询盘，仅使用测试数据。",
    items: options.items ?? fixture.products.map((product, index) => ({
      productId: product.id,
      productVersion: options.productVersion ?? 1,
      quantity: index === 0 ? "100" : "50",
    })),
  };
  const result = await ctx.http.write(sales.context, "POST", "/api/v1/inquiries", input, options.statuses ?? [201], options.http ?? {});
  return { input, value: result.body, response: result };
}

export async function createQuote(ctx, sales, inquiry, options = {}) {
  const input = { expectedVersion: inquiry.version, currency: options.currency ?? "USD" };
  const result = await ctx.http.write(sales.context, "POST", `/api/v1/inquiries/${inquiry.id}/quotes`, input, options.statuses ?? [201], options.http ?? {});
  return { input, value: result.body, response: result };
}

export function quoteUpdateInput(quote, options = {}) {
  return {
    expectedVersion: quote.version,
    validUntil: options.validUntil === undefined ? quote.validUntil : options.validUntil,
    currency: options.currency ?? "USD",
    tradeTerm: options.tradeTerm ?? "FOB Synthetic Port",
    paymentTerm: options.paymentTerm ?? "Synthetic 100% before shipment",
    remark: options.remark ?? "Synthetic acceptance only",
    items: options.items ?? quote.items.map((item, index) => ({
      lineNo: item.lineNo,
      quantity: options.quantity ?? item.quantity,
      unitPrice: options.unitPrice === null ? null : options.prices?.[index] ?? options.unitPrice ?? (index === 0 ? "5.00" : "0.90"),
    })),
  };
}

export async function updateQuote(ctx, sales, quote, options = {}) {
  const input = quoteUpdateInput(quote, options);
  const result = await ctx.http.write(sales.context, "PUT", `/api/v1/quotes/${quote.id}`, input, options.statuses ?? [200], options.http ?? {});
  return { input, value: result.body, response: result };
}

export async function submitQuote(ctx, sales, quote, options = {}) {
  const input = {
    expectedVersion: options.expectedVersion ?? quote.version,
    expectedCustomerVersion: options.expectedCustomerVersion ?? quote.sourceVersions.customerVersion,
    expectedCompanyProfileVersion: options.expectedCompanyProfileVersion ?? quote.sourceVersions.companyProfileVersion,
  };
  const result = await ctx.http.write(sales.context, "POST", `/api/v1/quotes/${quote.id}/submit`, input, options.statuses ?? [200], options.http ?? {});
  return { input, value: result.body, response: result };
}

export async function confirmQuote(ctx, sales, quote, options = {}) {
  const input = {
    expectedVersion: options.expectedVersion ?? quote.version,
    method: options.method ?? "Synthetic email confirmation",
    confirmedOn: options.confirmedOn ?? quote.quoteDate,
    note: options.note ?? "客户已确认合成报价快照。",
    ...(options.attachments === undefined ? { attachmentIds: [] } : { attachmentIds: options.attachments }),
  };
  const result = await ctx.http.write(sales.context, "POST", `/api/v1/quotes/${quote.id}/customer-confirmations`, input, options.statuses ?? [200], options.http ?? {});
  return { input, value: result.body, response: result };
}

export async function createOrder(ctx, sales, quote, options = {}) {
  const input = {
    expectedVersion: options.expectedVersion ?? quote.version,
    deliveryDate: options.deliveryDate ?? quote.validUntil,
    ...(options.extra ?? {}),
  };
  const commandKey = options.http?.key ?? key();
  const result = await ctx.http.write(sales.context, "POST", `/api/v1/quotes/${quote.id}/orders`, input, options.statuses ?? [201, 200], { ...(options.http ?? {}), key: commandKey });
  return { input, value: result.body, response: result, key: commandKey };
}

export async function workflow(ctx, stage = "order", options = {}) {
  const fixture = await seedFixture(ctx, options.label ?? stage);
  const logged = await sessions(ctx, fixture, options.names ?? ["salesA"]);
  try {
    const sales = logged.salesA;
    const customer = await createCustomer(ctx, sales, fixture);
    const inquiry = await createInquiry(ctx, sales, fixture, customer.value);
    const draft = await createQuote(ctx, sales, inquiry.value);
    if (stage === "draft") return { fixture, logged, customer, inquiry, draft, quote: draft };
    const updated = await updateQuote(ctx, sales, draft.value, options.quote);
    if (stage === "priced") return { fixture, logged, customer, inquiry, draft, updated, quote: updated };
    const submitted = await submitQuote(ctx, sales, updated.value);
    if (stage === "submitted") return { fixture, logged, customer, inquiry, draft, updated, quote: submitted };
    const confirmed = await confirmQuote(ctx, sales, submitted.value);
    if (stage === "confirmed") return { fixture, logged, customer, inquiry, draft, updated, submitted, quote: confirmed };
    const order = await createOrder(ctx, sales, confirmed.value);
    return { fixture, logged, customer, inquiry, draft, updated, submitted, confirmed, quote: confirmed, order };
  } catch (error) {
    await closeSessions(logged);
    throw error;
  }
}

export async function resourceCounts(sql, ids) {
  const quoteId = ids.quoteId ?? null;
  const inquiryId = ids.inquiryId ?? null;
  const customerId = ids.customerId ?? null;
  const rows = await sql`
    select
      (select count(*)::int from customer where ${customerId}::uuid is not null and id = ${customerId}::uuid) as customers,
      (select count(*)::int from inquiry where ${inquiryId}::uuid is not null and id = ${inquiryId}::uuid) as inquiries,
      (select count(*)::int from inquiry_line where ${inquiryId}::uuid is not null and inquiry_id = ${inquiryId}::uuid) as inquiry_lines,
      (select count(*)::int from quote where ${quoteId}::uuid is not null and id = ${quoteId}::uuid) as quotes,
      (select count(*)::int from quote_line where ${quoteId}::uuid is not null and quote_id = ${quoteId}::uuid) as quote_lines,
      (select count(*)::int from quote_confirmation where ${quoteId}::uuid is not null and quote_id = ${quoteId}::uuid) as confirmations,
      (select count(*)::int from sales_order where ${quoteId}::uuid is not null and source_quote_id = ${quoteId}::uuid) as orders,
      (select count(*)::int from order_version where ${quoteId}::uuid is not null and source_quote_id = ${quoteId}::uuid) as versions,
      (select count(*)::int from order_line where ${quoteId}::uuid is not null and source_quote_id = ${quoteId}::uuid) as order_lines,
      (select count(*)::int from audit_event where ${quoteId}::uuid is not null and resource_id = ${quoteId}::uuid) as quote_audits,
      (select count(*)::int from audit_event where ${quoteId}::uuid is not null and resource_id = (select id from sales_order where source_quote_id = ${quoteId}::uuid)) as order_audits
  `;
  return rows[0];
}

export function publicResponse(result) {
  return {
    status: result.status,
    code: result.body?.code,
    requestId: result.body?.requestId,
    replayed: result.response.headers()["idempotency-replayed"] === "true",
    fieldErrors: result.body?.fieldErrors,
    currentVersion: result.body?.currentVersion,
  };
}

export async function browserLogin(ctx, account) {
  const page = await ctx.browser.newPage({ baseURL: ctx.baseURL });
  await page.goto("/login");
  await page.getByLabel("账号", { exact: true }).fill(account.username);
  await page.getByLabel("密码", { exact: true }).fill(account.password);
  await page.getByRole("button", { name: "登录", exact: true }).click();
  await page.waitForURL((url) => url.pathname !== "/login");
  assert.equal(await page.locator(".user-username").textContent(), account.username);
  return page;
}
