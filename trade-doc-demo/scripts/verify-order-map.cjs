'use strict';
/* Order-map acceptance against the actual view/actions and existing Node DOM fixture.
 * Synthetic records stay in the isolated VM. This does not certify browser layout,
 * native keyboard focus, geography accuracy, or a real database/API.
 */
const assert = require('node:assert/strict');
const { fixture } = require('./verify-document-workspace.cjs');
let checks = 0;
const failures = [];
function check(name, run) {
  try { run(); checks++; } catch (error) { failures.push({ name, error }); }
}
function setup(role = 'sales') {
  const t = fixture(['views-sales', 'views-docs', 'views-fin', 'views-system', 'app']);
  t.c.U.setUser(t.c.U.roleUser(role));
  t.c.App.user = t.c.U.currentUser();
  t.c.location.hash = '#/dashboard';
  mount(t);
  return t;
}
function mount(t) { t.app.innerHTML = t.c.Views.dashboard({ user: t.c.App.user }); return t; }
const model = t => JSON.stringify(t.c.MOCK);
const text = n => n ? (n.textContent || '') + n.children.map(text).join('') : '';
const signature = n => JSON.stringify(n && { tag: n.tagName, attrs: n.attrs, text: n.textContent || '', children: n.children.map(signature) });
const detail = t => t.document.getElementById('order-map-detail');
const country = (t, key, pin = false) => t.document.querySelectorAll('[data-action="order-map-country"]').find(n => n.dataset.country === key && n.classList.contains('order-map-pin') === pin);
const totals = d => Object.fromEntries(Array.from(d.totals, x => [x.currency, { cents: x.cents, error: x.error }]));
function sample(t, overrides = {}) {
  return Object.assign({}, t.c.MOCK.orders[0], { id: 'MAP-TEST', items: [{ productId: 'P001', qty: 1, price: 0.1 }] }, overrides);
}
function snapshotNodes(t) {
  const refs = { root: t.document.getElementById('order-map'), recent: t.document.querySelector('.recent-orders'), queue: t.document.querySelector('.work-queue'), canvas: t.document.querySelector('.order-map-canvas'), detail: detail(t), hash: t.c.location.hash, renders: t.renders };
  const input = t.document.createElement('input'); input.id = 'map-unrelated-input'; input.value = '未提交输入  123';
  t.app.appendChild(input); refs.input = input;
  return refs;
}
function retained(t, refs, focus) {
  for (const [key, selector] of [['root', '#order-map'], ['recent', '.recent-orders'], ['queue', '.work-queue'], ['canvas', '.order-map-canvas'], ['detail', '#order-map-detail']]) assert.equal(t.document.querySelector(selector), refs[key], key + ' node retained');
  assert.equal(t.document.getElementById('map-unrelated-input'), refs.input);
  assert.equal(refs.input.value, '未提交输入  123');
  assert.equal(t.document.activeElement, focus); assert.equal(t.c.location.hash, refs.hash); assert.equal(t.renders, refs.renders);
}

for (const role of ['admin', 'sales', 'doc', 'fin', 'boss']) check('five-role rendering and visibility: ' + role, () => {
  const t = setup(role), before = model(t), user = t.c.App.user, d = t.c.U.orderMapData(user);
  assert.equal(!!t.document.getElementById('order-map'), role !== 'admin');
  assert.equal(d.orders.length, role === 'admin' ? 0 : 7);
  assert.equal(t.document.querySelectorAll('.stat-card').length, 4);
  if (role !== 'admin') {
    assert.equal(d.located, 5); assert.equal(d.missing, 0);
    assert.deepEqual(totals(d), { EUR: { cents: 7000000, error: false }, USD: { cents: 12220000, error: false } });
    assert.deepEqual(Array.from(d.groups, g => [g.key, g.orders.length]), [['US', 2], ['DE', 2], ['FR', 1], ['EG', 1], ['CL', 1]]);
    assert.equal(country(t, 'GB'), undefined, 'customer without orders is not a business point');
    const recent = t.document.querySelector('.recent-orders');
    assert.deepEqual(recent.querySelectorAll('tbody').flatMap(n => n.querySelectorAll('b')).map(text), ['SO2026003', 'SO2026007', 'SO2026005', 'SO2026006']);
    assert.match(text(recent), /订单进度.*单证进度.*收款进度/);
    assert.match(text(t.document.getElementById('order-map')), /含所有订单状态/);
    assert.match(text(t.document.getElementById('order-map')), /不表示物流路线/);
    for (const a of detail(t).querySelectorAll('a')) assert.equal(t.c.App.canVisit(a.attrs.href, role), true);
  }
  assert.equal(model(t), before);
});

