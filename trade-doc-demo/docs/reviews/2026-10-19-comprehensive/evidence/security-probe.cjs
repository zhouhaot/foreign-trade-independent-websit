/* Independent review probes. Synthetic VM state only; no browser or external calls.
 * Reuses only the minimal DOM harness, never its test runner.
 * Run from project: node docs/reviews/2026-10-19-comprehensive/evidence/security-probe.cjs
 */
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '../../../..');
const { fixture } = require(path.join(root, 'scripts/verify-document-workspace.cjs'));
const files = ['views-sales', 'views-docs', 'views-fin', 'views-stats', 'views-system', 'app'];
const results = [];
function record(id, status, details) { results.push({ id, status, ...details }); }
function enter(role, hash = '#/dashboard') {
  const t = fixture(files, {}, { history: true });
  t.c.U.setUser(t.c.U.roleUser(role)); t.c.App.requestNavigation(hash);
  return t;
}
function change(t, node) { for (const fn of t.handlers.change || []) fn({ target: node }); }
function submit(t, form) {
  for (const fn of t.handlers.submit || []) fn({ target: form, preventDefault() {} });
}
function data(t) { return JSON.stringify(t.c.MOCK); }
function revoke(t, role, module) { t.c.MOCK.permMatrix[role] = t.c.MOCK.permMatrix[role].filter(m => m !== module); }

