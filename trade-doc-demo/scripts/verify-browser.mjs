/* Browser QA only. Run through the installed ego-browser CLI with TRADE_QA_SPACE.
 * Uses a caller-owned TaskSpace; never creates or claims one. No production data.
 * Set globalThis.TRADE_QA_SPACE in the calling ego-browser script, then evaluate this file.
 */
const spaceId = Number(globalThis.TRADE_QA_SPACE || process.env.TRADE_QA_SPACE);
if (!spaceId) throw new Error('Set TRADE_QA_SPACE to the current authorized TaskSpace ID');
const task = await taskSpace(spaceId);
const page = task.page('p1');
const base = 'http://127.0.0.1:8000/index.html';
const fs = await import('node:fs/promises');
const assert = (ok, message) => { if (!ok) throw new Error(message); };
const report = { date: new Date().toISOString(), routeChecks: 0, layoutChecks: 0, interactions: [], failures: [] };
const go = async route => {
  await page.goto(base + route);
  await page.evaluate(() => App.rerender());
};
const role = async value => {
  await go('#/dashboard');
  if (await page.evaluate(() => !!App.user)) {
    await page.click('[data-action="logout"]');
    await page.click('[data-ok]');
  }
  await page.waitForFunction(() => location.hash === '#/login' && !App.user && !!document.getElementById('login-role'));
  await page.selectOption('#login-role', value);
  await page.click('[data-action="login-submit"]');
  await page.waitForFunction(value => location.hash === '#/dashboard' && App.user?.role === value, value);
};
const check = async (name, fn) => {
  try { await fn(); report.interactions.push({ name, result: 'PASS' }); }
  catch (error) { report.failures.push({ name, error: error.message }); }
};
await page.reload();
await page.waitForFunction(() => !!window.App && !!window.Views && document.styleSheets.length === 3 &&
  Array.from(document.styleSheets).every(sheet => { try { return sheet.cssRules.length > 0; } catch (_) { return false; } }));