check('country operations preserve surrounding nodes, values, focus and Mock', () => {
  const t = setup(), before = model(t), refs = snapshotNodes(t);
  const button = country(t, 'DE', true); button.focus(); t.click(button);
  retained(t, refs, button); assert.deepEqual(JSON.parse(JSON.stringify(t.c.AppUI.orderMap)), { country: 'DE' });
  assert.match(text(detail(t)), /德国2 笔订单/); assert.match(text(detail(t)), /50,000.00/); assert.ok(!text(detail(t)).includes('USD'));
  assert.deepEqual(detail(t).querySelectorAll('.order-map-order').map(n => n.attrs.href), ['#/orders/SO2026003', '#/orders/SO2026004']);
  for (const b of t.document.querySelectorAll('[data-action="order-map-country"]')) assert.equal(b.attrs['aria-pressed'], String(b.dataset.country === 'DE'));
  refs.input.focus(); t.c.Actions['order-map-country'](country(t, 'FR')); retained(t, refs, refs.input);
  assert.equal(detail(t).querySelectorAll('.order-map-order').length, 1);
  t.c.Actions['order-map-country'](country(t, '')); retained(t, refs, refs.input);
  assert.equal(detail(t).querySelectorAll('.order-map-order').length, 7);
  assert.equal(model(t), before);
});

check('invalid and detached country actions do not change state or detail', () => {
  const t = setup(), before = model(t), original = signature(detail(t));
  const rogue = t.document.createElement('button'); rogue.dataset.country = 'DE';
  t.c.Actions['order-map-country'](rogue);
  const button = country(t, 'DE'); button.dataset.country = 'ZZ'; t.c.Actions['order-map-country'](button);
  assert.equal(signature(detail(t)), original); assert.equal(t.c.AppUI.orderMap, undefined); assert.equal(model(t), before);
});

check('missing identity and stale detached controls cannot operate the map', () => {
  const t = setup(), oldButton = country(t, 'DE'), oldReplay = t.document.querySelector('[data-action="order-map-replay"]');
  const before = model(t); mount(t); const original = signature(detail(t));
  t.c.Actions['order-map-country'](oldButton); t.c.Actions['order-map-replay'](oldReplay);
  assert.equal(t.c.AppUI.orderMap, undefined); assert.equal(signature(detail(t)), original);
  t.c.App.user = null;
  t.c.Actions['order-map-country'](country(t, 'DE')); t.c.Actions['order-map-replay'](t.document.querySelector('[data-action="order-map-replay"]'));
  assert.equal(t.c.AppUI.orderMap, undefined); assert.equal(signature(detail(t)), original);
  assert.equal(t.c.U.orderMapData(null).orders.length, 0); assert.equal(model(t), before);
});

check('replay normal and reduced motion preserve nodes, state and inputs', () => {
  const t = setup(), before = model(t), refs = snapshotNodes(t), button = t.document.querySelector('[data-action="order-map-replay"]');
  t.click(country(t, 'US')); const state = JSON.stringify(t.c.AppUI.orderMap), html = detail(t).innerHTML;
  for (const reduce of [true, false]) {
    t.c.matchMedia = () => ({ matches: reduce }); button.focus(); t.click(button);
    retained(t, refs, button); assert.equal(JSON.stringify(t.c.AppUI.orderMap), state); assert.equal(detail(t).innerHTML, html);
    assert.match(text(t.document.getElementById('order-map-status')), reduce ? /减少动态效果/ : /重播一次/);
    assert.equal(refs.canvas.classList.contains('motion-reset'), false);
  }
  assert.equal(model(t), before);
});

