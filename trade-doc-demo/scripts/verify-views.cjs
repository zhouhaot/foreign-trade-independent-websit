/* 静态视图回归：在 Node VM 中逐角色生成 HTML，不模拟浏览器布局或点击。 */
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const files = ['mock-data', 'utils', 'views-core', 'views-sales', 'views-docs', 'views-fin', 'views-stats', 'views-system'];
const context = vm.createContext({
  AppUI: {}, App: { user: null, rerender() {} },
  document: { addEventListener() {} },
  location: { hash: '#/dashboard' },
  setTimeout() {},
  sessionStorage: { getItem() { return null; }, setItem() {}, removeItem() {} }
});
context.window = context;
for (const name of files) {
  vm.runInContext(fs.readFileSync(path.join(root, 'js', `${name}.js`), 'utf8'), context, { filename: name });
}
const { MOCK: data, Views, U } = context.window;
const routes = [
  ['dashboard'], ['customers'], ['customerDetail', data.customers[0].id],
  ['products'], ['productDetail', data.products[0].id],
  ['inquiries'], ['inquiryDetail', data.inquiries[0].id],
  ['quotes'], ['quoteDetail', data.quotes[0].id], ['quoteEdit', data.quotes[3].id],
  ['orders'], ['orderDetail', data.orders[0].id],
  ['documents'], ['docDetail', data.documents[0].id],
  ['payments'], ['approvals'], ['stats'],
  ['sysUsers'], ['sysRoles'], ['sysDicts']
];
let count = 0;
for (const role of Object.keys(data.roles)) {
  const user = U.roleUser(role);
  context.window.App.user = user;
  context.window.AppUI = {};
  for (const [view, id] of routes) {
    const html = Views[view]({ params: id ? [id] : [], query: {}, user });
    assert.equal(typeof html, 'string', `${role}/${view}: HTML string`);
    assert.ok(html.length > 50, `${role}/${view}: nonempty HTML`);
    assert.ok(!/\bonclick\s*=/.test(html), `${role}/${view}: no inline onclick`);
    count++;
  }
}
console.log(`PASS: ${count} role/view render combinations (Node VM; no browser layout or interaction)`);

/* 核对关键确认动作的取消、重复调用和金额关系；只改变 VM 内样例副本。 */
const { Actions } = context.window;
let confirmation;
U.confirm = opts => { confirmation = opts; };
U.toast = () => {};
context.window.App.user = U.roleUser('sales');
const quote = { ...data.quotes[0], id: 'Q-VERIFY', orderId: null };
data.quotes.push(quote);
const orderCount = data.orders.length;
Actions['quote-gen-order']({ dataset: { id: quote.id } });
assert.equal(data.orders.length, orderCount, '取消生成订单不改变数据');
confirmation.onOk();
assert.equal(data.orders.length, orderCount + 1, '确认后仅新增一笔订单');
assert.equal(U.orderTotal(data.orders.at(-1)), U.quoteTotal(quote), '新增订单与报价金额一致');
Actions['quote-gen-order']({ dataset: { id: quote.id } });
assert.equal(data.orders.length, orderCount + 1, '重复生成不新增订单');

context.window.App.user = U.roleUser('doc');
const approved = data.documents.find(d => d.status === '已通过' && !data.documents.some(x => x.no === d.no && x.version === d.version + 1));
assert.ok(approved, '存在可修订样例');
const original = JSON.stringify(approved);
const docCount = data.documents.length;
Actions['doc-revise']({ dataset: { id: approved.id } });
assert.equal(data.documents.length, docCount, '取消受控修订不新增版本');
confirmation.onOk();
assert.equal(data.documents.length, docCount + 1, '确认后新增一个单证版本');
assert.equal(JSON.stringify(approved), original, '原版本未覆盖');
assert.equal(data.documents.at(-1).version, approved.version + 1, '版本号递增');
confirmation.onOk();
assert.equal(data.documents.length, docCount + 1, '重复确认不新增同版单证');
console.log('PASS: quotation/order and controlled document revision cancellation, reconciliation, and repeat guards');

