/* A 方案回归：只在 VM 副本中验证选择、过滤、分页及角色动作，不替代浏览器。 */
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const nodes = {};
const picks = [];
const modes = [];
const draftInput = { value: '尚未提交的客户筛选' };
const doc = {
  addEventListener() {},
  getElementById(id) { return nodes[id]; },
  querySelectorAll(selector) { return selector === '.order-pick' ? picks : modes; }
};
const context = vm.createContext({ document: doc, App: { user: null }, AppUI: {}, location: { hash: '#/orders' }, setTimeout() {} });
context.window = context;
for (const name of ['mock-data', 'utils', 'views-core', 'views-sales']) {
  vm.runInContext(fs.readFileSync(path.join(root, 'js', name + '.js'), 'utf8'), context, { filename: name });
}
const { Views, Actions, U, MOCK } = context;
const dataBefore = JSON.stringify(MOCK);
function node(dataset = {}) {
  return { dataset, hidden: false, innerHTML: '', attrs: {}, classes: new Set(),
    setAttribute(name, value) { this.attrs[name] = value; },
    classList: { toggle(name, on) { return on; } } };
}
for (const role of ['sales', 'doc', 'fin', 'boss']) {
  context.App.user = U.roleUser(role);
  context.AppUI.orders = { page: 1, filters: { no: 'SO2026001' } };
  const html = Views.orders();
  assert.match(html, /id="orders-split-view"/);
  assert.match(html, /id="orders-table-view" hidden/);
  assert.match(html, /<h4>订单进度<\/h4>/);
  assert.match(html, /<h4>单证进度<\/h4>/);
  assert.match(html, /<h4>收款进度<\/h4>/);
  assert.match(html, /24,100\.00/);
  assert.match(html, /12,000\.00/);
  assert.match(html, /12,100\.00/);
  assert.match(html, /aria-valuenow="50"/);
  assert.equal((html.match(/class="order-pick selected"/g) || []).length, 1);
  assert.equal(html.includes('查看待审单证'), role === 'boss');
  assert.equal(html.includes('查看关联单证'), role === 'doc');
  assert.equal(html.includes('登记收款'), role === 'fin');
  assert.ok(!html.includes('直接新建订单'));
}
context.App.user = U.roleUser('doc');
context.AppUI.orders = { page: 1, filters: { no: 'SO2026005' } };
assert.match(Views.orders(), /href="#\/documents\/D-PL2026004-V1">修订退回单证/);
context.App.user = U.roleUser('boss');
context.AppUI.orders = { page: 1, filters: {} };
Views.orders();
assert.equal(context.AppUI.orders.visibleIds.length, 6, '保留每页六条的既有分页');
context.AppUI.orders.page = 2;
let html = Views.orders();
assert.equal(context.AppUI.orders.visibleIds.length, 1);
assert.equal(context.AppUI.orders.selectedId, 'SO2026004', '换页时选择当前页可见订单');
assert.match(html, /30,500\.00/);
context.AppUI.orders.filters = { no: 'NONE' };
html = Views.orders();
assert.equal(context.AppUI.orders.selectedId, null);
assert.match(html, /暂无可查看的订单/);
assert.ok(!html.includes('查看完整订单'), '空结果不能保留陈旧详情动作');
context.AppUI.orders = { page: 1, filters: {} };
Views.orders();
for (const id of ['order-inspector', 'orders-split-view', 'orders-table-view', 'orders-stage', 'order-selection-status']) nodes[id] = node();
nodes['o-cust'] = draftInput;
for (const id of context.AppUI.orders.visibleIds) picks.push(node({ id }));
for (const view of ['split', 'table']) modes.push(node({ view }));
Actions['orders-select'](node({ id: 'SO2026001' }));
assert.equal(context.AppUI.orders.selectedId, 'SO2026001');
assert.match(nodes['order-inspector'].innerHTML, /24,100\.00/);
assert.match(nodes['order-selection-status'].textContent, /已选择订单 SO2026001/);
assert.equal(picks.filter(p => p.attrs['aria-pressed']).length, 1);
Actions['orders-select'](node({ id: 'SO2026004' }));
assert.equal(context.AppUI.orders.selectedId, 'SO2026001', '不能选择不在当前页的订单');
Actions['orders-view'](node({ view: 'table' }));
assert.equal(nodes['orders-split-view'].hidden, true);
assert.equal(nodes['orders-table-view'].hidden, false);
Actions['orders-view'](node({ view: 'split' }));
assert.equal(nodes['orders-split-view'].hidden, false);
assert.equal(nodes['o-cust'], draftInput, '不重建筛选节点');
assert.equal(draftInput.value, '尚未提交的客户筛选');
assert.equal(context.AppUI.orders.selectedId, 'SO2026001');
context.App.user = U.roleUser('admin');
Actions['orders-select'](node({ id: 'SO2026003' }));
assert.equal(context.AppUI.orders.selectedId, 'SO2026001', '管理员不进入订单选择流程');
assert.equal(JSON.stringify(MOCK), dataBefore, '视觉操作不修改业务样例');
console.log('PASS: A workspace role actions, independent progress and currencies, selection/page/filter empty state, view toggles, draft-input preservation, and unchanged business data (Node VM)');