for (const role of ['sales', 'doc', 'fin', 'boss']) check('revoked order module refuses both actions and new data: ' + role, () => {
  const t = setup(role), button = country(t, 'DE'), replay = t.document.querySelector('[data-action="order-map-replay"]');
  t.c.MOCK.permMatrix[role] = t.c.MOCK.permMatrix[role].filter(m => m !== '订单详情');
  const before = model(t), html = signature(detail(t)), status = text(t.document.getElementById('order-map-status'));
  t.click(button); t.click(replay);
  assert.equal(t.c.AppUI.orderMap, undefined); assert.equal(signature(detail(t)), html); assert.equal(text(t.document.getElementById('order-map-status')), status);
  assert.equal(t.c.U.orderMapData(t.c.App.user).orders.length, 0);
  mount(t); assert.equal(t.document.getElementById('order-map'), null); assert.equal(model(t), before);
});

check('country selection is cleared on successful identity switch', () => {
  const t = setup(); t.click(country(t, 'DE')); const before = model(t);
  const select = t.document.createElement('select'); select.value = 'fin';
  t.c.Actions['demo-role-switch'](select);
  assert.equal(t.c.App.user.role, 'fin'); assert.equal(t.c.AppUI.orderMap, undefined); assert.equal(model(t), before);
  assert.match(text(detail(t)), /全部国家/);
});

for (const kind of ['unknown', 'missing-country', 'missing-customer', 'duplicate-customer']) check('unlocated order stays accessible: ' + kind, () => {
  const t = setup(), order = t.c.MOCK.orders[0], customer = t.c.U.customer(order.customerId);
  if (kind === 'unknown') customer.country = '<img src=x onerror="bad">';
  if (kind === 'missing-country') delete customer.country;
  if (kind === 'missing-customer') t.c.MOCK.customers = t.c.MOCK.customers.filter(c => c.id !== order.customerId);
  if (kind === 'duplicate-customer') t.c.MOCK.customers.push(Object.assign({}, customer));
  const before = model(t), d = t.c.U.orderMapData(t.c.App.user); mount(t);
  assert.equal(d.orders.length, 7); assert.equal(d.missing, 2); assert.equal(d.located, 4);
  assert.ok(d.groups.some(g => g.key === 'unknown' && g.orders.length === 2));
  assert.equal(country(t, 'unknown', true), undefined); t.click(country(t, 'unknown'));
  assert.equal(detail(t).querySelectorAll('.order-map-order').length, 2); assert.match(text(detail(t)), /地点待补/);
  assert.ok(!t.document.getElementById('order-map').innerHTML.includes('<img src=x')); assert.equal(model(t), before);
});

check('empty orders and all-unlocated states are explicit and pure', () => {
  const t = setup(), unlocated = sample(t, { customerId: 'NO-CUSTOMER' }); t.c.MOCK.orders = []; const before = model(t); mount(t);
  assert.match(text(t.document.getElementById('order-map')), /暂无订单分布/); assert.match(text(detail(t)), /暂无订单记录/);
  assert.equal(detail(t).querySelectorAll('a').length, 0); assert.equal(t.c.U.orderMapData(t.c.App.user).totals.length, 0); assert.equal(model(t), before);
  t.c.MOCK.orders = [unlocated]; mount(t);
  assert.match(text(t.document.getElementById('order-map')), /地点待补，订单仍可在右侧查阅/);
  assert.equal(detail(t).querySelectorAll('a').length, 1);
});

check('exact cents and same-country mixed currencies stay independent', () => {
  const t = setup();
  t.c.MOCK.orders = [sample(t), sample(t, { id: 'MAP-2', items: [{ qty: 1, price: 0.2 }] }), sample(t, { id: 'MAP-EUR', currency: 'EUR', items: [{ qty: 1, price: 0.4 }] })];
  const before = model(t), d = t.c.U.orderMapData(t.c.App.user); mount(t); t.click(country(t, 'US'));
  assert.equal(d.groups.length, 1); assert.equal(d.groups[0].orders.length, 3);
  assert.deepEqual(totals(d), { EUR: { cents: 40, error: false }, USD: { cents: 30, error: false } });
  assert.match(text(detail(t)), /EUR0.40.*USD0.30/); assert.equal(model(t), before);
});

