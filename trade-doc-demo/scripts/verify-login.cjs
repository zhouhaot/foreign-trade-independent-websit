/* 登录下拉选择器回归：Node VM + 最小 DOM 桩，不替代浏览器视觉/原生键盘验收。 */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const sources = ['mock-data', 'utils', 'views-core'].map(name => ({
  name,
  source: fs.readFileSync(path.join(root, 'js', `${name}.js`), 'utf8')
}));

function fixture() {
  const timers = [], elements = {}, toasts = [], users = [];
  let now = 0, rerenders = 0, focus = null;
  function element(id, value = '') {
    const classes = new Set(), attributes = {}, error = { textContent: '' };
    const node = {
      id, value, disabled: false, textContent: '', innerHTML: '', dataset: {},
      classList: {
        add: name => classes.add(name),
        remove: name => classes.delete(name),
        contains: name => classes.has(name),
        toggle(name, force) {
          const selected = force === undefined ? !classes.has(name) : force;
          if (selected) classes.add(name); else classes.delete(name);
          return selected;
        }
      },
      setAttribute: (name, val) => { attributes[name] = String(val); },
      getAttribute: name => attributes[name],
      removeAttribute: name => { delete attributes[name]; },
      closest: selector => selector === '.form-item' ? { querySelector: () => error } : null,
      focus: () => { focus = id; },
      error
    };
    elements[id] = node;
    return node;
  }
  const account = element('login-account', 'demo');
  const password = element('login-password', 'demo123');
  const select = element('login-role', 'sales');
  select.dataset.action = 'login-pick-role';
  const hint = element('login-role-hint');
  const submit = element('login-submit');
  submit.dataset.action = 'login-submit';
  submit.innerHTML = '进入工作台';
  const scope = {
    querySelectorAll(selector) {
      if (selector === '.is-error') return Object.values(elements).filter(el => el.classList.contains('is-error'));
      if (selector === '.field-error') return Object.values(elements).map(el => el.error);
      return [];
    }
  };
  Object.defineProperty(scope, 'innerHTML', { set() { throw new Error('选择角色不得重建登录表单'); } });
  const context = vm.createContext({
    AppUI: {}, App: { rerender() { rerenders++; } }, Promise,
    document: {
      addEventListener() {},
      getElementById: id => elements[id] || null,
      querySelector: selector => selector === '.login-box' ? scope : selector === '[data-action="login-submit"]' ? submit : null,
      querySelectorAll: () => []
    },
    location: { hash: '#/login' },
    setTimeout(fn, delay = 0) { timers.push({ fn, at: now + delay }); return timers.length; }
  });
  context.window = context;
  for (const { name, source } of sources) vm.runInContext(source, context, { filename: `${name}.js` });
  const { U, Views, Actions, MOCK } = context;
  const setUser = U.setUser;
  U.setUser = user => { users.push(user); setUser(user); };
  U.toast = text => toasts.push(text);
  context.AppUI.loginRole = 'sales';
  hint.textContent = '演示部门：' + U.roleUser('sales').dept;
  return {
    context, U, Views, Actions, MOCK, account, password, select, hint, submit, users, toasts,
    get rerenders() { return rerenders; },
    get focus() { return focus; },
    get pendingTimers() { return timers.length; },
    async flush() {
      // withLoading 使用 Promise 链；每次计时回调前后均排空这些微任务。
      for (let i = 0; i < 8; i++) await Promise.resolve();
      while (timers.length) {
        timers.sort((a, b) => a.at - b.at);
        const timer = timers.shift();
        now = timer.at;
        timer.fn();
        for (let i = 0; i < 8; i++) await Promise.resolve();
      }
    }
  };
}

