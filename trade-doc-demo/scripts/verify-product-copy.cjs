'use strict';
// Current UI language contract. Node DOM only, not authentication or file export.
const assert = require('node:assert/strict');
const { fixture } = require('./verify-document-workspace.cjs');
const t = fixture(['views-sales', 'views-docs', 'views-fin', 'views-stats', 'views-system', 'app']);
const { Views, U, MOCK, App } = t.c;
const before = JSON.stringify(MOCK);
const plain = html => html.replace(/<[^>]*>/g, ' ') + ' ' + [...html.matchAll(/\s(?:aria-label|aria-description|title|placeholder|value)="([^"]*)"/g)].map(m => m[1]).join(' ');
const neutral = (html, name) => assert.doesNotMatch(plain(html), /演示|展示|\bdemo\b/i, name + ': built-in visible copy and accessible names');
const routes = [['dashboard'], ['customers'], ['customerDetail', 'C001'], ['products'], ['productDetail', 'P001'],
  ['inquiries'], ['inquiryDetail', 'INQ2026006'], ['quotes'], ['quoteDetail', 'Q2026004'], ['quoteEdit', 'Q2026004'],
  ['orders'], ['orderDetail', 'SO2026001'], ['documents'], ['docDetail', 'D-CI2026002-V1'], ['payments'], ['approvals'],
  ['stats'], ['sysUsers'], ['sysRoles'], ['sysDicts']];
let renders = 0;
for (const role of ['admin', 'sales', 'doc', 'fin', 'boss']) {
  const user = U.roleUser(role); App.user = user; U.setUser(user); t.c.AppUI = {};
  for (const [view, id] of routes) {
    const html = Views[view]({params: id ? [id] : [], query: {}, user});
    assert.ok(html.length > 50); neutral(html, role + '/' + view); renders++;
  }
  App.requestNavigation('#/dashboard'); neutral(t.app.innerHTML, role + '/shell');
}
App.user = null; U.clearUser(); t.c.AppUI = {};
const login = Views.login(); neutral(login, 'login');
assert.match(login, /未接入认证服务/); assert.match(login, /不校验账号密码/); assert.match(login, /请勿填写真实凭据/);
assert.match(login, /刷新后恢复样例数据/);
assert.equal(JSON.stringify(MOCK), before, 'all views preserve original data, including source strings and frozen snapshots');
const user = U.roleUser('doc'); App.user = user; U.setUser(user);
const d = U.doc('D-CI2026002-V1'), html = Views.docDetail({params:[d.id], query:{}, user});
assert.match(html, />登记导出记录<\/button>/); assert.match(html, /不生成文件/);
assert.doesNotMatch(html, />导出 PDF/);
const sales = U.roleUser('sales'); App.user = sales; U.setUser(sales);
const iq = U.inquiry('INQ2026006');
assert.equal(iq.source, '合成演示样例', 'source remains original, not rewritten for UI cleanup');
const inquiry = Views.inquiryDetail({params:[iq.id], query:{}, user:sales});
assert.match(inquiry, /合成数据/); assert.match(inquiry, /非真实客户需求/); assert.match(inquiry, /样例加入日期/);
const originalMessage = iq.message;
iq.message = '客户原文：需要展示 Demo 产品与演示材料';
assert.ok(Views.inquiryDetail({params:[iq.id], query:{}, user:sales}).includes(iq.message), 'business source wording is not globally washed');
iq.message = originalMessage;
assert.equal(JSON.stringify(MOCK), before);
console.log('PASS: ' + renders + ' five-role current views + five shells/login; neutral built-in UI, preserved source/snapshots, explicit missing services and synthetic provenance (Node DOM only)');
