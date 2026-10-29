import {
  addDays,
  assert,
  blocked,
  browserLogin,
  closeSessions,
  confirmQuote,
  createOrder,
  key,
  publicResponse,
  resourceCounts,
  submitQuote,
  today,
  updateQuote,
  workflow,
} from "./helpers.mjs";

export const lifecycleCases = {
  "SUBMIT-01": async (ctx) => {
    const flow = await workflow(ctx, "submitted", { label: "submit01" });
    try {
      const quote = flow.quote.value;
      assert.equal(quote.status, "AWAITING_CUSTOMER");
      const snapshot = quote.submittedSnapshot;
      assert.ok(snapshot);
      assert.equal(snapshot.submittedQuoteVersion, quote.version);
      assert.equal(snapshot.schemaVersion, 1);
      assert.equal(snapshot.customer.customerId, flow.customer.value.id);
      assert.equal(snapshot.seller.companyProfileVersion, flow.updated.value.sourceVersions.companyProfileVersion);
      assert.deepEqual(snapshot.items.map((item) => item.lineAmount), ["500.00", "45.00"]);
      const persisted = await ctx.sql`select state, issued_snapshot as snapshot, row_version as version from quote where id = ${quote.id}`;
      assert.equal(persisted[0].state, "AWAITING_CUSTOMER");
      assert.deepEqual(persisted[0].snapshot, snapshot);
      const counts = await resourceCounts(ctx.sql, { quoteId: quote.id });
      assert.equal(counts.quote_audits, 3);
      const page = await browserLogin(ctx, flow.fixture.accounts.salesA);
      try {
        await page.goto(`/quotes/${quote.id}`);
        await page.getByText("待客户确认", { exact: true }).waitFor();
        assert.ok((await page.locator("main").textContent()).includes("待客户确认"));
      } finally {
        await page.close();
      }
      return { quoteId: quote.id, state: persisted[0].state, submittedQuoteVersion: snapshot.submittedQuoteVersion, frozenLineAmounts: ["500.00", "45.00"], snapshotEqualsDatabase: true, successfulAudits: counts.quote_audits, browserSubmittedStateRendered: true };
    } finally {
      await closeSessions(flow.logged);
    }
  },

  "SUBMIT-02": async (ctx) => {
    const flow = await workflow(ctx, "priced", { label: "submit02" });
    try {
      const original = flow.updated.value;
      await ctx.http.write(flow.logged.salesA.context, "PUT", `/api/v1/customers/${flow.customer.value.id}`, { ...flow.customer.input, nameEn: "Concurrently changed customer", expectedVersion: 1 }, [200]);
      const result = await submitQuote(ctx, flow.logged.salesA, original, { statuses: [409] });
      assert.equal(result.response.body.code, "VERSION_CONFLICT");
      const after = await ctx.http.get(flow.logged.salesA.context, `/api/v1/quotes/${original.id}`);
      assert.equal(after.body.status, "DRAFT");
      assert.equal(after.body.submittedSnapshot, null);
      return { response: publicResponse(result.response), state: after.body.status, issuedSnapshot: null };
    } finally {
      await closeSessions(flow.logged);
    }
  },

  "SUBMIT-03": async (ctx) => {
    const flow = await workflow(ctx, "priced", { label: "submit03" });
    try {
      const base = flow.updated.value;
      const cases = [];
      const blank = await updateQuote(ctx, flow.logged.salesA, base, { tradeTerm: "", unitPrice: null });
      const missingTerms = await submitQuote(ctx, flow.logged.salesA, blank.value, { statuses: [422] });
      cases.push(publicResponse(missingTerms.response));
      const priced = await updateQuote(ctx, flow.logged.salesA, blank.value);
      const missingPrice = await updateQuote(ctx, flow.logged.salesA, priced.value, { items: [{ lineNo: 1, quantity: "1.00", unitPrice: null }, { lineNo: 2, quantity: "1.00", unitPrice: "1.00" }] });
      const noPrice = await submitQuote(ctx, flow.logged.salesA, missingPrice.value, { statuses: [422] });
      cases.push(publicResponse(noPrice.response));
      const noDate = await updateQuote(ctx, flow.logged.salesA, missingPrice.value, { validUntil: null, unitPrice: "1.00" });
      const noDateResult = await submitQuote(ctx, flow.logged.salesA, noDate.value, { statuses: [422] });
      assert.ok(noDateResult.response.body.fieldErrors.some((item) => item.path === "/validUntil"));
      cases.push(publicResponse(noDateResult.response));
      const expired = await updateQuote(ctx, flow.logged.salesA, noDate.value, { unitPrice: "1.00" });
      await ctx.sql`update quote set quote_date = ${addDays(today(), -2)}, valid_until = ${addDays(today(), -1)} where id = ${expired.value.id}`;
      const expiredResult = await submitQuote(ctx, flow.logged.salesA, expired.value, { statuses: [422] });
      assert.equal(expiredResult.response.body.code, "QUOTE_EXPIRED");
      cases.push(publicResponse(expiredResult.response));
      await ctx.sql`update quote set quote_date = ${today()}, valid_until = ${addDays(today(), 15)} where id = ${expired.value.id}`;
      await ctx.sql`update currency_catalog set enabled = false where code = 'USD'`;
      try {
        const restoredDate = await submitQuote(ctx, flow.logged.salesA, expired.value, { statuses: [422] });
        assert.equal(restoredDate.response.body.code, "CURRENCY_NOT_AVAILABLE");
        cases.push(publicResponse(restoredDate.response));
      } finally {
        await ctx.sql`update currency_catalog set enabled = true where code = 'USD'`;
      }
      const references = await ctx.sql`select count(*)::int as count from quote where issued_snapshot is not null`;
      let company = { status: "BLOCKED", reason: "Company profile is referenced by existing synthetic snapshots" };
      if (references[0].count === 0) {
        const companyRow = await ctx.sql`delete from company_profile where profile_key = 'PRIMARY_COMPANY' returning id`;
        try {
          if (companyRow.length === 1) {
            const valid = await updateQuote(ctx, flow.logged.salesA, expired.value, { validUntil: addDays(today(), 15) });
            const result = await submitQuote(ctx, flow.logged.salesA, valid.value, { expectedCompanyProfileVersion: 1, statuses: [422] });
            assert.equal(result.response.body.code, "COMPANY_PROFILE_REQUIRED");
            company = { status: "PASS", response: publicResponse(result.response) };
          }
        } finally {
          await ctx.sql`insert into company_profile (id, name_cn, name_en, legal_name, address, contact, email, phone, profile_key, created_by) values (${key()}, '合成验收公司', 'Synthetic Acceptance Company', 'Synthetic Acceptance Company Ltd.', '1 Synthetic Test Road', 'Synthetic contact', 'acceptance@example.invalid', '+86-000-0000', 'PRIMARY_COMPANY', ${flow.fixture.accounts.admin.id})`;
        }
      }
      const after = await ctx.http.get(flow.logged.salesA.context, `/api/v1/quotes/${base.id}`);
      assert.equal(after.body.status, "DRAFT");
      assert.equal(after.body.submittedSnapshot, null);
      if (company.status !== "PASS") blocked("SUBMIT-03 的无公司资料子场景需要主控提供未被历史快照引用的 company_profile", { otherChecks: cases, company });
      return { rejected: cases, missingCompany: company, finalState: after.body.status, noDemoOrZeroPriceFallback: true };
    } finally {
      await closeSessions(flow.logged);
    }
  },

  "CONFIRM-01": async (ctx) => {
    const flow = await workflow(ctx, "confirmed", { label: "confirm01" });
    try {
      const quote = flow.quote.value;
      assert.equal(quote.status, "CONFIRMED");
      assert.equal(quote.customerConfirmation.quoteSnapshotVersion, quote.submittedSnapshot.snapshotVersion);
      assert.equal(quote.customerConfirmation.recordedBy, flow.fixture.accounts.salesA.id);
      assert.ok(!Number.isNaN(Date.parse(quote.customerConfirmation.recordedAt)));
      assert.deepEqual(quote.customerConfirmation.attachmentIds, []);
      const persisted = await ctx.sql`select confirmed_snapshot as snapshot, recorded_by as "recordedBy" from quote_confirmation where quote_id = ${quote.id}`;
      assert.deepEqual(persisted[0].snapshot, quote.submittedSnapshot);
      const page = await browserLogin(ctx, flow.fixture.accounts.salesA);
      try {
        await page.goto(`/quotes/${quote.id}`);
        await page.getByText("已确认", { exact: true }).first().waitFor();
        assert.ok((await page.locator("main").textContent()).includes("已确认"));
      } finally {
        await page.close();
      }
      return { quoteId: quote.id, state: quote.status, confirmationId: quote.customerConfirmation.id, recordedByFromServer: true, confirmedSnapshotEqualsIssued: true, attachments: [], browserConfirmedStateRendered: true };
    } finally {
      await closeSessions(flow.logged);
    }
  },

  "CONFIRM-02": async (ctx) => {
    const flow = await workflow(ctx, "submitted", { label: "confirm02" });
    try {
      const quote = flow.quote.value;
      const candidates = [
        { method: " ", note: "valid" },
        { method: "email", note: " " },
        { confirmedOn: addDays(today(), 1) },
        { confirmedOn: "2026-02-30" },
        { attachments: [key()] },
      ];
      const responses = [];
      for (const candidate of candidates) {
        const result = await confirmQuote(ctx, flow.logged.salesA, quote, { ...candidate, statuses: [422] });
        if (candidate.attachments) assert.equal(result.response.body.code, "FEATURE_NOT_IN_SLICE");
        responses.push(publicResponse(result.response));
      }
      const after = await ctx.http.get(flow.logged.salesA.context, `/api/v1/quotes/${quote.id}`);
      assert.equal(after.body.status, "AWAITING_CUSTOMER");
      assert.equal(after.body.customerConfirmation, null);
      return { rejected: responses, stateUnchanged: after.body.status, confirmationRows: 0 };
    } finally {
      await closeSessions(flow.logged);
    }
  },

  "CONFIRM-03": async (ctx) => {
    const flow = await workflow(ctx, "confirmed", { label: "confirm03" });
    try {
      const quote = flow.quote.value;
      const repeat = await confirmQuote(ctx, flow.logged.salesA, quote, { statuses: [409] });
      const edit = await updateQuote(ctx, flow.logged.salesA, quote, { statuses: [409] });
      const after = await ctx.http.get(flow.logged.salesA.context, `/api/v1/quotes/${quote.id}`);
      assert.equal(after.body.version, quote.version);
      assert.deepEqual(after.body.submittedSnapshot, quote.submittedSnapshot);
      const confirmations = await ctx.sql`select count(*)::int as count from quote_confirmation where quote_id = ${quote.id}`;
      assert.equal(confirmations[0].count, 1);
      return { repeatConfirmation: publicResponse(repeat.response), edit: publicResponse(edit.response), confirmations: 1, originalSnapshotPreserved: true };
    } finally {
      await closeSessions(flow.logged);
    }
  },

  "ORDER-01": async (ctx) => {
    const flow = await workflow(ctx, "order", { label: "order01" });
    try {
      const order = flow.order.value;
      assert.equal(order.sourceQuoteId, flow.quote.value.id);
      assert.equal(order.version, 1);
      assert.equal(order.orderProgress, "PENDING_EXECUTION");
      assert.equal(order.documentProgress, "NOT_STARTED");
      assert.equal(order.paymentProgress, "UNPAID");
      const quote = await ctx.http.get(flow.logged.salesA.context, `/api/v1/quotes/${flow.quote.value.id}`);
      assert.equal(quote.body.status, "CONFIRMED");
      assert.equal(quote.body.orderId, order.id);
      assert.ok(quote.body.convertedAt);
      const counts = await resourceCounts(ctx.sql, { quoteId: flow.quote.value.id });
      assert.deepEqual({ orders: counts.orders, versions: counts.versions, lines: counts.order_lines }, { orders: 1, versions: 1, lines: 2 });
      const page = await browserLogin(ctx, flow.fixture.accounts.salesA);
      try {
        await page.goto(`/orders/${order.id}`);
        assert.equal(await page.locator(".order-total").textContent(), "USD 545.00");
      } finally {
        await page.close();
      }
      return { orderId: order.id, quoteId: flow.quote.value.id, sourceStatus: quote.body.status, convertedAtPresent: true, counts: { orders: 1, versions: 1, lines: 2 }, independentProgress: [order.orderProgress, order.documentProgress, order.paymentProgress], browserOrderTotal: "USD 545.00" };
    } finally {
      await closeSessions(flow.logged);
    }
  },

  "ORDER-02": async (ctx) => {
    const flow = await workflow(ctx, "submitted", { label: "order02" });
    try {
      const unconfirmed = await createOrder(ctx, flow.logged.salesA, flow.quote.value, { statuses: [409] });
      const confirmed = await confirmQuote(ctx, flow.logged.salesA, flow.quote.value);
      const unknown = await createOrder(ctx, flow.logged.salesA, confirmed.value, { extra: { totalAmount: "1.00" }, statuses: [400] });
      const missingDate = await ctx.http.write(flow.logged.salesA.context, "POST", `/api/v1/quotes/${confirmed.value.id}/orders`, { expectedVersion: confirmed.value.version }, [400]);
      const badDate = await createOrder(ctx, flow.logged.salesA, confirmed.value, { deliveryDate: "2026-02-30", statuses: [422] });
      await ctx.sql`update quote set quote_date = ${addDays(today(), -2)}, valid_until = ${addDays(today(), -1)} where id = ${confirmed.value.id}`;
      const expired = await createOrder(ctx, flow.logged.salesA, confirmed.value, { statuses: [422] });
      assert.equal(expired.response.body.code, "QUOTE_EXPIRED");
      const counts = await resourceCounts(ctx.sql, { quoteId: confirmed.value.id });
      assert.equal(counts.orders, 0);
      return { unconfirmed: publicResponse(unconfirmed.response), unknownField: publicResponse(unknown.response), missingDelivery: publicResponse(missingDate), invalidDelivery: publicResponse(badDate.response), expired: publicResponse(expired.response), ordersCreated: 0 };
    } finally {
      await closeSessions(flow.logged);
    }
  },

  "ORDER-03": async (ctx) => {
    const flow = await workflow(ctx, "confirmed", { label: "order03" });
    try {
      const body = { expectedVersion: flow.quote.value.version, deliveryDate: flow.quote.value.validUntil };
      const csrf = await ctx.http.csrf(flow.logged.salesA.context);
      const results = await Promise.all([
        ctx.http.send(flow.logged.salesA.context, "POST", `/api/v1/quotes/${flow.quote.value.id}/orders`, body, { csrf }),
        ctx.http.send(flow.logged.salesA.context, "POST", `/api/v1/quotes/${flow.quote.value.id}/orders`, body, { csrf }),
      ]);
      assert.deepEqual(results.map((result) => result.status).sort(), [200, 201]);
      assert.equal(results[0].body.id, results[1].body.id);
      const counts = await resourceCounts(ctx.sql, { quoteId: flow.quote.value.id });
      assert.deepEqual({ orders: counts.orders, versions: counts.versions, lines: counts.order_lines, quoteAudits: counts.quote_audits, orderAudits: counts.order_audits }, { orders: 1, versions: 1, lines: 2, quoteAudits: 4, orderAudits: 1 });
      return { statuses: results.map((result) => result.status).sort(), orderId: results[0].body.id, orders: 1, versions: 1, lines: 2, quoteAudits: 4, orderAudits: 1 };
    } finally {
      await closeSessions(flow.logged);
    }
  },

  "ORDER-04": async (ctx) => {
    const flow = await workflow(ctx, "order", { label: "order04" });
    try {
      const changedDate = addDays(flow.order.value.deliveryDate, 1);
      const result = await createOrder(ctx, flow.logged.salesA, flow.quote.value, { deliveryDate: changedDate, statuses: [409] });
      assert.equal(result.response.body.code, "SOURCE_ALREADY_CONVERTED");
      const order = await ctx.http.get(flow.logged.salesA.context, `/api/v1/orders/${flow.order.value.id}`);
      assert.equal(order.body.deliveryDate, flow.order.value.deliveryDate);
      const counts = await resourceCounts(ctx.sql, { quoteId: flow.quote.value.id });
      assert.equal(counts.orders, 1);
      return { response: publicResponse(result.response), originalDeliveryDate: order.body.deliveryDate, orders: 1 };
    } finally {
      await closeSessions(flow.logged);
    }
  },

  "ORDER-05": async (ctx) => {
    const flow = await workflow(ctx, "order", { label: "order05" });
    try {
      const originalKey = flow.order.key;
      await ctx.sql`update quote set quote_date = ${addDays(today(), -2)}, valid_until = ${addDays(today(), -1)}, row_version = row_version + 1 where id = ${flow.quote.value.id}`;
      const sameKey = await createOrder(ctx, flow.logged.salesA, flow.quote.value, { deliveryDate: flow.order.value.deliveryDate, statuses: [200], http: { key: originalKey } });
      const newKey = await createOrder(ctx, flow.logged.salesA, flow.quote.value, { expectedVersion: flow.quote.value.version, deliveryDate: flow.order.value.deliveryDate, statuses: [200] });
      assert.equal(sameKey.response.response.headers()["idempotency-replayed"], "true");
      assert.equal(sameKey.value.id, flow.order.value.id);
      assert.equal(newKey.value.id, flow.order.value.id);
      const counts = await resourceCounts(ctx.sql, { quoteId: flow.quote.value.id });
      assert.equal(counts.orders, 1);
      assert.equal(counts.versions, 1);
      return { sameKey: publicResponse(sameKey.response), sameDeliveryNewKey: publicResponse(newKey.response), orderId: flow.order.value.id, orders: 1, versions: 1 };
    } finally {
      await closeSessions(flow.logged);
    }
  },

  "SNAP-01": async (ctx) => {
    const flow = await workflow(ctx, "submitted", { label: "snap01" });
    try {
      const issued = JSON.parse(JSON.stringify(flow.quote.value.submittedSnapshot));
      await ctx.http.write(flow.logged.salesA.context, "PUT", `/api/v1/customers/${flow.customer.value.id}`, { ...flow.customer.input, nameCn: "实时客户名已改变", nameEn: "Live replacement", expectedVersion: 1 }, [200]);
      const productId = flow.fixture.products[0].id;
      const currentProduct = await ctx.http.get(flow.logged.salesA.context, `/api/v1/products/${productId}`);
      const updatedProduct = await ctx.http.write(flow.logged.salesA.context, "PUT", `/api/v1/products/${productId}`, {
        expectedVersion: currentProduct.body.version,
        sku: currentProduct.body.sku,
        nameCn: currentProduct.body.nameCn,
        nameEn: "Live product replacement",
        spec: currentProduct.body.spec,
        unit: currentProduct.body.unit,
        refPrice: currentProduct.body.refPrice,
        currency: currentProduct.body.currency,
        hsCode: currentProduct.body.hsCode,
        remark: currentProduct.body.remark,
        enabled: currentProduct.body.enabled,
      }, [200]);
      assert.equal(updatedProduct.body.version, currentProduct.body.version + 1);
      await ctx.sql`update company_profile set legal_name = 'Synthetic Live Replacement Ltd.', row_version = row_version + 1 where profile_key = 'PRIMARY_COMPANY'`;
      const confirmed = await confirmQuote(ctx, flow.logged.salesA, flow.quote.value);
      const order = await createOrder(ctx, flow.logged.salesA, confirmed.value);
      assert.deepEqual(confirmed.value.submittedSnapshot, issued);
      assert.deepEqual(order.value.trade, issued);
      assert.notEqual(order.value.trade.customer.nameEn, "Live replacement");
      assert.notEqual(order.value.trade.seller.legalName, "Synthetic Live Replacement Ltd.");
      assert.notEqual(order.value.trade.items[0].product.nameEn, "Live product replacement");
      assert.equal(order.value.sourceQuoteSnapshotVersion, issued.snapshotVersion);
      assert.equal(order.value.version, 1);
      const persisted = await ctx.sql`select confirmed_snapshot as snapshot from order_version where order_id = ${order.value.id}`;
      assert.deepEqual(persisted[0].snapshot, issued);
      const readBack = await ctx.http.get(flow.logged.salesA.context, `/api/v1/orders/${order.value.id}`);
      assert.deepEqual(readBack.body, order.value);
      return { quoteId: flow.quote.value.id, orderId: order.value.id, customerProductCompanyFrozen: true, orderSnapshotEqualsIssued: true, snapshotVersion: issued.snapshotVersion, orderVersion: order.value.version };
    } finally {
      await closeSessions(flow.logged);
    }
  },
};
