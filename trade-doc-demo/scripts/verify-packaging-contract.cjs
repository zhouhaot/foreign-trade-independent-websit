/* H18包装候选：独立于H12交易精度，纯计算且保留合法原文。 */
'use strict';
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm'), assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..'), c = vm.createContext({}); c.window = c;
for (const name of ['mock-data', 'utils']) vm.runInContext(fs.readFileSync(path.join(root, 'js', name + '.js'), 'utf8'), c);
const { U, MOCK: M } = c, before = JSON.stringify(M);
assert.equal(typeof U.packagingCandidate, 'function', '包装候选API需要先实现');
let cases = 0;
const full = { cartons: 140, package: 'CARTONS', gw: '1,680 KGS', nw: '1,540 KGS', meas: '8.6 CBM' };
function check(packing, complete = true) { cases++; return U.packagingCandidate(packing, { requireComplete: complete }); }
function reject(field, value, pattern) {
  const input = { ...full, [field]: value }, original = JSON.stringify(input), result = check(input);
  assert.equal(result.ok, false, `${field}应拒绝${String(value)}`);
  assert.ok(result.errors.some(e => e.field === field), '具名原因');
  assert.match(result.error, pattern || /填写|普通|整数|单位|格式|范围|大于|单行/);
  assert.equal(result.packing, null, '失败不返回可误用的部分候选'); assert.equal(JSON.stringify(input), original, '不修改输入');
}
for (const d of M.documents.filter(d => d.type === 'PL')) {
  const p = check(d.packing); assert.equal(p.ok, true, p.error); assert.equal(JSON.stringify(p.packing), JSON.stringify(d.packing));
}
for (const value of [0, -1, 1.5, Infinity, NaN, '0', '-0', '-1', '+1', '1.0', '1e3', '0x10', 'NaN', 'Infinity', true, {}, [], '9,001', '9007199254740992', '1\n', null]) reject('cartons', value);
for (const value of ['140', '000140', ' 140 ', 140, Number.MAX_SAFE_INTEGER]) {
  const result = check({ ...full, cartons: value }); assert.equal(result.ok, true, result.error); assert.equal(result.packing.cartons, Number(value));
}
for (const field of ['gw', 'nw', 'meas']) {
  const unit = field === 'meas' ? 'CBM' : 'KGS';
  for (const raw of ['0', '-1', '+1', '1e3', '0x10', 'NaN', 'Infinity', '1.2345', '.001', '1.', '1,68', '12,34,567', '1 000', '9007199254740.992']) reject(field, raw + ' ' + unit);
  for (const value of [1, true, {}, [], '1', '1 LB', '1 TON', '1 M3', '1\n' + unit, '1\u0000' + unit]) reject(field, value);
}
for (const raw of ['1680.000kg', ' 001680.010 kGs ', '1,680.001 KGS', '9007199254740.991 KG']) {
  const p = check({ ...full, gw: raw }); assert.equal(p.ok, true, p.error); assert.equal(p.packing.gw, raw.trim());
}
for (const raw of ['0.001 cbm', '18.200 CBM', '1,234.567CBM']) {
  const p = check({ ...full, meas: raw }); assert.equal(p.ok, true, p.error); assert.equal(p.packing.meas, raw.trim());
}
for (const raw of [true, 123, {}, 'cartons\nboxes', 'boxes\u0000']) reject('package', raw);
for (const raw of ['\u200b', '\ufeff', '\u2060', '\u200d', '\u200c', ' \u200b \u2060 ', '\u034f', '\ufe0f']) reject('package', raw);
for (const raw of ['कार्टन\u200d包装', '包装\u200c箱', '📦\u200d📦']) {
  const p = check({ ...full, package: raw }); assert.equal(p.ok, true, p.error); assert.equal(p.packing.package, raw);
}
const equal = check({ ...full, gw: '1.000 kg', nw: '1 KGS' }); assert.equal(equal.ok, true, equal.error);
const wrongRelation = check({ ...full, gw: '1.001 kg', nw: '1.002 KGS' });
assert.equal(wrongRelation.ok, false); assert.ok(wrongRelation.errors.some(e => e.field === 'gw')); assert.ok(wrongRelation.errors.some(e => e.field === 'nw'));
for (const field of Object.keys(full)) {
  const partial = { ...full, [field]: '' }, draft = check(partial, false);
  assert.equal(draft.ok, true, draft.error); assert.equal(draft.complete, false); assert.equal(draft.packing[field], '');
  reject(field, '');
}
const empty = check({}, false); assert.equal(empty.ok, true); assert.equal(empty.complete, false); assert.equal(empty.packing.cartons, '');
for (const input of [null, [], false, 'text']) { const p = check(input, false); assert.equal(p.ok, false); }
const textPacking = check({ ...full, package: ' CARTONS <script>可读文本</script> ' });
assert.equal(textPacking.ok, true); assert.equal(textPacking.packing.package, 'CARTONS <script>可读文本</script>');
// 独立整数标尺验证毛净关系：输入只有三位度量文本，不共享运行解析器的中间结果。
for (let i = 1; i <= 500; i++) {
  const gross = 1 + i * 7919, net = gross + (i % 3 - 1), measure = 1 + i * 37;
  const format = n => `${Math.floor(n / 1000)}.${String(n % 1000).padStart(3, '0')}`;
  const p = check({ cartons: i, package: 'CARTONS', gw: format(gross) + ' KGS', nw: format(net) + ' kg', meas: format(measure) + ' CBM' });
  assert.equal(p.ok, gross >= net, '独立整数比较毛净关系');
  if (p.ok) assert.equal(p.packing.gw, format(gross) + ' KGS');
}
assert.equal(JSON.stringify(M), before, '查询不写样例、快照或任何业务状态');
assert.equal(U.decimalInput('1.234', '数量').ok, false, '包装三位假设不改变H12交易两位');
console.log(`PASS ${cases} packaging candidates: original PL text, explicit units/3dp, positive safe cartons, empty draft/complete submit, exact gross-net comparisons, no source writes or H12 drift (Node only)`);
