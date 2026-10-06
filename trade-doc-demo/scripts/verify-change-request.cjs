'use strict';
/* 实际 openModal/validate/withLoading，复用最小 DOM；不替代真实 UI 或后台审批。 */
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const path = require('node:path');
const { fixture } = require('./verify-document-workspace.cjs');
const root = path.resolve(__dirname, '..');
const baseline = process.argv.includes('--baseline');
const sources = baseline ? { 'views-sales': execFileSync('git', ['show', 'ef83c20:trade-doc-demo/js/views-sales.js'], { cwd: root, encoding: 'utf8' }) } : {};
function setup(status = '执行中') {
  const t = fixture(['views-sales'], sources), { c } = t;
  c.App.user = c.U.roleUser('sales');
  const order = c.MOCK.orders.find(o => o.id === 'SO2026001'); order.status = status;
  c.MOCK.approvals = c.MOCK.approvals.filter(a => !(a.targetType === 'order' && a.targetId === order.id));
  return { ...t, c, order };
}
const data = t => JSON.stringify(t.c.MOCK);
function open(t, type = '改价申请') {
  t.c.Actions['order-apply-change']({ dataset: { id: t.order.id } });
  const selector = t.modal.querySelector('#oc-type'); assert.ok(selector, '实际 openModal 生成变更表单');
  selector.value = type;
  t.modal.querySelector('#oc-reason').value = '已与客户协商并核对';
  t.modal.querySelector('#oc-amount').value = '24000.00';
  return t.modal.querySelector('[data-ok]');
}
function assertNoSuccess(t) { assert.ok(!t.messages.some(m => /已提交/.test(m.text)), '拒绝不能假成功'); }
async function run() {
  let cases = 0;
  // 用两个类型的待处理申请建立业务红灯，不能只防同一按钮点击。
  for (const type of ['改价申请', '取消申请']) {
    const t = setup();
    t.c.MOCK.approvals.push({ id: 'AP-PENDING', type, targetType: 'order', targetId: t.order.id, status: '待处理' });
    const before = data(t); const ok = open(t, type); t.click(ok); await t.flush();
    assert.ok(data(t) === before, `${type}: 已有待处理申请拒绝，完整 MOCK 不变`);
    assertNoSuccess(t); assert.ok(t.messages.some(m => /待处理/.test(m.text))); cases++;
  }
  for (const role of ['doc', 'boss', 'admin', 'fin']) {
    const t = setup(); t.c.App.user = t.c.U.roleUser(role); const before = data(t);
    t.c.Actions['order-apply-change']({ dataset: { id: t.order.id } }); await t.flush();
    assert.equal(t.modal.firstElementChild, null, `${role}: 非销售不能进入表单`);
    assert.equal(data(t), before); assertNoSuccess(t); cases++;
  }
  for (const status of ['已完成', '取消申请中', '已取消']) {
    const t = setup(status), before = data(t); t.c.Actions['order-apply-change']({ dataset: { id: t.order.id } });
    await t.flush(); assert.equal(t.modal.firstElementChild, null); assert.equal(data(t), before); cases++;
  }
  for (const type of ['改价申请', '取消申请']) {
    const t = setup(), before = data(t); open(t, type); t.click(t.modal.querySelector('[data-close]')); await t.flush();
    const discard = t.modal.querySelector('[data-modal-draft-discard]'); if (discard) { t.click(discard); await t.flush(); }
    assert.equal(data(t), before, '开窗后取消无业务写入'); assert.equal(t.modal.firstElementChild, null); assertNoSuccess(t); cases++;
  }
  for (const type of ['改价申请', '取消申请']) {
    for (const change of ['role', 'actor', 'object', 'status', 'currency']) {
      const t = setup(); const ok = open(t, type); t.click(ok);
      if (change === 'role') t.c.App.user = t.c.U.roleUser('fin');
      if (change === 'actor') t.c.App.user = { ...t.c.App.user, id: 'OTHER-ACTOR', name: '另一销售' };
      if (change === 'object') t.c.MOCK.orders[t.c.MOCK.orders.indexOf(t.order)] = JSON.parse(JSON.stringify(t.order));
      if (change === 'status') t.order.status = '已完成';
      if (change === 'currency') t.order.currency = 'EUR';
      const before = data(t); await t.flush();
      assert.ok(data(t) === before, `${type}/${change}: 真 Promise 延迟变化拒绝，完整 MOCK 不变`);
      assertNoSuccess(t); assert.ok(t.messages.some(m => /变化/.test(m.text))); cases++;
    }
  }
  for (const status of ['待执行', '执行中']) {
    const t = setup(status), before = JSON.parse(data(t)); const ok = open(t, '取消申请');
    t.click(ok); t.click(ok); await t.flush();
    const request = t.c.MOCK.approvals[0]; assert.equal(request.type, '取消申请'); assert.equal(request.priorOrderStatus, status);
    assert.equal(t.order.status, '取消申请中'); assert.equal(t.c.MOCK.approvals.length, before.approvals.length + 1);
    assert.equal(JSON.stringify(t.c.MOCK.documents), JSON.stringify(before.documents), '取消申请保留所有历史单证状态/快照/留痕');
    assert.equal(JSON.stringify(t.c.MOCK.payments), JSON.stringify(before.payments), '不登记退款或改变收款');
    assert.equal((t.c.MOCK.orderLogs[t.order.id] || []).length, (before.orderLogs[t.order.id] || []).length + 1); cases++;
    assert.equal(t.messages.filter(m => /变更申请已提交/.test(m.text)).length, 1, '同按钮重复点击只能反馈一次已提交');
  }
  // H20 新源填写契约：点击后输入漂移拒绝，不静默提交旧 captured A。
  const t = setup(), before = JSON.parse(data(t)); const ok = open(t);
  t.click(ok);
  t.modal.querySelector('#oc-amount').value = 'Infinity';
  t.modal.querySelector('#oc-reason').value = '点击后更改理由';
  t.modal.querySelector('#oc-type').value = '取消申请';
  await t.flush();
  assert.equal(data(t), JSON.stringify(before), '点击后 type/amount/reason 漂移完整 MOCK 不变');
  assert.equal(t.modal.querySelector('#oc-amount').value, 'Infinity'); assert.equal(t.modal.querySelector('#oc-reason').value, '点击后更改理由');
  assertNoSuccess(t); cases++;
  const parallel = setup(); const first = open(parallel); const second = open(parallel);
  parallel.click(first); parallel.click(second); await parallel.flush();
  assert.equal(parallel.c.MOCK.approvals.filter(a => a.targetId === parallel.order.id && a.type === '改价申请' && a.status === '待处理').length, 1, '双弹窗也只保留一条同类型申请'); cases++;
  console.log(`PASS: sales change request ${cases} modal/Promise cases; pending/duplicates, roles/order eligibility, delayed actor/object/status/currency guard, cancellation prior state, immutable submitted inputs, full MOCK refusal atomicity (Node DOM fixture only)`);
}
run().catch(error => { console.error(error.message); process.exitCode = 1; });
