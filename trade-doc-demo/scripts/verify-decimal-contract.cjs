/* 明细精确到分及实时同币种余额；不修改样例、不代表服务端事务。 */
'use strict';
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm'), assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const c = vm.createContext({}); c.window = c;
for (const name of ['mock-data', 'utils']) vm.runInContext(fs.readFileSync(path.join(root, 'js', name + '.js'), 'utf8'), c);
const { U, MOCK: M } = c, before = JSON.stringify(M);
for (const raw of ['Infinity', '1e309', '0x10', '1e3', '1.001', '', '.01', '-1', 'NaN', null, true, {}, 0, '90071992547409.91']) {
  assert.equal(U.decimalInput(raw, '金额').ok, false, '拒绝异常/过精度/无法无损保存: ' + raw);
}
for (const [raw, units] of [['0.01', 1], ['1.23', 123], [' 00012.50 ', 1250], [19.5, 1950], ['0.29', 29]]) {
  const parsed = U.decimalInput(raw, '数量'); assert.equal(parsed.ok, true); assert.equal(parsed.units, units);
}
assert.equal(U.decimalInput('0', '金额', true).units, 0);
for (const [qty, price, cents] of [['0.01', '1.00', 1], ['1.25', '4.00', 500], ['0.25', '0.04', 1], [3, '0.29', 87], ['1000000', '1234567.89', 123456789000000]]) {
  const p = U.transactionAmounts([{ qty, price }]); assert.equal(p.ok, true, p.error); assert.equal(p.totalCents, cents);
}
assert.equal(U.transactionAmounts([{ qty: '.01', price: 1 }]).ok, false);
assert.match(U.transactionAmounts([{ qty: '0.01', price: '0.01' }]).error, /精确到分/);
assert.match(U.transactionAmounts([{ qty: '1000000000000', price: '1000000000000' }]).error, /范围/);
assert.equal(U.transactionAmounts([]).ok, false);
for (const order of M.orders) {
  const balance = U.financialBalance(order); assert.equal(balance.ok, true, balance.error);
  assert.equal(balance.totalCents, Math.round(U.orderTotal(order) * 100));
  assert.equal(balance.receivedCents, Math.round(U.orderReceived(order.id) * 100));
}
assert.equal(JSON.stringify(M), before, '解析及余额查询不写任何模型');
assert.equal(U.currencyEnabled('USD'), true); assert.equal(U.currencyEnabled('CNY'), false);
for (const date of ['2024-02-29', '2026-10-07', '2030-01-01', '1999-12-31']) assert.equal(U.validCalendarDate(date), true);
for (const date of ['2026-02-29', '2026-04-31', '2026-13-01', '2026-1-01', '0000-01-01', '', 'Infinity']) assert.equal(U.validCalendarDate(date), false);
const order = U.order('SO2026001');
M.payments.push({ id: 'TEST-EUR', orderId: order.id, amount: 1, currency: 'EUR' });
assert.equal(U.financialBalance(order).ok, false); assert.match(U.financialBalance(order).error, /币种/);
assert.ok(Number.isNaN(U.orderReceived(order.id)), '异币种不合并成USD已收');
assert.equal(U.payStatus(order), '金额待核对'); M.payments.pop();
M.payments.push({ id: 'TEST-OVER', orderId: order.id, amount: 24101, currency: 'USD' });
const over = U.financialBalance(order);
assert.equal(over.ok, false); assert.equal(over.balanceCents, -1200100); assert.equal(over.overpaidCents, 1200100);
assert.equal(U.orderFin(order).balance, -12001); assert.equal(U.payStatus(order), '收款异常');
assert.match(U.orderFin(order).error, /超收/); M.payments.pop();
const huge = { id: 'TEST-HUGE', currency: 'USD', items: [{ qty: 1, price: '90071992547409' }] };
M.payments.push({ id: 'TEST-HUGE-PAY', orderId: huge.id, amount: '0.01', currency: 'USD' });
const hugeBalance = U.financialBalance(huge);
assert.equal(hugeBalance.ok, false, '安全整数相减仍可能无法无损显示，必须拒绝');
assert.equal(hugeBalance.balanceCents, 9007199254740899); assert.ok(Number.isNaN(hugeBalance.outstanding));
assert.match(hugeBalance.error, /无损显示/); M.payments.pop();
huge.items = [{ qty: 1, price: '0.01' }];
M.payments.push({ id: 'TEST-HUGE-PAY', orderId: huge.id, amount: '90071992547409', currency: 'USD' });
assert.equal(U.financialBalance(huge).ok, false); assert.ok(Number.isNaN(U.orderFin(huge).overpaid)); M.payments.pop();
assert.equal(U.transactionAmounts([{ qty: 3, price: '30023997515769.03' }, { qty: 1, price: '0.01' }]).ok, false, '行显示也须无损，不能只检可无损总额');
console.log('PASS decimal inputs, fractional quantities/exact lines, overflow, calendar dates, pure calculations and currency/overpayment diagnostics');
