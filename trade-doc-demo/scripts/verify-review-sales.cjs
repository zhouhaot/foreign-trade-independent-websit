'use strict';
/* 2026-10-14 review: real Views / Actions and async guards in minimal DOM, not browser QA. */
const assert = require('node:assert/strict');
const { fixture } = require('./verify-document-workspace.cjs');
const state = t => JSON.stringify(t.c.MOCK);
function setup() {
  const t = fixture(['views-sales', 'app']);
  t.c.App.user = t.c.U.roleUser('sales');
  return t;
}
function event(t, type, target) {
  for (const fn of target.listeners[type] || []) fn({ target, currentTarget: target, preventDefault() {} });
  for (const fn of t.handlers[type] || []) fn({ target, preventDefault() {} });
}
function orderForm() {
  const t = setup(), q = t.c.MOCK.quotes.find(x => x.status === '待客户确认' && !x.orderId);
  q.status = '已确认'; q.confirmDate = t.c.U.today();
  assert.ok(q); t.q = q; t.c.location.hash = '#/quotes/' + q.id;
  t.c.Actions['quote-gen-order']({ dataset: { id: q.id } });
  t.overlay = t.modal.firstElementChild;
  t.date = t.overlay.querySelector('#qg-delivery');
  assert.ok(t.date, '订单生成必须采集交货日期');
  return t;
}
function priceForm() {
  const t = setup(); t.order = t.c.U.order('SO2026001');
  t.c.MOCK.approvals = t.c.MOCK.approvals.filter(a => a.targetId !== t.order.id);
  t.c.location.hash = '#/orders/' + t.order.id;
  t.c.Actions['order-apply-change']({ dataset: { id: t.order.id } });
  t.overlay = t.modal.firstElementChild;
  t.amount = t.overlay.querySelector('#oc-amount');
  t.overlay.querySelector('#oc-reason').value = '与客户核对后申请改价';
  return t;
}
async function run() {
  let cases = 0;
  const fresh = setup(), inquiry = fresh.c.U.inquiry('INQ2026006');
  const originalDocuments = JSON.stringify(fresh.c.MOCK.documents), originalPayments = JSON.stringify(fresh.c.MOCK.payments);
  fresh.c.location.hash = '#/inquiries/' + inquiry.id;
  fresh.c.Actions['inq-start-quote']({ dataset: { id: inquiry.id } });
  fresh.click(fresh.modal.querySelector('[data-ok]')); await fresh.flush();
  const draft = fresh.c.U.quote(inquiry.quoteId);
  assert.ok(draft); assert.equal(draft.validUntil, fresh.c.U.addDays(draft.date, 15)); cases++;
  fresh.c.location.hash = '#/quotes/' + draft.id;
  fresh.c.Actions['quote-confirm']({ dataset: { id: draft.id } });
  fresh.modal.querySelector('#qc-date').value = fresh.c.U.today();
  fresh.click(fresh.modal.querySelector('[data-ok]')); await fresh.flush();
  assert.equal(draft.status, '已确认');
  fresh.c.Actions['quote-gen-order']({ dataset: { id: draft.id } });
  fresh.modal.querySelector('#qg-delivery').value = fresh.c.U.addDays(fresh.c.U.today(), 30);
  fresh.click(fresh.modal.querySelector('[data-ok]')); await fresh.flush();
  assert.equal(fresh.c.U.orderTotal(fresh.c.U.order(draft.orderId)), 545, '合成INQ6原意向数量/参考价最终生成545USD');
  assert.equal(JSON.stringify(fresh.c.MOCK.documents), originalDocuments);
  assert.equal(JSON.stringify(fresh.c.MOCK.payments), originalPayments); cases++;

  for (const valid of [false, true]) {
    const t = setup(), q = t.c.MOCK.quotes.find(x => x.status === '待客户确认' && !x.orderId);
    t.c.location.hash = '#/quotes/' + q.id + '/edit';
    t.app.innerHTML = t.c.Views.quoteEdit({ params: [q.id], query: {}, user: t.c.App.user });
    const form = t.document.querySelector('#qe-form');
    form.querySelector('#qe-currency').value = q.currency;
    form.querySelector('#qe-valid').value = t.c.U.addDays(q.date, valid ? 0 : -1);
    const before = state(t); event(t, 'submit', form); await t.flush();
    if (valid) assert.equal(q.validUntil, q.date, '同日有效期可保存');
    else { assert.equal(state(t), before); assert.match(form.querySelector('#qe-form-error').textContent, /不得早于/); }
    cases++;
  }
  for (const raw of ['', '2026-02-30']) {
    const t = orderForm(), before = state(t); t.date.value = raw;
    t.click(t.overlay.querySelector('[data-ok]')); await t.flush();
    assert.equal(state(t), before); assert.equal(t.date.getAttribute('aria-invalid'), 'true'); cases++;
  }
  const success = orderForm();
  assert.equal(success.date.value, success.c.U.addDays(success.c.U.today(), 30));
  success.date.value = '2027-02-01';
  const length = success.c.MOCK.orders.length;
  success.click(success.overlay.querySelector('[data-ok]')); success.click(success.overlay.querySelector('[data-ok]')); await success.flush();
  assert.equal(success.c.MOCK.orders.length, length + 1);
  const created = success.c.U.order(success.q.orderId);
  assert.equal(created.deliveryDate, '2027-02-01');
  assert.equal(success.c.U.orderTotal(created), success.c.U.quoteTotal(success.q));
  assert.equal(success.modal.firstElementChild, null); cases++;
  for (const mutation of ['date', 'node', 'actor', 'quote', 'status', 'window', 'route', 'permission']) {
    const t = orderForm(); t.click(t.overlay.querySelector('[data-ok]'));
    let next;
    if (mutation === 'date') t.date.value = '2027-03-01';
    if (mutation === 'node') {
      const replacement = t.document.createElement('input'); replacement.id = t.date.id; replacement.value = t.date.value;
      t.date.parentElement.insertBefore(replacement, t.date); t.date.remove();
    }
    if (mutation === 'actor') t.c.App.user = t.c.U.roleUser('boss');
    if (mutation === 'quote') t.q.items[0].price += 1;
    if (mutation === 'status') t.q.status = '待客户确认';
    if (mutation === 'window') next = t.c.U.openModal({ title: '新窗', body: '<input value="保留新输入">' });
    if (mutation === 'route') t.c.location.hash = '#/dashboard';
    if (mutation === 'permission') t.c.MOCK.permMatrix.sales = t.c.MOCK.permMatrix.sales.filter(x => x !== '销售业务');
    const before = state(t); await t.flush(); assert.equal(state(t), before, mutation + '漂移不生成订单');
    if (next) assert.equal(t.modal.firstElementChild, next);
    cases++;
  }
  const dirty = orderForm(); dirty.date.value = '2027-02-01';
  dirty.click(dirty.overlay.querySelector('[data-close]'));
  const keep = dirty.modal.querySelector('[data-modal-draft-continue]'); assert.ok(keep);
  dirty.click(keep); assert.equal(dirty.modal.firstElementChild, dirty.overlay); assert.equal(dirty.date.value, '2027-02-01'); cases++;

  const bad = priceForm(); bad.amount.value = '24000.00'; event(bad, 'input', bad.amount);
  assert.ok(bad.overlay.querySelector('[data-ok]').disabled, '不可分摊目标实时禁用提交');
  const beforeBad = state(bad); bad.click(bad.overlay.querySelector('[data-ok]')); await bad.flush();
  assert.equal(state(bad), beforeBad); assert.equal(bad.amount.value, '24000.00', '不静默替换客户目标');
  const suggestion = bad.overlay.querySelector('[data-action="order-price-suggestion"]'); assert.ok(suggestion, '给出已重新验证的可行目标');
  assert.equal(suggestion.dataset.amount, '24010.00', '独立固定样例候选尾差为10美元');
  bad.click(suggestion);
  const plan = bad.c.U.prepareRepricing({ targetType: 'order', targetId: bad.order.id, targetAmount: bad.amount.value });
  assert.ok(!plan.error); assert.equal(bad.overlay.querySelector('[data-ok]').disabled, false);
  bad.click(bad.overlay.querySelector('[data-ok]')); await bad.flush();
  const approval = bad.c.MOCK.approvals.find(a => a.type === '改价申请' && a.targetId === bad.order.id);
  assert.ok(approval); assert.ok(!bad.c.U.prepareRepricing(approval).error); cases++;

  for (const mutation of ['items', 'payment', 'actor', 'input', 'permission']) {
    const t = priceForm(); t.amount.value = '24100.00'; event(t, 'input', t.amount);
    t.click(t.overlay.querySelector('[data-ok]'));
    if (mutation === 'items') t.order.items[0].qty += 1;
    if (mutation === 'payment') t.c.MOCK.payments.push({ orderId: t.order.id, amount: 999999, currency: t.order.currency });
    if (mutation === 'actor') t.c.App.user = t.c.U.roleUser('fin');
    if (mutation === 'input') t.amount.value = '24000.00';
    if (mutation === 'permission') t.c.MOCK.permMatrix.sales = t.c.MOCK.permMatrix.sales.filter(x => x !== '订单详情');
    const before = state(t); await t.flush(); assert.equal(state(t), before, mutation + '延迟漂移不提交'); cases++;
  }
  const cancel = priceForm(); cancel.overlay.querySelector('#oc-type').value = '取消申请';
  event(cancel, 'change', cancel.overlay.querySelector('#oc-type'));
  cancel.amount.value = '非法隐藏金额'; cancel.click(cancel.overlay.querySelector('[data-ok]')); await cancel.flush();
  assert.equal(cancel.order.status, '取消申请中'); cases++;

  const views = setup(); views.c.U.order('SO2026001').deliveryDate = '';
  const listing = views.c.Views.orders();
  assert.match(listing, /从询盘新建报价/); assert.match(listing, /#\/inquiries\?status=/);
  assert.match(listing, /交期 待排期/); assert.match(listing, /class="cell-secondary" title="/);
  assert.match(listing, /data-action="order-apply-change"/); cases++;
  const iqctx = { params: [], query: { status: '跟进中' }, user: views.c.App.user };
  views.c.Views.inquiries(iqctx); assert.equal(views.c.AppUI.inquiries.filters.status, '跟进中');
  views.c.Actions['inq-reset'](); views.c.Views.inquiries(iqctx); assert.equal(views.c.AppUI.inquiries.filters.status, '', '重置不被URL查询再次强制'); cases++;
  views.c.AppUI.inquiries = { page: 1, filters: { status: '已报价' } };
  views.c.Views.inquiries(iqctx); assert.equal(views.c.AppUI.inquiries.filters.status, '已报价', '用户已有筛选优先于入口默认'); cases++;
  for (const role of ['sales', 'doc', 'boss', 'fin', 'admin']) for (const tab of ['overview', 'items', 'docs', 'pay', 'changes', 'logs']) {
    views.c.App.user = views.c.U.roleUser(role);
    const ctx = { params: ['SO2026001'], query: { tab }, user: views.c.App.user };
    assert.equal(typeof views.c.Views.orderDetail(ctx), 'string');
    const body = views.c.Views.orderTabBody(ctx, tab); assert.equal(typeof body, 'string');
    if (tab === 'overview') { assert.match(body, /合同附件/); assert.match(body, /未提供合同附件/); assert.match(body, /最近动态/); assert.doesNotMatch(body, /<div class="dt">订单金额/); }
    cases++;
  }
  views.c.App.user = views.c.U.roleUser('doc');
  const noDoc = views.c.U.order('SO2026003'), ctx = { params: [noDoc.id], query: {}, user: views.c.App.user };
  views.c.MOCK.documents = views.c.MOCK.documents.filter(d => d.orderId !== noDoc.id);
  assert.match(views.c.Views.orderDetail(ctx), /data-action="doc-create" data-order="SO2026003"/); cases++;
  views.c.MOCK.documents.push({ id: 'D-CI-PARTIAL', no: 'CI-PARTIAL', orderId: noDoc.id, type: 'CI', version: 1, status: '草稿' });
  assert.match(views.c.Views.orderDetail(ctx), /data-action="doc-create" data-order="SO2026003"/, '缺PL时仍可补首制'); cases++;
  noDoc.docStatus = '已通过';
  assert.match(views.c.Views.orderDetail(ctx), /data-action="doc-create" data-order="SO2026003"/, '缺PL时不能仅凭旧汇总通过状态隐藏首制'); cases++;
  views.c.MOCK.orderLogs[noDoc.id] = [1, 2, 3, 4].map(i => ({ time: '2026-10-14 12:00', person: '测试', content: '同分钟事件' + i }));
  const overview = views.c.Views.orderTabBody(ctx, 'overview');
  assert.doesNotMatch(overview, /同分钟事件1/); assert.ok(overview.indexOf('同分钟事件4') < overview.indexOf('同分钟事件3')); cases++;
  console.log(`PASS: ${cases} sales review cases (real Actions / Views, minimal DOM; browser layout excluded)`);
}
if (require.main === module) run().catch(error => { console.error(error.stack); process.exitCode = 1; });
module.exports = { run };
