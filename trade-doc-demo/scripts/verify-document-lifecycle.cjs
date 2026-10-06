'use strict';
/* 使用真实 Promise / 定时器的单证动作验证；只模拟最小 DOM，不代表浏览器验收。 */
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const pause = () => new Promise(resolve => setTimeout(resolve, 45));
function load() {
  const fields = { 'df-marks': { value: 'LIFECYCLE MARKS' }, 'df-remark': { value: 'LIFECYCLE REMARK' }, 'audit-opinion': { value: '请核对包装', classList: { add() {} }, focus() {} } };
  const c = vm.createContext({ AppUI: {}, App: { user: null, rerender() {} },
    document: { addEventListener() {}, getElementById(id) { return fields[id] || null; } }, location: { hash: '' },
    setTimeout(fn, delay) { return setTimeout(fn, Math.min(delay || 0, 8)); },
    sessionStorage: { getItem() { return null; } }, localStorage: { getItem() { return null; } } });
  c.window = c;
  for (const name of ['mock-data', 'utils', 'views-core', 'views-docs']) vm.runInContext(fs.readFileSync(path.join(root, 'js', name + '.js'), 'utf8'), c, { filename: name });
  c.toasts = [];
  c.U.toast = (text, type) => { c.toasts.push({ text, type }); };
  c.confirmations = [];
  c.U.confirm = opts => { c.confirmations.push(opts); };
  c.fields = fields;
  c.App.user = c.U.roleUser('doc');
  return c;
}
function button(d) {
  const classes = new Set();
  return { dataset: { id: d.id }, innerHTML: '测试按钮', classList: { contains(k) { return classes.has(k); }, add(k) { classes.add(k); }, remove(k) { classes.delete(k); } } };
}
function doc(c, status, type = 'CI') {
  const source = c.MOCK.documents.find(d => d.type === type && !c.MOCK.documents.some(x => x.orderId === d.orderId && x.type === d.type && x.version > d.version));
  source.status = status;
  c.U.order(source.orderId).status = '执行中';
  c.MOCK.approvals = c.MOCK.approvals.filter(a => a.targetId !== source.id);
  return source;
}
function business(c) { return JSON.stringify({ docs: c.MOCK.documents, approvals: c.MOCK.approvals, orders: c.MOCK.orders, payments: c.MOCK.payments, logs: c.MOCK.orderLogs }); }
function finance(c) { return JSON.stringify({ orders: c.MOCK.orders.map(o => ({ id: o.id, items: o.items, currency: o.currency })), payments: c.MOCK.payments }); }
async function confirm(c) { await c.confirmations.at(-1).onOk(); await pause(); }
(async () => {
  const initial = load();
  let checks = 0;
  // 取消两态、权限和旧版均不能依赖隐藏按钮；直接调用动作也要零写入。
  const actions = ['doc-edit', 'doc-save-draft', 'doc-submit', 'doc-revise', 'doc-reform', 'doc-approve', 'doc-reject', 'doc-export'];
  for (const orderState of ['取消申请中', '已取消']) {
    for (const action of actions) {
      const c = load(); const d = doc(c, action.includes('approve') || action.includes('reject') ? '待审核' : action.includes('revise') || action.includes('export') ? '已通过' : action.includes('reform') ? '已退回' : '草稿');
      c.App.user = c.U.roleUser(action.includes('approve') || action.includes('reject') ? 'boss' : 'doc');
      c.U.order(d.orderId).status = orderState; c.AppUI.docEditing = d.id;
      const before = business(c);
      c.Actions[action](button(d));
      if (c.confirmations.length) await confirm(c);
      await pause();
      assert.equal(business(c), before, `${orderState}/${action}: 零业务写入`);
      assert.equal(c.confirmations.length, 0, `${orderState}/${action}: 不开放确认`);
      assert.ok(c.toasts.some(t => t.text.includes(orderState)), '解释具体订单状态'); checks++;
    }
  }
  assert.equal(typeof initial.U.documentPolicy, 'function', '共享资格入口必须存在');
  for (const action of actions) {
    const c = load(); const d = doc(c, action.includes('approve') || action.includes('reject') ? '待审核' : '已通过');
    c.App.user = c.U.roleUser('admin'); c.AppUI.docEditing = d.id;
    const before = business(c); c.Actions[action](button(d)); await pause();
    assert.equal(business(c), before, `admin/${action}: 没有业务动作`); checks++;
  }
  // 正常提交、双确认和审批通过/退回；金额和收款永不联动。
  for (const pass of [true, false]) {
    const c = load(); const d = doc(c, '草稿'); const frozen = JSON.stringify(d.snapshot); const money = finance(c);
    c.AppUI.docEditing = d.id;
    c.Actions['doc-submit'](button(d)); const first = c.confirmations.at(-1);
    c.Actions['doc-submit'](button(d)); const second = c.confirmations.at(-1);
    await Promise.all([first.onOk(), second.onOk()]); await pause();
    assert.equal(d.status, '待审核');
    assert.equal(c.MOCK.approvals.filter(a => a.targetId === d.id && a.status === '待处理').length, 1);
    c.App.user = c.U.roleUser('boss');
    c.Actions[pass ? 'doc-approve' : 'doc-reject'](button(d)); await confirm(c);
    assert.equal(d.status, pass ? '已通过' : '已退回');
    assert.equal(c.MOCK.approvals.find(a => a.targetId === d.id).status, d.status);
    assert.equal(JSON.stringify(d.snapshot), frozen); assert.equal(finance(c), money); checks++;
  }
  // 先打开确认再更改身份/对象/版本/订单/单证状态/制作人，捕获的动作必须失效。
  for (const action of ['doc-submit', 'doc-revise', 'doc-reform', 'doc-approve', 'doc-reject']) {
    for (const mutation of ['role', 'actor', 'doc-status', 'order-status', 'version', 'object', 'association', 'maker']) {
      const c = load(); const d = doc(c, action === 'doc-submit' ? '草稿' : action === 'doc-revise' ? '已通过' : action === 'doc-reform' ? '已退回' : '待审核');
      c.App.user = c.U.roleUser(action.includes('approve') || action.includes('reject') ? 'boss' : 'doc');
      c.Actions[action](button(d)); assert.ok(c.confirmations.length, `${action} 可打开确认`);
      if (mutation === 'role') c.App.user = c.U.roleUser('fin');
      if (mutation === 'actor') c.App.user = { ...c.App.user, id: 'OTHER', name: '其他操作者' };
      if (mutation === 'doc-status') d.status = '制作中';
      if (mutation === 'order-status') c.U.order(d.orderId).status = '已取消';
      if (mutation === 'version') c.MOCK.documents.push({ ...d, id: 'NEWEST', version: d.version + 1 });
      if (mutation === 'object') c.MOCK.documents[c.MOCK.documents.indexOf(d)] = JSON.parse(JSON.stringify(d));
      if (mutation === 'association') d.orderId = c.MOCK.orders.find(o => o.id !== d.orderId).id;
      if (mutation === 'maker') d.maker = 'CHANGED MAKER';
      const before = business(c); await confirm(c);
      assert.equal(business(c), before, `${action}/${mutation}: 延迟确认原子拒绝`); checks++;
    }
  }
  // save/export 真正等待 Promise 和定时器，中间改变状态或角色必须无留痕/成功反馈。
  for (const action of ['doc-save-draft', 'doc-export']) {
    for (const mutation of ['role', 'cancel', 'object', 'new-version']) {
      const c = load(); const d = doc(c, action === 'doc-export' ? '已通过' : '草稿'); c.AppUI.docEditing = d.id;
      c.Actions[action](button(d));
      if (action === 'doc-export') await new Promise(resolve => setTimeout(resolve, 2));
      if (mutation === 'role') c.App.user = c.U.roleUser('admin');
      if (mutation === 'cancel') c.U.order(d.orderId).status = '取消申请中';
      if (mutation === 'object') c.MOCK.documents[c.MOCK.documents.indexOf(d)] = JSON.parse(JSON.stringify(d));
      if (mutation === 'new-version') c.MOCK.documents.push({ ...d, id: 'NEW-ASYNC', version: d.version + 1 });
      const before = business(c); await pause();
      assert.equal(business(c), before, `${action}/${mutation}: 异步重查拒绝`);
      assert.ok(!c.toasts.some(t => t.type !== 'warning' && t.type !== 'error' && /已保存|已导出|导出演示已完成/.test(t.text))); checks++;
    }
  }
  for (const role of ['doc', 'boss', 'fin', 'sales']) {
    const c = load(); const d = doc(c, '已通过'); c.App.user = c.U.roleUser(role); const before = d.history.length;
    c.Actions['doc-export'](button(d)); c.Actions['doc-export'](button(d)); await pause();
    assert.equal(d.history.length, before + 1, `${role}: 跨按钮重复导出只留一次`);
    assert.ok(c.toasts.some(t => /未生成真实文件/.test(t.text))); checks++;
  }
  // 旧版、版本冲突、重制待处理以及不能自制自审。
  const c = load(); const d = doc(c, '已通过'); const old = d;
  c.Actions['doc-revise'](button(d)); await confirm(c); const newest = c.MOCK.documents.at(-1);
  assert.ok(!c.U.documentPolicy(old, c.App.user).canRevise && !c.U.documentPolicy(old, c.App.user).canExport);
  newest.status = '待审核'; newest.maker = c.U.roleUser('boss').name;
  assert.ok(!c.U.documentPolicy(newest, c.U.roleUser('boss')).canAudit);
  c.MOCK.documents.push({ ...newest, id: 'CONFLICT' });
  const conflict = c.U.documentPolicy(newest, c.App.user);
  assert.ok(conflict.versionConflict && !conflict.canEdit && !conflict.canExport);
  const multi = load(); const md = doc(multi, '草稿'); multi.MOCK.documents.push({ ...md, id: 'MULTI-NO', no: 'ANOTHER-NO', version: md.version + 1 });
  assert.ok(multi.U.documentPolicy(md, multi.App.user).versionConflict);
  const reform = load(); const rd = doc(reform, '已退回');
  reform.Actions['doc-reform'](button(rd)); await confirm(reform);
  assert.ok(!reform.U.documentPolicy(rd, reform.App.user).canReform);
  const before = business(reform); reform.Actions['doc-reform'](button(rd)); await pause(); assert.equal(business(reform), before);
  for (const status of ['草稿', '制作中', '已退回']) {
    const saved = load(); const sd = doc(saved, status); const money = finance(saved); const prior = sd.history.length;
    saved.AppUI.docEditing = sd.id;
    saved.Actions['doc-save-draft'](button(sd)); saved.Actions['doc-save-draft'](button(sd));
    saved.Actions['doc-submit'](button(sd));
    assert.equal(saved.confirmations.length, 0, '保存排队期间跨动作送审也拒绝');
    await pause();
    assert.equal(sd.marks, 'LIFECYCLE MARKS'); assert.equal(sd.history.length, prior + 1);
    assert.equal(finance(saved), money, '保存不联动金额/收款'); checks++;
  }
  const race = load(); const ad = doc(race, '待审核'); race.App.user = race.U.roleUser('boss');
  race.Actions['doc-approve'](button(ad)); const passConfirm = race.confirmations.at(-1);
  race.Actions['doc-reject'](button(ad)); const rejectConfirm = race.confirmations.at(-1);
  const auditHistory = ad.history.length;
  await Promise.all([passConfirm.onOk(), rejectConfirm.onOk()]); await pause();
  assert.equal(ad.status, '已通过'); assert.equal(ad.history.length, auditHistory + 1, '通过/退回两弹窗竞争只处理一次'); checks++;
  const self = load(); const selfDoc = doc(self, '待审核'); self.App.user = self.U.roleUser('boss'); selfDoc.maker = self.App.user.name;
  self.Actions['doc-approve'](button(selfDoc)); assert.equal(self.confirmations.length, 0, '直接动作拒绝自制自审');
  const historic = load(); const hd = doc(historic, '已通过');
  historic.MOCK.documents.push({ ...hd, id: 'HIGHEST', version: hd.version + 1, status: '草稿' });
  for (const action of actions) {
    historic.App.user = historic.U.roleUser(action.includes('approve') || action.includes('reject') ? 'boss' : 'doc');
    const before = business(historic); historic.Actions[action](button(hd)); await pause();
    assert.equal(business(historic), before, `${action}: 历史版不允许任何业务动作`); checks++;
  }
  console.log(`PASS: document lifecycle ${checks} async role/state/cancellation/race cases + normal transitions, immutable snapshots, finance isolation, latest/conflict/reform/audit/export rules (Node VM only)`);
})().catch(error => { console.error(error); process.exitCode = 1; });
