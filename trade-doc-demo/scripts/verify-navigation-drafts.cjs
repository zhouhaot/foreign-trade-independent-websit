'use strict';
/* Real app navigation/DOM handlers with a deterministic asynchronous history fixture.
 * This verifies guards and model effects, not native browser history or beforeunload UI. */
const assert = require('node:assert/strict');
const { fixture } = require('./verify-document-workspace.cjs');
const files = ['views-sales', 'views-docs', 'views-fin', 'views-stats', 'views-system', 'app'];
let cases = 0;
function pass() { cases++; }
function enter(role, route, options = {}) {
  const t = fixture(files, {}, Object.assign({ history: true }, options));
  t.c.U.setUser(t.c.U.roleUser(role));
  t.c.App.requestNavigation(route);
  return t;
}
function change(t, field, value) {
  assert.ok(field, '实际作业字段存在'); field.value = value; field.focus();
  for (const listener of t.handlers.input || []) listener({ target: field });
}
function cancel(t) { t.click(t.modal.querySelector('button[data-close]')); }
function confirm(t) { t.click(t.modal.querySelector('[data-ok]')); }
async function run() {
  for (const [role, route, fieldId] of [
    ['sales', '#/quotes/Q2026004/edit', 'qe-remark'],
    ['fin', '#/payments?order=SO2026001', 'p-remark'],
    ['sales', '#/customers/C001', 'c-remark'],
    ['boss', '#/documents/D-CI2026001-V1', 'audit-opinion']
  ]) {
    const t = enter(role, route), field = t.document.getElementById(fieldId);
    assert.ok(field, route + '/' + fieldId + ': mounted actual form');
    const original = field.value, model = JSON.stringify(t.c.MOCK), position = t.historyPosition;
    assert.equal(t.c.App.hasDraftChanges(), false);
    change(t, field, original + ' pending'); assert.equal(t.c.App.hasDraftChanges(), true);
    assert.match(t.document.getElementById('draft-status').textContent, /未提交/);
    t.c.App.requestNavigation('#/orders');
    assert.equal(t.c.location.hash, route); assert.equal(t.historyPosition, position);
    assert.ok(t.modal.firstElementChild); cancel(t);
    assert.equal(t.document.getElementById(fieldId), field);
    assert.equal(field.value, original + ' pending'); assert.equal(t.document.activeElement, field);
    assert.equal(JSON.stringify(t.c.MOCK), model); pass();
    change(t, field, original); assert.equal(t.c.App.hasDraftChanges(), false);
    t.c.App.requestNavigation('#/orders'); assert.equal(t.c.location.hash, '#/orders');
    assert.equal(t.modal.firstElementChild, null); pass();
  }
  const quote = enter('sales', '#/quotes/Q2026004/edit');
  const form = quote.document.getElementById('qe-form'), remark = quote.document.getElementById('qe-remark');
  const before = JSON.stringify(quote.c.MOCK);
  change(quote, remark, 'leave unchanged model');
  const anchor = quote.document.querySelector('a[href="#/orders"]');
  assert.ok(quote.click(anchor).defaultPrevented); cancel(quote);
  assert.equal(quote.document.getElementById('qe-form'), form); pass();
  quote.c.App.requestNavigation(quote.c.location.hash);
  assert.equal(quote.modal.firstElementChild, null, '当前路由不提示'); pass();
  quote.c.App.requestNavigation('#/orders'); confirm(quote); await quote.flush();
  assert.equal(quote.c.location.hash, '#/orders'); assert.equal(JSON.stringify(quote.c.MOCK), before); pass();

  const history = enter('sales', '#/quotes');
  history.c.App.requestNavigation('#/quotes/Q2026004/edit');
  const dirtyField = history.document.getElementById('qe-remark'); change(history, dirtyField, 'back draft');
  const sourceIndex = history.historyPosition, sourceHash = history.c.location.hash;
  for (let repeat = 0; repeat < 2; repeat++) {
    history.c.history.go(-1); await history.flush();
    assert.equal(history.c.location.hash, sourceHash); assert.equal(history.historyPosition, sourceIndex);
    assert.equal(history.document.getElementById('qe-remark'), dirtyField); assert.ok(history.modal.firstElementChild);
    cancel(history); assert.equal(dirtyField.value, 'back draft'); pass();
  }
  history.c.history.go(-1); await history.flush(); confirm(history); await history.flush();
  assert.equal(history.c.location.hash, '#/quotes'); assert.equal(history.historyPosition, sourceIndex - 1); pass();
  history.c.history.go(1); await history.flush();
  assert.equal(history.c.location.hash, sourceHash); assert.equal(history.c.App.hasDraftChanges(), false); pass();
  const forwardDraft = history.document.getElementById('qe-remark'); change(history, forwardDraft, 'forward branch');
  history.c.App.requestNavigation('#/orders'); confirm(history); await history.flush();
  history.c.history.go(-1); await history.flush();
  const restoredEditor = history.document.getElementById('qe-remark'); change(history, restoredEditor, 'forward cancel');
  history.c.history.go(1); await history.flush();
  assert.equal(history.c.location.hash, sourceHash); cancel(history);
  assert.equal(history.document.getElementById('qe-remark'), restoredEditor); pass();
  history.c.history.go(1); await history.flush(); confirm(history); await history.flush();
  assert.equal(history.c.location.hash, '#/orders'); pass();
  history.c.history.go(-1); await history.flush();
  history.c.App.requestNavigation('#/dashboard');
  assert.equal(history.historyEntries.length, history.historyPosition + 1, 'Back后新导航裁掉Forward分支');
  history.c.history.go(-1); await history.flush();
  assert.equal(history.c.location.hash, sourceHash, '索引按相邻真实条目而非累计导航数'); pass();

  const unknown = enter('sales', '#/quotes/Q2026004/edit');
  const unknownField = unknown.document.getElementById('qe-remark'); change(unknown, unknownField, 'direct hash input');
  const unknownRoute = unknown.c.location.hash; unknown.directHash('#/orders');
  assert.equal(unknown.c.location.hash, unknownRoute); assert.equal(unknown.document.getElementById('qe-remark'), unknownField);
  cancel(unknown); assert.equal(unknownField.value, 'direct hash input'); pass();
  unknown.directHash('#/orders'); confirm(unknown); await unknown.flush();
  assert.equal(unknown.c.location.hash, '#/orders'); pass();

  const busy = enter('sales', '#/quotes/Q2026004/edit');
  change(busy, busy.document.getElementById('qe-remark'), 'busy input');
  busy.document.getElementById('qe-form').querySelector('[type="submit"]').classList.add('is-loading');
  busy.c.App.requestNavigation('#/orders'); assert.equal(busy.modal.firstElementChild, null);
  assert.match(busy.messages.at(-1).text, /处理/); assert.match(busy.c.location.hash, /edit$/); pass();
  let prevented = false; const event = { preventDefault() { prevented = true; } };
  for (const fn of busy.handlers.beforeunload || []) fn(event);
  assert.equal(prevented, true); assert.equal(event.returnValue, ''); pass();
  busy.c.App.markDraftClean(); prevented = false;
  for (const fn of busy.handlers.beforeunload || []) fn({ preventDefault() { prevented = true; } });
  assert.equal(prevented, false); pass();
  for (const modalFirst of [false, true]) {
    const delayed = enter('sales', '#/quotes', { manualHistory: true });
    delayed.c.App.requestNavigation('#/quotes/Q2026004/edit');
    const field = delayed.document.getElementById('qe-remark'); change(delayed, field, 'pending traversal');
    if (modalFirst) delayed.c.App.requestNavigation('#/orders');
    delayed.c.history.go(-1); delayed.historyStep(); // 已到目标，恢复源条目仍排队。
    if (modalFirst) { confirm(delayed); await delayed.flush(); }
    else delayed.c.App.requestNavigation('#/orders');
    assert.equal(delayed.historyEntries.length, 3, 'pending阶段不能push裁掉恢复条目');
    assert.equal(delayed.c.App.hasDraftChanges(), true, 'pending阶段不能提前标clean');
    delayed.historyStep(); assert.match(delayed.c.location.hash, /edit$/);
    assert.equal(delayed.document.getElementById('qe-remark'), field);
    if (modalFirst) { confirm(delayed); await delayed.flush(); assert.equal(delayed.c.location.hash, '#/orders'); }
    else { cancel(delayed); assert.equal(field.value, 'pending traversal'); }
    assert.equal(delayed.historyCommands.length, 0); pass();
  }
  for (const invalid of ['#/orders?tab=%', '#/orders?%ED%A0%80=x', '#/orders?tab=%E0%A4%A']) {
    const malformed = enter('sales', '#/quotes/Q2026004/edit');
    const field = malformed.document.getElementById('qe-remark'); change(malformed, field, 'keep malformed address draft');
    const source = malformed.c.location.hash, model = JSON.stringify(malformed.c.MOCK);
    malformed.c.App.requestNavigation(invalid);
    assert.equal(malformed.modal.firstElementChild, null, '无效目标进入确认前拒绝');
    assert.equal(malformed.c.location.hash, source); assert.equal(malformed.c.App.hasDraftChanges(), true);
    malformed.directHash(invalid);
    assert.equal(malformed.c.location.hash, source); assert.equal(malformed.document.getElementById('qe-remark'), field);
    assert.equal(malformed.c.App.hasDraftChanges(), true); assert.match(malformed.messages.at(-1).text, /编码无效/);
    assert.match(malformed.document.getElementById('navigation-error').textContent, /目标页面.*编码无效.*输入已保留/);
    assert.equal(JSON.stringify(malformed.c.MOCK), model); pass();
  }
  const stalePrompt = enter('sales', '#/quotes/Q2026004/edit');
  const staleField = stalePrompt.document.getElementById('qe-remark'); change(stalePrompt, staleField, 'modal stays safe');
  stalePrompt.c.App.requestNavigation('#/orders');
  stalePrompt.directHash('#/orders?tab=%');
  assert.equal(stalePrompt.modal.firstElementChild, null, '失效离开票据关闭，不保留加载窗');
  assert.equal(stalePrompt.document.getElementById('qe-remark'), staleField); assert.equal(stalePrompt.c.App.hasDraftChanges(), true);
  stalePrompt.c.App.requestNavigation('#/orders'); confirm(stalePrompt); await stalePrompt.flush();
  assert.equal(stalePrompt.c.location.hash, '#/orders', '拒绝后有效导航仍可用'); pass();
  const malformedStartup = fixture(files, {}, { history: true, initialHash: '#/orders?tab=%' });
  assert.equal(malformedStartup.c.location.hash, '#/login'); assert.ok(malformedStartup.app.innerHTML.includes('login-role')); pass();
  const malformedClean = enter('sales', '#/quotes/Q2026004/edit');
  const cleanForm = malformedClean.document.getElementById('qe-form');
  malformedClean.directHash('#/orders?tab=%');
  assert.equal(malformedClean.document.getElementById('qe-form'), cleanForm); assert.equal(malformedClean.c.App.hasDraftChanges(), false); pass();
  const modifiedDoc = enter('doc', '#/documents/D-CI2026004-V1');
  const modifiedDocument = modifiedDoc.c.U.doc('D-CI2026004-V1'); modifiedDoc.mount(modifiedDocument, 'doc', true);
  change(modifiedDoc, modifiedDoc.document.getElementById('df-remark'), 'read source in another tab');
  const modifiedDocHash = modifiedDoc.c.location.hash;
  assert.equal(modifiedDoc.click(modifiedDoc.document.querySelector('[data-action="doc-leave"]'), { ctrlKey: true }).defaultPrevented, false, 'Ctrl单证链接保浏览器原生另开行为');
  assert.equal(modifiedDoc.modal.firstElementChild, null); assert.equal(modifiedDoc.c.location.hash, modifiedDocHash);
  assert.equal(modifiedDoc.c.AppUI.docEditing, modifiedDocument.id); pass();
  const modifiedQuote = enter('sales', '#/quotes/Q2026004/edit');
  change(modifiedQuote, modifiedQuote.document.getElementById('qe-remark'), 'another window source');
  assert.equal(modifiedQuote.click(modifiedQuote.document.querySelector('a[href="#/quotes/Q2026004"]'), { shiftKey: true }).defaultPrevented, false);
  assert.equal(modifiedQuote.modal.firstElementChild, null); assert.match(modifiedQuote.c.location.hash, /edit$/); pass();
  console.log('PASS: ' + cases + ' draft navigation scenarios (actual app handlers; asynchronous Node DOM/history fixture, not browser history certification)');
}
run().catch(error => { console.error(error); process.exitCode = 1; });
