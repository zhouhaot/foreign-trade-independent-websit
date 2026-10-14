/* Run in the single authorized Ego TaskSpace 7, Page p2; never writes MOCK directly.
 * Assumes clean Demo memory and begins at synthetic INQ2026006. Re-running resets
 * neither memory nor storage: inspect the JSON receipt before any retry. */
const fs = await import('node:fs/promises');
const task = await taskSpace(7), page = task.page('p2');
const out = '/Users/airuquan/foreign-trade-independent-websit/trade-doc-demo/.impeccable/review/2026-10-14-review/browser-business.json';
const report = globalThis.TRADE_REVIEW_RESUME ? JSON.parse(await fs.readFile(out, 'utf8')) : { date: '2026-10-14', scope: 'local static Demo, actual UI actions', steps: [], errors: [] };
delete report.failure; delete report.result;
let quote, order, documents, ci, pl;
const save = async () => fs.writeFile(out, JSON.stringify(report, null, 2));
const assert = (value, label) => { if (!value) throw new Error(label); };
async function record(label, detail) { report.steps.push({ label, detail }); await save(); console.log(label); }
async function role(value) {
  await page.selectOption('#demo-role-switch', value);
  await page.waitForFunction(value => App.user?.role === value && location.hash === '#/dashboard', value);
}
async function go(hash) { await page.goto('http://127.0.0.1:8014/index.html' + hash); await page.waitForSelector('main.workspace'); }
async function confirm() { await page.click('.modal [data-ok]'); await page.waitForFunction(() => !document.querySelector('.modal')); }
try {
  await page.cdp('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
  await page.evaluate(() => {
    window.__reviewErrors = [];
    window.addEventListener('error', e => __reviewErrors.push(e.message));
    window.addEventListener('unhandledrejection', e => __reviewErrors.push(String(e.reason)));
  });
  if (globalThis.TRADE_REVIEW_RESUME_STAGE !== 'docs') {
  if (!globalThis.TRADE_REVIEW_RESUME) {
  await page.click('[data-action="inq-start-quote"]'); await confirm();
  await page.waitForSelector('#qe-form');
  quote = await page.evaluate(() => {
    const q = MOCK.quotes.find(q => q.inquiryId === 'INQ2026006');
    return { id: q.id, date: q.date, validUntil: q.validUntil, expectedUntil: U.addDays(q.date, 15), total: U.quoteTotal(q) };
  });
  assert(quote.validUntil === quote.expectedUntil && quote.total === 545, 'quote expiry +15 and 545 USD');
  await record('询盘生成报价：545 USD、默认有效期+15天', quote);
  await page.click('#qe-form button[type="submit"]'); await page.waitForFunction(() => !document.querySelector('#qe-form'));
  await page.click('[data-action="quote-confirm"]'); await page.fill('#qc-remark', '合成演示全链验收，非真实客户确认');
  await page.click('.modal [data-ok]'); await page.waitForFunction(id => U.quote(id).status === '已确认' && !document.querySelector('.modal'), quote.id);
  await page.click('[data-action="quote-gen-order"]');
  const delivery = await page.evaluate(() => ({ value: document.getElementById('qg-delivery').value, expected: U.addDays(U.today(), 30) }));
  assert(delivery.value === delivery.expected, 'delivery default +30');
  await page.fill('#qg-delivery', ''); await page.click('.modal [data-ok]');
  assert(await page.evaluate(() => MOCK.orders.length === 7 && document.getElementById('qg-delivery').getAttribute('aria-invalid') === 'true'), 'missing delivery rejected before commit');
  await page.fill('#qg-delivery', delivery.expected); await page.click('.modal [data-ok]');
  await page.waitForFunction(id => !!U.quote(id).orderId && location.hash.startsWith('#/orders/'), quote.id);
  order = await page.evaluate(id => {
    const o = U.order(U.quote(id).orderId); return { id: o.id, total: U.orderTotal(o), deliveryDate: o.deliveryDate, status: o.status, docStatus: o.docStatus, payStatus: U.payStatus(o), documents: MOCK.documents.filter(d => d.orderId === o.id).length };
  }, quote.id);
  assert(order.total === 545 && order.deliveryDate === delivery.expected && order.documents === 0, 'new order valid and no automatic docs');
  await record('客户确认→必填交期拦截→生成同一订单', order);
  await page.click('[data-action="order-apply-change"]'); await page.fill('#oc-amount', '544.99');
  const badPlan = await page.evaluate(() => ({ error: document.querySelector('#oc-amount-wrap .field-error').textContent, preview: document.querySelector('#oc-repricing').textContent, disabled: document.querySelector('.modal [data-ok]').disabled }));
  assert(badPlan.disabled && badPlan.error.includes('相差'), 'infeasible repricing is blocked in sales modal');
  await record('业务员改价实时预演（不提交无效目标）', badPlan);
  } else {
    quote = await page.evaluate(() => ({ id: MOCK.quotes.find(q => q.inquiryId === 'INQ2026006').id }));
    order = await page.evaluate(id => ({ id: U.quote(id).orderId }), quote.id);
  }
  await page.click('.modal-foot [data-close]');
  if (await page.evaluate(() => !!document.querySelector('[data-modal-draft-guard]'))) await page.click('[data-modal-draft-discard]');
  await page.waitForFunction(() => !document.querySelector('.modal'));
  await role('fin'); await go('#/payments?order=' + order.id);
  await page.fill('#p-amount', '546'); await page.click('#pay-form button[type="submit"]');
  assert(await page.evaluate(id => U.orderReceived(id) === 0 && /超过/.test(document.getElementById('pay-effect-error').textContent), order.id), 'overpay rejected');
  await page.fill('#p-amount', '100.00'); await page.click('#pay-form button[type="submit"]');
  await page.waitForFunction(id => U.orderReceived(id) === 100, order.id);
  await record('单证未开始时可独立收款；超收拒绝后登记100', await page.evaluate(id => ({ received: U.orderReceived(id), outstanding: U.orderFin(U.order(id)).outstanding, documents: MOCK.documents.filter(d => d.orderId === id).length, sessionCount: U.sessionPaymentCount() }), order.id));
  await role('doc'); await go('#/orders/' + order.id); await page.click('[data-action="doc-create"]');
  await page.waitForSelector('#df-marks');
  documents = await page.evaluate(id => MOCK.documents.filter(d => d.orderId === id).map(d => ({ id: d.id, no: d.no, type: d.type, version: d.version, status: d.status, frozen: Object.isFrozen(d.snapshot), invoice: d.snapshot.invoiceReference, packing: d.packing })), order.id);
  ci = documents.find(d => d.type === 'CI'); pl = documents.find(d => d.type === 'PL');
  assert(documents.length === 2 && documents.every(d => d.version === 1 && d.frozen) && pl.invoice.docId === ci.id, 'first create two frozen V1s with actual CI association');
  assert(await page.evaluate(() => document.activeElement.id === 'df-marks'), 'first-create editing focus');
  await record('同单首制CI/PL V1，独立快照、真实关联与编辑焦点', documents);
  } else {
    quote = await page.evaluate(() => ({ id: MOCK.quotes.find(q => q.inquiryId === 'INQ2026006').id }));
    order = await page.evaluate(id => ({ id: U.quote(id).orderId }), quote.id);
    documents = await page.evaluate(id => MOCK.documents.filter(d => d.orderId === id).map(d => ({ id: d.id, type: d.type })), order.id);
    ci = documents.find(d => d.type === 'CI'); pl = documents.find(d => d.type === 'PL');
  }
  await page.fill('#df-marks', 'SYNTHETIC REVIEW / SO8'); await page.fill('#df-remark', '本地原型验证，非正式单据');
  await page.click('[data-action="doc-save-draft"]'); await page.waitForFunction(id => !document.getElementById('df-marks') && U.doc(id).marks.includes('SYNTHETIC'), ci.id);
  await page.click('[data-action="doc-submit"]'); await confirm(); await page.waitForFunction(id => U.doc(id).status === '待审核', ci.id);
  await go('#/documents/' + pl.id); await page.click('[data-action="doc-edit"]');
  await page.fill('#df-pk-cartons', '10'); await page.fill('#df-pk-package', '合成验收包装，非实物数据');
  await page.fill('#df-pk-gw', '1680'); await page.fill('#df-pk-nw', '1700'); await page.fill('#df-pk-meas', '8');
  await page.click('[data-action="doc-save-draft"]');
  assert(await page.evaluate(id => U.doc(id).packing.gw === '' && document.getElementById('df-pk-gw').value === '1680' && document.querySelector('.packing-form-notes').textContent.includes('净重'), pl.id), 'invalid weight keeps raw and zero packing commit');
  await page.fill('#df-pk-nw', '1600'); await page.fill('#df-marks', 'SYNTHETIC REVIEW / SO8');
  await page.click('[data-action="doc-save-draft"]'); await page.waitForFunction(id => U.doc(id).packing.gw === '1680 KGS' && !document.getElementById('df-marks'), pl.id);
  await page.click('[data-action="doc-submit"]'); await confirm(); await page.waitForFunction(id => U.doc(id).status === '待审核', pl.id);
  await record('PL纯数字自动单位，非法重量零写后修正送审', await page.evaluate(id => ({ packing: U.doc(id).packing, status: U.doc(id).status, invoice: U.doc(id).snapshot.invoiceReference }), pl.id));
  await role('boss'); await go('#/documents/' + ci.id); await page.click('[data-action="doc-approve"]'); await confirm();
  await page.waitForFunction(id => U.doc(id).status === '已通过', ci.id);
  const next = await page.evaluate(id => [...document.querySelectorAll('.doc-action-panel [data-action="doc-goto"]')].find(b => b.dataset.id === id && b.textContent.includes('继续审核'))?.dataset.id, pl.id);
  assert(next === pl.id, 'next same-order pending shortcut');
  await page.click('.doc-action-panel [data-action="doc-goto"][data-id="' + next + '"]'); await page.fill('#audit-opinion', '合成验收核对通过'); await page.click('[data-action="doc-approve"]'); await confirm();
  await page.waitForFunction(id => U.doc(id).status === '已通过', pl.id);
  await record('主管CI审核→继续同单PL→双单通过', await page.evaluate(id => ({ order: U.order(id).docStatus, documents: MOCK.documents.filter(d => d.orderId === id).map(d => ({ type: d.type, status: d.status, approver: d.approver })) }), order.id));
  await role('fin'); await go('#/payments?order=' + order.id); await page.click('[data-action="pay-fill-balance"]');
  assert(await page.evaluate(() => document.getElementById('p-amount').value === '445.00'), 'fill remaining amount');
  await page.click('#pay-form button[type="submit"]'); await page.waitForFunction(id => U.payStatus(U.order(id)) === '已结清' && !!document.querySelector('.payment-completion'), order.id);
  await record('尾款快捷填入→结清正向反馈→自动下一单', await page.evaluate(() => ({ hash: location.hash, text: document.querySelector('.payment-completion').textContent, nextOrder: document.getElementById('p-order')?.value, count: U.sessionPaymentCount(), errorStyle: document.body.innerText.includes('原选择 SO2026008 不可登记') })));
  await go('#/payments?order=SO2026001'); await page.fill('#p-amount', '12,100.00'); await page.click('#pay-form button[type="submit"]');
  await page.waitForFunction(() => U.payStatus(U.order('SO2026001')) === '已结清' && !!document.querySelector('.payment-completion'));
  await go('#/dashboard');
  const count = await page.evaluate(() => [...document.querySelectorAll('.stat-card')].map(n => ({ label: n.querySelector('.sc-label').textContent, value: n.querySelector('.sc-value').textContent })).find(x => x.label === '本次演示新增收款'));
  assert(count.value === '3', 'new count reflects three successful receipts'); await record('千分位粘贴结清另一笔，首页即时新增3笔', count);
  report.orderId = order.id; report.quoteId = quote.id; report.documentIds = { ci: ci.id, pl: pl.id };
  report.errors = await page.evaluate(() => window.__reviewErrors || []); assert(report.errors.length === 0, 'no runtime errors');
  report.result = 'PASS'; await save(); console.log(JSON.stringify({ result: report.result, steps: report.steps.length, order: order.id }));
} catch (error) { report.result = 'FAIL'; report.failure = String(error.stack || error); report.errors = await page.evaluate(() => window.__reviewErrors || []); await save(); throw error; }
