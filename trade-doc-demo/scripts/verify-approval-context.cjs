'use strict';
/* H22: actual Views/app route rendering in the minimal DOM fixture; no native layout certification. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { fixture } = require('./verify-document-workspace.cjs');
const root = path.resolve(__dirname, '..');
const text = n => (n.textContent || '') + n.children.map(text).join('');
const snapshot = c => JSON.stringify(c.MOCK);
function render(t, role = 'boss') {
  t.c.App.user = t.c.U.roleUser(role);
  // Base fixture storage is a no-op; supply the demo session seam for actual app route checks.
  const actor = t.c.App.user; t.c.U.currentUser = () => actor;
  t.c.location.hash = '#/approvals';
  const before = snapshot(t.c);
  t.app.innerHTML = t.c.Views.approvals({ user: t.c.App.user, params: [], query: {} });
  assert.equal(snapshot(t.c), before, 'actual Views is wholly read-only');
  return t.app;
}
function row(t, id) { const n = t.app.querySelectorAll('tr').find(n => n.dataset.approvalId === id); assert.ok(n, `readable row ${id}`); return n; }
function references(n) { return n.querySelectorAll('.approval-link'); }
function run() {
  if (process.argv.includes('--red')) {
    const missing = [];
    for (const role of ['sales', 'doc']) {
      const t = fixture(['views-fin', 'app']); render(t, role);
      for (const a of t.c.MOCK.approvals.filter(a => a.applicant === t.c.App.user.name && a.status !== '待处理')) {
        if (!text(t.app).includes(a.id)) missing.push(`${role}/${a.id}: missing readable ID`);
        if (!text(t.app).includes(a.reason)) missing.push(`${role}/${a.id}: missing original reason`);
        const href = '#/' + (a.targetType === 'order' ? 'orders/' : 'documents/') + encodeURIComponent(a.targetId);
        if (!t.app.querySelectorAll('a').some(n => n.getAttribute('href') === href)) missing.push(`${role}/${a.id}: missing exact target link`);
      }
    }
    assert.equal(missing.length, 9, 'three original results each lack ID/reason/link before H22');
    console.log('RED CONFIRMED: ' + missing.join('; ')); return;
  }
  let cases = 0;
  const counts = { sales: [2, 2], doc: [3, 1], fin: [0, 0], boss: [5, 3], admin: [0, 0] };
  for (const role of Object.keys(counts)) {
    const t = fixture(['views-sales', 'views-docs', 'views-fin', 'app']), { c } = t;
    render(t, role);
    const expected = c.MOCK.approvals.filter(a => role === 'boss' || a.applicant === c.App.user.name);
    const pending = expected.filter(a => a.status === '待处理');
    const done = expected.filter(a => a.status !== '待处理').sort((a, b) => (b.handleTime || '').localeCompare(a.handleTime || ''));
    const tables = t.app.querySelectorAll('table');
    assert.equal(tables.length, 2); assert.deepEqual(tables.map(n => n.querySelector('thead').querySelectorAll('th').length), [6, 8]);
    assert.deepEqual([pending.length, done.length], counts[role]);
    assert.deepEqual(t.app.querySelectorAll('[data-approval-id]').map(n => n.dataset.approvalId), [...pending, ...done].map(a => a.id));
    assert.ok(text(t.app).includes(`共 ${pending.length} 项`));
    for (const a of expected) {
      const r = row(t, a.id); assert.ok(text(r).includes(a.id)); assert.ok(text(r).includes(a.title));
      assert.ok(text(r).includes(a.reason || '未记录')); assert.ok(text(r).includes(a.opinion || '—') || a.status === '待处理');
      const link = references(r); assert.equal(link.length, 1);
      assert.ok(link[0].parentElement.classList.contains('approval-target'), 'context prefix and named view link share one target line');
      assert.equal(text(link[0].parentElement), (a.targetType === 'order' ? '关联订单：' : '关联单证：') + text(link[0]), 'target line has no second duplicate ID/version description');
      const href = '#/' + (a.targetType === 'order' ? 'orders/' : 'documents/') + encodeURIComponent(a.targetId);
      assert.equal(link[0].getAttribute('href'), href);
      assert.ok(text(link[0]).includes(a.targetType === 'order' ? '查看关联订单' : '查看申请对应单证'));
      if (a.status !== '待处理') {
        const details = r.querySelector('.approval-reference'); assert.equal(details.tagName, 'DETAILS');
        assert.ok(text(details.querySelector('summary')).includes('原申请理由'));
        assert.ok(!r.querySelector('[data-action="ap-handle"]'));
      }
      if (role !== 'boss') assert.ok(!r.querySelector('[data-action="ap-handle"]'));
      cases++;
    }
    assert.equal(c.MOCK.approvals.length, 8);
    assert.ok(!Object.hasOwn(c.MOCK.approvals.find(a => a.id === 'AP20260801'), 'targetAmount'));
    if (role === 'admin') {
      t.directHash('#/approvals'); assert.ok(text(t.app).includes('无访问权限'), 'actual admin route stays denied');
    } else {
      for (const a of expected) { const beforeRoute = snapshot(c); t.directHash('#/' + (a.targetType === 'order' ? 'orders/' : 'documents/') + encodeURIComponent(a.targetId)); assert.ok(!text(t.app).includes('无访问权限')); assert.ok(!text(t.app).includes('记录不存在')); assert.equal(snapshot(c), beforeRoute); }
    }
    cases++;
  }
  const mutations = [
    ['missing order', (c, a) => { a.targetType = 'order'; a.targetId = 'MISSING'; }],
    ['missing doc', (c, a) => { a.targetType = 'doc'; a.targetId = 'MISSING'; }],
    ['duplicate order', (c, a) => { a.targetType = 'order'; a.targetId = c.MOCK.orders[0].id; c.MOCK.orders.push({ ...c.MOCK.orders[0] }); }],
    ['duplicate doc', (c, a) => c.MOCK.documents.push({ ...c.U.doc(a.targetId) })],
    ['unknown target', (c, a) => { a.targetType = 'https://bad'; }],
    ['missing target ID', (c, a) => { a.targetId = ''; }],
    ['doc unknown type', (c, a) => { c.U.doc(a.targetId).type = 'XYZ'; }],
    ['doc missing number', (c, a) => { c.U.doc(a.targetId).no = ''; }],
    ['doc missing related order', (c, a) => { c.U.doc(a.targetId).orderId = 'MISSING'; }],
    ['doc duplicate related order', (c, a) => { c.MOCK.orders.push({ ...c.U.order(c.U.doc(a.targetId).orderId) }); }],
    ...[0, -1, 1.5, '2', Infinity, Number.MAX_SAFE_INTEGER + 1, null].map(version => ['doc invalid version ' + version, (c, a) => { c.U.doc(a.targetId).version = version; }])
  ];
  for (const [label, mutate] of mutations) {
    const t = fixture(['views-fin', 'app']), { c } = t, a = c.MOCK.approvals[0]; mutate(c, a); render(t);
    const r = row(t, a.id); assert.equal(references(r).length, 0, label);
    assert.ok(text(r).includes('待核对')); assert.ok(text(r).includes('不可定位'));
    assert.equal(r.querySelectorAll('a').length, 0, 'invalid doc audit gets no fabricated process href'); cases++;
  }
  for (const state of ['待处理', '已通过', '已退回', '未知结果']) {
    const t = fixture(['views-fin', 'app']), { c } = t, a = c.MOCK.approvals[0], d = c.U.doc(a.targetId);
    a.status = state; c.MOCK.documents.push({ ...d, id: d.id + '-NEW', version: d.version + 1 });
    c.U.order(d.orderId).status = '已取消'; render(t);
    const link = references(row(t, a.id))[0]; assert.equal(link.getAttribute('href'), '#/documents/' + encodeURIComponent(d.id));
    assert.ok(text(link).includes(d.no + ' V' + d.version)); assert.ok(!text(link).includes('NEW'));
    assert.equal(c.U.documentPolicy(d, c.App.user).canExport, false); cases++;
  }
  for (const kind of ['单证审核', '改价申请', '取消申请', '重新制单申请']) {
    const t = fixture(['views-fin', 'app']), a = t.c.MOCK.approvals.find(a => a.type === kind && a.status === '待处理');
    a.applicant = t.c.U.roleUser('boss').name; render(t); const r = row(t, a.id);
    assert.ok(text(r).includes('不能自审')); assert.equal(references(r).length, 1);
    assert.ok(!r.querySelector('[data-action="ap-handle"]')); assert.equal(r.querySelectorAll('a').length, 1); cases++;
  }
  for (const targetType of ['order', 'doc']) for (const state of ['待处理', '已通过']) {
    const t = fixture(['views-fin', 'app']), { c } = t, a = c.MOCK.approvals.find(a => a.targetType === targetType);
    const hostile = '<img src=x onerror=alert(1)>" & 原文\n' + '长申请理由与处理意见'.repeat(120);
    a.id = 'AP"<img>&'; a.title = hostile; a.reason = hostile; a.opinion = hostile; a.status = state;
    a.applicant = hostile; a.handler = hostile; a.applyTime = hostile; a.handleTime = hostile;
    const target = targetType === 'order' ? c.U.order(a.targetId) : c.U.doc(a.targetId);
    if (targetType === 'doc') target.no = hostile;
    render(t); const r = row(t, a.id);
    assert.ok(text(r).includes(hostile)); assert.ok(!t.app.querySelector('img')); assert.ok(!t.app.querySelector('script'));
    const link = references(r)[0]; assert.equal(link.getAttribute('href'), '#/' + (targetType === 'order' ? 'orders/' : 'documents/') + encodeURIComponent(a.targetId));
    assert.ok(t.app.innerHTML.includes(c.U.esc(hostile))); assert.ok(!t.app.innerHTML.includes('href="https://'));
    if (state !== '待处理') { assert.ok(text(r.querySelector('.approval-opinion')).includes(hostile)); assert.ok(text(r.querySelector('details')).includes(hostile)); }
    cases++;
  }
  // Existing app path segments do not decode. Unsafe raw IDs must not create dead links or URIError.
  for (const targetType of ['order', 'doc']) for (const id of ['ID space', '中文编号', 'ID/slash', 'ID%20', 'ID?query', 'ID#hash', 'https://evil.invalid/x"<>&?#%', 'BAD\ud800']) {
    const t = fixture(['views-sales', 'views-docs', 'views-fin', 'app']), { c } = t;
    const a = c.MOCK.approvals.find(a => a.targetType === targetType);
    const target = targetType === 'order' ? c.U.order(a.targetId) : c.U.doc(a.targetId);
    a.targetId = target.id = id; render(t); const r = row(t, a.id);
    assert.equal(r.querySelectorAll('a').length, 0, 'unroutable exact ID has no process/view dead link');
    assert.ok(text(r).includes('待核对')); assert.ok(text(r).includes(id));
    assert.ok(t.app.innerHTML.includes(c.U.esc(id))); assert.ok(!t.app.innerHTML.includes('href="https://'));
    if (!id.includes('\ud800')) {
      const beforeRoute = snapshot(c);
      t.directHash('#/' + (targetType === 'order' ? 'orders/' : 'documents/') + encodeURIComponent(id));
      assert.ok(text(t.app).includes('记录不存在'), 'actual encoded route cannot find unsafe raw ID: local view must suppress link');
      assert.equal(snapshot(c), beforeRoute);
    }
    cases++;
  }
  const baseline = spawnSync('git', ['show', 'd9b1748c27102c2631dd6aed9df9e4e3af486d9f:trade-doc-demo/js/views-fin.js'], { cwd: root, encoding: 'utf8' });
  assert.equal(baseline.status, 0);
  const current = fs.readFileSync(path.join(root, 'js/views-fin.js'), 'utf8');
  const actionMarker = '  /* 主管处理 改价 / 取消 / 重新制单 */';
  const viewMarker = '  /* ==================== 审核与异常处理 ==================== */';
  const normalize = s => s.replace(/\r\n/g, '\n');
  assert.equal(normalize(current.slice(current.indexOf(actionMarker))), normalize(baseline.stdout.slice(baseline.stdout.indexOf(actionMarker))), 'all original approval Actions byte-preserved (newline normalized)');
  assert.equal(normalize(current.slice(0, current.indexOf(viewMarker))), normalize(baseline.stdout.slice(0, baseline.stdout.indexOf(viewMarker))), 'payment and money algorithms unchanged'); cases++;
  console.log(`PASS: ${cases} approval context cases; original roles/order/counts, exact version targets, invalid/duplicate metadata, self-review, complete escaped reason/opinion, all MOCK read purity and original Actions/payment source preservation (Node DOM only)`);
}
try { run(); } catch (error) { console.error(error.stack); process.exitCode = 1; }
