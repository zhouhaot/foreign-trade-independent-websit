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
    if (roles.indexOf(picked) < 0 || !U.roleUser(picked)) picked = U.roleUser('sales') ? 'sales' : roles.find(function (r) { return !!U.roleUser(r); }) || '';
    var options = roles.map(function (r) {
      var user = U.roleUser(r);
      var identity = M.roles[r] + (user ? (user.name === M.roles[r] ? '' : ' · ' + user.name) : ' · 无启用账号');
      return '<option value="' + esc(r) + '"' + (r === picked ? ' selected' : '') + (user ? '' : ' disabled') + '>' + esc(identity) + '</option>';
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
        '<div class="login-story-foot"><span class="login-local-dot" aria-hidden="true"></span>本地会话 · 刷新后恢复样例数据</div>' +
      '</section><section class="login-panel" aria-label="登录工作台"><div class="login-box">' +
      '<h1>欢迎回来</h1>' +
      '<div class="sub-title">外贸订单与单证管理系统</div>' +
      '<div class="form-item"><label for="login-account">账号</label><input class="input" id="login-account" value="sample" autocomplete="username"><div class="field-error"></div></div>' +
      '<div class="form-item"><label for="login-password">密码</label><input class="input" id="login-password" type="password" value="sample123" autocomplete="current-password"><div class="field-error"></div></div>' +
      '<div class="login-role-quick"><label class="lr-title" for="login-role">岗位</label>' +
      '<div class="login-role-control"><select class="select login-role-select" id="login-role" data-action="login-pick-role" aria-describedby="login-role-hint">' + options + '</select>' +
      '<span class="login-role-chevron" aria-hidden="true">' + U.icon('chevron') + '</span></div>' +
      '<div class="login-role-hint" id="login-role-hint" aria-live="polite">' + (selectedUser ? '部门：' + esc(selectedUser.dept) : '暂无启用的账号，请联系管理员核对账号状态。') + '</div></div>' +
      '<button type="button" class="btn btn-primary login-btn" data-action="login-submit"' + (selectedUser ? '' : ' disabled') + '>进入工作台' + U.icon('arrow') + '</button>' +
      '<div class="login-tip">' + U.icon('shield') + '<span>未接入认证服务，不校验账号密码，请勿填写真实凭据。选择岗位后进入对应工作台。</span></div>' +
      '</div></section></div>';
  };
  Actions['login-pick-role'] = function (el, event) {
    if (el.disabled || (event && event.type === 'click')) return;
    var picked = el.value;
    if (!Object.prototype.hasOwnProperty.call(M.roles, picked)) return;
    var user = U.roleUser(picked);
    if (!user) { U.toast('该岗位没有启用的账号，请选择其他岗位。', 'warning'); return; }
    window.AppUI.loginRole = picked;
    document.getElementById('login-role-hint').textContent = '部门：' + user.dept;
  };
  Actions['login-submit'] = function (el) {
    if (el.disabled || el.classList.contains('is-loading')) return;
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
      U.toast('请选择有效的岗位', 'error');
      picker.focus();
      return;
    }
    var user = U.roleUser(role);
    if (!user) { U.toast('该岗位没有启用的账号，请选择其他岗位。', 'warning'); picker.focus(); return; }
    window.AppUI.loginRole = role;
    var entered = false, loginIdentity = null;
    var sourceIdentity = window.__demoUser, sourceSession = JSON.stringify(U.currentUser());
    function available() { return document.getElementById('login-role') === picker && picker.value === role && U.roleUser(role) === user && user.enabled; }
    picker.disabled = true;
    U.withLoading(el, function () {
      if (!available() || window.__demoUser !== sourceIdentity || JSON.stringify(U.currentUser()) !== sourceSession) return;
      loginIdentity = { id: user.id, name: user.name, role: user.role, roleName: M.roles[user.role], dept: user.dept };
      U.setUser(loginIdentity);
      entered = true;
    }, 500);
    setTimeout(function () {
      var current = U.currentUser();
      if (!entered || !available() || window.__demoUser !== loginIdentity || !current || JSON.stringify(current) !== JSON.stringify(loginIdentity)) {
        if (entered && window.__demoUser === loginIdentity && document.getElementById('login-role') === picker && current && JSON.stringify(current) === JSON.stringify(loginIdentity)) U.clearUser();
        if (document.getElementById('login-role') === picker) { picker.disabled = false; U.toast('账号或登录页面已变化，请重新选择岗位后登录。', 'warning'); }
        return;
      }
      U.toast('登录成功，当前角色：' + M.roles[role] + '（' + user.name + '）');
      location.hash = '#/dashboard';
    }, 520);
  };

  /* ==================== 工作台 ==================== */
  // Approximate country anchors, never customer addresses or shipping origins.
  var mapCountries = [
    { key: 'US', name: '美国', lon: -99, lat: 39, dx: 22, dy: -30 },
    { key: 'DE', name: '德国', lon: 10, lat: 51, dx: 30, dy: -27 },
    { key: 'FR', name: '法国', lon: 2, lat: 46, dx: -35, dy: 22 },
    { key: 'EG', name: '埃及', lon: 30, lat: 27, dx: 30, dy: 20 },
    { key: 'CL', name: '智利', lon: -71, lat: -33, dx: 27, dy: 18 },
    { key: 'GB', name: '英国', lon: -3, lat: 55, dx: -45, dy: -36 }
  ];
  U.orderMapData = function (user) {
    var data = { orders: [], groups: [], totals: [], missing: 0, located: 0, routes: [], originPending: 0, originSynthetic: 0, routePending: 0 };
    if (!user || !U.moduleEnabled(user.role, '订单详情')) return data;
    data.orders = M.orders.slice();
    data.groups = mapCountries.map(function (c) { return Object.assign({}, c, { orders: [] }); });
    var unknown = { key: 'unknown', name: '地点待补', orders: [] };
    data.orders.forEach(function (o) {
      var customers = M.customers.filter(function (c) { return c.id === o.customerId; });
      var country = customers.length === 1 && typeof customers[0].country === 'string' ? customers[0].country.trim() : '';
      var group = data.groups.find(function (g) { return g.name === country; }) || unknown;
      group.orders.push(o);
      var origin = U.orderShippingOrigin(o);
      if (!origin.ok) data.originPending++;
      else {
        if (origin.demoSynthetic) data.originSynthetic++;
        var segments = U.orderMapRouteSegments(origin, group);
        if (group !== unknown && segments.length) data.routes.push({ orderId: o.id, country: group.key, origin: origin, segments: segments });
      }
    });
    data.groups = data.groups.filter(function (g) { return g.orders.length; });
    data.located = data.groups.length; data.missing = unknown.orders.length;
    if (unknown.orders.length) data.groups.push(unknown);
    data.totals = mapTotals(data.orders);
    data.routePending = data.orders.length - data.routes.length;
    return data;
  };
  function mapTotals(orders) {
    var totals = Object.create(null);
    orders.forEach(function (o) {
      var currency = typeof o.currency === 'string' && /^[A-Z]{3}$/.test(o.currency) && M.dicts.some(function (d) { return d.group === '币种' && d.code === o.currency; }) ? o.currency : '币种待核对';
      if (!totals[currency]) totals[currency] = { currency: currency, cents: 0, error: currency === '币种待核对' };
      var entry = totals[currency], amount = U.transactionAmounts(o.items);
      if (!amount.ok || !Number.isSafeInteger(entry.cents + amount.totalCents)) entry.error = true;
      else entry.cents += amount.totalCents;
      var parsed = U.decimalInput(entry.cents / 100, '地图汇总', true);
      if (!parsed.ok || parsed.units !== entry.cents) entry.error = true;
    });
    return Object.keys(totals).sort().map(function (key) { return totals[key]; });
  }
  function mapDetail(data, key) {
    var group = data.groups.find(function (g) { return g.key === key; });
    var orders = group ? group.orders : data.orders;
    var title = group ? group.name : '全部国家';
    var totals = mapTotals(orders);
    var html = '<div class="order-map-detail-head"><h4>' + esc(title) + '</h4><span>' + orders.length + ' 笔订单</span></div>' +
      '<dl class="order-map-totals">' + totals.map(function (t) {
        return '<div><dt>' + esc(t.currency) + '</dt><dd>' + (t.error ? '金额待核对' : U.fmt(t.cents / 100)) + '</dd></div>';
      }).join('') + '</dl>';
    if (!orders.length) return html + '<p class="order-map-empty">暂无订单记录</p>';
    return html + '<p class="order-map-list-hint">订单明细' + (orders.length > 3 ? ' · 向下滚动查看全部' : '') + '</p><div class="order-map-list" aria-label="' + esc(title) + '订单">' + orders.map(function (o) {
      var amount = U.transactionAmounts(o.items), origin = U.orderShippingOrigin(o);
      return '<a class="order-map-order" href="#/orders/' + encodeURIComponent(o.id) + '"><span><b>' + esc(o.id) + '</b><span>' + esc(U.customerName(o.customerId).split('（')[0]) + '</span><span class="order-map-origin-text">' + (origin.ok ? '起运：' + esc(origin.name) + (origin.demoSynthetic ? '（合成数据）' : '') : esc(origin.error)) + '</span></span><span class="order-map-order-end"><strong>' + (amount.ok ? U.fmt(amount.total) + ' ' + esc(o.currency) : '金额待核对') + '</strong>' + tag(o.status) + '</span></a>';
    }).join('') + '</div>';
  }
  function orderMap(user) {
    if (!U.moduleEnabled(user.role, '订单详情')) return '';
    var data = U.orderMapData(user), state = window.AppUI.orderMap || {};
    var selected = data.groups.some(function (g) { return g.key === state.country; }) ? state.country : '';
    var countries = data.groups.filter(function (g) { return g.key !== 'unknown'; });
    var lines = countries.map(function (g) {
      var x = (g.lon + 180) / 360 * 1000, y = (85 - g.lat) / 145 * 430;
      return '<circle class="order-map-halo" cx="' + x + '" cy="' + y + '" r="13"/><circle class="order-map-dot" cx="' + x + '" cy="' + y + '" r="4"/>' +
        '<path class="order-map-leader" d="M' + x + ',' + y + 'l' + g.dx + ',' + g.dy + '"/>';
    }).join('');
    var routeHtml = data.routes.map(function (route, i) {
      return '<g data-order-map-route="' + esc(route.orderId) + '" data-country="' + route.country + '"' + (selected && selected !== route.country ? ' class="is-dimmed"' : '') + '><title>' + esc(route.orderId + ' · ' + route.origin.name + ' → ' + data.groups.find(function (g) { return g.key === route.country; }).name + (route.origin.demoSynthetic ? '（合成数据）' : '')) + '</title>' + route.segments.map(function (segment) {
        return '<path class="order-map-trail" d="' + segment.d + '"' + (segment.arrives ? ' marker-end="url(#order-map-arrow)"' : '') + '/><path class="order-map-flow" style="animation-delay:' + Math.round(i * 120 + segment.startT * 2800) + 'ms;animation-duration:' + Math.round((segment.endT - segment.startT) * 2800) + 'ms" pathLength="1" d="' + segment.d + '"/>';
      }).join('') + '</g>';
    }).join('');
    var origins = [];
    data.routes.forEach(function (route) { if (!origins.some(function (o) { return o.name === route.origin.name && o.lon === route.origin.lon && o.lat === route.origin.lat; })) origins.push(route.origin); });
    origins.sort(function (a, b) { return b.lat - a.lat; });
    var originLabels = origins.map(function (origin, i) {
      var x = (origin.lon + 180) / 360 * 1000, y = (85 - origin.lat) / 145 * 430, dy = (i - (origins.length - 1) / 2) * 42;
      lines += '<path class="order-map-origin-leader" d="M' + x + ',' + y + 'l60,' + dy + '"/><rect class="order-map-origin-dot" x="' + (x - 3.5) + '" y="' + (y - 3.5) + '" width="7" height="7"/>';
      return '<span class="order-map-origin-label" style="left:' + (x / 10 + 6) + '%;top:' + ((y + dy) / 4.3) + '%">起运 · ' + esc(origin.name) + '</span>';
    }).join('');
    var points = countries.map(function (g) {
      return '<button type="button" class="order-map-pin' + (selected === g.key ? ' is-selected' : '') + '" style="left:' + ((g.lon + 180) / 360 * 100 + g.dx / 10) + '%;top:' + ((85 - g.lat) / 145 * 100 + g.dy / 4.3) + '%" data-action="order-map-country" data-country="' + g.key + '" aria-pressed="' + (selected === g.key) + '" aria-controls="order-map-detail">' + g.name + '<b>' + g.orders.length + '</b></button>';
    }).join('');
    return '<section class="card order-map" id="order-map" aria-labelledby="order-map-title"><div class="order-map-head"><div><h3 id="order-map-title">全球订单<span class="record-count">' + data.orders.length + ' 笔 · ' + data.located + ' 个国家</span></h3><p>按客户国家分布 · 全量样例数据 · 含所有订单状态</p></div><button class="btn btn-sm" type="button" data-action="order-map-replay" aria-describedby="order-map-origin-summary"' + (data.routes.length ? '' : ' disabled') + '>重播流向</button></div>' +
      '<p class="order-map-origin-summary" id="order-map-origin-summary">起运地 → 客户国家 · ' + data.routes.length + ' 笔可显示流向' + (data.originPending ? ' · ' + data.originPending + ' 笔起运地待补／待核对' : '') + (data.routePending > data.originPending ? ' · ' + (data.routePending - data.originPending) + ' 笔目的地／显示范围待核对' : '') + (data.originSynthetic ? ' · ' + data.originSynthetic + ' 笔合成起运数据' : '') + '</p>' +
      '<div class="order-map-layout"><div class="order-map-visual"><div class="order-map-canvas"><img src="assets/maps/world-land.svg" alt="" aria-hidden="true"><svg viewBox="0 0 1000 430" aria-hidden="true" focusable="false"><defs><marker id="order-map-arrow" viewBox="0 -4 8 8" refX="8" refY="0" markerWidth="5" markerHeight="5" orient="auto"><path d="M0,-3L7,0L0,3" fill="none" stroke="currentColor" stroke-width="1.2"/></marker></defs>' + routeHtml + lines + '</svg>' + points + originLabels +
      (!data.orders.length ? '<p class="order-map-no-points">暂无订单分布</p>' : !countries.length ? '<p class="order-map-no-points">地点待补，订单仍可在右侧查阅</p>' : '') +
      '</div><div class="order-map-countries" aria-label="按国家筛选订单"><button type="button" class="btn btn-sm" data-action="order-map-country" data-country="" aria-pressed="' + !selected + '" aria-controls="order-map-detail">全部</button>' + data.groups.map(function (g) {
        return '<button type="button" class="btn btn-sm" data-action="order-map-country" data-country="' + g.key + '" aria-pressed="' + (selected === g.key) + '" aria-controls="order-map-detail">' + esc(g.name) + ' ' + g.orders.length + '</button>';
      }).join('') + '</div><p class="order-map-caption">方点为订单记录的起运地，圆点为客户国家示意；连线不表示物流路线，缺起运地不连线。' + (data.missing ? ' ' + data.missing + ' 笔客户国家地点待补。' : '') + '</p></div>' +
      '<div class="order-map-detail" id="order-map-detail">' + mapDetail(data, selected) + '</div></div><div class="sr-only" role="status" id="order-map-status"></div></section>';
  }
  Actions['order-map-country'] = function (el) {
    var user = window.App && window.App.user, root = document.getElementById('order-map');
    if (!root || !root.contains(el) || !user || !U.moduleEnabled(user.role, '订单详情')) return;
    var data = U.orderMapData(user), key = el.dataset.country || '';
    var group = data.groups.find(function (g) { return g.key === key; });
    if (key && !group) return;
    window.AppUI.orderMap = { country: key };
    root.querySelectorAll('[data-action="order-map-country"]').forEach(function (button) {
      var picked = button.dataset.country === key;
      button.setAttribute('aria-pressed', String(picked)); button.classList.toggle('is-selected', picked);
    });
    root.querySelectorAll('[data-order-map-route]').forEach(function (route) { route.classList.toggle('is-dimmed', !!key && route.dataset.country !== key); });
    document.getElementById('order-map-detail').innerHTML = mapDetail(data, key);
    document.getElementById('order-map-status').textContent = '已显示' + (group ? group.name : '全部国家') + '，' + (group ? group.orders.length : data.orders.length) + '笔订单';
  };
  Actions['order-map-replay'] = function (el) {
    var user = window.App && window.App.user, root = document.getElementById('order-map');
    if (!root || !root.contains(el) || !user || !U.moduleEnabled(user.role, '订单详情')) return;
    if (!U.orderMapData(user).routes.length) { document.getElementById('order-map-status').textContent = '没有可显示的流向，请先补充订单起运地并核对客户国家。'; return; }
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      document.getElementById('order-map-status').textContent = '已启用减少动态效果，保留静态订单分布。'; return;
    }
    var chart = root.querySelector('.order-map-canvas');
    chart.classList.add('motion-reset'); void chart.offsetWidth; chart.classList.remove('motion-reset');
    document.getElementById('order-map-status').textContent = '正在重播一次订单分布光迹。';
  };
  Views.dashboard = function (ctx) {
    var role = ctx.user.role, name = ctx.user.name;

    /* 概览卡片：随角色变化 */
    var cards = [];
    var pendingApprovals = M.approvals.filter(function (a) { return a.status === '待处理'; });
    var reviewingDocs = M.documents.filter(function (d) { return d.status === '待审核'; });
    var unpaidOrders = M.orders.filter(function (o) { return U.payStatus(o) !== '已结清' && o.status !== '已取消'; });
    var recentOrders = M.orders.slice().sort(function (a, b) { return b.createdAt.localeCompare(a.createdAt); }).slice(0, 4);
    var docWork = role === 'doc' ? U.documentWorkSummary(ctx.user) : null;
    var myTodos = docWork ? docWork.todos : U.todosFor(role, name);

    if (role === 'boss') {
      cards.push(statCard('我的待办', pendingApprovals.length, '待处理审核与异常申请', '#/approvals', 'accent-orange'));
      cards.push(statCard('待审核单证', reviewingDocs.length, '等待审核的单证版本', '#/documents', 'accent-blue'));
      cards.push(statCard('待收款订单', unpaidOrders.length, '存在未收金额的订单', '#/orders', 'accent-red'));
      cards.push(statCard('在执行订单', M.orders.filter(function (o) { return o.status === '执行中'; }).length, '当前执行中订单', '#/orders', 'accent-green'));
    } else if (role === 'doc') {
      cards.push(statCard('当前可办理', myTodos.length, '具备当前编辑资格的单证', '#/documents', 'accent-orange'));
      cards.push(statCard('制作中单证记录', M.documents.filter(function (d) { return d.status === '制作中' || d.status === '草稿'; }).length, '版本记录 · 含历史版本', '#/documents', 'accent-blue'));
      cards.push(statCard('退回单证记录', M.documents.filter(function (d) { return d.status === '已退回'; }).length, '版本记录 · 含历史版本', '#/documents', 'accent-red'));
      cards.push(statCard('通过单证记录', M.documents.filter(function (d) { return d.status === '已通过'; }).length, '含历史版本 · 导出资格看单证页', '#/documents', 'accent-green'));
    } else if (role === 'fin') {
      cards.push(statCard('待收款订单', unpaidOrders.length, '存在未收金额', '#/payments', 'accent-red'));
      cards.push(statCard('本次会话新增收款', U.sessionPaymentCount(), '即时更新 · 刷新后归零', '#/payments', 'accent-blue'));
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
      cards.push(statCard('运行状态', '正常', '本地会话', '#/dashboard', 'accent-green'));
    }

    /* 待办列表 */
    var todoHtml = myTodos.length ? myTodos.map(function (t) {
      return '<div class="todo-item"' + (docWork ? ' data-document-id="' + esc(t.documentId) + '"' : '') + '>' + tag(t.kind) +
        '<div class="t-title"><a href="' + (docWork ? esc(t.link) : t.link) + '">' + esc(t.text) + '</a><div class="t-sub">' + esc(t.sub) + '</div></div>' +
        '<a class="btn btn-sm" href="' + (docWork ? esc(t.link) : t.link) + '"' + (docWork ? ' aria-label="去处理 · ' + esc(t.text) + '"' : '') + '>去处理</a></div>';
    }).join('') : '<div class="empty-state home-empty"><div class="icon">' + U.icon('check') + '</div><strong>当前没有待办事项</strong><p>可通过右侧业务入口继续查看相关记录。</p></div>';
    if (docWork && !myTodos.length) {
      todoHtml = '<div class="empty-state home-empty"><div class="icon">' + U.icon('file') + '</div><strong>' +
        (docWork.identityError ? '当前制单资格待核对' : '当前没有可办理制单事项') + '</strong><p>' +
        (docWork.identityError ? esc(docWork.identityError) : '历史与暂停记录仍可查阅，请核对下方参考或单证台账。') + '</p></div>';
    }
    var referenceHtml = docWork ? '<section class="card doc-work-references"><div class="card-title home-card-head"><div><h3>历史与暂停参考<span class="record-count">' + docWork.references.length + ' 项</span></h3><p>保留原版本记录，当前办理资格以单证页为准。</p></div></div>' +
      (docWork.references.length ? docWork.references.map(function (r) {
        return '<div class="doc-work-reference" data-document-id="' + esc(r.documentId) + '">' + tag(r.kind) +
          '<div class="doc-work-reference-body"><strong>' + esc(r.text) + '</strong><div class="t-sub">' + esc(r.sub) + '</div><p class="doc-work-reason">' + esc(r.reason) + '</p></div>' +
          (r.link ? '<a class="btn btn-sm" href="' + esc(r.link) + '" aria-label="查看记录 · ' + esc(r.text) + '">查看记录</a>' : '<a class="home-text-link" href="#/documents" aria-label="核对单证台账 · ' + esc(r.text) + '">核对单证台账</a>') + '</div>';
      }).join('') : '<div class="empty-state home-empty">当前没有历史或暂停的未完成版本参考。</div>') + '</section>' : '';

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
    }[role].filter(function (s) { return U.moduleEnabled(role, U.moduleForPath(s[1], role)); });
    if (!shortcuts.length) shortcuts = [['工作台', '#/dashboard', 'home']];
    var shortcutHtml = shortcuts.map(function (s) {
      return '<a class="shortcut-link" href="' + s[1] + '">' + U.icon(s[2]) + '<span>' + s[0] + '</span>' + U.icon('arrow') + '</a>';
    }).join('');

    var orderRows = recentOrders.map(function (o) {
      var fin = U.orderFin(o);
      return '<tr><td><a href="#/orders/' + o.id + '"><b>' + o.id + '</b></a><div class="cell-secondary">' + esc(o.createdAt) + '</div></td>' +
        '<td title="' + esc(U.customerName(o.customerId)) + '">' + esc(U.customerName(o.customerId).split('（')[0]) + '</td>' +
        '<td class="num">' + U.fmt(fin.total) + ' ' + esc(o.currency) + '</td>' +
        '<td>' + tag(o.status) + '</td><td>' + tag(o.docStatus) + '</td><td>' + tag(U.payStatus(o)) + '</td></tr>';
    }).join('');
    var userRows = M.users.map(function (u) {
      return '<tr><td>' + esc(u.name) + '</td><td>' + esc(M.roles[u.role]) + '</td><td>' + esc(u.dept) + '</td><td>' + tag(u.enabled ? '启用' : '禁用') + '</td></tr>';
    }).join('');
    var roleDescription = {
      admin: '维护账号、角色与基础配置，让每位协作成员各司其职。',
      sales: '从询盘到成交，把握客户跟进与订单执行的每一步。',
      doc: '接续当前可办理的制单事项，历史与暂停记录保留查阅。',
      fin: '跟踪应收与每笔到账，按币种核对订单收款进度。',
      boss: '聚焦审核与异常，统览订单、单证和收款的独立进展。'
    };
    return '<div class="page-head dashboard-head home-hero"><div><h2>' + esc(name) + '，欢迎回来</h2><p class="page-description">' + roleDescription[role] + '</p>' +
      '<div class="home-identity">' + esc(M.roles[role]) + '<span aria-hidden="true">·</span>' + esc(ctx.user.dept) + '</div></div>' +
      '<a class="btn btn-primary" href="' + shortcuts[0][1] + '">' + shortcuts[0][0] + U.icon('arrow') + '</a></div>' +
      '<div class="dashboard-metrics" aria-label="当前业务概览">' + cards.join('') + '</div>' +
      orderMap(ctx.user) +
      '<div class="dash-grid">' +
        '<div class="dash-main">' +
          '<section class="card work-queue' + (docWork ? ' doc-work-summary' : '') + '"><div class="card-title home-card-head"><div><h3>' + (docWork ? '当前可办理制单事项' : '待处理事项') + '<span class="record-count">' + myTodos.length + ' 项</span></h3><p>' + (docWork ? '仅列具备当前编辑资格的版本，不代表个人分派。' : '从这里接续你的业务工作') + '</p></div></div>' + todoHtml + '</section>' +
          (role !== 'admin' ? '<section class="card recent-orders"><div class="card-title home-card-head"><div><h3>近期订单</h3><p>四笔最新订单，三类进度独立跟踪</p></div><a class="home-text-link" href="#/orders">全部订单' + U.icon('arrow') + '</a></div><div class="table-wrap"><table class="table"><thead><tr><th>订单 / 创建日期</th><th>客户</th><th class="num">成交金额</th><th>订单进度</th><th>单证进度</th><th>收款进度</th></tr></thead><tbody>' + orderRows + '</tbody></table></div></section>' :
            '<section class="card recent-orders"><div class="card-title home-card-head"><div><h3>账号列表</h3><p>按角色检查权限与页面呈现</p></div><a class="home-text-link" href="#/system/users">用户管理' + U.icon('arrow') + '</a></div><div class="table-wrap"><table class="table"><thead><tr><th>姓名</th><th>角色</th><th>部门</th><th>状态</th></tr></thead><tbody>' + userRows + '</tbody></table></div></section>') +
          referenceHtml +
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
      (window.App.user.role === 'sales' ? '<button class="btn btn-unavailable" disabled title="客户新建服务尚未接入，仅可维护已有客户">新建客户 · 未开放</button>' : '') +
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
    U.toast('新建客户尚未开放，需接入主数据服务。', 'warning');
  };

  /* ==================== 客户详情 / 编辑 ==================== */
  var customerEditSequence = 0, customerEditTicket = null, savedCustomerForms = new WeakSet();
  Views.customerDetail = function (ctx) {
    var c = U.customer(ctx.params[0]);
    if (!c) return Views.notFound('客户不存在：' + ctx.params[0]);
    var editable = ctx.user.role === 'sales' && U.moduleEnabled('sales', '客户与商品');
    customerEditTicket = editable ? { token: 'customer-' + (++customerEditSequence), id: c.id, customer: c, content: JSON.stringify(c),
      actor: window.App.user, actorId: ctx.user.id, actorName: ctx.user.name, actorRole: ctx.user.role, route: location.hash } : null;
    var token = customerEditTicket ? customerEditTicket.token : '';
    var orders = M.orders.filter(function (o) { return o.customerId === c.id; });
    var ro = editable ? '' : 'readonly';
    var orderRows = orders.map(function (o) {
      var fin = U.orderFin(o);
      return '<tr><td><a href="#/orders/' + o.id + '">' + o.id + '</a></td><td>' + o.createdAt + '</td>' +
        '<td class="num">' + U.fmt(fin.total) + ' ' + o.currency + '</td><td class="center">' + tag(o.status) + '</td>' +
        '<td class="center">' + tag(U.payStatus(o)) + '</td></tr>';
    }).join('') || U.emptyRow(5, '该客户暂无订单');
    return '<div class="page-head"><h2>' + (editable ? '维护客户资料' : '客户详情') + ' · ' + esc(c.nameCn) + '</h2><div class="actions">' +
      '<a class="btn" href="#/customers">返回列表</a></div></div>' +
      '<div class="card customer-register"><div class="card-title">客户资料' + (editable ? '<span class="sub">核对客户身份与联系信息后保存；仅本次会话生效</span>' : '<span class="sub">当前角色只读</span>') + '</div>' +
      '<form id="cust-form" novalidate data-customer-id="' + esc(c.id) + '" data-customer-token="' + esc(token) + '">' +
      '<div class="form-grid customer-identity">' +
      U.formItem('客户编号', '<input class="input" id="c-id" value="' + esc(c.id) + '" readonly><div class="readonly-hint">编号固定，保存只更新当前客户</div>') +
      U.formItem('合作起始', '<input class="input" id="c-since" value="' + esc(c.since) + '" readonly>') +
      '</div><div class="customer-section"><h3>企业信息</h3><div class="form-grid">' +
      U.formItem('客户中文名', '<input class="input" id="c-nameCn" value="' + esc(c.nameCn) + '" ' + ro + '>', { required: true }) +
      U.formItem('客户英文名', '<input class="input" id="c-nameEn" value="' + esc(c.nameEn) + '" ' + ro + '>', { required: true }) +
      U.formItem('国家', '<input class="input" id="c-country" value="' + esc(c.country) + '" ' + ro + '>', { required: true }) +
      U.formItem('客户等级', '<select class="select" id="c-level" ' + (editable ? '' : 'disabled') + '>' +
        ['A', 'B', 'C'].map(function (l) { return '<option value="' + l + '" ' + (c.level === l ? 'selected' : '') + '>' + l + ' 级</option>'; }).join('') + '</select>') +
      '</div></div><div class="customer-section"><h3>联系信息</h3><div class="form-grid">' +
      U.formItem('联系人', '<input class="input" id="c-contact" value="' + esc(c.contact) + '" ' + ro + '>', { required: true }) +
      U.formItem('邮箱', '<input class="input" id="c-email" type="email" value="' + esc(c.email) + '" ' + ro + ' aria-describedby="c-email-hint"><div class="readonly-hint" id="c-email-hint">核对基本邮箱格式；不验证邮箱是否真实可达</div>', { required: true }) +
      U.formItem('电话', '<input class="input" id="c-phone" value="' + esc(c.phone) + '" ' + ro + ' placeholder="可选，按客户提供的号码填写">') +
      U.formItem('地址', '<input class="input" id="c-addr" value="' + esc(c.addr) + '" ' + ro + ' placeholder="可选，填写单行地址">') +
      '</div></div>' +
      '<div class="form-item mt8"><label for="c-remark">备注</label><textarea class="textarea" id="c-remark" ' + ro + ' placeholder="可选，支持多行备注">' + esc(c.remark) + '</textarea><div class="field-error"></div></div>' +
      '<div id="cust-effect-error" class="cust-effect-error" role="alert"></div>' +
      (editable ? '<div class="form-actions"><a class="btn" href="#/customers">取 消</a><button type="submit" class="btn btn-primary" data-loading-text="保存中">保存客户资料</button></div>' : '') +
      '</form></div>' +
      '<div class="card customer-order-reference"><div class="card-title">关联订单参考（' + orders.length + '）<span class="sub">资料更新不修改已有订单交易或历史单证快照</span></div>' +
      '<div class="table-wrap"><table class="table"><thead><tr><th>订单编号</th><th>创建日期</th><th class="num">订单金额</th><th class="center">订单状态</th><th class="center">收款状态</th></tr></thead>' +
      '<tbody>' + orderRows + '</tbody></table></div></div>';
  };
  document.addEventListener('submit', function (e) {
    if (e.target.id !== 'cust-form') return;
    e.preventDefault();
    var form = e.target;
    if (savedCustomerForms.has(form)) return;
    U.clearErrors(form);
    var errors = [], ticket = customerEditTicket, actor = window.App.user;
    function issue(key, error) { errors.push({ key: key, error: error }); }
    if (!actor || actor.role !== 'sales') issue('id', '仅外贸业务员可以保存客户资料，请重新登录业务员账号。');
    else if (!U.moduleEnabled('sales', '客户与商品')) issue('id', '客户与商品模块权限已关闭，本次未保存；请联系管理员核对。');
    if (!ticket || form.dataset.customerToken !== ticket.token || form.dataset.customerId !== ticket.id) issue('id', '客户表单与资料绑定已失效，请重新打开需要修改的客户。');
    if (ticket) {
      if (actor !== ticket.actor || !actor || actor.id !== ticket.actorId || actor.name !== ticket.actorName || actor.role !== ticket.actorRole) issue('id', '当前业务员账号或会话已变化，请重新打开客户资料后核对。');
      if (location.hash !== ticket.route || ticket.route.split('?')[0] !== '#/customers/' + encodeURIComponent(ticket.id)) issue('id', '客户资料页面已变化，本次未保存，请重新打开原客户核对。');
      if (U.customer(ticket.id) !== ticket.customer || JSON.stringify(ticket.customer) !== ticket.content) issue('id', '客户对象或完整资料已变化，请重新打开该客户核对后再保存。');
      var idInput = form.querySelector('#c-id');
      if (!idInput || idInput.value !== ticket.id) issue('id', '客户编号与原资料不一致，编号只读，不可变更。');
    }
    if (!form.isConnected || document.getElementById('cust-form') !== form) issue('id', '客户表单已关闭或更换，本次未保存，请在当前页面核对。');
    var candidate = {};
    var labels = { nameCn: '客户中文名', nameEn: '客户英文名', country: '国家', contact: '联系人', email: '邮箱', phone: '电话', addr: '地址', remark: '备注', level: '客户等级' };
    Object.keys(labels).forEach(function (key) {
      var input = form.querySelector('#c-' + key), raw = input && input.value;
      if (typeof raw !== 'string') { issue(key, labels[key] + '必须为文本。'); return; }
      var text = raw.trim(); candidate[key] = text;
      if (['nameCn', 'nameEn', 'country', 'contact', 'email'].indexOf(key) >= 0 && !text) { issue(key, labels[key] + '为必填项。'); return; }
      if ((key === 'remark' ? /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/ : /[\u0000-\u001f\u007f]/).test(text)) { issue(key, labels[key] + (key === 'remark' ? '包含不支持的控制字符，请填写可读文本。' : '必须为单行可读文本，不能包含换行或控制字符。')); return; }
      if (key === 'email' && !/^[^\s@<>]+@[^\s@<>.]+(?:\.[^\s@<>.]+)+$/.test(text)) issue(key, '邮箱格式不正确，请填写如 name@example.com 的基本邮箱地址。');
      if (key === 'level' && ['A', 'B', 'C'].indexOf(text) < 0) issue(key, '客户等级只能为 A、B 或 C。');
    });
    if (errors.length) {
      var first = null;
      errors.forEach(function (problem) { var field = form.querySelector('#c-' + problem.key); if (field) { U.fieldError(field, problem.error); first = first || field; } });
      var summary = form.querySelector('#cust-effect-error');
      if (summary) summary.textContent = errors.map(function (problem) { return problem.error; }).join(' ');
      if (first) first.focus();
      U.toast('客户资料未保存，请查看表单中的处理说明。', 'error'); return;
    }
    Object.assign(ticket.customer, candidate);
    savedCustomerForms.add(form);
    if (window.App.markDraftClean) window.App.markDraftClean();
    U.toast('客户资料已保存（仅在本次会话内存中生效，刷新后还原）');
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
