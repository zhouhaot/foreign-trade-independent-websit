'use strict';
/* Independent explicit-origin contract checks against actual helpers/views/actions.
 * Isolated Node DOM fixtures only; no browser, geographic accuracy or live logistics claims.
 */
const assert = require('node:assert/strict');
const { fixture } = require('./verify-document-workspace.cjs');
let checks = 0;
const failures = [];
async function check(name, run) {
  try { await run(); checks++; } catch (error) { failures.push({ name, error }); }
}
function setup(role = 'sales') {
  const t = fixture(['views-sales', 'views-docs', 'views-fin', 'views-system', 'app']);
  t.c.App.user = t.c.U.roleUser(role); t.c.U.setUser(t.c.App.user);
  t.c.location.hash = '#/dashboard';
  return t;
}
const model = t => JSON.stringify(t.c.MOCK);
const text = node => node ? (node.textContent || '') + node.children.map(text).join('') : '';
const mount = t => { t.app.innerHTML = t.c.Views.dashboard({ user: t.c.App.user }); };
const data = t => t.c.U.orderMapData(t.c.App.user);
const project = p => ({ x: (p.lon + 180) / 360 * 1000, y: (85 - p.lat) / 145 * 430 });
const near = (actual, expected, label, tolerance = 1e-8) => assert.ok(Math.abs(actual - expected) <= tolerance, label + ': ' + actual + ' vs ' + expected);
const origin = overrides => Object.assign({ name: '独立测试港', kind: '港口', lon: 121, lat: 30, demoSynthetic: true }, overrides);
const sample = (t, overrides) => Object.assign({}, t.c.MOCK.orders[0], { id: 'MAP-ORIGIN-TEST' }, overrides);
function validCurve(t, a, b, expectedParts) {
  const before = JSON.stringify([a, b]), parts = t.c.U.orderMapRouteSegments(a, b);
  assert.equal(parts.length, expectedParts);
  assert.equal(JSON.stringify([a, b]), before, 'geometry helper is pure');
  if (!parts.length) return;
  const start = project(a), finish = project(b);
  let endX = finish.x;
  if (endX - start.x > 500) endX -= 1000;
  else if (start.x - endX > 500) endX += 1000;
  const controlY = Math.max(8, Math.min(start.y, finish.y) - Math.min(85, Math.abs(endX - start.x) * .3));
  const at = s => ({ x: start.x + (endX - start.x) * s,
    y: (1 - s) ** 2 * start.y + 2 * (1 - s) * s * controlY + s ** 2 * finish.y });
  near(parts[0].startT, 0, 'starts at actual origin parameter');
  near(parts.at(-1).endT, 1, 'ends at actual destination parameter');
  if (Math.abs(a.lon) === 180) near(Math.abs(parts[0].startX - start.x) % 1000, 0, 'actual seam origin x or identical wrapped edge');
  else near(parts[0].startX, start.x, 'actual recorded origin x');
  near(parts[0].startY, start.y, 'actual recorded origin y');
  near(parts.at(-1).endX, finish.x, 'destination x'); near(parts.at(-1).endY, finish.y, 'destination y');
  assert.equal(parts.filter(s => s.arrives).length, 1, 'one destination arrow only');
  assert.equal(parts.at(-1).arrives, true);
  for (const part of parts) {
    assert.ok(part.startT < part.endT, 'positive animation duration');
    for (const key of ['startX', 'startY', 'controlX', 'controlY', 'endX', 'endY', 'startT', 'endT']) assert.ok(Number.isFinite(part[key]), key);
    for (const key of ['startX', 'controlX', 'endX']) assert.ok(part[key] >= -1e-8 && part[key] <= 1000 + 1e-8, key + ' inside map');
    for (const key of ['startY', 'controlY', 'endY']) assert.ok(part[key] >= 0 && part[key] <= 430, key + ' inside map');
    assert.ok(Math.abs(part.endX - part.startX) <= 500 + 1e-8, 'no full-world shortcut');
    const values = part.d.match(/-?\d+(?:\.\d+)?/g).map(Number);
    assert.equal(values.length, 6); assert.match(part.d, /^M[-\d.,]+Q[-\d.,]+ [-\d.,]+$/);
    for (const [index, key] of ['startX', 'startY', 'controlX', 'controlY', 'endX', 'endY'].entries()) near(values[index], part[key], 'SVG coordinates match segment ' + key, .00051);
    for (const u of [0, .25, .5, .75, 1]) {
      const fullT = part.startT + u * (part.endT - part.startT), expected = at(fullT);
      const x = (1 - u) ** 2 * part.startX + 2 * (1 - u) * u * part.controlX + u ** 2 * part.endX;
      const y = (1 - u) ** 2 * part.startY + 2 * (1 - u) * u * part.controlY + u ** 2 * part.endY;
      near(y, expected.y, 'split curve preserves full quadratic y');
      near((x - expected.x) / 1000, Math.round((x - expected.x) / 1000), 'split curve only wraps a whole world');
    }
  }
  if (parts.length === 2) {
    near(parts[0].endT, parts[1].startT, 'continuous timeline');
    near(Math.abs(parts[0].endX - parts[1].startX), 1000, 'opposite map edges');
    near(parts[0].endY, parts[1].startY, 'same seam latitude');
    assert.equal(parts[0].arrives, false, 'no arrow at intermediate seam');
  }
}
async function run() {
  for (const role of ['admin', 'sales', 'doc', 'fin', 'boss']) await check('baseline explicit origins and visibility ' + role, () => {
    const t = setup(role), before = model(t), d = data(t); mount(t);
    if (role === 'admin') {
      assert.equal(d.routes.length, 0); assert.equal(d.originPending, 0); assert.equal(d.originSynthetic, 0); assert.equal(d.routePending, 0);
      assert.equal(t.document.getElementById('order-map'), null);
    } else {
      assert.equal(d.orders.length, 7); assert.equal(d.routes.length, 7); assert.equal(d.originPending, 0); assert.equal(d.originSynthetic, 7); assert.equal(d.routePending, 0);
      const expected = {
        SO2026001: ['上海港', '港口', 122.066667, 30.633333, 'US'], SO2026002: ['深圳盐田港', '港口', 114.3, 22.6, 'US'],
        SO2026003: ['宁波市', '城市', 121.55, 29.866667, 'DE'], SO2026004: ['宁波市', '城市', 121.55, 29.866667, 'DE'],
        SO2026005: ['上海港', '港口', 122.066667, 30.633333, 'CL'], SO2026006: ['上海港', '港口', 122.066667, 30.633333, 'EG'],
        SO2026007: ['深圳盐田港', '港口', 114.3, 22.6, 'FR']
      };
      assert.equal(new Set(d.routes.map(r => r.orderId)).size, 7);
      for (const route of d.routes) {
        assert.deepEqual([route.origin.name, route.origin.kind, route.origin.lon, route.origin.lat, route.country], expected[route.orderId]);
        assert.equal(route.origin.demoSynthetic, true);
        const target = d.groups.find(g => g.key === route.country);
        validCurve(t, route.origin, target, ['US', 'CL'].includes(route.country) ? 2 : 1);
      }
      assert.equal(t.document.querySelectorAll('[data-order-map-route]').length, 7);
      assert.equal(t.document.querySelectorAll('.order-map-origin-label').length, 3);
      const rows = t.document.querySelectorAll('.order-map-origin-text'); assert.equal(rows.length, 7);
      assert.ok(rows.every(n => /起运：.+（合成数据）/.test(text(n))));
      assert.match(text(t.document.getElementById('order-map-origin-summary')), /7 笔合成起运数据/);
      assert.match(text(t.document.getElementById('order-map')), /不表示物流路线，缺起运地不连线/);
    }
    assert.equal(model(t), before);
  });
  for (const bad of [undefined, null, false, '', '上海港', [], {}, { name: '', kind: '港口', lon: 1, lat: 1 }, origin({ name: ' \u200B\uFEFF ' }), origin({ kind: '国家' }), origin({ kind: null }), origin({ name: 5 }), origin({ lon: null }), origin({ lon: '' }), origin({ lon: '122' }), origin({ lon: NaN }), origin({ lon: Infinity }), origin({ lon: 181 }), origin({ lon: -181 }), origin({ lat: undefined }), origin({ lat: -91 }), origin({ lat: 91 }), origin({ lat: '30' }), origin({ lat: -Infinity }), origin({ demoSynthetic: 'true' })]) await check('reject absent/malformed explicit origin ' + String(bad && bad.name || bad), () => {
    const t = setup(), order = sample(t, { shippingOrigin: bad, tradeTerm: 'FOB Shanghai', shippingPort: 'Shanghai', origin: origin() });
    t.c.MOCK.orders = [order]; const before = model(t), candidate = t.c.U.orderShippingOrigin(order), d = data(t); mount(t);
    assert.equal(candidate.ok, false); assert.ok(candidate.error); assert.equal(d.originPending, 1); assert.equal(d.routePending, 1); assert.equal(d.routes.length, 0);
    assert.equal(d.orders.length, 1); assert.equal(d.groups[0].orders.length, 1); assert.equal(d.totals[0].cents, 2410000);
    assert.equal(t.document.querySelectorAll('[data-order-map-route]').length, 0); assert.equal(t.document.querySelectorAll('.order-map-origin-label').length, 0);
    // The fixture parser only captures name="value" attributes; inspect the actual generated boolean attribute.
    assert.match(t.app.innerHTML, /<button[^>]*data-action="order-map-replay"[^>]* disabled>/);
    assert.match(text(t.document.querySelector('.order-map-origin-text')), /待补|待核对/); assert.equal(model(t), before);
  });
  await check('zero coordinates, trimmed name and optional false provenance are valid without source writes', () => {
    const t = setup();
    for (const flag of [undefined, false, true]) {
      const record = sample(t, { shippingOrigin: origin({ name: '  赤道零经线  ', lon: 0, lat: 0, demoSynthetic: flag }) }), before = JSON.stringify(record);
      const v = t.c.U.orderShippingOrigin(record); assert.equal(v.ok, true); assert.equal(v.lon, 0); assert.equal(v.lat, 0); assert.equal(v.name, '赤道零经线'); assert.equal(v.demoSynthetic, flag === true);
      assert.notEqual(v, record.shippingOrigin); v.name = 'independent'; assert.equal(JSON.stringify(record), before);
      t.c.MOCK.orders = [record]; const d = data(t); assert.equal(d.routes.length, 1); assert.equal(d.originSynthetic, flag === true ? 1 : 0);
    }
  });
  await check('same customer country preserves each order origin and country selection dims only other countries', () => {
    const t = setup(), before = model(t); mount(t);
    const refs = t.document.querySelectorAll('[data-order-map-route]'), canvas = t.document.querySelector('.order-map-canvas');
    const us = refs.filter(r => r.dataset.country === 'US'); assert.equal(us.length, 2); assert.notEqual(data(t).routes[0].origin.lon, data(t).routes[1].origin.lon);
    t.c.Actions['order-map-country'](t.document.querySelectorAll('[data-action="order-map-country"]').find(n => n.dataset.country === 'US'));
    assert.equal(t.document.querySelector('.order-map-canvas'), canvas);
    assert.deepEqual(t.document.querySelectorAll('[data-order-map-route]'), refs);
    for (const r of refs) assert.equal(r.classList.contains('is-dimmed'), r.dataset.country !== 'US');
    assert.equal(t.document.querySelectorAll('.order-map-origin-text').length, 2); assert.equal(model(t), before);
  });
  for (const kind of ['unknown-country', 'duplicate-customer', 'missing-customer', 'polar-origin', 'coincident']) await check('valid origin with undrawable destination or projection remains explicit ' + kind, () => {
    const t = setup(), order = sample(t, {}); t.c.MOCK.orders = [order];
    if (kind === 'unknown-country') t.c.U.customer(order.customerId).country = '尚未配置国家';
    if (kind === 'duplicate-customer') t.c.MOCK.customers.push(Object.assign({}, t.c.U.customer(order.customerId)));
    if (kind === 'missing-customer') t.c.MOCK.customers = t.c.MOCK.customers.filter(c => c.id !== order.customerId);
    if (kind === 'polar-origin') order.shippingOrigin = origin({ lat: 90 });
    if (kind === 'coincident') order.shippingOrigin = origin({ lon: -99, lat: 39 });
    const before = model(t), d = data(t); mount(t);
    assert.equal(t.c.U.orderShippingOrigin(order).ok, true); assert.equal(d.originPending, 0); assert.equal(d.originSynthetic, 1); assert.equal(d.routePending, 1); assert.equal(d.routes.length, 0);
    assert.equal(t.document.querySelectorAll('.order-map-order').length, 1); assert.match(text(t.document.querySelector('.order-map-origin-text')), /起运：/); assert.equal(model(t), before);
  });
  for (const [a, b, count] of [
    [{ lon: 0, lat: 0 }, { lon: 10, lat: 51 }, 1], [{ lon: 170, lat: 20 }, { lon: -99, lat: 39 }, 2],
    [{ lon: -170, lat: 20 }, { lon: 170, lat: -20 }, 2], [{ lon: 180, lat: 30 }, { lon: -99, lat: 39 }, 1],
    [{ lon: -180, lat: 30 }, { lon: 170, lat: 39 }, 1], [{ lon: -180, lat: 30 }, { lon: 180, lat: 30 }, 0],
    [{ lon: 1, lat: 86 }, { lon: 10, lat: 30 }, 0], [{ lon: 1, lat: 20 }, { lon: 10, lat: -61 }, 0],
    [{ lon: '121', lat: 30 }, { lon: 10, lat: 30 }, 0], [{ lon: Infinity, lat: 30 }, { lon: 10, lat: 30 }, 0]
  ]) await check('independent route geometry ' + JSON.stringify([a, b]), () => validCurve(setup(), a, b, count));
  await check('hostile origin and order fields stay escaped in all new output', () => {
    const t = setup(), record = sample(t, { id: 'MAP/\"><svg onload="bad">', shippingOrigin: origin({ name: '<img src=x onerror="bad">' }) });
    t.c.MOCK.orders = [record]; const before = model(t); mount(t);
    const root = t.document.getElementById('order-map');
    const mapHtml = t.c.Views.dashboard({ user: t.c.App.user }).match(/<section class="card order-map"[\s\S]*?<\/section>/)[0];
    assert.ok(mapHtml.includes('&lt;img')); assert.ok(!mapHtml.includes('<img src=x')); assert.ok(!mapHtml.includes('<svg onload'));
    assert.equal(root.querySelectorAll('[onerror], [onload]').length, 0);
    assert.equal(t.document.querySelector('[data-order-map-route]').dataset.orderMapRoute, record.id);
    assert.equal(t.document.querySelector('.order-map-order').attrs.href, '#/orders/' + encodeURIComponent(record.id)); assert.equal(model(t), before);
  });
  for (const role of ['sales', 'doc', 'fin', 'boss']) await check('revoked module hides origin and route data ' + role, () => {
    const t = setup(role); t.c.MOCK.permMatrix[role] = t.c.MOCK.permMatrix[role].filter(x => x !== '订单详情'); const before = model(t), d = data(t); mount(t);
    assert.equal(d.orders.length, 0); assert.equal(d.routes.length, 0); assert.equal(d.originSynthetic, 0); assert.equal(d.originPending, 0); assert.equal(d.routePending, 0);
    assert.equal(t.document.getElementById('order-map'), null); assert.equal(model(t), before);
  });
  await check('actual newly generated order has no invented shipping origin', async () => {
    const t = setup(), q = t.c.MOCK.quotes.find(q => q.status === '待客户确认' && !q.orderId);
    q.status = '已确认'; q.confirmDate = t.c.U.today(); t.c.location.hash = '#/quotes/' + q.id;
    const originalOrigins = JSON.stringify(t.c.MOCK.orders.map(o => o.shippingOrigin)), documents = JSON.stringify(t.c.MOCK.documents), payments = JSON.stringify(t.c.MOCK.payments);
    t.c.Actions['quote-gen-order']({ dataset: { id: q.id } });
    t.modal.querySelector('#qg-delivery').value = t.c.U.addDays(t.c.U.today(), 30);
    t.click(t.modal.querySelector('[data-ok]')); await t.flush();
    const created = t.c.U.order(q.orderId); assert.ok(created); assert.equal(created.shippingOrigin, undefined);
    assert.equal(t.c.U.orderShippingOrigin(created).ok, false); assert.equal(t.c.U.orderTotal(created), t.c.U.quoteTotal(q));
    assert.equal(JSON.stringify(t.c.MOCK.orders.slice(0, -1).map(o => o.shippingOrigin)), originalOrigins);
    assert.equal(JSON.stringify(t.c.MOCK.documents), documents); assert.equal(JSON.stringify(t.c.MOCK.payments), payments);
    const before = model(t), d = data(t); mount(t);
    assert.equal(d.orders.length, 8); assert.equal(d.routes.length, 7); assert.equal(d.originPending, 1); assert.equal(d.routePending, 1); assert.equal(d.originSynthetic, 7);
    const row = t.document.querySelectorAll('.order-map-order').find(a => a.attrs.href === '#/orders/' + created.id);
    assert.ok(row); assert.match(text(row), /起运地待补/); assert.equal(model(t), before);
  });
  if (failures.length) {
    for (const { name, error } of failures) console.error('FAIL ' + name + ': ' + error.message);
    console.error(checks + ' passed; ' + failures.length + ' failed (Node DOM fixture only)'); process.exitCode = 1;
  } else console.log('PASS: ' + checks + ' explicit order-origin scenarios; exact seven demo origins, malformed/missing data, no trade-term inference, per-order routing, independent quadratic seam geometry, polar/coincident pending, escaping, roles/revocation, actual new-order default and model purity (Node DOM fixture only; no browser/logistics accuracy claims)');
}
run().catch(error => { console.error(error); process.exitCode = 1; });
