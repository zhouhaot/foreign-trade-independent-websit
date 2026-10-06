/* 会话退出回归：隔离 Node VM + 最小 DOM 桩，不替代浏览器或后端鉴权验收。 */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const appSource = fs.readFileSync(path.join(root, 'js/app.js'), 'utf8');
assert.ok(!appSource.includes('role-switcher'), '运行代码已移除直接角色切换入口及处理器');

function fixture() {
  const handlers = {}, timers = [], elements = {};
  const storage = () => {
    const values = new Map();
    return { getItem: key => values.get(key) || null, setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key) };
  };
  function node(id, value = '') {
    const result = {
      id, value, dataset: {}, disabled: false, innerHTML: '', inert: false,
      classList: { add() {}, remove() {}, contains() { return false; } },
      querySelectorAll: () => [], setAttribute() {}, focus() {},
      get firstElementChild() { return this.innerHTML ? {} : null; }
    };
    elements[id] = result;
    return result;
  }
  const app = node('app'), modal = node('modal-root');
  const workspace = node('workspace'), nav = node('nav'), topbar = node('topbar'), flowbar = node('flowbar');
  node('login-account', 'demo'); node('login-password', 'demo123');
  const picker = node('login-role', 'sales');
  picker.dataset.action = 'login-pick-role';
  node('login-role-hint');
  const submit = node('login-submit');
  const context = vm.createContext({
    console, Promise, sessionStorage: storage(), localStorage: storage(),
    location: { hash: '#/login' }, scrollY: 0, scrollTo() {},
    matchMedia: () => ({ matches: true }),
    addEventListener(type, listener) { (handlers[type] ||= []).push(listener); },
    setTimeout(fn) { timers.push(fn); },
    document: {
      title: '', body: { style: {} }, activeElement: null,
      addEventListener(type, listener) { (handlers[type] ||= []).push(listener); },
      getElementById: id => elements[id] || null,
      querySelectorAll: () => [],
      querySelector(selector) {
        if (selector === '.login-box') return {};
        if (!app.innerHTML.includes('class="layout')) return null;
        return { '.workspace': workspace, '.nav': nav, '.topbar': topbar, '.flowbar': flowbar }[selector] || null;
      }
    }
  });
  context.window = context;
  for (const file of ['mock-data', 'utils', 'views-core']) {
    vm.runInContext(fs.readFileSync(path.join(root, 'js', file + '.js'), 'utf8'), context, { filename: file });
  }
  let confirmation;
  context.U.confirm = options => { confirmation = options; modal.innerHTML = 'confirmation'; app.inert = true; };
  context.U.clearErrors = () => {};
  context.U.validate = () => true;
  context.U.toast = () => {};
  context.U.withLoading = (button, action) => action();
  vm.runInContext(appSource, context, { filename: 'app.js' });
  return {
    context, app, modal, picker, submit, handlers,
    get confirmation() { return confirmation; },
    login(role) {
      assert.equal(context.location.hash, '#/login');
      picker.value = role; picker.disabled = false;
      context.Actions['login-submit'](submit);
      while (timers.length) timers.shift()();
      context.App.rerender();
    }
  };
}

for (const role of ['admin', 'sales', 'doc', 'fin', 'boss']) {
  const test = fixture(), { context: c, app, modal } = test;
  test.login(role);
  const original = c.U.currentUser();
  assert.equal(original.role, role, role + ': 通过登录动作进入');
  assert.match(app.innerHTML, /class="current-role"/, role + ': 角色仅作为文本展示');
  assert.ok(!app.innerHTML.includes('role-switcher'), role + ': 没有直接角色控件');
  const profile = c.U.roleUser(role);
  assert.ok(app.innerHTML.includes('>' + profile.initials + '</span>'), role + ': 保留姓名缩写');
  assert.ok(app.innerHTML.includes('>' + profile.account + '</span>'), role + ': 保留既有账号');
  for (const change of test.handlers.change) change({ target: { id: 'role-switcher', value: 'boss', dataset: {} } });
  assert.equal(c.U.currentUser().id, original.id, role + ': 旧控件事件不会改写会话');

  c.location.hash = '#/login'; c.App.rerender();
  assert.equal(c.location.hash, '#/dashboard', role + ': 已登录不能绕过退出进入登录页换身份');
  c.App.rerender();
  c.AppUI.docEditing = 'D-VERIFY'; c.AppUI.searchIndex = 3;
  c.AppUI.orders = { filters: { kw: 'PRIVATE SAMPLE' } }; c.AppUI.sidebarCollapsed = true;
  const dataBefore = JSON.stringify(c.MOCK);
  c.Actions.logout();
  assert.equal(c.U.currentUser().id, original.id, role + ': 尚未确认/取消退出时保留身份');
  assert.equal(c.AppUI.docEditing, 'D-VERIFY', role + ': 尚未确认时保留编辑状态');
  c.U.closeModal(); // 模拟取消，不执行确认回调。
  assert.equal(c.U.currentUser().id, original.id, role + ': 取消退出保留会话');
  c.Actions.logout(); test.confirmation.onOk();
  assert.equal(c.U.currentUser(), null, role + ': 退出后无任何会话来源');
  assert.equal(c.App.user, null, role + ': 即时清除运行中身份');
  assert.equal(c.sessionStorage.getItem('trade_demo_user'), null);
  assert.equal(c.localStorage.getItem('trade_demo_user'), null);
  assert.equal(c.__demoUser, null);
  assert.deepEqual(Object.keys(c.AppUI), ['sidebarCollapsed'], role + ': 清理上一身份临时状态，仅保留布局偏好');
  assert.equal(c.location.hash, '#/login');
  assert.ok(app.innerHTML.includes('id="login-role"'), role + ': 即时渲染登录页');
  assert.equal(modal.innerHTML, '', role + ': 关闭确认弹窗');
  assert.equal(app.inert, false, role + ': 登录页恢复可操作');
  assert.equal(JSON.stringify(c.MOCK), dataBefore, role + ': 退出不改业务样例');

  for (const route of ['#/dashboard', '#/orders', '#/system/users']) {
    c.location.hash = route; c.App.rerender();
    assert.equal(c.location.hash, '#/login', role + ': 退出后返回受限路由仍需登录');
    assert.equal(c.App.user, null);
    assert.ok(!app.innerHTML.includes('class="layout'), role + ': 不显示工作区');
    c.App.rerender();
  }
  test.login(role === 'boss' ? 'sales' : 'boss');
  assert.notEqual(c.U.currentUser().id, original.id, role + ': 重新提交登录后才得到新身份');
}
console.log('PASS: five-role read-only identity, cancellation/logout, storage and transient state clearing, protected-route return, and re-login (Node VM)');
