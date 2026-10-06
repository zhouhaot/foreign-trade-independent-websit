'use strict';
/* 原生 submit/change 监听器 + 最小 DOM；真实 Promise / 定时器，不替代浏览器或后端事务。 */
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const pause = () => new Promise(resolve => setTimeout(resolve, 40));

function fixture(orderId = 'SO2026001') {
  const listeners = {}, fields = {}, messages = [];
  let renderCount = 0;
  function field(id, value) {
    const classes = new Set(), attrs = {}, error = { textContent: '', id: '' };
    return { id, value, error, attrs, classList: { contains: k => classes.has(k), add: k => classes.add(k), remove: k => classes.delete(k) },
      setAttribute(k, v) { attrs[k] = v; }, removeAttribute(k) { delete attrs[k]; }, focus() { this.focused = true; },
      closest() { return { querySelector: () => error }; } };
  }
  const c = vm.createContext({ console, Promise, AppUI: {}, App: { user: null, rerender() { renderCount++; } },
    location: { hash: '#/payments?order=' + orderId },
    document: { addEventListener(type, fn) { (listeners[type] ||= []).push(fn); }, getElementById(id) { return fields[id] || null; } },
    setTimeout(fn, ms) { return setTimeout(fn, Math.min(ms || 0, 8)); } });
  c.window = c;
  for (const name of ['mock-data', 'utils', 'views-core', 'views-fin']) vm.runInContext(fs.readFileSync(path.join(root, 'js', name + '.js'), 'utf8'), c, { filename: name });
  c.App.user = c.U.roleUser('fin');
  c.U.toast = (text, type) => messages.push({ text, type });
  Object.assign(fields, { 'p-order': field('p-order', orderId), 'p-amount': field('p-amount', '1.00'),
    'p-currency': field('p-currency', c.U.order(orderId)?.currency || 'USD'), 'p-method': field('p-method', '电汇 T/T'),
    'p-date': field('p-date', '2026-10-07'), 'p-remark': field('p-remark', '合同核对'),
    'p-out-hint': { textContent: '' }, 'pay-effect-error': { textContent: '' }, 'p-balance': { innerHTML: '' } });
  const btn = field('', ''); btn.innerHTML = '登记收款';
  fields['p-order'].options = [{ value: orderId, dataset: { cur: fields['p-currency'].value, out: '999999999' } }];
  fields['p-order'].selectedIndex = 0;
  const form = { id: 'pay-form', isConnected: true, querySelector(selector) { return selector === 'button[type="submit"]' ? btn : fields[selector.slice(1)] || null; },
    querySelectorAll(selector) { return selector === '.field-error' ? Object.values(fields).filter(f => f.error).map(f => f.error) : Object.values(fields).filter(f => f.classList?.contains('is-error')); } };
  fields['pay-form'] = form;
  return { c, fields, form, btn, messages, listeners, renderCount: () => renderCount,
    submit(target = form) { for (const fn of listeners.submit || []) fn({ target, preventDefault() {} }); },
    change() { for (const fn of listeners.change || []) fn({ target: fields['p-order'] }); },
    flush: pause };
}
const state = t => JSON.stringify(t.c.MOCK);

