/* 改价审批回归：真实动作 + 隔离 Node VM/最小弹窗桩；不替代浏览器或服务端事务验收。 */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');

function fixture() {
  const timers = [], messages = [], overlays = [];
  const context = vm.createContext({
    console, Promise, AppUI: {}, App: { user: null, rerender() {} },
    document: { addEventListener() {} }, setTimeout(fn) { timers.push(fn); }
  });
  context.window = context;
  for (const file of ['mock-data', 'utils', 'views-core', 'views-fin']) {
    vm.runInContext(fs.readFileSync(path.join(root, 'js', file + '.js'), 'utf8'), context, { filename: file });
  }
  context.App.user = context.U.roleUser('boss');
  context.U.toast = (message, type) => messages.push({ message, type });
  context.U.closeModal = () => {};
  context.U.openModal = options => {
    const error = { textContent: '' };
    const opinion = { value: '', classList: { add() {}, remove() {} }, focus() {}, parentElement: { querySelector: () => error } };
    const buttons = ['approve', 'reject'].map(act => {
      const classes = new Set();
      return { dataset: { act }, innerHTML: act, disabled: false,
        classList: { add: x => classes.add(x), remove: x => classes.delete(x), contains: x => classes.has(x) },
        addEventListener(type, fn) { this.click = fn; } };
    });
    const overlay = { options, buttons,
      querySelector: selector => selector === '#ap-opinion' ? opinion : error,
      querySelectorAll: () => buttons };
    overlays.push(overlay);
    return overlay;
  };
  return { c: context, messages, overlays,
    approval: () => context.MOCK.approvals.find(a => a.id === 'AP20260903'),
    open(id = 'AP20260903') { context.Actions['ap-handle']({ dataset: { id } }); return overlays.at(-1); },
    async flush() {
      // 使用真正的 U.withLoading，覆盖 Promise 延迟提交与 loading 防重复。
      for (let i = 0; i < 5; i++) { await Promise.resolve(); while (timers.length) timers.shift()(); }
    }
  };
}
const snapshot = test => JSON.stringify(test.c.MOCK);
async function refused(setup, pattern) {
  const t = fixture(); setup(t);
  const before = snapshot(t), overlay = t.open();
  if (overlay) overlay.buttons[0].click();
  await t.flush();
  assert.equal(snapshot(t), before, '失败不更改订单/申请/单证/收款/任何日志');
  assert.ok(t.messages.some(m => m.type === 'error'), '拒绝时提供错误反馈');
  const details = overlay ? overlay.querySelector('#ap-effect-error').textContent : t.messages.map(m => m.message).join('\n');
  assert.match(details, pattern, '明确错误仍完整显示：' + pattern);
  if (overlay) assert.equal(t.messages.at(-1).message, '审批未生效，请查看弹窗中的处理说明。', 'Toast 简短，详情留在弹窗避免遮住按钮');
  return t;
}

