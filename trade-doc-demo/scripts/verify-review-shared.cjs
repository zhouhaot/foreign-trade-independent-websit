'use strict';
/* 2026-10-14 review: actual app/actions + Node DOM fixture. No browser-layout claims. */
const assert = require('node:assert/strict');
const { fixture } = require('./verify-document-workspace.cjs');
const files = ['views-sales', 'views-docs', 'views-fin', 'views-stats', 'views-system', 'app'];
let checks = 0;
const pass = () => { checks++; };
function enter(role, hash = '#/dashboard') {
  const t = fixture(files, {}, { history: true });
  t.c.U.setUser(t.c.U.roleUser(role)); t.c.App.requestNavigation(hash); return t;
}
function change(t, node) { for (const fn of t.handlers.change || []) fn({ target: node }); }
const text = node => node ? String(node.textContent || '') + node.children.map(text).join('') : '';
async function run() {
  for (const role of ['admin', 'sales', 'doc', 'fin', 'boss']) {
    const t = enter(role), before = JSON.stringify(t.c.MOCK);
    const select = t.document.getElementById('demo-role-switch'); assert.ok(select);
    const next = role === 'sales' ? 'boss' : 'sales';
    t.c.AppUI.secretFilter = 'previous actor'; t.c.AppUI.docEditing = 'OLD';
    select.value = next; change(t, select);
    assert.equal(t.c.App.user.role, next); assert.equal(t.c.location.hash, '#/dashboard');
    assert.equal(t.c.AppUI.secretFilter, undefined); assert.equal(t.c.AppUI.docEditing, undefined);
    assert.equal(JSON.stringify(t.c.MOCK), before, 'switch keeps all submitted memory data'); pass();
  }
  const dirty = enter('sales', '#/quotes/Q2026004/edit');
  const input = dirty.document.getElementById('qe-remark'), oldForm = dirty.document.getElementById('qe-form');
  input.value += ' 未保存'; input.focus();
  let select = dirty.document.getElementById('demo-role-switch'); select.value = 'doc'; change(dirty, select);
  assert.equal(dirty.c.App.user.role, 'sales'); assert.equal(select.value, 'sales');
  dirty.click(dirty.modal.querySelector('[data-close]')); await dirty.flush();
  assert.equal(dirty.document.getElementById('qe-form'), oldForm); assert.match(input.value, /未保存/);
  select.value = 'doc'; change(dirty, select); dirty.click(dirty.modal.querySelector('[data-ok]')); await dirty.flush();
  assert.equal(dirty.c.App.user.role, 'doc'); assert.equal(dirty.c.App.hasDraftChanges(), false); pass();
  const stale = enter('sales', '#/quotes/Q2026004/edit');
  stale.document.getElementById('qe-remark').value += ' dirty';
  const staleSelect = stale.document.getElementById('demo-role-switch'); staleSelect.value = 'doc'; change(stale, staleSelect);
  stale.c.U.roleUser('doc').enabled = false;
  stale.click(stale.modal.querySelector('[data-ok]')); await stale.flush();
  assert.equal(stale.c.App.user.role, 'sales'); assert.match(stale.messages.at(-1).text, /账号已变化/);
  assert.equal(stale.c.App.hasDraftChanges(), true, 'failed switch must not clear dirty baseline'); pass();

  const admin = enter('admin', '#/system/roles');
  const matrixBefore = JSON.stringify(admin.c.MOCK.permMatrix);
  for (const [r, m] of [['admin', '审核与异常'], ['sales', '工作台'], ['admin', '系统管理'], ['__proto__', '销售业务'], ['sales', '未知模块']]) {
    change(admin, { dataset: { action: 'sys-perm', role: r, module: m }, checked: true });
    assert.equal(JSON.stringify(admin.c.MOCK.permMatrix), matrixBefore); pass();
  }
  for (const [role, module, route] of [['sales', '销售业务', '#/quotes'], ['sales', '客户与商品', '#/customers'],
    ['doc', '单证管理', '#/documents'], ['fin', '收款与应收', '#/payments'], ['boss', '统计分析', '#/stats'],
    ['boss', '审核与异常', '#/approvals'], ['sales', '订单详情', '#/orders']]) {
    const t = enter('admin', '#/system/roles');
    change(t, { dataset: { action: 'sys-perm', role, module }, checked: false });
    assert.equal(t.c.U.moduleEnabled(role, module), false);
    const switcher = t.document.getElementById('demo-role-switch'); switcher.value = role; change(t, switcher);
    assert.equal(t.c.App.canVisit(route, role), false);
    assert.equal(t.document.querySelector('.nav').querySelector('a[href="' + route + '"]'), null);
    t.c.App.requestNavigation(route); assert.ok(t.document.querySelector('.forbidden')); pass();
    t.c.App.requestNavigation('#/dashboard'); t.c.Actions['search-open']();
    const query = t.document.getElementById('workspace-search'); query.value = route === '#/orders' ? 'SO2026001' : module === '销售业务' ? '报价' : module;
    for (const fn of t.handlers.input || []) fn({ target: query });
    const links = t.document.querySelectorAll('[data-action="search-goto"]');
    assert.ok(links.every(n => t.c.App.canVisit(n.dataset.link, role))); pass();
  }
  for (const role of ['sales', 'doc', 'fin', 'boss']) {
    const t = enter(role), before = JSON.stringify(t.c.MOCK);
    change(t, { dataset: { action: 'sys-perm', role: 'admin', module: '审核与异常' }, checked: true });
    change(t, { dataset: { action: 'sys-toggle-user', id: 'U003' }, checked: false });
    t.c.Actions['sys-reset-pwd']({ dataset: { id: 'U003' } });
    assert.equal(JSON.stringify(t.c.MOCK), before); pass();
  }
  for (const role of ['doc', 'fin', 'boss']) {
    const t = enter(role); assert.equal(t.c.App.canVisit('#/products/P001', role), true);
    t.c.MOCK.permMatrix[role] = t.c.MOCK.permMatrix[role].filter(m => m !== '订单详情');
    assert.equal(t.c.App.canVisit('#/products/P001', role), false); pass();
  }
  const todo = enter('sales');
  const list = todo.c.U.todosFor('sales', '陈明');
  assert.ok(list.some(t => t.text.includes('INQ2026006'))); assert.ok(!list.some(t => t.text.includes('INQ2026005'))); pass();
  const dash = todo.c.Views.dashboard({ user: todo.c.App.user });
  assert.ok(dash.indexOf('class="card work-queue') < dash.indexOf('class="card recent-orders')); pass();

  for (const role of ['sales', 'doc', 'fin', 'boss']) {
    const t = enter(role, '#/orders/SO2026001'), head = t.document.querySelector('.order-head-card'), tabs = t.document.querySelector('.tabs'), body = t.document.getElementById('order-tab-body');
    const scrolls = []; t.c.scrollY = 310; t.c.scrollTo = (x, y) => { scrolls.push([x, y]); t.c.scrollY = y; };
    for (const key of ['items', 'docs', 'pay', 'changes', 'logs', 'overview']) {
      t.c.App.requestNavigation('#/orders/SO2026001?tab=' + key);
      assert.equal(t.document.querySelector('.order-head-card'), head); assert.equal(t.document.querySelector('.tabs'), tabs);
      assert.equal(t.document.getElementById('order-tab-body'), body);
      assert.equal(t.c.scrollY, 310); assert.equal(tabs.querySelector('.active').dataset.tab, key);
      assert.equal(tabs.querySelector('.active').getAttribute('aria-pressed'), 'true'); pass();
    }
    assert.ok(scrolls.every(p => p[1] === 310));
    t.c.MOCK.permMatrix[role] = t.c.MOCK.permMatrix[role].filter(m => m !== '订单详情');
    t.c.App.requestNavigation('#/orders/SO2026001?tab=items'); assert.ok(t.document.querySelector('.forbidden')); pass();
  }
  const invalid = enter('boss', '#/approvals'); invalid.c.Actions['ap-handle']({ dataset: { id: 'AP20260903' } });
  const approve = invalid.modal.querySelector('[data-act="approve"]');
  assert.match(invalid.modal.firstElementChild.innerHTML, /data-act="approve" disabled/); assert.match(text(invalid.modal.querySelector('[data-act="reject"]')), /退回修改/);
  const before = JSON.stringify(invalid.c.MOCK); invalid.click(approve); await invalid.flush();
  assert.equal(JSON.stringify(invalid.c.MOCK), before); pass();
  console.log('PASS: ' + checks + ' review shared scenarios (real app/actions, Node fixture; no pixel claims)');
}
run().catch(error => { console.error(error); process.exitCode = 1; });
