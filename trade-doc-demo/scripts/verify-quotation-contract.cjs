'use strict';
/* Actual input/submit listeners, openModal and Promise loading; Node DOM fixture, not browser certification. */
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const { fixture } = require('./verify-document-workspace.cjs');
const root = path.resolve(__dirname, '..');
function setup() {
  const t = fixture([]), handlers = {}, { c } = t;
  const add = t.document.addEventListener.bind(t.document);
  t.document.addEventListener = (type, fn) => { (handlers[type] ||= []).push(fn); add(type, fn); };
  vm.runInContext(fs.readFileSync(path.join(root, 'js/views-sales.js'), 'utf8'), c, { filename: 'views-sales' });
  c.App.user = c.U.roleUser('sales');
  const q = c.U.quote('Q2026004');
  t.mountQuote = (edit = true) => {
    c.location.hash = '#/quotes/' + q.id + (edit ? '/edit' : '');
    t.app.innerHTML = c.Views[edit ? 'quoteEdit' : 'quoteDetail']({ params: [q.id], user: c.App.user, query: {} });
    if (edit) t.document.getElementById('qe-currency').value = q.currency;
  };
  t.emit = (type, target) => {
    const e = { target, currentTarget: target, defaultPrevented: false, preventDefault() { this.defaultPrevented = true; } };
    (handlers[type] || []).forEach(fn => fn(e)); return e;
  };
  t.submit = () => t.emit('submit', t.document.getElementById('qe-form'));
  return { ...t, q };
}
const data = t => JSON.stringify(t.c.MOCK);
const rowInput = (t, field, i = 0) => t.document.querySelector('.qe-input[data-idx="' + i + '"][data-field="' + field + '"]');
const noSuccess = t => assert.ok(!t.messages.some(m => /已保存|已登记客户确认|已生成/.test(m.text)), '拒绝不报假成功');
async function run() {
  let cases = 0;
  for (const bad of ['Infinity', '1e309', '0x10', '1e2', '1.234', 'NaN', '-1', '', '0']) {
    for (const field of ['qty', 'price']) {
      const t = setup(); t.mountQuote(); rowInput(t, field).value = bad;
      const before = data(t); t.emit('input', rowInput(t, field));
      assert.equal(t.document.getElementById('qe-total').textContent, '待修正', `${field}/${bad}: illegal preview not zero`);
      t.submit(); await t.flush(); assert.equal(data(t), before, `${field}/${bad}: complete MOCK unchanged`);
      assert.equal(rowInput(t, field).getAttribute('aria-invalid'), 'true'); noSuccess(t); cases++;
    }
  }
  {
    const t = setup(); t.mountQuote(); rowInput(t, 'qty').value = '0.01'; rowInput(t, 'price').value = '0.01';
    const before = data(t); t.emit('input', rowInput(t, 'qty')); t.submit(); await t.flush();
    assert.equal(data(t), before, 'fractional cent line refused atomically');
    assert.match(t.document.getElementById('qe-form-error').textContent, /第 1 行/); noSuccess(t); cases++;
  }
  for (const change of ['role', 'actor', 'actor-content', 'object', 'status', 'quote-content', 'customer', 'product', 'dictionary', 'route', 'detached-form']) {
    const t = setup(); t.mountQuote(); rowInput(t, 'qty').value = '10.25'; rowInput(t, 'price').value = '4';
    t.submit();
    if (change === 'role') t.c.App.user = t.c.U.roleUser('fin');
    if (change === 'actor') t.c.App.user = { ...t.c.App.user };
    if (change === 'actor-content') t.c.App.user.name = '另一个名字';
    if (change === 'object') t.c.MOCK.quotes[t.c.MOCK.quotes.indexOf(t.q)] = JSON.parse(JSON.stringify(t.q));
    if (change === 'status') t.q.status = '已确认';
    if (change === 'quote-content') t.q.items[0].price = 1.5;
    if (change === 'customer') t.c.U.customer(t.q.customerId).contact = 'Valid Changed Contact';
    if (change === 'product') t.c.U.product(t.q.items[0].productId).nameCn = '有效的新商品名称';
    if (change === 'dictionary') t.c.MOCK.dicts.find(x => x.code === 'USD').label = '新美元标签';
    if (change === 'route') t.c.location.hash = '#/quotes/Q2026005/edit';
    if (change === 'detached-form') t.app.innerHTML = '';
    const before = data(t); await t.flush(); assert.equal(data(t), before, `save delayed ${change}: entire MOCK unchanged`); noSuccess(t); cases++;
  }
  for (const change of ['role', 'actor', 'object', 'status', 'quote-content']) {
    const t = setup(); t.mountQuote();
    if (change === 'role') t.c.App.user = t.c.U.roleUser('boss');
    if (change === 'actor') t.c.App.user = { ...t.c.App.user };
    if (change === 'object') t.c.MOCK.quotes[t.c.MOCK.quotes.indexOf(t.q)] = JSON.parse(JSON.stringify(t.q));
    if (change === 'status') t.q.status = '已确认';
    if (change === 'quote-content') t.q.items[0].qty += 1;
    const before = data(t); t.submit(); await t.flush(); assert.equal(data(t), before); noSuccess(t); cases++;
  }
  for (const field of ['valid', 'currency', 'term', 'pay']) {
    const t = setup(); t.mountQuote(); const input = t.document.getElementById('qe-' + field);
    input.value = field === 'valid' ? '2026-02-30' : field === 'currency' ? 'CNY' : '';
    const before = data(t); t.submit(); await t.flush(); assert.equal(data(t), before);
    assert.equal(input.getAttribute('aria-invalid'), 'true'); noSuccess(t); cases++;
  }
  for (const problem of ['customer-missing', 'customer-duplicate', 'product-missing', 'product-duplicate', 'currency-disabled', 'currency-unknown', 'date-invalid', 'empty-items', 'missing-items', 'null-item', 'line-overflow', 'sum-overflow']) {
    const t = setup();
    if (problem === 'customer-missing') t.q.customerId = 'MISSING';
    if (problem === 'customer-duplicate') t.c.MOCK.customers.push(JSON.parse(JSON.stringify(t.c.U.customer(t.q.customerId))));
    if (problem === 'product-missing') t.q.items[0].productId = 'MISSING';
    if (problem === 'product-duplicate') t.c.MOCK.products.push(JSON.parse(JSON.stringify(t.c.U.product(t.q.items[0].productId))));
    if (problem === 'currency-disabled') t.q.currency = 'CNY';
    if (problem === 'currency-unknown') t.q.currency = 'GBP';
    if (problem === 'date-invalid') t.q.date = '2026-02-30';
    if (problem === 'empty-items') t.q.items = [];
    if (problem === 'missing-items') t.q.items = null;
    if (problem === 'null-item') t.q.items = [null];
    if (problem === 'line-overflow') t.q.items = [{ productId: 'P005', qty: 10000000000000, price: 10 }];
    if (problem === 'sum-overflow') t.q.items = [{ productId: 'P005', qty: 50000000000000, price: 1 }, { productId: 'P008', qty: 50000000000000, price: 1 }];
    const before = data(t); t.mountQuote(); t.submit(); await t.flush(); assert.equal(data(t), before, problem); noSuccess(t); cases++;
  }
  for (const currency of ['USD', 'EUR']) {
    const t = setup(); t.mountQuote(); const documents = JSON.stringify(t.c.MOCK.documents), payments = JSON.stringify(t.c.MOCK.payments);
    rowInput(t, 'qty').value = '0.01'; rowInput(t, 'price').value = '1.00';
    rowInput(t, 'qty', 1).value = '10.25'; rowInput(t, 'price', 1).value = '4.00';
    t.document.getElementById('qe-valid').value = '2024-02-29'; // No unsupported future-date requirement.
    t.document.getElementById('qe-currency').value = currency; t.emit('input', t.document.getElementById('qe-currency'));
    assert.equal(t.document.getElementById('qe-total').textContent, '41.01');
    assert.equal(t.document.getElementById('qe-total-currency').textContent, currency);
    t.submit(); t.submit(); rowInput(t, 'qty').value = '1234'; // Capture click's validated candidate, not later form text.
    await t.flush(); assert.equal(t.q.items[0].qty, 0.01); assert.equal(t.q.items[1].qty, 10.25); assert.equal(t.q.currency, currency);
    assert.equal(t.q.validUntil, '2024-02-29'); assert.equal(t.c.U.transactionAmounts(t.q.items).totalCents, 4101);
    assert.equal(t.messages.filter(m => /已保存/.test(m.text)).length, 1);
    assert.equal(JSON.stringify(t.c.MOCK.documents), documents); assert.equal(JSON.stringify(t.c.MOCK.payments), payments); cases++;
  }
  const openConfirm = t => {
    t.c.Actions['quote-confirm']({ dataset: { id: t.q.id } });
    const date = t.modal.querySelector('#qc-date'); assert.ok(date, 'actual confirm modal'); date.value = '2024-02-29';
    t.modal.querySelector('#qc-remark').value = '客户确认本次展示的内容'; return t.modal.querySelector('[data-ok]');
  };
  const makeConfirmed = t => { t.q.status = '已确认'; t.q.confirmDate = '2024-02-29'; };
  const openOrder = t => { t.c.Actions['quote-gen-order']({ dataset: { id: t.q.id } }); return t.modal.querySelector('[data-ok]'); };
  for (const action of ['confirm', 'order']) {
    for (const role of ['doc', 'fin', 'boss', 'admin']) {
      const t = setup(); if (action === 'order') makeConfirmed(t); t.c.App.user = t.c.U.roleUser(role);
      const before = data(t); t.c.Actions[action === 'confirm' ? 'quote-confirm' : 'quote-gen-order']({ dataset: { id: t.q.id } });
      await t.flush(); assert.equal(t.modal.firstElementChild, null); assert.equal(data(t), before); noSuccess(t); cases++;
    }
    for (const change of ['role', 'actor', 'actor-content', 'object', 'status', 'quote-content', 'customer', 'product', 'dictionary']) {
      const t = setup(); if (action === 'order') makeConfirmed(t);
      const ok = action === 'confirm' ? openConfirm(t) : openOrder(t); assert.ok(ok); t.click(ok);
      if (change === 'role') t.c.App.user = t.c.U.roleUser('fin');
      if (change === 'actor') t.c.App.user = { ...t.c.App.user };
      if (change === 'actor-content') t.c.App.user.name = '另一名字';
      if (change === 'object') t.c.MOCK.quotes[t.c.MOCK.quotes.indexOf(t.q)] = JSON.parse(JSON.stringify(t.q));
      if (change === 'status') t.q.status = action === 'order' ? '待客户确认' : '已确认';
      if (change === 'quote-content') t.q.items[0].qty += 1;
      if (change === 'customer') t.c.U.customer(t.q.customerId).contact = 'Changed Valid Contact';
      if (change === 'product') t.c.U.product(t.q.items[0].productId).spec = 'Changed Valid Specification';
      if (change === 'dictionary') t.c.MOCK.dicts.find(x => x.code === 'USD').enabled = false;
      const before = data(t); await t.flush(); assert.equal(data(t), before, `${action}/${change}`); noSuccess(t);
      assert.ok(t.modal.firstElementChild, 'refusal keeps processing explanation');
      assert.match(t.modal.querySelector('[data-quote-error]').textContent, /变化/); cases++;
    }
    for (const afterClick of [false, true]) {
      const t = setup(); if (action === 'order') makeConfirmed(t);
      const ok = action === 'confirm' ? openConfirm(t) : openOrder(t), before = data(t);
      const origin = t.modal.firstElementChild;
      if (afterClick) t.click(ok); t.click(t.modal.querySelector('[data-close]'));
      const discard = t.modal.querySelector('[data-modal-draft-discard]'); if (discard) t.click(discard);
      if (action === 'confirm' && afterClick) {
        assert.equal(t.modal.firstElementChild, origin, 'H20 客户确认busy期间close拒绝');
        await t.flush(); assert.equal(t.q.status, '已确认');
        assert.equal(t.messages.filter(m => /已登记客户确认/.test(m.text)).length, 1);
        assert.equal(JSON.stringify(t.c.MOCK.orders), JSON.stringify(JSON.parse(before).orders), '客户确认不直接生成订单');
      } else {
        await t.flush(); assert.equal(data(t), before, `${action}: cancel ${afterClick ? 'after' : 'before'} queued Promise`); noSuccess(t);
      }
      cases++;
    }
  }
  for (const date of ['', '2026-02-30', '2025-02-29', 'not-date']) {
    const t = setup(); const ok = openConfirm(t); t.modal.querySelector('#qc-date').value = date;
    const before = data(t); t.click(ok); await t.flush(); assert.equal(data(t), before);
    assert.equal(t.modal.querySelector('#qc-date').getAttribute('aria-invalid'), 'true'); noSuccess(t); cases++;
  }
  for (const action of ['confirm', 'order']) {
    for (const wrong of ['wrong-status', 'already-linked', 'order-link-only', 'invalid-amount', 'invalid-date', 'missing-customer', 'missing-product']) {
      const t = setup(); if (action === 'order') makeConfirmed(t);
      if (wrong === 'wrong-status') t.q.status = action === 'confirm' ? '已确认' : '待客户确认';
      if (wrong === 'already-linked') t.q.orderId = 'SO2026001';
      if (wrong === 'order-link-only') t.c.MOCK.orders.push({ id: 'SO2026999', quoteId: t.q.id });
      if (wrong === 'invalid-amount') t.q.items[0].price = Infinity;
      if (wrong === 'invalid-date') t.q.validUntil = '2026-02-30';
      if (wrong === 'missing-customer') t.q.customerId = 'MISSING';
      if (wrong === 'missing-product') t.q.items[0].productId = 'MISSING';
      const before = data(t); t.c.Actions[action === 'confirm' ? 'quote-confirm' : 'quote-gen-order']({ dataset: { id: t.q.id } });
      await t.flush(); assert.equal(t.modal.firstElementChild, null); assert.equal(data(t), before); noSuccess(t); cases++;
    }
  }
  for (const currency of ['USD', 'EUR']) {
    const t = setup(); t.q.currency = currency; t.q.items = [{ productId: 'P005', qty: 0.01, price: 1 }, { productId: 'P008', qty: 10.25, price: 4 }];
    const first = openConfirm(t), second = openConfirm(t); const before = JSON.parse(data(t));
    t.click(first); t.click(second); t.click(second);
    t.modal.querySelector('#qc-date').value = '2027-01-01'; t.modal.querySelector('#qc-remark').value = '后来修改';
    await t.flush(); assert.equal(data(t), JSON.stringify(before), 'H20 点击后的QC输入漂移拒绝，不静默提交captured A'); noSuccess(t);
    const validConfirm = openConfirm(t); t.click(validConfirm);
    await t.flush(); assert.equal(t.q.status, '已确认'); assert.equal(t.q.confirmDate, '2024-02-29');
    assert.match(t.q.remark, /客户确认本次展示的内容/); assert.ok(!t.q.remark.includes('后来修改'));
    assert.equal(t.messages.filter(m => /已登记客户确认/.test(m.text)).length, 1);
    const orderOne = openOrder(t), orderTwo = openOrder(t); t.click(orderOne); t.click(orderTwo); t.click(orderTwo); await t.flush();
    const orders = t.c.MOCK.orders.filter(o => o.quoteId === t.q.id); assert.equal(orders.length, 1);
    assert.equal(t.q.orderId, orders[0].id); assert.equal(orders[0].currency, currency);
    assert.equal(JSON.stringify(orders[0].items), JSON.stringify(t.q.items)); assert.notEqual(orders[0].items, t.q.items);
    assert.equal(t.c.U.transactionAmounts(orders[0].items).totalCents, 4101);
    assert.equal(t.c.MOCK.orders.length, before.orders.length + 1); assert.equal(t.c.MOCK.orderLogs[orders[0].id].length, 1);
    assert.equal(JSON.stringify(t.c.MOCK.documents), JSON.stringify(before.documents)); assert.equal(JSON.stringify(t.c.MOCK.payments), JSON.stringify(before.payments));
    assert.equal(t.messages.filter(m => /订单 .* 已生成/.test(m.text)).length, 1); cases++;
  }
  console.log(`PASS: quotation contract ${cases} actual input/submit/modal/Promise cases; decimal preview, fractional-cent/overflow atomic refusal, dates/dictionary/associations, actor/object/content drift, cancel/duplicates, USD/EUR fractional quantity source-consistent order (Node DOM fixture only)`);
}
module.exports = { setup, data, rowInput, noSuccess };
if (require.main === module) run().catch(error => { console.error(error); process.exitCode = 1; });
