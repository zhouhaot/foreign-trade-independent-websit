'use strict';
/* 实际主管处理动作 + U 弹窗/App 委托；最小 DOM 与真实 Promise，不是浏览器焦点或财务制度认证。 */
const assert = require('node:assert/strict');
const { fixture } = require('./verify-document-workspace.cjs');
function load() {
  const t = fixture(['views-fin', 'app']);
  t.c.App.user = t.c.U.roleUser('boss'); t.c.location.hash = '#/approvals';
  t.app.innerHTML = '<div class="workspace">' + t.c.Views.approvals({ user: t.c.App.user, query: {} }) + '</div>';
  if (t.c.App.markDraftClean) t.c.App.markDraftClean();
  const approval = t.c.MOCK.approvals.find(a => a.id === 'AP20260903'); approval.targetAmount = 14075;
  return Object.assign(t, { approval, open(id = approval.id) { t.c.Actions['ap-handle']({ dataset: { id } }); return t.modal.firstElementChild; } });
}
const state = t => JSON.stringify(t.c.MOCK);
async function redEvidence() {
  // 仅用于修改前基线调查；修复后 --red 的旧缺陷断言应失败，默认分支才是当前回归。
  const t = load(), source = t.open(), opinion = source.querySelector('#ap-opinion'); opinion.value = '尚未提交的主管意见';
  t.click(source.querySelector('[data-close]'));
  assert.equal(source.isConnected, false, 'RED 基线：X 未保护原意见 DOM');
  const race = load(), old = race.open(); race.click(old.querySelector('[data-act="approve"]'));
  old.remove();
  const fresh = race.c.U.openModal({ title: '新作业', body: '<textarea id="new-job">新作业输入</textarea>', footer: '<button data-close="1">取消</button>', persistent: true });
  const before = state(race); await race.flush();
  assert.equal(state(race) === before, false, 'RED 基线：已替换源异步仍写业务');
  assert.equal(fresh.isConnected, false, 'RED 基线：旧成功无参close误关新作业');
  console.log('RED CONFIRMED: approval X discards typed source DOM; replaced approval callback writes business and closes the new modal (real actions/U modal/Promise, Node DOM fixture)');
}
async function greenEvidence() {
  let checks = 0;
  function choice(source, pattern) { return source.querySelectorAll('button').find(b => pattern.test(b.textContent || '')); }
  function close(t, source, method) {
    if (method === 'Escape') {
      const event = { key: 'Escape', target: t.document.activeElement, preventDefault() { this.prevented = true; }, stopPropagation() {} };
      for (const fn of t.handlers.keydown || []) fn(event);
    } else t.click(source.querySelectorAll('[data-close]')[method === '取消' ? 1 : 0]);
  }
  for (const method of ['X', '取消', 'Escape']) {
    const clean = load(), original = clean.open(), untouched = state(clean);
    close(clean, original, method); assert.equal(original.isConnected, false, '原始值未变直接关闭'); assert.equal(state(clean), untouched); checks++;
    const t = load(), source = t.open(), opinion = source.querySelector('#ap-opinion'), body = source.querySelector('.modal-body');
    opinion.value = ' 原始主管意见\n第二行 '; opinion.scrollTop = 37; body.scrollTop = 121;
    opinion.selectionStart = 2; opinion.selectionEnd = 7; opinion.setSelectionRange = (start, end) => { opinion.selectionStart = start; opinion.selectionEnd = end; };
    t.c.U.fieldError(opinion, '已存在的处理意见错误'); opinion.focus();
    const error = opinion.closest('.form-item').querySelector('.field-error'), originalError = error.textContent;
    const before = state(t), renders = t.renders;
    close(t, source, method); assert.equal(source.isConnected, true, '关闭先保源 DOM');
    assert.equal(source.querySelector('#ap-opinion'), opinion); assert.equal(opinion.value, ' 原始主管意见\n第二行 ');
    assert.equal(error.textContent, originalError); assert.equal(opinion.getAttribute('aria-invalid'), 'true');
    assert.equal(opinion.scrollTop, 37); assert.equal(body.scrollTop, 121); assert.equal(state(t), before); assert.equal(t.renders, renders);
    assert.equal(source.querySelectorAll('[role="alertdialog"]').length, 1); close(t, source, 'X');
    assert.equal(source.querySelectorAll('[role="alertdialog"]').length, 1, '重复关闭不叠选择');
    const keep = choice(source, /继续填写/); assert.ok(keep); t.click(keep);
    assert.equal(source.querySelectorAll('[role="alertdialog"]').length, 0); assert.equal(t.document.activeElement, opinion, '继续回原意见焦点');
    assert.equal(opinion.scrollTop, 37); assert.equal(body.scrollTop, 121); assert.equal(error.textContent, originalError);
    assert.equal(opinion.selectionStart, 2); assert.equal(opinion.selectionEnd, 7, '恢复原意见选区（DOM 桩，不代表原生选区验收）');
    close(t, source, method); const discard = choice(source, /放弃填写并关闭/); assert.ok(discard); t.click(discard);
    assert.equal(source.isConnected, false); assert.equal(state(t), before, '放弃填写不批准/退回/改业务'); checks++;
  }
  const restored = load(), restoredSource = restored.open(), restoredInput = restoredSource.querySelector('#ap-opinion');
  restoredInput.value = '临时意见'; restoredInput.value = ''; close(restored, restoredSource, 'X'); assert.equal(restoredSource.isConnected, false, '恢复所有原值可直接关'); checks++;
  const space = load(), spaceSource = space.open(); spaceSource.querySelector('#ap-opinion').value = ' ';
  close(space, spaceSource, 'X'); assert.ok(choice(spaceSource, /继续填写/), 'raw空格也是填写变化'); close(space, spaceSource, 'Escape');
  assert.equal(spaceSource.isConnected, true); assert.equal(spaceSource.querySelectorAll('[role="alertdialog"]').length, 0, '关闭选择中Esc继续'); checks++;
  const guarded = load(), guardedSource = guarded.open(); guardedSource.querySelector('#ap-opinion').value = '不允许底层提交'; close(guarded, guardedSource, 'X');
  const guardBefore = state(guarded); guarded.click(guardedSource.querySelector('[data-act="approve"]')); await guarded.flush(); assert.equal(state(guarded), guardBefore, '显示关闭选择时底层旧提交不能生效'); checks++;

  for (const pass of [true, false]) {
    const success = load(), source = success.open(), opinion = source.querySelector('#ap-opinion'); opinion.value = '核对后的处理意见';
    const payments = JSON.stringify(success.c.MOCK.payments), docs = JSON.stringify(success.c.MOCK.documents);
    success.click(source.querySelector('[data-act="' + (pass ? 'approve' : 'reject') + '"]'));
    close(success, source, 'X'); assert.equal(source.isConnected, true, 'Promise窗口busy同步保护关闭'); assert.equal(source.querySelectorAll('[role="alertdialog"]').length, 0, 'busy不是放弃选择');
    await success.flush(); assert.equal(success.approval.status, pass ? '已通过' : '已退回'); assert.equal(success.approval.opinion, '核对后的处理意见');
    assert.equal(source.isConnected, false, '真实commit后源clean程序关闭免提示'); assert.equal(success.renders, 1);
    assert.equal(JSON.stringify(success.c.MOCK.payments), payments); assert.equal(JSON.stringify(success.c.MOCK.documents), docs); checks++;
  }
  const invalid = load(); invalid.approval.targetAmount = 27305.50;
  const invalidSource = invalid.open(), invalidInput = invalidSource.querySelector('#ap-opinion'); invalidInput.value = '金额候选待核对';
  const invalidBefore = state(invalid); invalid.click(invalidSource.querySelector('[data-act="approve"]')); await invalid.flush();
  assert.equal(state(invalid), invalidBefore); assert.equal(invalidSource.isConnected, true); assert.match(invalidSource.querySelector('#ap-effect-error').textContent, /20.50/); assert.equal(invalidInput.value, '金额候选待核对');
  close(invalid, invalidSource, 'X'); assert.ok(choice(invalidSource, /继续填写/), '失败释放busy后仍保护未提交意见'); checks++;
  const missing = load(), missingSource = missing.open(); missing.click(missingSource.querySelector('[data-act="reject"]')); assert.equal(missing.approval.status, '待处理');
  const missingInput = missingSource.querySelector('#ap-opinion'); assert.equal(missingInput.getAttribute('aria-invalid'), 'true'); assert.match(missingInput.getAttribute('aria-describedby') || '', /ap-opinion-error/); checks++;

  for (const mutate of [t => { t.c.App.user = t.c.U.roleUser('fin'); }, t => { t.approval.targetAmount = 28150; }, t => { t.c.U.order('SO2026005').currency = 'EUR'; }]) {
    const t = load(), source = t.open(); source.querySelector('#ap-opinion').value = '原提交意见'; t.click(source.querySelector('[data-act="approve"]')); mutate(t);
    const before = state(t); await t.flush(); assert.equal(state(t), before); assert.equal(source.isConnected, true); assert.ok(source.querySelector('#ap-effect-error').textContent); checks++;
  }
  const changed = load(), changedSource = changed.open(), changedInput = changedSource.querySelector('#ap-opinion'); changedInput.value = '意见A';
  changed.click(changedSource.querySelector('[data-act="approve"]')); changedInput.value = '意见B'; const changedBefore = state(changed); await changed.flush();
  assert.equal(state(changed), changedBefore, '排队意见A→B不偷偷提交A'); assert.equal(changedInput.value, '意见B'); assert.match(changedSource.querySelector('#ap-effect-error').textContent, /意见.*变化|内容.*变化/); checks++;
  const replacedInput = load(), replacementSource = replacedInput.open(); replacedInput.click(replacementSource.querySelector('[data-act="approve"]'));
  replacementSource.querySelector('#ap-opinion').remove(); const substitute = replacedInput.document.createElement('textarea'); substitute.id = 'ap-opinion'; substitute.value = '新节点'; replacementSource.querySelector('.modal-body').appendChild(substitute);
  const replacementBefore = state(replacedInput); await replacedInput.flush(); assert.equal(state(replacedInput), replacementBefore); checks++;
  const beforeClick = load(), beforeClickSource = beforeClick.open(); beforeClickSource.querySelector('#ap-opinion').remove();
  const beforeClickReplacement = beforeClick.document.createElement('textarea'); beforeClickReplacement.id = 'ap-opinion'; beforeClickSource.querySelector('.modal-body').appendChild(beforeClickReplacement);
  const beforeClickState = state(beforeClick); beforeClick.click(beforeClickSource.querySelector('[data-act="approve"]')); await beforeClick.flush();
  assert.equal(state(beforeClick), beforeClickState); assert.match(beforeClickSource.querySelector('#ap-effect-error').textContent, /输入节点已变化/); checks++;
  const stale = load(), old = stale.open(); stale.click(old.querySelector('[data-act="approve"]')); old.remove();
  const fresh = stale.c.U.openModal({ title: '新作业', body: '<textarea id="new-job">新作业输入</textarea>', footer: '<button data-close="1">取消</button>', persistent: true });
  const freshInput = fresh.querySelector('#new-job'), staleBefore = state(stale); await stale.flush();
  assert.equal(state(stale), staleBefore); assert.equal(fresh.isConnected, true, '旧callback不能关新作业'); assert.equal(fresh.querySelector('#new-job'), freshInput); assert.equal(freshInput.value, '新作业输入'); assert.equal(stale.renders, 0);
  stale.c.U.closeModal(fresh); const retry = stale.open(); stale.click(retry.querySelector('[data-act="approve"]')); await stale.flush(); assert.equal(stale.approval.status, '已通过', '失效旧callback释放申请锁可重新开窗'); checks++;
  const duplicate = load(), duplicateSource = duplicate.open(); duplicateSource.querySelector('#ap-opinion').value = '一次处理';
  duplicate.click(duplicateSource.querySelector('[data-act="approve"]')); duplicate.click(duplicateSource.querySelector('[data-act="reject"]')); duplicate.click(duplicateSource.querySelector('[data-act="approve"]')); await duplicate.flush();
  assert.equal(duplicate.approval.status, '已通过'); assert.equal(duplicate.renders, 1); assert.equal(duplicate.messages.filter(m => /^已通过：/.test(m.text)).length, 1); checks++;
  console.log('PASS: ' + checks + ' approval modal draft cases: actual actions/modal/keyboard handlers and Promise, source node/value/error/focus/scroll preservation, busy/failure/commit/stale/duplicate (Node DOM fixture only)');
}
(process.argv.includes('--red') ? redEvidence() : greenEvidence()).catch(error => { console.error(error); process.exitCode = 1; });
