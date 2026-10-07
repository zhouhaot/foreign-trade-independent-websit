'use strict';
/* 实际订单变更动作/共享 modal/Promise；最小 DOM，不替代浏览器或后台审批。 */
const assert = require('node:assert/strict');
const { fixture } = require('./verify-document-workspace.cjs');
const initialInvalid = ['1e3', '2.4e4', '0x10', 'Infinity', '1e309', '24000.001', '9007199254740991.99'];
function setup(raw, type = '改价申请') {
  const t = fixture(['views-sales', 'app']);
  t.c.App.user = t.c.U.roleUser('sales');
  const order = t.c.U.order('SO2026001');
  t.c.location.hash = '#/orders/' + order.id;
  t.c.Actions['order-apply-change']({ dataset: { id: order.id } });
  const overlay = t.modal.firstElementChild;
  const amount = overlay.querySelector('#oc-amount'), reason = overlay.querySelector('#oc-reason'), typeNode = overlay.querySelector('#oc-type');
  amount.value = raw; reason.value = '客户已核对目标，说明原文保留'; typeNode.value = type;
  for (const fn of typeNode.listeners.change || []) fn({ target: typeNode });
  const cleaned = [], pageCleaned = [], markClean = t.c.U.markModalDraftClean;
  t.c.U.markModalDraftClean = source => { cleaned.push(source); return markClean(source); };
  t.c.App.markDraftClean = () => pageCleaned.push(true);
  return { ...t, order, overlay, amount, reason, typeNode, cleaned, pageCleaned, ok: overlay.querySelector('[data-ok]') };
}
const data = t => JSON.stringify(t.c.MOCK);
const noSuccess = t => assert.ok(!t.messages.some(m => /已提交/.test(m.text)), '拒绝不能给成功反馈');
async function probeInitial() {
  let failures = 0;
  for (const raw of initialInvalid) {
    const t = setup(raw), before = data(t), count = t.c.MOCK.approvals.length;
    t.click(t.ok); await t.flush();
    if (data(t) !== before) {
      failures++;
      const request = t.c.MOCK.approvals.find(a => a.targetId === t.order.id && a.status === '待处理' && a.type === '改价申请');
      console.log(`RED initial ${raw}: added=${t.c.MOCK.approvals.length - count}, targetAmount=${String(request.targetAmount)}, title=${request.title}, modalClosed=${t.modal.firstElementChild === null}`);
    }
  }
  assert.equal(failures, 0, '七例首次非法金额不得创建申请/关闭原窗');
  console.log('PASS: 7 initial illegal change-request writes refused (actual current Actions)');
}
async function run() {
  let cases = 0;
  const invalid = initialInvalid.concat(['', ' ', '0', '0.00', '-0', '-0.00', '-1', '-0.01', 'NaN', 'abc', '24,000.00', '+24000', '.01', '24000.', '0b11', '0o10', '1_000', '0.001', '1.000', '90071992547409.91', '90071992547409.92', '９９', '1 000', '\u200b1']);
  for (const raw of invalid) {
    const t = setup(raw), before = data(t), reason = t.reason.value;
    t.click(t.ok);
    assert.equal(t.modal.firstElementChild, t.overlay); assert.equal(t.amount.value, raw); assert.equal(t.reason.value, reason);
    assert.equal(t.amount.getAttribute('aria-invalid'), 'true'); assert.equal(t.document.activeElement, t.amount);
    const ids = t.amount.getAttribute('aria-describedby').split(/\s+/);
    assert.ok(ids.includes('oc-amount-help')); assert.ok(ids.includes('oc-amount-error'));
    assert.match(t.overlay.querySelector('#oc-amount-error').textContent, /^变更后订单金额/);
    if (raw === '90071992547409.91') assert.match(t.overlay.querySelector('#oc-amount-error').textContent, /可无损保存/);
    if (raw === '90071992547409.92') assert.match(t.overlay.querySelector('#oc-amount-error').textContent, /安全计算/);
    assert.equal(t.ok.classList.contains('is-loading'), false); assert.ok(!t.amount.disabled && !t.reason.disabled);
    assert.equal(t.c.U.setModalBusy(t.overlay, true), true, '初值错误没有残留busy'); t.c.U.setModalBusy(t.overlay, false);
    await t.flush(); assert.equal(data(t), before, `${JSON.stringify(raw)}: 初值拒绝完整 MOCK 不变`); noSuccess(t);
    assert.deepEqual(t.cleaned, []); assert.deepEqual(t.pageCleaned, []); cases++;
  }
  // 独立 BigInt 按存储number的十进制字符串回算分，不以生产helper自身作为断言oracle。
  function storedCents(number) { const parts = String(number).split('.'); return BigInt(parts[0]) * 100n + BigInt(((parts[1] || '') + '00').slice(0, 2)); }
  const valid = [['0.01', 0.01, 1n], ['1', 1, 100n], ['19.5', 19.5, 1950n], ['24000.00', 24000, 2400000n], [' 00012.50 ', 12.5, 1250n], ['0.29', 0.29, 29n], ['90071992547409.90', 90071992547409.9, 9007199254740990n], ['45035996273704.95', 45035996273704.95, 4503599627370495n]];
  for (const [raw, expected, cents] of valid) {
    const t = setup(raw), before = JSON.parse(data(t)), oldRequests = JSON.stringify(before.approvals);
    const legacy = t.c.MOCK.approvals.slice(); t.click(t.ok); t.click(t.ok); await t.flush();
    assert.equal(t.c.MOCK.approvals.length, before.approvals.length + 1);
    const request = t.c.MOCK.approvals[0]; assert.equal(request.targetAmount, expected); assert.equal(storedCents(request.targetAmount), cents);
    assert.equal(request.reason, '客户已核对目标，说明原文保留'); assert.equal(request.type, '改价申请'); assert.equal(request.targetId, t.order.id);
    const display = (cents / 100n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',') + '.' + (cents % 100n).toString().padStart(2, '0');
    assert.equal(request.title, '订单 ' + t.order.id + ' 申请改价至 ' + display + ' USD', '标题与独立整数分候选相同，不掩盖精度');
    assert.equal(JSON.stringify(t.c.MOCK.approvals.slice(1)), oldRequests, '旧申请/标题/审核字段不清洗');
    assert.ok(legacy.every((a, i) => t.c.MOCK.approvals[i + 1] === a), '旧申请对象身份也保留');
    const after = JSON.parse(data(t)); after.approvals.shift(); after.orderLogs[t.order.id].pop();
    assert.equal(JSON.stringify(after), JSON.stringify(before), '申请只新增一笔申请与一条日志；订单/交易/单证/收款不变');
    assert.equal(t.messages.filter(m => /已提交/.test(m.text)).length, 1); assert.deepEqual(t.cleaned, [t.overlay]); assert.deepEqual(t.pageCleaned, []); cases++;
  }
  const correction = setup('24000.001'), unchanged = data(correction);
  correction.click(correction.ok); assert.equal(data(correction), unchanged);
  correction.click(correction.overlay.querySelector('.modal-close'));
  correction.click(correction.modal.querySelector('[data-modal-draft-continue]'));
  assert.equal(correction.modal.firstElementChild, correction.overlay); assert.equal(correction.overlay.querySelector('#oc-amount'), correction.amount);
  assert.equal(correction.amount.value, '24000.001'); assert.equal(correction.amount.getAttribute('aria-invalid'), 'true');
  correction.amount.value = '24000.00'; correction.click(correction.ok);
  assert.equal(correction.amount.getAttribute('aria-invalid'), null); assert.equal(correction.amount.getAttribute('aria-describedby'), 'oc-amount-help');
  await correction.flush(); assert.equal(correction.c.MOCK.approvals[0].targetAmount, 24000); assert.equal(correction.reason.value, '客户已核对目标，说明原文保留'); cases++;
  const missingReason = setup('24000.00'); missingReason.reason.value = ''; const beforeReason = data(missingReason);
  missingReason.click(missingReason.ok); await missingReason.flush(); assert.equal(data(missingReason), beforeReason);
  assert.equal(missingReason.reason.getAttribute('aria-invalid'), 'true'); assert.equal(missingReason.document.activeElement, missingReason.reason); noSuccess(missingReason); cases++;
  for (const raw of initialInvalid) {
    const t = setup(raw, '取消申请'), before = JSON.parse(data(t)); t.click(t.ok); await t.flush();
    const request = t.c.MOCK.approvals[0]; assert.equal(request.targetAmount, null); assert.equal(request.type, '取消申请'); assert.equal(request.priorOrderStatus, before.orders.find(o => o.id === t.order.id).status);
    assert.equal(t.order.status, '取消申请中'); assert.equal(t.amount.value, raw); assert.equal(t.amount.getAttribute('aria-invalid'), null);
    assert.equal(t.overlay.querySelector('#oc-amount-wrap').style.display, 'none');
    assert.equal(JSON.stringify(t.c.MOCK.documents), JSON.stringify(before.documents)); assert.equal(JSON.stringify(t.c.MOCK.payments), JSON.stringify(before.payments));
    assert.equal(JSON.stringify(t.c.MOCK.approvals.slice(1)), JSON.stringify(before.approvals)); cases++;
  }
  const toggle = setup('1e3'), beforeToggle = data(toggle); toggle.click(toggle.ok);
  toggle.typeNode.value = '取消申请'; for (const fn of toggle.typeNode.listeners.change || []) fn({ target: toggle.typeNode });
  assert.equal(toggle.amount.value, '1e3'); assert.equal(toggle.amount.getAttribute('aria-invalid'), null); assert.equal(toggle.amount.getAttribute('aria-describedby'), 'oc-amount-help');
  toggle.typeNode.value = '改价申请'; for (const fn of toggle.typeNode.listeners.change || []) fn({ target: toggle.typeNode });
  toggle.click(toggle.ok); await toggle.flush(); assert.equal(data(toggle), beforeToggle); assert.equal(toggle.amount.getAttribute('aria-invalid'), 'true'); noSuccess(toggle); cases++;
  for (const change of ['raw', 'node', 'actor', 'actor-fields', 'object', 'status', 'currency', 'source']) {
    const t = setup('24000.00'); t.click(t.ok); let replacement;
    if (change === 'raw') t.amount.value = '25000.00';
    if (change === 'node') { const node = t.document.createElement('input'); node.id = t.amount.id; node.value = t.amount.value; t.amount.parentElement.insertBefore(node, t.amount); t.amount.remove(); }
    if (change === 'actor') t.c.App.user = t.c.U.roleUser('fin');
    if (change === 'actor-fields') t.c.App.user.name = '同一账号被改名';
    if (change === 'object') t.c.MOCK.orders[t.c.MOCK.orders.indexOf(t.order)] = JSON.parse(JSON.stringify(t.order));
    if (change === 'status') t.order.status = '已取消';
    if (change === 'currency') t.order.currency = 'EUR';
    if (change === 'source') replacement = t.c.U.openModal({ title: '后来打开的窗', body: '<input id="amount-later" value="后来填写">', persistent: true });
    const before = data(t); await t.flush(); assert.equal(data(t), before, `${change}: H20延迟拒绝完整MOCK不变`); noSuccess(t); assert.deepEqual(t.cleaned, []); assert.deepEqual(t.pageCleaned, []);
    if (replacement) assert.equal(t.modal.firstElementChild, replacement); cases++;
  }
  const delayed = setup('24000.00'); delayed.click(delayed.ok); await Promise.resolve();
  const later = delayed.c.U.openModal({ title: '后来的金额草稿', body: '<input id="amount-new" value="原文保留">', persistent: true });
  await delayed.flush(); assert.equal(delayed.modal.firstElementChild, later, '合法commit后的480ms回调不关闭新窗'); assert.equal(delayed.c.MOCK.approvals[0].targetAmount, 24000); cases++;
  console.log(`PASS: ${cases} initial change-request amount scenarios; seven illegal initial writes refused, safe cents/number roundtrip, corrections, H20 context/source guards and invalid hidden cancellation amount (Node DOM fixture only)`);
}
(process.argv.includes('--probe-initial') ? probeInitial() : run()).catch(error => { console.error(error.message); process.exitCode = 1; });
