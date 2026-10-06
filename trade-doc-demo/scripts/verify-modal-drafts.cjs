'use strict';
/* Actual shared modal + app Escape handler in a minimal DOM; not native layout/reader proof. */
const assert = require('node:assert/strict');
const { fixture } = require('./verify-document-workspace.cjs');
let cases = 0;
function setup() {
  const t = fixture(['app']);
  const overlay = t.c.U.openModal({ title: '测试作业', persistent: true,
    body: '<form><input id="test-date" value="2026-10-07"><textarea id="test-note"></textarea><div id="test-error" role="alert">原错误</div></form>',
    footer: '<button data-close="1">取消</button><button data-ok="1">提交</button>' });
  const controls = [overlay.querySelector('#test-date'), overlay.querySelector('#test-note')];
  assert.equal(t.c.U.bindModalDraft(overlay, { label: '测试作业', controls }), true);
  return { ...t, overlay, controls };
}
function focus(t, field) {
  field.focus();
  for (const fn of t.overlay.listeners.focusin || []) fn({ target: field });
}
function close(t, kind) {
  if (kind === 'x') t.click(t.overlay.querySelector('.modal-close'));
  else if (kind === 'cancel') t.click(t.overlay.querySelector('.modal-foot').querySelector('[data-close]'));
  else for (const fn of t.handlers.keydown || []) fn({ key: 'Escape', target: t.document.activeElement, preventDefault() {} });
}
assert.equal(typeof fixture(['app']).c.U.bindModalDraft, 'function', 'shared modal draft API must exist (API RED, not old business proof)');
for (const kind of ['x', 'cancel', 'escape']) {
  const t = setup(), baseline = JSON.stringify(t.c.MOCK);
  close(t, kind); assert.equal(t.modal.firstElementChild, null, `${kind}: clean closes directly`); cases++;
  assert.equal(JSON.stringify(t.c.MOCK), baseline); cases++;
}
for (const kind of ['x', 'cancel', 'escape']) {
  const t = setup(), field = t.controls[1], panel = t.overlay.querySelector('.modal-body');
  const modal = t.overlay.querySelector('.modal'), baseline = JSON.stringify(t.c.MOCK);
  field.value = '未提交原文'; field.selectionStart = 2; field.selectionEnd = 4;
  field.setSelectionRange = (a, b) => { field.selectionStart = a; field.selectionEnd = b; };
  panel.scrollTop = 147; panel.scrollLeft = 3; focus(t, field);
  close(t, kind);
  assert.equal(t.modal.firstElementChild, t.overlay); assert.equal(t.overlay.querySelector('#test-note'), field);
  const guard = t.overlay.querySelector('[data-modal-draft-guard]'); assert.ok(guard); cases++;
  t.c.U.requestModalClose(t.overlay);
  assert.ok(t.overlay.querySelector('[data-modal-draft-guard]') === guard, '重复关闭不取消或重建选择'); cases++;
  assert.equal(t.c.U.isModalCurrent(t.overlay), false, '关闭选择中不能提交底层作业');
  assert.equal(t.c.U.setModalBusy(t.overlay, true), false, '关闭选择不能被旧点击抢成提交'); cases++;
  assert.equal(modal.inert, true); assert.equal(modal.getAttribute('aria-hidden'), 'true');
  assert.equal(t.document.activeElement, guard.querySelector('[data-modal-draft-continue]')); cases++;
  t.click(guard.querySelector('[data-modal-draft-continue]'));
  assert.equal(field.value, '未提交原文'); assert.equal(t.document.activeElement, field);
  assert.equal(t.overlay.querySelector('#test-error').textContent, '原错误');
  assert.equal(panel.scrollTop, 147); assert.equal(panel.scrollLeft, 3);
  assert.equal(field.selectionStart, 2); assert.equal(field.selectionEnd, 4); cases++;
  assert.equal(modal.inert, false); assert.equal(modal.getAttribute('aria-hidden'), null);
  assert.equal(t.overlay.querySelector('[data-modal-draft-guard]'), null);
  assert.equal(JSON.stringify(t.c.MOCK), baseline); cases++;
  close(t, kind); close(t, 'escape');
  assert.equal(t.modal.firstElementChild, t.overlay); assert.equal(t.document.activeElement, field);
  assert.equal(t.overlay.querySelector('[data-modal-draft-guard]'), null); cases++;
  close(t, kind); t.click(t.overlay.querySelector('[data-modal-draft-discard]'));
  assert.equal(t.modal.firstElementChild, null); assert.equal(JSON.stringify(t.c.MOCK), baseline); cases++;
}
{
  const t = setup(); t.controls[1].value = '变化'; t.controls[1].value = '';
  close(t, 'x'); assert.equal(t.modal.firstElementChild, null); cases++;
}
{
  const t = setup(); t.controls[1].value = '变化'; t.c.U.markModalDraftClean(t.overlay);
  close(t, 'escape'); assert.equal(t.modal.firstElementChild, null); cases++;
}
for (const kind of ['x', 'cancel', 'escape']) {
  const t = setup(); t.controls[1].value = '处理中'; t.c.U.setModalBusy(t.overlay, true);
  close(t, kind); assert.equal(t.modal.firstElementChild, t.overlay);
  assert.equal(t.overlay.querySelector('[data-modal-draft-guard]'), null);
  assert.match(t.messages.at(-1).text, /正在处理/); cases++;
  t.c.U.setModalBusy(t.overlay, false); close(t, kind);
  assert.ok(t.overlay.querySelector('[data-modal-draft-guard]')); cases++;
}
{
  const t = setup(), old = t.overlay; let newClosed = 0;
  const fresh = t.c.U.openModal({ title: '新作业', body: '<textarea id="new-note">新文字</textarea>', onClose() { newClosed++; } });
  const freshField = fresh.querySelector('#new-note'); freshField.focus();
  assert.equal(t.c.U.isModalCurrent(old), false); assert.equal(t.c.U.isModalCurrent(fresh), true); cases++;
  assert.equal(t.c.U.closeModal(old), false); assert.equal(t.modal.firstElementChild, fresh);
  assert.equal(newClosed, 0); assert.equal(t.document.activeElement, freshField); cases++;
  assert.equal(t.c.U.requestModalClose(old), false); assert.equal(t.c.U.markModalDraftClean(old), false);
  assert.equal(t.c.U.setModalBusy(old, true), false); assert.equal(t.modal.firstElementChild, fresh); cases++;
  t.c.U.closeModal(fresh); assert.equal(newClosed, 1); cases++;
}
{
  const t = setup(), modal = t.overlay.querySelector('.modal');
  modal.inert = true; modal.setAttribute('aria-hidden', 'false'); t.controls[1].value = '变化';
  t.c.U.requestModalClose(t.overlay); t.click(t.overlay.querySelector('[data-modal-draft-continue]'));
  assert.equal(modal.inert, true); assert.equal(modal.getAttribute('aria-hidden'), 'false'); cases++;
}
{
  const t = setup(); t.controls[1].value = '保留内容'; t.c.U.requestModalClose(t.overlay);
  const oldContinue = t.overlay.querySelector('[data-modal-draft-continue]');
  const oldDiscard = t.overlay.querySelector('[data-modal-draft-discard]');
  t.click(oldContinue); t.click(oldDiscard);
  assert.ok(t.modal.firstElementChild === t.overlay, '旧放弃按钮不能关闭已经继续填写的同一源窗'); cases++;
  t.c.U.requestModalClose(t.overlay);
  const freshGuard = t.overlay.querySelector('[data-modal-draft-guard]');
  t.click(oldContinue); t.click(oldDiscard);
  assert.ok(t.overlay.querySelector('[data-modal-draft-guard]') === freshGuard, '旧选择不能关闭或恢复同源新选择'); cases++;
}
console.log(`PASS: ${cases} shared modal draft cases; clean/dirty/busy/source identity, original DOM/errors/focus/selection/scroll and explicit discard (Node fixture only)`);
