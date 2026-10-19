'use strict';
/* 真实工作台/共享工具与原业务动作，最小 DOM；非实际浏览器布局或键盘认证。 */
const assert = require('node:assert/strict');
const path = require('node:path');
const { archiveEnabled, historySource, reportFailure, reportArchive } = require('./history-gate.cjs');
const { fixture } = require('./verify-document-workspace.cjs');
const root = path.resolve(__dirname, '..');
const baseline = '77deae8ae937c0c1d005d4b3b019d5d150e623b8';
const baselineSource = name => historySource(baseline, name);
const publishedSource = name => historySource('f8643db82e4daf0f41904a37ab34cdc071393365', name);
function setup(sources = {}) { return fixture(['views-sales', 'views-docs', 'views-fin'], sources); }
const data = t => JSON.stringify(t.c.MOCK);
const nodeText = node => (node.textContent || '') + node.children.map(nodeText).join('');
function render(t, user = t.c.U.roleUser('doc')) { t.c.App.user = user; return t.c.Views.dashboard({ user }); }
async function cancelSO5(t) {
  t.c.App.user = t.c.U.roleUser('sales');
  t.c.Actions['order-apply-change']({ dataset: { id: 'SO2026005' } });
  const overlay = t.modal.firstElementChild, type = overlay.querySelector('#oc-type');
  type.value = '取消申请'; for (const fn of type.listeners.change || []) fn({ target: type });
  overlay.querySelector('#oc-reason').value = '本测试通过真实申请暂停订单，保原单证记录';
  t.click(overlay.querySelector('[data-ok]')); await t.flush();
  assert.equal(t.c.U.order('SO2026005').status, '取消申请中');
  return t.c.MOCK.approvals.find(a => a.type === '取消申请' && a.targetId === 'SO2026005' && a.status === '待处理');
}
async function probeOriginal() {
  const t = setup({ utils: baselineSource('utils'), 'views-core': baselineSource('views-core') });
  let failures = 0;
  for (const stage of ['original-demo', 'real-cancellation-request']) {
    if (stage !== 'original-demo') await cancelSO5(t);
    const user = t.c.U.roleUser('doc'), before = data(t), html = render(t, user), todos = t.c.U.todosFor('doc', user.name);
    const editable = todos.filter(todo => t.c.U.documentPolicy(t.c.U.doc(todo.link.slice('#/documents/'.length)), user).canEdit);
    assert.equal(data(t), before, '基线工作台/原待办查询纯读');
    const shown = (html.match(/class="todo-item"/g) || []).length;
    if (shown !== editable.length) { failures++; console.log(`RED ${stage}: dashboard go-process=${shown}, shared todos=${todos.length}, original policy editable=${editable.length}`); }
  }
  assert.equal(failures, 0, '原工作台主链把不可办理版本当去处理');
}
async function run() {
  const t = setup();
  assert.equal(typeof t.c.U.documentWorkSummary, 'function', '共享API尚未就绪，不能以模拟API冒作实际集成通过');
  let cases = 0;
  function checkDoc(f, expectedTodos, expectedReferences, user = f.c.U.roleUser('doc')) {
    const before = data(f), summary = f.c.U.documentWorkSummary(user), html = render(f, user);
    assert.equal(data(f), before, '摘要与首页渲染完整 MOCK 纯读');
    assert.deepEqual(Array.from(summary.todos, x => x.documentId), expectedTodos);
    assert.deepEqual(Array.from(summary.references, x => x.documentId), expectedReferences);
    assert.equal(JSON.stringify(f.c.U.todosFor('doc', user.name, user)), JSON.stringify(summary.todos), '实际显式身份todos与首页摘要同源');
    f.app.innerHTML = html;
    const metrics = f.app.querySelector('.dashboard-metrics').querySelectorAll('.stat-card');
    const counts = [expectedTodos.length, f.c.MOCK.documents.filter(d => d.status === '制作中' || d.status === '草稿').length, f.c.MOCK.documents.filter(d => d.status === '已退回').length, f.c.MOCK.documents.filter(d => d.status === '已通过').length];
    assert.deepEqual(metrics.map(card => nodeText(card.querySelector('.sc-value'))), counts.map(String), '当前待办与全部版本状态统计口径各自正确');
    const queue = f.app.querySelector('.doc-work-summary'); assert.ok(queue, '真实doc首页采用当前可办理区域');
    const rows = queue.querySelectorAll('.todo-item'); assert.equal(rows.length, expectedTodos.length);
    function checkActionName(anchor, action, item) {
      assert.equal(nodeText(anchor), action, '可见动作文案保持原词');
      const name = anchor.getAttribute('aria-label');
      assert.equal(name, action + ' · ' + item.text, '实际ARIA名称同时具动作及精确对象');
      const doc = f.c.MOCK.documents.find(d => d.id === item.documentId);
      assert.ok(name.includes(doc.type === 'CI' ? '商业发票' : doc.type === 'PL' ? '装箱单' : '单证类型待核对'));
      if (typeof doc.no === 'string' && doc.no.trim()) assert.ok(name.includes(doc.no), '名称含实际单证号');
      if (Number.isSafeInteger(doc.version) && doc.version > 0) assert.ok(name.includes('V' + doc.version), '名称含具体版本');
      if (doc.orderId) assert.ok(name.includes(doc.orderId), '名称含关联订单');
      assert.equal(anchor.getAttribute('onerror'), null); assert.equal(anchor.getAttribute('onfocus'), null); assert.equal(anchor.getAttribute('onmouseover'), null);
    }
    for (const [index, row] of rows.entries()) {
      for (const a of row.querySelectorAll('a')) { const id = a.getAttribute('href').slice('#/documents/'.length); assert.ok(expectedTodos.includes(id)); assert.equal(f.c.U.documentPolicy(f.c.U.doc(id), user).canEdit, true); }
      checkActionName(row.querySelector('.btn'), '去处理', summary.todos[index]);
    }
    const refs = f.app.querySelector('.doc-work-references'); assert.ok(refs, '真实doc首页保历史/暂停参考区域');
    assert.equal(refs.querySelectorAll('.doc-work-reference').length, expectedReferences.length);
    for (const [index, row] of refs.querySelectorAll('.doc-work-reference').entries()) {
      const reference = summary.references[index];
      checkActionName(row.querySelector('a'), reference.link ? '查看记录' : '核对单证台账', reference);
    }
    assert.equal(refs.querySelectorAll('.btn').length, summary.references.filter(x => x.link).length, '参考仅合法查看记录入口');
    assert.ok(!/去处理|继续制单/.test(nodeText(refs)), '参考不宣称当前可办');
    for (const r of summary.references) { assert.ok(html.includes(f.c.U.esc(r.reason)), '原阻断原因完整转义'); if (r.link) assert.ok(html.includes('href="' + f.c.U.esc(r.link) + '"')); }
    assert.ok(!/href="(?:null|undefined|javascript:)/.test(html));
    assert.ok(!html.includes('>可导出<')); assert.match(html, /版本记录/); assert.match(html, /含历史/);
    if (summary.identityError) assert.ok(nodeText(queue).includes(summary.identityError), '身份错误显示真实摘要原因，不补另一actor');
    else if (!expectedTodos.length) { assert.match(nodeText(queue), /当前没有可办理制单事项/); assert.match(nodeText(queue), /历史|暂停|核对/); }
    cases++; return { html, summary, queue, refs };
  }
  checkDoc(t, ['D-CI2026004-V1'], ['D-CI2026003-V1', 'D-PL2026004-V1']);
  const actualActor = setup(), actor = actualActor.c.U.roleUser('doc'), otherActor = actualActor.c.U.roleUser('sales'), summaryCalls = [];
  const summarize = actualActor.c.U.documentWorkSummary; actualActor.c.U.documentWorkSummary = user => { summaryCalls.push(user); return summarize(user); };
  actualActor.c.App.user = otherActor; const beforeActorRead = data(actualActor);
  const actorHtml = actualActor.c.Views.dashboard({ user: actor });
  assert.deepEqual(summaryCalls, [actor], '真实摘要仅收到ctx.user，不用App.user或roleUser猜');
  assert.equal(actualActor.c.App.user, otherActor); assert.equal(data(actualActor), beforeActorRead); assert.match(actorHtml, /doc-work-summary/); cases++;
  const cancellation = await cancelSO5(t);
  checkDoc(t, [], ['D-CI2026003-V1', 'D-CI2026004-V1', 'D-PL2026004-V1']);
  t.c.App.user = t.c.U.roleUser('boss'); t.c.Actions['ap-handle']({ dataset: { id: cancellation.id } });
  t.modal.querySelector('#ap-opinion').value = '客户撤回取消，按原状态继续执行';
  t.click(t.modal.querySelector('[data-act="reject"]')); await t.flush();
  assert.equal(t.c.U.order('SO2026005').status, '执行中');
  checkDoc(t, ['D-CI2026004-V1'], ['D-CI2026003-V1', 'D-PL2026004-V1']);
  const cancelled = setup(), request = await cancelSO5(cancelled);
  cancelled.c.App.user = cancelled.c.U.roleUser('boss'); cancelled.c.Actions['ap-handle']({ dataset: { id: request.id } });
  cancelled.click(cancelled.modal.querySelector('[data-act="approve"]')); await cancelled.flush();
  assert.equal(cancelled.c.U.order('SO2026005').status, '已取消');
  checkDoc(cancelled, [], ['D-CI2026003-V1', 'D-CI2026004-V1', 'D-PL2026004-V1']);
  const revision = setup(), source = revision.c.U.doc('D-CI2026003-V2'), originalRecord = JSON.stringify(source);
  revision.c.App.user = revision.c.U.roleUser('doc'); revision.c.location.hash = '#/documents/' + source.id;
  revision.c.Actions['doc-revise']({ dataset: { id: source.id } }); revision.click(revision.modal.querySelector('[data-ok]')); await revision.flush();
  assert.equal(JSON.stringify(source), originalRecord, '真实受控修订保旧通过版本');
  checkDoc(revision, ['D-CI2026004-V1', 'D-CI2026003-V3'], ['D-CI2026003-V1', 'D-PL2026004-V1']);
  for (const user of [{ role: 'doc', name: '', id: 'U004' }, { role: 'doc', name: '王芳', id: '' }]) checkDoc(setup(), [], [], user);
  const htmlText = setup();
  htmlText.c.MOCK.documents.filter(d => d.no === 'CI2026003').forEach(d => { d.no = '<b>历史号"&</b>" onfocus="injected()'; });
  htmlText.c.U.doc('D-CI2026004-V1').no = '<img src=x onerror=1>" onmouseover="injected()';
  const escaped = checkDoc(htmlText, ['D-CI2026004-V1'], ['D-CI2026003-V1', 'D-PL2026004-V1']).html;
  assert.ok(escaped.includes('&lt;img src=x onerror=1&gt;')); assert.ok(escaped.includes('&lt;b&gt;历史号&quot;&amp;&lt;/b&gt;')); assert.ok(!escaped.includes('<img src=x onerror=1>'));
  for (const mutation of ['missing-order', 'duplicate-document', 'unroutable-id', 'lone-surrogate']) {
    const abnormal = setup(), doc = abnormal.c.U.doc('D-CI2026004-V1');
    if (mutation === 'missing-order') doc.orderId = 'MISSING-ORDER';
    if (mutation === 'duplicate-document') abnormal.c.MOCK.documents.push(JSON.parse(JSON.stringify(doc)));
    if (mutation === 'unroutable-id') doc.id = 'CI 4 <x>';
    if (mutation === 'lone-surrogate') doc.id = 'CI\ud800';
    const summary = abnormal.c.U.documentWorkSummary(abnormal.c.U.roleUser('doc'));
    const view = checkDoc(abnormal, Array.from(summary.todos, x => x.documentId), Array.from(summary.references, x => x.documentId));
    assert.ok(summary.references.some(r => r.documentId === doc.id && r.link === null));
    assert.match(nodeText(view.refs), /核对单证台账/); assert.ok(!view.html.includes('href="#/documents/' + abnormal.c.U.esc(doc.id) + '"'));
  }
  const unknown = setup(), unsupported = JSON.parse(JSON.stringify(unknown.c.U.doc('D-CI2026004-V1')));
  unsupported.id = 'UNKNOWN-STATUS'; unsupported.type = 'ZZ'; unsupported.status = '未知状态'; unknown.c.MOCK.documents.push(unsupported);
  checkDoc(unknown, ['D-CI2026004-V1'], ['D-CI2026003-V1', 'D-PL2026004-V1']);
  for (const role of ['sales', 'fin', 'boss', 'admin']) {
    const current = setup();
    const before = data(current), user = current.c.U.roleUser(role), currentHtml = render(current, user);
    if (archiveEnabled()) {
    const original = setup({ utils: baselineSource('utils'), 'views-core': baselineSource('views-core') });
    const published = setup({ 'mock-data': publishedSource('mock-data'), utils: publishedSource('utils'), 'views-core': publishedSource('views-core') });
    const originalHtml = render(original, original.c.U.roleUser(role)), publishedHtml = render(published, published.c.U.roleUser(role));
    // 原H23“四岗整页不改”只证明已发布f8643db；当前待办前置/新增收款等用户需求不做广义归一。
    let comparableHtml = publishedHtml;
    if (role === 'fin') {
      const oldLabel = '<span class="sc-label">本月登记收款</span>', newLabel = '<span class="sc-label">演示月登记收款</span>';
      assert.equal(publishedHtml.split(newLabel).length - 1, 1, '财务已发布标签只出现一次');
      assert.equal(originalHtml.split(oldLabel).length - 1, 1, '历史基线仍核旧标签');
      assert.ok(!publishedHtml.includes(oldLabel), '已发布页面不将演示月称为本月');
      assert.ok(publishedHtml.includes('2026-09 收款笔数'), '已发布版本保留固定月份脚注');
      comparableHtml = publishedHtml.replace(newLabel, oldLabel);
    }
    assert.equal(comparableHtml, originalHtml, `${role}:归档证明f8643db除明确批准财务标签外整页HTML完全相同`);
    }
    // 保当前四岗位的事实、精确指标、具名入口及非制单边界，不将当前测试退回归档。
    current.app.innerHTML = currentHtml;
    assert.equal(current.app.querySelector('.doc-work-summary'), null, role + '不能冒用单证员当前作业队列');
    const metricCards = current.app.querySelector('.dashboard-metrics').querySelectorAll('.stat-card');
    assert.equal(metricCards.length, 4); assert.ok(currentHtml.includes(current.c.U.esc(user.name)));
    const pending = current.c.MOCK.approvals.filter(a => a.status === '待处理');
    const recent = current.c.MOCK.orders.slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 4);
    const salesQuoteCount = current.c.MOCK.quotes.filter(q => q.status === '待客户确认' && q.salesperson === user.name).length;
    const salesInquiryCount = current.c.MOCK.inquiries.filter(i => i.status === '跟进中' && i.salesperson === user.name && !i.quoteId).length;
    const expected = role === 'sales' ? [salesQuoteCount + salesInquiryCount, salesQuoteCount, current.c.MOCK.orders.filter(o => o.salesperson === user.name && o.status === '执行中').length, recent.length]
      : role === 'fin' ? [current.c.MOCK.orders.filter(o => current.c.U.payStatus(o) !== '已结清' && o.status !== '已取消').length, current.c.U.sessionPaymentCount(), current.c.MOCK.orders.filter(o => current.c.U.payStatus(o) === '已结清').length, recent.length]
      : role === 'boss' ? [pending.length, current.c.MOCK.documents.filter(d => d.status === '待审核').length, current.c.MOCK.orders.filter(o => current.c.U.payStatus(o) !== '已结清' && o.status !== '已取消').length, current.c.MOCK.orders.filter(o => o.status === '执行中').length]
      : [current.c.MOCK.users.length, Object.keys(current.c.MOCK.roles).length, current.c.MOCK.dicts.length, '正常'];
    assert.deepEqual(metricCards.map(card => nodeText(card.querySelector('.sc-value'))), Array.from(expected, String), role + '当前指标逐项核对');
    for (const a of current.app.querySelector('.shortcut-list').querySelectorAll('a')) {
      const href = a.getAttribute('href'); assert.ok(current.c.U.moduleEnabled(role, current.c.U.moduleForPath(href, role)), role + '入口遵循当前权限');
    }
    if (role === 'sales') { assert.ok(!currentHtml.includes('href="#/inquiries/INQ2026005"')); assert.ok(currentHtml.includes('href="#/inquiries/INQ2026006"')); }
    if (role === 'fin') { assert.match(currentHtml, /本次演示新增收款/); assert.ok(!currentHtml.includes('2026-09 收款笔数')); }
    if (role === 'admin') { assert.match(currentHtml, /管理员只维护系统配置，不参与业务审批/); assert.equal(current.app.querySelector('[data-action="doc-approve"]'), null); }
    assert.equal(data(current), before); cases++;
  }
  console.log(`PASS CURRENT: ${cases} document dashboard scenarios; current shared API, pending-reform/currently editable distinction, cancellation reference, current four-role metrics/entry boundaries (Node fixture only)`);
  reportArchive('verify-document-dashboard.cjs');
}
(process.argv.includes('--probe-original') ? probeOriginal() : run()).catch(reportFailure);
