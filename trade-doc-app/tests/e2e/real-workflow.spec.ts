import process from "node:process";

import { expect, test, type Page, type TestInfo } from "@playwright/test";

import type {
  Customer,
  Inquiry,
  Order,
  Page as ResourcePage,
  Quote,
} from "../../src/lib/contracts";
import { getCsrf, getJson, login, resourceId, writeJson } from "../support/browser";
import { readConversionCounts } from "../support/database";
import { getE2EFixtures, type Account } from "../support/fixtures";

test.skip(
  process.env.TRADE_DOC_RUN_E2E !== "true",
  "Real E2E is opt-in; set TRADE_DOC_RUN_E2E=true with the synthetic test database",
);

async function capture(page: Page, testInfo: TestInfo, name: string, width: number) {
  await page.setViewportSize({ width, height: 900 });
  await page.evaluate(() => document.fonts.ready);
  const path = testInfo.outputPath(`${name}-${width}.png`);
  await page.screenshot({ path, fullPage: true, animations: "disabled" });
  await testInfo.attach(`${name}-${width}`, { path, contentType: "image/png" });
}

async function selectProduct(page: Page, sku: string) {
  await page.getByRole("button", { name: "从商品目录添加", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "公司商品目录" });
  await dialog.getByRole("textbox", { name: "搜索商品" }).fill(sku);
  await dialog.getByRole("button", { name: "查询", exact: true }).click();
  const row = dialog.getByRole("row").filter({ hasText: sku });
  await expect(row).toHaveCount(1);
  await row.getByRole("button", { name: "选择", exact: true }).click();
  await expect(dialog).toHaveCount(0);
}

