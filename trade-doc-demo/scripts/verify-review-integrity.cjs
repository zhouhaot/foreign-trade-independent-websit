'use strict';
// Independent integer-cent expectations + real Actions. Minimal DOM, not browser/backend certification.
const assert = require('node:assert/strict');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { fixture } = require('./verify-document-workspace.cjs');
const root = path.resolve(__dirname, '..');
const baseline = process.argv.includes('--baseline');
const sources = {};
if (baseline) for (const name of ['mock-data', 'utils', 'views-core', 'views-sales', 'views-docs', 'views-fin', 'views-stats']) {
  sources[name] = execFileSync('git', ['show', '4c674496667fd31078194ca81c0d0a4f081eda21:trade-doc-demo/js/' + name + '.js'], { cwd: root, encoding: 'utf8' });
}
const checks = [];
async function check(name, run) {
  try { await run(); checks.push({ name, status: 'PASS' }); }
  catch (error) { checks.push({ name, status: 'FAIL', error: error.message }); }
}
function cents(value) {
  const [integer, decimal = ''] = String(value).split('.');
  return BigInt(integer) * 100n + BigInt((decimal + '00').slice(0, 2));
}
function total(items) {
  return items.reduce((sum, item) => {
    const scaled = cents(item.qty) * cents(item.price); assert.equal(scaled % 100n, 0n);
    return sum + scaled / 100n;
  }, 0n);
}
function money(units) {
  const text = String(units).padStart(3, '0');
  return text.slice(0, -2).replace(/\B(?=(\d{3})+(?!\d))/g, ',') + '.' + text.slice(-2);
}
function setup(files = ['views-sales', 'views-docs', 'views-fin', 'views-stats']) { return fixture(files, sources); }
function button(t, dataset) {
  const b = t.document.createElement('button'); Object.assign(b.dataset, dataset); t.app.appendChild(b); return b;
}
async function confirm(t) {
  const b = t.modal.querySelector('[data-ok]'); assert.ok(b, 'actual confirmation button'); t.click(b); await t.flush();
}
function stats(t) { return t.c.Views.stats({ user: t.c.U.roleUser('boss') }); }
function aggregateFixture(prices) {
  const t = setup(['views-stats']);
  t.c.MOCK.orders = prices.map((price, i) => ({ id: 'TEST-' + i, customerId: 'C001', currency: 'USD', status: '执行中', createdAt: '2026-10-19', items: [{ productId: 'P001', qty: 1, price }] }));
  t.c.MOCK.payments = []; return t;
}

