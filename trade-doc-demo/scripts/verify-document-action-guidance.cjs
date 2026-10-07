'use strict';
/* 真实Views/Actions与原Model；最小DOM不认证浏览器布局、native键盘或后台权限。 */
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const vm = require('node:vm');
const { execFileSync } = require('node:child_process');
const { fixture } = require('./verify-document-workspace.cjs');
const root = path.resolve(__dirname, '..');
const baseline = 'ac8d5a9cb684964e59d6131ea1719cd6de4cbd6e';
const archivedDocs = () => execFileSync('git', ['show', baseline + ':trade-doc-demo/js/views-docs.js'], { cwd: root, encoding: 'utf8' });
const text = node => (node.textContent || '') + node.children.map(text).join('');
const model = t => JSON.stringify(t.c.MOCK);
// 仅已授权的exact结构及有限字段文案；保对象id、版本、其它attrs/content。
function normalizeActionGuidanceHtml(html) {
  const fields = '(?:包装与备注|唛头与备注|唛头、包装与备注)';
  return html
    .replace(new RegExp('(<button class="btn" data-action="doc-edit" data-id="[^\"]*">)编辑' + fields + '(</button>)', 'g'), '$1编辑[H25字段]$2')
    .replace(new RegExp('(<div class="preview-toolbar"><b>单证预览</b><span>)编辑' + fields + '(</span></div>)', 'g'), '$1编辑[H25字段]$2')
    .replace(new RegExp('(<button class="btn" data-action="doc-revise" data-id="[^\"]*" aria-label=")修订' + fields + '(，生成新版本 V[0-9]+">)修订' + fields + '( · V[0-9]+</button>)', 'g'), '$1修订[H25字段]$2修订[H25字段]$3');
}
function normalizeActionGuidanceSource(source) {
  let result = source.replace(/\r\n/g, '\n');
  const helper = "  function editableDocFields(d) {\n    return d.type === 'CI' ? '唛头与备注' : '唛头、包装与备注';\n  }\n";
  const replacements = [
    ["(editing ? '编辑' + editableDocFields(d) : '交易字段只读')", "(editing ? '编辑唛头、包装与备注' : '交易字段只读')"],
    ["aria-label=\"修订' + editableDocFields(d) + '，生成新版本 V'", "aria-label=\"修订包装与备注，生成新版本 V'"],
    ["'\">修订' + editableDocFields(d) + ' · V'", "'\">修订包装与备注 · V'"],
    ["'\">编辑' + editableDocFields(d) + '</button>'", "'\">编辑包装与备注</button>'"],
    ["U.toast('已进入编辑模式：仅' + editableDocFields(ticket.doc) + '字段可修改，订单带入数据只读', 'info');", "U.toast('已进入编辑模式：仅唛头、包装与备注字段可修改，订单带入数据只读', 'info');"],
    ["'</b>（草稿），仅修订' + editableDocFields(d) + '，<b>沿用 V'", "'</b>（草稿），仅修订唛头、包装与备注，<b>沿用 V'"]
  ];
  for (const [changed, original] of replacements) {
    assert.ok(result.includes(changed) || result.includes(original), 'H25批准槽位必须原完整结构，不能泛删源码');
    if (result.includes(changed)) { assert.equal(result.split(changed).length - 1, 1, 'H25源码槽位不得重复'); result = result.replace(changed, original); }
  }
  if (result.includes(helper)) { assert.equal(result.split(helper).length - 1, 1); result = result.replace(helper, ''); }
  return result;
}
function setup(original = false) {
  const t = fixture(['views-docs'], { 'views-docs': archivedDocs() });
  t.originalView = t.c.Views.docDetail;
  if (!original) vm.runInContext(fs.readFileSync(path.join(root, 'js/views-docs.js'), 'utf8'), t.c);
  return t;
}
function mount(t, id, role = 'doc') {
  const user = t.c.U.roleUser(role); t.c.App.user = user; t.c.location.hash = '#/documents/' + id;
  const before = model(t); t.app.innerHTML = t.c.Views.docDetail({ params: [id], query: {}, user });
  assert.equal(model(t), before, '实际View不得写入完整MOCK'); return t.c.U.doc(id);
}
function editEvidence(t, id) {
  t.c.AppUI.docEditing = null; mount(t, id);
  const label = text(t.app.querySelector('[data-action="doc-edit"]')), before = model(t);
  t.c.Actions['doc-edit']({ dataset: { id } }); mount(t, id);
  assert.equal(model(t), before, '进入编辑不保存交易/单证/历史');
  const ids = [...t.app.querySelectorAll('input'), ...t.app.querySelectorAll('textarea')].map(n => n.id).filter(id => id.startsWith('df-')).sort();
  return { label, toolbar: text(t.app.querySelector('.preview-toolbar')), toast: t.messages.at(-1).text, ids };
}
function revisionEvidence(t, id) {
  t.c.AppUI.docEditing = null; mount(t, id);
  const button = t.app.querySelector('[data-action="doc-revise"]'), before = model(t);
  const confirm = t.c.U.confirm; let options;
  t.c.U.confirm = value => { options = value; return confirm(value); };
  t.c.Actions['doc-revise']({ dataset: { id } });
  t.c.U.confirm = confirm;
  assert.equal(model(t), before, '受控修订开窗只读，不先生成版本');
  return { label: text(button), aria: button.getAttribute('aria-label'), confirm: text(t.modal), message: options.message, before };
}
async function probeOriginal() {
  const t = setup(true), before = model(t), ci = editEvidence(t, 'D-CI2026004-V1');
  assert.deepEqual(ci.ids, ['df-marks', 'df-remark'], '原真实CI恰为2字段');
  const pl = editEvidence(t, 'D-PL2026004-V1');
  assert.deepEqual(pl.ids, ['df-marks', 'df-pk-cartons', 'df-pk-gw', 'df-pk-meas', 'df-pk-nw', 'df-pk-package', 'df-remark'], '原PL7字段正对照');
  const revision = revisionEvidence(t, 'D-CI2026003-V2'); t.c.U.closeModal();
  const plRevision = revisionEvidence(t, 'D-PL2026003-V1'); t.c.U.closeModal();
  assert.ok(pl.toolbar.includes('包装') && pl.toast.includes('包装') && plRevision.confirm.includes('包装'), 'PL原包装说明对应实际字段');
  assert.equal(model(t), before, '原基线probe全MOCK不写、未保存/送审/确认创建');
  let failures = 0;
  for (const [surface, value] of [['edit-button', ci.label], ['editing-toolbar', ci.toolbar], ['edit-toast', ci.toast], ['revise-button-and-aria', revision.label + ' / ' + revision.aria], ['revise-confirm', revision.confirm]]) {
    if (value.includes('包装')) { failures++; console.log('RED CI actual-fields=marks,remark surface=' + surface + ': ' + value); }
  }
  console.log('BASELINE PL 7 fields match packaging guidance; full MOCK unchanged');
  assert.equal(failures, 0, '原CI五主链面仍指导并不存在的包装编辑');
}
async function run() {
  let cases = 0;
  function compareView(t, id) {
    const before = model(t), html = t.app.innerHTML;
    const oldHtml = t.originalView({ params: [id], query: {}, user: t.c.App.user });
    assert.equal(normalizeActionGuidanceHtml(html), normalizeActionGuidanceHtml(oldHtml), '仅三明确HTML槽位文案变化，原横幅/paper/源时间/历史/其它按钮attrs全文精保');
    assert.equal(model(t), before);
  }
  const editableIds = ['df-marks', 'df-remark'];
  const plIds = ['df-marks', 'df-pk-cartons', 'df-pk-gw', 'df-pk-meas', 'df-pk-nw', 'df-pk-package', 'df-remark'];
  for (const [id, fields, ids] of [['D-CI2026004-V1', '唛头与备注', editableIds], ['D-PL2026004-V1', '唛头、包装与备注', plIds]]) {
    const t = setup(), before = model(t), evidence = editEvidence(t, id);
    assert.equal(evidence.label, '编辑' + fields);
    assert.equal(evidence.toolbar, '单证预览编辑' + fields);
    assert.equal(evidence.toast, '已进入编辑模式：仅' + fields + '字段可修改，订单带入数据只读');
    assert.deepEqual(evidence.ids, ids); compareView(t, id);
    assert.equal(model(t), before); cases++;
  }
  for (const role of ['sales', 'fin', 'boss', 'admin']) {
    const t = setup(), id = 'D-CI2026004-V1', before = model(t); mount(t, id, role);
    assert.equal(t.app.querySelector('[data-action="doc-edit"]'), null);
    assert.equal(t.app.querySelector('[data-action="doc-revise"]'), null);
    assert.equal(text(t.app.querySelector('.preview-toolbar')), '单证预览交易字段只读'); compareView(t, id);
    t.c.Actions['doc-edit']({ dataset: { id } }); t.c.Actions['doc-revise']({ dataset: { id } });
    assert.notEqual(t.c.AppUI.docEditing, id); assert.equal(t.modal.firstElementChild, null);
    assert.equal(model(t), before); assert.ok(!t.messages.some(m => m.text.startsWith('已进入编辑模式'))); cases++;
  }
  for (const id of ['D-CI2026003-V1', 'D-CI2026001-V1']) {
    const t = setup(), before = model(t); mount(t, id);
    assert.equal(t.app.querySelector('[data-action="doc-edit"]'), null);
    t.c.Actions['doc-edit']({ dataset: { id } }); t.c.Actions['doc-revise']({ dataset: { id } });
    assert.notEqual(t.c.AppUI.docEditing, id); assert.equal(model(t), before); cases++;
  }
  // 隔离Node暂停状态候选：不用于原生截图，不改源Mock。
  for (const status of ['取消申请中', '已取消']) {
    const t = setup(), id = 'D-CI2026004-V1'; t.c.U.order('SO2026005').status = status; const before = model(t);
    mount(t, id); assert.equal(t.app.querySelector('[data-action="doc-edit"]'), null); compareView(t, id);
    t.c.Actions['doc-edit']({ dataset: { id } }); assert.notEqual(t.c.AppUI.docEditing, id); assert.equal(model(t), before); cases++;
  }
  for (const [id, fields, version] of [['D-CI2026003-V2', '唛头与备注', 3], ['D-PL2026003-V1', '唛头、包装与备注', 2]]) {
    const t = setup(), before = model(t), source = t.c.U.doc(id), evidence = revisionEvidence(t, id);
    assert.equal(evidence.label, '修订' + fields + ' · V' + version);
    assert.equal(evidence.aria, '修订' + fields + '，生成新版本 V' + version);
    assert.ok(evidence.message.includes('仅修订' + fields + '，'));
    const expected = '单证 <b>' + t.c.U.esc(source.no + ' V' + source.version) + '</b> 已审核通过。<br>确认将<b>生成新版本 V' + version + '</b>（草稿），仅修订' + fields + '，<b>沿用 V' + source.version + ' 交易快照</b>。原版本保留，新版本需重新审核。';
    assert.equal(evidence.message, expected, '原完整受控确认事实仅允许字段名变化'); compareView(t, id);
    t.click(t.modal.querySelector('[data-close]')); await t.flush();
    assert.equal(t.modal.firstElementChild, null); assert.equal(model(t), before); cases++;
  }
  for (const [id, fields, version] of [['D-CI2026003-V2', '唛头与备注', 3], ['D-PL2026003-V1', '唛头、包装与备注', 2]]) {
    const t = setup(), source = t.c.U.doc(id), originalRecord = JSON.stringify(source), count = t.c.MOCK.documents.length;
    const payments = JSON.stringify(t.c.MOCK.payments), finance = JSON.stringify(t.c.MOCK.orders.map(o => t.c.U.orderFin(o)));
    revisionEvidence(t, id); t.click(t.modal.querySelector('[data-ok]')); await t.flush();
    assert.equal(t.c.MOCK.documents.length, count + 1);
    const created = t.c.U.doc('D-' + source.no + '-V' + version);
    assert.equal(created.status, '草稿'); assert.equal(created.version, version); assert.equal(created.type, source.type);
    assert.equal(JSON.stringify(source), originalRecord, '合法受控修订不洗旧status/history/source.snapshot');
    assert.equal(JSON.stringify(created.snapshot), JSON.stringify(source.snapshot)); assert.notEqual(created.snapshot, source.snapshot);
    assert.equal(JSON.stringify(created.packing), JSON.stringify(source.packing), '原继承packing逻辑不洗值，不为CI改字段数据');
    assert.equal(JSON.stringify(t.c.MOCK.payments), payments); assert.equal(JSON.stringify(t.c.MOCK.orders.map(o => t.c.U.orderFin(o))), finance);
    mount(t, created.id); assert.equal(text(t.app.querySelector('[data-action="doc-edit"]')), '编辑' + fields);
    const edit = editEvidence(t, created.id); assert.deepEqual(edit.ids, created.type === 'CI' ? editableIds : plIds); cases++;
  }
  const delayed = setup(), delayedId = 'D-CI2026003-V2'; revisionEvidence(delayed, delayedId);
  delayed.c.App.user = delayed.c.U.roleUser('boss'); const afterSwitch = model(delayed);
  delayed.click(delayed.modal.querySelector('[data-ok]')); await delayed.flush();
  assert.equal(model(delayed), afterSwitch, '延迟确认换角色仍拒绝提交，无新增版本'); cases++;
  const captured = setup(), capturedId = 'D-CI2026004-V1'; mount(captured, capturedId);
  captured.c.App.rerender = () => mount(captured, 'D-PL2026004-V1'); const beforeCapture = model(captured);
  captured.c.Actions['doc-edit']({ dataset: { id: capturedId } });
  assert.equal(captured.messages.at(-1).text, '已进入编辑模式：仅唛头与备注字段可修改，订单带入数据只读', 'rerender切换可见页时Toast仍取原captured ticket.doc，不猜当前窗口PL');
  assert.equal(model(captured), beforeCapture); cases++;
  const escaped = setup(), escapedSource = escaped.c.U.doc('D-CI2026003-V2');
  escaped.c.MOCK.documents.filter(d => d.no === escapedSource.no).forEach(d => { d.no = '<img src=x onerror=bad()>&"'; });
  const safety = revisionEvidence(escaped, escapedSource.id);
  assert.ok(safety.message.includes(escaped.c.U.esc(escapedSource.no + ' V2'))); assert.ok(!safety.message.includes('<img'));
  assert.ok(safety.message.includes('仅修订唛头与备注，')); escaped.c.U.closeModal(); cases++;
  // 白名单的反例测试：允许改字段词，必须保其它动态事实/attrs/来源，不能泛吞变化。
  const oldEdit = '<button class="btn" data-action="doc-edit" data-id="D1">编辑包装与备注</button>';
  const newEdit = '<button class="btn" data-action="doc-edit" data-id="D1">编辑唛头与备注</button>';
  assert.equal(normalizeActionGuidanceHtml(oldEdit), normalizeActionGuidanceHtml(newEdit)); cases++;
  for (const mutation of [newEdit.replace('D1', 'D2'), newEdit.replace('class="btn"', 'class="btn hacked"'), newEdit.replace('data-action="doc-edit"', 'data-action="doc-revise"'), newEdit.replace('">编辑', '" disabled>编辑'), newEdit.replace('唛头与备注', '客户与金额')]) {
    assert.notEqual(normalizeActionGuidanceHtml(mutation), normalizeActionGuidanceHtml(oldEdit), '不吞id/class/action/disabled/未授权字段'); cases++;
  }
  const oldRevise = '<button class="btn" data-action="doc-revise" data-id="D1" aria-label="修订包装与备注，生成新版本 V3">修订包装与备注 · V3</button>';
  const newRevise = '<button class="btn" data-action="doc-revise" data-id="D1" aria-label="修订唛头与备注，生成新版本 V3">修订唛头与备注 · V3</button>';
  assert.equal(normalizeActionGuidanceHtml(oldRevise), normalizeActionGuidanceHtml(newRevise)); cases++;
  assert.notEqual(normalizeActionGuidanceHtml(newRevise.replace(/V3/g, 'V4')), normalizeActionGuidanceHtml(oldRevise)); cases++;
  const history = '<div class="tl-opinion">编辑包装与备注；修订唛头与备注</div><div class="paper">包装原文</div><p>原因包装</p>';
  assert.equal(normalizeActionGuidanceHtml(history), history, '原历史/paper/reason不归一'); cases++;
  const source = fs.readFileSync(path.join(root, 'js/views-docs.js'), 'utf8'), archive = archivedDocs().replace(/\r\n/g, '\n');
  assert.equal(normalizeActionGuidanceSource(source), archive, '当前源码仅H25精确helper＋五面文案至R13全文精保'); cases++;
  assert.notEqual(normalizeActionGuidanceSource(source + '\nwindow.unexpectedCommit = true;\n'), archive, '源码范围检查不能吞新增写逻辑'); cases++;
  assert.notEqual(normalizeActionGuidanceSource(source.replace("nd.status = '草稿';", "nd.status = '已通过';")), archive, '受控新状态修改会被精保检查抓住'); cases++;
  console.log(`PASS ${cases} document action guidance scenarios: actual CI/PL fields and five display surfaces, full model read purity, controlled cancel/commit and role guards, strict H25 HTML/source scope (Node fixture only)`);
}
module.exports = { archivedDocs, normalizeActionGuidanceHtml, normalizeActionGuidanceSource };
if (require.main === module) (process.argv.includes('--probe-original') ? probeOriginal() : run()).catch(error => { console.error(error.message); process.exitCode = 1; });
