import {
  assert,
  browserLogin,
  closeSessions,
  confirmQuote,
  createCustomer,
  createInquiry,
  createOrder,
  createQuote,
  customerInput,
  key,
  productInput,
  publicResponse,
  quoteUpdateInput,
  resourceCounts,
  seedFixture,
  sessions,
  submitQuote,
  today,
  updateQuote,
  workflow,
} from "./helpers.mjs";

export const systemCases = {
  "IDEM-01": async (ctx) => {
    const fixture = await seedFixture(ctx, "idem01");
    const logged = await sessions(ctx, fixture);
    try {
      const createKey = key();
      const input = customerInput(fixture.tag);
      const created = await ctx.http.write(logged.salesA.context, "POST", "/api/v1/customers", input, [201], { key: createKey });
      await ctx.http.write(logged.salesA.context, "PUT", `/api/v1/customers/${created.body.id}`, { ...input, nameEn: "Current representation", expectedVersion: 1 }, [200]);
      const replay = await ctx.http.write(logged.salesA.context, "POST", "/api/v1/customers", input, [200], { key: createKey });
      assert.equal(replay.response.headers()["idempotency-replayed"], "true");
      assert.equal(replay.body.id, created.body.id);
      assert.equal(replay.body.version, 2);
      assert.equal(replay.body.nameEn, "Current representation");
      const rows = await ctx.sql`select (select count(*)::int from customer where id = ${created.body.id}) as customers, (select count(*)::int from audit_event where resource_id = ${created.body.id}) as audits, (select count(*)::int from idempotency_record where resource_id = ${created.body.id}) as idempotency`;
      assert.deepEqual(rows[0], { customers: 1, audits: 2, idempotency: 2 });
      return { customerId: created.body.id, replay: publicResponse(replay), currentVersionReturned: 2, ...rows[0] };
    } finally {
      await closeSessions(logged);
    }
  },

  "IDEM-02": async (ctx) => {
    const fixture = await seedFixture(ctx, "idem02");
    const logged = await sessions(ctx, fixture);
    try {
      const bodyKey = key();
      const input = customerInput(fixture.tag);
      await ctx.http.write(logged.salesA.context, "POST", "/api/v1/customers", input, [201], { key: bodyKey });
      const differentBody = await ctx.http.write(logged.salesA.context, "POST", "/api/v1/customers", { ...input, nameEn: "Different command" }, [409], { key: bodyKey });
      assert.equal(differentBody.body.code, "IDEMPOTENCY_CONFLICT");
      const endpointKey = key();
      await ctx.http.write(logged.salesA.context, "POST", "/api/v1/customers", customerInput(fixture.tag, "endpoint"), [201], { key: endpointKey });
      const differentEndpoint = await ctx.http.write(logged.salesA.context, "POST", "/api/v1/products", productInput(fixture.tag), [409], { key: endpointKey });
      assert.equal(differentEndpoint.body.code, "IDEMPOTENCY_CONFLICT");
      const products = await ctx.sql`select count(*)::int as count from product where sku = ${productInput(fixture.tag).sku}`;
      assert.equal(products[0].count, 0);
      return { differentBody: publicResponse(differentBody), differentEndpoint: publicResponse(differentEndpoint), stolenResourceReturned: false };
    } finally {
      await closeSessions(logged);
    }
  },

  "IDEM-03": async (ctx) => {
    const flow = await workflow(ctx, "order", { label: "idem03", names: ["salesA", "salesB", "admin"] });
    try {
      const originalKey = flow.order.key;
      const path = `/api/v1/quotes/${flow.quote.value.id}/orders`;
      const body = flow.order.input;
      const otherOwner = await ctx.http.write(flow.logged.salesB.context, "POST", path, body, [404], { key: originalKey });
      const role = await ctx.http.write(flow.logged.admin.context, "POST", path, body, [403], { key: originalKey });
      await ctx.http.write(flow.logged.salesA.context, "POST", "/api/v1/auth/logout", undefined, [204]);
      const revoked = await ctx.http.write(flow.logged.salesA.context, "POST", path, body, [401], { key: originalKey });
      assert.ok(![otherOwner, role, revoked].some((result) => result.text.includes(flow.order.value.id)));
      return { outOfScope: publicResponse(otherOwner), roleRevoked: publicResponse(role), sessionRevoked: publicResponse(revoked), orderIdDisclosed: false };
    } finally {
      await closeSessions(flow.logged);
    }
  },

  "IDEM-04": async (ctx) => {
    const fixture = await seedFixture(ctx, "idem04");
    const logged = await sessions(ctx, fixture);
    try {
      const missing = await ctx.http.write(logged.salesA.context, "POST", "/api/v1/customers", customerInput(fixture.tag), [400], { key: null });
      const invalid = await ctx.http.write(logged.salesA.context, "POST", "/api/v1/customers", customerInput(fixture.tag), [400], { key: "not-a-uuid" });
      const rows = await ctx.sql`select (select count(*)::int from customer where owner_user_id = ${fixture.accounts.salesA.id}) as customers, (select count(*)::int from audit_event where actor_user_id = ${fixture.accounts.salesA.id}) as audits, (select count(*)::int from idempotency_record where actor_user_id = ${fixture.accounts.salesA.id}) as idempotency`;
      assert.deepEqual(rows[0], { customers: 0, audits: 0, idempotency: 0 });
      return { missing: publicResponse(missing), invalid: publicResponse(invalid), ...rows[0] };
    } finally {
      await closeSessions(logged);
    }
  },

  "VERSION-01": async (ctx) => {
    const flow = await workflow(ctx, "priced", { label: "version01" });
    try {
      const quote = flow.updated.value;
      const updateBody = quoteUpdateInput(quote, { remark: "Competing update" });
      const submitBody = { expectedVersion: quote.version, expectedCustomerVersion: quote.sourceVersions.customerVersion, expectedCompanyProfileVersion: quote.sourceVersions.companyProfileVersion };
      const csrf = await ctx.http.csrf(flow.logged.salesA.context);
      const [update, submit] = await Promise.all([
        ctx.http.send(flow.logged.salesA.context, "PUT", `/api/v1/quotes/${quote.id}`, updateBody, { csrf }),
        ctx.http.send(flow.logged.salesA.context, "POST", `/api/v1/quotes/${quote.id}/submit`, submitBody, { csrf }),
      ]);
      assert.deepEqual([update.status, submit.status].sort(), [200, 409]);
      const after = await ctx.http.get(flow.logged.salesA.context, `/api/v1/quotes/${quote.id}`);
      if (submit.status === 200) {
        assert.equal(after.body.status, "AWAITING_CUSTOMER");
        assert.deepEqual(after.body.submittedSnapshot.items.map((item) => item.lineAmount), after.body.items.map((item) => item.lineAmount));
        assert.equal(after.body.submittedSnapshot.totalAmount, after.body.totalAmount);
      } else {
        assert.equal(after.body.status, "DRAFT");
        assert.equal(after.body.submittedSnapshot, null);
      }
      return { updateStatus: update.status, submitStatus: submit.status, winner: submit.status === 200 ? "submit" : "update", finalState: after.body.status, snapshotAmountsConsistent: true };
    } finally {
      await closeSessions(flow.logged);
    }
  },

  "TX-01": async (ctx) => {
    const operations = ["createInquiry", "createQuote", "submitQuote", "recordCustomerConfirmation", "createOrderFromQuote"];
    const evidence = [];
    const functionName = `acc_fault_${ctx.runId.replaceAll("-", "_")}`;
    await ctx.sql.unsafe(`create function ${functionName}() returns trigger language plpgsql as $$ begin if new.operation_id = tg_argv[0] then raise exception 'synthetic acceptance fault'; end if; return new; end $$`);
    try {
      for (const operation of operations) {
        for (const table of ["idempotency_record", "audit_event"]) {
          const prepared = await prepareTransactionTarget(ctx, operation);
          const triggerName = `acc_${table}_${ctx.runId}`.slice(0, 60);
          try {
            await ctx.sql.unsafe(`create trigger ${triggerName} before insert on ${table} for each row execute function ${functionName}('${operation}')`);
            const before = await transactionWriteCounts(ctx);
            const failure = await ctx.http.send(prepared.logged.salesA.context, prepared.method, prepared.path, prepared.body, { key: prepared.key });
            assert.equal(failure.status, 500, `${operation}/${table} injected write must fail`);
            assert.equal(failure.body.code, "INTERNAL_ERROR");
            const after = await transactionWriteCounts(ctx);
            assert.deepEqual(after, before, `${operation}/${table} must roll back every business and success record`);
            evidence.push({ operation, injectionPoint: table, failureStatus: failure.status, rollbackVerified: true });
          } finally {
            await ctx.sql.unsafe(`drop trigger if exists ${triggerName} on ${table}`);
          }
          const retry = await ctx.http.send(prepared.logged.salesA.context, prepared.method, prepared.path, prepared.body, { key: prepared.key });
          assert.equal(retry.status, prepared.expectedStatus, `${operation}/${table} same-key retry must succeed`);
          evidence.at(-1).sameKeyRetryStatus = retry.status;
          await closeSessions(prepared.logged);
        }
      }
      return {
        coverageLevel: "REAL_HTTP_TO_POSTGRESQL_BEFORE_INSERT_TRIGGER",
        injectedOperations: operations,
        injectionPoints: ["idempotency_record", "audit_event"],
        limitation: "覆盖五个业务事务的成功幂等与成功审计写入故障；未声称覆盖服务内部每一个中间 SQL 步骤或进程崩溃窗口。",
        faults: evidence,
      };
    } finally {
      await ctx.sql.unsafe(`drop function if exists ${functionName}()`);
    }
  },

  "DB-01": async (ctx) => {
    const flow = await workflow(ctx, "priced", { label: "db01" });
    try {
      const owner = flow.fixture.accounts.salesA.id;
      const otherOwner = flow.fixture.accounts.salesB.id;
      const customerId = flow.customer.value.id;
      const quoteId = flow.draft.value.id;
      const second = await createInquiry(ctx, flow.logged.salesA, flow.fixture, flow.customer.value);
      const inquiryId = second.value.id;
      const rejected = [];
      await expectSqlState(ctx, "23503", async (sql) => sql`insert into inquiry (id, owner_user_id, customer_id, inquiry_date, source, message, customer_version_at_creation, created_by) values (${key()}, ${otherOwner}, ${customerId}, ${today()}, 'bad owner', 'bad owner', 1, ${otherOwner})`);
      rejected.push("inquiry_customer_owner_fk");
      await expectSqlState(ctx, "23503", async (sql) => sql`insert into quote (id, inquiry_id, owner_user_id, customer_id, quote_date, currency, trade_term, payment_term, remark, created_by) values (${key()}, ${inquiryId}, ${owner}, ${key()}, ${today()}, 'USD', '', '', '', ${owner})`);
      rejected.push("quote_inquiry_owner_customer_fk");
      await expectSqlState(ctx, "23503", async (sql) => sql`insert into quote_line (id, quote_id, inquiry_id, inquiry_line_id, line_no, product_snapshot, quantity) select ${key()}, ${quoteId}, ${second.value.id}, id, 99, product_snapshot, '1.00' from inquiry_line where inquiry_id = ${second.value.id} limit 1`);
      rejected.push("quote_line_quote_inquiry_fk");
      await expectSqlState(ctx, "23503", async (sql) => sql`insert into sales_order (id, source_quote_id, owner_user_id, created_by) values (${key()}, ${quoteId}, ${owner}, ${owner})`);
      rejected.push("sales_order_quote_confirmation_fk");
      await expectSqlState(ctx, "23502", async (sql) => sql`insert into inquiry (id, owner_user_id, customer_id, inquiry_date, source, message, customer_version_at_creation, created_by) values (${key()}, ${owner}, ${customerId}, ${today()}, 'not null', null, 1, ${owner})`);
      rejected.push("inquiry_message_not_null");
      const submitted = await submitQuote(ctx, flow.logged.salesA, flow.updated.value);
      const confirmed = await confirmQuote(ctx, flow.logged.salesA, submitted.value);
      const order = await createOrder(ctx, flow.logged.salesA, confirmed.value);
      await expectSqlState(ctx, "23505", async (sql) => sql`insert into sales_order (id, source_quote_id, owner_user_id, created_by) values (${key()}, ${quoteId}, ${owner}, ${owner})`);
      rejected.push("sales_order_source_quote_id_unique");
      await expectSqlState(ctx, "23503", async (sql) => sql`insert into order_line (id, order_version_id, source_quote_id, source_quote_line_id, line_no, product_snapshot, quantity, unit_price, line_amount) select ${key()}, order_version_id, ${key()}, ${key()}, 99, product_snapshot, quantity, unit_price, line_amount from order_line where source_quote_id = ${quoteId} limit 1`);
      rejected.push("order_line_order_version_quote_fk");
      const counts = await resourceCounts(ctx.sql, { quoteId });
      assert.equal(counts.orders, 1);
      return { engine: "PostgreSQL", rejectedConstraints: rejected, expectedSqlStates: ["23503", "23502", "23505"], failedTransactionsPersisted: 0, ordersAfterDuplicateAttempt: counts.orders, orderId: order.value.id };
    } finally {
      await closeSessions(flow.logged);
    }
  },

  "ERROR-01": async (ctx) => {
    const fixture = await seedFixture(ctx, "error01");
    const logged = await sessions(ctx, fixture, ["salesA", "salesB"]);
    const logMark = ctx.appLogLength();
    try {
      const missing = await ctx.http.get(logged.salesA.context, `/api/v1/orders/${key()}`, [404]);
      const customer = await createCustomer(ctx, logged.salesA, fixture);
      await ctx.http.write(logged.salesA.context, "PUT", `/api/v1/customers/${customer.value.id}`, { ...customer.input, expectedVersion: 1, nameEn: "Current" }, [200]);
      const stale = await ctx.http.write(logged.salesA.context, "PUT", `/api/v1/customers/${customer.value.id}`, { ...customer.input, expectedVersion: 1 }, [409]);
      const invalid = await ctx.http.write(logged.salesA.context, "PUT", `/api/v1/customers/${customer.value.id}`, { ...customer.input, expectedVersion: 2, email: "not-an-email" }, [422]);
      const other = await ctx.http.get(logged.salesB.context, `/api/v1/customers/${customer.value.id}`, [404]);
      for (const result of [missing, stale, invalid, other]) {
        assert.equal(result.body.status, result.status);
        assert.ok(typeof result.body.code === "string" && result.body.code.length > 0);
        assert.ok(typeof result.body.requestId === "string" && result.body.requestId.length > 0);
        assert.ok(Array.isArray(result.body.fieldErrors));
        assert.equal(result.response.headers()["x-request-id"], result.body.requestId);
        assert.ok(!/(?:password|cookie|stack|select\s|insert\s|update\s|TRADE_SESSION)/i.test(result.text));
      }
      assert.equal(stale.body.currentVersion, 2);
      assert.equal(other.body.currentVersion, undefined);
      const logs = ctx.appLogsSince(logMark);
      assert.ok(!logs.includes(fixture.accounts.salesA.password));
      assert.ok(!logs.includes(customer.value.nameCn));
      assert.ok(!/(?:password|cookie|stack|select\s|insert\s|update\s)/i.test(logs));
      assert.ok(!/TRADE_SESSION=[^\s;]+/.test(logs));
      const page = await browserLogin(ctx, fixture.accounts.salesB);
      try {
        await page.goto(`/customers/${customer.value.id}`);
        await page.locator(".error-panel").waitFor();
        const alertText = await page.locator(".error-panel").textContent();
        assert.ok(alertText.includes("HTTP 404"), `Expected browser 404 alert, got: ${alertText}`);
        assert.equal(await page.getByText(customer.value.nameCn, { exact: true }).count(), 0);
      } finally {
        await page.close();
      }
      return { responses: [missing, stale, invalid, other].map(publicResponse), currentVersionOnlyForAuthorizedConflict: true, logEntriesInspected: logs ? logs.split("\n").length : 0, secretsOrSqlInResponses: false, browserCrossOwnerDetail: 404 };
    } finally {
      await closeSessions(logged);
    }
  },
};

