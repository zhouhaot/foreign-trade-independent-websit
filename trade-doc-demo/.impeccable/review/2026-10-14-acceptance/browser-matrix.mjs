/* Evaluate in ego-browser nodejs with an existing, authorized space.
 * Set globalThis.TRADE_QA_SPACE and, if needed, TRADE_QA_OUTPUT first.
 * Starts with a reload that deliberately resets only this Demo's in-memory data.
 * No direct application mutation, backend calls, or browser storage clearing.
 */
const fs = await import('node:fs/promises');
const path = await import('node:path');
const spaceId = Number(globalThis.TRADE_QA_SPACE || process.env.TRADE_QA_SPACE);
if (!spaceId) throw new Error('Provide the current authorized TRADE_QA_SPACE');
const task = await taskSpace(spaceId), page = task.page('p1');
const base = process.env.TRADE_QA_BASE || 'http://127.0.0.1:8014/index.html';
const output = globalThis.TRADE_QA_OUTPUT || path.resolve('.impeccable/review/2026-10-14-acceptance');
const report = { date: '2026-10-14', roles: [], routes: [], layouts: [], failures: [], screenshots: [], runtimeErrors: [] };
const save = async () => fs.writeFile(path.join(output, 'browser-matrix.json'), JSON.stringify(report, null, 2));
async function settled() {
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  await page.waitForFunction(() => document.querySelector('main.workspace') &&
    document.getAnimations().every(a => a.playState !== 'running' || a.effect.getTiming().iterations === Infinity));
}
async function login(role) {
  await page.goto(base + '#/dashboard'); await settled();
  if (await page.evaluate(() => !!App.user)) {
    await page.click('[data-action="logout"]'); await page.click('[data-ok]');
  }
  await page.waitForFunction(() => location.hash === '#/login' && !App.user);
  await page.selectOption('#login-role', role); await page.click('[data-action="login-submit"]');
  await page.waitForFunction(role => App.user?.role === role && location.hash === '#/dashboard', role);
  await settled();
}
await page.cdp('Network.setCacheDisabled', { cacheDisabled: true });
try {
  await page.reload();
  await page.waitForFunction(() => !!window.App && document.styleSheets.length === 3 &&
    [...document.styleSheets].every(s => { try { return s.cssRules.length > 0; } catch (_) { return false; } }));
  await page.evaluate(() => {
    window.__matrixErrors = [];
    window.addEventListener('error', e => __matrixErrors.push(e.message));
    window.addEventListener('unhandledrejection', e => __matrixErrors.push(String(e.reason)));
  });
  const all = ['admin', 'sales', 'doc', 'fin', 'boss'], business = all.filter(r => r !== 'admin');
  const ids = await page.evaluate(() => ({
    customer: MOCK.customers[0].id, product: MOCK.products[0].id, inquiry: MOCK.inquiries[0].id,
    quote: MOCK.quotes[0].id, quoteEdit: MOCK.quotes.find(q => q.status === '待客户确认' && q.salesperson === U.roleUser('sales').name).id,
    order: MOCK.orders[0].id, doc: MOCK.documents[0].id
  }));
  const routes = [
    ['#/dashboard', all], ['#/customers', ['sales']], ['#/customers/' + ids.customer, ['sales']],
    ['#/products', ['sales']], ['#/products/' + ids.product, business], ['#/inquiries', ['sales', 'boss']],
    ['#/inquiries/' + ids.inquiry, ['sales', 'boss']], ['#/quotes', ['sales', 'boss']],
    ['#/quotes/' + ids.quote, ['sales', 'boss']], ['#/quotes/' + ids.quoteEdit + '/edit', ['sales']],
    ['#/orders', business], ['#/orders/' + ids.order, business], ['#/documents', ['doc', 'boss']],
    ['#/documents/' + ids.doc, business], ['#/payments', ['fin', 'boss']], ['#/approvals', business],
    ['#/stats', ['boss']], ['#/system/users', ['admin']], ['#/system/roles', ['admin']], ['#/system/dicts', ['admin']]
  ];
  for (const role of all) {
    await login(role); report.roles.push(role);
    for (const [route, allowed] of routes) {
      await page.goto(base + route); await settled();
      const state = await page.evaluate(() => ({
        route: location.hash, role: App.user?.role, forbidden: !!document.querySelector('.forbidden'),
        textLength: document.querySelector('main.workspace')?.innerText.trim().length || 0,
        title: document.title, header: document.querySelector('main h1,main h2,main h3')?.textContent || ''
      }));
      const ok = state.route === route && state.role === role && state.forbidden === !allowed.includes(role) && state.textLength > 0;
      report.routes.push({ role, route, ok, ...state });
      if (!ok) report.failures.push({ kind: 'route', role, route, state });
      for (const width of [1280, 1440]) {
        await page.cdp('Emulation.setDeviceMetricsOverride', { width, height: 1000, deviceScaleFactor: 1, mobile: false });
        const dimensions = await page.evaluate(() => ({ width: innerWidth, height: innerHeight, scroll: document.documentElement.scrollWidth }));
        const layoutOk = dimensions.width === width && dimensions.height === 1000 && dimensions.scroll <= width + 1;
        report.layouts.push({ role, route, width, ...dimensions, ok: layoutOk });
        if (!layoutOk) report.failures.push({ kind: 'layout', role, route, width, dimensions });
      }
    }
    console.log(JSON.stringify({ role, routes: report.routes.length, layouts: report.layouts.length, failures: report.failures.length }));
    await save();
  }
  await login('fin');
  await page.waitForFunction(() => !document.querySelector('.toast'));
  for (const width of [1280, 1440]) {
    await page.cdp('Emulation.setDeviceMetricsOverride', { width, height: 1000, deviceScaleFactor: 1, mobile: false });
    await settled();
    const metric = await page.evaluate(() => [...document.querySelectorAll('.stat-card')].map(n => ({
      label: n.querySelector('.sc-label')?.textContent, value: n.querySelector('.sc-value')?.textContent,
      foot: n.querySelector('.sc-foot')?.textContent,
      labelWidth: n.querySelector('.sc-label')?.clientWidth, labelScroll: n.querySelector('.sc-label')?.scrollWidth
    })).find(x => x.label === '演示月登记收款'));
    if (!metric || metric.foot !== '2026-09 收款笔数' || metric.value !== '1' || metric.labelScroll > metric.labelWidth + 1) {
      report.failures.push({ kind: 'finance-label', width, metric });
    }
    const name = 'finance-dashboard-' + width + '.png';
    const shot = await page.cdp('Page.captureScreenshot', { format: 'png' });
    await fs.writeFile(path.join(output, name), Buffer.from(shot.data, 'base64'));
    report.screenshots.push({ path: name, width, height: 1000, metric });
  }
  report.runtimeErrors = await page.evaluate(() => __matrixErrors);
  report.result = report.failures.length || report.runtimeErrors.length ? 'FAIL' : 'PASS';
  await save();
  console.log(JSON.stringify({ result: report.result, roles: report.roles.length, routes: report.routes.length,
    layouts: report.layouts.length, failures: report.failures, runtimeErrors: report.runtimeErrors }));
  if (report.result !== 'PASS') throw new Error('Browser matrix has failures; inspect the saved evidence');
} finally {
  await page.cdp('Network.setCacheDisabled', { cacheDisabled: false });
}
