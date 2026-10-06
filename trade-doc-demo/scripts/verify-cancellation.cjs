/* 取消与重新制单审批：真实异步动作，完整内存数据对照；非浏览器/后端验证。 */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
function fixture() {
  const timers = [], overlays = [], messages = [];
  const c = vm.createContext({ Promise, AppUI: {}, App: { user: null, rerender() {} },
    document: { addEventListener() {}, getElementById() { return null; } },
    location: { hash: '' }, setTimeout(fn) { timers.push(fn); } });
  c.window = c;
  for (const name of ['mock-data', 'utils', 'views-core', 'views-sales', 'views-docs', 'views-fin']) {
    vm.runInContext(fs.readFileSync(path.join(root, 'js', name + '.js'), 'utf8'), c, { filename: name });
  }
  c.App.user = c.U.roleUser('boss');
  c.U.toast = text => messages.push(text);
  c.U.closeModal = () => {};
  c.U.openModal = options => {
    const error = { textContent: '' }, opinion = { value: '核对完成', classList: { add() {} }, focus() {}, parentElement: { querySelector: () => error } };
    const buttons = ['approve', 'reject'].map(act => ({ dataset: { act }, innerHTML: act,
      classList: { contains() { return false; }, add() {}, remove() {} }, addEventListener(event, fn) { this.click = fn; } }));
    const overlay = { options, buttons, querySelectorAll: () => buttons,
      querySelector: sel => sel === '#ap-opinion' ? opinion : error };
    overlays.push(overlay); return overlay;
  };
  return { c, overlays, messages, open(id) { c.Actions['ap-handle']({ dataset: { id } }); return overlays.at(-1); },
    async flush() { for (let i = 0; i < 8; i++) { await Promise.resolve(); while (timers.length) timers.shift()(); } } };
}
const json = value => JSON.stringify(value);
async function blocked(id, setup, mutate, pattern) {
  for (const decision of [0, 1]) {
    const t = fixture(); if (setup) setup(t);
    const overlay = t.open(id); if (mutate) mutate(t);
    const before = json(t.c.MOCK);
    if (overlay) overlay.buttons[decision].click();
    await t.flush();
    assert.equal(json(t.c.MOCK), before, '拒绝不改变任何订单/单证/申请/收款/日志');
    assert.match(t.messages.join(' ') + (overlay ? overlay.querySelector('#ap-effect-error').textContent : ''), pattern);
  }
}
(async () => {
  const t = fixture(), M = t.c.MOCK;
  const request = M.approvals.find(a => a.id === 'AP20260904');
  const order = t.c.U.order(request.targetId);
  const historical = json(M.documents), payments = json(M.payments);
  const overlay = t.open(request.id);
  assert.match(overlay.options.body, /历史|原版本/);
  assert.doesNotMatch(overlay.options.body, /关联单证作废/);
  overlay.buttons[0].click(); overlay.buttons[1].click(); await t.flush();
  assert.equal(order.status, '已取消'); assert.equal(request.status, '已通过');
  assert.equal(json(M.documents), historical, '取消不改写历史审核事实/纸张');
  assert.equal(json(M.payments), payments, '取消不删除收款或虚构退款');
  assert.equal(M.orderLogs[order.id].filter(l => /审核通过，订单已取消/.test(l.content)).length, 1, '相反决策不重复提交');
  for (const previous of ['待执行', '执行中', null]) {
    const r = fixture(), a = r.c.MOCK.approvals.find(x => x.id === request.id);
    if (previous) a.priorOrderStatus = previous;
    r.open(a.id).buttons[1].click(); await r.flush();
    assert.equal(r.c.U.order(a.targetId).status, previous || '执行中');
    if (!previous) assert.match(json(r.c.MOCK.orderLogs[a.targetId]), /旧样例未记录/);
  }
  await blocked(request.id, x => { x.c.U.order(request.targetId).status = '已取消'; }, null, /不是取消申请中/);
  await blocked(request.id, null, x => { x.c.U.order(request.targetId).status = '已取消'; }, /订单状态.*已变化/);
  await blocked(request.id, null, x => { x.c.App.user = x.c.U.roleUser('sales'); }, /仅业务主管/);
  await blocked(request.id, null, x => {
    const index = x.c.MOCK.orders.findIndex(o => o.id === request.targetId);
    x.c.MOCK.orders[index] = JSON.parse(json(x.c.MOCK.orders[index]));
  }, /关联对象|已变化/);
  const reformId = 'AP20260905';
  for (const status of ['取消申请中', '已取消']) {
    await blocked(reformId, x => { const d = x.c.U.doc('D-PL2026004-V1'); x.c.U.order(d.orderId).status = status; }, null, /取消|暂停/);
    await blocked(reformId, null, x => { const d = x.c.U.doc('D-PL2026004-V1'); x.c.U.order(d.orderId).status = status; }, /订单状态.*已变化/);
  }
  await blocked(reformId, null, x => {
    const d = x.c.U.doc('D-PL2026004-V1'), nd = JSON.parse(json(d));
    nd.id += '-NEW'; nd.version++; x.c.MOCK.documents.push(nd);
  }, /历史|最新|版本/);
  await blocked(reformId, null, x => { x.c.U.doc('D-PL2026004-V1').status = '制作中'; }, /版本.*已变化/);
  for (const mutate of [
    x => { x.c.U.doc('D-PL2026004-V1').packing.package = 'CHANGED AFTER OPEN'; },
    x => { const d = x.c.U.doc('D-PL2026004-V1'); x.c.U.order(d.orderId).items[0].qty++; },
    x => { x.c.MOCK.seller.nameEn = 'CHANGED SELLER'; },
    x => { const d = x.c.U.doc('D-PL2026004-V1'); x.c.U.customer(x.c.U.order(d.orderId).customerId).addr = 'CHANGED BUYER'; },
    x => { const d = x.c.U.doc('D-PL2026004-V1'); x.c.U.product(x.c.U.order(d.orderId).items[0].productId).spec = 'CHANGED PRODUCT'; }
  ]) await blocked(reformId, null, mutate, /已变化.*重新打开/);
  const good = fixture(), source = good.c.U.doc('D-PL2026004-V1'), sourceBefore = json(source);
  good.open(reformId).buttons[0].click(); await good.flush();
  const created = good.c.MOCK.documents.at(-1);
  assert.equal(created.version, 2); assert.equal(created.status, '草稿');
  assert.equal(created.snapshot.basis, 'creation'); assert.equal(json(source), sourceBefore);
  assert.equal(good.c.MOCK.approvals.find(a => a.id === reformId).status, '已通过');
  console.log('PASS cancellation/re-document approval, history preservation, delayed guards, duplicate decisions and snapshot creation');
})().catch(error => { console.error(error); process.exitCode = 1; });
