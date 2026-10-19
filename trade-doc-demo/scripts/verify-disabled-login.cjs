'use strict';
// Actual system toggle/logout/login actions in the shared Node DOM fixture; no browser claims.
const assert = require('node:assert/strict');
const { fixture } = require('./verify-document-workspace.cjs');
let cases = 0;
function enter(role, route) {
  const t = fixture(['views-system', 'app'], {}, { history: true });
  t.c.U.setUser(t.c.U.roleUser(role)); t.c.App.requestNavigation(route); return t;
}
async function run() {
  for (const role of ['doc', 'fin', 'boss', 'sales']) {
    const t = enter('admin', '#/system/users');
    for (const user of t.c.MOCK.users.filter(u => u.role === role && u.enabled)) {
      const control = t.document.getElementById('sys-enabled-' + user.id);
      control.checked = false; (t.handlers.change || []).forEach(fn => fn({ target: control }));
      assert.equal(user.enabled, false);
    }
    t.c.Actions.logout(); t.click(t.modal.querySelector('[data-ok]')); await t.flush();
    assert.equal(t.c.App.user, null); assert.equal(t.c.location.hash, '#/login');
    const html = t.c.Views.login();
    assert.match(html, new RegExp('<option value="' + role + '"[^>]* disabled>'));
    assert.match(html, /无启用账号/); assert.ok(t.document.getElementById('login-role'));
    assert.equal(t.document.getElementById('sys-enabled-U004'), null, 'old admin DOM removed');
    const select = t.document.getElementById('login-role'); select.value = 'admin';
    t.c.Actions['login-pick-role'](select, { type: 'change' });
    t.c.Actions['login-submit'](t.document.querySelector('[data-action="login-submit"]')); await t.flush();
    assert.equal(t.c.U.currentUser().role, 'admin', 'remaining enabled account can login without refreshing mock'); cases++;
  }
  const empty = enter('admin', '#/system/users'); empty.c.MOCK.users.forEach(u => { u.enabled = false; });
  empty.c.U.clearUser(); empty.c.App.user = null;
  assert.match(empty.c.Views.login(), /暂无启用的演示账号/);
  assert.match(empty.c.Views.login(), /data-action="login-submit" disabled/); cases++;
  for (const when of ['before-submit', 'before-microtask', 'before-navigation']) {
    const t = enter('admin', '#/system/users'); t.c.U.clearUser(); t.c.App.user = null;
    t.c.App.requestNavigation('#/login');
    const select = t.document.getElementById('login-role'); select.value = 'doc';
    const user = t.c.U.roleUser('doc');
    if (when === 'before-submit') user.enabled = false;
    t.c.Actions['login-submit'](t.document.querySelector('[data-action="login-submit"]'));
    if (when === 'before-navigation') { for (let i = 0; i < 8; i++) await Promise.resolve(); }
    user.enabled = false; await t.flush();
    assert.equal(t.c.U.currentUser(), null); assert.equal(t.c.location.hash, '#/login');
    assert.notEqual(select.disabled, true); cases++;
  }
  for (const when of ['before-microtask', 'before-navigation', 'same-role-new-session']) {
    const t = enter('admin', '#/system/users'); t.c.U.clearUser(); t.c.App.user = null;
    t.c.App.requestNavigation('#/login');
    const select = t.document.getElementById('login-role'); select.value = 'doc';
    t.c.Actions['login-submit'](t.document.querySelector('[data-action="login-submit"]'));
    if (when !== 'before-microtask') { for (let i = 0; i < 8; i++) await Promise.resolve(); }
    const replacement = Object.assign({}, t.c.U.roleUser(when === 'same-role-new-session' ? 'doc' : 'boss'), { dept: 'SYNTHETIC_NEW_SESSION' });
    t.c.U.setUser(replacement);
    if (when === 'same-role-new-session') t.c.App.requestNavigation('#/dashboard');
    await t.flush();
    assert.equal(t.c.U.currentUser().dept, replacement.dept, 'stale login cannot overwrite or clear newer identity');
    assert.equal(t.c.location.hash, when === 'same-role-new-session' ? '#/dashboard' : '#/login'); cases++;
  }
  console.log(JSON.stringify({ result: 'PASS', cases, scope: 'disabled/empty role login and delayed identity recheck; Node DOM only' }));
}
run().catch(e => { console.error(e); process.exitCode = 1; });