test("real browser workflow, ownership, roles, idempotency and concurrency", async (
  { page, browser },
  testInfo,
) => {
  const fixtures = getE2EFixtures();
  const customerName = `合成验收客户 ${fixtures.runId}`;
  const customerInput = {
    nameCn: customerName,
    nameEn: `Synthetic E2E Customer ${fixtures.runId}`,
    country: "Testland",
    contact: "Synthetic buyer",
    email: "buyer@example.invalid",
    phone: "+1-000-0000",
    address: "2 Synthetic Test Road",
    remark: "Synthetic E2E only",
  };

  await login(page, fixtures.accounts.salesA);
  await page.goto("/customers/new");
  await page.getByLabel("客户中文名", { exact: true }).fill(customerInput.nameCn);
  await page.getByLabel("客户英文名", { exact: true }).fill(customerInput.nameEn);
  await page.getByLabel("国家或地区", { exact: true }).fill(customerInput.country);
  await page.getByLabel("联系人", { exact: true }).fill(customerInput.contact);
  await page.getByLabel("电子邮箱", { exact: true }).fill(customerInput.email);
  await page.getByLabel("联系电话", { exact: true }).fill(customerInput.phone);
  await page.getByLabel("地址", { exact: true }).fill(customerInput.address);
  await page.getByLabel("备注", { exact: true }).fill(customerInput.remark);
  await Promise.all([
    page.waitForURL(/\/customers\/[0-9a-f-]{36}$/),
    page.getByRole("button", { name: "创建客户", exact: true }).click(),
  ]);
  const customerId = resourceId(page, "customers");
  await page.reload();
  await expect(page.getByRole("heading", { name: customerName, exact: true })).toBeVisible();

  await page.goto(`/inquiries/new?customerId=${customerId}`);
  await expect(page.locator("#inquiry-customer")).toHaveValue(customerId);
  const inquirySource = `Synthetic E2E ${fixtures.runId}`;
  await page.getByLabel("需求来源", { exact: true }).fill(inquirySource);
  await page.getByLabel("客户需求", { exact: true }).fill("两行真实浏览器验收需求，仅合成数据。");
  for (const product of fixtures.products) await selectProduct(page, product.sku);
  await page.getByRole("textbox", { name: "第 1 行询价数量" }).fill("100");
  await page.getByRole("textbox", { name: "第 2 行询价数量" }).fill("50");
  await Promise.all([
    page.waitForURL(/\/inquiries\/[0-9a-f-]{36}$/),
    page.getByRole("button", { name: "创建询盘", exact: true }).click(),
  ]);
  const inquiryId = resourceId(page, "inquiries");
  await page.reload();
  await expect(page.locator(".inquiry-items tbody tr")).toHaveCount(2);
  const inquiry = await getJson<Inquiry>(page, `/api/v1/inquiries/${inquiryId}`);
  expect(inquiry.items.map((item) => item.quantity)).toEqual(["100.00", "50.00"]);

  await page.getByRole("button", { name: "起草报价", exact: true }).click();
  const draftDialog = page.getByRole("dialog", { name: "从询盘起草报价" });
  await draftDialog.getByLabel("报价币种", { exact: true }).selectOption("USD");
  await Promise.all([
    page.waitForURL(/\/quotes\/[0-9a-f-]{36}$/),
    draftDialog.getByRole("button", { name: "创建报价草稿", exact: true }).click(),
  ]);
  const quoteId = resourceId(page, "quotes");
  await page.getByLabel("贸易条款", { exact: true }).fill("FOB Synthetic Port");
  await page.getByLabel("付款条款", { exact: true }).fill("Synthetic 100% before shipment");
  await page.getByRole("textbox", { name: "第 1 行成交单价" }).fill("5.00");
  await page.getByRole("textbox", { name: "第 2 行成交单价" }).fill("0.90");
  const saveResponse = page.waitForResponse(
    (response) =>
      response.url().endsWith(`/api/v1/quotes/${quoteId}`) && response.request().method() === "PUT",
  );
  await page.getByRole("button", { name: "保存草稿", exact: true }).click();
  expect((await saveResponse).status()).toBe(200);
  await expect(page.getByText("草稿已保存，行金额与总额由服务端重新计算。")).toBeVisible();
  await page.reload();
  await expect(page.locator("tfoot")).toContainText("USD 545.00");
  const savedQuote = await getJson<Quote>(page, `/api/v1/quotes/${quoteId}`);
  expect(savedQuote.totalAmount).toBe("545.00");
  expect(savedQuote.items.map((item) => item.lineAmount)).toEqual(["500.00", "45.00"]);
  for (const width of [1280, 1440]) {
    await capture(page, testInfo, "quote-draft", width);
  }

  const submitRequestPromise = page.waitForRequest(
    (request) =>
      request.url().endsWith(`/api/v1/quotes/${quoteId}/submit`) && request.method() === "POST",
  );
  await page.getByRole("button", { name: "提交待客户确认", exact: true }).click();
  await page.getByRole("button", { name: "确认提交并冻结", exact: true }).click();
  const submitRequest = await submitRequestPromise;
  await expect(page.getByText("报价已提交，交易、客户与公司资料快照已冻结。")).toBeVisible();
  const submitKey = submitRequest.headers()["idempotency-key"];
  expect(submitKey).toBeTruthy();
  const submitReplay = await writeJson<Quote>(
    page,
    `/api/v1/quotes/${quoteId}/submit`,
    submitRequest.postDataJSON(),
    { key: submitKey },
  );
  expect(submitReplay.response.headers()["idempotency-replayed"]).toBe("true");
  expect(submitReplay.body.status).toBe("AWAITING_CUSTOMER");

  await page.getByRole("button", { name: "登记客户确认", exact: true }).click();
  const confirmDialog = page.getByRole("dialog", { name: "登记客户确认" });
  await confirmDialog.getByLabel("确认方式", { exact: true }).fill("Synthetic email confirmation");
  await confirmDialog.getByLabel("确认说明", { exact: true }).fill("客户已确认合成报价快照与两行金额。");
  const confirmResponse = page.waitForResponse(async (response) => {
    if (
      !response.url().endsWith(`/api/v1/quotes/${quoteId}/customer-confirmations`) ||
      response.request().method() !== "POST"
    ) {
      return false;
    }
    if (response.status() === 200) return true;
    if (response.status() === 403) {
      expect(await response.json()).toMatchObject({ code: "CSRF_INVALID" });
    }
    return false;
  });
  await confirmDialog.getByRole("button", { name: "登记确认", exact: true }).click();
  expect((await confirmResponse).status()).toBe(200);
  await expect(page.getByText("客户确认已登记，确认内容绑定提交时的冻结快照。")).toBeVisible();
  const confirmedQuote = await getJson<Quote>(page, `/api/v1/quotes/${quoteId}`);
  expect(confirmedQuote.status).toBe("CONFIRMED");
  expect(confirmedQuote.validUntil).not.toBeNull();

  await page.reload();
  const secondPage = await page.context().newPage();
  await secondPage.goto(`/quotes/${quoteId}`);
  await Promise.all([
    page.getByRole("button", { name: "生成订单", exact: true }).click(),
    secondPage.getByRole("button", { name: "生成订单", exact: true }).click(),
  ]);
  await page.getByLabel("交货日期", { exact: true }).fill(confirmedQuote.validUntil!);
  await secondPage.getByLabel("交货日期", { exact: true }).fill(confirmedQuote.validUntil!);
  const firstOrderRequestPromise = page.waitForRequest(
    (request) =>
      request.url().endsWith(`/api/v1/quotes/${quoteId}/orders`) && request.method() === "POST",
  );
  await Promise.all([
    page.waitForURL(/\/orders\/[0-9a-f-]{36}$/),
    secondPage.waitForURL(/\/orders\/[0-9a-f-]{36}$/),
    page.getByRole("button", { name: "生成唯一订单", exact: true }).dblclick(),
    secondPage.getByRole("button", { name: "生成唯一订单", exact: true }).click(),
  ]);
  const firstOrderRequest = await firstOrderRequestPromise;
  const orderId = resourceId(page, "orders");
  expect(resourceId(secondPage, "orders")).toBe(orderId);
  await expect(page.locator(".order-total")).toHaveText("USD 545.00");
  const order = await getJson<Order>(page, `/api/v1/orders/${orderId}`);
  expect(order).toMatchObject({
    id: orderId,
    sourceQuoteId: quoteId,
    deliveryDate: confirmedQuote.validUntil,
    orderProgress: "PENDING_EXECUTION",
    documentProgress: "NOT_STARTED",
    paymentProgress: "UNPAID",
    version: 1,
  });
  expect(order.trade.totalAmount).toBe("545.00");
  expect(order.trade.items.map((item) => item.lineAmount)).toEqual(["500.00", "45.00"]);
  expect(await readConversionCounts(quoteId, orderId)).toEqual({
    orders: 1,
    versions: 1,
    lines: 2,
    idempotency: 2,
    audits: 1,
  });

  const orderKey = firstOrderRequest.headers()["idempotency-key"];
  expect(orderKey).toBeTruthy();
  const orderReplay = await writeJson<Order>(
    page,
    `/api/v1/quotes/${quoteId}/orders`,
    firstOrderRequest.postDataJSON(),
    { key: orderKey },
  );
  expect(orderReplay.response.headers()["idempotency-replayed"]).toBe("true");
  expect(orderReplay.body.id).toBe(orderId);
  expect(await readConversionCounts(quoteId, orderId)).toEqual({
    orders: 1,
    versions: 1,
    lines: 2,
    idempotency: 2,
    audits: 1,
  });

  await page.reload();
  await expect(page.locator(".order-total")).toHaveText("USD 545.00");
  await expect(page.locator("tbody tr")).toHaveCount(2);
  const convertedQuote = await getJson<Quote>(page, `/api/v1/quotes/${quoteId}`);
  expect(convertedQuote).toMatchObject({ status: "CONFIRMED", orderId });
  expect(convertedQuote.convertedAt).not.toBeNull();
  for (const width of [1280, 1440]) {
    await capture(page, testInfo, "order", width);
  }
  await secondPage.close();

  const salesBContext = await browser.newContext();
  const salesB = await salesBContext.newPage();
  await login(salesB, fixtures.accounts.salesB);
  for (const path of ["/customers", "/inquiries", "/quotes", "/orders"]) {
    const list = await getJson<ResourcePage<unknown>>(
      salesB,
      `/api/v1${path}?page=1&pageSize=100&q=${fixtures.runId}`,
    );
    expect(list.total).toBe(0);
    expect(list.items).toEqual([]);
  }
  for (const path of [
    `/api/v1/customers/${customerId}`,
    `/api/v1/inquiries/${inquiryId}`,
    `/api/v1/quotes/${quoteId}`,
    `/api/v1/orders/${orderId}`,
  ]) {
    const response = await salesB.request.get(path);
    expect(response.status()).toBe(404);
    expect(await response.text()).not.toContain(customerName);
  }
  await salesB.goto(`/customers/${customerId}`);
  await expect(salesB.locator(".error-panel")).toContainText("HTTP 404");
  await expect(salesB.getByText(customerName, { exact: true })).toHaveCount(0);
  await salesBContext.close();

  const bossContext = await browser.newContext();
  const boss = await bossContext.newPage();
  await login(boss, fixtures.accounts.boss);
  await boss.goto("/customers");
  await boss.locator("#list-search").fill(fixtures.runId);
  await boss.getByRole("button", { name: "查询", exact: true }).click();
  await expect(boss.getByRole("link", { name: customerName, exact: true })).toBeVisible();
  await expect(boss.getByRole("link", { name: "新建客户", exact: true })).toHaveCount(0);
  for (const path of [
    `/api/v1/customers/${customerId}`,
    `/api/v1/inquiries/${inquiryId}`,
    `/api/v1/quotes/${quoteId}`,
    `/api/v1/orders/${orderId}`,
  ]) {
    await getJson(boss, path);
  }
  await writeJson(boss, "/api/v1/customers", customerInput, { status: 403 });
  await writeJson(
    boss,
    `/api/v1/quotes/${quoteId}/orders`,
    { expectedVersion: convertedQuote.version, deliveryDate: confirmedQuote.validUntil },
    { status: 403 },
  );
  await boss.goto(`/quotes/${quoteId}`);
  await expect(boss.getByRole("button", { name: "生成订单", exact: true })).toHaveCount(0);
  await bossContext.close();

  for (const key of ["admin", "doc", "fin"] as const) {
    const context = await browser.newContext();
    const rolePage = await context.newPage();
    const account: Account = fixtures.accounts[key];
    await login(rolePage, account);
    await expect(rolePage.getByRole("heading", { name: "当前岗位未开放此业务切片" })).toBeVisible();
    const listResponse = await rolePage.request.get("/api/v1/customers");
    expect(listResponse.status()).toBe(403);
    const orderResponse = await rolePage.request.get(`/api/v1/orders/${orderId}`);
    expect(orderResponse.status()).toBe(403);
    await writeJson(
      rolePage,
      `/api/v1/inquiries/${inquiryId}/quotes`,
      { expectedVersion: inquiry.version, currency: "USD" },
      { status: 403 },
    );
    await context.close();
  }

  const csrfResponse = await page.request.get("/api/v1/auth/csrf");
  expect(csrfResponse.headers()["cache-control"]).toBe("no-store");
  expect(typeof (await getCsrf(page))).toBe("string");
  const customerReadback = await getJson<Customer>(page, `/api/v1/customers/${customerId}`);
  expect(customerReadback.nameCn).toBe(customerName);
});
