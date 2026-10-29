import console from "node:console";
import { randomBytes, randomUUID } from "node:crypto";
import { once } from "node:events";
import process from "node:process";
import { isAbsolute, resolve } from "node:path";
import { spawn } from "node:child_process";
import { setTimeout as sleep } from "node:timers/promises";
import { fileURLToPath, URL } from "node:url";

import { chromium, request } from "@playwright/test";
import argon2 from "argon2";
import postgres from "postgres";

const projectRoot = fileURLToPath(new URL("../", import.meta.url));
const basePort = Number(process.env.TRADE_DOC_E2E_APP_PORT ?? "3100");
const baseURL = `http://127.0.0.1:${basePort}`;
let appProcess = null;
let browser = null;

function requiredEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required`);
  return value;
}

async function waitFor(check, label, timeout = 90_000) {
  const deadline = Date.now() + timeout;
  let lastError = null;
  while (Date.now() < deadline) {
    try {
      await check();
      return;
    } catch (error) {
      lastError = error;
      await sleep(500);
    }
  }
  throw new Error(`${label} did not become ready`, { cause: lastError });
}

async function startApp() {
  if (!Number.isInteger(basePort) || basePort < 1024 || basePort > 65535) {
    throw new Error("TRADE_DOC_E2E_APP_PORT must be a valid unprivileged port");
  }
  const child = spawn(
    "pnpm",
    ["dev", "--hostname", "127.0.0.1", "--port", String(basePort)],
    {
      cwd: projectRoot,
      env: process.env,
      detached: true,
      stdio: "ignore",
    },
  );
  appProcess = child;
  child.once("exit", () => {
    if (appProcess === child) appProcess = null;
  });
  await waitFor(async () => {
    if (child.exitCode !== null) throw new Error("The managed Next process exited");
    const health = await request.newContext();
    try {
      const response = await health.get(`${baseURL}/api/health`);
      if (!response.ok()) throw new Error("Next is not ready");
    } finally {
      await health.dispose();
    }
  }, "Next");
}

async function stopApp() {
  const child = appProcess;
  if (!child || child.exitCode !== null || child.pid === undefined) return;
  appProcess = null;
  const exited = once(child, "exit");
  process.kill(-child.pid, "SIGTERM");
  await Promise.race([exited, sleep(10_000)]);
  if (child.exitCode === null) {
    process.kill(-child.pid, "SIGKILL");
    await exited;
  }
}

async function runDatabaseRestart(databaseUrl) {
  const pgCtl = process.env.TRADE_DOC_E2E_PG_CTL;
  const pgData = process.env.TRADE_DOC_E2E_PGDATA;
  if (pgCtl || pgData) {
    if (!pgCtl || !pgData) {
      throw new Error("TRADE_DOC_E2E_PG_CTL and TRADE_DOC_E2E_PGDATA must be set together");
    }
    if (!isAbsolute(pgCtl) || !isAbsolute(pgData)) {
      throw new Error("TRADE_DOC_E2E_PG_CTL and TRADE_DOC_E2E_PGDATA must be absolute paths");
    }
    if (resolve(pgData) === "/") {
      throw new Error("TRADE_DOC_E2E_PGDATA must not be the filesystem root");
    }
    const child = spawn(pgCtl, ["-D", pgData, "-m", "fast", "restart"], {
      cwd: projectRoot,
      env: process.env,
      stdio: "ignore",
    });
    const [code] = await once(child, "exit");
    if (code !== 0) throw new Error("PostgreSQL restart failed");
    return;
  }

  const password = decodeURIComponent(new URL(databaseUrl).password);
  if (!password) throw new Error("DATABASE_URL must include the synthetic database password");
  const child = spawn("docker", ["compose", "restart", "postgres"], {
    cwd: projectRoot,
    env: { ...process.env, POSTGRES_PASSWORD: password },
    stdio: "ignore",
  });
  const [code] = await once(child, "exit");
  if (code !== 0) throw new Error("PostgreSQL restart failed");
}

async function assertSyntheticDatabase(sql) {
  const rows = await sql`select current_database() as "currentDatabase"`;
  if (rows[0]?.currentDatabase !== "trade_doc_test") {
    throw new Error("Restart verification is restricted to synthetic trade_doc_test");
  }
}

async function waitForDatabase(databaseUrl) {
  await waitFor(async () => {
    const sql = postgres(databaseUrl, { max: 1, connect_timeout: 2 });
    try {
      await assertSyntheticDatabase(sql);
    } finally {
      await sql.end();
    }
  }, "PostgreSQL");
}

async function csrf(context) {
  const response = await context.get("/api/v1/auth/csrf");
  if (response.status() !== 200) throw new Error("CSRF acquisition failed");
  if (response.headers()["cache-control"] !== "no-store") {
    throw new Error("CSRF response must be no-store");
  }
  return (await response.json()).token;
}

async function login(context, account) {
  const response = await context.post("/api/v1/auth/login", {
    headers: { "X-CSRF-TOKEN": await csrf(context) },
    data: { username: account.username, password: account.password },
  });
  if (response.status() !== 200) throw new Error("Synthetic login failed");
  return (await response.json()).user;
}

async function write(context, method, path, body, key, expectedStatus) {
  const response = await context.fetch(path, {
    method,
    headers: {
      "X-CSRF-TOKEN": await csrf(context),
      "Idempotency-Key": key ?? randomUUID(),
    },
    data: body,
  });
  if (response.status() !== expectedStatus) {
    throw new Error(`${method} ${path} returned ${response.status()}; expected ${expectedStatus}`);
  }
  return { body: await response.json(), response };
}

async function read(context, path) {
  const response = await context.get(path);
  if (response.status() !== 200) {
    throw new Error(`GET ${path} returned ${response.status()}; expected 200`);
  }
  return response.json();
}

async function conversionCounts(sql, quoteId, orderId) {
  const rows = await sql`
    select
      (select count(*)::int from sales_order where source_quote_id = ${quoteId}) as orders,
      (select count(*)::int from order_version where source_quote_id = ${quoteId}) as versions,
      (select count(*)::int from order_line where source_quote_id = ${quoteId}) as lines,
      (
        select count(*)::int from idempotency_record
        where resource_id = ${orderId} and operation_id = 'createOrderFromQuote'
      ) as idempotency,
      (
        select count(*)::int from audit_event
        where resource_id = ${orderId} and operation_id = 'createOrderFromQuote'
      ) as audits
  `;
  return rows[0];
}

function assertCounts(counts) {
  if (
    counts?.orders !== 1 ||
    counts.versions !== 1 ||
    counts.lines !== 2 ||
    counts.idempotency !== 1 ||
    counts.audits !== 1
  ) {
    throw new Error("Conversion did not preserve exactly one order, V1, two lines and one audit");
  }
}

async function seed(sql) {
  const runId = randomUUID().replaceAll("-", "").slice(0, 12);
  const password = randomBytes(24).toString("base64url");
  const passwordHash = await argon2.hash(password, { type: argon2.argon2id });
  const account = {
    id: randomUUID(),
    username: `restart-${runId}-sales-a`,
    password,
  };
  const products = [1, 2].map((line) => ({
    id: randomUUID(),
    sku: `RESTART-${runId.toUpperCase()}-${line}`,
  }));

  await sql.begin(async (transaction) => {
    await transaction`
      insert into app_user (
        id, login_key, display_name, password_hash, role_code,
        enabled, auth_version, created_at, row_version
      ) values (
        ${account.id}, ${account.username}, 'Synthetic Restart Sales A',
        ${passwordHash}, 'sales', true, 1, ${new Date()}, 1
      )
    `;
    await transaction`
      insert into currency_catalog (code, display_name, amount_scale, enabled, row_version)
      values ('USD', 'Synthetic Restart USD', 2, true, 1)
      on conflict (code) do nothing
    `;
    const currencies = await transaction`
      select enabled, amount_scale as "amountScale" from currency_catalog where code = 'USD'
    `;
    if (!currencies[0]?.enabled || currencies[0].amountScale !== 2) {
      throw new Error("Synthetic restart verification requires enabled two-decimal USD");
    }
    const companies = await transaction`
      select legal_name as "legalName" from company_profile where profile_key = 'PRIMARY_COMPANY'
    `;
    if (companies[0] && !companies[0].legalName.startsWith("Synthetic")) {
      throw new Error("The test database contains a non-synthetic company profile");
    }
    if (!companies[0]) {
      await transaction`
        insert into company_profile (
          id, name_cn, name_en, legal_name, address, contact, email, phone,
          profile_key, created_by
        ) values (
          ${randomUUID()}, '合成重启验收公司', 'Synthetic Restart Company',
          'Synthetic Restart Company Ltd.', '1 Synthetic Test Road',
          'Synthetic contact', 'restart@example.invalid', '+86-000-0000',
          'PRIMARY_COMPANY', ${account.id}
        )
      `;
    }
    for (const [index, product] of products.entries()) {
      await transaction`
        insert into product (
          id, sku, name_cn, name_en, spec, unit, ref_price, currency,
          enabled, hs_code, remark, created_by
        ) values (
          ${product.id}, ${product.sku}, ${`合成重启商品 ${index + 1}`},
          ${`Synthetic Restart Product ${index + 1}`}, 'Test use only', 'piece',
          '1.00', 'USD', true, '000000', 'Synthetic restart only', ${account.id}
        )
      `;
    }
  });
  return { account, products, runId };
}

async function createWorkflow(baseContext, fixtures) {
  const user = await login(baseContext, fixtures.account);
  const customerInput = {
    nameCn: `合成重启客户 ${fixtures.runId}`,
    nameEn: `Synthetic Restart Customer ${fixtures.runId}`,
    country: "Testland",
    contact: "Synthetic buyer",
    email: "buyer@example.invalid",
    phone: "+1-000-0000",
    address: "2 Synthetic Test Road",
    remark: "Synthetic restart only",
  };
  const customer = (
    await write(baseContext, "POST", "/api/v1/customers", customerInput, null, 201)
  ).body;
  const inquiryInput = {
    customerId: customer.id,
    customerVersion: customer.version,
    inquiryDate: businessDate(),
    source: `Synthetic restart ${fixtures.runId}`,
    message: "真实数据库与应用重启验收。",
    items: fixtures.products.map((product, index) => ({
      productId: product.id,
      productVersion: 1,
      quantity: index === 0 ? "100" : "50",
    })),
  };
  const inquiry = (
    await write(baseContext, "POST", "/api/v1/inquiries", inquiryInput, null, 201)
  ).body;
  let quote = (
    await write(
      baseContext,
      "POST",
      `/api/v1/inquiries/${inquiry.id}/quotes`,
      { expectedVersion: inquiry.version, currency: "USD" },
      null,
      201,
    )
  ).body;
  quote = (
    await write(
      baseContext,
      "PUT",
      `/api/v1/quotes/${quote.id}`,
      {
        expectedVersion: quote.version,
        validUntil: quote.validUntil,
        currency: "USD",
        tradeTerm: "FOB Synthetic Port",
        paymentTerm: "Synthetic 100% before shipment",
        remark: "Synthetic restart only",
        items: quote.items.map((item, index) => ({
          lineNo: item.lineNo,
          quantity: item.quantity,
          unitPrice: index === 0 ? "5.00" : "0.90",
        })),
      },
      null,
      200,
    )
  ).body;
  if (quote.totalAmount !== "545.00") throw new Error("Expected exact total USD 545.00");
  if (
    quote.sourceVersions.companyProfileVersion === null ||
    quote.sourceVersions.companyProfileVersion === undefined
  ) {
    throw new Error("Synthetic company profile is unavailable");
  }
  quote = (
    await write(
      baseContext,
      "POST",
      `/api/v1/quotes/${quote.id}/submit`,
      {
        expectedVersion: quote.version,
        expectedCustomerVersion: quote.sourceVersions.customerVersion,
        expectedCompanyProfileVersion: quote.sourceVersions.companyProfileVersion,
      },
      null,
      200,
    )
  ).body;
  quote = (
    await write(
      baseContext,
      "POST",
      `/api/v1/quotes/${quote.id}/customer-confirmations`,
      {
        expectedVersion: quote.version,
        method: "Synthetic restart confirmation",
        confirmedOn: quote.quoteDate,
        note: "合成客户已确认冻结报价。",
      },
      null,
      200,
    )
  ).body;
  const orderCommand = {
    key: randomUUID(),
    body: { expectedVersion: quote.version, deliveryDate: quote.validUntil },
  };
  const order = (
    await write(
      baseContext,
      "POST",
      `/api/v1/quotes/${quote.id}/orders`,
      orderCommand.body,
      orderCommand.key,
      201,
    )
  ).body;
  if (order.ownerUserId !== user.id || order.trade.totalAmount !== "545.00") {
    throw new Error("Created order failed ownership or amount verification");
  }
  return { customer, inquiry, quote, order, orderCommand };
}

function businessDate() {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: process.env.BUSINESS_TIME_ZONE ?? "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const values = new Map(parts.map((part) => [part.type, part.value]));
  return `${values.get("year")}-${values.get("month")}-${values.get("day")}`;
}

async function main() {
  if (process.env.TRADE_DOC_RUN_E2E !== "true") {
    throw new Error("Set TRADE_DOC_RUN_E2E=true for real restart verification");
  }
  if (process.env.TRADE_DOC_E2E_RESTART !== "true") {
    throw new Error("Set TRADE_DOC_E2E_RESTART=true to authorize local test restarts");
  }
  const databaseUrl = requiredEnv("DATABASE_URL");
  const withDatabase = async (max, work) => {
    const sql = postgres(databaseUrl, { max });
    try {
      return await work(sql);
    } finally {
      await sql.end();
    }
  };
  const fixtures = await withDatabase(4, async (sql) => {
    await assertSyntheticDatabase(sql);
    return seed(sql);
  });

  await startApp();
  const context = await request.newContext({ baseURL });
  let workflow;
  try {
    workflow = await createWorkflow(context, fixtures);
  } finally {
    await context.dispose();
  }

  await withDatabase(1, async (sql) => {
    await assertSyntheticDatabase(sql);
    assertCounts(await conversionCounts(sql, workflow.quote.id, workflow.order.id));
  });

  await stopApp();
  await runDatabaseRestart(databaseUrl);
  await waitForDatabase(databaseUrl);
  await startApp();

  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ baseURL });
  await page.goto("/login");
  await page.getByLabel("账号", { exact: true }).fill(fixtures.account.username);
  await page.getByLabel("密码", { exact: true }).fill(fixtures.account.password);
  await page.getByRole("button", { name: "登录", exact: true }).click();
  await page.waitForURL((url) => url.pathname !== "/login");

  const order = await read(page.request, `/api/v1/orders/${workflow.order.id}`);
  const quote = await read(page.request, `/api/v1/quotes/${workflow.quote.id}`);
  if (
    order.id !== workflow.order.id ||
    order.trade.totalAmount !== "545.00" ||
    order.trade.items.length !== 2 ||
    quote.orderId !== order.id ||
    quote.status !== "CONFIRMED" ||
    !quote.convertedAt
  ) {
    throw new Error("Post-restart order or quote readback changed");
  }

  const replay = await write(
    page.request,
    "POST",
    `/api/v1/quotes/${workflow.quote.id}/orders`,
    workflow.orderCommand.body,
    workflow.orderCommand.key,
    200,
  );
  if (
    replay.response.headers()["idempotency-replayed"] !== "true" ||
    replay.body.id !== order.id
  ) {
    throw new Error("Post-restart same-key replay did not return the original order");
  }

  const counts = await withDatabase(1, async (sql) => {
    await assertSyntheticDatabase(sql);
    const value = await conversionCounts(sql, workflow.quote.id, order.id);
    assertCounts(value);
    return value;
  });

  console.log(
    JSON.stringify({
      status: "PASS",
      databaseRestarted: true,
      applicationRestarted: true,
      reauthenticated: true,
      quoteId: quote.id,
      orderId: order.id,
      totalAmount: order.trade.totalAmount,
      idempotencyReplayed: true,
      counts,
    }),
  );
}

main()
  .catch((error) => {
    let message = error instanceof Error ? error.message : "Restart verification failed";
    for (const [name, value] of Object.entries(process.env)) {
      if (value && /(?:PASSWORD|SECRET|TOKEN|DATABASE_URL)/.test(name)) {
        message = message.replaceAll(value, "[redacted]");
      }
    }
    console.error(message);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (browser) await browser.close();
    await stopApp();
  });
