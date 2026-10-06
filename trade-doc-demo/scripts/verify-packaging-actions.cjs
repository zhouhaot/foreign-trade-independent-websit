'use strict';
/* PL 包装真实视图/动作/Promise/confirm；最小 DOM，不等于浏览器或真实运输校验。 */
const assert = require('node:assert/strict');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { fixture } = require('./verify-document-workspace.cjs');
const baselineReadonly = process.argv.includes('--baseline-readonly');
const sources = baselineReadonly ? { 'views-docs': execFileSync('git', ['show', 'cff1a0e:trade-doc-demo/js/views-docs.js'], { cwd: path.resolve(__dirname, '..'), encoding: 'utf8' }) } : {};
function setup(type = 'PL', editing = true) {
  const t = fixture(['views-docs', 'app'], sources), { c } = t;
  const d = c.MOCK.documents.find(x => x.type === type && !c.MOCK.documents.some(y => y.orderId === x.orderId && y.type === type && y.version > x.version));
  d.status = '草稿'; c.U.order(d.orderId).status = '执行中';
  c.MOCK.approvals = c.MOCK.approvals.filter(a => a.targetId !== d.id);
  t.mount(d, 'doc', editing);
  const clean = c.App.markDraftClean; t.cleanCount = 0;
  c.App.markDraftClean = () => { t.cleanCount++; if (clean) clean(); };
  return { ...t, d, get cleanCount() { return t.cleanCount; } };
}
const all = t => JSON.stringify(t.c.MOCK);
const field = (t, key) => t.document.getElementById('df-pk-' + key);
function fill(t, packing = {}) { for (const [key, value] of Object.entries(packing)) field(t, key).value = value; }
const normal = { cartons: '17', package: '纸箱', gw: '1,680.125 KGS', nw: '1,540.125 kg', meas: '8.600 CBM' };
async function save(t) { t.click(t.document.querySelector('[data-action="doc-save-draft"]')); await t.flush(); }
async function submit(t) {
  t.click(t.document.querySelector('[data-action="doc-submit"]'));
  if (t.modal.querySelector('[data-ok]')) t.click(t.modal.querySelector('[data-ok]'));
  await t.flush();
}
async function run() {
  let count = 0;
  if (baselineReadonly) {
    const t = setup('PL', false); t.d.packing.cartons = 'bad'; const before = all(t);
    await submit(t); assert.ok(all(t) === before, '原非编辑送审跳过 storedPL 校验，非法箱数被送审');
    return;
  }
  // 有效业务红灯：原 Number fallback 会把指数箱数静默保存为 1000。
  const red = setup(); fill(red, { cartons: '1e3' }); const redBefore = all(red);
  await save(red); assert.ok(all(red) === redBefore, '指数箱数必须拒绝，不能被 Number fallback 保存为 1000'); count++;
  const stored = setup('PL', false); stored.d.packing.cartons = 'bad'; const storedBefore = all(stored);
  await submit(stored); assert.ok(all(stored) === storedBefore, '非编辑送审也必须校验 storedPL 完整包装'); count++;
  for (const action of ['save', 'submit']) for (const missing of ['marks', 'remark', 'cartons', 'package', 'gw', 'nw', 'meas']) {
    const t = setup(); fill(t, normal); (missing === 'marks' || missing === 'remark' ? t.document.getElementById('df-' + missing) : field(t, missing)).remove(); const before = all(t);
    await (action === 'save' ? save(t) : submit(t));
    assert.ok(all(t) === before, `${action}: 编辑入口缺失${missing}控件不得回退旧模型值`); assert.equal(t.cleanCount, 0); count++;
  }
  const invalid = { cartons: ['1e3', '0x10', '1.2', '0', '-0', '-1', 'Infinity', 'NaN', '9007199254740992'],
    gw: ['bad', '100', '1,23 KGS', '1e3 KGS', '0 KGS', '-0 KGS', 'Infinity KGS', '1.0001 KGS'],
    nw: ['-1 KG', '2,34.5 kg', 'NaN kg'], meas: ['8', '0 CBM', 'Infinity CBM', '1.0001 CBM'], package: ['\u200b', '\u2060'] };
  for (const action of ['save', 'submit']) for (const [key, samples] of Object.entries(invalid)) for (const value of samples) {
    const t = setup(); fill(t, normal); fill(t, { [key]: value }); const input = field(t, key), before = all(t);
    await (action === 'save' ? save(t) : submit(t));
    assert.ok(all(t) === before, `${action}/${key}/${value}: 完整模型不变`);
    assert.equal(field(t, key), input); assert.equal(input.value, value, '保留原文本和节点');
    assert.equal(input.getAttribute('aria-invalid'), 'true'); assert.match(input.getAttribute('aria-describedby'), /hint.*error/);
    assert.ok(t.document.getElementById('doc-packing-feedback').textContent, 'sidebar 完整原因');
    assert.equal(t.document.activeElement, input, '首错获得焦点'); assert.equal(t.cleanCount, 0); count++;
  }
  for (const editing of [true, false]) {
    const t = setup('PL', editing); if (editing) fill(t, { gw: '10 KGS', nw: '11 kg' }); else { t.d.packing.gw = '10 KGS'; t.d.packing.nw = '11 kg'; }
    const before = all(t); await submit(t); assert.ok(all(t) === before, '毛重小于净重拒绝'); count++;
    if (editing) {
      assert.equal(field(t, 'gw').getAttribute('aria-invalid'), 'true'); assert.equal(field(t, 'nw').getAttribute('aria-invalid'), 'true');
      assert.equal(t.document.getElementById('df-pk-gw-error').textContent, t.document.getElementById('df-pk-nw-error').textContent, '关系错误两字段同一原因');
    }
  }
  for (const action of ['save', 'submit']) {
    const t = setup(); fill(t, normal); const before = JSON.parse(all(t));
    if (action === 'submit') {
      t.click(t.document.querySelector('[data-action="doc-submit"]'));
      assert.match(t.modal.firstElementChild.innerHTML, /本次送审包装候选.*正在编辑的输入/);
      for (const value of Object.values(normal)) assert.ok(t.modal.firstElementChild.innerHTML.includes(value), '确认窗口展示完整五字段候选');
      t.click(t.modal.querySelector('[data-close]')); await t.flush();
    }
    await (action === 'save' ? save(t) : submit(t));
    assert.equal(t.d.packing.cartons, 17); assert.equal(t.d.packing.gw, normal.gw); assert.equal(t.d.packing.nw, normal.nw); assert.equal(t.d.packing.meas, normal.meas);
    assert.equal(JSON.stringify(t.d.snapshot), JSON.stringify(before.documents.find(d => d.id === t.d.id).snapshot));
    assert.equal(JSON.stringify(t.c.MOCK.payments), JSON.stringify(before.payments)); assert.equal(t.cleanCount, 1); count++;
  }
  const partial = setup(); fill(partial, { cartons: '', package: '', gw: '', nw: '', meas: '' });
  await save(partial); assert.equal(partial.d.packing.cartons, ''); assert.ok(partial.messages.some(m => /待补|不完整/.test(m.text)), '草稿部分空明确待补');
  partial.mount(partial.d, 'doc', false); const pbefore = all(partial); await submit(partial); assert.ok(all(partial) === pbefore, '不完整草稿不可送审'); count++;
  // 编辑 A 在提交后漂移为合法 B 也不能静默写 captured A；DOM/角色引用/route 变化同样拒绝。
  for (const action of ['save', 'submit']) for (const mutation of ['valid-input', 'invalid-input', 'node', 'actor-copy', 'hash', 'status', 'newest']) {
    const t = setup(); fill(t, normal); t.click(t.document.querySelector('[data-action="doc-' + (action === 'save' ? 'save-draft' : 'submit') + '"]'));
    if (action === 'submit') assert.ok(t.modal.querySelector('[data-ok]'));
    if (mutation === 'valid-input') field(t, 'cartons').value = '18';
    if (mutation === 'invalid-input') field(t, 'cartons').value = '0x10';
    if (mutation === 'node') { const n = field(t, 'cartons'), replacement = t.document.createElement('input'); replacement.id = n.id; replacement.value = n.value; n.parentElement.appendChild(replacement); n.remove(); }
    if (mutation === 'actor-copy') t.c.App.user = { ...t.c.App.user };
    if (mutation === 'hash') t.c.location.hash = '#/orders/' + t.d.orderId;
    if (mutation === 'status') t.c.U.order(t.d.orderId).status = '取消申请中';
    if (mutation === 'newest') t.c.MOCK.documents.push({ ...t.d, id: 'PL-NEXT', version: t.d.version + 1 });
    const before = all(t); if (action === 'submit') t.click(t.modal.querySelector('[data-ok]')); await t.flush();
    assert.ok(all(t) === before, `${action}/${mutation}: 延迟漂移拒绝`); assert.equal(t.cleanCount, 0); count++;
    if (mutation === 'invalid-input') {
      assert.equal(field(t, 'cartons').getAttribute('aria-invalid'), 'true', '回调发现非法漂移仍有字段级原因');
      assert.match(t.document.getElementById('doc-packing-feedback').textContent, /输入已变化/, '同来源非法漂移完整原因含旧确认失效和新字段诊断');
    }
  }
  // 旧异步作业拒绝时，不得清理或聚焦后来进入的页面错误。
  for (const action of ['save', 'submit']) for (const destination of ['other-document', 'rebuilt-same-document']) {
    const t = setup(); fill(t, normal);
    t.click(t.document.querySelector('[data-action="doc-' + (action === 'save' ? 'save-draft' : 'submit') + '"]'));
    const oldOk = action === 'submit' ? t.modal.querySelector('[data-ok]') : null;
    const other = destination === 'other-document' ? t.c.MOCK.documents.find(d => d.type === 'PL' && d.id !== t.d.id && !t.c.MOCK.documents.some(x => x.orderId === d.orderId && x.type === d.type && x.version > d.version)) : t.d;
    other.status = '草稿'; t.c.U.order(other.orderId).status = '执行中';
    t.mount(other, 'doc', true);
    const currentGw = field(t, 'gw'); currentGw.value = 'bad';
    t.c.U.fieldError(currentGw, '本页毛重格式错误'); currentGw.focus();
    const feedback = t.document.getElementById('doc-packing-feedback'); feedback.textContent = '本页待修正，请保留';
    const before = all(t), description = currentGw.getAttribute('aria-describedby'), cleanBefore = t.cleanCount;
    if (oldOk) t.click(oldOk); await t.flush();
    assert.equal(all(t), before, `${action}/${destination}: 旧作业全模型零写`);
    assert.equal(currentGw.getAttribute('aria-invalid'), 'true', '保新页面字段错误标记');
    assert.equal(currentGw.getAttribute('aria-describedby'), description, '保新页面错误关联');
    assert.equal(t.document.getElementById('df-pk-gw-error').textContent, '本页毛重格式错误', '保新页面具体错误');
    assert.equal(feedback.textContent, '本页待修正，请保留', '不把旧作业错误写进新页面');
    assert.equal(t.document.activeElement, currentGw, '旧作业不抢新页面焦点'); assert.equal(t.cleanCount, cleanBefore); count++;
  }
  // 地址已变、hash渲染尚未开始时，旧按钮也不能把另一页当作来源。
  for (const editing of [false, true]) for (const destination of ['#/orders/SO2026001', '#/documents/D-PL2026004-V1', '#/dashboard']) {
    const t = setup('PL', editing); if (editing) fill(t, normal);
    for (const action of editing ? ['save', 'submit'] : ['submit']) {
      t.c.location.hash = destination; const before = all(t);
      await (action === 'save' ? save(t) : submit(t)); assert.ok(all(t) === before, '保存/送审首次入口要求当前单证规范来源，不能捕获错误hash后当成合法源');
      assert.equal(t.modal.querySelector('[data-ok]'), null); assert.equal(t.cleanCount, 0); count++;
    }
  }
  const querySource = setup('PL', false); querySource.c.location.hash += '?view=packing';
  await submit(querySource); assert.equal(querySource.d.status, '待审核', '规范详情附带合法query仍可送审'); count++;
  // 同确认取消、重复确认及 CI 不碰隐藏包装。
  const cancel = setup(); fill(cancel, normal); const cbefore = all(cancel);
  cancel.click(cancel.document.querySelector('[data-action="doc-submit"]')); const oldOk = cancel.modal.querySelector('[data-ok]'); cancel.click(cancel.modal.querySelector('[data-close]')); await cancel.flush();
  assert.equal(all(cancel), cbefore); assert.equal(cancel.cleanCount, 0); count++;
  cancel.click(oldOk); await cancel.flush(); assert.equal(all(cancel), cbefore, '已取消旧窗口的延迟回调不送审'); assert.equal(cancel.cleanCount, 0); count++;
  const twice = setup(); fill(twice, normal); twice.click(twice.document.querySelector('[data-action="doc-submit"]'));
  const ok = twice.modal.querySelector('[data-ok]'); twice.click(ok); twice.click(ok); await twice.flush();
  assert.equal(twice.c.MOCK.approvals.filter(a => a.targetId === twice.d.id && a.type === '单证审核' && a.status === '待处理').length, 1); assert.equal(twice.cleanCount, 1); count++;
  for (const action of ['save', 'submit']) {
    const ci = setup('CI'); ci.d.packing = { cartons: 'bad', gw: 'invalid', nw: 'invalid', meas: '', package: '' };
    const hidden = JSON.stringify(ci.d.packing); await (action === 'save' ? save(ci) : submit(ci));
    assert.equal(JSON.stringify(ci.d.packing), hidden, 'CI 隐藏packing既不校验也不写'); assert.equal(ci.cleanCount, 1); count++;
  }
  for (const packing of [null, []]) {
    const broken = setup(); broken.d.packing = packing; broken.mount(broken.d, 'doc', true);
    const before = all(broken); await save(broken); assert.ok(all(broken) === before, '无效包装对象不能被空候选洗白'); count++;
  }
  const equality = setup(); fill(equality, { gw: '10.000 kg', nw: '10 KGS' }); await submit(equality); assert.equal(equality.d.status, '待审核', '毛净相等可送审'); count++;
  const inherited = setup(); inherited.d.status = '已通过'; inherited.d.packing.gw = 'legacy invalid text'; inherited.mount(inherited.d, 'doc', false);
  const old = JSON.stringify(inherited.d); inherited.click(inherited.document.querySelector('[data-action="doc-revise"]')); inherited.click(inherited.modal.querySelector('[data-ok]')); await inherited.flush();
  const revision = inherited.c.MOCK.documents.at(-1); assert.equal(JSON.stringify(inherited.d), old); assert.equal(revision.packing.gw, 'legacy invalid text', '受控修订只继承原包装，不自动洗值'); assert.equal(revision.status, '草稿'); count++;
  const readonly = setup('PL', false), originalPacking = JSON.stringify(readonly.d.packing);
  const unrelated = readonly.document.createElement('input'); unrelated.id = 'df-pk-gw'; unrelated.value = 'unrelated invalid input'; readonly.app.appendChild(unrelated);
  await submit(readonly); assert.equal(readonly.d.status, '待审核'); assert.equal(JSON.stringify(readonly.d.packing), originalPacking, '只读送审不读取其他页面残余控件'); count++;
  console.log(`PASS: ${count} packaging action cases; PL atomic partial-save/complete-submit, raw units/text, field+role alerts/focus, async valid/invalid drift, snapshots/finance/clean/CI isolation (Node DOM fixture only)`);
}
run().catch(error => { console.error(error.message); process.exitCode = 1; });
