'use strict';
/* 原 Views/Action 与实际policy，最小DOM；不代表浏览器布局、读屏或正式权限。 */
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const vm = require('node:vm');
const { execFileSync } = require('node:child_process');
const { fixture } = require('./verify-document-workspace.cjs');
const { archivedDocs, normalizeActionGuidanceHtml, normalizeActionGuidanceSource } = require('./verify-document-action-guidance.cjs');
const root = path.resolve(__dirname, '..');
const baseline = '58a65822e400fcd75398b642456648bd558a8e24';
const originalDocs = () => execFileSync('git', ['show', baseline + ':trade-doc-demo/js/views-docs.js'], { cwd: root, encoding: 'utf8' });
const text = node => (node.textContent || '') + node.children.map(text).join('');
const model = t => JSON.stringify(t.c.MOCK);
const bannerHtml = html => html.match(/<div class="doc-status-banner[^\"]*">[\s\S]*?<\/div>/)[0];
function render(t, id, role) {
  const user = t.c.U.roleUser(role), doc = t.c.U.doc(id); t.c.App.user = user; t.c.location.hash = '#/documents/' + id;
  const before = model(t); const html = t.c.Views.docDetail({ params: [id], query: {}, user }); t.app.innerHTML = html;
  assert.equal(model(t), before, '真实View资格提示不得写MOCK');
  return { doc, user, policy: t.c.U.documentPolicy(doc, user), banner: t.app.querySelector('.doc-status-banner'), html };
}
async function probeOriginal() {
  let failures = 0;
  for (const [id, role] of [['D-CI2026004-V1', 'sales'], ['D-CI2026004-V1', 'fin'], ['D-CI2026004-V1', 'boss'], ['D-CI2026003-V1', 'doc']]) {
    const t = fixture(['views-docs'], { 'views-docs': originalDocs() }), view = render(t, id, role), before = model(t);
    assert.equal(view.policy.canEdit, false); assert.equal(t.app.querySelector('[data-action="doc-edit"]'), null, '原页面已正确不提供编辑');
    t.c.Actions['doc-edit']({ dataset: { id } }); assert.notEqual(t.c.AppUI.docEditing, id); assert.equal(model(t), before, '原真实编辑Action也拒绝，不是业务权限漏洞');
    const banner = text(view.banner);
    if (/字段可编辑|请按意见修订后重新提交审核/.test(banner)) { failures++; console.log(`RED ${role}/${id}: canEdit=false, editButton=false, editAction=refused, banner=${banner}`); }
  }
  assert.equal(failures, 0, '四个原横幅与实际不可编辑资格不一致');
}
async function run() {
  let cases = 0;
  const setup = () => {
    const t = fixture(['views-sales', 'views-docs', 'views-fin']);
    vm.runInContext(originalDocs(), t.c); t.originalView = t.c.Views.docDetail;
    vm.runInContext(fs.readFileSync(path.join(root, 'js/views-docs.js'), 'utf8'), t.c);
    return t;
  };
  function check(t, id, role) {
    const view = render(t, id, role), content = text(view.banner), before = model(t);
    const oldHtml = t.originalView({ params: [id], query: {}, user: view.user });
    assert.equal(model(t), before, '新旧真实Views在同一快照/模型中均纯读');
    assert.equal(normalizeActionGuidanceHtml(view.html.replace(bannerHtml(view.html), '')), normalizeActionGuidanceHtml(oldHtml.replace(bannerHtml(oldHtml), '')), '除横幅与H25批准的三个当前动作文案槽位外整页HTML保持基线，id/版本/其它attrs/纸张/来源/历史精保');
    let guidance = bannerHtml(view.html);
    if (view.doc.status === '已退回') {
      const prefix = bannerHtml(oldHtml).split('<br>')[0].replace(/<\/div>$/, '');
      assert.ok(guidance.startsWith(prefix), '原退回意见/姓名/日期事实前缀逐字保留');
      guidance = guidance.slice(prefix.length);
    }
    if (['草稿', '制作中', '已退回'].includes(view.doc.status)) {
      if (!view.policy.canEdit) {
        assert.ok(content.includes(view.policy.reasons.edit), '完整当前edit原因不截断');
        assert.ok(guidance.includes(t.c.U.esc(view.policy.reasons.edit)), '新指导尾部必须自身带完整原因');
        assert.ok(guidance.includes('当前只读'));
        assert.ok(!/字段可编辑|请按意见修订后重新提交审核|也可申请重新制单/.test(guidance), '只读/暂停/待核新指导不得承诺写操作，历史意见另核保留');
      } else if (view.doc.status === '已退回') {
        assert.equal(view.policy.canSubmit, true);
        assert.ok(guidance.includes('请按意见修订后重新提交审核'));
        assert.equal(guidance.includes('也可申请重新制单'), view.policy.canReform, '仅实际可reform才指导申请');
        if (!view.policy.canReform) assert.ok(guidance.includes(t.c.U.esc(view.policy.reasons.reform)), '真实待处理重制原因完整');
      } else {
        assert.ok(content.includes('字段可编辑'));
        assert.equal(content.includes('包装'), view.doc.type === 'PL', 'CI不指导隐藏的包装字段');
      }
    } else assert.equal(bannerHtml(view.html), bannerHtml(oldHtml), '通过/待审核/未知分支原HTML精确保留');
    cases++; return view;
  }
  const t = setup();
  for (const role of ['sales', 'fin', 'boss', 'admin', 'doc']) check(t, 'D-CI2026004-V1', role);
  for (const role of ['doc', 'sales', 'fin', 'boss', 'admin']) check(t, 'D-PL2026004-V1', role);
  for (const role of ['doc', 'sales']) check(t, 'D-CI2026003-V1', role);
  // 以下为隔离Node异常/状态候选，不用于伪造真实样例截图。
  const draft = setup(); draft.c.U.doc('D-CI2026004-V1').status = '草稿';
  check(draft, 'D-CI2026004-V1', 'doc'); check(draft, 'D-CI2026004-V1', 'boss');
  const plDraft = setup(); plDraft.c.U.doc('D-PL2026004-V1').status = '草稿';
  check(plDraft, 'D-PL2026004-V1', 'doc');
  const reform = setup(); reform.c.MOCK.approvals = reform.c.MOCK.approvals.filter(a => a.targetId !== 'D-PL2026004-V1' || a.status !== '待处理');
  assert.equal(check(reform, 'D-PL2026004-V1', 'doc').policy.canReform, true);
  const conflict = setup(), conflictingDoc = conflict.c.U.doc('D-CI2026004-V1');
  conflict.c.MOCK.documents.push({ ...conflictingDoc, id: 'ISOLATED-DUPLICATE' }); check(conflict, conflictingDoc.id, 'doc');
  const missing = setup(); missing.c.MOCK.orders = missing.c.MOCK.orders.filter(o => o.id !== 'SO2026005'); check(missing, 'D-CI2026004-V1', 'doc');
  const invalidActor = setup(), invalid = { role: 'doc', id: '', name: '' };
  const oldRoleUser = invalidActor.c.U.roleUser; invalidActor.c.U.roleUser = () => invalid;
  check(invalidActor, 'D-CI2026004-V1', 'doc'); invalidActor.c.U.roleUser = oldRoleUser;
  // 横幅必须用实际ctx.user；这里让App.user不同，仅核横幅，原右栏不纳入新契约。
  const actual = setup(), actor = actual.c.U.roleUser('sales'); actual.c.App.user = actual.c.U.roleUser('doc');
  const beforeActor = model(actual), actorHtml = actual.c.Views.docDetail({ params: ['D-CI2026004-V1'], query: {}, user: actor });
  assert.ok(bannerHtml(actorHtml).includes(actual.c.U.esc(actual.c.U.documentPolicy(actual.c.U.doc('D-CI2026004-V1'), actor).reasons.edit)));
  assert.ok(!bannerHtml(actorHtml).includes('字段可编辑')); assert.equal(model(actual), beforeActor); cases++;
  const htmlSafety = setup(), returned = htmlSafety.c.U.doc('D-PL2026004-V1');
  returned.opinion = '完整退回意见<&><script>bad()</script>\n尾部'; returned.approver = '<b>名字&</b>'; returned.approvedAt = '<img onerror=bad()>日期';
  const safe = check(htmlSafety, returned.id, 'doc');
  for (const value of [returned.opinion, returned.approver, returned.approvedAt]) assert.ok(bannerHtml(safe.html).includes(htmlSafety.c.U.esc(value)));
  assert.ok(!bannerHtml(safe.html).includes('<script>')); assert.ok(!bannerHtml(safe.html).includes('<img'));
  const sameOpinion = setup(), historicalFact = sameOpinion.c.U.doc('D-CI2026003-V1');
  historicalFact.opinion = '请按意见修订后重新提交审核。也可申请重新制单生成新版本。<img src=x onerror=bad()>&尾部';
  historicalFact.approver = '<b>原处理人&</b>'; historicalFact.approvedAt = '<script>bad()</script>原日期';
  const same = check(sameOpinion, historicalFact.id, 'doc'), sameBanner = bannerHtml(same.html);
  for (const value of [historicalFact.opinion, historicalFact.approver, historicalFact.approvedAt]) assert.ok(sameBanner.includes(sameOpinion.c.U.esc(value)), '历史同句事实完整转义保留');
  const samePrefix = '<div class="doc-status-banner reject"><b>已退回：</b>' + sameOpinion.c.U.esc(historicalFact.opinion) + '（' + sameOpinion.c.U.esc(historicalFact.approver) + ' · ' + sameOpinion.c.U.esc(historicalFact.approvedAt) + '）';
  assert.equal(sameBanner.slice(samePrefix.length), '<br>当前只读：' + sameOpinion.c.U.esc(same.policy.reasons.edit) + '</div>', '当前指导只完整原edit原因，未借历史同句邀请新操作');
  assert.ok(!sameBanner.includes('<img')); assert.ok(!sameBanner.includes('<script>'));
  // 原完整版本阻断原因由真实policy产生，不截断最新版本号、不模拟helper。
  const reasonSafety = setup(), historical = reasonSafety.c.U.doc('D-CI2026003-V1');
  reasonSafety.c.U.doc('D-CI2026003-V2').version = 10000;
  const reason = check(reasonSafety, historical.id, 'doc'); assert.ok(reason.policy.reasons.edit.includes('V10000'));
  assert.ok(bannerHtml(reason.html).includes(reasonSafety.c.U.esc(reason.policy.reasons.edit)));
  for (const [id, role] of [['D-CI2026003-V2', 'doc'], ['D-CI2026002-V1', 'boss'], ['D-CI2026001-V1', 'boss'], ['D-PL2026001-V1', 'doc']]) check(setup(), id, role);
  const unknown = setup(); unknown.c.U.doc('D-CI2026004-V1').status = '未知<&>状态'; check(unknown, 'D-CI2026004-V1', 'doc');
  async function requestCancel(f) {
    f.c.App.user = f.c.U.roleUser('sales'); f.c.Actions['order-apply-change']({ dataset: { id: 'SO2026005' } });
    const type = f.modal.querySelector('#oc-type'); type.value = '取消申请'; for (const listener of type.listeners.change || []) listener({ target: type });
    f.modal.querySelector('#oc-reason').value = '真实动作暂停，历史单证仍只读保留';
    f.click(f.modal.querySelector('[data-ok]')); await f.flush();
    assert.equal(f.c.U.order('SO2026005').status, '取消申请中');
    return f.c.MOCK.approvals.find(a => a.type === '取消申请' && a.targetId === 'SO2026005' && a.status === '待处理');
  }
  const cancellation = setup(), oldDocuments = JSON.stringify(cancellation.c.MOCK.documents), request = await requestCancel(cancellation);
  check(cancellation, 'D-CI2026004-V1', 'doc'); check(cancellation, 'D-PL2026004-V1', 'doc');
  cancellation.c.App.user = cancellation.c.U.roleUser('boss'); cancellation.c.Actions['ap-handle']({ dataset: { id: request.id } });
  cancellation.modal.querySelector('#ap-opinion').value = '退回取消恢复执行'; cancellation.click(cancellation.modal.querySelector('[data-act="reject"]')); await cancellation.flush();
  assert.equal(cancellation.c.U.order('SO2026005').status, '执行中');
  check(cancellation, 'D-CI2026004-V1', 'doc'); check(cancellation, 'D-PL2026004-V1', 'doc');
  assert.equal(JSON.stringify(cancellation.c.MOCK.documents), oldDocuments, '取消申请/退回与横幅渲染保单证status/history/snapshot');
  const cancelled = setup(), cancelledRequest = await requestCancel(cancelled), savedDocuments = JSON.stringify(cancelled.c.MOCK.documents);
  cancelled.c.App.user = cancelled.c.U.roleUser('boss'); cancelled.c.Actions['ap-handle']({ dataset: { id: cancelledRequest.id } });
  cancelled.click(cancelled.modal.querySelector('[data-act="approve"]')); await cancelled.flush();
  assert.equal(cancelled.c.U.order('SO2026005').status, '已取消');
  check(cancelled, 'D-CI2026004-V1', 'doc'); check(cancelled, 'D-PL2026004-V1', 'doc');
  assert.equal(JSON.stringify(cancelled.c.MOCK.documents), savedDocuments, '取消通过不改历史单证');
  const source = fs.readFileSync(path.join(root, 'js/views-docs.js'), 'utf8').replace(/\r\n/g, '\n'), original = originalDocs().replace(/\r\n/g, '\n');
  const removeOwnedLines = s => s.split('\n').filter(line => !line.includes("if (d.status === '已退回') banner =") && !line.includes("else if (d.status === '草稿' || d.status === '制作中') banner =")).join('\n');
  const publishedR13 = archivedDocs().replace(/\r\n/g, '\n');
  assert.equal(removeOwnedLines(publishedR13), removeOwnedLines(original), '已发布R13归档仍仅两个横幅分支，其它源码与原58基线精保');
  assert.equal(normalizeActionGuidanceSource(source), publishedR13, '当前源码仅允许H25私人helper和五主链文案，归一后与已发布R13全文精保');
  console.log(`PASS ${cases} document status guidance scenarios: actual policy/Views/Actions, baseline outside-banner equality, read-only full MOCK, cancel/restore lifecycle, escape and exact review facts (Node fixture only)`);
}
(process.argv.includes('--probe-original') ? probeOriginal() : run()).catch(error => { console.error(error.message); process.exitCode = 1; });
