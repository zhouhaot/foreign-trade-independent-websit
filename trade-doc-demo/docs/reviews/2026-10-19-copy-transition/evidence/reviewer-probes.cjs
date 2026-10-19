'use strict';
// Independent Node DOM probes: not browser, real authentication, or file export.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '../../../..');
const { fixture } = require(path.join(root, 'scripts/verify-document-workspace.cjs'));
let count = 0;
function check(name, fn) { fn(); count++; console.log('PASS ' + name); }
const t = fixture(['views-sales', 'views-docs', 'views-system', 'app']);
const { U, MOCK: M, App, Views, Actions } = t.c;
const raw = () => JSON.stringify(M);
check('password explanation cannot claim mutation or notification; original model preserved', () => {
  App.user = U.roleUser('admin'); U.setUser(App.user);
  const before = raw(); let confirmation;
  U.confirm = x => { confirmation = x; };
  Actions['sys-reset-pwd']({dataset:{id:'U002'}});
  assert.match(confirmation.message, /不会修改密码，也不会发送通知/);
  assert.equal(confirmation.okText, '知道了'); confirmation.onOk();
  assert.equal(raw(), before);
  assert.ok(t.messages.some(x => /未修改密码，未发送通知/.test(x.text)));
  assert.ok(t.messages.every(x => !/已重置|已通过站内信发送/.test(x.text)));
  const html = Views.sysUsers({user:App.user});
  assert.match(html, /disabled[^>]*>新建用户 · 未开放/);
  assert.match(html, /刷新后还原/);
});
check('sensitive old history token is display-only; near-match user action and opinion remain escaped', () => {
  App.user = U.roleUser('doc'); U.setUser(App.user);
  const d = U.doc('D-CI2026002-V1'), old = JSON.stringify(d.history);
  d.history.push({time:'2026-10-19 16:01:01',person:'原人员',action:'导出 PDF（演示）',opinion:'用户要求展示 Demo 与演示材料<script>x</script>'});
  d.history.push({time:'2026-10-19 16:01:02',person:'原人员',action:'导出 PDF（演示） ',opinion:''});
  const before = raw(), html = Views.docDetail({params:[d.id],query:{},user:App.user});
  assert.match(html, /登记导出记录（未生成文件）/);
  assert.ok(html.includes(U.esc('导出 PDF（演示） ')));
  assert.ok(html.includes(U.esc(d.history.at(-2).opinion)));
  assert.equal(raw(), before); d.history = JSON.parse(old);
});
check('synthetic exact-text mapping requires both known ID and flag; arbitrary client wording preserved', () => {
  App.user = U.roleUser('sales'); U.setUser(App.user);
  const iq = U.inquiry('INQ2026006'), before = raw();
  const original = {source:iq.source,message:iq.message,demoSynthetic:iq.demoSynthetic};
  iq.message = '客户要求演示及展示 Demo <img onerror=x>';
  let html = Views.inquiryDetail({params:[iq.id],query:{},user:App.user});
  assert.ok(html.includes(U.esc(iq.message)));
  iq.message = original.message; iq.demoSynthetic = false;
  html = Views.inquiryDetail({params:[iq.id],query:{},user:App.user});
  assert.ok(html.includes(U.esc(original.source)));
  assert.ok(html.includes(U.esc(original.message)));
  Object.assign(iq, original); assert.equal(raw(), before);
});
check('all seven origins retain synthetic markers; missing origins do not fabricate routes', () => {
  assert.equal(M.orders.filter(o => o.shippingOrigin && o.shippingOrigin.demoSynthetic).length, 7);
  App.user = U.roleUser('sales'); U.setUser(App.user);
  const original = M.orders.map(o => o.shippingOrigin);
  const normal = Views.dashboard({params:[],query:{},user:App.user});
  assert.match(normal, /7 笔合成起运数据/); assert.match(normal, /连线不表示物流路线/);
  M.orders.forEach(o => { delete o.shippingOrigin; });
  const before = raw(), missing = Views.dashboard({params:[],query:{},user:App.user});
  assert.doesNotMatch(missing, /data-order-map-route=/);
  assert.match(missing, /起运地待补／待核对/); assert.equal(raw(), before);
  M.orders.forEach((o,i) => { o.shippingOrigin = original[i]; });
});
for (const [label, from, to] of [
  ['current approved-banner corruption', '当前可登记导出记录。', '已生成正式 PDF。'],
  ['current pending-banner corruption', '<b>待审核：</b>', '<b>已经批准：</b>']
]) {
  check(label + ' rejected by current exact test, not masked by archive comparison', () => {
    const code = `const fs=require('node:fs'); const original=fs.readFileSync; let changed=false;
      fs.readFileSync=function(p,...a){const v=original.call(this,p,...a);if(typeof p==='string'&&p.endsWith('/js/views-docs.js')&&typeof v==='string'){if(!v.includes(${JSON.stringify(from)}))throw Error('mutation anchor missing');changed=true;return v.replace(${JSON.stringify(from)},${JSON.stringify(to)});}return v;};
      require(${JSON.stringify(path.join(root,'scripts/verify-document-status-guidance.cjs'))});process.on('beforeExit',()=>{if(!changed)throw Error('mutation not executed');});`;
    const result = spawnSync(process.execPath, ['-e', code], {cwd:root,encoding:'utf8',timeout:30000});
    assert.equal(result.status, 1, result.stdout + result.stderr);
    assert.match(result.stderr, /ASSERTION_FAIL/);
    assert.doesNotMatch(result.stderr, /mutation anchor missing|mutation not executed/);
  });
}
console.log('PASS independent probes: ' + count + ' groups; local fixtures and two temporary read mutations only');
