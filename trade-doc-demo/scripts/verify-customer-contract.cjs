'use strict';
/* 原生 submit 监听器 + 最小 DOM；只验证静态内存资料契约，不替代真实身份/邮箱/数据库验收。 */
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
function fixture(id = 'C001') {
  const handlers = {}, fields = {}, messages = [], clean = [];
  let renders = 0, focused = null;
  function field(id, value) {
    const attrs = {}, classes = new Set(), error = { textContent: '' };
    return { id, value, error, attrs, classList: { add: k => classes.add(k), remove: k => classes.delete(k), contains: k => classes.has(k) },
      setAttribute(k, v) { attrs[k] = String(v); }, getAttribute(k) { return attrs[k] ?? null; }, removeAttribute(k) { delete attrs[k]; },
      focus() { focused = this; }, closest() { return { querySelector: () => error }; } };
  }
  const c = vm.createContext({ console, Promise, AppUI: {}, App: { user: null, rerender() { renders++; }, markDraftClean() { clean.push(JSON.stringify(c.MOCK)); } },
    location: { hash: '#/customers/' + id }, document: { addEventListener(type, fn) { (handlers[type] ||= []).push(fn); }, getElementById: id => fields[id] || null }, setTimeout() {} });
  c.window = c;
  for (const name of ['mock-data', 'utils', 'views-core']) vm.runInContext(fs.readFileSync(path.join(root, 'js', name + '.js'), 'utf8'), c, { filename: name });
  c.App.user = c.U.roleUser('sales'); c.U.toast = (text, type) => messages.push({ text, type });
  const html = c.Views.customerDetail({ params: [id], user: c.App.user, query: {} });
  const customer = c.U.customer(id);
  for (const key of ['id', 'nameCn', 'nameEn', 'country', 'contact', 'email', 'phone', 'level', 'addr', 'remark']) fields['c-' + key] = field('c-' + key, customer[key]);
  fields['cust-effect-error'] = { textContent: '' };
  const dataset = {};
  for (const a of html.matchAll(/data-customer-(id|token)="([^"]*)"/g)) dataset['customer' + a[1][0].toUpperCase() + a[1].slice(1)] = a[2];
  const form = { id: 'cust-form', dataset, isConnected: true,
    querySelector: sel => fields[sel.slice(1)] || null,
    querySelectorAll: sel => sel === '.field-error' ? Object.values(fields).filter(f => f.error).map(f => f.error) : Object.values(fields).filter(f => f.classList?.contains('is-error')) };
  fields['cust-form'] = form;
  return { c, fields, form, html, messages, clean, renders: () => renders, focused: () => focused,
    submit(target = form) { for (const fn of handlers.submit || []) fn({ target, preventDefault() {} }); } };
}
const state = t => JSON.stringify(t.c.MOCK);
(function run() {
  let checks = 0;
  function refused(change, pattern) {
    const t = fixture(); change(t); const before = state(t), fields = t.fields;
    t.submit(); assert.equal(state(t) === before, true, '失败全 MOCK 零写入'); assert.equal(t.renders(), 0, '失败保留原 DOM 和输入'); assert.equal(t.clean.length, 0, '失败不clean');
    assert.equal(t.fields, fields); assert.ok(t.messages.some(m => m.type === 'error'), '失败有可读反馈');
    assert.match(t.fields['cust-effect-error'].textContent, pattern); checks++; return t;
  }
  // 首个 RED: 携 C001 表单、管理员身份、C002 当前 route 必须零写入。
  refused(t => { t.c.App.user = t.c.U.roleUser('admin'); t.c.location.hash = '#/customers/C002'; t.fields['c-nameCn'].value = '管理员错写'; }, /业务员|页面|客户/);
  for (const role of ['boss', 'doc', 'fin', 'admin']) refused(t => { t.c.App.user = t.c.U.roleUser(role); }, /业务员|账号/);
  refused(t => { t.c.App.user = { ...t.c.App.user }; }, /账号|会话/);
  refused(t => { t.c.App.user.name = '另一业务员'; }, /账号|会话/);
  refused(t => { t.c.App.user.id = 'OTHER'; }, /账号|会话/);
  refused(t => { t.c.location.hash = '#/customers/C002'; }, /页面|客户/);
  refused(t => { t.c.location.hash += '?different=1'; }, /页面/);
  refused(t => { t.form.dataset.customerId = 'C002'; }, /资料|绑定|客户/);
  refused(t => { t.form.dataset.customerToken = 'forged'; }, /资料|绑定|客户/);
  refused(t => { t.c.Views.customerDetail({ params: ['C002'], query: {}, user: t.c.App.user }); }, /绑定|页面|客户/);
  refused(t => { t.form.isConnected = false; }, /表单|页面/);
  refused(t => { t.fields['cust-form'] = { ...t.form }; }, /表单|页面/);
  refused(t => { const i = t.c.MOCK.customers.findIndex(x => x.id === 'C001'); t.c.MOCK.customers[i] = { ...t.c.MOCK.customers[i] }; }, /客户.*变化|资料.*变化/);
  refused(t => { t.c.U.customer('C001').phone = '来源已修改'; }, /资料.*变化|客户.*变化/);
  refused(t => { t.c.U.customer('C001').since = '2025-01-01'; }, /资料.*变化|客户.*变化/);
  refused(t => { t.c.MOCK.customers = t.c.MOCK.customers.filter(x => x.id !== 'C001'); }, /客户.*变化|不存在/);
  refused(t => { t.fields['c-id'].value = 'C002'; }, /编号/);
  for (const key of ['nameCn', 'nameEn', 'country', 'contact', 'email']) {
    const t = refused(t => { t.fields['c-' + key].value = '  '; }, /必填/);
    assert.equal(t.fields['c-' + key].value, '  '); assert.equal(t.fields['c-' + key].attrs['aria-invalid'], 'true'); assert.equal(t.focused(), t.fields['c-' + key]);
  }
  for (const email of ['invalid-mail', 'a@@example.com', 'a b@example.com', 'user@', 'user@localhost', 'user@example..com']) refused(t => { t.fields['c-email'].value = email; }, /邮箱/);
  for (const level of ['ROOT', 'A 级', '', 'D']) refused(t => { t.fields['c-level'].value = level; }, /等级/);
  for (const [key, value] of [['phone', 'bad\u0000phone'], ['addr', 'bad\naddress'], ['nameCn', 'bad\nname'], ['remark', 'bad\u0001text']]) refused(t => { t.fields['c-' + key].value = value; }, /文本|控制|单行/);
  refused(t => { t.fields['c-phone'].value = 12; }, /文本/);
  refused(t => { t.fields['c-remark'].value = null; }, /文本/);
  const multiple = refused(t => { t.fields['c-nameCn'].value = '候选中文'; t.fields['c-nameEn'].value = ''; t.fields['c-email'].value = 'invalid-mail'; t.fields['c-level'].value = 'ROOT'; }, /必填.*邮箱.*等级/);
  assert.equal(multiple.c.U.customer('C001').nameCn, '环球贸易公司', '后字段错误不能留下早字段部分写入');
  for (const level of ['A', 'B', 'C']) {
    const t = fixture(), before = JSON.parse(state(t));
    Object.assign(t.fields['c-nameCn'], { value: '  更新客户  ' }); t.fields['c-nameEn'].value = 'Updated Trade';
    t.fields['c-country'].value = '德国'; t.fields['c-contact'].value = 'Hans M'; t.fields['c-email'].value = 'user+trade@example.com';
    t.fields['c-phone'].value = ''; t.fields['c-addr'].value = ''; t.fields['c-level'].value = level; t.fields['c-remark'].value = '第一行\n第二行';
    t.submit(); t.submit(); const after = t.c.U.customer('C001');
    assert.equal(after.nameCn, '更新客户'); assert.equal(after.nameEn, 'Updated Trade'); assert.equal(after.email, 'user+trade@example.com'); assert.equal(after.level, level);
    assert.equal(after.phone, ''); assert.equal(after.addr, ''); assert.equal(after.remark, '第一行\n第二行'); assert.equal(after.id, 'C001'); assert.equal(after.since, before.customers[0].since);
    assert.equal(t.clean.length, 1); assert.equal(t.renders(), 1); assert.equal(t.messages.filter(m => m.text.includes('已保存')).length, 1);
    assert.equal(JSON.parse(t.clean[0]).customers[0].nameCn, '更新客户', '先成功写入后clean');
    const isolated = JSON.parse(state(t)); isolated.customers = before.customers;
    assert.equal(JSON.stringify(isolated), JSON.stringify(before), '仅客户对象变更，订单/报价/单证/收款/日志全不改'); checks++;
  }
  const retry = fixture(); retry.fields['c-email'].value = 'invalid-mail'; retry.submit(); assert.equal(retry.clean.length, 0);
  retry.fields['c-email'].value = 'new@example.com'; retry.submit(); assert.equal(retry.c.U.customer('C001').email, 'new@example.com'); assert.equal(retry.clean.length, 1); checks++;
  const text = fixture(); text.fields['c-nameCn'].value = '<script>plain text</script>'; text.fields['c-phone'].value = '+49 (0) 30 / ext. 2'; text.fields['c-remark'].value = 'x'.repeat(3000);
  text.submit(); assert.equal(text.clean.length, 1, '未增加猜测的业务长度或号码格式限制');
  const escaped = text.c.Views.customerDetail({ params: ['C001'], query: {}, user: text.c.App.user });
  assert.match(escaped, /&lt;script&gt;plain text&lt;\/script&gt;/); assert.doesNotMatch(escaped, /<script>plain text/); checks++;
  for (const role of ['boss', 'doc', 'fin', 'admin']) {
    const t = fixture(); t.c.App.user = t.c.U.roleUser(role);
    const html = t.c.Views.customerDetail({ params: ['C001'], query: {}, user: t.c.App.user });
    assert.doesNotMatch(html, /type="submit"/); assert.match(html, /只读/); checks++;
  }
  console.log('PASS: ' + checks + ' customer form contracts: native submit, actor/object/content/DOM/route binding, atomic text/email/level validation, no-write failures, exact-once commit/clean; Node VM only');
})();
