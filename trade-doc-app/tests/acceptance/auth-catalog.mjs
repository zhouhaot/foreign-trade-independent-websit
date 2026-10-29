import process from "node:process";

import {
  assert,
  browserLogin,
  closeSessions,
  customerInput,
  key,
  productInput,
  publicResponse,
  seedFixture,
  sessions,
} from "./helpers.mjs";

export const authCatalogCases = {
  "AUTH-01": async (ctx) => {
    const logMark = ctx.appLogLength();
    const anonymous = await ctx.http.context();
    try {
      const result = await ctx.http.get(anonymous, "/api/v1/auth/csrf");
      const token = result.body.token;
      assert.ok(typeof token === "string" && token.length >= 32);
      assert.equal(result.response.headers()["cache-control"], "no-store");
      assert.ok(!result.response.url().includes(token));
      assert.deepEqual(Object.keys(result.body), ["token"]);
      const sessionsRows = await ctx.sql`select session_key_hash as "sessionHash", csrf_token_hash as "csrfHash" from user_session order by created_at desc limit 1`;
      assert.ok(sessionsRows[0].sessionHash !== token && sessionsRows[0].csrfHash !== token);
      const logged = await ctx.http.login((await seedFixture(ctx, "auth01")).accounts.salesA);
      try {
        const authenticated = await ctx.http.get(logged.context, "/api/v1/auth/csrf");
        assert.equal(authenticated.response.headers()["cache-control"], "no-store");
        assert.notEqual(authenticated.body.token, token);
        const logs = ctx.appLogsSince(logMark);
        assert.ok(!logs.includes(token) && !logs.includes(authenticated.body.token));
        return { anonymous: publicResponse(result), authenticated: publicResponse(authenticated), databaseHashesDifferFromTokens: true, urlContainsToken: false, tokensAbsentFromAppLogs: true };
      } finally {
        await logged.context.dispose();
      }
    } finally {
      await anonymous.dispose();
    }
  },

  "AUTH-02": async (ctx) => {
    const fixture = await seedFixture(ctx, "auth02");
    const logged = await ctx.http.login(fixture.accounts.salesA);
    try {
      const me = await ctx.http.get(logged.context, "/api/v1/auth/me");
      assert.equal(me.body.user.id, logged.user.id);
      assert.equal(me.body.user.username, fixture.accounts.salesA.username);
      const cookie = logged.loginResponse.headers()["set-cookie"];
      for (const attribute of ["Path=/api/v1", "HttpOnly", "Secure", "SameSite=Lax"]) assert.ok(cookie.includes(attribute), `Missing cookie attribute ${attribute}`);
      assert.ok(!/(?:^|;)\s*Domain=/i.test(cookie));
      const oldCsrfHash = await ctx.sql`select csrf_token_hash as "hash" from user_session where id = ${await sessionId(ctx, logged.user.id)}`;
      const newCsrf = await ctx.http.csrf(logged.context);
      const newCsrfHash = await ctx.sql`select csrf_token_hash as "hash" from user_session where id = ${await sessionId(ctx, logged.user.id)}`;
      assert.notEqual(oldCsrfHash[0].hash, logged.anonymousCsrfHash);
      assert.notEqual(oldCsrfHash[0].hash, newCsrfHash[0].hash);
      assert.notEqual(newCsrfHash[0].hash, newCsrf);
      return { login: publicResponse({ ...logged.loginResponse, status: logged.loginResponse.status(), body: logged.user, response: logged.loginResponse }), me: publicResponse(me), cookieAttributes: ["HttpOnly", "Secure", "SameSite=Lax", "Path=/api/v1"], sessionAndCsrfRotated: true };
    } finally {
      await logged.context.dispose();
    }
  },

  "AUTH-03": async (ctx) => {
    const fixture = await seedFixture(ctx, "auth03");
    const logged = await ctx.http.login(fixture.accounts.salesA);
    const rawCookie = logged.loginResponse.headers()["set-cookie"].split(";", 1)[0];
    const id = await sessionId(ctx, logged.user.id);
    const csrf = await ctx.http.csrf(logged.context);
    const logout = await ctx.http.write(logged.context, "POST", "/api/v1/auth/logout", undefined, [204], { csrf });
    const reused = await ctx.http.context();
    try {
      await reused.dispose();
      const raw = await ctx.http.context();
      try {
        const me = await raw.get("/api/v1/auth/me", { headers: { Cookie: rawCookie } });
        assert.equal(me.status(), 401);
        assert.equal(me.headers()["cache-control"], "no-store");
        const rows = await ctx.sql`select revoked_at as "revokedAt" from user_session where id = ${id}`;
        assert.ok(rows[0].revokedAt instanceof Date);
        return { logoutStatus: logout.status, reusedSessionStatus: me.status(), serverRevoked: true, cacheControl: me.headers()["cache-control"] };
      } finally {
        await raw.dispose();
      }
    } finally {
      await logged.context.dispose();
    }
  },

  "AUTH-04": async (ctx) => {
    const logMark = ctx.appLogLength();
    const fixture = await seedFixture(ctx, "auth04");
    await ctx.sql`update app_user set enabled = false where id = ${fixture.accounts.salesB.id}`;
    const attempts = [];
    for (const candidate of [
      { username: `missing-${fixture.tag}`.slice(0, 100), password: "not-the-password" },
      { username: fixture.accounts.salesA.username, password: "not-the-password" },
      { username: fixture.accounts.salesB.username, password: fixture.accounts.salesB.password },
    ]) {
      const anonymous = await ctx.http.context();
      try {
        const csrf = await ctx.http.csrf(anonymous);
        const result = await ctx.http.send(anonymous, "POST", "/api/v1/auth/login", candidate, { csrf });
        assert.equal(result.status, 401);
        assert.equal(result.body.code, "INVALID_CREDENTIALS");
        assert.ok(!result.text.includes(candidate.password));
        attempts.push(publicResponse(result));
      } finally {
        await anonymous.dispose();
      }
    }
    assert.ok(attempts.every((item) => item.code === attempts[0].code));
    const limited = await ctx.http.context();
    try {
      const loginKey = `rate-${fixture.tag}`.slice(0, 100);
      const limit = Number(process.env.AUTH_LOGIN_RATE_LIMIT ?? 10);
      let last;
      for (let index = 0; index < limit + 1; index += 1) {
        const csrf = await ctx.http.csrf(limited);
        last = await ctx.http.send(limited, "POST", "/api/v1/auth/login", { username: loginKey, password: "wrong" }, { csrf });
      }
      assert.equal(last.status, 429);
      assert.equal(last.body.code, "RATE_LIMITED");
      const logs = ctx.appLogsSince(logMark);
      assert.ok(!logs.includes("not-the-password") && !logs.includes(fixture.accounts.salesB.password));
      return { uniformFailures: attempts, rateLimit: publicResponse(last), attempted: limit + 1, rawPasswordsAbsentFromAppLogs: true };
    } finally {
      await limited.dispose();
    }
  },

  "AUTH-05": async (ctx) => {
    const fixture = await seedFixture(ctx, "auth05");
    const logged = await sessions(ctx, fixture);
    try {
      const login = await ctx.http.send(logged.salesA.context, "POST", "/api/v1/auth/login", { username: fixture.accounts.salesA.username, password: fixture.accounts.salesA.password, role: "admin" }, { csrf: await ctx.http.csrf(logged.salesA.context) });
      assert.equal(login.status, 400);
      const before = await countCustomers(ctx, fixture.accounts.salesA.id);
      for (const field of ["role", "actorUserId", "ownerUserId"]) {
        const result = await ctx.http.write(logged.salesA.context, "POST", "/api/v1/customers", { ...customerInput(fixture.tag, field), [field]: fixture.accounts.admin.id }, [400]);
        assert.equal(result.body.code, "MALFORMED_REQUEST");
      }
      assert.equal(await countCustomers(ctx, fixture.accounts.salesA.id), before);
      return { loginStatus: login.status, rejectedAuthorizationFields: ["role", "actorUserId", "ownerUserId"], customerWrites: 0 };
    } finally {
      await closeSessions(logged);
    }
  },

  "AUTH-06": async (ctx) => {
    const fixture = await seedFixture(ctx, "auth06");
    const logged = await sessions(ctx, fixture);
    const anonymous = await ctx.http.context();
    try {
      const other = await ctx.http.csrf(anonymous);
      const results = [];
      results.push(await ctx.http.send(logged.salesA.context, "POST", "/api/v1/auth/logout", undefined, { csrf: null }));
      results.push(await ctx.http.send(logged.salesA.context, "POST", "/api/v1/auth/logout", undefined, { csrf: other }));
      results.push(await ctx.http.send(logged.salesA.context, "POST", "/api/v1/customers", customerInput(fixture.tag), { csrf: other }));
      results.push(await ctx.http.send(logged.salesA.context, "POST", "/api/v1/customers", customerInput(fixture.tag), { csrf: null }));
      const login = await ctx.http.send(anonymous, "POST", "/api/v1/auth/login", { username: fixture.accounts.salesA.username, password: fixture.accounts.salesA.password }, { csrf: "invalid" });
      results.push(login);
      assert.ok(results.every((result) => result.status === 403));
      assert.equal((await ctx.http.get(logged.salesA.context, "/api/v1/auth/me")).status, 200);
      assert.equal(await countCustomers(ctx, fixture.accounts.salesA.id), 0);
      return { statuses: results.map((result) => result.status), identityChanged: false, customerWrites: 0 };
    } finally {
      await anonymous.dispose();
      await closeSessions(logged);
    }
  },

  "AUTH-07": async (ctx) => {
    const fixture = await seedFixture(ctx, "auth07");
    const logged = await sessions(ctx, fixture);
    try {
      await ctx.sql`update app_user set auth_version = auth_version + 1 where id = ${fixture.accounts.salesA.id}`;
      const me = await ctx.http.get(logged.salesA.context, "/api/v1/auth/me", [401]);
      const write = await ctx.http.write(logged.salesA.context, "POST", "/api/v1/customers", customerInput(fixture.tag), [401]);
      assert.equal(await countCustomers(ctx, fixture.accounts.salesA.id), 0);
      return { me: publicResponse(me), write: publicResponse(write), authVersionChanged: true, customerWrites: 0 };
    } finally {
      await closeSessions(logged);
    }
  },

  "CAT-01": async (ctx) => {
    const fixture = await seedFixture(ctx, "cat01");
    const suffix = key().replaceAll("-", "").slice(0, 6).toUpperCase();
    const codes = [`Q${suffix[0]}0`, `Q${suffix[1]}3`, `Q${suffix[2]}9`];
    try {
      await ctx.sql`insert into currency_catalog (code, display_name, amount_scale, enabled) values (${codes[0]}, 'Synthetic scale zero', 0, true), (${codes[1]}, 'Synthetic scale three', 3, true), (${codes[2]}, 'Synthetic disabled', 2, false)`;
      const logged = await sessions(ctx, fixture, ["salesA", "boss"]);
      try {
        const evidence = {};
        for (const name of ["salesA", "boss"]) {
          const result = await ctx.http.get(logged[name].context, "/api/v1/reference/currencies");
          assert.ok(result.body.items.some((item) => item.code === "USD"));
          assert.ok(result.body.items.every((item) => item.amountScale === 2));
          assert.ok(!result.body.items.some((item) => codes.includes(item.code)));
          evidence[name] = result.body.items.map((item) => item.code);
        }
        const previous = await ctx.sql`select code, enabled from currency_catalog`;
        try {
          await ctx.sql`update currency_catalog set enabled = false`;
          for (const name of ["salesA", "boss"]) {
            const empty = await ctx.http.get(logged[name].context, "/api/v1/reference/currencies");
            assert.deepEqual(empty.body.items, []);
          }
          evidence.emptyEnabledDirectory = { salesA: [], boss: [] };
        } finally {
          for (const currency of previous) await ctx.sql`update currency_catalog set enabled = ${currency.enabled} where code = ${currency.code}`;
        }
        return { storedCatalog: codes, enabledTwoDecimalOnly: true, responses: evidence, noDefaultCurrencyWhenDirectoryEmpty: true };
      } finally {
        await closeSessions(logged);
      }
    } finally {
      await ctx.sql`delete from currency_catalog where code = any(${codes})`;
    }
  },

  "CAT-02": async (ctx) => {
    const fixture = await seedFixture(ctx, "cat02");
    const logged = await sessions(ctx, fixture, ["salesA", "salesB", "boss"]);
    try {
      const input = productInput(fixture.tag);
      const created = await ctx.http.write(logged.salesA.context, "POST", "/api/v1/products", input, [201]);
      const list = await ctx.http.get(logged.salesB.context, `/api/v1/products?q=${encodeURIComponent(input.sku)}`);
      const bossRead = await ctx.http.get(logged.boss.context, `/api/v1/products/${created.body.id}`);
      assert.equal(list.body.total, 1);
      assert.equal(bossRead.body.id, created.body.id);
      const updated = await ctx.http.write(logged.salesB.context, "PUT", `/api/v1/products/${created.body.id}`, { ...input, nameEn: "Updated shared product", expectedVersion: 1, enabled: true }, [200]);
      assert.equal(updated.body.version, 2);
      const audits = await ctx.sql`select count(*)::int as count from audit_event where resource_id = ${created.body.id}`;
      assert.equal(audits[0].count, 2);
      const page = await browserLogin(ctx, fixture.accounts.boss);
      try {
        await page.goto("/customers");
        assert.equal(await page.locator(".user-username").textContent(), fixture.accounts.boss.username);
      } finally {
        await page.close();
      }
      return { productId: created.body.id, sharedRead: true, version: updated.body.version, successfulAudits: audits[0].count, browserAuthenticatedReadonlyRole: "boss" };
    } finally {
      await closeSessions(logged);
    }
  },

  "CAT-03": async (ctx) => {
    const fixture = await seedFixture(ctx, "cat03");
    const logged = await sessions(ctx, fixture);
    try {
      const input = productInput(fixture.tag, "  normalized  ");
      input.sku = `  ${input.sku.toLowerCase()}  `;
      const created = await ctx.http.write(logged.salesA.context, "POST", "/api/v1/products", input, [201]);
      const duplicate = await ctx.http.write(logged.salesA.context, "POST", "/api/v1/products", { ...input, sku: input.sku.trim().toUpperCase() }, [409]);
      assert.equal(duplicate.body.code, "DUPLICATE_SKU");
      const rows = await ctx.sql`select count(*)::int as count from product where sku = ${created.body.sku}`;
      assert.equal(rows[0].count, 1);
      return { normalizedSku: created.body.sku, duplicate: publicResponse(duplicate), databaseRows: rows[0].count };
    } finally {
      await closeSessions(logged);
    }
  },

  "CAT-04": async (ctx) => {
    const fixture = await seedFixture(ctx, "cat04");
    const logged = await sessions(ctx, fixture, ["boss", "admin"]);
    try {
      const input = productInput(fixture.tag);
      const createdBySales = await ctx.http.login(fixture.accounts.salesA);
      let product;
      try {
        product = (await ctx.http.write(createdBySales.context, "POST", "/api/v1/products", input, [201])).body;
      } finally {
        await createdBySales.context.dispose();
      }
      const results = [];
      for (const name of ["boss", "admin"]) {
        results.push(await ctx.http.write(logged[name].context, "POST", "/api/v1/products", productInput(fixture.tag, name), [403]));
        results.push(await ctx.http.write(logged[name].context, "PUT", `/api/v1/products/${product.id}`, { ...input, expectedVersion: 1, enabled: true }, [403]));
      }
      const audits = await ctx.sql`select count(*)::int as count from audit_event where resource_id = ${product.id}`;
      assert.equal(audits[0].count, 1);
      return { statuses: results.map((result) => result.status), unauthorizedAudits: 0 };
    } finally {
      await closeSessions(logged);
    }
  },
};

async function sessionId(ctx, userId) {
  const rows = await ctx.sql`select id from user_session where user_id = ${userId} order by last_seen_at desc limit 1`;
  assert.ok(rows[0]?.id, "Authenticated database session must exist");
  return rows[0].id;
}

async function countCustomers(ctx, ownerId) {
  const rows = await ctx.sql`select count(*)::int as count from customer where owner_user_id = ${ownerId}`;
  return rows[0].count;
}