await page.evaluate(() => {
  window.__tradeQaErrors = [];
  window.addEventListener('error', e => window.__tradeQaErrors.push(e.message));
  window.addEventListener('unhandledrejection', e => window.__tradeQaErrors.push(String(e.reason)));
});
if (await page.evaluate(() => !App.user)) {
  await page.click('[data-action="login-submit"]');
  await page.waitForSelector('.home-hero');
}
const all = ['admin','sales','doc','fin','boss'];
const business = ['sales','doc','fin','boss'];
const ids = await page.evaluate(() => ({ customer:MOCK.customers[0].id, product:MOCK.products[0].id, inquiry:MOCK.inquiries[0].id, quote:MOCK.quotes[0].id, quoteEdit:MOCK.quotes.find(q=>q.status!=='已确认')?.id, order:MOCK.orders[0].id, doc:MOCK.documents[0].id }));
const routes = [
  ['#/dashboard',all], ['#/customers',['sales']], ['#/customers/'+ids.customer,['sales']],
  ['#/products',['sales']], ['#/products/'+ids.product,business], ['#/inquiries',['sales','boss']],
  ['#/inquiries/'+ids.inquiry,['sales','boss']], ['#/quotes',['sales','boss']], ['#/quotes/'+ids.quote,['sales','boss']],
  ['#/quotes/'+ids.quoteEdit+'/edit',['sales']], ['#/orders',business], ['#/orders/'+ids.order,business],
  ['#/documents',['doc','boss']], ['#/documents/'+ids.doc,business], ['#/payments',['fin','boss']],
  ['#/approvals',business], ['#/stats',['boss']], ['#/system/users',['admin']], ['#/system/roles',['admin']], ['#/system/dicts',['admin']]
];
for (const userRole of all) {
  await role(userRole);
  for (const [route, allowed] of routes) {
    await go(route);
    const state = await page.evaluate(() => ({ forbidden:!!document.querySelector('.forbidden'), text:document.querySelector('.workspace')?.innerText || '', errors:window.__tradeQaErrors.slice() }));
    const expected = !allowed.includes(userRole);
    if (state.forbidden !== expected || !state.text || state.errors.length) report.failures.push({name:userRole+' '+route,state,expectedForbidden:expected});
    report.routeChecks++;
    for (const width of [1280,1440]) {
      await page.cdp('Emulation.setDeviceMetricsOverride',{width,height:1000,deviceScaleFactor:1,mobile:false});
      const dimensions = await page.evaluate(() => ({width:innerWidth,scroll:document.documentElement.scrollWidth}));
      if (dimensions.scroll > dimensions.width+1) report.failures.push({name:'body overflow '+userRole+' '+route,width,dimensions});
      report.layoutChecks++;
    }
  }
}
await check('Search filters role permissions, keyboard selection, empty state and focus return', async () => {
  await role('admin');
  await page.click('[data-action="search-open"]');
  assert(await page.evaluate(()=>document.activeElement.id==='workspace-search'),'Search input not focused');
  await page.fill('#workspace-search','SO2026');
  assert(await page.evaluate(()=>!document.querySelector('.search-result')), 'Admin search exposed business records');
  await page.fill('#workspace-search','角色');
  assert(await page.evaluate(()=>{document.getElementById('workspace-search').dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',isComposing:true,bubbles:true}));return !!document.getElementById('workspace-search');}),'IME Enter triggered navigation');
  await page.press('#workspace-search','Enter');
  await page.waitForFunction(()=>location.hash==='#/system/roles');
  await role('sales');
  await page.click('[data-action="search-open"]');
  await page.fill('#workspace-search','SO2026001');
  await page.press('#workspace-search','ArrowDown');
  await page.press('#workspace-search','Enter');
  assert(await page.evaluate(()=>location.hash.startsWith('#/orders/')||location.hash.startsWith('#/documents/')), 'Search did not navigate');
  await page.click('[data-action="search-open"]');
  await page.press('#workspace-search','Escape');
  assert(await page.evaluate(()=>document.activeElement.dataset.action==='search-open'&&!document.getElementById('app').inert), 'Search did not restore focus');
});
await check('Order filters, density and sidebar preserve entered text', async () => {
  await go('#/orders');
  await page.fill('#o-no','SO2026001');
  await page.click('[data-action="orders-more"]');
  await page.click('[data-action="orders-density"]');
  await page.click('[data-action="sidebar-toggle"]');
  assert(await page.evaluate(()=>document.getElementById('o-no').value==='SO2026001'), 'Input lost');
  await page.click('[data-action="orders-filter"]');
  assert(await page.evaluate(()=>document.querySelectorAll('.order-table tbody tr').length===1), 'Filter did not return one order');
  await page.click('.filter-actions [data-action="orders-reset"]');
  await page.click('[data-action="sidebar-toggle"]');
});
await check('Six order tabs and three independent progress tracks', async () => {
  await go('#/orders/SO2026001');
  assert(await page.evaluate(()=>document.querySelectorAll('.pt-block').length===3),'Missing independent progress');
  for (const tab of ['overview','items','docs','pay','changes','logs']) {
    await page.click('[data-action="order-tab"][data-tab="'+tab+'"]');
    await page.waitForFunction(tab=>document.querySelector('[data-tab="'+tab+'"]')?.getAttribute('aria-pressed')==='true',tab);
    assert(await page.evaluate(()=>document.getElementById('order-tab-body').innerText.length>30),'Empty tab');
  }
});
await check('Real confirmation cancel/confirm and quotation-derived order reconciliation', async () => {
  await role('sales');
  const qid = await page.evaluate(()=>MOCK.quotes.find(q=>q.status==='待客户确认'&&!q.orderId)?.id);
  assert(qid,'No awaiting-confirmation sample quote');
  await go('#/quotes/'+qid);
  await page.click('[data-action="quote-confirm"]');
  await page.fill('#qc-remark','浏览器回归：样例客户确认');
  await page.click('[data-ok]');
  await page.waitForSelector('[data-action="quote-gen-order"]');
  const count = await page.evaluate(()=>MOCK.orders.length);
  await page.click('[data-action="quote-gen-order"]');
  await page.click('.modal-foot [data-close]');
  assert(await page.evaluate(()=>MOCK.orders.length)===count,'Cancel created order');
  await page.click('[data-action="quote-gen-order"]');
  await page.click('[data-ok]');
  await page.waitForFunction(count=>MOCK.orders.length===count+1,count);
  assert(await page.evaluate(qid=>{const q=U.quote(qid),o=U.order(q.orderId);return o&&Math.abs(U.quoteTotal(q)-U.orderTotal(o))<.01;},qid),'Order amount mismatch');
});
await check('Document editing preserves text through focus mode; logout and re-login remove edit controls', async () => {
  await role('doc');
  await go('#/documents/D-CI2026004-V1');
  await page.click('[data-action="doc-edit"]');
  await page.fill('#df-marks','QA preview text');
  await page.click('[data-action="doc-focus"]');
  assert(await page.evaluate(()=>document.getElementById('df-marks').value==='QA preview text'),'Focus mode lost input');
  await role('boss');
  await go('#/documents/D-CI2026004-V1');
  assert(await page.evaluate(()=>!document.getElementById('df-marks')&&!AppUI.docEditing),'Role leaked editable controls');
});
await check('Approved document revision creates V2 and preserves V1', async () => {
  await role('doc');
  await go('#/documents/D-CI2026002-V1');
  const original = await page.evaluate(()=>JSON.stringify(U.doc('D-CI2026002-V1')));
  const count = await page.evaluate(()=>MOCK.documents.length);
  await page.click('[data-action="doc-revise"]');
  await page.click('.modal-foot [data-close]');
  assert(await page.evaluate(()=>MOCK.documents.length)===count,'Cancel revised document');
  await page.click('[data-action="doc-revise"]');
  await page.click('[data-ok]');
  await page.waitForFunction(count=>MOCK.documents.length===count+1,count);
  assert(await page.evaluate(original=>JSON.stringify(U.doc('D-CI2026002-V1'))===original&&!!U.doc('D-CI2026002-V2'),original),'Original version mutated');
});
await check('Payment field validation and receipt reconciliation', async () => {
  await role('fin');
  await go('#/payments?order=SO2026001');
  const before = await page.evaluate(()=>({n:MOCK.payments.length,received:U.orderReceived('SO2026001')}));
  await page.fill('#p-amount','999999');
  await page.click('#pay-form button[type="submit"]');
  assert(await page.evaluate(()=>document.getElementById('p-amount').getAttribute('aria-invalid')==='true'),'Missing field error');
  await page.fill('#p-amount','100');
  await page.click('#pay-form button[type="submit"]');
  await page.waitForFunction(n=>MOCK.payments.length===n+1,before.n);
  assert(await page.evaluate(before=>Math.abs(U.orderReceived('SO2026001')-before.received-100)<.01,before),'Payment reconciliation failed');
});
await check('Reduced motion disables authored movement; normal mode animates route', async () => {
  await page.cdp('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
  await go('#/orders');
  assert(await page.evaluate(()=>document.getAnimations().filter(a=>a.playState==='running').length===0),'Motion still running');
  await page.cdp('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'no-preference'}]});
  const count = await page.evaluate(()=>{location.hash='#/dashboard';App.rerender();return document.getAnimations().length;});
  assert(count>0,'Normal motion missing');
});
const errors = await page.evaluate(()=>window.__tradeQaErrors);
if (errors.length) report.failures.push({name:'runtime errors',errors});
report.result = report.failures.length ? 'FAIL' : 'PASS';
if (globalThis.TRADE_QA_REPORT) await fs.writeFile(globalThis.TRADE_QA_REPORT,JSON.stringify(report,null,2));
console.log(JSON.stringify(report,null,2));
// Refresh deliberately restores the demonstration data after mutation tests.
await page.reload();
await role('sales');
if(report.failures.length) throw new Error(report.failures.length+' browser checks failed');
