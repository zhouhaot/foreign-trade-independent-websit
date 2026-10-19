'use strict';
// Read-only product review. All product writes are confined to fresh Node VM fixtures.
// The DOM harness comes from existing tests; expected monetary values use independent BigInt.
// Exit 0 means the evidence assertions reproduced the recorded results, not a clean product.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '../../../..');
const { fixture } = require(path.join(root, 'scripts/verify-document-workspace.cjs'));
const { setup, rowInput } = require(path.join(root, 'scripts/verify-quotation-contract.cjs'));
const results = [];
const state = t => JSON.stringify(t.c.MOCK);
function units(value) {
  const [whole, decimal = ''] = String(value).split('.');
  return BigInt(whole) * 100n + BigInt((decimal + '00').slice(0, 2));
}
function independentTotal(items) {
  return items.reduce((sum, line) => {
    const scaled = units(line.qty) * units(line.price);
    assert.equal(scaled % 100n, 0n);
    return sum + scaled / 100n;
  }, 0n);
}
function money(cents) {
  const text = String(cents).padStart(3, '0');
  return text.slice(0, -2).replace(/\B(?=(\d{3})+(?!\d))/g, ',') + '.' + text.slice(-2);
}
function loadModule(t, name) {
  vm.runInContext(fs.readFileSync(path.join(root, 'js', name + '.js'), 'utf8'), t.c, { filename: name });
}
function button(t, dataset) {
  const el = t.document.createElement('button');
  Object.assign(el.dataset, dataset); t.app.appendChild(el); return el;
}
async function confirm(t) {
  const ok = t.modal.querySelector('[data-ok]'); assert.ok(ok, 'real confirmation exists');
  t.click(ok); await t.flush();
}
async function makeOrder(t, q) {
  t.c.location.hash = '#/quotes/' + q.id;
  t.c.Actions['quote-confirm']({ dataset: { id: q.id } }); await confirm(t);
  assert.equal(q.status, '已确认');
  t.c.Actions['quote-gen-order']({ dataset: { id: q.id } }); await confirm(t);
  return t.c.U.order(q.orderId);
}
async function createDocs(t, order) {
  t.c.App.user = t.c.U.roleUser('doc'); t.c.location.hash = '#/orders/' + order.id;
  t.c.Actions['doc-create'](button(t, { order: order.id })); await t.flush();
  return t.c.MOCK.documents.filter(d => d.orderId === order.id);
}

async function approvalIdCollision() {
  const t = fixture(['views-docs', 'app']);
  const d = t.c.U.doc('D-CI2026004-V1'); t.mount(d, 'doc');
  const before = t.c.MOCK.approvals.map(a => ({ id: a.id, targetId: a.targetId, status: a.status }));
  t.c.Actions['doc-submit']({ dataset: { id: d.id } }); await confirm(t);
  assert.equal(d.status, '待审核');
  const duplicates = t.c.MOCK.approvals.filter(a => a.id === 'AP20260101');
  assert.equal(duplicates.length, 2);
  assert.notEqual(duplicates[0].targetId, duplicates[1].targetId);
  results.push({ case: 'BUS-01', status: 'FAIL', kind: 'reproduced-product-defect',
    initialFixture: 'unmodified baseline', before, afterCount: t.c.MOCK.approvals.length,
    conflictingApprovals: duplicates.map(a => ({ id: a.id, targetId: a.targetId, status: a.status })) });
}

async function precisionDisplay() {
  const t = setup(); t.mountQuote();
  const input = [{ qty: '50', price: '1111111111111.11' }, { qty: '1', price: '0.50' }];
  input.forEach((line, i) => { rowInput(t, 'qty', i).value = line.qty; rowInput(t, 'price', i).value = line.price; });
  t.submit(); await t.flush();
  assert.equal(t.q.items[0].price, Number(input[0].price), 'actual save accepted value');
  const order = await makeOrder(t, t.q); assert.ok(order);
  const expectedCents = independentTotal(input), expected = money(expectedCents);
  assert.equal(expected, '55,555,555,555,556.00');
  assert.equal(t.c.U.financialBalance(order).totalCents, Number(expectedCents));
  const orderDisplay = t.c.U.fmt(t.c.U.orderTotal(order));
  assert.notEqual(orderDisplay, expected, 'wrong display is reproduced');
  loadModule(t, 'views-docs');
  const docs = await createDocs(t, order), ci = docs.find(d => d.type === 'CI'); assert.ok(ci);
  const html = t.c.Views.docDetail({ params: [ci.id], query: {}, user: t.c.App.user });
  const invoiceTotal = html.match(/<b>TOTAL<\/b><\/td><td class="r"><b>([^<]*)/)[1];
  assert.equal(invoiceTotal, '55,555,555,555,556.01');
  assert.equal(independentTotal(ci.snapshot.order.items), expectedCents);
  results.push({ case: 'BUS-02', status: 'FAIL', kind: 'reproduced-product-defect', input,
    quoteId: t.q.id, orderId: order.id, invoiceId: ci.id,
    expectedCents: String(expectedCents), expectedDisplay: expected, orderDisplay, invoiceTotal,
    financialBalanceDisplay: t.c.U.fmt(t.c.U.financialBalance(order).total),
    note: 'All writes use actual quote save/confirm/order and doc-create actions; extreme but accepted values.' });
}

