'use strict';
/* H19：真实 Views + 动作/Promise 的纸张表达；不代表打印、签署或实际浏览器验收。 */
const assert = require('node:assert/strict');
const { fixture } = require('./verify-document-workspace.cjs');
function paper(c, d, role = 'doc') {
  c.App.user = c.U.roleUser(role);
  const html = c.Views.docDetail({ params: [d.id], query: {}, user: c.App.user });
  return html.slice(html.indexOf('<div class="paper">'), html.indexOf('<div class="card mt16">'));
}
function footer(html) { return html.slice(html.indexOf('<div class="p-sign">'), html.indexOf('<div class="p-stamp">') < 0 ? html.length : html.indexOf('<div class="p-stamp">')); }
const model = c => JSON.stringify(c.MOCK);
async function run() {
  // 使用未修改样例的实际错误表达建立 RED。
  const red = fixture(['views-docs']); const returned = red.c.U.doc('D-PL2026004-V1');
  assert.ok(!footer(paper(red.c, returned)).includes('审核 Approved by：周建国'), 'PL4 已退回不能把退回处理人显示为 Approved by');
  let cases = 0;
  // 独立审查的四个反例：Cc 控制码不应被当成可见审核记录。
  for (const type of ['CI', 'PL']) {
    const { c } = fixture(['views-docs']); const d = c.MOCK.documents.find(x => x.type === type && x.status === '已通过');
    d.approver = '\u0001\u0007'; const before = model(c);
    assert.ok(footer(paper(c, d)).includes('审核记录待核对'), `${type}: 只有 Cc 控制码的姓名不是可见姓名`);
    assert.equal(model(c), before); cases++;
    d.approver = '周建国'; d.approvedAt = '\u0001\u0007'; const dateBefore = model(c);
    const sign = footer(paper(c, d));
    assert.ok(sign.includes('Approved by：周建国')); assert.ok(sign.includes('审核日期待核对'), `${type}: 只有 Cc 控制码的日期视为缺少可见记录`);
    assert.equal(model(c), dateBefore); cases++;
  }
  const scenarios = [
    ['草稿', '未送审', false], ['制作中', '未送审', false], ['待审核', '等待本次审核', false],
    ['已退回', '未通过', false], ['已通过', 'Approved by：周建国', true],
    ['未知状态', '状态待核对', false], ['已通过', '审核记录待核对', true, ''],
    ['已通过', '审核记录待核对', true, '   '], ['已通过', '审核记录待核对', true, '\u200b\u2060'], ['已通过', '审核记录待核对', true, null],
    ['已通过', '审核日期待核对', true, '周建国', ''],
    ['已通过', 'Approved by：周建国', true, '周建国', '2026-09-17', '取消申请中'],
    ['已通过', 'Approved by：周建国', true, '周建国', '2026-09-17', '已取消'],
    ['待审核', '等待本次审核', false, '上次退回人'],
    ['已通过', 'Approved by：周建国', true, '周建国', '2026-09-17', '执行中', true]
  ];
  for (const type of ['CI', 'PL']) for (const role of ['doc', 'boss', 'sales', 'fin']) for (const [status, expected, stamp, name = '周建国', date = '2026-09-17', orderState = '执行中', oldVersion = false] of scenarios) {
    const { c } = fixture(['views-docs']);
    const d = c.MOCK.documents.find(x => x.type === type && !c.MOCK.documents.some(y => y.orderId === x.orderId && y.type === type && y.version > x.version));
    d.status = status; d.approver = name; d.approvedAt = date; d.opinion = '原意见必须保留';
    c.U.order(d.orderId).status = orderState;
    if (oldVersion) c.MOCK.documents.push({ ...d, id: 'DISPLAY-NEWEST', version: d.version + 1, status: '草稿', approver: '其他版本人员' });
    const before = model(c), html = paper(c, d, role), sign = footer(html);
    assert.ok(sign.includes(expected), `${type}/${role}/${status}: ${expected}`);
    assert.equal(html.includes('class="p-stamp"'), stamp, '章只表达当前版本状态，不以导出资格洗历史');
    if (status !== '已通过') assert.ok(!sign.includes('Approved by'), '未通过纸张不填 Approved by 姓名');
    if (orderState !== '执行中' || oldVersion) assert.equal(c.U.documentPolicy(d, c.App.user).canExport, false, '历史事实保留不改变导出资格');
    assert.equal(model(c), before, '纯 Views 全 MOCK 逐字不变'); cases++;
  }
  for (const type of ['CI', 'PL']) {
    const { c } = fixture(['views-docs']); const d = c.MOCK.documents.find(x => x.type === type && x.status === '已通过');
    const originalName = d.approver;
    for (const name of ['<img src=x onerror=alert(1)>', '主管王芳'.repeat(30), 'نور👩‍💻\u200d审核人', '周\u0001\u0007建国']) {
      d.approver = name; const before = model(c), sign = footer(paper(c, d));
      assert.ok(sign.includes('Approved by：' + c.U.esc(name)), '可见多语言/长姓名原文转义保留');
      assert.ok(!sign.includes('<img')); assert.equal(model(c), before); cases++;
    }
    d.approver = originalName;
    const sign = footer(paper(c, d));
    assert.ok(sign.includes('<div><div>审核 Approved by：' + c.U.esc(originalName) + '</div><div class="s-line">授权签字 Authorized Signature</div></div>'), '完整已通过记录保原审核片段');
    for (const status of ['已退回', '已通过']) {
      d.status = status; d.opinion = '<script>malicious opinion</script>'; const before = model(c);
      const html = c.Views.docDetail({ params: [d.id], query: {}, user: c.App.user });
      assert.ok(html.includes(c.U.esc(d.opinion))); assert.ok(!html.includes(d.opinion)); assert.equal(model(c), before); cases++;
    }
  }
  // 真实 PL4 退回→重送→通过，不清旧处理人/意见，也不更改交易和收款。
  const t = fixture(), { c } = t, d = c.U.doc('D-PL2026004-V1');
  const oldApprover = d.approver, oldDate = d.approvedAt, oldOpinion = d.opinion, oldHistory = JSON.stringify(d.history), frozen = JSON.stringify(d.snapshot), payments = JSON.stringify(c.MOCK.payments);
  t.mount(d, 'doc', false); t.click(t.document.querySelector('[data-action="doc-submit"]')); t.click(t.modal.querySelector('[data-ok]')); await t.flush();
  assert.equal(d.status, '待审核'); assert.equal(d.approver, oldApprover); assert.equal(d.approvedAt, oldDate); assert.equal(d.opinion, oldOpinion);
  assert.equal(JSON.stringify(d.history.slice(0, -1)), oldHistory, '重送只追加，不洗历史');
  assert.ok(footer(paper(c, d)).includes('等待本次审核')); assert.ok(!footer(paper(c, d)).includes('Approved by'));
  t.mount(d, 'boss', false); t.document.getElementById('audit-opinion').value = '本次通过';
  t.click(t.document.querySelector('[data-action="doc-approve"]')); t.click(t.modal.querySelector('[data-ok]')); await t.flush();
  assert.equal(d.status, '已通过'); assert.ok(footer(paper(c, d)).includes('Approved by：' + c.U.esc(d.approver)));
  assert.equal(JSON.stringify(d.snapshot), frozen); assert.equal(JSON.stringify(c.MOCK.payments), payments); cases++;
  console.log(`PASS: ${cases} CI/PL approval display role/state/history cases; real returned-resubmit-approve flow, current status vs history/export, escaped visible names, full MOCK read purity and snapshot/payment preservation (Node DOM fixture only)`);
}
run().catch(error => { console.error(error.message); process.exitCode = 1; });
