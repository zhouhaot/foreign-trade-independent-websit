'use strict';
/* Real payment submit/change and amount-fill action. Node fixture, not browser/bank receipt. */
const assert = require('node:assert/strict');
const { fixture } = require('./verify-payments-contract.cjs');
let checks = 0;
const pass = () => { checks++; };
const snapshot = t => JSON.stringify(t.c.MOCK);
async function run() {
  for (const [raw, amount, settled] of [['12,100.00', 12100, true], ['1,000.00', 1000, false], ['12,100', 12100, true]]) {
    const t = fixture(), count = t.c.MOCK.payments.length;
    assert.equal(t.c.U.sessionPaymentCount(), 0);
    const documents = JSON.stringify(t.c.MOCK.documents), orders = JSON.stringify(t.c.MOCK.orders);
    t.fields['p-amount'].value = raw; t.submit(); t.submit(); await t.flush();
    assert.equal(t.c.MOCK.payments.length, count + 1); assert.equal(t.c.MOCK.payments.at(-1).amount, amount);
    assert.equal(t.c.U.sessionPaymentCount(), 1); assert.equal(t.fields['p-amount'].value, raw, 'never silently rewrites a pending raw input');
    assert.equal(JSON.stringify(t.c.MOCK.documents), documents); assert.equal(JSON.stringify(t.c.MOCK.orders), orders);
    assert.equal(t.c.location.hash, settled ? '#/payments' : '#/payments?order=SO2026001');
    const html = t.c.Views.payments({ user: t.c.App.user, query: settled ? {} : { order: 'SO2026001' } });
    if (settled) {
      assert.match(html, /SO2026001 已全部结清/); assert.doesNotMatch(html, /原选择 SO2026001 不可登记/);
      assert.doesNotMatch(html, /<option value="SO2026001"/); assert.match(html, /id="p-currency" value="EUR"/);
    } else { assert.doesNotMatch(html, /class="success-box payment-completion"/); assert.match(html, /<option value="SO2026001" selected/); }
    const dash = t.c.Views.dashboard({ user: t.c.App.user });
    assert.match(dash, /本次演示新增收款/); assert.match(dash, /即时更新 · 刷新后归零/); pass();
  }
  for (const raw of ['1,00.00', ',100.00', '1,000,00', '1,234.567', '12,100.01', '1 000.00', '1,000e2']) {
    const t = fixture(), before = snapshot(t); t.fields['p-amount'].value = raw; t.submit(); await t.flush();
    assert.equal(snapshot(t), before); assert.equal(t.fields['p-amount'].value, raw);
    assert.match(t.fields['pay-effect-error'].textContent, /金额|未收/); pass();
  }
  const fill = fixture(), button = { dataset: { action: 'pay-fill-balance' } };
  let inputEvents = 0;
  fill.c.Event = class { constructor(type, options) { this.type = type; this.bubbles = options.bubbles; } };
  fill.form.contains = el => el === button;
  fill.fields['p-amount'].dispatchEvent = e => { assert.equal(e.type, 'input'); assert.equal(e.bubbles, true); inputEvents++; };
  fill.fields['p-amount'].closest = () => ({ querySelectorAll: () => [] });
  const initial = snapshot(fill); fill.c.Actions['pay-fill-balance'](button);
  assert.equal(fill.fields['p-amount'].value, '12100.00'); assert.equal(inputEvents, 1); assert.equal(snapshot(fill), initial); pass();
  fill.fields['p-amount'].value = 'custom'; fill.c.App.user = fill.c.U.roleUser('boss'); fill.c.Actions['pay-fill-balance'](button);
  assert.equal(fill.fields['p-amount'].value, 'custom'); pass();
  const revoke = fixture(); revoke.submit(); revoke.c.MOCK.permMatrix.fin = revoke.c.MOCK.permMatrix.fin.filter(m => m !== '收款与应收');
  const revoked = snapshot(revoke); await revoke.flush(); assert.equal(snapshot(revoke), revoked); assert.match(revoke.fields['pay-effect-error'].textContent, /权限已关闭/); pass();
  const mixed = fixture(); mixed.fields['p-amount'].value = '1,000.00'; mixed.fields['p-currency'].value = 'EUR';
  const mixedBefore = snapshot(mixed); mixed.submit(); await mixed.flush(); assert.equal(snapshot(mixed), mixedBefore); pass();
  const drift = fixture(); drift.fields['p-amount'].value = '1,000.00'; drift.submit(); drift.fields['p-amount'].value = '1000.00';
  const driftBefore = snapshot(drift); await drift.flush(); assert.equal(snapshot(drift), driftBefore); assert.match(drift.fields['pay-effect-error'].textContent, /提交后.*已变化/); pass();
  console.log('PASS: ' + checks + ' review finance scenarios (actual submit and input-fill; Node fixture only)');
}
run().catch(error => { console.error(error); process.exitCode = 1; });
