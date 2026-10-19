/* Development QA, executed by ego-browser nodejs; ordinary Node import is inert.
 * Required: TRADE_QA_SPACE, TRADE_QA_PAGE=p1, TRADE_QA_DISPOSABLE=1,
 * TRADE_QA_BASE=http://127.0.0.1:PORT/index.html, TRADE_QA_REPORT=/absolute/new.json.
 * Optional TRADE_QA_PHASES=matrix,business,quality (default all).
 * Caller creates/authorizes/disposes the space. This runner never does so.
 */
import * as fs from 'node:fs/promises';
import path from 'node:path';

export class QaFailure extends Error {
  constructor(message, category = 'product') { super(message); this.category = category; }
}
const assert = (ok, message, category) => { if (!ok) throw new QaFailure(message, category); };
const phases = ['matrix', 'business', 'quality'];
const safetyKeys = ['executionStopped', 'pageResponsive', 'mayHaveLateEffects'];
const safetyMetadata = e => Object.fromEntries(safetyKeys.filter(k => e[k] !== undefined).map(k => [k, e[k]]));
// Safety receipts require the controller to assess recovery. Do not infer safety
// from a false field, retry a denied URL or issue further Page actions here.
const controlStopped = e => e.qaBrowserStopped === true || safetyKeys.some(k => e[k] !== undefined) || /user (?:has )?(?:taken|took) control|user-owned|inactive|unassigned|hand.?off|control.*(?:lost|revoked)|executionStopped|safety timeout|URL.*(?:denied|blocked)|policy.*(?:denied|blocked)/i.test(e.message || '');
export function failureCategory(e) {
  return controlStopped(e) ? 'blocked' : e.category || (/space.*(?:not found|does not exist)/i.test(e.message || '') ? 'blocked' : 'tool');
}
export function preflight(input) {
  const id = input.TRADE_QA_SPACE, base = input.TRADE_QA_BASE, output = input.TRADE_QA_REPORT;
  assert(/^[1-9]\d*$/.test(String(id ?? '')) && Number.isSafeInteger(Number(id)), 'TRADE_QA_SPACE must be an explicit positive safe integer', 'method');
  assert(input.TRADE_QA_PAGE === 'p1', 'TRADE_QA_PAGE must explicitly be p1', 'method');
  assert(String(input.TRADE_QA_DISPOSABLE) === '1', 'TRADE_QA_DISPOSABLE=1 is required for this caller-authorized disposable page', 'method');
  let url;
  try { url = new URL(base); } catch { throw new QaFailure('TRADE_QA_BASE is required and must be a loopback HTTP index.html URL', 'method'); }
  // Check literal authority too: URL normalizes integer/hex/short IP aliases.
  assert(typeof base === 'string' && /^http:\/\/(?:127\.0\.0\.1|localhost|\[::1\]):[1-9]\d{0,4}\//.test(base) &&
    url.protocol === 'http:' && ['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname) && !url.username && !url.password && !url.hash && url.pathname.endsWith('/index.html'),
  'TRADE_QA_BASE must name explicit loopback HTTP host, port, index.html; no credentials or hash', 'method');
  assert(typeof output === 'string' && path.isAbsolute(output) && output.endsWith('.json') && !/[\0\r\n]/.test(output), 'TRADE_QA_REPORT must be an absolute new .json path', 'method');
  const selected = input.TRADE_QA_PHASES === undefined ? phases.slice() : String(input.TRADE_QA_PHASES).split(',');
  assert(selected.length && selected.every(p => phases.includes(p)) && new Set(selected).size === selected.length, 'TRADE_QA_PHASES accepts matrix,business,quality, each once', 'method');
  return { spaceId: Number(id), page: 'p1', base: url.href, origin: url.origin, pathname: url.pathname, reportPath: path.resolve(output), phases: selected };
}
// Independent exact-decimal oracle: no product amount helper supplies expectations.
export function decimalHundredths(v) {
  assert(/^\d+(?:\.\d{1,2})?$/.test(String(v)), 'Expected ordinary nonnegative decimal with at most two places: ' + v, 'method');
  const [a, b = ''] = String(v).split('.'); return BigInt(a) * 100n + BigInt((b + '00').slice(0, 2));
}
export function itemCents(items) {
  return items.reduce((sum, it) => { const n = decimalHundredths(it.qty) * decimalHundredths(it.price); assert(n % 100n === 0n, 'Fixture line not exact to cents', 'method'); return sum + n / 100n; }, 0n);
}
const receiptCents = rows => rows.reduce((s, p) => s + decimalHundredths(p.amount), 0n);

export async function runBrowserQa(input, dependencies = {}) {
  // A custom phase implementation is a contract double, never real browser QA.
  const double = !!dependencies.runners;
  const report = { schema: 1, startedAt: new Date().toISOString(), engine: double ? 'contract-double' : 'ego-browser', result: 'RUNNING',
    stages: [], failures: [], cleanup: [], resets: [],
    limits: ['Synthetic static Demo only; no backend, real export or production verification.',
      'HTTP Chromium layout/DOM checks are not file://, cross-engine, screen-reader or full WCAG certification.',
      'Thirty warm navigations are diagnostics, not capacity/leak certification. No global storage/cache clearing or TaskSpace lifecycle operations.'] };
  let config, destination;
  try {
    config = preflight(input); destination = config.reportPath;
    await fs.mkdir(path.dirname(destination), { recursive: true });
    // Reserve a fresh report before any browser API call; refuse existing evidence.
    await fs.writeFile(destination, JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
  } catch (error) {
    report.result = 'BLOCKED'; report.failures.push({ phase: 'preflight', name: 'configuration/report reservation', category: 'method', error: error.code === 'EEXIST' ? 'Report already exists; refusing overwrite' : error.message });
    const requested = input.TRADE_QA_REPORT;
    if (!destination && typeof requested === 'string' && path.isAbsolute(requested) && requested.endsWith('.json') && !/[\0\r\n]/.test(requested)) {
      try {
        await fs.mkdir(path.dirname(requested), { recursive: true });
        report.reportPath = requested; report.finishedAt = new Date().toISOString();
        await fs.writeFile(requested, JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
        return report;
      } catch (writeError) { report.failures.push({ phase: 'preflight', name: 'blocked report reservation', category: 'method', error: writeError.code === 'EEXIST' ? 'Report already exists; refusing overwrite' : writeError.message }); }
    }
    // No authorized writable destination: return an in-memory BLOCKED receipt.
    // CLI prints it; never invent another location or overwrite old evidence.
    report.reportPath = null; report.refusedReportPath = typeof requested === 'string' ? requested : null;
    report.finishedAt = new Date().toISOString();
    return report;
  }
  Object.assign(report, { spaceId: config.spaceId, page: config.page, base: config.base, requestedPhases: config.phases,
    notRequested: phases.filter(name => !config.phases.includes(name)), reportPath: destination,
    stages: config.phases.map(name => ({ name, result: 'NOT_RUN', checks: [] })) });
  const persist = async () => fs.writeFile(destination, JSON.stringify(report, null, 2) + '\n');
  let page, scriptId, lostControl = false, cacheSet = false, mediaSet = false, viewportSet = false, listenerAttempted = false;
  report.diagnostics = Object.fromEntries(['cache', 'media', 'viewport', 'listener'].map(k => [k, { attempted: false, applied: false, restored: false }]));
  const fail = (e, phase, name) => {
    const f = { phase, name, category: e.qaSourceCategory || failureCategory(e), error: String(e.message || e), ...safetyMetadata(e),
      ...(e.bootState ? { bootState: e.bootState } : {}), ...(e.bootStateError ? { bootStateError: e.bootStateError } : {}) }; report.failures.push(f);
    if (controlStopped(e)) lostControl = true; return f;
  };
  const stageResult = stage => {
    const ownFailures = report.failures.filter(f => f.phase === stage.name);
    if (stage.checks.some(x => x.result === 'FAIL') || ownFailures.some(f => f.category !== 'blocked')) return 'FAIL';
    if (stage.checks.some(x => x.result === 'BLOCKED') || ownFailures.length) return 'BLOCKED';
    return double ? 'CONTRACT_PASS' : 'PASS';
  };
  const ctx = {
    config, report, persist, get page() { return page; },
    async media(features) { mediaSet = true; Object.assign(report.diagnostics.media, { attempted: true, applied: false, restored: false }); await page.cdp('Emulation.setEmulatedMedia', { features }); report.diagnostics.media.applied = true; },
    async viewport(width, height) { viewportSet = true; Object.assign(report.diagnostics.viewport, { attempted: true, applied: false, restored: false }); await page.cdp('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: false }); report.diagnostics.viewport.applied = true; },
    async check(stage, name, fn) {
      try {
        const data = await fn(), errors = await page.evaluate(() => window.__tradeQaErrors || []);
        assert(!errors.length, 'Captured page runtime errors: ' + JSON.stringify(errors));
        stage.checks.push({ name, result: double ? 'CONTRACT_PASS' : 'PASS', ...(data || {}) }); await persist(); return data;
      } catch (e) {
        const f = fail(e, stage.name, name);
        if (!lostControl) {
          try { f.pageState = await page.evaluate(() => ({ hash: location.hash, role: window.App?.user?.role,
            fieldErrors: [...document.querySelectorAll('.field-error')].map(e => e.textContent).filter(Boolean),
            toasts: [...document.querySelectorAll('.toast')].map(e => e.textContent), errors: window.__tradeQaErrors || [] })); }
          catch (capture) {
            f.evidenceError = { category: failureCategory(capture), error: capture.message, ...safetyMetadata(capture) };
            if (controlStopped(capture)) { fail(capture, stage.name, name + ' evidence capture'); e.qaBrowserStopped = true; }
          }
        }
        stage.checks.push({ name, result: f.category === 'blocked' ? 'BLOCKED' : 'FAIL', ...f });
        await persist(); e.qaRecorded = true; throw e;
      }
    },
    async ready() {
      try {
        await page.waitForFunction(() => !!window.App && !!window.MOCK && !!window.U && !!document.querySelector('#demo-role-switch,#login-role') && document.styleSheets.length === 3 && [...document.styleSheets].every(s => { try { return s.cssRules.length > 0; } catch { return false; } }));
        const at = new URL(await page.url()); assert(at.origin === config.origin && at.pathname === config.pathname, 'Preview left the explicitly authorized base', 'blocked');
      } catch (e) {
        // Observe a boot timeout once; no retry, reload or rerender here. A safety
        // receipt forbids even this diagnostic Page operation.
        if (!controlStopped(e)) {
          try {
            e.bootState = await page.evaluate(() => {
              const resources = performance.getEntriesByType('resource');
              return { readyState: document.readyState, title: document.title,
                globals: { App: typeof window.App, MOCK: typeof window.MOCK, U: typeof window.U },
                appChildCount: document.getElementById('app')?.childElementCount ?? null,
                roleControlPresent: !!document.querySelector('#demo-role-switch,#login-role'),
                errorListenerPresent: Array.isArray(window.__tradeQaErrors),
                errors: Array.isArray(window.__tradeQaErrors) ? window.__tradeQaErrors.slice() : null,
                styleSheets: [...document.styleSheets].map(sheet => { try { return { cssRules: sheet.cssRules.length }; } catch (error) { return { cssRules: null, error: error.name }; } }),
                scripts: [...document.scripts].filter(script => script.src).map(script => { const timing = resources.find(r => r.name === script.src); return { path: new URL(script.src).pathname, resourceTimingObserved: !!timing, responseEnd: timing?.responseEnd ?? null, duration: timing?.duration ?? null }; }) };
            });
          } catch (capture) {
            e.bootStateError = { category: failureCategory(capture), error: capture.message, ...safetyMetadata(capture) };
            if (controlStopped(capture)) {
              // Keep the original ready timeout's source; the unsafe diagnostic
              // is a separate blocked failure and stops all later Page actions.
              e.qaSourceCategory = failureCategory(e);
              fail(capture, report.stages.find(s => s.result === 'RUNNING')?.name || 'cleanup', 'readiness bootState capture');
              e.qaBrowserStopped = true;
            }
          }
        }
        throw e;
      }
    },
    async fresh(name, role = 'sales') {
      if (mediaSet) { await page.cdp('Emulation.setEmulatedMedia', { features: [] }); mediaSet = false; report.diagnostics.media.restored = true; }
      if (viewportSet) { await page.cdp('Emulation.clearDeviceMetricsOverride'); viewportSet = false; report.diagnostics.viewport.restored = true; }
      // Hash-only navigation preserves previous fixtures. Explicit reload is mandatory.
      await page.goto(config.base + '#/dashboard'); await page.reload(); await this.ready();
      const state = await page.evaluate(() => ({ orders: MOCK.orders.length, documents: MOCK.documents.length,
        disabled: MOCK.users.filter(u => !u.enabled).map(u => u.id), newInquiryUnquoted: MOCK.inquiries.find(i => i.id === 'INQ2026006')?.quoteId === null }));
      assert(state.orders === 7 && state.documents === 11 && state.newInquiryUnquoted && state.disabled.join(',') === 'U007', 'Reload did not restore reviewed source fixture', 'method');
      report.resets.push({ name, method: 'goto + explicit reload', ...state }); await this.role(role);
    },
    async go(hash) { await page.goto(config.base + hash); await page.waitForFunction(h => location.hash === h && !!document.querySelector('.workspace'), hash); },
    async role(role) {
      assert(await page.evaluate(r => MOCK.users.some(u => u.role === r && u.enabled), role), 'No enabled fixture account for role ' + role, 'method');
      if (await page.evaluate(() => !App.user)) { await page.selectOption('#login-role', role); await page.click('[data-action="login-submit"]'); }
      else if (await page.evaluate(() => App.user.role) !== role) await page.selectOption('#demo-role-switch', role);
      await page.waitForFunction(r => App.user?.role === r && !!document.querySelector('#demo-role-switch'), role);
      assert(await page.evaluate(() => MOCK.users.some(u => u.id === App.user.id && u.role === App.user.role && u.enabled)), 'Actor is not an enabled source account');
    },
    async confirm() { await page.click('.modal [data-ok]'); await page.waitForFunction(() => !document.querySelector('.modal')); }
  };
  try {
    const list = dependencies.listSpaces || globalThis.listTaskSpaces, connect = dependencies.connect || globalThis.taskSpace;
    assert(typeof list === 'function' && typeof connect === 'function', 'Run inside ego-browser nodejs with documented TaskSpace APIs', 'method');
    const inventory = await list(), spaces = Array.isArray(inventory) ? inventory : inventory.spaces;
    assert(Array.isArray(spaces), 'Unexpected listTaskSpaces response', 'tool');
    // id/ownership structure independently observed in the real CLI this round.
    const existing = spaces.find(s => Number(s.id) === config.spaceId);
    assert(existing && existing.ownership === 'agent', 'Explicit existing agent-owned TaskSpace unavailable; no create/claim/takeover allowed', 'blocked');
    const task = await connect(config.spaceId);
    assert(Number(task.spaceId) === config.spaceId && task.ownership === 'agent', 'TaskSpace identity/ownership changed', 'blocked');
    page = task.page(config.page);
    cacheSet = true; report.diagnostics.cache.attempted = true;
    await page.cdp('Network.setCacheDisabled', { cacheDisabled: true }); report.diagnostics.cache.applied = true;
    listenerAttempted = true; report.diagnostics.listener.attempted = true;
    const injected = await page.cdp('Page.addScriptToEvaluateOnNewDocument', { source: 'window.__tradeQaErrors=[];window.addEventListener("error",e=>window.__tradeQaErrors.push(e.message));window.addEventListener("unhandledrejection",e=>window.__tradeQaErrors.push(String(e.reason)));' });
    scriptId = injected.identifier; report.diagnostics.listener.applied = true;
    const runners = dependencies.runners || { matrix, business, quality };
    for (const name of config.phases) {
      const stage = report.stages.find(s => s.name === name); Object.assign(stage, { result: 'RUNNING', startedAt: new Date().toISOString() }); await persist();
      try { await runners[name](ctx, stage); stage.result = stageResult(stage); }
      catch (e) { if (!e.qaRecorded) fail(e, name, 'stage setup/execution'); stage.result = stageResult(stage); stage.stopped = lostControl; }
      if (name === 'matrix') stage.coverage = { expectedVisits: 100, observedVisits: stage.routeChecks?.length || 0, expectedLayouts: 300, observedLayouts: stage.layouts?.length || 0 };
      stage.finishedAt = new Date().toISOString(); await persist(); if (lostControl) break;
    }
  } catch (e) { fail(e, 'setup', 'connection/setup'); await persist(); }
  finally {
    const clean = async (name, changed, fn) => {
      if (!changed || lostControl) { report.cleanup.push({ name, result: 'SKIPPED', reason: lostControl ? 'Control/policy/safety receipt stopped Page actions; restoration requires controller assessment' : 'Runner did not attempt this diagnostic' }); return; }
      try { await fn(); report.cleanup.push({ name, result: double ? 'CONTRACT_PASS' : 'PASS' }); }
      catch (e) { report.cleanup.push({ name, result: 'FAIL', category: failureCategory(e), error: e.message }); fail(e, 'cleanup', name); }
      await persist();
    };
    await clean('reset media override', mediaSet, async () => { await page.cdp('Emulation.setEmulatedMedia', { features: [] }); report.diagnostics.media.restored = true; });
    await clean('clear viewport override', viewportSet, async () => { await page.cdp('Emulation.clearDeviceMetricsOverride'); report.diagnostics.viewport.restored = true; });
    await clean('restore target cache enabled', cacheSet, async () => { await page.cdp('Network.setCacheDisabled', { cacheDisabled: false }); report.diagnostics.cache.restored = true; });
    await clean('remove runtime listener registration', listenerAttempted, async () => { assert(!!scriptId, 'Listener registration was attempted but no identifier was received; cannot prove removal', 'tool'); await page.cdp('Page.removeScriptToEvaluateOnNewDocument', { identifier: scriptId }); report.diagnostics.listener.restored = true; });
    await clean('reload to discard synthetic page memory and listeners', !!page, async () => {
      await page.goto(config.base + '#/dashboard'); await page.reload(); await ctx.ready();
      const state = await page.evaluate(() => ({ orders: MOCK.orders.length, documents: MOCK.documents.length,
        newInquiryUnquoted: MOCK.inquiries.find(i => i.id === 'INQ2026006')?.quoteId === null, docEnabled: MOCK.users.find(u => u.id === 'U004')?.enabled }));
      assert(state.orders === 7 && state.documents === 11 && state.newInquiryUnquoted && state.docEnabled, 'Final synthetic state did not reset', 'method');
    });
    report.finishedAt = new Date().toISOString();
    report.result = report.failures.length ? (report.failures.every(f => f.category === 'blocked') ? 'BLOCKED' : 'FAIL') : double ? 'CONTRACT_PASS' : 'PASS'; await persist();
  }
  return report;
}

async function matrix(c, s) {
  const p = c.page, all = ['admin', 'sales', 'doc', 'fin', 'boss'], biz = ['sales', 'doc', 'fin', 'boss'];
  const routes = [['#/dashboard', all], ['#/customers', ['sales']], ['#/customers/C001', ['sales']], ['#/products', ['sales']], ['#/products/P001', biz],
    ['#/inquiries', ['sales', 'boss']], ['#/inquiries/INQ2026006', ['sales', 'boss']], ['#/quotes', ['sales', 'boss']], ['#/quotes/Q2026004', ['sales', 'boss']], ['#/quotes/Q2026004/edit', ['sales']],
    ['#/orders', biz], ['#/orders/SO2026001', biz], ['#/documents', ['doc', 'boss']], ['#/documents/D-PL2026004-V1', biz], ['#/payments', ['fin', 'boss']], ['#/approvals', biz],
    ['#/stats', ['boss']], ['#/system/users', ['admin']], ['#/system/roles', ['admin']], ['#/system/dicts', ['admin']]];
  s.routeChecks = []; s.layouts = []; s.semantics = [];
  for (const role of all) {
    await c.fresh('matrix:' + role, role);
    for (const [route, allowed] of routes) {
      try {
        await c.check(s, role + ' ' + route, async () => {
          await c.go(route);
          const state = await p.evaluate(() => ({ forbidden: !!document.querySelector('.forbidden'), textLength: document.querySelector('.workspace')?.innerText.length || 0, role: App.user?.role }));
          s.routeChecks.push({ role, route, expectedForbidden: !allowed.includes(role), ...state });
          assert(state.forbidden === !allowed.includes(role) && state.textLength > 0 && state.role === role, 'Role route contract mismatch');
          for (const [width, height] of [[1280, 800], [1366, 768], [1440, 900]]) {
            await c.viewport(width, height);
            const d = await p.evaluate(() => ({ width: innerWidth, scrollWidth: document.documentElement.scrollWidth, workspaceWidth: document.querySelector('.workspace')?.getBoundingClientRect().width }));
            s.layouts.push({ role, route, requestedWidth: width, height, ...d });
            assert(d.width === width && d.scrollWidth <= width + 1 && d.workspaceWidth > 0, 'Desktop overflow/viewport mismatch at ' + width);
          }
          if (allowed.includes(role)) {
            const fields = await p.evaluate(() => [...document.querySelectorAll('.workspace input:not([type=hidden]),.workspace textarea,.workspace select')].filter(e => !e.disabled && !e.labels?.length && !e.getAttribute('aria-label') && !e.getAttribute('aria-labelledby') && !e.title).map(e => ({ id: e.id, tag: e.tagName, type: e.type })));
            if (fields.length) s.semantics.push({ role, route, unlabelled: fields });
          }
          return { layoutsObserved: 3 };
        });
      } catch (e) { if (controlStopped(e)) throw e; }
    }
  }
  if (!s.checks.some(x => ['FAIL', 'BLOCKED'].includes(x.result))) assert(s.routeChecks.length === 100 && s.layouts.length === 300, 'Matrix incomplete: expected 100 visits / 300 desktop observations', 'method');
}

async function business(c, s) {
  const p = c.page; await c.fresh('business:continuous-545-order', 'sales');
  // No reload inside this same-order chain. Role switches retain submitted memory.
  let qid, order, ci, pl, total;
  await c.check(s, 'Fresh inquiry → quote → confirm → order; current dates and independent 545 USD', async () => {
    const items = await p.evaluate(() => MOCK.inquiries.find(i => i.id === 'INQ2026006').items.map(it => ({ ...it, price: MOCK.products.find(p => p.id === it.productId).refPrice })));
    total = itemCents(items); assert(total === 54500n, 'Reviewed independent inquiry must total 54500 cents', 'method');
    await c.go('#/inquiries/INQ2026006'); await p.click('[data-action="inq-start-quote"]'); await c.confirm(); await p.waitForSelector('#qe-form');
    qid = await p.evaluate(() => MOCK.inquiries.find(i => i.id === 'INQ2026006').quoteId);
    const dates = await p.evaluate(id => { const q = MOCK.quotes.find(q => q.id === id); return { date: q.date, validUntil: q.validUntil, form: document.getElementById('qe-valid').value }; }, qid);
    assert(/^\d{4}-\d{2}-\d{2}$/.test(dates.date) && dates.validUntil >= dates.date && dates.form === dates.validUntil, 'Current quote validity/editor mismatch');
    await p.click('#qe-form button[type="submit"]'); await p.waitForFunction(id => location.hash === '#/quotes/' + id, qid);
    await p.click('[data-action="quote-confirm"]'); await p.fill('#qc-remark', '合成验收：客户确认'); await c.confirm();
    const n = await p.evaluate(() => MOCK.orders.length);
    await p.click('[data-action="quote-gen-order"]'); const deliveryDate = await p.evaluate(() => document.getElementById('qg-delivery').value);
    assert(/^\d{4}-\d{2}-\d{2}$/.test(deliveryDate), 'Delivery date missing', 'method');
    await p.click('.modal-foot [data-close]'); assert(await p.evaluate(() => MOCK.orders.length) === n, 'Cancel created order');
    await p.click('[data-action="quote-gen-order"]'); await c.confirm(); await p.waitForFunction(id => MOCK.orders.some(o => o.quoteId === id), qid);
    order = await p.evaluate(id => MOCK.orders.find(o => o.quoteId === id), qid);
    const quote = await p.evaluate(id => MOCK.quotes.find(q => q.id === id), qid);
    assert(order && itemCents(order.items) === total && itemCents(quote.items) === total && order.currency === 'USD', 'Independent quotation/order reconciliation failed');
    assert(quote.orderId === order.id && order.deliveryDate === deliveryDate && !order.shippingOrigin, 'Order linkage/delivery/absent origin changed');
    return { qid, orderId: order.id, totalCents: String(total), dates, deliveryDate, shippingOriginAbsent: true };
  });
  await c.check(s, 'Overpayment refusal makes zero business-memory writes', async () => {
    await c.role('fin'); await c.go('#/payments?order=' + order.id); const before = await p.evaluate(() => JSON.stringify(MOCK));
    await p.fill('#p-amount', '546'); await p.click('#pay-form button[type="submit"]');
    assert(await p.evaluate(() => JSON.stringify(MOCK)) === before, 'Overpayment mutated Mock');
    assert(await p.evaluate(() => document.getElementById('p-amount').getAttribute('aria-invalid') === 'true'), 'Overpayment lacks specific amount error');
  });
  await c.check(s, 'Receive 100 USD before documents', async () => {
    const n = await p.evaluate(() => MOCK.payments.length); await p.fill('#p-amount', '100'); await p.click('#pay-form button[type="submit"]'); await p.waitForFunction(n => MOCK.payments.length === n + 1, n);
    const x = await p.evaluate(id => ({ rows: MOCK.payments.filter(p => p.orderId === id), docs: MOCK.documents.filter(d => d.orderId === id).length }), order.id);
    assert(x.rows.every(p => p.currency === 'USD') && receiptCents(x.rows) === 10000n && x.docs === 0, 'Partial receipt/document independence failed');
    return { receivedCents: '10000', remainingCents: String(total - 10000n) };
  });
  await c.check(s, 'First CI/PL; incomplete PL zero-write refusal; packaging and unique IDs', async () => {
    await c.role('doc'); await c.go('#/orders/' + order.id); await p.click('[data-action="doc-create"]'); await p.waitForSelector('#df-marks');
    const docs = await p.evaluate(id => MOCK.documents.filter(d => d.orderId === id).map(d => ({ id: d.id, type: d.type, version: d.version })), order.id); ci = docs.find(d => d.type === 'CI'); pl = docs.find(d => d.type === 'PL');
    assert(docs.length === 2 && ci && pl && docs.every(d => d.version === 1), 'First CI/PL V1 missing/duplicated');
    await p.click('[data-action="doc-submit"]'); await c.confirm(); await p.waitForFunction(id => MOCK.documents.find(d => d.id === id)?.status === '待审核', ci.id);
    await c.go('#/documents/' + pl.id); await p.click('[data-action="doc-edit"]'); await p.waitForSelector('#df-pk-cartons'); const before = await p.evaluate(() => JSON.stringify(MOCK));
    await p.click('[data-action="doc-submit"]'); assert(await p.evaluate(() => JSON.stringify(MOCK)) === before && await p.evaluate(() => !document.querySelector('.modal')), 'Incomplete packaging did not refuse with zero writes');
    for (const [k, v] of Object.entries({ cartons: '10', package: '纸箱', gw: '120', nw: '100', meas: '2.5' })) await p.fill('#df-pk-' + k, v);
    await p.click('[data-action="doc-submit"]'); await c.confirm(); await p.waitForFunction(id => MOCK.documents.find(d => d.id === id)?.status === '待审核', pl.id);
    const ids = await p.evaluate(() => Object.fromEntries(['inquiries', 'quotes', 'orders', 'documents', 'payments', 'approvals'].map(k => [k, MOCK[k].map(x => x.id)])));
    assert(Object.values(ids).every(ids => ids.length === new Set(ids).size), 'Duplicate business IDs'); return { ci: ci.id, pl: pl.id, uniqueCollectionCounts: Object.fromEntries(Object.entries(ids).map(([k, v]) => [k, v.length])) };
  });
  await c.check(s, 'Both approved while 445 USD unpaid; three independent progress tracks', async () => {
    await c.role('boss');
    for (const d of [ci, pl]) { await c.go('#/documents/' + d.id); await p.click('[data-action="doc-approve"]'); await c.confirm(); await p.waitForFunction(id => MOCK.documents.find(d => d.id === id)?.status === '已通过', d.id); }
    const x = await p.evaluate(id => ({ order: MOCK.orders.find(o => o.id === id), rows: MOCK.payments.filter(p => p.orderId === id), docs: MOCK.documents.filter(d => d.orderId === id) }), order.id), received = receiptCents(x.rows), remaining = total - received;
    assert(x.order.status === '待执行' && x.order.docStatus === '已通过' && x.docs.every(d => d.status === '已通过') && received === 10000n && remaining === 44500n, 'Parallel states/independent balance mismatch');
    await c.go('#/orders/' + order.id); assert(await p.evaluate(() => document.querySelectorAll('.pt-block').length) === 3, 'Missing three progress tracks');
    return { order: x.order.status, docs: x.order.docStatus, receivedCents: String(received), remainingCents: String(remaining) };
  });
  await c.check(s, 'Final 445 USD receipt settles independent 545 USD', async () => {
    await c.role('fin'); await c.go('#/payments?order=' + order.id); const n = await p.evaluate(() => MOCK.payments.length);
    await p.fill('#p-amount', '445'); await p.click('#pay-form button[type="submit"]'); await p.waitForFunction(n => MOCK.payments.length === n + 1, n);
    const rows = await p.evaluate(id => MOCK.payments.filter(p => p.orderId === id), order.id); assert(rows.every(p => p.currency === 'USD') && receiptCents(rows) === total, 'Independent final receipt sum mismatch'); return { receivedCents: String(receiptCents(rows)), remainingCents: '0' };
  });
  await c.check(s, 'Approved CI export is demonstration only', async () => {
    await c.role('doc'); await c.go('#/documents/' + ci.id); await p.click('[data-action="doc-export"]'); await p.waitForFunction(id => MOCK.documents.find(d => d.id === id).history.some(h => h.action === '导出 PDF（演示）'), ci.id); return { realFileExport: false };
  });
  await c.check(s, 'Controlled V2 retains exact V1', async () => {
    const original = await p.evaluate(id => JSON.stringify(MOCK.documents.find(d => d.id === id)), ci.id); await p.click('[data-action="doc-revise"]'); await c.confirm();
    await p.waitForFunction(id => MOCK.documents.some(d => d.orderId === id && d.type === 'CI' && d.version === 2), order.id);
    assert(await p.evaluate(id => JSON.stringify(MOCK.documents.find(d => d.id === id)), ci.id) === original, 'V1 overwritten'); return { v1: ci.id, v1Preserved: true };
  });
}

async function quality(c, s) {
  const p = c.page;
  const isolated = async (name, role, fn) => {
    try { await c.check(s, name, async () => { await c.fresh('quality:' + name, role); return fn(); }); } catch (e) { if (controlStopped(e)) throw e; }
  };
  await isolated('1360/1361 desktop directory boundaries', 'boss', async () => {
    await c.go('#/documents/D-CI2026002-V1'); const points = [];
    for (const width of [1360, 1361]) { await c.viewport(width, 900); points.push(await p.evaluate(() => ({ width: innerWidth, bodyWidth: document.documentElement.scrollWidth, directoryButtonVisible: [...document.querySelectorAll('[data-action="doc-directory"]')].some(e => e.getBoundingClientRect().width > 0), paperWidth: document.querySelector('.paper')?.getBoundingClientRect().width }))); }
    assert(points.every(p => p.bodyWidth <= p.width + 1 && p.paperWidth > 0) && points[0].directoryButtonVisible && !points[1].directoryButtonVisible, 'Desktop directory boundary mismatch'); return { observations: points };
  });
  await isolated('Map native country filter and keyboard', 'boss', async () => {
    await c.go('#/dashboard'); await p.click('.order-map-countries [data-country="US"]'); assert(await p.evaluate(() => document.querySelectorAll('[data-order-map-route]:not(.is-dimmed)').length) === 2, 'US map routes mismatch'); await p.focus('.order-map-countries [data-country="US"]'); await p.press('.order-map-countries [data-country="US"]', 'Enter');
  });
  await isolated('Runtime reduced motion and normal authored motion', 'boss', async () => {
    await c.go('#/dashboard'); await c.media([{ name: 'prefers-reduced-motion', value: 'reduce' }]); await p.click('[data-action="order-map-replay"]');
    assert(await p.evaluate(() => getComputedStyle(document.querySelector('.order-map-flow')).animationName) === 'none', 'Reduced motion animates map');
    await c.go('#/orders'); assert(await p.evaluate(() => document.getAnimations().filter(a => a.playState === 'running').length) === 0, 'Reduced motion still runs animations');
    await c.media([{ name: 'prefers-reduced-motion', value: 'no-preference' }]);
    // Observe normal route animation in the same evaluation turn; diagnostic only.
    assert(await p.evaluate(() => { App.requestNavigation('#/dashboard'); return document.getAnimations().length; }) > 0, 'Normal authored motion missing'); await c.media([]);
  });
  await isolated('Search role filter, IME, permitted selected result and focus return', 'admin', async () => {
    await p.click('[data-action="search-open"]'); assert(await p.evaluate(() => document.activeElement.id === 'workspace-search'), 'Search input not focused');
    await p.fill('#workspace-search', 'SO2026'); assert(await p.evaluate(() => !document.querySelector('.search-result')), 'Admin search exposes business records'); await p.fill('#workspace-search', '角色');
    assert(await p.evaluate(() => { document.getElementById('workspace-search').dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', isComposing: true, bubbles: true })); return !!document.getElementById('workspace-search'); }), 'IME composition Enter navigated');
    await p.press('#workspace-search', 'Enter'); await p.waitForFunction(() => location.hash === '#/system/roles');
    await c.role('sales'); await p.click('[data-action="search-open"]'); await p.fill('#workspace-search', 'SO2026001'); await p.press('#workspace-search', 'ArrowDown'); const selected = await p.evaluate(() => document.querySelector('.search-result.selected')?.dataset.link);
    assert(!!selected && await p.evaluate(h => App.canVisit(h, App.user.role), selected), 'No permitted selected search result'); await p.press('#workspace-search', 'Enter'); await p.waitForFunction(h => location.hash === h, selected);
    await p.click('[data-action="search-open"]'); await p.press('#workspace-search', 'Escape'); assert(await p.evaluate(() => document.activeElement.dataset.action === 'search-open' && !document.getElementById('app').inert), 'Search did not restore focus/inert'); return { selected };
  });
  await isolated('Order filters/density/sidebar preserve input; six tabs retain three progress tracks', 'sales', async () => {
    await c.go('#/orders'); await p.fill('#o-no', 'SO2026001'); await p.click('[data-action="orders-more"]'); await p.click('[data-action="orders-view"][data-view="table"]'); await p.click('[data-action="orders-density"]'); await p.click('[data-action="sidebar-toggle"]');
    assert(await p.evaluate(() => document.getElementById('o-no').value === 'SO2026001'), 'Filter text lost'); await p.click('[data-action="orders-filter"]'); assert(await p.evaluate(() => document.querySelectorAll('.order-table tbody tr').length) === 1, 'Filter result mismatch'); await p.click('.filter-actions [data-action="orders-reset"]');
    await c.go('#/orders/SO2026001'); assert(await p.evaluate(() => document.querySelectorAll('.pt-block').length) === 3, 'Missing three progress tracks');
    for (const tab of ['overview', 'items', 'docs', 'pay', 'changes', 'logs']) { await p.click('[data-action="order-tab"][data-tab="' + tab + '"]'); await p.waitForFunction(t => document.querySelector('[data-tab="' + t + '"]')?.getAttribute('aria-pressed') === 'true', tab); assert(await p.evaluate(() => document.getElementById('order-tab-body').innerText.length) > 30, 'Empty tab ' + tab); }
  });
  await isolated('Document focus retains input; protected role switch removes edit controls', 'doc', async () => {
    await c.go('#/documents/D-CI2026004-V1'); await p.click('[data-action="doc-edit"]'); await p.fill('#df-marks', 'QA preview text'); await p.click('[data-action="doc-focus"]'); assert(await p.evaluate(() => document.getElementById('df-marks').value === 'QA preview text'), 'Focus mode lost input');
    await p.selectOption('#demo-role-switch', 'boss'); await p.waitForSelector('.modal [data-ok]'); await c.confirm(); await p.waitForFunction(() => App.user?.role === 'boss'); await c.go('#/documents/D-CI2026004-V1'); assert(await p.evaluate(() => !document.getElementById('df-marks') && !AppUI.docEditing), 'Role switch leaked edit controls');
  });
  await isolated('Approved revision cancel then V2 preserves V1', 'doc', async () => {
    await c.go('#/documents/D-CI2026002-V1'); const before = await p.evaluate(() => ({ count: MOCK.documents.length, original: JSON.stringify(MOCK.documents.find(d => d.id === 'D-CI2026002-V1')) }));
    await p.click('[data-action="doc-revise"]'); await p.click('.modal-foot [data-close]'); assert(await p.evaluate(() => MOCK.documents.length) === before.count, 'Cancel revised document'); await p.click('[data-action="doc-revise"]'); await c.confirm(); await p.waitForFunction(n => MOCK.documents.length === n + 1, before.count);
    assert(await p.evaluate(v => JSON.stringify(MOCK.documents.find(d => d.id === 'D-CI2026002-V1')) === v && MOCK.documents.some(d => d.id === 'D-CI2026002-V2'), before.original), 'Original V1 mutated');
  });
  await isolated('Payment validation and independent existing-order receipt sum', 'fin', async () => {
    await c.go('#/payments?order=SO2026001'); const before = await p.evaluate(() => MOCK.payments.filter(p => p.orderId === 'SO2026001'));
    await p.fill('#p-amount', '999999'); await p.click('#pay-form button[type="submit"]'); assert(await p.evaluate(() => document.getElementById('p-amount').getAttribute('aria-invalid') === 'true'), 'Invalid payment lacks field error');
    await p.fill('#p-amount', '100'); await p.click('#pay-form button[type="submit"]'); await p.waitForFunction(n => MOCK.payments.filter(p => p.orderId === 'SO2026001').length === n + 1, before.length); const after = await p.evaluate(() => MOCK.payments.filter(p => p.orderId === 'SO2026001')); assert(receiptCents(after) - receiptCents(before) === 10000n, 'Independent payment sum mismatch');
  });
  await isolated('Toast pointer transparency, live-region semantics and native submit', 'sales', async () => {
    await c.role('fin'); const toast = await p.evaluate(() => ({ wrap: getComputedStyle(document.querySelector('.toast-wrap')).pointerEvents, items: [...document.querySelectorAll('.toast')].map(t => ({ pointer: getComputedStyle(t).pointerEvents, role: t.getAttribute('role') })) }));
    assert(toast.wrap === 'none' && toast.items.length > 0 && toast.items.every(t => t.pointer === 'none' && ['status', 'alert'].includes(t.role)), 'Toast pointer/ARIA regression');
    await c.go('#/payments?order=SO2026001'); await p.fill('#p-amount', '999999'); await p.click('#pay-form button[type="submit"]'); assert(await p.evaluate(() => document.getElementById('p-amount').getAttribute('aria-invalid') === 'true'), 'Toast intercepts submit'); return toast;
  });
  await isolated('Disabled last document account leaves login usable; enabled admin relogs without reload', 'admin', async () => {
    await c.go('#/system/users'); await p.focus('#sys-enabled-U004'); await p.press('#sys-enabled-U004', 'Space'); assert(await p.evaluate(() => MOCK.users.find(u => u.id === 'U004').enabled === false), 'Native toggle did not disable account');
    await p.click('[data-action="logout"]'); await c.confirm(); await p.waitForSelector('#login-role'); assert(await p.evaluate(() => !App.user && document.querySelector('#login-role option[value="doc"]').disabled && !document.getElementById('sys-enabled-U004')), 'Disabled-role login or stale admin DOM regression');
    await c.role('admin'); assert(await p.evaluate(() => !MOCK.users.find(u => u.id === 'U004').enabled), 'Relog unexpectedly reloaded fixture');
  });
  await isolated('Thirty warm navigation diagnostics and same-origin runtime resources', 'boss', async () => {
    const diagnostic = await p.evaluate(() => { const samples = [], heapBefore = performance.memory?.usedJSHeapSize; for (let i = 0; i < 30; i++) { const route = ['#/dashboard', '#/orders', '#/stats'][i % 3], start = performance.now(); App.requestNavigation(route); samples.push({ route, ms: performance.now() - start }); } return { userAgent: navigator.userAgent, orders: MOCK.orders.length, documents: MOCK.documents.length, samples, heapBefore, heapAfter: performance.memory?.usedJSHeapSize, resources: performance.getEntriesByType('resource').map(r => ({ url: r.name, duration: r.duration, bytes: r.encodedBodySize })) }; });
    assert(diagnostic.resources.every(r => new URL(r.url).origin === c.config.origin), 'Unexpected external runtime resource'); return { diagnostic };
  });
}

if (typeof globalThis.taskSpace === 'function' && !globalThis.TRADE_QA_NO_AUTORUN) {
  const input = Object.fromEntries(['TRADE_QA_SPACE', 'TRADE_QA_PAGE', 'TRADE_QA_DISPOSABLE', 'TRADE_QA_BASE', 'TRADE_QA_REPORT', 'TRADE_QA_PHASES'].map(k => [k, globalThis[k] ?? process.env[k]]));
  const report = await runBrowserQa(input);
  console.log(JSON.stringify({ result: report.result, reportPath: report.reportPath, refusedReportPath: report.refusedReportPath,
    notRequested: report.notRequested, stages: report.stages.map(s => ({ name: s.name, result: s.result, checks: s.checks.length })), failures: report.failures }));
  if (report.result !== 'PASS') throw new Error('Browser QA ' + report.result + '; evidence: ' + report.reportPath);
}
