'use strict';
/* Actual App delegation/history and original dirty navigation guard; state setup is isolated. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { fixture } = require('./verify-document-workspace.cjs');
function setup(hash = '#/dashboard') {
  const appSource = fs.readFileSync(path.resolve(__dirname, '../js/app.js'), 'utf8');
  const t = fixture(['views-docs', 'app'], { app: appSource + '\nwindow.__workBellTestRender = window.App.rerender;' }, { history: true });
  t.c.App.rerender = t.c.__workBellTestRender;
  t.c.U.setUser(t.c.U.roleUser('doc'));
  t.c.U.order('SO2026005').status = '取消申请中'; // read-state setup; actual lifecycle belongs to the other two suites/native.
  t.directHash(hash);
  return t;
}
function open(t) {
  t.click(t.document.getElementById('bell-toggle'));
  assert.equal(t.document.getElementById('bell-toggle').getAttribute('aria-expanded'), 'true');
  const link = t.document.getElementById('bell-dd').querySelector('a'); assert.ok(link); return link;
}
const model = t => JSON.stringify(t.c.MOCK);
const text = n => (n.textContent || '') + n.children.map(text).join('');
function arrived(t) {
  assert.equal(t.document.getElementById('bell-toggle').getAttribute('aria-expanded'), 'false');
  const heading = t.app.querySelector('.doc-work-references').querySelector('h3');
  assert.equal(t.document.activeElement, heading, 'focus reaches the real reference heading');
  assert.equal(heading.getAttribute('tabindex'), '-1');
  assert.ok(text(heading).includes('历史与暂停参考'));
}
async function run() {
  let cases = 0;
  const same = setup(), before = model(same), main = same.app.querySelector('.workspace');
  same.click(open(same)); arrived(same);
  assert.equal(model(same), before); assert.equal(same.app.querySelector('.workspace'), main, 'same-page reference jump keeps source DOM'); cases++;
  const other = setup('#/documents/D-CI2026003-V1'), old = model(other);
  other.click(open(other)); arrived(other); assert.match(other.c.location.hash, /^#\/dashboard/);
  assert.equal(model(other), old); cases++;
  for (const discard of [false, true]) {
    const t = setup('#/documents/D-CI2026003-V1');
    t.c.U.order('SO2026005').status = '执行中';
    t.c.App.requestNavigation('#/documents/D-PL2026004-V1');
    t.click(t.app.querySelector('[data-action="doc-edit"]'));
    const workspace = t.app.querySelector('.workspace'), mark = t.document.getElementById('df-marks');
    assert.ok(mark, 'original document editor exposes the real inline field (not a fabricated form wrapper)');
    mark.value = '未提交唛头保持原文';
    const before = model(t);
    // Invoke the real registered read-navigation action; this guard scenario does not pretend a zero link is visible in an editable state.
    t.c.Actions['doc-work-reference-goto']();
    assert.ok(t.modal.querySelector('[data-ok]'), 'original navigation asks before discarding dirty form');
    assert.equal(t.app.querySelector('.workspace'), workspace); assert.equal(t.document.getElementById('df-marks'), mark); assert.equal(mark.value, '未提交唛头保持原文');
    if (discard) { t.click(t.modal.querySelector('[data-ok]')); await t.flush(); arrived(t); }
    else { t.click(t.modal.querySelector('[data-close]')); assert.equal(t.app.querySelector('.workspace'), workspace); assert.equal(t.document.getElementById('df-marks'), mark); assert.equal(mark.value, '未提交唛头保持原文'); }
    assert.equal(model(t), before); cases++;
  }
  console.log(`PASS: ${cases} document-work bell reference navigation scenarios; same-page source/focus, exact cross-page destination, original dirty cancel/confirm and full-model purity (Node fixture; native scroll not claimed)`);
}
run().catch(error => { console.error(error.stack); process.exitCode = 1; });
