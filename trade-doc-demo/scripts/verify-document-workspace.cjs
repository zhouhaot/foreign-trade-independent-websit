'use strict';
/* 最小 DOM fixture + 真实 app.js 事件委托/弹窗/loading；非浏览器布局或键盘认证。 */
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const decode = s => s.replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
function fixture(files = ['views-docs', 'app'], sources = {}) {
  const handlers = {}, messages = [];
  let c;
  class Node {
    constructor(tag = 'div', attrs = {}) {
      this.tagName = tag.toUpperCase(); this.attrs = attrs; this.children = []; this.parentElement = null;
      this.style = {}; this.listeners = {}; this.value = attrs.value || ''; this.dataset = {};
      for (const key of Object.keys(attrs)) if (key.startsWith('data-')) this.dataset[key.slice(5).replace(/-([a-z])/g, (_, x) => x.toUpperCase())] = attrs[key];
      this.classList = { contains: x => this.className.split(/\s+/).includes(x),
        add: x => { this.className = [...new Set([...this.className.split(/\s+/).filter(Boolean), x])].join(' '); },
        remove: x => { this.className = this.className.split(/\s+/).filter(k => k !== x).join(' '); },
        toggle: (x, state) => { const on = state === undefined ? !this.classList.contains(x) : !!state; on ? this.classList.add(x) : this.classList.remove(x); return on; } };
    }
    get id() { return this.attrs.id || ''; } set id(v) { this.attrs.id = v; }
    get className() { return this.attrs.class || ''; } set className(v) { this.attrs.class = v; }
    get isConnected() { return this === body || !!this.parentElement && this.parentElement.isConnected; }
    get firstElementChild() { return this.children[0] || null; }
    get innerHTML() { return this._html || ''; }
    set innerHTML(html) {
      this._html = html; this.children.forEach(n => { n.parentElement = null; }); this.children = [];
      const stack = [this];
      for (const token of html.match(/<[^>]*>|[^<]+/g) || []) {
        if (token.startsWith('</')) { if (stack.length > 1) stack.pop(); continue; }
        if (token.startsWith('<')) {
          const match = token.match(/^<([a-z][\w-]*)\b/i); if (!match) continue;
          const attrs = {};
          for (const a of token.matchAll(/([\w-]+)="([^"]*)"/g)) attrs[a[1]] = decode(a[2]);
          const node = new Node(match[1], attrs); stack.at(-1).appendChild(node);
          if (!['INPUT', 'BR', 'IMG', 'HR', 'META', 'LINK'].includes(node.tagName) && !token.endsWith('/>')) stack.push(node);
        } else {
          const node = stack.at(-1); node.textContent = (node.textContent || '') + decode(token);
          if (node.tagName === 'TEXTAREA') node.value += decode(token);
        }
      }
      this.querySelectorAll('select').forEach(select => { select.value = select.querySelector('option')?.attrs.value || ''; });
    }
    appendChild(child) { child.parentElement = this; this.children.push(child); return child; }
    remove() { if (this.parentElement) this.parentElement.children = this.parentElement.children.filter(n => n !== this); this.parentElement = null; }
    setAttribute(key, value) { this.attrs[key] = String(value); } removeAttribute(key) { delete this.attrs[key]; }
    getAttribute(key) { return this.attrs[key] ?? null; }
    addEventListener(type, fn) { (this.listeners[type] ||= []).push(fn); }
    focus() { document.activeElement = this; }
    contains(n) { return n === this || this.children.some(child => child.contains(n)); }
    matches(selector) {
      return selector.split(',').some(part => {
        const s = part.trim().replace(/:not\([^)]*\)/g, '');
        const tag = s.match(/^[\w-]+/); if (tag && this.tagName !== tag[0].toUpperCase()) return false;
        const id = s.match(/#([\w-]+)/); if (id && this.id !== id[1]) return false;
        if ([...s.matchAll(/\.([\w-]+)/g)].some(m => !this.classList.contains(m[1]))) return false;
        return ![...s.matchAll(/\[([\w-]+)(?:="?([^"\]]*)"?)?\]/g)].some(m => !(m[1] in this.attrs) || m[2] !== undefined && this.attrs[m[1]] !== m[2]);
      });
    }
    closest(s) { return this.matches(s) ? this : this.parentElement?.closest(s) || null; }
    querySelectorAll(s) { return this.children.flatMap(child => [...(child.matches(s) ? [child] : []), ...child.querySelectorAll(s)]); }
    querySelector(s) { return this.querySelectorAll(s)[0] || null; }
  }
  const body = new Node('body');
  const app = body.appendChild(new Node('div', { id: 'app' }));
  const modal = body.appendChild(new Node('div', { id: 'modal-root' }));
  body.appendChild(new Node('div', { id: 'toast-root' }));
  const document = { body, activeElement: null, title: '', createElement: tag => new Node(tag),
    getElementById: id => body.querySelector('#' + id), querySelector: s => body.querySelector(s), querySelectorAll: s => body.querySelectorAll(s),
    addEventListener(type, fn) { (handlers[type] ||= []).push(fn); } };
  const storage = () => ({ getItem() { return null; }, setItem() {}, removeItem() {} });
  c = vm.createContext({ document, AppUI: {}, App: { user: null, rerender() {} }, location: { hash: '#/login' },
    sessionStorage: storage(), localStorage: storage(), Promise, setTimeout(fn, delay) { return setTimeout(fn, Math.min(delay || 0, 8)); },
    scrollY: 0, scrollTo() {}, matchMedia: () => ({ matches: true }), addEventListener(type, fn) { (handlers[type] ||= []).push(fn); } });
  c.window = c;
  for (const name of ['mock-data', 'utils', 'views-core', ...files]) vm.runInContext(sources[name] || fs.readFileSync(path.join(root, 'js', name + '.js'), 'utf8'), c, { filename: name });
  c.U.toast = (text, type) => messages.push({ text, type });
  let renders = 0; c.App.rerender = () => { renders++; };
  c.App.user = c.U.roleUser('doc');
  return { c, document, app, modal, messages, get renders() { return renders; },
    click(node) {
      assert.ok(node, '点击入口存在'); const event = { target: node, currentTarget: node, defaultPrevented: false, preventDefault() { this.defaultPrevented = true; } };
      for (const fn of node.listeners.click || []) fn(event);
      for (const fn of handlers.click || []) fn(event);
      const anchor = node.closest('a'); if (anchor && !event.defaultPrevented && anchor.attrs.href) c.location.hash = anchor.attrs.href;
      return event;
    },
    async flush() { await new Promise(resolve => setTimeout(resolve, 35)); },
    mount(d, role = 'doc', editing = false) {
      c.App.user = c.U.roleUser(role); c.location.hash = '#/documents/' + d.id; c.AppUI.docEditing = editing ? d.id : null;
      app.innerHTML = c.Views.docDetail({ params: [d.id], query: {}, user: c.App.user });
    }
  };
}
async function run() {
  const t = fixture(), { c } = t;
  const d = c.MOCK.documents.find(x => x.id === 'D-CI2026003-V2');
  t.mount(d, 'boss');
  const directory = t.document.querySelector('.doc-list-panel');
  const ids = directory.querySelectorAll('[data-action="doc-goto"]').map(n => n.dataset.id);
  assert.equal(ids.length, c.MOCK.documents.filter(x => x.orderId === d.orderId).length, '目录只包含本订单所有版本');
  assert.ok(ids.every(id => c.U.doc(id).orderId === d.orderId));
  assert.equal(directory.querySelectorAll('[aria-current="true"]').length, 1, '当前查看仅一项');
  for (const item of directory.querySelectorAll('[data-action="doc-goto"]')) {
    const policy = c.U.documentPolicy(c.U.doc(item.dataset.id), c.App.user);
    assert.equal(item.querySelector('.d-sub').children[1].textContent, policy.isLatest ? '最新版本' : '历史版本', '每个目录项目标记独立核对');
    assert.equal(!!item.querySelector('.doc-current-label'), item.dataset.id === d.id, '当前查看标签绑定实际当前单证');
  }
  assert.match(directory.innerHTML || t.app.innerHTML, /最新版本/); assert.match(t.app.innerHTML, /历史版本/);
  assert.match(t.app.innerHTML, /<details class="snapshot-rules"><summary>查看冻结规则/);
  assert.match(t.app.innerHTML, /样例基线·非历史签发记录/);
  // 待审最新版：主动作位于来源信息之前，真实退回意见输入经委托 leave 防默认 anchor 导航。
  const pending = c.MOCK.documents.find(x => x.status === '待审核'); t.mount(pending, 'boss');
  assert.ok(t.app.innerHTML.indexOf('data-action="doc-approve"') < t.app.innerHTML.indexOf('class="ablock doc-reference"'), '审核主动作前置');
  const opinion = t.document.getElementById('audit-opinion'); opinion.value = '尚未提交的审核意见';
  const originalHash = c.location.hash, model = JSON.stringify(c.MOCK);
  const link = t.document.querySelector('[data-action="doc-leave"]');
  const event = t.click(link);
  assert.ok(event.defaultPrevented, '真实 app click 委托把 event 传入 doc-leave，阻止 anchor 默认导航');
  assert.equal(c.location.hash, originalHash, '有意见时先留在当前单证');
  assert.ok(t.modal.firstElementChild, '实际 U.confirm / U.openModal 已打开');
  t.click(t.modal.querySelector('[data-close]')); await t.flush();
  assert.equal(c.location.hash, originalHash); assert.equal(opinion.value, '尚未提交的审核意见');
  assert.equal(JSON.stringify(c.MOCK), model, '取消离开无模型写入');
  const layout = t.document.querySelector('.doc-layout'), beforeRenders = t.renders;
  t.click(t.document.querySelector('[data-action="doc-focus"]'));
  assert.equal(t.document.getElementById('audit-opinion'), opinion, '专注预览不重建表单节点');
  assert.equal(t.document.querySelector('.doc-layout'), layout); assert.equal(t.renders, beforeRenders);
  assert.equal(opinion.value, '尚未提交的审核意见');
  t.click(link); t.click(t.modal.querySelector('[data-ok]')); await t.flush();
  assert.equal(c.location.hash, '#/documents', '确认离开后才导航'); assert.equal(JSON.stringify(c.MOCK), model);
  // 包装/备注实际修改才拦截；原值和空白归一化不制造假dirty。
  const draft = c.MOCK.documents.find(x => x.status === '制作中'); t.mount(draft, 'doc', true);
  const marks = t.document.getElementById('df-marks'); marks.value += '\n未保存唛头';
  const target = t.document.querySelectorAll('[data-action="doc-goto"]').find(n => n.dataset.id !== draft.id);
  t.click(target); assert.equal(c.location.hash, '#/documents/' + draft.id); assert.ok(t.modal.firstElementChild);
  t.click(t.modal.querySelector('[data-close]')); await t.flush();
  assert.equal(t.document.getElementById('df-marks'), marks); assert.match(marks.value, /未保存唛头/);
  t.click(target); t.click(t.modal.querySelector('[data-ok]')); await t.flush();
  assert.equal(c.location.hash, '#/documents/' + target.dataset.id); assert.equal(c.AppUI.docEditing, null);
  t.mount(draft, 'doc', true); t.document.getElementById('df-marks').value = '  ' + draft.marks + '  ';
  t.click(t.document.querySelector('[data-action="doc-leave"]')); assert.equal(c.location.hash, '#/documents');
  assert.equal(t.modal.firstElementChild, null, '未修改表单普通跳转无确认');
  const packingDoc = c.MOCK.documents.find(x => x.type === 'PL' && x.status === '已退回');
  t.mount(packingDoc, 'doc', true);
  const cartons = t.document.getElementById('df-pk-cartons'); cartons.value = String(packingDoc.packing.cartons + 1);
  const packingRoute = c.location.hash;
  assert.ok(t.click(t.document.querySelector('[data-action="doc-leave"]')).defaultPrevented);
  assert.equal(c.location.hash, packingRoute, '包装件数实际修改也触发离开确认');
  t.click(t.modal.querySelector('[data-close]')); await t.flush();
  assert.equal(t.document.getElementById('df-pk-cartons'), cartons); assert.equal(cartons.value, String(packingDoc.packing.cartons + 1));
  cartons.value = String(packingDoc.packing.cartons);
  t.click(t.document.querySelector('[data-action="doc-leave"]')); assert.equal(c.location.hash, '#/documents', '恢复原包装值后可正常导航');
  for (const role of ['sales', 'fin']) {
    t.mount(pending, role);
    const back = t.document.querySelector('[data-action="doc-leave"]');
    assert.equal(back.dataset.destination, '#/orders/' + pending.orderId, '无台账权限岗位返回可访问订单');
    assert.ok(t.document.querySelector('.doc-source-hint').textContent.includes('非历史签发记录'), '审批/阅读前短来源保持可见');
  }
  const priorHistory = pending.history;
  pending.history = [{ time: '2026-10-07 10:00', person: '测试', action: 'FIRST SAME MINUTE', opinion: '' },
    { time: '2026-10-07 10:00', person: '测试', action: 'SECOND SAME MINUTE', opinion: '' }];
  t.mount(pending, 'boss');
  const historyHtml = t.app.innerHTML;
  assert.ok(historyHtml.indexOf('SECOND SAME MINUTE') < historyHtml.indexOf('FIRST SAME MINUTE'), '同分钟以追加顺序的新动作在前，不虚构更精确时间');
  assert.equal(pending.history[0].action, 'FIRST SAME MINUTE', '显示排序不改写原留痕数组');
  pending.history = priorHistory;
  console.log('PASS: document workspace local version directory/current/latest/history, action precedence, source disclosure, real app delegated anchor preventDefault, dirty audit/packing cancel-confirm navigation, focus node/input preservation (Node DOM fixture only)');
}
module.exports = { fixture };
if (require.main === module) run().catch(error => { console.error(error); process.exitCode = 1; });