async function run() {
  // UI-reachable: disabling a sole role account must not break other roles' login.
  for (const role of ['doc', 'fin', 'boss', 'sales']) {
    const t = enter('admin', '#/system/users');
    const ids = t.c.MOCK.users.filter(u => u.role === role && u.enabled).map(u => u.id);
    for (const id of ids) change(t, { dataset: { action: 'sys-toggle-user', id }, checked: false });
    assert.equal(t.c.U.roleUser(role), undefined);
    let exception = null;
    try { t.c.Views.login(); } catch (error) { exception = error.message; }
    assert.match(exception || '', /name/);
    record('SEC-01-login-missing-' + role, 'REPRODUCED', {
      path: 'admin sys-toggle-user -> logout -> Views.login', affectedRole: role,
      disabledAccountCount: ids.length, actual: 'TypeError: ' + exception,
      expected: 'Render enabled role choices and preserve login for other roles'
    });
  }
  const logout = enter('admin', '#/system/users');
  const disabledId = logout.c.U.roleUser('doc').id;
  change(logout, { dataset: { action: 'sys-toggle-user', id: disabledId }, checked: false });
  // Real confirmation callback synchronously throws during render. Scheduling is
  // made synchronous here so the exception can be captured without an unhandled
  // rejection; the production callback itself is unchanged.
  logout.c.U.withLoading = (_button, fn) => fn();
  logout.c.Actions.logout();
  let logoutError = null;
  try { logout.click(logout.modal.querySelector('[data-ok]')); } catch (error) { logoutError = error.message; }
  assert.match(logoutError || '', /name/);
  assert.equal(logout.c.U.currentUser(), null);
  assert.equal(logout.c.App.user, null);
  assert.equal(logout.c.location.hash, '#/login');
  record('SEC-01-full-logout-path', 'REPRODUCED', {
    actual: { error: 'TypeError: ' + logoutError, currentUser: null, appUser: null, hash: '#/login', oldAdminMarkupRemains: logout.app.innerHTML.includes('sys-toggle-user') },
    expected: 'Complete logout with usable login page'
  });

  // Static role ceilings: expected permissions below are independent of product helpers.
  const expected = {
    '#/dashboard': ['admin', 'sales', 'doc', 'fin', 'boss'],
    '#/customers': ['sales'], '#/customers/C001': ['sales'],
    '#/products': ['sales'], '#/products/P001': ['sales', 'doc', 'fin', 'boss'],
    '#/inquiries': ['sales', 'boss'], '#/inquiries/INQ2026001': ['sales', 'boss'],
    '#/quotes': ['sales', 'boss'], '#/quotes/Q2026001': ['sales', 'boss'],
    '#/quotes/Q2026004/edit': ['sales'], '#/orders': ['sales', 'doc', 'fin', 'boss'],
    '#/orders/SO2026001': ['sales', 'doc', 'fin', 'boss'], '#/documents': ['doc', 'boss'],
    '#/documents/D-CI2026001-V1': ['sales', 'doc', 'fin', 'boss'], '#/payments': ['fin', 'boss'],
    '#/approvals': ['sales', 'doc', 'fin', 'boss'], '#/stats': ['boss'],
    '#/system/users': ['admin'], '#/system/roles': ['admin'], '#/system/dicts': ['admin']
  };
  let routes = 0;
  for (const role of ['admin', 'sales', 'doc', 'fin', 'boss']) {
    const t = enter(role);
    for (const [hash, roles] of Object.entries(expected)) {
      assert.equal(t.c.App.canVisit(hash, role), roles.includes(role), role + ' ' + hash); routes++;
    }
  }
  record('role-route-ceilings', 'PASS', { combinations: routes, kind: 'VM canVisit predicate, not browser route rendering' });

  // Denial at direct action boundaries, with complete mock zero-write checks.
  for (const role of ['admin', 'sales', 'doc', 'fin']) {
    const t = enter(role), d = t.c.MOCK.documents.find(d => d.status === '待审核');
    const before = data(t);
    t.c.Actions['doc-approve']({ dataset: { id: d.id } });
    assert.equal(data(t), before); assert.equal(t.modal.firstElementChild, null);
    t.c.Actions['ap-handle']({ dataset: { id: 'AP20260903' } });
    assert.equal(data(t), before); assert.equal(t.modal.firstElementChild, null);
    record('direct-audit-denial-' + role, 'PASS', { zeroWrite: true });
  }
  for (const role of ['admin', 'doc', 'fin', 'boss']) {
    const t = enter(role), q = t.c.MOCK.quotes.find(q => q.status === '待客户确认' && !q.orderId);
    const before = data(t);
    t.c.Actions['quote-confirm']({ dataset: { id: q.id } });
    assert.equal(data(t), before); assert.equal(t.modal.firstElementChild, null);
    record('direct-quote-denial-' + role, 'PASS', { zeroWrite: true });
  }
  for (const kind of ['document', 'approval']) {
    const t = enter('boss');
    if (kind === 'document') {
      const d = t.c.MOCK.documents.find(d => d.status === '待审核'); d.maker = t.c.App.user.name;
      const before = data(t); t.c.Actions['doc-approve']({ dataset: { id: d.id } });
      assert.equal(data(t), before); assert.equal(t.modal.firstElementChild, null);
    } else {
      const a = t.c.MOCK.approvals.find(a => a.id === 'AP20260903'); a.applicant = t.c.App.user.name;
      const before = data(t); t.c.Actions['ap-handle']({ dataset: { id: a.id } });
      assert.equal(data(t), before); assert.equal(t.modal.firstElementChild, null);
    }
    record('self-audit-' + kind, 'PASS', { zeroWrite: true, caveat: 'Current demo compares maker/applicant name, not production stable IDs' });
  }

  // Delayed confirmation: revocation and replaced actor both reject before writes.
  for (const mutation of ['module-revoke', 'new-actor', 'clear-actor']) {
    const t = enter('boss'), d = t.c.MOCK.documents.find(d => d.status === '待审核');
    t.c.Actions['doc-approve']({ dataset: { id: d.id } });
    assert.ok(t.modal.querySelector('[data-ok]'));
    if (mutation === 'module-revoke') revoke(t, 'boss', '单证管理');
    if (mutation === 'new-actor') t.c.App.user = { ...t.c.App.user };
    if (mutation === 'clear-actor') t.c.App.user = null;
    const before = data(t); t.click(t.modal.querySelector('[data-ok]')); await t.flush();
    assert.equal(data(t), before);
    record('delayed-document-' + mutation, 'PASS', { zeroWrite: true });
  }
  for (const mutation of ['module-revoke', 'new-actor', 'clear-actor']) {
    const t = enter('sales'), q = t.c.MOCK.quotes.find(q => q.status === '待客户确认' && !q.orderId);
    t.c.location.hash = '#/quotes/' + q.id; t.c.Actions['quote-confirm']({ dataset: { id: q.id } });
    assert.ok(t.modal.querySelector('[data-ok]'));
    t.modal.querySelector('#qc-date').value = '2026-10-19';
    if (mutation === 'module-revoke') revoke(t, 'sales', '销售业务');
    if (mutation === 'new-actor') t.c.App.user = { ...t.c.App.user };
    if (mutation === 'clear-actor') t.c.App.user = null;
    const before = data(t); t.click(t.modal.querySelector('[data-ok]')); await t.flush();
    assert.equal(data(t), before);
    record('delayed-quote-' + mutation, 'PASS', { zeroWrite: true });
  }

  // Invalid current profile is injected in isolation to distinguish existing
  // client guard behavior from a UI-reachable security exploit.
  const stale = enter('boss'), pending = stale.c.MOCK.documents.find(d => d.status === '待审核');
  const account = stale.c.MOCK.users.find(u => u.id === stale.c.App.user.id);
  stale.c.Actions['doc-approve']({ dataset: { id: pending.id } });
  account.enabled = false;
  stale.click(stale.modal.querySelector('[data-ok]')); await stale.flush();
  assert.equal(pending.status, '已通过');
  record('invalid-profile-after-open', 'OBSERVATION', {
    actual: 'Synthetic disabling of current boss profile after opening confirmation still permits document approval',
    reachability: 'No ordinary single-page UI sequence identified; demo shares no business memory between tabs',
    candidateOnly: true
  });

  // Accessible field text payloads: actual customer submit and quote remark;
  // markup is checked for raw tag/attribute breakout. No payload is executed.
  const payload = '\"><img data-security-probe="1" onerror="SECURITY_PROBE">&\'末';
  const customer = enter('sales', '#/customers/C001');
  const form = customer.document.getElementById('cust-form');
  for (const id of ['nameCn', 'nameEn', 'contact', 'addr', 'phone', 'remark']) form.querySelector('#c-' + id).value = payload;
  form.querySelector('#c-level').value = 'A';
  submit(customer, form);
  assert.equal(customer.c.U.customer('C001').nameCn, payload);
  const customerHTML = customer.c.Views.customerDetail({ params: ['C001'], query: {}, user: customer.c.App.user });
  const dashboardHTML = customer.c.Views.dashboard({ params: [], query: {}, user: customer.c.App.user });
  for (const html of [customerHTML, dashboardHTML]) { assert.ok(!html.includes('<img data-security-probe=')); assert.ok(html.includes('&lt;img')); }
  record('customer-edit-html-attribute-text', 'PASS', { actualSubmit: true, sinks: ['customer form/title labels', 'dashboard recent orders/map text'], kind: 'generated HTML inspection, no browser execution' });
  const quote = enter('sales', '#/quotes/Q2026004/edit');
  const quoteForm = quote.document.getElementById('qe-form');
  quoteForm.querySelector('#qe-remark').value = payload;
  quoteForm.querySelector('#qe-currency').value = quote.c.U.quote('Q2026004').currency;
  submit(quote, quoteForm); await quote.flush();
  assert.equal(quote.c.U.quote('Q2026004').remark, payload);
  const quoteHTML = quote.c.Views.quoteDetail({ params: ['Q2026004'], query: {}, user: quote.c.App.user });
  assert.ok(!quoteHTML.includes('<img data-security-probe=')); assert.ok(quoteHTML.includes('&lt;img'));
  record('quote-remark-html-text', 'PASS', { actualSubmit: true, kind: 'generated HTML inspection, no browser execution' });

  const documentEdit = enter('doc');
  const draft = documentEdit.c.MOCK.documents.find(d => d.type === 'CI' && ['草稿', '制作中'].includes(d.status));
  assert.ok(draft);
  documentEdit.mount(draft, 'doc', true);
  const transactionBefore = JSON.stringify(documentEdit.c.MOCK.orders);
  assert.ok(draft.snapshot && draft.snapshot.order);
  const snapshotBefore = JSON.stringify(draft.snapshot);
  documentEdit.document.getElementById('df-marks').value = payload;
  documentEdit.document.getElementById('df-remark').value = payload;
  const forged = documentEdit.document.createElement('input'); forged.id = 'df-price'; forged.value = '0.01';
  documentEdit.app.appendChild(forged);
  documentEdit.c.Actions['doc-save-draft'](documentEdit.document.querySelector('[data-action="doc-save-draft"]'));
  await documentEdit.flush();
  assert.equal(draft.marks, payload); assert.equal(draft.remark, payload);
  assert.equal(JSON.stringify(documentEdit.c.MOCK.orders), transactionBefore);
  assert.equal(JSON.stringify(draft.snapshot), snapshotBefore);
  const documentHTML = documentEdit.c.Views.docDetail({ params: [draft.id], query: {}, user: documentEdit.c.App.user });
  assert.ok(!documentHTML.includes('<img data-security-probe=')); assert.ok(documentHTML.includes('&lt;img'));
  record('document-field-allowlist-html-text', 'PASS', { actualSave: true, coreOrderUnchanged: true, snapshotUnchanged: true,
    forgedInputIgnored: 'df-price', kind: 'generated HTML inspection, no browser execution' });

  // Admin's normal module checkbox is exercised before switching roles.
  for (const [role, module, hash] of [ ['sales', '销售业务', '#/quotes'], ['sales', '客户与商品', '#/customers'],
    ['sales', '订单详情', '#/orders'], ['doc', '单证管理', '#/documents'], ['fin', '收款与应收', '#/payments'],
    ['boss', '审核与异常', '#/approvals'], ['boss', '统计分析', '#/stats'] ]) {
    const t = enter('admin', '#/system/roles');
    change(t, { dataset: { action: 'sys-perm', role, module }, checked: false });
    const switcher = t.document.getElementById('demo-role-switch'); switcher.value = role; change(t, switcher);
    assert.equal(t.c.App.canVisit(hash, role), false);
    const nav = t.document.querySelector('.nav'); assert.equal(nav.querySelector('a[href="' + hash + '"]'), null);
    t.c.Actions['search-open']();
    assert.ok(t.document.querySelectorAll('[data-action="search-goto"]').every(node => !node.dataset.link.startsWith(hash)));
    t.c.U.closeModal(); t.c.App.requestNavigation(hash); assert.ok(t.document.querySelector('.forbidden'));
    record('module-ui-' + role + '-' + module, 'PASS', { menuHidden: true, initialSearchExcluded: true, routeDenied: true });
  }

  // Real U.toast helper deliberately inspected with isolated plain DOM sink.
  // No editable customer/quote/doc field -> toast unsanitized flow was found.
  let toastHTML = '';
  const sink = { appendChild(node) { toastHTML = node.innerHTML; } };
  const context = vm.createContext({ MOCK: { payments: [] }, document: {
    getElementById() { return sink; }, createElement() { return { setAttribute() {}, classList: { add() {} } }; }
  }, setTimeout() {} }); context.window = context;
  vm.runInContext(fs.readFileSync(path.join(root, 'js/mock-data.js'), 'utf8'), context);
  vm.runInContext(fs.readFileSync(path.join(root, 'js/utils.js'), 'utf8'), context);
  context.U.toast(payload, 'info');
  assert.ok(toastHTML.includes('<img data-security-probe='));
  record('toast-raw-html-sink', 'OBSERVATION', { actual: 'U.toast interprets message as HTML', candidateOnly: true,
    reachability: 'Reviewed current callers; editable fields do not reach this sink as raw text in an identified normal UI path' });

  console.log(JSON.stringify({ baseline: '4c674496667fd31078194ca81c0d0a4f081eda21', environment: { node: process.version, platform: process.platform },
    counts: results.reduce((counts, item) => { counts[item.status] = (counts[item.status] || 0) + 1; return counts; }, {}), results }, null, 2));
}
run().catch(error => { console.error('PROBE_ERROR:', error.stack); process.exitCode = 1; });
