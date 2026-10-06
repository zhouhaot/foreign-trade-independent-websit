'use strict';
/* 真实销售动作 + 共享 modal API/Promise：只模拟最小 DOM，不是浏览器结论。 */
const assert = require('node:assert/strict');
const { fixture } = require('./verify-document-workspace.cjs');
function setup(kind) {
  const t = fixture(['views-sales', 'app']), { c } = t; c.App.user = c.U.roleUser('sales');
  const source = kind === 'qc' ? c.MOCK.quotes.find(q => q.status === '待客户确认' && !q.orderId) : c.U.order('SO2026001');
  c.location.hash = kind === 'qc' ? '#/quotes/' + source.id : '#/orders/' + source.id;
  if (kind === 'oc') c.MOCK.approvals = c.MOCK.approvals.filter(a => !(a.targetType === 'order' && a.targetId === source.id));
  const clean = c.App.markDraftClean; t.pageClean = 0;
  c.App.markDraftClean = () => { t.pageClean++; if (clean) clean(); };
  c.Actions[kind === 'qc' ? 'quote-confirm' : 'order-apply-change']({ dataset: { id: source.id } });
  const overlay = t.modal.firstElementChild; assert.ok(overlay);
  const controls = kind === 'qc' ? ['qc-date', 'qc-remark'] : ['oc-type', 'oc-amount', 'oc-reason'];
  return { ...t, source, overlay, kind, controls, get pageClean() { return t.pageClean; } };
}
function input(t, id) { return t.overlay.querySelector('#' + id); }
const data = t => JSON.stringify(t.c.MOCK);
function dirty(t) { input(t, t.kind === 'qc' ? 'qc-remark' : 'oc-reason').value = '未提交的销售说明'; }
function ready(t) {
  if (t.kind === 'qc') { input(t, 'qc-date').value = '2026-10-07'; input(t, 'qc-remark').value = '客户确认接受条款'; }
  else { input(t, 'oc-amount').value = '24000.00'; input(t, 'oc-reason').value = '客户已核对并申请变更'; }
}
function close(t, way) {
  if (way === 'esc') for (const fn of t.handlers.keydown || []) fn({ key: 'Escape', target: input(t, t.controls.at(-1)), preventDefault() {} });
  else t.click(way === 'x' ? t.overlay.querySelector('.modal-close') : t.overlay.querySelector('.modal-foot').querySelector('[data-close]'));
}
function guardButton(t, pattern) { return t.modal.querySelector(pattern.test('继续填写') ? '[data-modal-draft-continue]' : '[data-modal-draft-discard]'); }
async function probeOld() {
  let failures = 0;
  const dirtyQuote = setup('qc'); dirty(dirtyQuote); close(dirtyQuote, 'x');
  if (dirtyQuote.modal.firstElementChild !== dirtyQuote.overlay) { failures++; console.log('RED: qc 说明未提交，X 直接丢弃原 DOM'); }
  const t = setup('oc'); ready(t); t.click(t.overlay.querySelector('[data-ok]')); await Promise.resolve();
  const replacement = t.c.U.openModal({ title: '新窗口', body: '<input id="sales-new-window" value="新窗草稿">', footer: '<button data-close="1">取消</button>', persistent: true });
  await t.flush();
  if (t.modal.firstElementChild !== replacement) { failures++; console.log('RED: oc 480ms 旧成功回调误关后来打开的新窗口'); }
  assert.equal(failures, 0, '旧销售弹窗草稿/来源窗缺陷');
}
async function retryRegression(kind) {
  const t = setup(kind); t.c.setTimeout = setTimeout; ready(t);
  if (kind === 'oc') t.c.MOCK.approvals.push({ id: 'PENDING-RETRY', type: '改价申请', targetType: 'order', targetId: t.source.id, status: '待处理' });
  const before = data(t), ok = t.overlay.querySelector('[data-ok]'); t.click(ok);
  if (kind === 'qc') input(t, 'qc-remark').value = 'callback前输入变化';
  await Promise.resolve(); await Promise.resolve();
  assert.ok(ok.classList.contains('is-loading'), '首失败后按钮尚处原450ms loading');
  t.click(ok); await new Promise(resolve => setTimeout(resolve, 520));
  assert.ok(t.controls.every(id => !input(t, id).disabled), `${kind}: loading期间快速重试不得永久禁用输入`);
  assert.equal(data(t), before, '首失败及忽略快速重试不写完整MOCK');
  close(t, 'cancel'); assert.ok(guardButton(t, /继续填写/), '失败后可正常关闭请求而非永久busy');
  t.click(guardButton(t, /放弃.*关闭/)); assert.equal(t.modal.firstElementChild, null);
}
async function run() {
  let cases = 0;
  for (const kind of ['oc', 'qc']) { await retryRegression(kind); cases++; }
  for (const kind of ['qc', 'oc']) for (const way of ['x', 'cancel', 'esc']) {
    const t = setup(kind); dirty(t); const original = input(t, t.controls.at(-1)), before = data(t); original.focus();
    close(t, way);
    assert.equal(t.modal.firstElementChild, t.overlay, `${kind}/${way}: 关闭请求保留同一原窗`);
    assert.equal(input(t, t.controls.at(-1)), original); assert.equal(original.value, '未提交的销售说明');
    const keep = guardButton(t, /继续填写/); assert.ok(keep, '同DOM内提供继续填写'); t.click(keep);
    assert.equal(input(t, t.controls.at(-1)), original); assert.equal(t.document.activeElement, original);
    close(t, way); const discard = guardButton(t, /放弃.*关闭/); assert.ok(discard, '明确放弃关闭'); t.click(discard); await t.flush();
    assert.equal(t.modal.firstElementChild, null); assert.equal(data(t), before); assert.equal(t.pageClean, 0); cases++;
  }
  for (const kind of ['qc', 'oc']) {
    const t = setup(kind), before = data(t); close(t, 'cancel'); assert.equal(t.modal.firstElementChild, null); assert.equal(data(t), before); cases++;
    const successful = setup(kind); ready(successful); const ok = successful.overlay.querySelector('[data-ok]'); successful.click(ok); successful.click(ok);
    close(successful, 'x'); assert.equal(successful.modal.firstElementChild, successful.overlay, '处理中拒绝关闭');
    await successful.flush(); assert.equal(successful.modal.firstElementChild, null); assert.equal(successful.pageClean, 0, '仅清源窗草稿，不清页面');
    if (kind === 'qc') assert.equal(successful.source.status, '已确认');
    else assert.equal(successful.c.MOCK.approvals.filter(a => a.targetId === successful.source.id && a.type === '改价申请').length, 1);
    cases++;
  }
  for (const kind of ['qc', 'oc']) for (const mutation of ['actor', 'actor-fields', 'object', 'status', 'replaced-window']) {
    const t = setup(kind); ready(t); t.click(t.overlay.querySelector('[data-ok]'));
    let replacement;
    if (mutation === 'actor') t.c.App.user = t.c.U.roleUser('fin');
    if (mutation === 'actor-fields') t.c.App.user.name = '同一账号被改名';
    if (mutation === 'object') { const list = kind === 'qc' ? t.c.MOCK.quotes : t.c.MOCK.orders; list[list.indexOf(t.source)] = JSON.parse(JSON.stringify(t.source)); }
    if (mutation === 'status') t.source.status = kind === 'qc' ? '已确认' : '已取消';
    if (mutation === 'replaced-window') replacement = t.c.U.openModal({ title: '替换来源窗', body: '<input id="sales-replacement" value="后来的草稿">', persistent: true });
    const before = data(t); await t.flush(); assert.equal(data(t), before, `${kind}/${mutation}: 延迟拒绝全 MOCK 不变`);
    if (replacement) assert.equal(t.modal.firstElementChild, replacement, '旧业务候选不得关闭新窗口');
    assert.equal(t.pageClean, 0); assert.ok(!t.messages.some(m => /已登记|已提交/.test(m.text))); cases++;
  }
  const replacements = { 'qc-date': '2027-01-01', 'qc-remark': '后来有效说明', 'oc-type': '取消申请', 'oc-amount': '25000.00', 'oc-reason': '后来有效申请理由' };
  for (const kind of ['qc', 'oc']) for (const id of kind === 'qc' ? ['qc-date', 'qc-remark'] : ['oc-type', 'oc-amount', 'oc-reason']) {
    const t = setup(kind); ready(t); const original = input(t, id), before = data(t);
    t.click(t.overlay.querySelector('[data-ok]')); original.value = replacements[id]; await t.flush();
    assert.equal(data(t), before, `${id}: 合法raw A到B漂移拒绝`); assert.equal(input(t, id), original); assert.equal(original.value, replacements[id]);
    assert.ok(!t.messages.some(m => /已登记|已提交/.test(m.text)), '输入漂移无假成功反馈');
    assert.ok(!original.disabled, '失败恢复原可编辑属性'); assert.equal(t.pageClean, 0); cases++;
    const missing = setup(kind); ready(missing); input(missing, id).remove(); const unchanged = data(missing);
    missing.click(missing.overlay.querySelector('[data-ok]')); await missing.flush();
    assert.equal(data(missing), unchanged, `${id}: 入口原控件缺失拒绝`); assert.equal(missing.pageClean, 0); cases++;
    const swapped = setup(kind); ready(swapped); const old = input(swapped, id), initial = data(swapped);
    swapped.click(swapped.overlay.querySelector('[data-ok]'));
    const replacement = swapped.document.createElement(old.tagName.toLowerCase()); replacement.id = id; replacement.value = old.value;
    old.parentElement.insertBefore(replacement, old); old.remove(); await swapped.flush();
    assert.equal(data(swapped), initial, `${id}: 同id同值替换节点不得提交旧候选`); assert.equal(input(swapped, id), replacement);
    assert.ok(!swapped.messages.some(m => /已登记|已提交/.test(m.text))); assert.equal(swapped.pageClean, 0); cases++;
  }
  for (const kind of ['qc', 'oc']) {
    const t = setup(kind); ready(t);
    const invalid = input(t, kind === 'qc' ? 'qc-date' : 'oc-reason'); invalid.value = kind === 'qc' ? '2026-02-30' : '';
    const before = data(t); t.click(t.overlay.querySelector('[data-ok]')); await t.flush();
    assert.equal(invalid.getAttribute('aria-invalid'), 'true'); const errorId = invalid.getAttribute('aria-describedby');
    close(t, 'x'); t.click(guardButton(t, /继续填写/));
    assert.equal(input(t, invalid.id), invalid); assert.equal(invalid.getAttribute('aria-invalid'), 'true'); assert.equal(invalid.getAttribute('aria-describedby'), errorId);
    assert.equal(data(t), before); assert.equal(t.pageClean, 0); cases++;
  }
  const oc = setup('oc'); ready(oc); oc.click(oc.overlay.querySelector('[data-ok]')); await Promise.resolve();
  const later = oc.c.U.openModal({ title: '后来新窗', body: '<input id="sales-later" value="保留后来的输入">', persistent: true });
  await oc.flush(); assert.equal(oc.modal.firstElementChild, later, '已commit后旧480ms反馈也只能关原窗'); cases++;
  console.log(`PASS: ${cases} sales modal draft scenarios; real qc/oc DOM, X/cancel/Escape continue-discard, busy lock, source-window async isolation, quote/order eligibility and no page-clean side effects (Node fixture only)`);
}
(process.argv.includes('--probe-old') ? probeOld() : process.argv.includes('--probe-retry') ? retryRegression('oc') : run()).catch(error => { console.error(error.message); process.exitCode = 1; });
