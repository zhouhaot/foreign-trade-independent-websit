'use strict';
/* 真实事件委托/业务动作 + 最小 DOM。共享 guard 用 API 边界桩；完整路由 guard 由中枢专用脚本验证。 */
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { fixture } = require('./verify-document-workspace.cjs');
const root = path.resolve(__dirname, '..');
function load() {
  const source = fs.readFileSync(path.join(root, 'js/views-fin.js'), 'utf8');
  const bind = "window.adapterEvents = {}; var adapterBind = document.addEventListener.bind(document); document.addEventListener = function(type, fn) { (window.adapterEvents[type] || (window.adapterEvents[type] = [])).push(fn); adapterBind(type, fn); };\n";
  const t = fixture(['views-docs', 'views-fin', 'app'], { 'views-fin': bind + source });
  t.clean = [];
  const clean = t.c.App.markDraftClean;
  t.c.App.markDraftClean = () => { if (clean) clean(); t.clean.push(JSON.stringify(t.c.MOCK)); };
  const mount = t.mount;
  t.mount = (...args) => { mount(...args); t.clean.length = 0; };
  return t;
}
function mountPayments(t) {
  const { c } = t;
  c.App.user = c.U.roleUser('fin'); c.location.hash = '#/payments?order=SO2026001';
  // 八条真实样例结构记录，使两页各有可见记录；只改变 fixture 内存。
  c.MOCK.payments.push({ ...c.MOCK.payments[0], id: 'PAY-ADAPTER-8', amount: 1, date: '2026-10-07' });
  t.app.innerHTML = c.Views.payments({ query: { order: 'SO2026001' }, user: c.App.user });
  for (const select of t.app.querySelectorAll('select')) {
    Object.defineProperty(select, 'options', { get: () => select.querySelectorAll('option') });
    Object.defineProperty(select, 'selectedIndex', { get: () => select.options.findIndex(opt => opt.attrs.value === select.value || !opt.attrs.value && opt.textContent === select.value) });
    for (const opt of select.options) Object.defineProperty(opt, 'value', { get: () => opt.attrs.value || opt.textContent || '' });
  }
  t.document.getElementById('p-method').value = '电汇 T/T';
  t.c.App.markDraftClean(); t.clean.length = 0;
  return t.document.getElementById('pay-form');
}
function submit(t, form) { for (const fn of t.c.adapterEvents.submit || []) fn({ target: form, preventDefault() {} }); }

