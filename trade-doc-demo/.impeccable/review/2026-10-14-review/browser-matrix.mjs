/* Actual UI matrix in the already-authorized TaskSpace 7, p1.
 * Reload deliberately restores only this tab's Demo memory. p2 business receipt is separate.
 * No direct business/global Action mutations, no cookie/storage clearing. */
const fs = await import('node:fs/promises');
const task = await taskSpace(7), page = task.page('p1');
const base = 'http://127.0.0.1:8014/index.html';
const out = '/Users/airuquan/foreign-trade-independent-websit/trade-doc-demo/.impeccable/review/2026-10-14-review/browser-matrix.json';
const report = { routes: [], layouts: [], tabs: [], interactions: [], failures: [], runtimeErrors: [] };
const save = async () => fs.writeFile(out, JSON.stringify(report, null, 2));
async function settled() {
  await page.waitForFunction(() => !!document.querySelector('main.workspace') && document.getAnimations().every(a => a.playState !== 'running' || a.effect.getTiming().iterations === Infinity));
}
async function role(value) {
  if (await page.evaluate(() => location.hash === '#/login')) {
    await page.selectOption('#login-role', value); await page.click('[data-action="login-submit"]');
  } else if (await page.evaluate(() => App.user?.role) !== value) await page.selectOption('#demo-role-switch', value);
  else await page.goto(base + '#/dashboard');
  await page.waitForFunction(value => App.user?.role === value && location.hash === '#/dashboard', value); await settled();
}
async function go(hash) { await page.goto(base + hash); await settled(); }
await page.cdp('Network.setCacheDisabled', { cacheDisabled: true });
try {
  await page.cdp('Page.reload', { ignoreCache: true });
  await page.waitForFunction(() => !!window.App && !!window.Actions?.['demo-role-switch'] && Views.docDetail.toString().includes('actorSignature'));
  await page.evaluate(() => {
    window.__matrixErrors = [];
    window.addEventListener('error', e => __matrixErrors.push(e.message));
    window.addEventListener('unhandledrejection', e => __matrixErrors.push(String(e.reason)));
  });
  const all = ['admin', 'sales', 'doc', 'fin', 'boss'], business = all.filter(r => r !== 'admin');
  const routes = [
    ['#/dashboard', all], ['#/customers', ['sales']], ['#/customers/C001', ['sales']],
    ['#/products', ['sales']], ['#/products/P001', business], ['#/inquiries', ['sales', 'boss']],
    ['#/inquiries/INQ2026001', ['sales', 'boss']], ['#/quotes', ['sales', 'boss']],
    ['#/quotes/Q2026001', ['sales', 'boss']], ['#/quotes/Q2026004/edit', ['sales']],
    ['#/orders', business], ['#/orders/SO2026001', business], ['#/documents', ['doc', 'boss']],
    ['#/documents/D-CI2026001-V1', business], ['#/payments', ['fin', 'boss']], ['#/approvals', business],
    ['#/stats', ['boss']], ['#/system/users', ['admin']], ['#/system/roles', ['admin']], ['#/system/dicts', ['admin']]
  ];
  for (const current of all) {
    await role(current);
    for (const [route, allowed] of routes) {
      await go(route);
      const state = await page.evaluate(() => ({ hash: location.hash, role: App.user.role, forbidden: !!document.querySelector('.forbidden'), text: document.querySelector('main.workspace').innerText.length }));
      const ok = state.hash === route && state.role === current && state.forbidden === !allowed.includes(current) && state.text > 0;
      report.routes.push({ role: current, route, ok, ...state }); if (!ok) report.failures.push({ kind: 'route', current, route, state });
      for (const size of [{ width: 1440, height: 900 }, { width: 1366, height: 768 }]) {
        await page.cdp('Emulation.setDeviceMetricsOverride', { ...size, deviceScaleFactor: 1, mobile: false });
        const layout = await page.evaluate(() => ({ width: innerWidth, height: innerHeight, scroll: document.documentElement.scrollWidth,
          firstTodoBottom: document.querySelector('.work-queue .todo-item .btn')?.getBoundingClientRect().bottom,
          fields: [...document.querySelectorAll('.orders-filter .filter-primary input,.orders-filter .filter-primary select')].map(n => n.getBoundingClientRect().width) }));
        const layoutOk = layout.width === size.width && layout.height === size.height && layout.scroll <= size.width + 1 &&
          (!layout.firstTodoBottom || layout.firstTodoBottom <= size.height) && layout.fields.every(w => w >= 180);
        report.layouts.push({ role: current, route, expected: size, ...layout, ok: layoutOk });
        if (!layoutOk) report.failures.push({ kind: 'layout', current, route, size, layout });
      }
    }
    await save(); console.log(JSON.stringify({ role: current, routes: report.routes.length, layouts: report.layouts.length, failures: report.failures.length }));
  }
  for (const current of business) {
    await role(current); await go('#/orders/SO2026001');
    await page.cdp('Emulation.setDeviceMetricsOverride', { width: 1366, height: 768, deviceScaleFactor: 1, mobile: false });
    await page.cdp('Input.dispatchMouseEvent', { type: 'mouseWheel', x: 1100, y: 600, deltaY: 160, deltaX: 0 });
    await page.waitForFunction(() => scrollY > 0);
    await page.evaluate(() => { window.__tabProbe = { head: document.querySelector('.order-head-card'), tabs: document.querySelector('.tabs'), body: document.getElementById('order-tab-body'), y: scrollY }; });
    for (const key of ['items', 'docs', 'pay', 'changes', 'logs', 'overview']) {
      await page.click('[data-action="order-tab"][data-tab="' + key + '"]'); await page.waitForFunction(key => location.hash.endsWith('?tab=' + key), key);
      const result = await page.evaluate(() => ({ y: scrollY, expectedY: __tabProbe.y, sameHead: document.querySelector('.order-head-card') === __tabProbe.head,
        sameTabs: document.querySelector('.tabs') === __tabProbe.tabs, sameBody: document.getElementById('order-tab-body') === __tabProbe.body,
        selected: document.querySelector('.tabs .active')?.dataset.tab }));
      const ok = Math.abs(result.y - result.expectedY) < 1 && result.sameHead && result.sameTabs && result.sameBody && result.selected === key;
      report.tabs.push({ role: current, key, ok, ...result }); if (!ok) report.failures.push({ kind: 'tabs', current, key, result });
    }
  }
  await role('doc'); await go('#/documents/D-CI2026004-V1'); await page.click('[data-action="doc-edit"]');
  await page.fill('#df-marks', '未保存的演示切换验收');
  await page.evaluate(() => { window.__guardMarks = document.getElementById('df-marks'); });
  await page.selectOption('#demo-role-switch', 'fin'); await page.waitForSelector('.modal [data-ok]'); await page.click('.modal-foot [data-close]');
  await page.waitForFunction(() => !document.querySelector('.modal'));
  const keep = await page.evaluate(() => ({ role: App.user.role, sameInput: document.getElementById('df-marks') === __guardMarks, raw: __guardMarks.value, dirty: App.hasDraftChanges() }));
  if (!(keep.role === 'doc' && keep.sameInput && keep.dirty && keep.raw === '未保存的演示切换验收')) report.failures.push({ kind: 'switch-cancel', keep });
  report.interactions.push({ label: 'switch-cancel-keeps-input', ...keep });
  await page.selectOption('#demo-role-switch', 'fin'); await page.click('.modal [data-ok]'); await page.waitForFunction(() => App.user.role === 'fin' && location.hash === '#/dashboard');
  report.interactions.push({ label: 'switch-confirm', ...await page.evaluate(() => ({ role: App.user.role, dirty: App.hasDraftChanges(), docEditing: AppUI.docEditing || null })) });
  await role('admin'); await go('#/system/roles');
  await page.click('[data-action="sys-perm"][data-role="fin"][data-module="收款与应收"]');
  await role('fin'); const menuOff = await page.evaluate(() => !document.querySelector('.nav a[href="#/payments"]'));
  await go('#/payments'); const routeOff = await page.evaluate(() => !!document.querySelector('.forbidden'));
  if (!menuOff || !routeOff) report.failures.push({ kind: 'permissions-disable', menuOff, routeOff });
  report.interactions.push({ label: 'permission-off-menu-and-route', menuOff, routeOff });
  await role('admin'); await go('#/system/roles'); await page.click('[data-action="sys-perm"][data-role="fin"][data-module="收款与应收"]');
  await role('fin'); await go('#/payments');
  const restored = await page.evaluate(() => !!document.getElementById('pay-form') && !!document.querySelector('.nav a[href="#/payments"]'));
  if (!restored) report.failures.push({ kind: 'permissions-restore' }); report.interactions.push({ label: 'permission-restored', ok: restored });
  await page.click('[data-action="logout"]'); await page.click('.modal [data-ok]'); await page.waitForFunction(() => location.hash === '#/login' && !App.user);
  await page.goto(base + '#/orders'); await page.waitForFunction(() => location.hash === '#/login');
  report.interactions.push({ label: 'logout-protected-route', ok: true });
  await role('fin'); report.runtimeErrors = await page.evaluate(() => __matrixErrors);
  report.result = report.failures.length || report.runtimeErrors.length ? 'FAIL' : 'PASS'; await save();
  console.log(JSON.stringify({ result: report.result, routes: report.routes.length, layouts: report.layouts.length, tabs: report.tabs.length, interactions: report.interactions.length, failures: report.failures, runtimeErrors: report.runtimeErrors }));
} catch (error) { report.result = 'FAIL'; report.failure = String(error.stack || error); await save(); throw error; }
finally { await page.cdp('Network.setCacheDisabled', { cacheDisabled: false }); }
