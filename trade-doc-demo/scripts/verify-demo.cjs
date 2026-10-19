/* 开发验收工具：不被 index.html 加载，不引入运行时依赖。 */
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const entry = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const resourceUrls = [...entry.matchAll(/(?:src|href)="([^"]+)"/g)].map(m => m[1]);
for (const url of resourceUrls) assert.ok(!/^(?:[a-z][a-z0-9+.-]*:|\/\/|\/|\\)/i.test(url), '必须使用本地相对运行时资源：' + url);
const assets = resourceUrls.map(url => url.split(/[?#]/)[0]); // local cache revision is not part of the file path
const expectedAssets = ['css/base.css', 'css/layout.css', 'css/pages.css',
  'js/mock-data.js', 'js/utils.js', 'js/views-core.js', 'js/views-sales.js',
  'js/views-docs.js', 'js/views-fin.js', 'js/views-stats.js', 'js/views-system.js', 'js/app.js'];
assert.equal(new Set(assets).size, assets.length, '入口资源不得重复或替代核心脚本');
assert.deepEqual(assets, expectedAssets, '入口必须按依赖顺序加载确切的 3 个 CSS 和 9 个 JS');
for (const asset of assets) {
  assert.ok(!/^(?:https?:)?\/\//.test(asset), '禁止外部运行时资源：' + asset);
  assert.ok(fs.existsSync(path.join(root, asset)), '资源缺失：' + asset);
}
for (const asset of assets.filter(p => p.endsWith('.js'))) {
  new vm.Script(fs.readFileSync(path.join(root, asset), 'utf8'), { filename: asset });
}
const context = vm.createContext({ window: {} });
for (const asset of ['js/mock-data.js', 'js/utils.js']) {
  vm.runInContext(fs.readFileSync(path.join(root, asset), 'utf8'), context, { filename: asset });
}
const { MOCK: data, U } = context.window;
function close(actual, expected, label) {
  assert.ok(Number.isFinite(actual) && Math.abs(actual - expected) < 0.005, label);
}
const docIds = new Set();
for (const d of data.documents) {
  assert.ok(data.orders.some(o => o.id === d.orderId), '单证关联订单：' + d.id);
  assert.ok(!docIds.has(d.id), '单证版本 ID 唯一：' + d.id);
  docIds.add(d.id);
}
for (const q of data.quotes) {
  close(U.quoteTotal(q), q.items.reduce((sum, i) => sum + i.qty * i.price, 0), '报价金额：' + q.id);
}
const amounts = data.orders.map(o => {
  const q = data.quotes.find(q => q.id === o.quoteId);
  assert.ok(q && q.status === '已确认', '订单必须源于已确认报价：' + o.id);
  const payments = data.payments.filter(p => p.orderId === o.id);
  for (const p of payments) assert.equal(p.currency, o.currency, '收款币种：' + p.id);
  const total = o.items.reduce((sum, i) => sum + i.qty * i.price, 0);
  const received = payments.reduce((sum, p) => sum + p.amount, 0);
  const fin = U.orderFin(o);
  close(fin.total, total, '订单金额：' + o.id);
  close(fin.received, received, '已收金额：' + o.id);
  close(fin.outstanding, Math.max(0, total - received), '未收金额：' + o.id);
  return { order: o.id, currency: o.currency, total, received, outstanding: fin.outstanding };
});
console.log(JSON.stringify({ result: 'PASS', resources: assets.length, quotes: data.quotes.length,
  documents: docIds.size, amounts, scope: '静态资源、语法及样例金额；不替代浏览器与业务流程验收' }, null, 2));
