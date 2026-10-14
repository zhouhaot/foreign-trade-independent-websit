'use strict';
// 真实 Views/Actions + 最小 DOM；不是浏览器布局或正式签发认证。
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { fixture } = require('./verify-document-workspace.cjs');
function setup() {
  const t = fixture(['views-docs', 'app']);
  t.c.App.user = t.c.U.roleUser('doc');
  t.c.location.hash = '#/orders/SO2026003';
  t.order = t.c.U.order('SO2026003');
  t.el = t.document.createElement('button'); t.el.setAttribute('data-action', 'doc-create'); t.el.dataset.action = 'doc-create'; t.el.dataset.order = t.order.id;
  t.app.appendChild(t.el);
  return t;
}
const state = t => JSON.stringify(t.c.MOCK);
async function create(t) { t.c.Actions['doc-create'](t.el); await t.flush(); }
function paper(t, d) {
  const html = t.c.Views.docDetail({ params: [d.id], query: {}, user: t.c.App.user });
  return html.slice(html.indexOf('<div class="paper">'), html.indexOf('<div class="card mt16">'));
}
function freshPL(t, source, id) {
  const d = JSON.parse(JSON.stringify(source)); delete d.snapshot; d.id = id; d.version++;
  t.c.U.captureDocumentSnapshot(d, 'creation'); t.c.MOCK.documents.push(d); return d;
}
async function run() {
  let checks = 0;
  assert.equal(typeof setup().c.Actions['doc-create'], 'function', '首制必须为真实 Action，而非空链接'); checks++;
  const t = setup(), original = JSON.parse(state(t)); await create(t);
  const docs = t.c.MOCK.documents.filter(d => d.orderId === t.order.id);
  t.c.Views.docDetail({ params: [docs.find(d => d.type === 'CI').id], query: {}, user: t.c.App.user });
  assert.equal(docs.length, 2); assert.deepEqual(Array.from(docs, d => d.type).sort(), ['CI', 'PL']); checks += 2;
  for (const d of docs) {
    assert.equal(d.version, 1); assert.equal(d.status, '草稿'); assert.equal(d.maker, t.c.App.user.name);
    assert.equal(d.snapshot.basis, 'creation'); assert.ok(Object.isFrozen(d.snapshot.order));
    assert.equal(d.snapshot.order.id, t.order.id); assert.equal(d.id, 'D-' + d.no + '-V1');
    assert.match(d.no, new RegExp('^' + d.type + new Date().getFullYear() + '\\d{3,}$'));
    assert.ok(Object.values(d.packing).every(v => v === ''), '首制不编造实际包装值'); checks += 9;
  }
  assert.notEqual(docs[0].snapshot, docs[1].snapshot); assert.notEqual(docs[0].snapshot.order, t.order);
  assert.equal(t.order.docStatus, '制作中'); assert.equal(t.c.AppUI.docEditing, docs.find(d => d.type === 'CI').id);
  assert.equal(JSON.stringify(t.c.MOCK.documents.slice(0, original.documents.length)), JSON.stringify(original.documents), '旧版本/快照/history完整保留');
  assert.equal(JSON.stringify(t.c.MOCK.payments), JSON.stringify(original.payments)); checks += 6;
  const initialCI = docs.find(d => d.type === 'CI'), initialPL = docs.find(d => d.type === 'PL');
  assert.equal(initialPL.snapshot.invoiceReference.status, 'linked');
  assert.equal(initialPL.snapshot.invoiceReference.docId, initialCI.id); assert.equal(initialPL.snapshot.invoiceReference.no, initialCI.no);
  assert.equal(initialPL.snapshot.invoiceReference.version, initialCI.version); assert.ok(Object.isFrozen(initialPL.snapshot.invoiceReference)); checks += 5;
  const frozen = JSON.stringify(docs[0].snapshot); t.order.items[0].price = 10; assert.equal(JSON.stringify(docs[0].snapshot), frozen); checks++;
  const beforeCount = t.c.MOCK.documents.length; await create(t); assert.equal(t.c.MOCK.documents.length, beforeCount); checks++;
  const partial = setup(); partial.c.MOCK.documents.push(...docs.filter(d => d.type === 'PL').map(d => JSON.parse(JSON.stringify(d))));
  const prior = JSON.stringify(partial.c.MOCK.documents); await create(partial);
  assert.equal(partial.c.MOCK.documents.filter(d => d.orderId === partial.order.id).length, 2);
  assert.equal(JSON.stringify(partial.c.MOCK.documents.slice(0, -1)), prior); checks += 2;
  for (const change of ['sales', 'boss', 'fin', 'admin', 'unknown', 'disabled', 'cancelled', 'cancelling', 'pending-cancel', 'missing-customer', 'missing-product', 'missing-quote', 'bad-amount']) {
    const x = setup();
    if (['sales', 'boss', 'fin', 'admin'].includes(change)) x.c.App.user = x.c.U.roleUser(change);
    if (change === 'unknown') x.c.App.user = { id: 'fake', name: '王芳', role: 'doc', enabled: true };
    if (change === 'disabled') x.c.App.user.enabled = false;
    if (change === 'cancelled') x.order.status = '已取消';
    if (change === 'cancelling') x.order.status = '取消申请中';
    if (change === 'pending-cancel') x.c.MOCK.approvals.push({ targetType: 'order', targetId: x.order.id, type: '取消申请', status: '待处理' });
    if (change === 'missing-customer') x.order.customerId = 'missing';
    if (change === 'missing-product') x.order.items[0].productId = 'missing';
    if (change === 'missing-quote') x.order.quoteId = 'missing';
    if (change === 'bad-amount') x.order.items[0].price = Infinity;
    const before = state(x); await create(x); assert.equal(state(x), before, change + '零写'); checks++;
  }
  for (const change of ['actor-reference', 'order-reference', 'order-content', 'customer', 'product', 'seller', 'route', 'new-doc', 'new-cancel', 'source-node', 'source-target']) {
    const x = setup(); x.c.Actions['doc-create'](x.el);
    if (change === 'actor-reference') x.c.App.user = { ...x.c.App.user };
    if (change === 'order-reference') x.c.MOCK.orders[x.c.MOCK.orders.indexOf(x.order)] = { ...x.order };
    if (change === 'order-content') x.order.remark += ' changed';
    if (change === 'customer') x.c.U.customer(x.order.customerId).nameCn += ' changed';
    if (change === 'product') x.c.U.product(x.order.items[0].productId).nameEn += ' changed';
    if (change === 'seller') x.c.MOCK.seller.nameEn += ' changed';
    if (change === 'route') x.c.location.hash = '#/documents';
    if (change === 'new-doc') x.c.MOCK.documents.push({ ...docs[0], id: 'conflict', orderId: x.order.id });
    if (change === 'new-cancel') x.c.MOCK.approvals.push({ targetType: 'order', targetId: x.order.id, type: '取消申请', status: '待处理' });
    if (change === 'source-node') x.el.remove();
    if (change === 'source-target') x.el.dataset.order = 'SO2026005';
    const before = state(x); await x.flush(); assert.equal(state(x), before, '延迟' + change + '零写'); checks++;
  }
  const double = setup(); double.c.Actions['doc-create'](double.el); double.c.Actions['doc-create'](double.el); await double.flush();
  assert.equal(double.c.MOCK.documents.filter(d => d.orderId === double.order.id).length, 2); checks++;
  const atomic = setup(), capture = atomic.c.U.captureDocumentSnapshot; let captures = 0;
  atomic.c.U.captureDocumentSnapshot = (...args) => { if (++captures === 2) throw new Error('second snapshot refused'); return capture(...args); };
  const atomicBefore = state(atomic); await create(atomic); assert.equal(state(atomic), atomicBefore, '第二候选失败不能留下第一份单证/日志/订单状态'); checks++;
  for (const collection of ['orders', 'quotes', 'customers', 'products']) {
    const x = setup(), id = collection === 'orders' ? x.order.id : collection === 'quotes' ? x.order.quoteId : collection === 'customers' ? x.order.customerId : x.order.items[0].productId;
    x.c.MOCK[collection].push({ ...x.c.MOCK[collection].find(v => v.id === id) }); const before = state(x);
    await create(x); assert.equal(state(x), before, collection + '主键重复拒绝'); checks++;
  }
  const ledger = setup(); const html = ledger.c.Views.documents({ query: { order: ledger.order.id }, user: ledger.c.App.user });
  assert.match(html, /data-action="doc-create" data-order="SO2026003"/); checks++;
  const pl = setup(); const d = pl.c.MOCK.documents.find(v => v.type === 'PL' && v.orderId === 'SO2026001');
  const ci = pl.c.MOCK.documents.find(v => v.type === 'CI' && v.orderId === d.orderId), originalPaper = paper(pl, d);
  ci.no = 'CI-ACTUAL-888'; assert.equal(paper(pl, d), originalPaper, '已有PL的关联编号属于冻结快照，live CI改号不得改变纸张'); checks++;
  const capturedPL = freshPL(pl, d, 'PL-FROZEN-ASSOCIATION'), capturedPaper = paper(pl, capturedPL);
  assert.match(capturedPaper, /CI-ACTUAL-888/); assert.ok(!capturedPaper.includes(d.no.replace('PL', 'CI') + '</td>'));
  assert.equal(capturedPL.snapshot.invoiceReference.docId, ci.id); assert.equal(capturedPL.snapshot.invoiceReference.version, ci.version); checks += 4;
  ci.no = 'CI-LATER-MUTATION'; assert.equal(paper(pl, capturedPL), capturedPaper, '创建后CI改号不改已冻结PL纸张'); checks++;
  pl.c.MOCK.documents = pl.c.MOCK.documents.filter(v => !(v.type === 'CI' && v.orderId === d.orderId));
  assert.equal(paper(pl, d), originalPaper, '删除live CI不改已有PL纸张'); assert.equal(paper(pl, capturedPL), capturedPaper, '删除live CI不改新PL已冻结关联'); checks += 2;
  const missingPL = freshPL(pl, capturedPL, 'PL-MISSING-ASSOCIATION'), missingPaper = paper(pl, missingPL);
  assert.equal(missingPL.snapshot.invoiceReference.status, 'missing'); assert.match(missingPaper, /未创建关联商业发票/); checks += 2;
  pl.c.MOCK.documents.push({ ...ci }, { ...ci, id: 'SECOND-CONFLICTING-CI', no: 'CI-CONFLICTING-999' });
  assert.equal(paper(pl, d), originalPaper); assert.equal(paper(pl, capturedPL), capturedPaper); assert.equal(paper(pl, missingPL), missingPaper, '后来新建/冲突不能把已冻结的缺失关联偷换成存在'); checks += 3;
  const conflictPL = freshPL(pl, missingPL, 'PL-CONFLICT-ASSOCIATION');
  assert.equal(conflictPL.snapshot.invoiceReference.status, 'conflict'); assert.match(paper(pl, conflictPL), /关联发票编号冲突，待核对/); checks += 2;
  const edit = setup(); const draft = edit.c.MOCK.documents.find(v => v.id === 'D-CI2026004-V1'); edit.mount(draft);
  edit.c.App.rerender = () => { edit.app.innerHTML = edit.c.Views.docDetail({ params: [draft.id], query: {}, user: edit.c.App.user }); };
  edit.c.Actions['doc-edit']({ dataset: { id: draft.id } }); assert.equal(edit.document.activeElement.id, 'df-marks'); checks++;
  const pending = setup(), returned = pending.c.MOCK.documents.find(v => v.id === 'D-PL2026004-V1'); pending.mount(returned);
  assert.equal(pending.c.U.documentPolicy(returned, pending.c.App.user).canEdit, false);
  assert.equal(pending.c.U.documentPolicy(returned, pending.c.App.user).canSubmit, false);
  const pendingBefore = state(pending); pending.c.Actions['doc-edit']({ dataset: { id: returned.id } }); assert.equal(state(pending), pendingBefore); checks += 3;
  pending.c.Actions['doc-submit']({ dataset: { id: returned.id } }); await pending.flush();
  assert.equal(state(pending), pendingBefore, '同源待处理重制时真实送审Action零写'); assert.equal(pending.modal.firstElementChild, null, '不能打开送审确认绕过互斥'); checks += 2;
  const numbers = setup(), packingDoc = numbers.c.MOCK.documents.find(v => v.id === 'D-PL2026001-V1');
  packingDoc.status = '草稿'; numbers.mount(packingDoc, 'doc', true);
  for (const [key, value] of Object.entries({ cartons: '17', package: '纸箱', gw: '1,680', nw: '1540', meas: '8.6' })) numbers.document.getElementById('df-pk-' + key).value = value;
  numbers.c.Actions['doc-save-draft']({ dataset: { id: packingDoc.id }, classList: numbers.el.classList, innerHTML: '' }); await numbers.flush();
  assert.equal(packingDoc.packing.gw, '1,680 KGS'); assert.equal(packingDoc.packing.nw, '1540 KGS'); assert.equal(packingDoc.packing.meas, '8.6 CBM'); checks += 3;
  const compact = setup(), compactDoc = compact.c.MOCK.documents.find(v => v.id === 'D-CI2026004-V1'); compact.mount(compactDoc);
  const directory = compact.document.getElementById('doc-version-directory'), button = compact.document.querySelector('[data-action="doc-directory"]');
  compact.c.Actions['doc-directory'](button); assert.equal(button.getAttribute('aria-expanded'), 'true'); assert.equal(compact.document.getElementById('doc-version-directory'), directory);
  compact.c.Actions['doc-directory'](button); assert.equal(button.getAttribute('aria-expanded'), 'false'); checks += 3;
  const boss = setup(), review = boss.c.MOCK.documents.find(v => v.type === 'CI' && v.orderId === 'SO2026001'); boss.mount(review, 'boss');
  boss.c.Actions['doc-approve']({ dataset: { id: review.id } }); boss.click(boss.modal.querySelector('[data-ok]')); await boss.flush();
  const docHtml = boss.c.Views.docDetail({ params: [review.id], query: {}, user: boss.c.App.user });
  assert.match(docHtml, /继续审核.*PL2026001/); assert.match(docHtml, /返回待审列表/); checks += 2;
  // 真实sessionStorage字符串回读：每次render均JSON.parse出新对象，仍须识别同一稳定身份并完成跨路由编辑/首焦点。
  const appSource = fs.readFileSync(path.resolve(__dirname, '../js/app.js'), 'utf8');
  const session = fixture(['views-sales', 'views-docs', 'app'], { app: appSource + '\nwindow.__reviewDocumentRender = window.App.rerender;' }, { history: true });
  const stored = new Map();
  for (const storage of [session.c.sessionStorage, session.c.localStorage]) {
    storage.getItem = key => stored.get(key) || null; storage.setItem = (key, value) => stored.set(key, String(value)); storage.removeItem = key => stored.delete(key);
  }
  session.c.U.setUser(session.c.U.roleUser('doc')); session.c.App.rerender = session.c.__reviewDocumentRender;
  session.c.App.requestNavigation('#/orders/SO2026003'); const sourceActor = session.c.App.user;
  assert.notEqual(session.c.U.currentUser(), sourceActor, '真实存储解析不会保留对象引用'); checks++;
  session.click(session.app.querySelector('[data-action="doc-create"]')); await session.flush();
  const sessionCI = session.c.MOCK.documents.find(d => d.orderId === 'SO2026003' && d.type === 'CI');
  assert.notEqual(session.c.App.user, sourceActor, '目标页render确已回读新的对象');
  assert.equal(JSON.stringify(session.c.App.user), JSON.stringify(sourceActor), '稳定会话身份签名相同');
  assert.equal(session.c.AppUI.docEditing, sessionCI.id); assert.equal(session.c.location.hash, '#/documents/' + sessionCI.id);
  const sessionMarks = session.document.getElementById('df-marks'); assert.ok(sessionMarks); assert.equal(session.document.activeElement, sessionMarks, '真实挂载后首焦点指向唛头');
  assert.equal(session.c.AppUI.docStartEditing, undefined); assert.equal(session.c.AppUI.docFocusOnMount, undefined); checks += 8;
  for (const changed of ['signature', 'role']) {
    const denied = setup(); await create(denied); const deniedCI = denied.c.MOCK.documents.find(d => d.orderId === denied.order.id && d.type === 'CI');
    denied.c.App.user = changed === 'signature' ? { ...denied.c.App.user, dept: '其他会话上下文' } : denied.c.U.roleUser('boss');
    denied.c.Views.docDetail({ params: [deniedCI.id], query: {}, user: denied.c.App.user });
    assert.notEqual(denied.c.AppUI.docEditing, deniedCI.id, '身份签名或角色漂移不得消费旧编辑票据'); assert.equal(denied.c.AppUI.docStartEditing, undefined); checks += 2;
  }
  console.log('PASS: review document first-create, guards, snapshots, invoice association, edit focus, reform exclusivity and next-review: ' + checks + ' checks (Node DOM fixture only)');
}
module.exports = { run };
if (require.main === module) run().catch(error => { console.error(error); process.exitCode = 1; });