async function sourceGuards() {
  for (const change of ['unconfirmed', 'quote-side-link', 'order-side-link', 'duplicate-quote-id']) {
    const t = setup();
    if (change !== 'unconfirmed') { t.q.status = '已确认'; t.q.confirmDate = t.c.U.today(); }
    if (change === 'quote-side-link') t.q.orderId = 'SO2026001';
    if (change === 'order-side-link') t.c.MOCK.orders.push({ id: 'SO2026999', quoteId: t.q.id });
    if (change === 'duplicate-quote-id') t.c.MOCK.quotes.push({ ...t.q });
    const before = state(t);
    t.c.Actions['quote-gen-order']({ dataset: { id: t.q.id } }); await t.flush();
    assert.equal(state(t), before); assert.equal(t.modal.firstElementChild, null);
    results.push({ case: 'GUARD-' + change, status: 'PASS', zeroBusinessWrite: true });
  }
}

async function normalParallelChain() {
  const t = setup(), c = t.c; loadModule(t, 'views-docs'); loadModule(t, 'views-fin');
  const iq = c.U.inquiry('INQ2026006'); c.location.hash = '#/inquiries/' + iq.id;
  t.app.innerHTML = c.Views.inquiryDetail({ params: [iq.id], user: c.App.user, query: {} });
  c.Actions['inq-start-quote']({ dataset: { id: iq.id } }); await confirm(t);
  const q = c.U.quote(iq.quoteId); assert.ok(q); assert.equal(q.inquiryId, iq.id);
  const order = await makeOrder(t, q), expectedCents = independentTotal(q.items);
  assert.equal(expectedCents, 54500n); assert.equal(order.docStatus, '未开始');
  const originalOrderStatus = order.status;
  const beforeDuplicate = state(t); c.Actions['quote-gen-order']({ dataset: { id: q.id } }); await t.flush();
  assert.equal(state(t), beforeDuplicate);
  results.push({ case: 'CHAIN-inquiry-quote-confirm-order-unique', status: 'PASS', inquiryId: iq.id, quoteId: q.id, orderId: order.id, expectedCents: String(expectedCents) });

  // Model native select properties missing from the shared minimal DOM; values are selected by ID.
  function paymentForm(amount) {
    c.App.user = c.U.roleUser('fin'); c.location.hash = '#/payments?order=' + order.id;
    t.app.innerHTML = c.Views.payments({ user: c.App.user, query: { order: order.id } });
    const select = t.document.getElementById('p-order');
    select.value = order.id; select.options = select.querySelectorAll('option');
    select.options.forEach(option => { option.value = option.attrs.value; });
    select.selectedIndex = select.options.findIndex(option => option.value === order.id);
    t.document.getElementById('p-amount').value = amount;
    t.document.getElementById('p-currency').value = order.currency;
    t.document.getElementById('p-method').value = '电汇 T/T';
    return t.document.getElementById('pay-form');
  }
  let form = paymentForm('100.00'), before = state(t);
  t.emit('submit', form); await t.flush();
  assert.notEqual(state(t), before);
  assert.equal(c.MOCK.payments.filter(p => p.orderId === order.id).length, 1);
  assert.equal(c.MOCK.documents.filter(d => d.orderId === order.id).length, 0);
  assert.equal(c.U.financialBalance(order).receivedCents, 10000);
  assert.equal(order.status, originalOrderStatus); assert.equal(order.docStatus, '未开始');
  results.push({ case: 'CHAIN-payment-before-documents', status: 'PASS', receivedCents: 10000, outstandingCents: 44500, orderStatus: order.status, documentStatus: order.docStatus });
  form = paymentForm('445.01'); before = state(t); t.emit('submit', form); await t.flush();
  assert.equal(state(t), before); assert.match(t.document.getElementById('pay-effect-error').textContent, /不能超过/);
  results.push({ case: 'CHAIN-overpayment-refusal', status: 'PASS', zeroBusinessWrite: true });

  const docs = await createDocs(t, order), ci = docs.find(d => d.type === 'CI'), pl = docs.find(d => d.type === 'PL');
  assert.equal(docs.length, 2); assert.equal(pl.snapshot.invoiceReference.docId, ci.id);
  assert.equal(pl.snapshot.invoiceReference.version, ci.version);
  const originalSnapshot = JSON.stringify(ci.snapshot);
  assert.ok(Object.isFrozen(ci.snapshot.order.items[0]));
  results.push({ case: 'CHAIN-first-CI-PL-after-partial-payment', status: 'PASS', invoiceId: ci.id, packingId: pl.id, invoiceReference: pl.snapshot.invoiceReference });

  function mountDoc(d, role = 'doc', editing = false) {
    c.App.user = c.U.roleUser(role); c.location.hash = '#/documents/' + d.id;
    c.AppUI.docEditing = editing ? d.id : null;
    t.app.innerHTML = c.Views.docDetail({ params: [d.id], query: {}, user: c.App.user });
  }
  mountDoc(pl, 'doc', true); before = state(t);
  c.Actions['doc-submit'](button(t, { id: pl.id })); await t.flush();
  assert.equal(state(t), before); assert.equal(t.modal.firstElementChild, null);
  results.push({ case: 'CHAIN-incomplete-PL-refusal', status: 'PASS', zeroBusinessWrite: true });
  for (const [key, value] of Object.entries({ cartons: '10', package: '纸箱', gw: '120', nw: '100', meas: '2.5' })) t.document.getElementById('df-pk-' + key).value = value;
  c.Actions['doc-submit'](button(t, { id: pl.id })); await confirm(t); assert.equal(pl.status, '待审核');
  mountDoc(ci); c.Actions['doc-submit'](button(t, { id: ci.id })); await confirm(t); assert.equal(ci.status, '待审核');
  assert.equal(c.U.financialBalance(order).receivedCents, 10000);
  for (const d of [ci, pl]) { mountDoc(d, 'boss'); c.Actions['doc-approve'](button(t, { id: d.id })); await confirm(t); assert.equal(d.status, '已通过'); }
  assert.equal(order.docStatus, '已通过'); assert.equal(order.status, originalOrderStatus);
  assert.equal(JSON.stringify(ci.snapshot), originalSnapshot);
  results.push({ case: 'CHAIN-both-docs-approved-with-unpaid-balance', status: 'PASS', orderStatus: order.status, documentStatus: order.docStatus, outstandingCents: c.U.financialBalance(order).outstandingCents });

  form = paymentForm('445.00'); t.emit('submit', form); await t.flush();
  assert.equal(c.U.financialBalance(order).outstandingCents, 0); assert.equal(c.U.payStatus(order), '已结清');
  assert.equal(order.status, originalOrderStatus); assert.equal(order.docStatus, '已通过');
  results.push({ case: 'CHAIN-final-payment-independent-statuses', status: 'PASS', receivedCents: 54500, outstandingCents: 0, orderStatus: order.status, documentStatus: order.docStatus, paymentStatus: c.U.payStatus(order) });

  const old = JSON.stringify(ci); mountDoc(ci); c.Actions['doc-revise'](button(t, { id: ci.id })); await confirm(t);
  const latest = c.MOCK.documents.filter(d => d.no === ci.no).sort((a, b) => b.version - a.version)[0];
  assert.equal(latest.version, 2); assert.equal(latest.status, '草稿'); assert.equal(JSON.stringify(ci), old);
  assert.equal(JSON.stringify(latest.snapshot), originalSnapshot);
  assert.equal(c.U.documentPolicy(ci, c.App.user).canExport, false);
  results.push({ case: 'CHAIN-controlled-revision-retains-original-and-snapshot', status: 'PASS', oldId: ci.id, newId: latest.id, newVersion: latest.version, oldExportAllowed: false });
}