(async () => {
  let checks = 0;
  async function refused(setup, pattern, delay = false) {
    const t = fixture();
    if (!delay) setup(t);
    if (delay) { t.submit(); setup(t); }
    const before = state(t);
    if (!delay) t.submit();
    await t.flush();
    assert.equal(state(t), before, '失败不更改收款/订单/单证/任何日志');
    assert.equal(t.renderCount(), 0, '失败保留输入，不能重建页面');
    assert.ok(t.messages.some(m => m.type === 'error'), '错误通知');
    assert.ok(!t.messages.some(m => m.text.startsWith('收款已登记')), '失败没有假成功');
    assert.match(t.fields['pay-effect-error'].textContent, pattern);
    checks++;
    return t;
  }
  for (const role of ['boss', 'sales', 'doc', 'admin']) await refused(t => { t.c.App.user = t.c.U.roleUser(role); }, /财务/);
  for (const amount of ['', '0', '-1', '0.001', '1.005', 'Infinity', '-Infinity', 'NaN', '1e2', '1,000.00', '0x10', '900719925474099.99']) {
    const t = await refused(t => { t.fields['p-amount'].value = amount; }, /收款金额/);
    assert.equal(t.fields['p-amount'].value, amount, '保留待修正输入');
    assert.equal(t.fields['p-amount'].attrs['aria-invalid'], 'true');
  }
  await refused(t => { t.fields['p-amount'].value = '12100.01'; }, /超过实时未收/);
  await refused(t => { t.fields['p-currency'].value = 'EUR'; }, /币种/);
  await refused(t => { t.fields['p-method'].value = '赊销 O/A'; }, /启用的收款方式/);
  await refused(t => { t.fields['p-method'].value = 'TT'; }, /收款方式/);
  for (const date of ['', '2026-02-29', '2024-02-30', '2026-13-01', '2026-00-01', '26-10-07']) await refused(t => { t.fields['p-date'].value = date; }, /真实日历日期/);
  for (const status of ['取消申请中', '已取消', '未知']) await refused(t => { t.c.U.order('SO2026001').status = status; }, /状态|取消/);
  await refused(t => { t.c.MOCK.orders = t.c.MOCK.orders.filter(o => o.id !== 'SO2026001'); }, /不存在/);
  await refused(t => { t.fields['p-order'].options[0].value = 'SO2026007'; }, /选项/);
  await refused(t => { t.fields['p-order'].options[0].disabled = true; }, /选项/);
  await refused(t => { t.c.MOCK.dicts.find(d => d.code === 'USD').enabled = false; }, /币种未启用/);
  await refused(t => { t.c.MOCK.dicts.find(d => d.code === 'TT').enabled = false; }, /收款方式/);
  for (const amount of [12101, 100000]) await refused(t => { t.c.MOCK.payments.push({ orderId: 'SO2026001', amount, currency: 'USD' }); }, /超收|异常|超过/);
  await refused(t => { t.c.MOCK.payments.push({ orderId: 'SO2026001', amount: 1, currency: 'EUR' }); }, /币种/);
  await refused(t => { t.c.MOCK.payments[0].amount = 1.005; }, /收款|金额/);

  const delayed = [
    ['角色', t => { t.c.App.user = t.c.U.roleUser('boss'); }, /账号|财务/],
    ['操作者', t => { t.c.App.user = { ...t.c.App.user, id: 'OTHER', name: '另一财务' }; }, /账号/],
    ['同账号新会话', t => { t.c.App.user = { ...t.c.App.user }; }, /会话/],
    ['订单对象', t => { const i = t.c.MOCK.orders.findIndex(o => o.id === 'SO2026001'); t.c.MOCK.orders[i] = { ...t.c.MOCK.orders[i] }; }, /订单对象/],
    ['订单删除', t => { t.c.MOCK.orders = t.c.MOCK.orders.filter(o => o.id !== 'SO2026001'); }, /不存在/],
    ['币种', t => { t.c.U.order('SO2026001').currency = 'EUR'; }, /币种/],
    ['状态', t => { t.c.U.order('SO2026001').status = '取消申请中'; }, /取消/],
    ['正常状态漂移', t => { t.c.U.order('SO2026001').status = '待执行'; }, /已变化/],
    ['明细', t => { t.c.U.order('SO2026001').items[0].price += 1; }, /已变化/],
    ['客户', t => { t.c.U.order('SO2026001').customerId = 'C001'; }, /已变化/],
    ['余额仍有效', t => { t.c.MOCK.payments.push({ orderId: 'SO2026001', amount: 10, currency: 'USD' }); }, /余额已变化/],
    ['并发超额', t => { t.fields['p-amount'].value = '10000'; t.c.MOCK.payments.push({ orderId: 'SO2026001', amount: 10000, currency: 'USD' }); }, /变化/],
    ['付款方式停用', t => { t.c.MOCK.dicts.find(d => d.code === 'TT').enabled = false; }, /收款方式/],
    ['表单卸载', t => { t.form.isConnected = false; }, /表单已关闭/],
    ['表单替换', t => { t.fields['pay-form'] = { ...t.form }; }, /表单已关闭/]
  ];
  for (const [, change, pattern] of delayed) await refused(change, pattern, true);
  await refused(t => { t.c.location.hash = '#/orders'; }, /登记页面已变化/, true);
  const reduced = fixture(); reduced.fields['p-amount'].value = '10000'; reduced.submit();
  reduced.c.MOCK.payments.push({ orderId: 'SO2026001', amount: 10000, currency: 'USD' });
  const reducedBefore = state(reduced); await reduced.flush();
  assert.equal(state(reduced), reducedBefore); assert.match(reduced.fields['pay-effect-error'].textContent, /不能超过实时未收 2,100.00 USD/);
  assert.equal(reduced.fields['p-amount'].value, '10000', '并发收款超限失败保留输入');
  reduced.fields['p-amount'].value = '2100.00'; reduced.submit(); await reduced.flush();
  assert.equal(reduced.c.U.financialBalance(reduced.c.U.order('SO2026001')).outstandingCents, 0, '失败释放守卫，核对后可重新提交'); checks++;
  const identity = fixture(), identityOrder = identity.c.U.order('SO2026001'); identity.submit(); identityOrder.id = 'CHANGED';
  const identityBefore = state(identity); await identity.flush(); assert.equal(state(identity), identityBefore, '订单身份漂移零写入');
  identityOrder.id = 'SO2026001'; identity.submit(); await identity.flush();
  assert.equal(identity.c.MOCK.payments.length, JSON.parse(identityBefore).payments.length + 1, '订单身份变更失败释放原订单锁'); checks++;
  for (const [key, value] of [['amount', '2.00'], ['currency', 'EUR'], ['method', '信用证 L/C'], ['date', '2026-10-08'], ['remark', '新备注'], ['order', 'SO2026007']]) {
    const t = await refused(t => { t.fields['p-' + key].value = value; }, /提交后.*已变化/, true);
    assert.equal(t.fields['p-' + key].attrs['aria-invalid'], 'true', key + '变化指出具体字段');
  }

  for (const [id, amount, cur, date] of [['SO2026001', '12100.00', 'USD', '2026-10-07'], ['SO2026003', '19500', 'EUR', '2030-02-28'], ['SO2026005', '0.01', 'USD', '2024-02-29']]) {
    const t = fixture(id); t.fields['p-amount'].value = amount; t.fields['p-date'].value = date; t.fields['p-method'].value = '其他';
    // 即使缓存选项上限为 0，仍按实时余额登记。
    t.fields['p-order'].options[0].dataset.out = '0';
    const before = JSON.parse(state(t)), paymentCount = before.payments.length;
    t.submit(); t.submit(); await t.flush();
    assert.equal(t.c.MOCK.payments.length, paymentCount + 1, '重复 submit 恰好一笔');
    const p = t.c.MOCK.payments.at(-1);
    assert.equal(p.amount, Number(amount)); assert.equal(p.currency, cur); assert.equal(p.date, date); assert.equal(p.method, '其他');
    assert.equal(p.operator, t.c.App.user.name); assert.equal(p.remark, '合同核对');
    assert.equal((t.c.MOCK.orderLogs[id] || []).length, (before.orderLogs[id] || []).length + 1);
    assert.equal(JSON.stringify(t.c.MOCK.orders), JSON.stringify(before.orders), '收款不改订单明细或状态');
    assert.equal(JSON.stringify(t.c.MOCK.documents), JSON.stringify(before.documents), '不改历史单证快照');
    assert.equal(t.renderCount(), 1); assert.ok(t.messages.some(m => m.text.startsWith('收款已登记')));
    if (id !== 'SO2026005') assert.equal(t.c.U.financialBalance(t.c.U.order(id)).outstandingCents, 0, '分为单位恰好结清');
    t.submit(); await t.flush(); assert.equal(t.c.MOCK.payments.length, paymentCount + 1, '旧成功表单不能再次登记'); checks++;
  }
  const concurrent = fixture(); concurrent.submit();
  const second = { ...concurrent.form }; concurrent.fields['pay-form'] = second;
  concurrent.submit(second); const untouched = state(concurrent); await concurrent.flush();
  assert.equal(state(concurrent), untouched, '同一订单两表单守卫与旧表单失效均无写入'); checks++;

  const change = fixture(); change.fields['p-order'].value = 'SO2026003'; change.change();
  assert.equal(change.fields['p-currency'].value, 'EUR'); assert.match(change.fields['p-out-hint'].textContent, /19,500.00 EUR/);
  change.fields['p-order'].value = 'SO2026006'; change.change(); assert.match(change.fields['p-out-hint'].textContent, /取消申请中/); checks++;
  assert.equal(change.btn.disabled, true, '暂停选择按钮禁用');
  change.fields['p-order'].value = 'SO2026003'; change.change(); assert.equal(change.btn.disabled, false, '合法选择恢复登记按钮');
  const chosen = fixture(); chosen.fields['p-order'].options.push({ value: 'SO2026003' });
  chosen.fields['p-order'].selectedIndex = 1; chosen.fields['p-order'].value = 'SO2026003'; chosen.change();
  chosen.submit(); await chosen.flush();
  assert.equal(chosen.c.MOCK.payments.at(-1).orderId, 'SO2026003');
  assert.equal(chosen.c.location.hash, '#/payments?order=SO2026003', '成功保持用户明确选中的对象，避免回到URL旧目标'); checks++;
  const view = fixture();
  let html = view.c.Views.payments({ user: view.c.App.user, query: { order: 'SO2026006' } });
  assert.match(html, /原选择 SO2026006 不可登记/); assert.match(html, /取消申请中.*暂停/);
  assert.doesNotMatch(html, /<option value="SO2026006"/);
  view.c.MOCK.orders = view.c.MOCK.orders.filter(o => o.id !== 'SO2026002');
  view.c.MOCK.payments.push({ id: 'TEST-EUR', orderId: 'SO2026001', currency: 'EUR', amount: 10, date: '2026-10-07', method: '其他', operator: '测试' });
  html = view.c.Views.payments({ user: view.c.App.user, query: {} });
  assert.match(html, /关联订单缺失/); assert.match(html, /金额异常/); assert.match(html, /异常订单未纳入/); checks++;
  view.c.App.user = view.c.U.roleUser('boss'); html = view.c.Views.payments({ user: view.c.App.user, query: {} });
  assert.doesNotMatch(html, /id="pay-form"/); assert.match(html, /主管视角为只读/); checks++;
  const aggregate = fixture();
  aggregate.c.MOCK.orders = [
    { id: 'TEST-LARGE-A', customerId: 'C001', currency: 'USD', status: '执行中', createdAt: '2026-10-07', items: [{ qty: 1, price: '90071992547408' }] },
    { id: 'TEST-LARGE-B', customerId: 'C001', currency: 'USD', status: '执行中', createdAt: '2026-10-07', items: [{ qty: 1, price: '0.99' }] }
  ];
  aggregate.c.MOCK.payments = [];
  html = aggregate.c.Views.payments({ user: aggregate.c.App.user, query: {} });
  assert.match(html, /汇总待核对/); assert.match(html, /合计超出可无损显示/);
  assert.doesNotMatch(html, /90,071,992,547,408\.98/, '不能把丢分的聚合伪装成有效金额'); checks++;
  console.log('PASS: ' + checks + ' payment contract scenarios; real Promise/timers + native submit/change handlers (Node VM; no browser/server transaction claims)');
})().catch(error => { console.error(error); process.exitCode = 1; });