check('largest independently representable cents total remains exact', () => {
  const t = setup();
  t.c.MOCK.orders = [sample(t, { items: [{ qty: 1, price: '90071992547409.90' }] })];
  const before = model(t), d = t.c.U.orderMapData(t.c.App.user); mount(t);
  assert.deepEqual(totals(d), { USD: { cents: 9007199254740990, error: false } });
  assert.match(text(detail(t)), /90,071,992,547,409.90/); assert.equal(model(t), before);
});

for (const kind of ['missing-items', 'fractional-cent', 'negative', 'exponent', 'unknown-currency', 'unsafe-value', 'unsafe-sum', 'lossy-sum']) check('invalid amount cannot become a plausible total: ' + kind, () => {
  const t = setup(), order = sample(t);
  if (kind === 'missing-items') delete order.items;
  if (kind === 'fractional-cent') order.items = [{ qty: 0.01, price: 0.01 }];
  if (kind === 'negative') order.items = [{ qty: 1, price: -1 }];
  if (kind === 'exponent') order.items = [{ qty: 1, price: '1e3' }];
  if (kind === 'unknown-currency') order.currency = '<bad>';
  if (kind === 'unsafe-value') order.items = [{ qty: 1, price: '90071992547409.92' }];
  if (kind === 'unsafe-sum' || kind === 'lossy-sum') order.items = [{ qty: 1, price: '45035996273704.95' }];
  t.c.MOCK.orders = [order];
  if (kind === 'unsafe-sum') t.c.MOCK.orders.push(sample(t, { id: 'MAP-HUGE-2', items: [{ qty: 1, price: '45035996273704.97' }] }));
  if (kind === 'lossy-sum') t.c.MOCK.orders.push(sample(t, { id: 'MAP-CENT-2', items: [{ qty: 1, price: '45035996273704.96' }] }));
  if (kind === 'unsafe-sum' || kind === 'lossy-sum') {
    assert.ok(t.c.MOCK.orders.every(o => t.c.U.transactionAmounts(o.items).ok), 'individual large orders must be valid before aggregate edge');
    const sum = t.c.MOCK.orders.reduce((s, o) => s + t.c.U.transactionAmounts(o.items).totalCents, 0);
    assert.equal(Number.isSafeInteger(sum), kind === 'lossy-sum', 'overflow and safe-but-not-displayable edges are distinct');
  }
  const before = model(t), d = t.c.U.orderMapData(t.c.App.user); mount(t);
  assert.ok(d.totals.some(g => g.error), kind + ' aggregate marked uncertain');
  assert.match(text(detail(t)), /金额待核对/); assert.ok(!text(detail(t)).includes('NaN')); assert.ok(!text(detail(t)).includes('Infinity')); assert.equal(model(t), before);
});

check('malicious display fields are escaped and order href is encoded', () => {
  const t = setup(), order = sample(t, { id: 'MAP/\"><svg onload="bad">', status: '<img onerror="bad">' });
  t.c.MOCK.orders = [order]; t.c.U.customer(order.customerId).nameCn = '<img src=x onerror="bad">';
  const before = model(t); mount(t); t.click(country(t, '')); const d = detail(t), html = d.innerHTML;
  assert.ok(html.includes('&lt;img')); assert.ok(!html.includes('<img')); assert.ok(!html.includes('<svg'));
  assert.equal(d.querySelector('a').attrs.href, '#/orders/' + encodeURIComponent(order.id));
  assert.equal(d.querySelectorAll('[onerror], [onload]').length, 0); assert.equal(model(t), before);
});

if (failures.length) {
  for (const { name, error } of failures) console.error('FAIL ' + name + ': ' + error.message);
  console.error(`${checks} passed; ${failures.length} failed (Node DOM fixture only)`);
  process.exitCode = 1;
} else console.log(`PASS: ${checks} order-map acceptance scenarios; real view/actions, five roles and revocation, independent expected cents/countries, missing/ambiguous locations, invalid/unsafe amounts, escaping, local node/input/focus preservation and Mock immutability (Node DOM fixture only; no browser/database claims)`);
