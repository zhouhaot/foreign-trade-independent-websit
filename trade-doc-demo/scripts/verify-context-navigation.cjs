'use strict';
/* Role-specific HTML targets and successful markDraftClean integration; navigation guard belongs to root's separate tests. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { fixture } = require('./verify-document-workspace.cjs');
const root = path.resolve(__dirname, '..');
const appSource = fs.readFileSync(path.join(root, 'js/app.js'), 'utf8');
const routes = vm.runInNewContext(appSource.match(/var ROUTES = (\[[\s\S]*?\]);/)[1]);
function setup() {
  const t = fixture([], { 'views-core': '/* defer core listeners until recorder exists */' }), handlers = {}, { c } = t;
  const add = t.document.addEventListener.bind(t.document);
  t.document.addEventListener = (type, fn) => { (handlers[type] ||= []).push(fn); add(type, fn); };
  for (const file of ['views-core', 'views-sales']) vm.runInContext(fs.readFileSync(path.join(root, 'js/' + file + '.js'), 'utf8'), c, { filename: file });
  let cleaned = 0; c.App.markDraftClean = () => { cleaned++; };
  t.submit = form => {
    const event = { target: form, defaultPrevented: false, preventDefault() { this.defaultPrevented = true; } };
    (handlers.submit || []).forEach(fn => fn(event)); return event;
  };
  return { ...t, get cleaned() { return cleaned; } };
}
function hrefs(html) { return [...html.matchAll(/href="([^"]+)"/g)].map(m => m[1].replace(/&amp;/g, '&')); }
function checkLinks(html, role) {
  for (const href of hrefs(html)) {
    if (!href.startsWith('#/')) continue;
    const segments = href.split('?')[0].slice(2).split('/');
    const route = routes.find(r => r.seg.length === segments.length && r.seg.every((s, i) => s.startsWith(':') || s === segments[i]));
    assert.ok(route, `${role}: target exists ${href}`);
    assert.ok(!route.roles || route.roles.includes(role), `${role}: rendered target is permitted ${href}`);
  }
}
async function run() {
  let cases = 0;
  const t = setup(), { c } = t;
  c.App.user = c.U.roleUser('boss');
  const bossQuotes = c.Views.quotes();
  assert.ok(!/#\/quotes\/[^"/]+\/edit/.test(bossQuotes), 'boss pending quotations cannot link to sales-only editor');
  for (const role of ['sales', 'doc', 'fin', 'boss']) {
    c.App.user = c.U.roleUser(role); checkLinks(c.Views.orders(), role); cases++;
    for (const order of c.MOCK.orders) {
      for (const tab of ['overview', 'items', 'docs', 'pay', 'changes', 'logs']) {
        const html = c.Views.orderDetail({ params: [order.id], query: { tab }, user: c.App.user });
        checkLinks(html, role); assert.ok(html.includes(c.U.customerName(order.customerId)), 'read-only customer context preserved');
        if (tab === 'overview') assert.ok(html.includes(order.quoteId), 'source quotation number remains visible');
        if (tab === 'items') for (const item of order.items) assert.ok(hrefs(html).includes('#/products/' + item.productId + '?order=' + order.id), 'product link has explicit source order');
        cases++;
      }
    }
    const product = c.U.product('P001'), source = c.U.order('SO2026001');
    let html = c.Views.productDetail({ params: [product.id], query: { order: source.id }, user: c.App.user });
    checkLinks(html, role); assert.ok(hrefs(html).includes('#/orders/' + source.id + '?tab=items')); assert.match(html, /返回来源订单/); cases++;
    html = c.Views.productDetail({ params: [product.id], query: {}, user: c.App.user }); checkLinks(html, role);
    assert.ok(hrefs(html).includes(role === 'sales' ? '#/products' : '#/orders')); cases++;
    for (const invalid of ['MISSING', 'SO2026005', 'SO2026001?tab=pay']) {
      html = c.Views.productDetail({ params: [product.id], query: { order: invalid }, user: c.App.user }); checkLinks(html, role);
      assert.ok(!html.includes('返回来源订单')); cases++;
    }
  }
  for (const role of ['sales', 'boss']) {
    c.App.user = c.U.roleUser(role);
    checkLinks(c.Views.inquiries(), role); checkLinks(c.Views.quotes(), role);
    for (const inquiry of c.MOCK.inquiries) checkLinks(c.Views.inquiryDetail({ params: [inquiry.id], query: {}, user: c.App.user }), role);
    for (const q of c.MOCK.quotes) checkLinks(c.Views.quoteDetail({ params: [q.id], query: {}, user: c.App.user }), role);
    cases++;
  }
  let cleanCases = 0;
  const mountCustomer = t => {
    t.c.App.user = t.c.U.roleUser('sales'); t.c.location.hash = '#/customers/C001';
    t.app.innerHTML = t.c.Views.customerDetail({ params: ['C001'], query: {}, user: t.c.App.user });
    t.document.getElementById('c-level').value = 'A';
  };
  {
    const x = setup(); mountCustomer(x); const sequence = [];
    x.c.App.markDraftClean = () => { assert.equal(x.c.U.customer('C001').contact, '更新联系人'); sequence.push('clean'); };
    x.c.App.rerender = () => sequence.push('rerender');
    x.document.getElementById('c-contact').value = '更新联系人'; x.submit(x.document.getElementById('cust-form'));
    assert.deepEqual(sequence, ['clean', 'rerender'], 'successful customer commit cleans before rerender'); cleanCases++;
  }
  {
    const x = setup(); mountCustomer(x); x.document.getElementById('c-contact').value = '';
    const before = JSON.stringify(x.c.MOCK); x.submit(x.document.getElementById('cust-form'));
    assert.equal(x.cleaned, 0); assert.equal(JSON.stringify(x.c.MOCK), before, 'customer required failure cannot clear dirty state'); cleanCases++;
  }
  const mountQuote = x => {
    x.c.App.user = x.c.U.roleUser('sales'); x.c.location.hash = '#/quotes/Q2026004/edit';
    x.app.innerHTML = x.c.Views.quoteEdit({ params: ['Q2026004'], query: {}, user: x.c.App.user });
    x.document.getElementById('qe-currency').value = 'USD';
  };
  {
    const x = setup(); mountQuote(x); const sequence = [], originalHash = x.c.location.hash;
    x.document.getElementById('qe-price-0').value = '1.50';
    x.c.App.markDraftClean = () => { assert.equal(x.c.U.quote('Q2026004').items[0].price, 1.5); assert.equal(x.c.location.hash, originalHash); sequence.push('clean'); };
    x.submit(x.document.getElementById('qe-form')); x.submit(x.document.getElementById('qe-form')); await x.flush();
    assert.deepEqual(sequence, ['clean']); assert.equal(x.c.location.hash, '#/quotes/Q2026004'); cleanCases++;
  }
  for (const fail of ['invalid', 'identity']) {
    const x = setup(); mountQuote(x);
    if (fail === 'invalid') x.document.getElementById('qe-price-0').value = '1e2';
    x.submit(x.document.getElementById('qe-form'));
    if (fail === 'identity') x.c.App.user = x.c.U.roleUser('fin');
    const before = JSON.stringify(x.c.MOCK); await x.flush();
    assert.equal(x.cleaned, 0); assert.equal(JSON.stringify(x.c.MOCK), before, `quotation ${fail} failure cannot clean`); cleanCases++;
  }
  for (const action of ['confirm', 'order']) {
    for (const outcome of ['success', 'cancel', 'drift']) {
      const x = setup(); x.c.App.user = x.c.U.roleUser('sales');
      const q = x.c.U.quote('Q2026004'); x.c.location.hash = '#/quotes/' + q.id;
      if (action === 'order') { q.status = '已确认'; q.confirmDate = '2026-10-07'; }
      const sequence = [], originalHash = x.c.location.hash;
      x.c.App.markDraftClean = () => {
        assert.equal(x.c.location.hash, originalHash); assert.ok(action === 'confirm' ? q.status === '已确认' : q.orderId);
        sequence.push('clean');
      };
      x.c.App.rerender = () => sequence.push('rerender');
      x.c.Actions[action === 'confirm' ? 'quote-confirm' : 'quote-gen-order']({ dataset: { id: q.id } });
      if (action === 'confirm') x.modal.querySelector('#qc-date').value = '2026-10-07';
      if (outcome === 'cancel') x.click(x.modal.querySelector('[data-close]'));
      else {
        x.click(x.modal.querySelector('[data-ok]'));
        if (outcome === 'drift') q.items[0].price = 1.5;
      }
      await x.flush();
      assert.deepEqual(sequence, outcome !== 'success' ? [] : action === 'confirm' ? ['clean', 'rerender'] : ['clean']); cleanCases++;
    }
  }
  for (const action of ['save', 'order']) {
    for (const outcome of ['success', 'failure']) {
      const x = setup(), sequence = []; x.c.App.user = x.c.U.roleUser('sales');
      const q = x.c.U.quote('Q2026004');
      x.c.App.markDraftClean = () => sequence.push('clean');
      x.c.App.requestNavigation = destination => { sequence.push('navigate:' + destination); x.c.location.hash = destination; };
      if (action === 'save') {
        mountQuote(x);
        x.document.getElementById('qe-price-0').value = outcome === 'success' ? '1.50' : '1e2';
        x.submit(x.document.getElementById('qe-form'));
      } else {
        q.status = '已确认'; q.confirmDate = '2026-10-07'; x.c.location.hash = '#/quotes/' + q.id;
        x.c.Actions['quote-gen-order']({ dataset: { id: q.id } }); x.click(x.modal.querySelector('[data-ok]'));
        if (outcome === 'failure') q.items[0].price = 1.5;
      }
      await x.flush();
      const destination = action === 'save' ? '#/quotes/' + q.id : '#/orders/' + q.orderId;
      assert.deepEqual(sequence, outcome === 'success' ? ['clean', 'navigate:' + destination] : [], 'successful commit cleans before requestNavigation; failure neither cleans nor navigates');
      cleanCases++;
    }
  }
  console.log(`PASS: context navigation ${cases} permitted-link/source cases and ${cleanCases} successful-clean/failed-dirty integration cases (actual views, submit/modal/Promise Node DOM fixture only)`);
}
if (require.main === module) run().catch(error => { console.error(error); process.exitCode = 1; });
