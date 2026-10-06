/* 单证快照回归：Node VM 内真实视图/动作，非浏览器视觉与真实历史恢复。 */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
function load() {
  let currentOverlay = null;
  const c = vm.createContext({ AppUI: {}, App: { user: null, rerender() {} },
    document: { addEventListener() {}, getElementById() { return null; } },
    location: { hash: '' }, setTimeout() {},
    sessionStorage: { getItem() { return null; }, setItem() { throw new Error('快照禁止写入存储'); } },
    localStorage: { getItem() { return null; }, setItem() { throw new Error('快照禁止写入存储'); } } });
  c.window = c;
  for (const name of ['mock-data', 'utils', 'views-core', 'views-docs', 'views-fin']) {
    vm.runInContext(fs.readFileSync(path.join(root, 'js', `${name}.js`), 'utf8'), c, { filename: name });
  }
  c.App.user = c.U.roleUser('doc');
  c.U.toast = () => {};
  c.U.withLoading = (btn, fn) => fn();
  c.U.confirm = options => { c.confirmation = options; };
  // 快照业务桩模型化当前源；真正的 DOM 保留/关闭保护在 modal-drafts 专项中验证。
  c.U.isModalCurrent = overlay => currentOverlay === overlay;
  c.U.bindModalDraft = (overlay, options) => { overlay.draftControls = options.controls; return true; };
  c.U.setModalBusy = (overlay, busy) => { if (busy && (overlay.busy || currentOverlay !== overlay)) return false; overlay.busy = busy; return true; };
  c.U.markModalDraftClean = overlay => { overlay.cleaned = true; };
  c.U.closeModal = overlay => { if (!overlay || currentOverlay === overlay) currentOverlay = null; };
  c.U.openModal = () => {
    const controls = {};
    const error = { textContent: '' }, item = { querySelector: () => error };
    const opinion = { id: 'ap-opinion', isConnected: true, value: '', classList: { add() {}, remove() {} }, setAttribute() {}, removeAttribute() {}, focus() {}, closest: () => item, parentElement: item };
    const overlay = {
      querySelectorAll() {
        return ['approve', 'reject'].map(act => ({ dataset: { act }, classList: { contains() { return false; }, add() {}, remove() {} }, addEventListener(event, fn) { controls[act] = fn; } }));
      },
      querySelector(selector) { return selector === '#ap-opinion' ? opinion : { textContent: '' }; }
    };
    c.modalControls = controls;
    currentOverlay = overlay;
    return overlay;
  };
  return c;
}
const c = load();
const { MOCK: M, U, Views, Actions } = c;
function paper(doc) {
  const html = Views.docDetail({ params: [doc.id], query: {}, user: c.App.user });
  return html.slice(html.indexOf('<div class="paper">'), html.indexOf('<div class="card mt16">'));
}
function json(value) { return JSON.stringify(value); }
assert.equal(typeof U.captureDocumentSnapshot, 'function', '新单证拥有明确冻结入口');
assert.ok(M.documents.every(d => d.snapshot && d.snapshot.basis === 'demo-baseline'), '初始化冻结全部演示版本');
const before = new Map(M.documents.map(d => [d.id, { paper: paper(d), snapshot: json(d.snapshot) }]));
const listBefore = Views.documents();
const mockSource = fs.readFileSync(path.join(root, 'js', 'mock-data.js'), 'utf8');
assert.ok(!/snapshot\s*:/.test(mockSource), 'Mock 源码不伪造历史快照');
// 模拟主数据/订单发生所有纸张引用字段的变化，包括数量、价格、币种和整组商品替换。
for (const o of M.orders) {
  o.items.forEach(it => { it.qty += 13; it.price += 0.37; });
  o.items.push({ productId: M.products[0].id, qty: 1, price: 0.01 });
  o.currency = o.currency === 'USD' ? 'EUR' : 'USD';
  o.customerId = M.customers[5].id;
  o.tradeTerm = 'SNAPSHOT TEST TERMS';
  o.paymentTerm = 'SNAPSHOT TEST PAYMENT';
  o.deliveryDate = '2030-01-01';
}
for (const customer of M.customers) {
  for (const key of ['nameEn', 'nameCn', 'addr', 'contact']) customer[key] = `CHANGED ${key}`;
}
for (const product of M.products) {
  for (const key of ['nameEn', 'nameCn', 'spec', 'unit']) product[key] = `CHANGED ${key}`;
}
for (const key of ['nameEn', 'nameCn', 'addrEn', 'tel']) M.seller[key] = `CHANGED ${key}`;
for (const d of M.documents) {
  assert.equal(paper(d), before.get(d.id).paper, `${d.id}: 历史 CI/PL 纸张不随主数据漂移`);
  assert.equal(json(d.snapshot), before.get(d.id).snapshot, `${d.id}: 冻结数据未改变`);
  assert.ok(Object.isFrozen(d.snapshot.order.items[0].product), `${d.id}: 商品嵌套对象冻结`);
  assert.throws(() => { d.snapshot.order.items[0].price = 999; }, { name: 'TypeError' }, '快照不允许隐式编辑');
  assert.throws(() => { d.snapshot = {}; }, { name: 'TypeError' }, '快照属性不允许覆盖');
}
assert.equal(Views.documents(), listBefore, '单证台账客户名称也使用版本快照');
const approved = M.documents.find(d => d.status === '已通过' && !M.documents.some(x => x.no === d.no && x.version > d.version));
const originalDoc = json(approved);
for (const role of ['admin', 'boss', 'sales', 'fin']) {
  c.App.user = U.roleUser(role);
  c.confirmation = null;
  Actions['doc-revise']({ dataset: { id: approved.id } });
  assert.equal(c.confirmation, null, `${role}: 直接修订入口拒绝越权`);
  assert.equal(json(approved), originalDoc);
}
c.App.user = U.roleUser('doc');
Actions['doc-revise']({ dataset: { id: approved.id } });
const blockedCount = M.documents.length;
c.App.user = U.roleUser('boss');
assert.equal(c.confirmation.onOk(), false, '确认前角色变化拒绝修订');
assert.equal(M.documents.length, blockedCount);
c.App.user = U.roleUser('doc');
Actions['doc-revise']({ dataset: { id: approved.id } });
assert.equal(json(approved), originalDoc, '取消修订无写入');
c.confirmation.onOk();
const revision = M.documents.at(-1);
assert.equal(json(revision.snapshot), json(approved.snapshot), 'H07 包装备注修订沿用旧版交易');
assert.notEqual(revision.snapshot, approved.snapshot, '新旧快照无共享引用');
assert.notEqual(revision.snapshot.order.items[0].product, approved.snapshot.order.items[0].product, '嵌套商品也独立');
assert.equal(json(approved), originalDoc, 'V1 全对象不被创建 V2 改写');
const count = M.documents.length;
c.confirmation.onOk();
assert.equal(M.documents.length, count, '重复确认不产生新版本');
// H10：已有 V2 后，V1只读；不能从历史版本继续分叉修订。
c.confirmation = null;
Actions['doc-revise']({ dataset: { id: approved.id } });
assert.equal(c.confirmation, null, '旧版修订入口拒绝');
assert.equal(M.documents.length, count, '旧版修订不能新增分叉');
// 保存新版本的包装/备注不改旧版和核心快照；核心交易不出现编辑 input。
c.AppUI.docEditing = revision.id;
c.document.getElementById = id => ({ 'df-marks': { value: 'NEW MARKS' }, 'df-remark': { value: 'NEW REMARK' }, 'df-pk-cartons': { value: '12' } }[id] || null);
const inherited = json(revision.snapshot);
Actions['doc-save-draft']({ dataset: { id: revision.id } });
assert.equal(json(revision.snapshot), inherited, '修订保存不改快照');
assert.equal(json(approved), originalDoc, '修订保存不改旧版');
for (const role of Object.keys(M.roles)) {
  c.App.user = U.roleUser(role);
  c.AppUI.docEditing = revision.id;
  const html = Views.docDetail({ params: [revision.id], query: {}, user: c.App.user });
  assert.equal(/id="df-/.test(html), role === 'doc', `${role}: 编辑字段角色范围不扩大`);
  assert.ok(!/id="df-(?:currency|price|qty|customer|product)/.test(html), '交易字段始终只读');
  if (role !== 'doc') {
    const prior = json(revision);
    Actions['doc-save-draft']({ dataset: { id: revision.id } });
    assert.equal(json(revision), prior, `${role}: 直接保存拒绝越权`);
  }
}
// 只有当前 V2 经审核通过后，合法受控修订才分配 V3；快照仍继承且无共享引用。
c.App.user = U.roleUser('doc');
revision.status = '已通过';
Actions['doc-revise']({ dataset: { id: revision.id } });
c.confirmation.onOk();
assert.equal(M.documents.at(-1).version, revision.version + 1, '合法最新链修订分配下一版本');
assert.equal(json(M.documents.at(-1).snapshot), inherited, '合法V3仍继承核心交易');
assert.equal(json(approved), originalDoc, 'V3创建仍不改原V1');
// 新创建单证用当前交易，后续源数据改动仍不能更新它。
const created = JSON.parse(json(approved));
created.id = 'D-SNAPSHOT-NEW';
created.no = 'SNAPSHOT-NEW';
U.captureDocumentSnapshot(created);
M.documents.push(created);
assert.equal(created.snapshot.basis, 'creation');
assert.equal(created.snapshot.order.currency, U.order(created.orderId).currency);
assert.equal(U.orderTotal(created.snapshot.order), U.orderTotal(U.order(created.orderId)), '新单证金额勾稽且币种一致');
const createdPaper = paper(created);
U.order(created.orderId).items[0].price += 5;
assert.equal(paper(created), createdPaper, '新单证冻结后也不漂移');
// finance 批准重新制单必须重新捕获当前交易，保留旧版数据和包装。
const request = M.approvals.find(a => a.type === '重新制单申请');
assert.ok(request, '存在真实重新制单样例入口');
const rejected = U.doc(request.targetId);
const rejectedBefore = json(rejected);
c.App.user = U.roleUser('boss');
c.document.getElementById = () => null;
Actions['ap-handle']({ dataset: { id: request.id } });
c.modalControls.approve();
const reformed = M.documents.at(-1);
assert.equal(reformed.orderId, rejected.orderId);
assert.equal(reformed.snapshot.basis, 'creation', '重新制单捕获当前交易');
assert.equal(reformed.snapshot.order.currency, U.order(rejected.orderId).currency);
assert.equal(U.orderTotal(reformed.snapshot.order), U.orderTotal(U.order(rejected.orderId)), '重新制单金额匹配当前订单');
assert.notEqual(json(reformed.snapshot), json(rejected.snapshot), '重新制单与旧版快照来源不同');
assert.equal(json(rejected), rejectedBefore, '重新制单不修改旧版');
const afterReform = M.documents.length;
c.modalControls.approve();
assert.equal(M.documents.length, afterReform, '审批重复确认不重复创建');
const reformedPaper = paper(reformed);
U.order(rejected.orderId).items[0].qty += 200;
M.seller.nameEn = 'SECOND CHANGE';
assert.equal(paper(reformed), reformedPaper, '重新制单创建后同样冻结');
// 捕获失败在 finance 批准前暴露，申请和单证不能产生半次更新。
const failedRequest = JSON.parse(json(request));
failedRequest.id = 'AP-SNAPSHOT-FAIL';
failedRequest.status = '待处理';
failedRequest.handler = null;
M.approvals.push(failedRequest);
U.order(rejected.orderId).customerId = 'MISSING-CUSTOMER';
const failedBefore = json(failedRequest);
Actions['ap-handle']({ dataset: { id: failedRequest.id } });
c.modalControls.approve();
assert.equal(json(failedRequest), failedBefore, '快照捕获失败不写审批状态/人/时间');
assert.equal(M.documents.length, afterReform, '快照捕获失败不创建版本');
assert.equal(json(rejected), rejectedBefore, '快照捕获失败不动历史版本');
// 主数据被删除也不影响旧纸张，证明没有隐藏的 live 查询。
M.customers.length = 0;
M.products.length = 0;
M.orders.length = 0;
for (const d of M.documents.slice(0, before.size)) assert.equal(paper(d), before.get(d.id).paper, '主数据删除后历史纸张仍可读');
const fresh = load();
for (const d of fresh.MOCK.documents) {
  assert.equal(json(d.snapshot.order), json(JSON.parse(before.get(d.id).snapshot).order), '刷新重新从未变更的样例建立基线');
}
assert.equal(fresh.MOCK.documents.length, before.size, '刷新还原样例，不持久化新版本');
console.log('PASS: all demo CI/PL snapshots survive seller/customer/product/order mutation; inherited revision, finance recreation, immutable detached copies, role edit bounds, totals/currency, refresh reset (Node VM only)');