(async () => {
  let checks = 0;
  // doc-goto/doc-leave 经真实 app 委托，只转交一次共享路由入口，不能先清 editing 或另开本地弹窗。
  for (const action of ['doc-goto', 'doc-leave']) {
    const t = load(), d = t.c.MOCK.documents.find(x => x.status === '制作中'); t.mount(d, 'doc', true);
    const input = t.document.getElementById('df-marks'); input.value += '未提交';
    const calls = []; t.c.App.requestNavigation = destination => calls.push(destination);
    const btn = action === 'doc-goto' ? t.document.querySelectorAll('[data-action="doc-goto"]').find(n => n.dataset.id !== d.id) : t.document.querySelector('[data-action="doc-leave"]');
    assert.ok(btn); const hash = t.c.location.hash, model = JSON.stringify(t.c.MOCK);
    const event = t.click(btn);
    assert.equal(calls.length, 1); assert.equal(t.c.location.hash, hash); assert.equal(t.c.AppUI.docEditing, d.id);
    assert.equal(t.document.getElementById('df-marks'), input); assert.equal(t.modal.firstElementChild, null, '适配层不打开第二份确认');
    assert.equal(JSON.stringify(t.c.MOCK), model); assert.equal(t.clean.length, 0);
    if (action === 'doc-leave') assert.ok(event.defaultPrevented, '阻止旧 anchor 默认导航'); checks++;
  }
  for (const dirty of [true, false]) {
    const t = load(), d = t.c.MOCK.documents.find(x => x.status === '制作中'); t.mount(d, 'doc', true);
    const input = t.document.getElementById('df-marks'); if (dirty) input.value += '待保存';
    let pending, calls = 0;
    t.c.App.confirmDiscard = (callback, options) => { calls++; assert.match(options.title, /放弃/); if (dirty) pending = callback; else callback(); };
    const model = JSON.stringify(t.c.MOCK); t.click(t.document.querySelector('[data-action="doc-cancel-edit"]'));
    assert.equal(calls, 1);
    if (dirty) { assert.equal(t.c.AppUI.docEditing, d.id); assert.equal(t.renders, 0); assert.equal(t.document.getElementById('df-marks'), input); pending(); }
    assert.equal(t.c.AppUI.docEditing, null); assert.equal(t.renders, 1); assert.equal(JSON.stringify(t.c.MOCK), model); checks++;
  }
  // 实际 doc 成功才 clean；调用时业务状态/历史已经落内存。
  for (const action of ['doc-save-draft', 'doc-submit', 'doc-approve', 'doc-reject']) {
    const t = load(), audit = /approve|reject/.test(action);
    const d = t.c.MOCK.documents.find(x => x.status === (audit ? '待审核' : '制作中'));
    t.mount(d, audit ? 'boss' : 'doc', !audit);
    if (audit) t.document.getElementById('audit-opinion').value = '已核对包装';
    else t.document.getElementById('df-marks').value = 'ADAPTER SAVED MARKS';
    const count = d.history.length;
    t.click(t.document.querySelector('[data-action="' + action + '"]'));
    if (action !== 'doc-save-draft') t.click(t.modal.querySelector('[data-ok]'));
    await t.flush(); assert.equal(t.clean.length, 1, action + ' 成功仅一次clean'); assert.equal(d.history.length, count + 1);
    const cleanedDoc = JSON.parse(t.clean[0]).documents.find(x => x.id === d.id);
    assert.equal(cleanedDoc.history.length, count + 1, '写入成功后再clean'); checks++;
  }
  const denied = load(), deniedDoc = denied.c.MOCK.documents.find(x => x.status === '制作中'); denied.mount(deniedDoc, 'doc', true);
  const untouched = JSON.stringify(denied.c.MOCK);
  denied.click(denied.document.querySelector('[data-action="doc-save-draft"]')); denied.c.App.user = denied.c.U.roleUser('sales'); await denied.flush();
  assert.equal(denied.clean.length, 0); assert.equal(JSON.stringify(denied.c.MOCK), untouched); checks++;
  const noOpinion = load(), pending = noOpinion.c.MOCK.documents.find(x => x.status === '待审核'); noOpinion.mount(pending, 'boss');
  noOpinion.click(noOpinion.document.querySelector('[data-action="doc-reject"]')); assert.equal(noOpinion.clean.length, 0); assert.equal(noOpinion.modal.firstElementChild, null); checks++;

  // 历史翻页保留登记节点、全部输入、错误/ARIA、焦点、滚动和业务数据，不mark clean。
  const t = load(), form = mountPayments(t), { c } = t;
  const amount = t.document.getElementById('p-amount'), remark = t.document.getElementById('p-remark');
  amount.value = '0.001'; remark.value = '未提交备注'; amount.focus(); submit(t, form);
  const error = t.document.getElementById('pay-effect-error'), originalError = error.textContent;
  assert.match(originalError, /收款金额/); assert.equal(amount.getAttribute('aria-invalid'), 'true');
  const initial = JSON.stringify(c.MOCK), originalInput = amount, originalOrder = t.document.getElementById('p-order');
  const scrolls = []; c.scrollY = 259; c.scrollX = 0; c.scrollTo = (x, y) => scrolls.push([x, y]);
  const recordsArea = t.document.getElementById('pay-records-content');
  recordsArea.getBoundingClientRect = () => ({ height: 430 }); // 独立几何输入桩，不声称真实布局。
  t.click(t.document.querySelectorAll('[data-action="pay-page"]').find(n => n.dataset.page === '2'));
  assert.equal(recordsArea.style.minHeight, '430px', '较少记录不能缩掉已显示区域高度'); checks++;
  assert.equal(t.document.getElementById('pay-form'), form); assert.equal(t.document.getElementById('p-amount'), originalInput);
  assert.equal(t.document.getElementById('p-order'), originalOrder); assert.equal(originalOrder.value, 'SO2026001');
  assert.equal(amount.value, '0.001'); assert.equal(remark.value, '未提交备注'); assert.equal(error.textContent, originalError);
  assert.equal(amount.getAttribute('aria-invalid'), 'true'); assert.equal(t.document.activeElement, amount);
  assert.deepEqual(scrolls.at(-1), [0, 259]); assert.equal(t.renders, 0); assert.equal(t.clean.length, 0); assert.equal(JSON.stringify(c.MOCK), initial);
  const records = t.document.getElementById('pay-records-content'); assert.equal(records.querySelector('tbody').children.length, 2, '八记录末页两行');
  const page1 = records.querySelector('[data-page="1"]'); page1.focus(); t.click(page1);
  assert.equal(records.querySelector('tbody').children.length, 6); assert.equal(t.document.activeElement.dataset.page, '1'); checks++;
  // 正在提交时也可只翻历史，原登记引用不失效、不重复写，成功后clean。
  amount.value = '1.00'; const beforeCount = c.MOCK.payments.length; submit(t, form);
  t.click(records.querySelector('[data-page="2"]')); await t.flush();
  assert.equal(c.MOCK.payments.length, beforeCount + 1); assert.equal(c.MOCK.payments.at(-1).amount, 1);
  assert.equal(c.MOCK.payments.at(-1).remark, '未提交备注'); assert.equal(t.clean.length, 1); assert.equal(t.document.getElementById('pay-form'), form); checks++;
  const failure = load(), failedForm = mountPayments(failure); failure.document.getElementById('p-amount').value = '1';
  submit(failure, failedForm); failure.c.U.order('SO2026001').status = '取消申请中'; await failure.flush(); assert.equal(failure.clean.length, 0); checks++;
  const paidRoute = load(), paidForm = mountPayments(paidRoute); paidRoute.c.location.hash = '#/payments';
  paidRoute.document.getElementById('p-amount').value = '1'; const destinations = [];
  paidRoute.c.App.requestNavigation = destination => { assert.equal(paidRoute.clean.length, 1, '成功导航前已clean'); destinations.push(destination); };
  submit(paidRoute, paidForm); await paidRoute.flush(); assert.deepEqual(destinations, ['#/payments?order=SO2026001']); checks++;
  const revise = load(), approved = revise.c.MOCK.documents.find(d => revise.c.U.documentPolicy(d, revise.c.U.roleUser('doc')).canRevise);
  revise.mount(approved, 'doc'); const revisedDestinations = [], originalCount = revise.c.MOCK.documents.length;
  revise.c.App.requestNavigation = destination => { assert.equal(revise.clean.length, 1, '生成版本后先clean'); revisedDestinations.push(destination); };
  revise.click(revise.document.querySelector('[data-action="doc-revise"]')); revise.click(revise.modal.querySelector('[data-ok]')); await revise.flush();
  assert.equal(revise.c.MOCK.documents.length, originalCount + 1); assert.deepEqual(revisedDestinations, ['#/documents/' + revise.c.MOCK.documents.at(-1).id]); checks++;
  const old = load(), oldDoc = old.c.MOCK.documents.find(d => d.status === '制作中'); old.mount(oldDoc, 'doc', true);
  delete old.c.App.requestNavigation; old.document.getElementById('df-marks').value += '旧桩待保存';
  old.click(old.document.querySelector('[data-action="doc-leave"]')); assert.ok(old.modal.firstElementChild, '无共享 API 的旧隔离 fixture 保留原局部确认');
  old.click(old.modal.querySelector('[data-close]')); await old.flush(); assert.equal(old.c.location.hash, '#/documents/' + oldDoc.id); checks++;
  console.log('PASS: ' + checks + ' draft adapter scenarios; real app click delegation / submit handlers / Promise timers, local pagination node/input/error/focus preservation (Node DOM fixture; shared guard semantics separately verified)');
})().catch(error => { console.error(error); process.exitCode = 1; });