(async () => {
  await check('IDs avoid all existing approval records', () => {
    const t = setup([]), existing = new Set(t.c.MOCK.approvals.map(a => a.id));
    const ids = Array.from({ length: 4 }, () => t.c.U.newId('AP'));
    assert.ok(ids.every(id => !existing.has(id)), 'new IDs must not collide with baseline AP20260101/AP20260102');
    assert.equal(new Set(ids).size, ids.length);
  });
  await check('IDs avoid reserved session IDs even if seq resets', () => {
    const t = setup([]), first = t.c.U.newId('TEST'); t.c.U.seq = 100;
    assert.notEqual(t.c.U.newId('TEST'), first);
  });
  await check('actual document submit creates a unique approval', async () => {
    const t = setup(['views-docs']), d = t.c.U.doc('D-CI2026004-V1'); t.mount(d);
    t.c.Actions['doc-submit'](button(t, { id: d.id })); await confirm(t);
    assert.equal(d.status, '待审核');
    const approvals = t.c.MOCK.approvals, ids = approvals.map(a => a.id);
    assert.equal(new Set(ids).size, ids.length);
    assert.equal(approvals.find(a => a.targetId === 'D-CI2026003-V2').status, '已通过');
  });
  await check('actual reform application creates a unique approval', async () => {
    const t = setup(['views-docs']), d = t.c.U.doc('D-PL2026004-V1');
    t.c.MOCK.approvals.find(a => a.id === 'AP20260905').status = '已退回'; t.mount(d);
    t.c.Actions['doc-reform'](button(t, { id: d.id })); await confirm(t);
    const ids = t.c.MOCK.approvals.map(a => a.id); assert.equal(new Set(ids).size, ids.length);
  });
  await check('order and quote totals equal independent BigInt cents', () => {
    const t = setup([]), items = [{ qty: 50, price: 1111111111111.11 }, { qty: 1, price: 0.5 }];
    const expected = money(total(items));
    assert.equal(t.c.U.fmt(t.c.U.orderTotal({ items })), expected);
    assert.equal(t.c.U.fmt(t.c.U.quoteTotal({ items })), expected);
    assert.ok(Number.isNaN(t.c.U.orderTotal({ items: [{ qty: 0.01, price: 0.01 }] })), 'invalid fractional cent must not be displayed as a valid amount');
  });
  await check('actual quote/order/CI preserve exact line and total displays', async () => {
    const t = setup(), c = t.c; c.App.user = c.U.roleUser('sales');
    const q = c.U.quote('Q2026004'); c.location.hash = '#/quotes/' + q.id + '/edit';
    t.app.innerHTML = c.Views.quoteEdit({ params: [q.id], query: {}, user: c.App.user });
    t.document.getElementById('qe-currency').value = q.currency;
    const input = [{ qty: '50', price: '1111111111111.11' }, { qty: '1', price: '0.50' }];
    input.forEach((line, i) => { for (const field of ['qty', 'price']) t.document.querySelector('.qe-input[data-idx="' + i + '"][data-field="' + field + '"]').value = line[field]; });
    const form = t.document.getElementById('qe-form');
    for (const fn of t.handlers.submit || []) fn({ target: form, preventDefault() {} });
    await t.flush(); assert.equal(q.items[0].price, Number(input[0].price));
    c.location.hash = '#/quotes/' + q.id; c.Actions['quote-confirm']({ dataset: { id: q.id } }); await confirm(t);
    c.Actions['quote-gen-order']({ dataset: { id: q.id } }); await confirm(t);
    const order = c.U.order(q.orderId), expected = money(total(input)), line = money(total(input.slice(0, 1)));
    const orderHtml = c.Views.orderDetail({ params: [order.id], query: { tab: 'items' }, user: c.App.user });
    assert.ok(orderHtml.includes(line), 'order item amount must match exact cents');
    assert.equal(c.U.fmt(c.U.orderTotal(order)), expected);
    c.App.user = c.U.roleUser('doc'); c.location.hash = '#/orders/' + order.id;
    c.Actions['doc-create'](button(t, { order: order.id })); await t.flush();
    const d = c.MOCK.documents.find(d => d.orderId === order.id && d.type === 'CI'); assert.ok(d);
    const html = c.Views.docDetail({ params: [d.id], query: {}, user: c.App.user });
    assert.ok(html.includes(line), 'CI item amount must match exact cents');
    assert.equal(html.match(/<b>TOTAL<\/b><\/td><td class="r"><b>([^<]*)/)[1], expected);
    assert.ok(html.includes('SAY TOTAL USD ' + expected + ' ONLY.'));
    assert.equal(total(d.snapshot.order.items), total(input));
    assert.ok(Object.isFrozen(d.snapshot.order));
  });
  await check('stats use exact cents for repeated small decimal sums', () => {
    const prices = Array(30).fill('0.01'), t = aggregateFixture(prices), expected = money(total(prices.map(price => ({ qty: 1, price }))));
    assert.equal(expected, '0.30');
    const html = stats(t); assert.ok(html.includes('<b>0.30</b>')); assert.ok(html.includes('0.30 USD'));
  });
  await check('stats refuse aggregate cents that lose precision on display', () => {
    const t = aggregateFixture(['90071992547408', '0.99']);
    assert.equal(total(t.c.MOCK.orders.flatMap(o => o.items)), 9007199254740899n);
    const html = stats(t);
    assert.ok(!html.includes('90,071,992,547,408.98'), 'must not present a lost cent as a valid aggregate');
    assert.ok(html.includes('汇总待核对'));
  });
  await check('stats refuse unsafe received/method aggregation', () => {
    const t = aggregateFixture(['90071992547408', '0.99']);
    t.c.MOCK.payments = t.c.MOCK.orders.map((o, i) => ({ id: 'PAY-TEST-' + i, orderId: o.id, amount: o.items[0].price, currency: 'USD', method: '其他' }));
    const html = stats(t);
    assert.ok(!html.includes('90,071,992,547,408.98'));
    assert.ok(html.includes('汇总待核对'));
    assert.ok(!html.includes('NaN%'));
  });
  await check('stats preserve USD/EUR separation and baseline status filter', () => {
    const t = setup(['views-stats']);
    t.c.MOCK.orders.push({ id: 'CANCELED-TEST', customerId: 'C001', currency: 'USD', status: '已取消', createdAt: '2026-10-19', items: [{ qty: 1, price: 999999 }] });
    const html = stats(t);
    for (const currency of ['USD', 'EUR']) {
      const orders = t.c.MOCK.orders.filter(o => o.currency === currency && o.status !== '已取消');
      const expected = money(orders.reduce((sum, o) => sum + total(o.items), 0n));
      assert.ok(html.includes('<small>' + currency + '</small><b>' + expected + '</b>'));
    }
    assert.ok(!html.includes('1,122,199.00'));
  });
  const failed = checks.filter(x => x.status === 'FAIL');
  console.log(JSON.stringify({ mode: baseline ? 'frozen-baseline-RED' : 'current-GREEN', checks, total: checks.length, passed: checks.length - failed.length, failed: failed.length, boundary: 'Node VM only; actual Actions; no browser/backend claim.' }, null, 2));
  if (failed.length) process.exitCode = 1;
})().catch(error => { console.error(error); process.exitCode = 1; });
