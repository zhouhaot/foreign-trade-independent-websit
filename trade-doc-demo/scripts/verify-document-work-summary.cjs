'use strict';
/* Actual shared policy and lifecycle actions; DOM fixture evidence, not native notifications. */
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const path = require('node:path');
const { fixture } = require('./verify-document-workspace.cjs');
function setup(sources) {
  const t = fixture(['views-sales', 'views-docs', 'views-fin'], sources || {});
  t.c.App.user = t.c.U.roleUser('doc');
  t.c.U.setUser(t.c.App.user);
  return t;
}
const model = t => JSON.stringify(t.c.MOCK);
function read(t, user) {
  if (arguments.length < 2) user = t.c.App.user;
  const before = model(t), result = t.c.U.documentWorkSummary(user);
  assert.equal(model(t), before, 'summary/policy reads keep the whole model');
  return result;
}
const ids = list => Array.from(list, x => x.documentId);
async function run() {
  let cases = 0;
  const original = process.argv.includes('--probe-original') ? { utils: execFileSync('git', ['show', '77deae8ae937c0c1d005d4b3b019d5d150e623b8:trade-doc-demo/js/utils.js'], { cwd: path.resolve(__dirname, '..'), encoding: 'utf8' }) } : undefined;
  const initial = setup(original);
  if (process.argv.includes('--probe-original')) {
    const old = initial.c.U.todosFor('doc', initial.c.App.user.name, initial.c.App.user);
    const actual = Array.from(old, x => x.link.slice('#/documents/'.length));
    console.log('Original shared queue: ' + actual.join(', '));
    assert.deepEqual(actual, ['D-CI2026004-V1', 'D-PL2026004-V1'], 'old historical V1 is not actionable');
    return;
  }
  assert.equal(typeof initial.c.U.documentWorkSummary, 'function', 'new API availability (separate from original business RED)');
  const s = read(initial);
  assert.deepEqual(ids(s.todos), ['D-CI2026004-V1', 'D-PL2026004-V1']);
  assert.deepEqual(ids(s.references), ['D-CI2026003-V1']);
  assert.match(s.references[0].reason, /历史旧版/);
  assert.equal(s.references[0].kind, '历史查阅');
  assert.equal(s.references[0].link, '#/documents/D-CI2026003-V1');
  assert.equal(s.identityError, '');
  assert.equal(JSON.stringify(initial.c.U.todosFor('doc', initial.c.App.user.name, initial.c.App.user)), JSON.stringify(s.todos));
  assert.equal(JSON.stringify(initial.c.U.todosFor('doc', initial.c.App.user.name)), JSON.stringify(s.todos), 'legacy call uses actual session, never a guessed role user'); cases++;
  for (const user of [null, undefined, {}, { role: 'doc', name: '王芳' }, { role: 'doc', id: 'U3' }, initial.c.U.roleUser('boss')]) {
    const result = read(initial, user);
    assert.equal(result.todos.length, 0); assert.equal(result.references.length, 0); assert.ok(result.identityError);
    assert.equal(initial.c.U.todosFor('doc', '王芳', user).length, 0, 'explicit absent/wrong actor cannot fall back to a different session'); cases++;
  }
  for (const role of ['sales', 'fin', 'boss', 'admin']) {
    const t = setup(), user = t.c.U.roleUser(role), before = model(t);
    const legacy = t.c.U.todosFor(role, user.name);
    assert.equal(JSON.stringify(t.c.U.todosFor(role, user.name, user)), JSON.stringify(legacy));
    assert.equal(model(t), before); cases++;
  }
  const changed = [
    ['missing order', (t, d) => { d.orderId = 'MISSING'; }],
    ['duplicate order', (t, d) => { t.c.MOCK.orders.push({ ...t.c.U.order(d.orderId) }); }],
    ['duplicate document ID', (t, d) => { t.c.MOCK.documents.push({ ...d }); }],
    ['unknown type', (t, d) => { d.type = 'OTHER'; }],
    ['empty no', (t, d) => { d.no = ''; }],
    ['invalid version', (t, d) => { d.version = 0; }],
    ['unsafe version', (t, d) => { d.version = Number.MAX_SAFE_INTEGER + 1; }],
    ...['has space', '中文', 'a/b', 'a%20b', 'a?b', 'a#b', '\ud800'].map(id => ['unroutable ' + JSON.stringify(id), (t, d) => { d.id = id; }])
  ];
  for (const [label, mutate] of changed) {
    const t = setup(), d = t.c.U.doc('D-CI2026004-V1'); mutate(t, d);
    const result = read(t), references = result.references.filter(r => r.documentId === d.id);
    assert.ok(references.length, label); assert.ok(!result.todos.some(r => r.documentId === d.id), label);
    assert.ok(references.every(r => r.link === null && r.reason && r.kind === '待核对'), label); cases++;
    const sources = t.c.MOCK.documents.filter(source => source.id === d.id && ['制作中', '草稿', '已退回'].includes(source.status));
    sources.forEach((source, index) => {
      const policyReason = t.c.U.documentPolicy(source, t.c.App.user).reasons.edit;
      if (policyReason) assert.ok(references[index].reason.includes(policyReason), 'preserve each original source policy reason: ' + label);
    });
  }
  for (const version of [1, 2]) {
    const t = setup(), d = t.c.U.doc('D-CI2026004-V1');
    t.c.MOCK.documents.push({ ...d, id: 'D-CI2026004-V' + version + '-SECOND', version });
    const result = read(t);
    if (version === 1) {
      assert.ok(!result.todos.some(r => r.documentId.startsWith('D-CI2026004')));
      assert.ok(result.references.filter(r => r.documentId.startsWith('D-CI2026004')).every(r => /冲突/.test(r.reason)));
    } else {
      assert.ok(result.todos.some(r => r.documentId === 'D-CI2026004-V2-SECOND'));
      assert.ok(result.references.some(r => r.documentId === d.id && r.kind === '历史查阅'));
    } cases++;
  }
  for (const status of ['待审核', '已通过', '未知状态']) {
    const t = setup(), d = t.c.U.doc('D-CI2026004-V1'); d.status = status;
    const result = read(t); assert.ok(!result.todos.concat(result.references).some(r => r.documentId === d.id)); cases++;
  }
  for (const decision of ['reject', 'approve']) {
    const t = setup(), { c } = t;
    c.App.user = c.U.roleUser('sales');
    c.Actions['order-apply-change']({ dataset: { id: 'SO2026005' } });
    const form = t.modal.firstElementChild;
    form.querySelector('#oc-type').value = '取消申请';
    form.querySelector('#oc-reason').value = '与客户核对，暂缓本订单制单';
    t.click(form.querySelector('[data-ok]')); await t.flush();
    assert.equal(c.U.order('SO2026005').status, '取消申请中');
    c.App.user = c.U.roleUser('doc');
    const paused = read(t); assert.equal(paused.todos.length, 0); assert.equal(paused.references.length, 3);
    assert.ok(paused.references.filter(r => r.documentId.includes('2026004')).every(r => r.kind === '操作暂停' && /取消申请中/.test(r.reason)));
    const request = c.MOCK.approvals.find(a => a.targetId === 'SO2026005' && a.type === '取消申请' && a.status === '待处理');
    const documents = JSON.stringify(c.MOCK.documents), payments = JSON.stringify(c.MOCK.payments);
    c.App.user = c.U.roleUser('boss');
    c.Actions['ap-handle']({ dataset: { id: request.id } });
    t.modal.querySelector('#ap-opinion').value = decision === 'reject' ? '客户撤回，恢复原订单继续制单' : '确认取消，保留历史';
    t.click(t.modal.querySelector('[data-act="' + decision + '"]')); await t.flush();
    c.App.user = c.U.roleUser('doc');
    const after = read(t);
    assert.equal(after.todos.length, decision === 'reject' ? 2 : 0);
    assert.equal(c.U.order('SO2026005').status, decision === 'reject' ? '执行中' : '已取消');
    assert.equal(JSON.stringify(c.MOCK.documents), documents); assert.equal(JSON.stringify(c.MOCK.payments), payments); cases++;
  }
  console.log(`PASS: ${cases} shared document-work summary scenarios; current policy, actual identity, safe exact routes, lifecycle pause/restore, historical references and whole-model read purity (Node fixture only)`);
}
run().catch(error => { console.error(error.stack); process.exitCode = 1; });
