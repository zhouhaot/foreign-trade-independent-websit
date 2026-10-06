/* ============================================================
 * views-core.js — 登录页 / 工作台 / 客户与商品
 * 视图约定：Views.xxx(ctx) 返回 HTML 字符串；交互通过 data-action 委托。
 * ============================================================ */
(function () {
  'use strict';
  var M = window.MOCK, U = window.U;
  window.Views = window.Views || {};
  window.Actions = window.Actions || {};
  window.AppUI = window.AppUI || {}; // 各页面筛选/分页等临时状态
  var esc = U.esc, tag = U.tag;

  function ui(key) {
    if (!window.AppUI[key]) window.AppUI[key] = { page: 1, filters: {} };
    return window.AppUI[key];
  }
  window.__ui = ui;

  /* ==================== 登录页 ==================== */
  Views.login = function () {
    var roles = Object.keys(M.roles);
    var picked = window.AppUI.loginRole || 'sales';
    if (roles.indexOf(picked) < 0) picked = 'sales';
    var options = roles.map(function (r) {
      var user = U.roleUser(r);
      var identity = M.roles[r] + (user.name === M.roles[r] ? '' : ' · ' + user.name);
      return '<option value="' + esc(r) + '"' + (r === picked ? ' selected' : '') + '>' + esc(identity) + '</option>';
    }).join('');
    var selectedUser = U.roleUser(picked);
    return '<div class="login-page">' +
      '<section class="login-story" aria-label="业务协同流程">' +
        '<div class="login-brand"><span class="login-brand-mark">' + U.icon('briefcase') + '</span><span>贸易协同</span></div>' +
        '<div class="login-story-content"><h2 class="login-story-title">从客户需求，<br>到每一笔交付。</h2>' +
        '<p class="login-story-description">让报价、订单、单证与收款在同一个工作空间有序协同。</p>' +
        '<div class="login-flow"><div class="login-flow-main">' +
          '<div class="login-flow-step">' + U.icon('users') + '<span>客户询盘</span></div><span class="login-flow-connector" aria-hidden="true">' + U.icon('arrow') + '</span>' +
          '<div class="login-flow-step">' + U.icon('check') + '<span>报价确认</span></div><span class="login-flow-connector" aria-hidden="true">' + U.icon('arrow') + '</span>' +
          '<div class="login-flow-step is-order">' + U.icon('briefcase') + '<span>生成订单</span></div></div>' +
          '<div class="login-flow-branches"><div>' + U.icon('file') + '<span>单证制作与审核</span></div><span class="login-flow-parallel">并行推进</span><div>' + U.icon('wallet') + '<span>收款登记与跟踪</span></div></div>' +
        '</div></div>' +
        '<div class="login-story-foot"><span class="login-local-dot" aria-hidden="true"></span>本地演示 · 数据刷新后还原</div>' +
      '</section><section class="login-panel" aria-label="登录演示工作台"><div class="login-box">' +
      '<h1>欢迎回来</h1>' +
      '<div class="sub-title">外贸订单与单证管理系统</div>' +
      '<div class="form-item"><label for="login-account">账号</label><input class="input" id="login-account" value="demo" autocomplete="username"><div class="field-error"></div></div>' +
      '<div class="form-item"><label for="login-password">密码</label><input class="input" id="login-password" type="password" value="demo123" autocomplete="current-password"><div class="field-error"></div></div>' +
      '<div class="login-role-quick"><label class="lr-title" for="login-role">演示角色</label>' +
      '<div class="login-role-control"><select class="select login-role-select" id="login-role" data-action="login-pick-role" aria-describedby="login-role-hint">' + options + '</select>' +
      '<span class="login-role-chevron" aria-hidden="true">' + U.icon('chevron') + '</span></div>' +
      '<div class="login-role-hint" id="login-role-hint" aria-live="polite">演示部门：' + esc(selectedUser.dept) + '</div></div>' +
      '<button type="button" class="btn btn-primary login-btn" data-action="login-submit">进入工作台' + U.icon('arrow') + '</button>' +
      '<div class="login-tip">' + U.icon('shield') + '<span>这是原型演示环境，不校验真实账号密码。选择角色后即可体验对应工作台。</span></div>' +
      '</div></section></div>';
  };
  Actions['login-pick-role'] = function (el, event) {
    if (el.disabled || (event && event.type === 'click')) return;
    var picked = el.value;
    if (!Object.prototype.hasOwnProperty.call(M.roles, picked)) return;
    window.AppUI.loginRole = picked;
    var user = U.roleUser(picked);
    document.getElementById('login-role-hint').textContent = '演示部门：' + user.dept;
  };
  Actions['login-submit'] = function (el) {
    if (el.classList.contains('is-loading')) return;
    var scope = document.querySelector('.login-box');
    U.clearErrors(scope);
    var acc = document.getElementById('login-account');
    var pwd = document.getElementById('login-password');
    if (!U.validate([
      { el: acc, label: '账号', required: true },
      { el: pwd, label: '密码', required: true }
    ])) return;
    var picker = document.getElementById('login-role');
    var role = picker.value;
    if (!Object.prototype.hasOwnProperty.call(M.roles, role)) {
      U.toast('请选择有效的演示角色', 'error');
      picker.focus();
      return;
    }
    window.AppUI.loginRole = role;
    var user = U.roleUser(role);
    picker.disabled = true;
    U.withLoading(el, function () {
      U.setUser({ id: user.id, name: user.name, role: user.role, roleName: M.roles[user.role], dept: user.dept });
    }, 500);
    setTimeout(function () {
      U.toast('登录成功，当前角色：' + M.roles[role] + '（' + user.name + '）');
      location.hash = '#/dashboard';
    }, 520);
  };

  /* ==================== 工作台 ==================== */
  Views.dashboard = function (ctx) {
    var role = ctx.user.role, name = ctx.user.name;

    /* 概览卡片：随角色变化 */
    var cards = [];
    var pendingApprovals = M.approvals.filter(function (a) { return a.status === '待处理'; });
    var reviewingDocs = M.documents.filter(function (d) { return d.status === '待审核'; });
    var unpaidOrders = M.orders.filter(function (o) { return U.payStatus(o) !== '已结清' && o.status !== '已取消'; });
    var recentOrders = M.orders.slice().sort(function (a, b) { return b.createdAt.localeCompare(a.createdAt); }).slice(0, 4);
    var myTodos = U.todosFor(role, name);

    if (role === 'boss') {
      cards.push(statCard('我的待办', pendingApprovals.length, '待处理审核与异常申请', '#/approvals', 'accent-orange'));
      cards.push(statCard('待审核单证', reviewingDocs.length, '等待审核的单证版本', '#/documents', 'accent-blue'));
      cards.push(statCard('待收款订单', unpaidOrders.length, '存在未收金额的订单', '#/orders', 'accent-red'));
      cards.push(statCard('在执行订单', M.orders.filter(function (o) { return o.status === '执行中'; }).length, '当前执行中订单', '#/orders', 'accent-green'));
    } else if (role === 'doc') {
      cards.push(statCard('我的待办', myTodos.length, '待完成 / 待修订单证', '#/documents', 'accent-orange'));
      cards.push(statCard('制作中单证', M.documents.filter(function (d) { return d.status === '制作中' || d.status === '草稿'; }).length, '尚未送审', '#/documents', 'accent-blue'));
      cards.push(statCard('被退回单证', M.documents.filter(function (d) { return d.status === '已退回'; }).length, '需按意见修订', '#/documents', 'accent-red'));
      cards.push(statCard('已通过单证', M.documents.filter(function (d) { return d.status === '已通过'; }).length, '可导出', '#/documents', 'accent-green'));
    } else if (role === 'fin') {
      cards.push(statCard('待收款订单', unpaidOrders.length, '存在未收金额', '#/payments', 'accent-red'));
      cards.push(statCard('本月登记收款', M.payments.filter(function (p) { return p.date.slice(0, 7) === '2026-09'; }).length, '2026-09 收款笔数', '#/payments', 'accent-blue'));
      cards.push(statCard('已结清订单', M.orders.filter(function (o) { return U.payStatus(o) === '已结清'; }).length, '全部收讫', '#/payments', 'accent-green'));
      cards.push(statCard('近期新增订单', recentOrders.length, '近 4 笔新订单', '#/orders', 'accent-orange'));
    } else if (role === 'sales') {
      cards.push(statCard('我的待办', myTodos.length, '报价确认 / 询盘跟进', '#/quotes', 'accent-orange'));
      cards.push(statCard('待确认报价', M.quotes.filter(function (q) { return q.status === '待客户确认' && q.salesperson === name; }).length, '等待客户确认', '#/quotes', 'accent-blue'));
      cards.push(statCard('我的在执行订单', M.orders.filter(function (o) { return o.salesperson === name && o.status === '执行中'; }).length, '执行中订单', '#/orders', 'accent-green'));
      cards.push(statCard('近期新增订单', recentOrders.length, '近 4 笔新订单', '#/orders', 'accent-red'));
    } else {
      cards.push(statCard('系统用户', M.users.length, '启用 ' + M.users.filter(function (u) { return u.enabled; }).length + ' 人', '#/system/users', 'accent-blue'));
      cards.push(statCard('系统角色', Object.keys(M.roles).length, '五类业务角色', '#/system/roles', 'accent-green'));
      cards.push(statCard('字典项', M.dicts.length, '基础数据字典', '#/system/dicts', 'accent-orange'));
      cards.push(statCard('运行状态', '正常', '演示环境', '#/dashboard', 'accent-green'));
    }

    /* 待办列表 */
    var todoHtml = myTodos.length ? myTodos.map(function (t) {
      return '<div class="todo-item">' + tag(t.kind) +
        '<div class="t-title"><a href="' + t.link + '">' + esc(t.text) + '</a><div class="t-sub">' + esc(t.sub) + '</div></div>' +
        '<a class="btn btn-sm" href="' + t.link + '">去处理</a></div>';
    }).join('') : '<div class="empty-state home-empty"><div class="icon">' + U.icon('check') + '</div><strong>当前没有待办事项</strong><p>可通过右侧业务入口继续查看相关记录。</p></div>';

    /* 最近业务动态：聚合订单日志 */
    var acts = [];
    Object.keys(M.orderLogs).forEach(function (oid) {
      M.orderLogs[oid].forEach(function (l) { acts.push({ orderId: oid, time: l.time, person: l.person, content: l.content }); });
    });
    acts.sort(function (a, b) { return b.time.localeCompare(a.time); });
    var actHtml = acts.slice(0, 4).map(function (a) {
      return '<div class="activity-item"><span class="a-dot" aria-hidden="true"></span>' +
        '<div class="a-body"><a href="#/orders/' + a.orderId + '">' + esc(a.orderId) + '</a><div class="a-content">' + esc(a.content) + '</div>' +
        '<div class="a-time">' + esc(a.person) + ' · ' + esc(a.time) + '</div></div></div>';
    }).join('');

    /* 窄栏图表：样例订单创建月份，保留年份以区分跨年数据。 */
    var monthMap = {};
    M.orders.forEach(function (o) { var m = o.createdAt.slice(0, 7); monthMap[m] = (monthMap[m] || 0) + 1; });
    var months = Object.keys(monthMap).sort();
    var monthMax = Math.max.apply(null, months.map(function (m) { return monthMap[m]; }).concat([1]));
    var monthChart = '<ul class="month-chart" aria-label="样例月度新增订单">' + months.map(function (m) {
      return '<li><span>' + esc(m) + '</span><span class="month-track" aria-hidden="true"><span style="width:' + (monthMap[m] / monthMax * 100) + '%"></span></span><b>' + monthMap[m] + '</b></li>';
    }).join('') + '</ul>';

    var shortcuts = {
      admin: [['用户管理', '#/system/users', 'users'], ['角色权限', '#/system/roles', 'shield'], ['基础字典', '#/system/dicts', 'settings']],
      sales: [['询盘跟进', '#/inquiries', 'briefcase'], ['报价管理', '#/quotes', 'file'], ['订单查询', '#/orders', 'file']],
      doc: [['单证制作', '#/documents', 'edit'], ['订单查询', '#/orders', 'file']],
      fin: [['收款与应收', '#/payments', 'wallet'], ['订单查询', '#/orders', 'file']],
      boss: [['审核与异常', '#/approvals', 'shield'], ['订单查询', '#/orders', 'file'], ['统计分析', '#/stats', 'chart']]
    }[role];
    var shortcutHtml = shortcuts.map(function (s) {
      return '<a class="shortcut-link" href="' + s[1] + '">' + U.icon(s[2]) + '<span>' + s[0] + '</span>' + U.icon('arrow') + '</a>';
    }).join('');

    var orderRows = recentOrders.map(function (o) {
      var fin = U.orderFin(o);
      return '<tr><td><a href="#/orders/' + o.id + '"><b>' + o.id + '</b></a><div class="cell-secondary">' + esc(o.createdAt) + '</div></td>' +
        '<td>' + esc(U.customerName(o.customerId).split('（')[0]) + '</td>' +
        '<td class="num">' + U.fmt(fin.total) + ' ' + esc(o.currency) + '</td>' +
        '<td>' + tag(o.status) + '</td><td>' + tag(o.docStatus) + '</td><td>' + tag(U.payStatus(o)) + '</td></tr>';
    }).join('');
    var userRows = M.users.map(function (u) {
      return '<tr><td>' + esc(u.name) + '</td><td>' + esc(M.roles[u.role]) + '</td><td>' + esc(u.dept) + '</td><td>' + tag(u.enabled ? '启用' : '禁用') + '</td></tr>';
    }).join('');
    var roleDescription = {
      admin: '维护账号、角色与基础配置，让每位协作成员各司其职。',
      sales: '从询盘到成交，把握客户跟进与订单执行的每一步。',
      doc: '专注单证制作与修订，让每一份交付清晰、准确。',
      fin: '跟踪应收与每笔到账，按币种核对订单收款进度。',
      boss: '聚焦审核与异常，统览订单、单证和收款的独立进展。'
    };
    return '<div class="page-head dashboard-head home-hero"><div><h2>' + esc(name) + '，欢迎回来</h2><p class="page-description">' + roleDescription[role] + '</p>' +
      '<div class="home-identity">' + esc(M.roles[role]) + '<span aria-hidden="true">·</span>' + esc(ctx.user.dept) + '</div></div>' +
      '<a class="btn btn-primary" href="' + shortcuts[0][1] + '">' + shortcuts[0][0] + U.icon('arrow') + '</a></div>' +
      '<div class="dashboard-metrics" aria-label="当前业务概览">' + cards.join('') + '</div>' +
      '<div class="dash-grid">' +
        '<div class="dash-main">' +
          (role !== 'admin' ? '<section class="card recent-orders"><div class="card-title home-card-head"><div><h3>近期订单</h3><p>四笔最新订单，三类进度独立跟踪</p></div><a class="home-text-link" href="#/orders">全部订单' + U.icon('arrow') + '</a></div><div class="table-wrap"><table class="table"><thead><tr><th>订单 / 创建日期</th><th>客户</th><th class="num">成交金额</th><th>订单进度</th><th>单证进度</th><th>收款进度</th></tr></thead><tbody>' + orderRows + '</tbody></table></div></section>' :
            '<section class="card recent-orders"><div class="card-title home-card-head"><div><h3>演示账号</h3><p>按角色检查权限与页面呈现</p></div><a class="home-text-link" href="#/system/users">用户管理' + U.icon('arrow') + '</a></div><div class="table-wrap"><table class="table"><thead><tr><th>姓名</th><th>角色</th><th>部门</th><th>状态</th></tr></thead><tbody>' + userRows + '</tbody></table></div></section>') +
          '<section class="card work-queue"><div class="card-title home-card-head"><div><h3>待处理事项<span class="record-count">' + myTodos.length + ' 项</span></h3><p>从这里接续你的业务工作</p></div></div>' + todoHtml + '</section>' +
        '</div>' +
        '<aside class="dash-side"><section class="card home-shortcuts"><div class="card-title"><h3>业务入口</h3></div><div class="shortcut-list">' + shortcutHtml + '</div></section>' +
          '<section class="card home-monthly"><div class="card-title"><h3>月度订单</h3><span class="sub">样例 · 笔</span></div>' + monthChart + '</section>' +
          (role !== 'admin' ? '<section class="card activity-ledger"><div class="card-title"><h3>最近动态</h3><span class="sub">订单留痕</span></div>' + actHtml + '</section>' : '') +
          '<div class="dashboard-note">' + U.icon('shield') + '<span>' + (role === 'admin' ? '管理员只维护系统配置，不参与业务审批。' : '订单成立后，单证与收款并行推进；在订单详情分别查看三类状态。') + '</span></div></aside>' +
      '</div>';
  };
  function statCard(label, value, foot, link, accent) {
    var icon = /单证/.test(label) ? 'file' : /收款|结清/.test(label) ? 'wallet' : /订单/.test(label) ? 'briefcase' : /用户/.test(label) ? 'users' : /角色/.test(label) ? 'shield' : /字典/.test(label) ? 'settings' : 'check';
    return '<a class="stat-card ' + accent + '" href="' + link + '">' +
      '<span class="metric-top"><span class="sc-label">' + esc(label) + '</span><span class="metric-icon">' + U.icon(icon) + '</span></span>' +
      '<span class="sc-value">' + value + '</span>' +
      '<span class="sc-footer"><span class="sc-foot">' + esc(foot) + '</span>' + U.icon('arrow') + '</span></a>';
  }

  /* ==================== 客户列表 ==================== */
  Views.customers = function () {
    var s = ui('customers'), f = s.filters;
    var list = M.customers.filter(function (c) {
      if (f.kw && (c.nameCn + c.nameEn + c.contact).toLowerCase().indexOf(f.kw.toLowerCase()) < 0) return false;
      if (f.country && c.country !== f.country) return false;
      return true;
    });
    var pg = U.page(list, s.page);
    var countries = M.customers.map(function (c) { return c.country; }).filter(function (v, i, a) { return a.indexOf(v) === i; });
    var rows = pg.rows.map(function (c) {
      return '<tr><td><a href="#/customers/' + c.id + '">' + esc(c.id) + '</a></td>' +
        '<td><a href="#/customers/' + c.id + '">' + esc(c.nameCn) + '</a><div class="muted small">' + esc(c.nameEn) + '</div></td>' +
        '<td>' + esc(c.country) + '</td><td>' + esc(c.contact) + '</td>' +
        '<td class="center">' + tag(c.level, c.level === 'A' ? 'green' : c.level === 'B' ? 'blue' : 'gray') + ' ' + esc(c.level) + '级</td>' +
        '<td>' + esc(c.since) + '</td>' +
        '<td><a class="btn btn-sm" href="#/customers/' + c.id + '">查看</a></td></tr>';
    }).join('');
    if (!rows) rows = U.emptyRow(7, f.kw || f.country ? '没有符合筛选条件的结果' : '暂无客户记录');
    return '<div class="page-head"><h2>客户管理</h2><div class="actions">' +
      (window.App.user.role === 'sales' ? '<button class="btn btn-primary" data-action="cust-new">新建客户</button>' : '') +
      '</div></div>' +
      '<div class="filter-bar">' +
      filterInput('客户名称/联系人', 'f-kw', f.kw, '输入关键字') +
      '<div class="form-item"><label>国家</label><select class="select" id="f-country"><option value="">全部</option>' +
      countries.map(function (c) { return '<option ' + (f.country === c ? 'selected' : '') + '>' + esc(c) + '</option>'; }).join('') + '</select></div>' +
      '<div class="filter-actions"><button class="btn btn-primary" data-action="cust-filter">查 询</button><button class="btn" data-action="cust-reset">重 置</button></div></div>' +
      '<div class="table-toolbar"><h3>客户档案<span class="record-count">' + list.length + ' 家</span></h3><span class="muted small">按客户查看关联订单</span></div>' +
      '<div class="table-wrap"><table class="table"><thead><tr>' +
      '<th>客户编号</th><th>客户名称</th><th>国家</th><th>联系人</th><th class="center">客户等级</th><th>合作起始</th><th>操作</th>' +
      '</tr></thead><tbody>' + rows + '</tbody></table></div>' +
      U.pagination(pg, 'cust-page');
  };
  function filterInput(label, id, val, ph) {
    return '<div class="form-item"><label>' + esc(label) + '</label><input class="input" id="' + id + '" value="' + esc(val || '') + '" placeholder="' + esc(ph || '') + '"></div>';
  }
  window.__filterInput = filterInput;

  Actions['cust-filter'] = function () {
    var s = ui('customers');
    s.filters = { kw: val('f-kw'), country: val('f-country') };
    s.page = 1; window.App.rerender();
  };
  Actions['cust-reset'] = function () { window.AppUI.customers = { page: 1, filters: {} }; window.App.rerender(); };
  Actions['cust-page'] = function (el) { ui('customers').page = +el.dataset.page; window.App.rerender(); };
  Actions['cust-new'] = function () {
    U.toast('演示提示：新建客户需接入主数据系统，原型中暂未开放', 'warning');
  };

  /* ==================== 客户详情 / 编辑 ==================== */
  Views.customerDetail = function (ctx) {
    var c = U.customer(ctx.params[0]);
    if (!c) return Views.notFound('客户不存在：' + ctx.params[0]);
    var editable = ctx.user.role === 'sales';
    var orders = M.orders.filter(function (o) { return o.customerId === c.id; });
    var ro = editable ? '' : 'readonly';
    var orderRows = orders.map(function (o) {
      var fin = U.orderFin(o);
      return '<tr><td><a href="#/orders/' + o.id + '">' + o.id + '</a></td><td>' + o.createdAt + '</td>' +
        '<td class="num">' + U.fmt(fin.total) + ' ' + o.currency + '</td><td class="center">' + tag(o.status) + '</td>' +
        '<td class="center">' + tag(U.payStatus(o)) + '</td></tr>';
    }).join('') || U.emptyRow(5, '该客户暂无订单');
    return '<div class="page-head"><h2>客户详情 · ' + esc(c.nameCn) + '</h2><div class="actions">' +
      '<a class="btn" href="#/customers">返回列表</a></div></div>' +
      '<div class="card"><div class="card-title">基础信息' + (editable ? '<span class="sub">业务员可编辑，保存前进行必填校验</span>' : '<span class="sub">当前角色只读</span>') + '</div>' +
      '<form id="cust-form"><div class="form-grid">' +
      U.formItem('客户编号', '<input class="input" value="' + esc(c.id) + '" readonly>') +
      U.formItem('客户中文名', '<input class="input" id="c-nameCn" value="' + esc(c.nameCn) + '" ' + ro + '>', { required: true }) +
      U.formItem('客户英文名', '<input class="input" id="c-nameEn" value="' + esc(c.nameEn) + '" ' + ro + '>', { required: true }) +
      U.formItem('国家', '<input class="input" id="c-country" value="' + esc(c.country) + '" ' + ro + '>', { required: true }) +
      U.formItem('联系人', '<input class="input" id="c-contact" value="' + esc(c.contact) + '" ' + ro + '>', { required: true }) +
      U.formItem('邮箱', '<input class="input" id="c-email" value="' + esc(c.email) + '" ' + ro + '>', { required: true }) +
      U.formItem('电话', '<input class="input" id="c-phone" value="' + esc(c.phone) + '" ' + ro + '>') +
      U.formItem('客户等级', '<select class="select" id="c-level" ' + (editable ? '' : 'disabled') + '>' +
        ['A', 'B', 'C'].map(function (l) { return '<option ' + (c.level === l ? 'selected' : '') + '>' + l + ' 级</option>'; }).join('') + '</select>') +
      U.formItem('合作起始', '<input class="input" value="' + esc(c.since) + '" readonly>') +
      '</div>' +
      '<div class="form-item mt8"><label>地址</label><input class="input" id="c-addr" value="' + esc(c.addr) + '" ' + ro + '><div class="field-error"></div></div>' +
      '<div class="form-item mt8"><label>备注</label><textarea class="textarea" id="c-remark" ' + ro + '>' + esc(c.remark) + '</textarea><div class="field-error"></div></div>' +
      (editable ? '<div class="form-actions"><a class="btn" href="#/customers">取 消</a><button type="submit" class="btn btn-primary" data-loading-text="保存中">保 存</button></div>' : '') +
      '</form></div>' +
      '<div class="card"><div class="card-title">该客户订单（' + orders.length + '）</div>' +
      '<div class="table-wrap"><table class="table"><thead><tr><th>订单编号</th><th>创建日期</th><th class="num">订单金额</th><th class="center">订单状态</th><th class="center">收款状态</th></tr></thead>' +
      '<tbody>' + orderRows + '</tbody></table></div></div>';
  };
  document.addEventListener('submit', function (e) {
    if (e.target.id !== 'cust-form') return;
    e.preventDefault();
    var form = e.target;
    U.clearErrors(form);
    if (!U.validate([
      { el: form.querySelector('#c-nameCn'), label: '客户中文名', required: true },
      { el: form.querySelector('#c-nameEn'), label: '客户英文名', required: true },
      { el: form.querySelector('#c-country'), label: '国家', required: true },
      { el: form.querySelector('#c-contact'), label: '联系人', required: true },
      { el: form.querySelector('#c-email'), label: '邮箱', required: true }
    ])) return;
    var c = U.customer(location.hash.split('/')[2]);
    if (!c) return;
    c.nameCn = form.querySelector('#c-nameCn').value.trim();
    c.nameEn = form.querySelector('#c-nameEn').value.trim();
    c.country = form.querySelector('#c-country').value.trim();
    c.contact = form.querySelector('#c-contact').value.trim();
    c.email = form.querySelector('#c-email').value.trim();
    c.phone = form.querySelector('#c-phone').value.trim();
    c.level = form.querySelector('#c-level').value;
    c.addr = form.querySelector('#c-addr').value.trim();
    c.remark = form.querySelector('#c-remark').value.trim();
    if (window.App.markDraftClean) window.App.markDraftClean();
    U.toast('客户资料已保存（演示数据仅在本次会话内存中生效）');
    window.App.rerender();
  });

  /* ==================== 商品列表 ==================== */
  Views.products = function () {
    var s = ui('products'), f = s.filters;
    var list = M.products.filter(function (p) {
      if (f.kw && (p.nameCn + p.nameEn + p.id).toLowerCase().indexOf(f.kw.toLowerCase()) < 0) return false;
      return true;
    });
    var pg = U.page(list, s.page);
    var rows = pg.rows.map(function (p) {
      return '<tr><td><a href="#/products/' + p.id + '">' + p.id + '</a></td>' +
        '<td><a href="#/products/' + p.id + '">' + esc(p.nameCn) + '</a><div class="muted small">' + esc(p.nameEn) + '</div></td>' +
        '<td>' + esc(p.spec) + '</td><td class="center">' + esc(p.unit) + '</td>' +
        '<td class="num">' + U.fmt(p.refPrice) + ' ' + p.currency + '</td><td>' + esc(p.hsCode) + '</td>' +
        '<td><a class="btn btn-sm" href="#/products/' + p.id + '">查看</a></td></tr>';
    }).join('');
    if (!rows) rows = U.emptyRow(7, f.kw ? '没有符合筛选条件的结果' : '暂无商品记录');
    return '<div class="page-head"><h2>商品管理</h2></div>' +
      '<div class="filter-bar">' +
      filterInput('商品名称/编号', 'f-kw', f.kw, '输入关键字') +
      '<div class="filter-actions"><button class="btn btn-primary" data-action="prod-filter">查 询</button><button class="btn" data-action="prod-reset">重 置</button></div></div>' +
      '<div class="table-toolbar"><h3>商品档案<span class="record-count">' + list.length + ' 项</span></h3><span class="muted small">价格为样例参考价</span></div>' +
      '<div class="table-wrap"><table class="table"><thead><tr>' +
      '<th>商品编号</th><th>商品名称</th><th>规格</th><th class="center">单位</th><th class="num">参考价</th><th>HS 编码</th><th>操作</th>' +
      '</tr></thead><tbody>' + rows + '</tbody></table></div>' +
      U.pagination(pg, 'prod-page');
  };
  Actions['prod-filter'] = function () { var s = ui('products'); s.filters = { kw: val('f-kw') }; s.page = 1; window.App.rerender(); };
  Actions['prod-reset'] = function () { window.AppUI.products = { page: 1, filters: {} }; window.App.rerender(); };
  Actions['prod-page'] = function (el) { ui('products').page = +el.dataset.page; window.App.rerender(); };

  /* ==================== 商品详情 ==================== */
  Views.productDetail = function (ctx) {
    var p = U.product(ctx.params[0]);
    if (!p) return Views.notFound('商品不存在：' + ctx.params[0]);
    var role = ctx.user.role, query = ctx.query || {}, sourceId = query.order;
    var sourceOrder = sourceId && M.orders.filter(function (o) { return o.id === sourceId; });
    sourceOrder = sourceOrder && sourceOrder.length === 1 && sourceOrder[0].items.some(function (it) { return it.productId === p.id; }) ? sourceOrder[0] : null;
    var returnHash = sourceOrder ? '#/orders/' + encodeURIComponent(sourceOrder.id) + '?tab=items' : role === 'sales' ? '#/products' : '#/orders';
    var returnText = sourceOrder ? '返回来源订单 ' + sourceOrder.id : role === 'sales' ? '返回商品列表' : '返回订单列表';
    if (['sales', 'doc', 'fin', 'boss'].indexOf(role) < 0) { returnHash = '#/dashboard'; returnText = '返回工作台'; }
    var contextNote = sourceOrder ? '来源订单 ' + sourceOrder.id + ' · 商品明细' : sourceId ? '来源订单无法核对，请从有权访问的列表重新选择。' : '';
    var used = M.orders.filter(function (o) { return o.items.some(function (it) { return it.productId === p.id; }); });
    var usedRows = used.map(function (o) {
      var it = o.items.find(function (i) { return i.productId === p.id; });
      return '<tr><td><a href="#/orders/' + o.id + '">' + o.id + '</a></td><td>' + esc(U.customerName(o.customerId)) + '</td>' +
        '<td class="num">' + it.qty + ' ' + esc(p.unit) + '</td><td class="num">' + U.fmt(it.price) + ' ' + o.currency + '</td>' +
        '<td class="center">' + tag(o.status) + '</td></tr>';
    }).join('') || U.emptyRow(5, '该商品暂无成交订单');
    return '<div class="page-head"><div><h2>商品详情 · ' + esc(p.nameCn) + '</h2>' + (contextNote ? '<p class="page-description">' + esc(contextNote) + '</p>' : '') + '</div><div class="actions"><a class="btn" href="' + esc(returnHash) + '">' + esc(returnText) + '</a></div></div>' +
      '<div class="card"><div class="card-title">基础信息</div><div class="desc-grid">' +
      descItem('商品编号', p.id) + descItem('中文名称', p.nameCn) + descItem('英文名称', p.nameEn) +
      descItem('规格', p.spec) + descItem('单位', p.unit) +
      '<div class="di"><div class="dt">参考价</div><div class="dd num">' + U.fmt(p.refPrice) + ' ' + p.currency + '</div></div>' +
      descItem('HS 编码', p.hsCode) + descItem('备注', p.remark || '—') +
      '</div></div>' +
      '<div class="card"><div class="card-title">成交记录（' + used.length + '）</div>' +
      '<div class="table-wrap"><table class="table"><thead><tr><th>订单编号</th><th>客户</th><th class="num">数量</th><th class="num">成交单价</th><th class="center">订单状态</th></tr></thead>' +
      '<tbody>' + usedRows + '</tbody></table></div></div>';
  };
  function descItem(k, v) { return '<div class="di"><div class="dt">' + esc(k) + '</div><div class="dd">' + U.v(v) + '</div></div>'; }
  window.__descItem = descItem;

  /* ==================== 通用：未找到 / 无权限 ==================== */
  Views.notFound = function (msg) {
    return '<div class="forbidden"><div class="f-ico">' + U.icon('file') + '</div><h3>记录不存在</h3><p>' + esc(msg || '您访问的记录不存在或已被删除') + '</p>' +
      '<p class="mt16"><a class="btn btn-primary" href="#/dashboard">返回工作台</a></p></div>';
  };
  Views.forbidden = function (msg) {
    return '<div class="forbidden"><div class="f-ico">' + U.icon('shield') + '</div><h3>无访问权限</h3><p>' + esc(msg || '当前角色无权访问该模块。如需使用其他账号，请先退出登录，再重新登录。') + '</p>' +
      '<p class="mt16"><a class="btn btn-primary" href="#/dashboard">返回工作台</a></p></div>';
  };

  function val(id) { var el = document.getElementById(id); return el ? el.value.trim() : ''; }
  window.__val = val;
})();
