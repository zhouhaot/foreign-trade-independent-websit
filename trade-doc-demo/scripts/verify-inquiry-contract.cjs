'use strict';
/* Real modal/Promise execution against isolated sample copies; no browser or service certification. */
const assert = require('node:assert/strict');
const { fixture } = require('./verify-document-workspace.cjs');
function setup(role = 'sales') {
  const t = fixture(['views-sales']); t.c.App.user = t.c.U.roleUser(role);
  const iq = { id: 'INQ-TEST-NEW', customerId: 'C001', salesperson: '李婷', date: '2026-10-07', source: '合成测试',
    status: '跟进中', quoteId: null, items: [{ productId: 'P001', qty: 10 }], message: '仅隔离测试' };
  t.c.MOCK.inquiries.push(iq); t.c.location.hash = '#/inquiries/' + encodeURIComponent(iq.id); return { ...t, iq };
}
const data = t => JSON.stringify(t.c.MOCK);
const open = t => { t.c.Actions['inq-start-quote']({ dataset: { id: t.iq.id } }); return t.modal.querySelector('[data-ok]'); };
async function run() {
  let cases = 0;
  for (const hash of ['#/customers/C001', '#/dashboard', '#/inquiries', '#/inquiries/INQ2026001', '#/inquiries/INQ-TEST-NEW/', '#/inquiries/%49NQ-TEST-NEW', '#/inquiries/INQ-TEST-NEW/edit']) {
    const t = setup(); t.c.location.hash = hash; const before = data(t);
    assert.ok(open(t) === null, 'off-source invocation cannot open confirmation: ' + hash);
    await t.flush(); assert.ok(data(t) === before); assert.ok(t.messages.some(m => /询盘详情|来源页面/.test(m.text))); cases++;
  }
  for (const target of ['#/customers/C001', '#/dashboard', '#/inquiries/INQ2026001', '#/inquiries/INQ-TEST-NEW?tab=other', '#/inquiries/%49NQ-TEST-NEW']) {
    for (const timing of ['before-click', 'after-click']) {
      const t = setup(), source = t.c.location.hash, before = data(t), sequence = [];
      t.c.App.markDraftClean = () => sequence.push('clean');
      t.c.App.requestNavigation = hash => sequence.push('navigate:' + hash);
      const ok = open(t), overlay = t.modal.firstElementChild; assert.ok(ok);
      const displayed = overlay.innerHTML;
      if (timing === 'after-click') t.click(ok);
      t.c.location.hash = target; if (timing === 'before-click') t.click(ok); await t.flush();
      assert.ok(data(t) === before, target + '/' + timing + ': full MOCK unchanged');
      assert.equal(t.modal.firstElementChild, overlay, 'refusal retains the displayed candidate');
      assert.equal(overlay.innerHTML, displayed);
      assert.match(t.modal.querySelector('[data-inquiry-error]').textContent, /来源页面已变化.*重新打开/);
      assert.deepEqual(sequence, []); assert.ok(!t.messages.some(m => /已生成/.test(m.text)));
      t.c.location.hash = source; t.click(ok); await t.flush();
      assert.ok(data(t) === before, 'returning to source cannot revive an invalidated old ticket');
      assert.deepEqual(sequence, []); cases++;
    }
  }
  for (const encoded of [false, true]) {
    const t = setup(); if (encoded) t.iq.id = 'INQ TEST/中文';
    t.c.location.hash = '#/inquiries/' + encodeURIComponent(t.iq.id) + '?from=list&label=%E4%B8%AD%E6%96%87';
    const ok = open(t); assert.ok(ok, 'canonical encoded source with query is allowed');
    t.click(ok); await t.flush(); assert.equal(t.c.MOCK.quotes.filter(q => q.inquiryId === t.iq.id).length, 1); cases++;
  }
  for (const role of ['boss', 'doc', 'fin', 'admin']) {
    const t = setup(role), before = data(t); const ok = open(t); if (ok) t.click(ok); await t.flush();
    assert.ok(data(t) === before, `${role}: generation must be sales-only`);
    assert.equal(t.modal.firstElementChild, null, 'unauthorized invocation cannot open generation');
    cases++;
  }
  for (const id of ['INQ2026001', 'INQ2026002', 'INQ2026003', 'INQ2026004', 'INQ2026005']) {
    const t = setup(); t.iq = t.c.U.inquiry(id); t.c.location.hash = '#/inquiries/' + encodeURIComponent(id); const before = data(t), ok = open(t);
    if (ok) t.click(ok); await t.flush(); assert.ok(data(t) === before, 'existing quotation cannot be recreated');
    const html = t.c.Views.inquiryDetail({ params: [id], query: {}, user: t.c.App.user });
    assert.match(html, /已有报价，不重复生成/); assert.ok(html.includes('href="#/quotes/' + t.iq.quoteId + '"'));
    assert.ok(!html.includes('data-action="inq-start-quote"')); cases++;
  }
  for (const problem of ['quote-missing', 'reverse-only', 'wrong-source', 'wrong-customer', 'duplicate-quote', 'duplicate-inquiry', 'duplicate-reverse', 'shared-link', 'wrong-status']) {
    const t = setup();
    const q = { id: 'Q-EXISTING', inquiryId: t.iq.id, customerId: t.iq.customerId, status: '待客户确认', items: [], currency: 'USD' };
    if (problem !== 'wrong-status' && problem !== 'duplicate-inquiry') { t.c.MOCK.quotes.push(q); t.iq.quoteId = q.id; }
    if (problem === 'quote-missing') t.iq.quoteId = 'MISSING';
    if (problem === 'reverse-only') t.iq.quoteId = null;
    if (problem === 'wrong-source') q.inquiryId = 'OTHER';
    if (problem === 'wrong-customer') q.customerId = 'C002';
    if (problem === 'duplicate-quote') t.c.MOCK.quotes.push({ ...q });
    if (problem === 'duplicate-inquiry') t.c.MOCK.inquiries.push(JSON.parse(JSON.stringify(t.iq)));
    if (problem === 'duplicate-reverse') t.c.MOCK.quotes.push({ ...q, id: 'Q-SECOND' });
    if (problem === 'shared-link') t.c.MOCK.inquiries.push({ ...t.iq, id: 'INQ-OTHER' });
    if (problem === 'wrong-status') t.iq.status = '已报价';
    const before = data(t); assert.equal(open(t), null, problem); await t.flush(); assert.ok(data(t) === before); cases++;
  }
  for (const field of ['qty', 'price']) {
    for (const value of ['Infinity', '1e309', '0x10', '1e2', '1.234', 'NaN', '-1', '', '0', '999999999999999999']) {
      const t = setup();
      if (field === 'qty') t.iq.items[0].qty = value; else t.c.U.product('P001').refPrice = value;
      const before = data(t); assert.equal(open(t), null, `${field}/${value}`); await t.flush(); assert.ok(data(t) === before);
      const html = t.c.Views.inquiryDetail({ params: [t.iq.id], query: {}, user: t.c.App.user });
      assert.ok(!html.includes('data-action="inq-start-quote"')); assert.ok(!html.includes('>0.00<')); cases++;
    }
  }
  for (const problem of ['fraction-cent', 'missing-customer', 'duplicate-customer', 'missing-product', 'duplicate-product', 'empty-items', 'null-items', 'null-item', 'mixed-currency', 'disabled-currency', 'unknown-currency', 'invalid-date', 'line-overflow', 'sum-overflow']) {
    const t = setup();
    if (problem === 'fraction-cent') { t.iq.items[0].qty = 0.01; t.c.U.product('P001').refPrice = 0.01; }
    if (problem === 'missing-customer') t.iq.customerId = 'MISSING';
    if (problem === 'duplicate-customer') t.c.MOCK.customers.push({ ...t.c.U.customer(t.iq.customerId) });
    if (problem === 'missing-product') t.iq.items[0].productId = 'MISSING';
    if (problem === 'duplicate-product') t.c.MOCK.products.push({ ...t.c.U.product('P001') });
    if (problem === 'empty-items') t.iq.items = [];
    if (problem === 'null-items') t.iq.items = null;
    if (problem === 'null-item') t.iq.items = [null];
    if (problem === 'mixed-currency') { t.iq.items.push({ productId: 'P002', qty: 5 }); t.c.U.product('P002').currency = 'EUR'; }
    if (problem === 'disabled-currency') t.c.U.product('P001').currency = 'CNY';
    if (problem === 'unknown-currency') t.c.U.product('P001').currency = 'GBP';
    if (problem === 'invalid-date') t.iq.date = '2026-02-30';
    if (problem === 'line-overflow') { t.iq.items[0].qty = 10000000000000; t.c.U.product('P001').refPrice = 10; }
    if (problem === 'sum-overflow') { t.iq.items = [{ productId: 'P001', qty: 50000000000000 }, { productId: 'P002', qty: 50000000000000 }]; t.c.U.product('P001').refPrice = 1; t.c.U.product('P002').refPrice = 1; }
    const before = data(t); assert.equal(open(t), null, problem); await t.flush(); assert.ok(data(t) === before);
    assert.doesNotThrow(() => t.c.Views.inquiryDetail({ params: [t.iq.id], query: {}, user: t.c.App.user })); cases++;
  }
  for (const change of ['role', 'new-session', 'actor-content', 'object', 'id', 'status', 'qty', 'customer-id', 'message', 'customer-content', 'product-content', 'reference-price', 'reference-currency', 'dict-content', 'dict-disabled', 'link-added', 'quote-reverse-added', 'duplicate-inquiry']) {
    for (const timing of ['before-click', 'after-click']) {
      const t = setup(), ok = open(t); assert.ok(ok, 'valid candidate has actual confirm');
      if (timing === 'after-click') t.click(ok);
      if (change === 'role') t.c.App.user = t.c.U.roleUser('boss');
      if (change === 'new-session') t.c.App.user = { ...t.c.App.user };
      if (change === 'actor-content') t.c.App.user.name = '另一个业务员';
      if (change === 'object') t.c.MOCK.inquiries[t.c.MOCK.inquiries.indexOf(t.iq)] = JSON.parse(JSON.stringify(t.iq));
      if (change === 'id') t.iq.id = 'INQ-CHANGED';
      if (change === 'status') t.iq.status = '已报价';
      if (change === 'qty') t.iq.items[0].qty = 11;
      if (change === 'customer-id') t.iq.customerId = 'C002';
      if (change === 'message') t.iq.message = '另一个有效客户需求';
      if (change === 'customer-content') t.c.U.customer('C001').contact = 'Another Valid Contact';
      if (change === 'product-content') t.c.U.product('P001').nameCn = '另一个有效商品名';
      if (change === 'reference-price') t.c.U.product('P001').refPrice = 3.3;
      if (change === 'reference-currency') t.c.U.product('P001').currency = 'EUR';
      if (change === 'dict-content') t.c.MOCK.dicts.find(d => d.group === '贸易术语').label = '已改有效标签';
      if (change === 'dict-disabled') t.c.MOCK.dicts.find(d => d.code === 'USD').enabled = false;
      if (change === 'link-added') t.iq.quoteId = 'Q2026001';
      if (change === 'quote-reverse-added') t.c.MOCK.quotes.push({ id: 'Q-OTHER', inquiryId: t.iq.id, customerId: t.iq.customerId });
      if (change === 'duplicate-inquiry') t.c.MOCK.inquiries.push({ ...t.iq });
      const before = data(t); if (timing === 'before-click') t.click(ok); await t.flush();
      assert.ok(data(t) === before, `${change}/${timing}: full MOCK unchanged`);
      assert.ok(t.modal.firstElementChild, 'refusal retains confirmation and reason');
      assert.match(t.modal.querySelector('[data-inquiry-error]').textContent, /变化|关联|冲突/);
      assert.ok(!t.messages.some(m => /已生成/.test(m.text))); cases++;
    }
  }
  for (const afterClick of [false, true]) {
    const t = setup(), ok = open(t), before = data(t); if (afterClick) t.click(ok);
    t.click(t.modal.querySelector('[data-close]')); await t.flush(); assert.ok(data(t) === before); assert.ok(!t.messages.some(m => /已生成/.test(m.text))); cases++;
  }
  for (const currency of ['USD', 'EUR']) {
    const t = setup(); t.iq.items = [{ productId: 'P001', qty: '0.01' }, { productId: 'P002', qty: '10.25' }];
    t.c.U.product('P001').refPrice = 1; t.c.U.product('P002').refPrice = 4;
    t.c.U.product('P001').currency = currency; t.c.U.product('P002').currency = currency;
    const before = JSON.parse(data(t)), sequence = [];
    t.c.App.markDraftClean = () => sequence.push('clean');
    t.c.App.requestNavigation = target => { sequence.push('navigate:' + target); t.c.location.hash = target; };
    const first = open(t), second = open(t); t.click(first); t.click(second); t.click(second); await t.flush();
    const quotes = t.c.MOCK.quotes.filter(q => q.inquiryId === t.iq.id); assert.equal(quotes.length, 1);
    const q = quotes[0]; assert.equal(t.iq.quoteId, q.id); assert.equal(t.iq.status, '已报价'); assert.equal(q.customerId, t.iq.customerId);
    assert.equal(q.currency, currency); assert.equal(t.c.U.transactionAmounts(q.items).totalCents, 4101); assert.equal(q.items[0].qty, 0.01);
    assert.equal(q.status, '待客户确认'); assert.equal(q.orderId, null); assert.equal(q.confirmDate, null);
    assert.equal(q.salesperson, t.c.App.user.name); assert.equal(q.items[1].price, 4); assert.notEqual(q.items, t.iq.items);
    assert.equal(t.c.MOCK.quotes.length, before.quotes.length + 1); assert.equal(t.messages.filter(m => /已生成/.test(m.text)).length, 1);
    assert.deepEqual(sequence, ['clean', 'navigate:#/quotes/' + q.id + '/edit']);
    for (const key of ['orders', 'documents', 'payments', 'approvals', 'orderLogs']) assert.equal(JSON.stringify(t.c.MOCK[key]), JSON.stringify(before[key]), `${key} remains independent`);
    const after = data(t); assert.equal(open(t), null); await t.flush(); assert.ok(data(t) === after); cases++;
  }
  {
    const t = setup(); t.c.MOCK.quotes.push({ id: 'Q' + t.c.U.today().slice(0, 4) + '9999', inquiryId: null });
    const ok = open(t); t.click(ok); await t.flush();
    assert.equal(t.iq.quoteId, 'Q' + t.c.U.today().slice(0, 4) + '10000', 'max current-year suffix avoids existing id'); cases++;
  }
  {
    const t = setup(), ok = open(t); t.c.MOCK.quotes.push({ id: 'Q' + t.c.U.today().slice(0, 4) + '9007199254740992', inquiryId: null });
    const before = data(t); t.click(ok); await t.flush(); assert.ok(data(t) === before); assert.match(t.modal.querySelector('[data-inquiry-error]').textContent, /编号/); cases++;
  }
  {
    const t = setup(); t.iq = t.c.U.inquiry('INQ2026006'); t.c.location.hash = '#/inquiries/' + encodeURIComponent(t.iq.id);
    assert.ok(t.iq && t.iq.demoSynthetic, 'explicit H17 fixture exists');
    assert.match(t.c.Views.inquiries(), /合成演示样例/);
    assert.match(t.c.Views.inquiries(), /样例加入日期/);
    assert.match(t.c.Views.inquiryDetail({ params: [t.iq.id], query: {}, user: t.c.App.user }), /合成演示样例/);
    assert.match(t.c.Views.inquiryDetail({ params: [t.iq.id], query: {}, user: t.c.App.user }), /样例加入日期/);
    assert.match(t.c.Views.inquiryDetail({ params: [t.iq.id], query: {}, user: t.c.App.user }), />生成报价草稿<\/button>/);
    const ok = open(t); assert.ok(ok); assert.match(t.modal.firstElementChild.innerHTML, /合成演示样例/);
    t.click(ok); await t.flush(); const q = t.c.U.quote(t.iq.quoteId);
    assert.equal(q.demoSynthetic, true); assert.match(q.remark, /非真实客户需求/); assert.equal(t.c.U.transactionAmounts(q.items).totalCents, 54500);
    q.remark = '业务员编辑后的备注';
    t.c.AppUI.quotes = { page: 1, filters: { kw: q.id } };
    assert.match(t.c.Views.quotes(), /<span class="cell-secondary"><span class="tag[^>]*">合成演示样例<\/span><\/span>/);
    assert.match(t.c.Views.quoteDetail({ params: [q.id], query: {}, user: t.c.App.user }), /合成演示样例/);
    assert.match(t.c.Views.quoteEdit({ params: [q.id], query: {}, user: t.c.App.user }), /合成演示样例/); cases++;
  }
  console.log(`PASS: inquiry contract ${cases} actual modal/Promise cases; canonical source/query and exact hash drift with invalidated tickets, sales roles, bidirectional source, full candidate/ref currency/precision, actor/session/object/content drift, cancel/duplicates, collision-safe USD/EUR fractional source-consistent draft (Node DOM fixture only)`);
}
if (require.main === module) run().catch(error => { console.error(error); process.exitCode = 1; });