function loginOptions(html) {
  const selects = [...html.matchAll(/<select\b([^>]*)>([\s\S]*?)<\/select>/g)]
    .filter(match => /\bid="login-role"/.test(match[1]));
  assert.equal(selects.length, 1, '登录页只有一个角色下拉选择器');
  assert.match(selects[0][1], /data-action="login-pick-role"/, '通过统一动作委托选择角色');
  assert.match(selects[0][1], /aria-describedby="login-role-hint"/, '下拉控件关联部门说明');
  assert.match(html, /<label\b[^>]*for="login-role"[^>]*>演示角色<\/label>/, '原生选择器有明确标签');
  assert.match(html, /id="login-role-hint"[^>]*aria-live="polite"/, '部门变更有非打断式播报');
  assert.doesNotMatch(html, /class="login-role-button(?:\s|")|\bonclick\s*=/, '不保留旧分段按钮或内联点击');
  return [...selects[0][2].matchAll(/<option\b([^>]*)>([\s\S]*?)<\/option>/g)].map(match => ({
    value: /\bvalue="([^"]+)"/.exec(match[1])?.[1],
    selected: /\bselected(?:\s|=|$)/.test(match[1]),
    text: match[2]
  }));
}

async function main() {
  const f = fixture();
  const roles = Object.keys(f.MOCK.roles);
  assert.equal(roles.length, 5, '保持五类演示角色');
  for (const role of [undefined, ...roles, 'unknown-role', '__proto__']) {
    if (role === undefined) delete f.context.AppUI.loginRole;
    else f.context.AppUI.loginRole = role;
    const html = f.Views.login();
    const options = loginOptions(html);
    assert.deepEqual(options.map(option => option.value), roles, '选项与样例角色一致');
    const expectedRole = roles.includes(role) ? role : 'sales';
    assert.deepEqual(options.filter(option => option.selected).map(option => option.value), [expectedRole], '默认或已有角色恰好选中一项，非法状态回退业务员');
    for (const option of options) {
      const name = f.U.roleUser(option.value).name, roleName = f.MOCK.roles[option.value];
      assert.equal(option.text, name === roleName ? roleName : `${roleName} · ${name}`, '选项显示角色与姓名，同名不重复');
    }
    assert.ok(html.includes('演示部门：' + f.U.roleUser(expectedRole).dept), '初始说明与选中角色一致');
  }
  console.log('PASS: five-role dropdown template, default selection, label and department hint');

  f.account.value = 'preserve-account';
  f.password.value = 'preserve-password';
  const accountNode = f.account, passwordNode = f.password;
  for (const role of roles) {
    f.select.value = role;
    f.Actions['login-pick-role'](f.select, { type: 'change' });
    assert.equal(f.context.AppUI.loginRole, role, '选择更新当前角色状态');
    assert.equal(f.hint.textContent, '演示部门：' + f.U.roleUser(role).dept, '部门说明跟随角色');
    assert.equal(f.context.document.getElementById('login-account'), accountNode, '保留账号节点');
    assert.equal(f.context.document.getElementById('login-password'), passwordNode, '保留密码节点');
    assert.equal(f.account.value, 'preserve-account', '保留账号输入');
    assert.equal(f.password.value, 'preserve-password', '保留密码输入');
    assert.equal(f.rerenders, 0, '角色选择不触发整页重建');
  }
  const beforeRole = f.context.AppUI.loginRole, beforeHint = f.hint.textContent;
  f.select.value = 'sales';
  f.Actions['login-pick-role'](f.select, { type: 'click' });
  assert.equal(f.context.AppUI.loginRole, beforeRole, '仅打开选择器不改变角色状态');
  assert.equal(f.hint.textContent, beforeHint, '仅打开选择器不改变说明');
  f.select.disabled = true;
  f.select.value = 'sales';
  f.Actions['login-pick-role'](f.select);
  assert.equal(f.context.AppUI.loginRole, beforeRole, '禁用控件不能改变角色');
  assert.equal(f.hint.textContent, beforeHint, '禁用控件不能改变说明');
  f.select.disabled = false;
  for (const invalid of ['', 'unknown-role', '__proto__', 'constructor', 'toString']) {
    f.select.value = invalid;
    f.Actions['login-pick-role'](f.select);
    assert.equal(f.context.AppUI.loginRole, beforeRole, '非法角色不能写入当前状态');
    assert.equal(f.hint.textContent, beforeHint, '非法角色不能改变说明');
  }
  console.log('PASS: role changes preserve inputs; clicks, disabled and invalid selections cannot mutate state');

  for (const role of roles) {
    const login = fixture();
    login.select.value = role;
    login.Actions['login-pick-role'](login.select);
    // 故意留下与可见选项不同的旧状态，证明提交读取当前 select.value。
    login.context.AppUI.loginRole = role === 'sales' ? 'admin' : 'sales';
    login.Actions['login-submit'](login.submit);
    assert.equal(login.context.AppUI.loginRole, role, `${role}: 提交同步角色状态`);
    assert.equal(login.select.disabled, true, `${role}: 提交中禁用角色选择`);
    assert.equal(login.submit.classList.contains('is-loading'), true, `${role}: 按钮进入 loading`);
    const timerCount = login.pendingTimers;
    login.Actions['login-submit'](login.submit);
    assert.equal(login.pendingTimers, timerCount, `${role}: 重复提交不创建额外导航计时器`);
    await login.flush();
    assert.equal(login.users.length, 1, `${role}: 仅写入一次演示身份`);
    const expected = login.U.roleUser(role), actual = login.users[0];
    for (const key of ['id', 'name', 'role', 'dept']) assert.equal(actual[key], expected[key], `${role}: 身份 ${key} 匹配可见选项`);
    assert.equal(actual.roleName, login.MOCK.roles[role], `${role}: 中文角色名一致`);
    assert.equal(login.U.currentUser().id, expected.id, `${role}: 会话回读一致`);
    assert.equal(login.context.location.hash, '#/dashboard', `${role}: 登录后进入工作台`);
    assert.equal(login.toasts.length, 1, `${role}: 只有一次成功反馈`);
  }
  console.log('PASS: five-role login identity, visible selection as source of truth, and duplicate-submit guard');

  for (const [field, label] of [['account', '账号'], ['password', '密码']]) {
    const login = fixture();
    login[field].value = '   ';
    login.Actions['login-submit'](login.submit);
    await login.flush();
    assert.equal(login.users.length, 0, `${label}: 空字段不登录`);
    assert.equal(login.context.location.hash, '#/login', `${label}: 留在登录页`);
    assert.equal(login[field].error.textContent, label + '为必填项', `${label}: 错误明确到字段`);
    assert.equal(login[field].getAttribute('aria-invalid'), 'true', `${label}: 标识无效输入`);
    assert.equal(login.focus, login[field].id, `${label}: 聚焦错误字段`);
    assert.equal(login.select.disabled, false, `${label}: 校验失败仍可选择角色`);
    assert.equal(login.submit.classList.contains('is-loading'), false, `${label}: 校验失败不进入提交态`);
  }
  console.log('PASS: account/password required validation and no login on invalid fields');
  for (const invalid of ['', 'unknown-role', '__proto__', 'constructor', 'toString']) {
    const login = fixture();
    login.select.value = invalid;
    login.Actions['login-submit'](login.submit);
    await login.flush();
    assert.equal(login.users.length, 0, '无效角色不能登录');
    assert.equal(login.context.location.hash, '#/login', '无效角色不导航');
    assert.equal(login.context.AppUI.loginRole, 'sales', '无效角色不写入状态');
    assert.equal(login.select.disabled, false, '无效角色可重新选择');
    assert.equal(login.focus, 'login-role', '无效角色聚焦选择器');
    assert.deepEqual(login.toasts, ['请选择有效的演示角色'], '无效角色有明确错误提示');
  }
  console.log('PASS: invalid-role submit rejection, feedback and focus');
  console.log('Scope: Node VM template/action checks only; native select interaction and visual layout require browser verification.');
}

main().catch(error => { console.error(error); process.exitCode = 1; });
