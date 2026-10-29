import {
  addDays,
  assert,
  browserLogin,
  closeSessions,
  createCustomer,
  createInquiry,
  customerInput,
  key,
  publicResponse,
  quoteUpdateInput,
  resourceCounts,
  seedFixture,
  sessions,
  today,
  updateQuote,
  workflow,
} from "./helpers.mjs";

export const commercialCases = {
  "CUST-01": async (ctx) => {
    const fixture = await seedFixture(ctx, "cust01");
    const page = await browserLogin(ctx, fixture.accounts.salesA);
    try {
      const input = customerInput(fixture.tag);
      await page.goto("/customers/new");
      for (const [label, value] of [["客户中文名", input.nameCn], ["客户英文名", input.nameEn], ["国家或地区", input.country], ["联系人", input.contact], ["电子邮箱", input.email], ["联系电话", input.phone], ["地址", input.address], ["备注", input.remark]]) {
        await page.getByLabel(label, { exact: true }).fill(value);
      }
      await Promise.all([
        page.waitForURL(/\/customers\/[0-9a-f-]{36}$/),
        page.getByRole("button", { name: "创建客户", exact: true }).click(),
      ]);
      const id = page.url().split("/").at(-1);
      await page.reload();
      assert.ok(await page.getByRole("heading", { name: input.nameCn, exact: true }).isVisible());
      const logged = await sessions(ctx, fixture);
      let updated;
      try {
        const before = await ctx.http.get(logged.salesA.context, `/api/v1/customers/${id}`);
        assert.equal(before.body.ownerUserId, fixture.accounts.salesA.id);
        updated = await ctx.http.write(logged.salesA.context, "PUT", `/api/v1/customers/${id}`, { ...input, nameEn: "Updated synthetic customer", expectedVersion: before.body.version }, [200]);
        assert.equal(updated.body.version, 2);
      } finally {
        await closeSessions(logged);
      }
      const audits = await ctx.sql`select count(*)::int as count from audit_event where resource_id = ${id}`;
      assert.equal(audits[0].count, 2);
      return { customerId: id, browserCreatedAndReadBack: true, ownerFromServer: true, version: updated.body.version, successfulAudits: audits[0].count };
    } finally {
      await page.close();
    }
  },

  "CUST-02": async (ctx) => {
    const fixture = await seedFixture(ctx, "cust02");
    const logged = await sessions(ctx, fixture, ["salesA", "salesB", "boss"]);
    try {
      await createCustomer(ctx, logged.salesA, fixture, "-shared-1");
      await createCustomer(ctx, logged.salesA, fixture, "-shared-2");
      await createCustomer(ctx, logged.salesB, fixture, "-shared-3");
      const query = encodeURIComponent("shared");
      const owner = await ctx.http.get(logged.salesA.context, `/api/v1/customers?page=3&pageSize=1&q=${query}`);
      assert.deepEqual(owner.body.items, []);
      assert.equal(owner.body.total, 2);
      assert.equal(owner.body.totalPages, 2);
      const other = await ctx.http.get(logged.salesB.context, `/api/v1/customers?page=1&pageSize=100&q=${query}`);
      const boss = await ctx.http.get(logged.boss.context, `/api/v1/customers?page=1&pageSize=100&q=${query}`);
      const empty = await ctx.http.get(logged.salesA.context, "/api/v1/customers?q=no-such-customer");
      assert.equal(other.body.total, 1);
      assert.equal(boss.body.total, 3);
      assert.deepEqual(empty.body.items, []);
      assert.equal(empty.body.total, 0);
      return { ownerBeyondLastPage: { total: owner.body.total, totalPages: owner.body.totalPages, items: 0 }, otherOwnerTotal: other.body.total, bossTotal: boss.body.total, emptyTotal: empty.body.total };
    } finally {
      await closeSessions(logged);
    }
  },

  "SCOPE-01": async (ctx) => {
    const flow = await workflow(ctx, "order", { label: "scope01", names: ["salesA", "salesB"] });
    try {
      const ids = [flow.customer.value.id, flow.inquiry.value.id, flow.quote.value.id, flow.order.value.id];
      const paths = ["customers", "inquiries", "quotes", "orders"].map((name, index) => `/api/v1/${name}/${ids[index]}`);
      const responses = [];
      for (const path of paths) {
        const result = await ctx.http.get(flow.logged.salesB.context, path, [404]);
        assert.equal(result.body.code, "NOT_FOUND");
        assert.equal(result.body.currentVersion, undefined);
        assert.ok(!result.text.includes(flow.customer.value.nameCn));
        assert.ok(!result.text.includes(flow.order.value.trade.totalAmount));
        responses.push(publicResponse(result));
      }
      const randomMissing = await ctx.http.get(flow.logged.salesB.context, `/api/v1/customers/${key()}`, [404]);
      assert.equal(randomMissing.body.code, responses[0].code);
      assert.equal(typeof randomMissing.body.message, "string");
      return { crossOwnerResponses: responses, sameErrorClassAsMissing: randomMissing.body.code === responses[0].code, sensitiveFieldsAbsent: true };
    } finally {
      await closeSessions(flow.logged);
    }
  },

  "SCOPE-02": async (ctx) => {
    const flowA = await workflow(ctx, "order", { label: "scope02a", names: ["salesA", "boss"] });
    let flowB;
    try {
      flowB = await workflow(ctx, "order", { label: "scope02b" });
      const evidence = {};
      for (const resource of ["inquiries", "quotes", "orders"]) {
        const query = encodeURIComponent(flowA.fixture.tag);
        const owner = await ctx.http.get(flowA.logged.salesA.context, `/api/v1/${resource}?page=2&pageSize=1&q=${query}`);
        const other = await ctx.http.get(flowB.logged.salesA.context, `/api/v1/${resource}?page=1&pageSize=100&q=${query}`);
        const boss = await ctx.http.get(flowA.logged.boss.context, `/api/v1/${resource}?page=1&pageSize=100&q=${query}`);
        assert.equal(owner.body.total, 1);
        assert.equal(owner.body.totalPages, 1);
        assert.deepEqual(owner.body.items, []);
        assert.equal(other.body.total, 0);
        assert.equal(boss.body.total, 1);
        evidence[resource] = { ownerTotal: owner.body.total, otherOwnerTotal: other.body.total, bossTotal: boss.body.total, ownerBeyondLastPageItems: 0 };
      }
      return evidence;
    } finally {
      await closeSessions(flowA.logged);
      if (flowB) await closeSessions(flowB.logged);
    }
  },

  "SCOPE-03": async (ctx) => {
    const flow = await workflow(ctx, "order", { label: "scope03", names: ["salesA", "admin", "doc", "fin"] });
    try {
      const evidence = {};
      for (const name of ["admin", "doc", "fin"]) {
        const session = flow.logged[name];
        const list = await ctx.http.get(session.context, "/api/v1/customers", [403]);
        const order = await ctx.http.get(session.context, `/api/v1/orders/${flow.order.value.id}`, [403]);
        const quote = await ctx.http.write(session.context, "POST", `/api/v1/inquiries/${flow.inquiry.value.id}/quotes`, { expectedVersion: flow.inquiry.value.version, currency: "USD" }, [403]);
        evidence[name] = [list.status, order.status, quote.status];
      }
      return { defaultDeny: evidence };
    } finally {
      await closeSessions(flow.logged);
    }
  },

  "SCOPE-04": async (ctx) => {
    const fixture = await seedFixture(ctx, "scope04");
    const logged = await sessions(ctx, fixture, ["salesA", "salesB"]);
    try {
      const other = await createCustomer(ctx, logged.salesB, fixture, "-other");
      const before = await globalWriteCounts(ctx);
      const result = await createInquiry(ctx, logged.salesA, fixture, other.value, { statuses: [404] });
      const after = await globalWriteCounts(ctx);
      assert.deepEqual(after, before);
      return { response: publicResponse(result.response), before, after, crossOwnerReferenceRejected: true };
    } finally {
      await closeSessions(logged);
    }
  },

  "INQ-01": async (ctx) => {
    const fixture = await seedFixture(ctx, "inq01");
    const page = await browserLogin(ctx, fixture.accounts.salesA);
    const logged = await sessions(ctx, fixture);
    try {
      const customer = await createCustomer(ctx, logged.salesA, fixture);
      await page.goto(`/inquiries/new?customerId=${customer.value.id}`);
      await page.getByLabel("需求来源", { exact: true }).fill(`Synthetic ${fixture.tag}`);
      await page.getByLabel("客户需求", { exact: true }).fill("真实浏览器多行询盘验收。");
      for (const product of fixture.products) {
        await page.getByRole("button", { name: "从商品目录添加", exact: true }).click();
        const dialog = page.getByRole("dialog", { name: "公司商品目录" });
        await dialog.getByRole("textbox", { name: "搜索商品" }).fill(product.sku);
        await dialog.getByRole("button", { name: "查询", exact: true }).click();
        const row = dialog.getByRole("row").filter({ hasText: product.sku });
        await row.getByRole("button", { name: "选择", exact: true }).click();
      }
      await page.getByRole("textbox", { name: "第 1 行询价数量" }).fill("100");
      await page.getByRole("textbox", { name: "第 2 行询价数量" }).fill("50");
      await Promise.all([
        page.waitForURL(/\/inquiries\/[0-9a-f-]{36}$/),
        page.getByRole("button", { name: "创建询盘", exact: true }).click(),
      ]);
      const inquiryId = page.url().split("/").at(-1);
      const before = await ctx.http.get(logged.salesA.context, `/api/v1/inquiries/${inquiryId}`);
      assert.deepEqual(before.body.items.map((item) => [item.lineNo, item.quantity, item.product.productVersion]), [[1, "100.00", 1], [2, "50.00", 1]]);
      await ctx.sql`update product set name_en = 'Changed live product', row_version = row_version + 1 where id = ${fixture.products[0].id}`;
      const after = await ctx.http.get(logged.salesA.context, `/api/v1/inquiries/${inquiryId}`);
      assert.deepEqual(after.body.items.map((item) => item.product), before.body.items.map((item) => item.product));
      return { inquiryId, browserCreated: true, lineNumbers: [1, 2], capturedProductVersions: [1, 1], snapshotsUnchangedAfterCatalogUpdate: true };
    } finally {
      await page.close();
      await closeSessions(logged);
    }
  },

  "INQ-02": async (ctx) => {
    const fixture = await seedFixture(ctx, "inq02");
    const logged = await sessions(ctx, fixture);
    try {
      const customer = await createCustomer(ctx, logged.salesA, fixture);
      const staleCustomer = await createInquiry(ctx, logged.salesA, fixture, { ...customer.value, version: 99 }, { statuses: [409] });
      const staleProduct = await createInquiry(ctx, logged.salesA, fixture, customer.value, { productVersion: 99, statuses: [409] });
      await ctx.sql`update product set enabled = false where id = ${fixture.products[0].id}`;
      const disabled = await createInquiry(ctx, logged.salesA, fixture, customer.value, { statuses: [422] });
      const inquiries = await ctx.sql`select count(*)::int as count from inquiry where owner_user_id = ${fixture.accounts.salesA.id}`;
      assert.equal(inquiries[0].count, 0);
      return { staleCustomer: publicResponse(staleCustomer.response), staleProduct: publicResponse(staleProduct.response), disabledProduct: publicResponse(disabled.response), persistedInquiries: 0 };
    } finally {
      await closeSessions(logged);
    }
  },

  "INQ-03": async (ctx) => {
    const fixture = await seedFixture(ctx, "inq03");
    const logged = await sessions(ctx, fixture);
    try {
      const customer = await createCustomer(ctx, logged.salesA, fixture);
      const validItems = fixture.products.map((product) => ({ productId: product.id, productVersion: 1, quantity: "1.00" }));
      const candidates = [
        { items: [] },
        { items: Array.from({ length: 101 }, () => validItems[0]) },
        { items: [{ productVersion: 1, quantity: "1.00" }] },
        { items: [{ ...validItems[0], quantity: "0" }] },
        { items: [{ ...validItems[0], quantity: "-1.00" }] },
        { inquiryDate: "2026-02-30" },
      ];
      const responses = [];
      for (const candidate of candidates) {
        const base = {
          customerId: customer.value.id,
          customerVersion: 1,
          inquiryDate: today(),
          source: fixture.tag,
          message: "invalid candidate",
          items: validItems,
          ...candidate,
        };
        const result = await ctx.http.write(logged.salesA.context, "POST", "/api/v1/inquiries", base, [400, 422]);
        assert.ok(result.body.fieldErrors.length > 0);
        responses.push(publicResponse(result));
      }
      const duplicate = await createInquiry(ctx, logged.salesA, fixture, customer.value, { items: [validItems[0], validItems[0]] });
      assert.deepEqual(duplicate.value.items.map((item) => item.lineNo), [1, 2]);
      return { rejected: responses, duplicateProductAllowed: true, stableLineNumbers: [1, 2], invalidWrites: 0 };
    } finally {
      await closeSessions(logged);
    }
  },

  "QUOTE-01": async (ctx) => {
    const flow = await workflow(ctx, "draft", { label: "quote01" });
    try {
      const quote = flow.draft.value;
      assert.equal(quote.status, "DRAFT");
      assert.equal(quote.totalAmount, null);
      assert.ok(quote.items.every((item) => item.unitPrice === null && item.lineAmount === null));
      assert.deepEqual(quote.items.map((item) => item.quantity), flow.inquiry.value.items.map((item) => item.quantity));
      assert.equal(quote.validUntil, addDays(quote.quoteDate, 15));
      const inquiry = await ctx.http.get(flow.logged.salesA.context, `/api/v1/inquiries/${flow.inquiry.value.id}`);
      assert.equal(inquiry.body.status, "QUOTED");
      const listed = await ctx.http.get(flow.logged.salesA.context, `/api/v1/quotes?q=${quote.id}`);
      assert.equal(listed.body.total, 1);
      const cleared = await updateQuote(ctx, flow.logged.salesA, quote, { validUntil: null, tradeTerm: "", paymentTerm: "", unitPrice: null });
      assert.equal(cleared.value.status, "DRAFT");
      assert.equal(cleared.value.validUntil, null);
      const counts = await resourceCounts(ctx.sql, { quoteId: quote.id, inquiryId: flow.inquiry.value.id });
      assert.equal(counts.quote_lines, flow.inquiry.value.items.length);
      const page = await browserLogin(ctx, flow.fixture.accounts.salesA);
      try {
        const navigation = await page.goto(`/quotes/${quote.id}`);
        assert.equal(navigation.status(), 200);
        assert.ok(await page.locator("main").isVisible());
      } finally {
        await page.close();
      }
      return { quoteId: quote.id, quoteDate: quote.quoteDate, validUntil: quote.validUntil, sourceStatus: inquiry.body.status, lineCount: counts.quote_lines, emptyDraftSaved: true, browserDetailRendered: true };
    } finally {
      await closeSessions(flow.logged);
    }
  },

  "QUOTE-02": async (ctx) => {
    const fixture = await seedFixture(ctx, "quote02");
    const logged = await sessions(ctx, fixture);
    try {
      const customer = await createCustomer(ctx, logged.salesA, fixture);
      const inquiry = await createInquiry(ctx, logged.salesA, fixture, customer.value);
      const input = { expectedVersion: inquiry.value.version, currency: "USD" };
      const csrf = await ctx.http.csrf(logged.salesA.context);
      const results = await Promise.all([
        ctx.http.send(logged.salesA.context, "POST", `/api/v1/inquiries/${inquiry.value.id}/quotes`, input, { csrf }),
        ctx.http.send(logged.salesA.context, "POST", `/api/v1/inquiries/${inquiry.value.id}/quotes`, input, { csrf }),
      ]);
      assert.deepEqual(results.map((result) => result.status).sort(), [201, 409]);
      const quoteId = results.find((result) => result.status === 201).body.id;
      const counts = await resourceCounts(ctx.sql, { quoteId, inquiryId: inquiry.value.id });
      assert.equal(counts.quotes, 1);
      assert.equal(counts.quote_audits, 1);
      return { statuses: results.map((result) => result.status).sort(), quoteId, quotes: counts.quotes, successfulAudits: counts.quote_audits };
    } finally {
      await closeSessions(logged);
    }
  },

  "QUOTE-03": async (ctx) => {
    const flow = await workflow(ctx, "draft", { label: "quote03" });
    try {
      const updated = await updateQuote(ctx, flow.logged.salesA, flow.draft.value, { prices: ["5.00", "0.90"] });
      assert.equal(updated.value.version, 2);
      assert.equal(updated.value.totalAmount, "545.00");
      assert.deepEqual(updated.value.items.map((item) => item.lineAmount), ["500.00", "45.00"]);
      assert.ok(updated.value.items.every((item) => typeof item.lineAmount === "string"));
      const persisted = await ctx.sql`select total_amount as total, row_version as version from quote where id = ${updated.value.id}`;
      assert.equal(persisted[0].total, "545.00");
      assert.equal(persisted[0].version, 2);
      const page = await browserLogin(ctx, flow.fixture.accounts.salesA);
      try {
        await page.goto(`/quotes/${updated.value.id}`);
        assert.ok((await page.locator("tfoot").textContent()).includes("USD 545.00"));
      } finally {
        await page.close();
      }
      return { quoteId: updated.value.id, lineAmounts: ["500.00", "45.00"], totalAmount: persisted[0].total, version: persisted[0].version, amountsAreStrings: true, browserTotalRendered: "USD 545.00" };
    } finally {
      await closeSessions(flow.logged);
    }
  },

  "QUOTE-04": async (ctx) => {
    const flow = await workflow(ctx, "draft", { label: "quote04" });
    try {
      const original = flow.draft.value;
      const base = quoteUpdateInput(original);
      const candidates = [
        { body: { ...base, status: "CONFIRMED" }, statuses: [400] },
        { body: { ...base, totalAmount: "1.00" }, statuses: [400] },
        { body: { ...base, customerId: key() }, statuses: [400] },
        { body: { ...base, items: base.items.slice(1) }, statuses: [422] },
        { body: { ...base, items: [base.items[0], base.items[0]] }, statuses: [422] },
        { body: { ...base, items: [{ ...base.items[0], lineNo: 99 }, base.items[1]] }, statuses: [422] },
      ];
      const responses = [];
      for (const candidate of candidates) {
        const result = await ctx.http.write(flow.logged.salesA.context, "PUT", `/api/v1/quotes/${original.id}`, candidate.body, candidate.statuses);
        responses.push(publicResponse(result));
      }
      const after = await ctx.http.get(flow.logged.salesA.context, `/api/v1/quotes/${original.id}`);
      assert.equal(after.body.version, original.version);
      assert.deepEqual(after.body.items, original.items);
      return { rejected: responses, versionUnchanged: after.body.version, linesUnchanged: true };
    } finally {
      await closeSessions(flow.logged);
    }
  },

  "MONEY-01": async (ctx) => {
    const flow = await workflow(ctx, "draft", { label: "money01" });
    try {
      const quote = flow.draft.value;
      const invalid = [1, "1e2", "0x10", "1,000", " ", "1.001"];
      const responses = [];
      for (const unitPrice of invalid) {
        const input = quoteUpdateInput(quote, { items: [{ lineNo: 1, quantity: "1.00", unitPrice }, { lineNo: 2, quantity: "1.00", unitPrice: "1.00" }] });
        const result = await ctx.http.write(flow.logged.salesA.context, "PUT", `/api/v1/quotes/${quote.id}`, input, [400, 422]);
        responses.push(publicResponse(result));
      }
      for (const quantity of [1, "1e2", "0x10", "1,000", " ", "0", "-1", "1.001"]) {
        const input = {
          customerId: flow.customer.value.id,
          customerVersion: 1,
          inquiryDate: today(),
          source: flow.fixture.tag,
          message: "invalid money",
          items: [{ productId: flow.fixture.products[0].id, productVersion: 1, quantity }],
        };
        const result = await ctx.http.write(flow.logged.salesA.context, "POST", "/api/v1/inquiries", input, [400, 422]);
        responses.push(publicResponse(result));
      }
      const after = await ctx.http.get(flow.logged.salesA.context, `/api/v1/quotes/${quote.id}`);
      assert.equal(after.body.totalAmount, null);
      return { rejectedCount: responses.length, responses, quoteTotalStillNull: true, noSilentNumberConversion: true };
    } finally {
      await closeSessions(flow.logged);
    }
  },

  "MONEY-02": async (ctx) => {
    const flow = await workflow(ctx, "draft", { label: "money02" });
    try {
      const result = await updateQuote(ctx, flow.logged.salesA, flow.draft.value, { quantity: "0.01", unitPrice: "0.01", statuses: [422] });
      assert.ok(result.response.body.fieldErrors.some((item) => item.path.includes("/items/0") || item.path.includes("/items/1")));
      const after = await ctx.http.get(flow.logged.salesA.context, `/api/v1/quotes/${flow.draft.value.id}`);
      assert.equal(after.body.totalAmount, null);
      return { response: publicResponse(result.response), noRoundedZeroWrite: true };
    } finally {
      await closeSessions(flow.logged);
    }
  },

  "MONEY-03": async (ctx) => {
    const flow = await workflow(ctx, "draft", { label: "money03" });
    try {
      const items = flow.draft.value.items.map((item, index) => ({ lineNo: item.lineNo, quantity: index === 0 ? "0.01" : "0.10", unitPrice: index === 0 ? "1.00" : "0.1" }));
      const updated = await updateQuote(ctx, flow.logged.salesA, flow.draft.value, { items });
      assert.deepEqual(updated.value.items.map((item) => item.lineAmount), ["0.01", "0.01"]);
      assert.equal(updated.value.totalAmount, "0.02");
      assert.deepEqual(updated.value.items.map((item) => item.quantity), ["0.01", "0.10"]);
      assert.deepEqual(updated.value.items.map((item) => item.unitPrice), ["1.00", "0.10"]);
      return { lineAmounts: ["0.01", "0.01"], totalAmount: "0.02", normalizedDecimals: true };
    } finally {
      await closeSessions(flow.logged);
    }
  },

  "MONEY-04": async (ctx) => {
    const flow = await workflow(ctx, "draft", { label: "money04" });
    try {
      const maximum = "999999999999999999.99";
      const overflow = "1000000000000000000.00";
      const candidates = [
        quoteUpdateInput(flow.draft.value, { unitPrice: overflow }),
        quoteUpdateInput(flow.draft.value, { items: [{ lineNo: 1, quantity: maximum, unitPrice: maximum }, { lineNo: 2, quantity: "1.00", unitPrice: "1.00" }] }),
        quoteUpdateInput(flow.draft.value, { items: [{ lineNo: 1, quantity: "1.00", unitPrice: maximum }, { lineNo: 2, quantity: "1.00", unitPrice: maximum }] }),
      ];
      const responses = [];
      for (const input of candidates) {
        const result = await ctx.http.write(flow.logged.salesA.context, "PUT", `/api/v1/quotes/${flow.draft.value.id}`, input, [422]);
        responses.push(publicResponse(result));
      }
      const after = await ctx.http.get(flow.logged.salesA.context, `/api/v1/quotes/${flow.draft.value.id}`);
      assert.equal(after.body.version, 1);
      assert.equal(after.body.totalAmount, null);
      return { rejected: responses, versionUnchanged: 1, databaseOverflowNotUsed: true };
    } finally {
      await closeSessions(flow.logged);
    }
  },
};

async function globalWriteCounts(ctx) {
  const rows = await ctx.sql`select (select count(*)::int from inquiry) as inquiries, (select count(*)::int from inquiry_line) as lines, (select count(*)::int from audit_event) as audits, (select count(*)::int from idempotency_record) as idempotency`;
  return rows[0];
}