async function prepareTransactionTarget(ctx, operation) {
  const fixture = await seedFixture(ctx, `tx-${operation}`);
  const logged = await sessions(ctx, fixture);
  const sales = logged.salesA;
  const customer = await createCustomer(ctx, sales, fixture);
  const commandKey = key();
  if (operation === "createInquiry") {
    const body = { customerId: customer.value.id, customerVersion: 1, inquiryDate: today(), source: fixture.tag, message: "TX synthetic", items: [{ productId: fixture.products[0].id, productVersion: 1, quantity: "1.00" }] };
    return { fixture, logged, method: "POST", path: "/api/v1/inquiries", body, key: commandKey, expectedStatus: 201 };
  }
  const inquiry = await createInquiry(ctx, sales, fixture, customer.value);
  if (operation === "createQuote") {
    return { fixture, logged, method: "POST", path: `/api/v1/inquiries/${inquiry.value.id}/quotes`, body: { expectedVersion: 1, currency: "USD" }, key: commandKey, expectedStatus: 201 };
  }
  const draft = await createQuote(ctx, sales, inquiry.value);
  const updated = await updateQuote(ctx, sales, draft.value);
  if (operation === "submitQuote") {
    const quote = updated.value;
    return { fixture, logged, method: "POST", path: `/api/v1/quotes/${quote.id}/submit`, body: { expectedVersion: quote.version, expectedCustomerVersion: quote.sourceVersions.customerVersion, expectedCompanyProfileVersion: quote.sourceVersions.companyProfileVersion }, key: commandKey, expectedStatus: 200 };
  }
  const submitted = await submitQuote(ctx, sales, updated.value);
  if (operation === "recordCustomerConfirmation") {
    const quote = submitted.value;
    return { fixture, logged, method: "POST", path: `/api/v1/quotes/${quote.id}/customer-confirmations`, body: { expectedVersion: quote.version, method: "email", confirmedOn: quote.quoteDate, note: "TX synthetic", attachmentIds: [] }, key: commandKey, expectedStatus: 200 };
  }
  if (operation !== "createOrderFromQuote") throw new Error(`Unknown TX target ${operation}`);
  const confirmed = await confirmQuote(ctx, sales, submitted.value);
  return { fixture, logged, method: "POST", path: `/api/v1/quotes/${confirmed.value.id}/orders`, body: { expectedVersion: confirmed.value.version, deliveryDate: confirmed.value.validUntil }, key: commandKey, expectedStatus: 201 };
}

async function transactionWriteCounts(ctx) {
  const rows = await ctx.sql`select
    (select count(*)::int from inquiry) as inquiries,
    (select count(*)::int from inquiry_line) as inquiry_lines,
    (select count(*)::int from quote) as quotes,
    (select count(*)::int from quote_line) as quote_lines,
    (select count(*)::int from quote_confirmation) as confirmations,
    (select count(*)::int from sales_order) as orders,
    (select count(*)::int from order_version) as versions,
    (select count(*)::int from order_line) as order_lines,
    (select count(*)::int from audit_event) as audits,
    (select count(*)::int from idempotency_record) as idempotency`;
  return rows[0];
}

async function expectSqlState(ctx, expected, work) {
  let error;
  try {
    await ctx.sql.begin(work);
  } catch (caught) {
    error = caught;
  }
  assert.ok(error, "Constraint violation must reject the direct SQL write");
  assert.equal(error.code, expected, `Expected SQLSTATE ${expected}, got ${error.code}`);
  assert.ok(error.constraint_name || error.column_name, "PostgreSQL must identify the violated constraint or column");
}