async function approvalBranches() {
  function approvalFixture() {
    const t = fixture(['views-docs', 'views-fin', 'app']);
    t.c.App.user = t.c.U.roleUser('boss'); t.c.location.hash = '#/approvals'; return t;
  }
  for (const mode of ['valid', 'unallocatable', 'below-received']) {
    const t = approvalFixture(), c = t.c, a = c.MOCK.approvals.find(a => a.id === 'AP20260903');
    if (mode === 'valid') a.targetAmount = 14075;
    if (mode === 'below-received') { a.targetId = 'SO2026001'; a.targetAmount = 1; }
    const order = c.U.order(a.targetId), before = state(t), prior = JSON.parse(before);
    c.Actions['ap-handle']({ dataset: { id: a.id } });
    const overlay = t.modal.firstElementChild; assert.ok(overlay);
    t.click(overlay.querySelector('[data-act="approve"]')); await t.flush();
    if (mode === 'valid') {
      assert.equal(a.status, '已通过'); assert.equal(independentTotal(order.items), 1407500n);
      assert.equal(JSON.stringify(order.items.map(i => i.qty)), JSON.stringify(prior.orders.find(o => o.id === order.id).items.map(i => i.qty)));
      assert.equal(JSON.stringify(c.MOCK.documents), JSON.stringify(prior.documents));
      assert.equal(JSON.stringify(c.MOCK.payments), JSON.stringify(prior.payments));
      assert.equal(c.MOCK.orderLogs[order.id].length, prior.orderLogs[order.id].length + 1);
    } else {
      assert.equal(state(t), before);
      assert.match(overlay.querySelector('#ap-effect-error').textContent, mode === 'unallocatable' ? /20.50|两位/ : /低于已收/);
    }
    results.push({ case: 'BRANCH-repricing-' + mode, status: 'PASS', targetAmount: a.targetAmount,
      zeroBusinessWrite: mode !== 'valid', beforeCents: String(independentTotal(prior.orders.find(o => o.id === order.id).items)), afterCents: String(independentTotal(order.items)) });
  }
  for (const pass of [true, false]) {
    const t = approvalFixture(), c = t.c, a = c.MOCK.approvals.find(a => a.id === 'AP20260904'), order = c.U.order(a.targetId);
    const documents = JSON.stringify(c.MOCK.documents), payments = JSON.stringify(c.MOCK.payments);
    c.Actions['ap-handle']({ dataset: { id: a.id } });
    t.modal.querySelector('#ap-opinion').value = '审查合成意见';
    t.click(t.modal.querySelector('[data-act="' + (pass ? 'approve' : 'reject') + '"]')); await t.flush();
    assert.equal(a.status, pass ? '已通过' : '已退回'); assert.equal(order.status, pass ? '已取消' : '执行中');
    assert.equal(JSON.stringify(c.MOCK.documents), documents); assert.equal(JSON.stringify(c.MOCK.payments), payments);
    results.push({ case: 'BRANCH-cancellation-' + (pass ? 'approved' : 'rejected'), status: 'PASS', orderStatus: order.status, documentsUnchanged: true, paymentsUnchanged: true,
      note: pass ? 'No fictional refund or historical document overwrite.' : 'Legacy priorOrderStatus is absent; explicit documented fallback to 执行中.' });
  }
  for (const kind of ['application', 'document']) {
    const t = approvalFixture(), c = t.c;
    if (kind === 'application') c.MOCK.approvals.find(a => a.id === 'AP20260903').applicant = c.App.user.name;
    else c.U.doc('D-CI2026001-V1').maker = c.App.user.name;
    const before = state(t);
    c.Actions[kind === 'application' ? 'ap-handle' : 'doc-approve']({ dataset: { id: kind === 'application' ? 'AP20260903' : 'D-CI2026001-V1' } });
    await t.flush(); assert.equal(state(t), before); assert.equal(t.modal.firstElementChild, null);
    assert.ok(t.messages.some(m => /自审|自制自审/.test(m.text)));
    results.push({ case: 'BRANCH-self-review-' + kind, status: 'PASS', zeroBusinessWrite: true, fixtureMutation: 'applicant or maker set to current boss name before invocation' });
  }
}

(async () => {
  await approvalIdCollision(); await precisionDisplay(); await sourceGuards(); await normalParallelChain(); await approvalBranches();
  console.log(JSON.stringify({ productBaseline: '4c674496667fd31078194ca81c0d0a4f081eda21',
    environment: { node: process.version, platform: process.platform, arch: process.arch },
    boundary: 'Node VM and minimal DOM only; no browser, backend, file export, or database verification.',
    counts: { cases: results.length, PASS: results.filter(r => r.status === 'PASS').length, FAIL: results.filter(r => r.status === 'FAIL').length }, results }, null, 2));
})().catch(error => { console.error(error); process.exitCode = 1; });