/* 连续切换角色时保留残余编辑状态，并验证保存动作本身拒绝越权写入。 */
const editFields = {
  'df-marks': { value: 'VERIFY MARKS' },
  'df-remark': { value: 'VERIFY REMARK' },
  'df-pk-cartons': { value: '9' },
  'df-pk-package': { value: 'VERIFY PACKAGE' }
};
context.document.getElementById = id => editFields[id] || null;
U.withLoading = (button, fn) => fn();
const editableStatuses = ['草稿', '制作中', '已退回'];
for (const type of ['CI', 'PL']) {
  const sample = data.documents.find(d => d.type === type);
  assert.ok(sample, `存在 ${type} 单证样例`);
  const draft = JSON.parse(JSON.stringify(sample));
  draft.id = `D-VERIFY-${type}`;
  draft.no = `VERIFY-${type}`;
  draft.status = '草稿';
  data.documents.push(draft);
  const button = { dataset: { id: draft.id } };
  context.App.user = U.roleUser('doc');
  Actions['doc-edit'](button);
  assert.equal(context.AppUI.docEditing, draft.id, `${type}: 单证员可进入编辑`);
  for (const role of ['doc', 'boss', 'sales', 'fin', 'admin', 'doc']) {
    context.App.user = U.roleUser(role);
    const html = Views.docDetail({ params: [draft.id], query: {}, user: context.App.user });
    assert.equal(/id="df-/.test(html), role === 'doc', `${type}/${role}: 残余编辑状态遵循当前角色权限`);
    if (role !== 'doc') {
      const before = JSON.stringify(draft);
      Actions['doc-save-draft'](button);
      assert.equal(JSON.stringify(draft), before, `${type}/${role}: 直接保存不能更改字段或留痕`);
      assert.equal(context.AppUI.docEditing, draft.id, `${type}/${role}: 验证期间确实保留残余编辑状态`);
    }
  }
  for (const status of [...editableStatuses, '待审核', '已通过']) {
    draft.status = status;
    context.AppUI.docEditing = draft.id;
    const html = Views.docDetail({ params: [draft.id], query: {}, user: context.App.user });
    assert.equal(/id="df-/.test(html), editableStatuses.includes(status), `${type}/${status}: 编辑字段遵循版本状态`);
    const before = JSON.stringify(draft);
    const orderBefore = JSON.stringify(U.order(draft.orderId));
    const historyCount = draft.history.length;
    Actions['doc-save-draft'](button);
    if (editableStatuses.includes(status)) {
      assert.equal(draft.marks, editFields['df-marks'].value, `${type}/${status}: 正常保存唛头`);
      assert.equal(draft.remark, editFields['df-remark'].value, `${type}/${status}: 正常保存备注`);
      assert.equal(draft.history.length, historyCount + 1, `${type}/${status}: 正常保存留痕`);
      assert.equal(context.AppUI.docEditing, null, `${type}/${status}: 保存后退出编辑`);
    } else {
      assert.equal(JSON.stringify(draft), before, `${type}/${status}: 不可编辑版本不能直接保存`);
      context.AppUI.docEditing = null;
      Actions['doc-edit'](button);
      assert.equal(context.AppUI.docEditing, null, `${type}/${status}: 不可直接进入编辑`);
    }
    assert.equal(JSON.stringify(U.order(draft.orderId)), orderBefore, `${type}/${status}: 核心交易数据保持只读`);
  }
  draft.status = '草稿';
  context.App.user = U.roleUser('boss');
  context.AppUI.docEditing = null;
  Actions['doc-edit'](button);
  assert.equal(context.AppUI.docEditing, null, `${type}: 非单证员不能直接进入编辑`);

  let queuedSave;
  U.withLoading = (button, fn) => { queuedSave = fn; };
  context.App.user = U.roleUser('doc');
  context.AppUI.docEditing = draft.id;
  const beforeDeferredSave = JSON.stringify(draft);
  Actions['doc-save-draft'](button);
  assert.equal(typeof queuedSave, 'function', `${type}: 正常角色的保存已排队`);
  context.App.user = U.roleUser('fin');
  queuedSave();
  assert.equal(JSON.stringify(draft), beforeDeferredSave, `${type}: 保存执行前角色改变仍拒绝写入`);
  U.withLoading = (button, fn) => fn();
}
console.log('PASS: CI/PL document editing and saving enforce role, version status, and deferred role changes');