(async () => {
  await refused(() => {}, /两位|2 位/); // 缺陷基线：27305.50 不能静默批准为 27285.00。
  for (const amount of [NaN, Infinity, -Infinity, 0, -1, '', 'bad', null, true, 27305.501, '27305.500']) {
    await refused(t => { t.approval().targetAmount = amount; }, /目标金额/);
  }
  await refused(t => { t.c.U.order('SO2026005').items[0].price = 2.601; }, /单价/);
  await refused(t => { t.c.U.order('SO2026005').items[1].price = Infinity; }, /单价/);
  await refused(t => { t.c.U.order('SO2026005').items[0].qty = 0.5; }, /数量/);
  await refused(t => { t.approval().targetAmount = 28150; t.approval().currency = 'EUR'; }, /币种/);
  await refused(t => { t.c.MOCK.payments.push({ orderId: 'SO2026005', amount: 1, currency: 'EUR' }); }, /币种/);
  await refused(t => { t.c.MOCK.payments.push({ orderId: 'SO2026005', amount: NaN, currency: 'USD' }); }, /收款金额/);
  await refused(t => { t.approval().targetAmount = 14075; t.c.MOCK.payments.push({ orderId: 'SO2026005', amount: 15000, currency: 'USD' }); }, /低于已收/);
  await refused(t => { t.approval().targetAmount = Number.MAX_VALUE; }, /目标金额/);
  await refused(t => { t.c.U.order('SO2026005').status = '已取消'; }, /已取消/);
  await refused(t => { t.approval().targetId = 'MISSING'; }, /订单不存在/);
  for (const role of ['sales', 'doc', 'fin', 'admin']) {
    await refused(t => { t.c.App.user = t.c.U.roleUser(role); }, /业务主管/);
  }
  await refused(t => { t.approval().applicant = t.c.App.user.name; }, /自审/);
  await refused(t => { t.approval().status = '已通过'; }, /已处理/);

  for (const [targetId, amount, currency] of [['SO2026005', 14075, 'USD'], ['SO2026003', 18000, 'EUR']]) {
    const t = fixture(), a = t.approval(); a.targetId = targetId; a.targetAmount = amount;
    const order = t.c.U.order(targetId), original = JSON.parse(snapshot(t));
    const quantities = order.items.map(i => i.qty);
    const overlay = t.open();
    overlay.buttons[0].click(); overlay.buttons[0].click(); overlay.buttons[1].click();
    await t.flush();
    assert.equal(a.status, '已通过'); assert.equal(a.handler, t.c.App.user.name);
    assert.ok(Math.abs(t.c.U.orderTotal(order) - amount) < 1e-8);
    assert.deepEqual(order.items.map(i => i.qty), quantities, '不修改数量凑账');
    assert.ok(order.items.every(i => Number.isInteger(Math.round(i.price * 100)) && Math.abs(i.price * 100 - Math.round(i.price * 100)) < 1e-8));
    assert.equal(order.currency, currency);
    assert.equal(JSON.stringify(t.c.MOCK.documents), JSON.stringify(original.documents), '批准不改历史单证');
    assert.equal(JSON.stringify(t.c.MOCK.payments), JSON.stringify(original.payments), '批准不改收款');
    assert.equal((t.c.MOCK.orderLogs[targetId] || []).length, (original.orderLogs[targetId] || []).length + 1, '重复/相反按钮只写一次日志');
    const approved = snapshot(t); t.open(); await t.flush(); assert.equal(snapshot(t), approved);
  }

  for (const change of [t => { t.c.App.user = t.c.U.roleUser('fin'); },
    t => { t.approval().applicant = t.c.App.user.name; },
    t => { t.approval().status = '已退回'; },
    t => { t.approval().targetAmount = 27305.50; }]) {
    const t = fixture(); t.approval().targetAmount = 14075;
    const overlay = t.open(); overlay.buttons[0].click(); change(t);
    const before = snapshot(t); await t.flush(); assert.equal(snapshot(t), before, '延迟提交重查权限/自审/状态/金额');
    assert.ok(t.messages.some(m => m.type === 'error'));
  }
  for (const change of [t => { t.approval().targetAmount = 28150; },
    t => { t.approval().targetId = 'SO2026007'; },
    t => { t.approval().type = '取消申请'; },
    t => { t.approval().targetType = 'doc'; },
    t => { t.approval().currency = 'USD'; },
    t => { t.c.U.order('SO2026005').currency = 'EUR'; },
    t => { t.approval().applicant = '李婷'; },
    t => { t.approval().reason = '更改理由'; }]) {
    for (const decision of ['approve', 'reject']) {
      const t = fixture(); t.approval().targetAmount = 14075;
      const overlay = t.open(); overlay.querySelector('#ap-opinion').value = '已核对';
      overlay.buttons[decision === 'approve' ? 0 : 1].click(); change(t);
      const before = snapshot(t); await t.flush();
      assert.equal(snapshot(t), before, '提交不得决定开窗未展示的新申请金额/关联对象/类型/币种/申请人');
      assert.ok(t.messages.some(m => m.message === '审批未生效，请查看弹窗中的处理说明。' && m.type === 'error'));
      assert.match(overlay.querySelector('#ap-effect-error').textContent, /已变化.*重新打开/);
    }
  }
  const parallel = fixture(); parallel.approval().targetAmount = 14075;
  const first = parallel.open(), second = parallel.open();
  first.buttons[0].click(); second.querySelector('#ap-opinion').value = '不能重复退回'; second.buttons[1].click();
  await parallel.flush(); assert.equal(parallel.approval().status, '已通过', '同申请两弹窗只执行首次决策');
  const noOpinion = fixture(), rejectOverlay = noOpinion.open(), unmodified = snapshot(noOpinion);
  rejectOverlay.buttons[1].click(); await noOpinion.flush(); assert.equal(snapshot(noOpinion), unmodified, '无处理意见不得退回');
  assert.match(rejectOverlay.querySelector('.field-error').textContent, /必须填写/);
  const cancelled = fixture(); cancelled.open(); const untouched = snapshot(cancelled);
  await cancelled.flush(); assert.equal(snapshot(cancelled), untouched, '打开/取消审批不改数据');
  const rejected = fixture(), overlay = rejected.open();
  overlay.querySelector('#ap-opinion').value = '与客户重新确认目标金额'; overlay.buttons[1].click(); await rejected.flush();
  assert.equal(rejected.approval().status, '已退回');
  assert.equal(rejected.c.U.orderTotal(rejected.c.U.order('SO2026005')), 28150);
  console.log('PASS: atomic repricing, precision/non-finite input, USD/EUR isolation, received floor, roles/self-review, duplicate/reject/cancel and deferred revalidation (Node VM)');
})().catch(error => { console.error(error); process.exitCode = 1; });
