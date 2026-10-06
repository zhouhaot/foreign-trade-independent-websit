/* ============================================================
 * app.js — hash 路由 + 整体框架（顶栏 / 侧栏 / 面包屑 / 铃铛 / 会话退出）
 * ============================================================ */
(function () {
  'use strict';
  var M = window.MOCK, U = window.U;
  var Views = window.Views, Actions = window.Actions;
  var esc = U.esc;

  /* ---------------- 菜单定义（按角色过滤） ---------------- */
  var ALL_ROLES = ['admin', 'sales', 'doc', 'fin', 'boss'];
  var MENUS = [
    { label: '工作台', icon: 'home', hash: '#/dashboard', match: ['dashboard'], roles: ALL_ROLES },
    { label: '客户与商品', icon: 'users', roles: ['sales'], children: [
      { label: '客户管理', hash: '#/customers', match: ['customers'] },
      { label: '商品管理', hash: '#/products', match: ['products'] }
    ] },
    { label: '销售业务', icon: 'briefcase', roles: ['sales'], children: [
      { label: '询盘管理', hash: '#/inquiries', match: ['inquiries'] },
      { label: '报价管理', hash: '#/quotes', match: ['quotes'] },
      { label: '订单列表', hash: '#/orders', match: ['orders'] }
    ] },
    { label: '订单查询', icon: 'file', hash: '#/orders', match: ['orders'], roles: ['doc', 'fin', 'boss'] },
    { label: '单证管理', icon: 'edit', hash: '#/documents', match: ['documents'], roles: ['doc', 'boss'] },
    { label: '收款与应收', icon: 'wallet', hash: '#/payments', match: ['payments'], roles: ['fin'] },
    { label: '审核与异常', icon: 'shield', hash: '#/approvals', match: ['approvals'], roles: ['boss', 'sales', 'doc', 'fin'] },
    { label: '统计分析', icon: 'chart', hash: '#/stats', match: ['stats'], roles: ['boss'] },
    { label: '系统管理', icon: 'settings', roles: ['admin'], children: [
      { label: '用户管理', hash: '#/system/users', match: ['system', 'users'] },
      { label: '角色权限', hash: '#/system/roles', match: ['system', 'roles'] },
      { label: '基础字典', hash: '#/system/dicts', match: ['system', 'dicts'] }
    ] }
  ];

  /* ---------------- 路由表 ---------------- */
  /* roles: 允许访问的角色；缺省表示全部登录用户 */
  var ROUTES = [
    { seg: ['login'], view: 'login', bare: true, crumb: ['登录'] },
    { seg: ['dashboard'], view: 'dashboard', crumb: ['工作台'] },
    { seg: ['customers'], view: 'customers', roles: ['sales'], crumb: ['客户与商品', '客户管理'] },
    { seg: ['customers', ':id'], view: 'customerDetail', roles: ['sales'], crumb: ['客户与商品', '客户管理', '客户详情'] },
    { seg: ['products'], view: 'products', roles: ['sales'], crumb: ['客户与商品', '商品管理'] },
    { seg: ['products', ':id'], view: 'productDetail', roles: ['sales', 'doc', 'fin', 'boss'], crumb: ['客户与商品', '商品管理', '商品详情'] },
    { seg: ['inquiries'], view: 'inquiries', roles: ['sales', 'boss'], crumb: ['销售业务', '询盘管理'] },
    { seg: ['inquiries', ':id'], view: 'inquiryDetail', roles: ['sales', 'boss'], crumb: ['销售业务', '询盘管理', '询盘详情'] },
    { seg: ['quotes'], view: 'quotes', roles: ['sales', 'boss'], crumb: ['销售业务', '报价管理'] },
    { seg: ['quotes', ':id'], view: 'quoteDetail', roles: ['sales', 'boss'], crumb: ['销售业务', '报价管理', '报价详情'] },
    { seg: ['quotes', ':id', 'edit'], view: 'quoteEdit', roles: ['sales'], crumb: ['销售业务', '报价管理', '编辑报价'] },
    { seg: ['orders'], view: 'orders', roles: ['sales', 'doc', 'fin', 'boss'], crumb: ['销售业务', '订单列表'] },
    { seg: ['orders', ':id'], view: 'orderDetail', roles: ['sales', 'doc', 'fin', 'boss'], crumb: ['销售业务', '订单列表', '订单详情'] },
    { seg: ['documents'], view: 'documents', roles: ['doc', 'boss'], crumb: ['单证管理', '单证列表'] },
    { seg: ['documents', ':id'], view: 'docDetail', roles: ['doc', 'boss', 'sales', 'fin'], crumb: ['单证管理', '单证预览与审核'] },
    { seg: ['payments'], view: 'payments', roles: ['fin', 'boss'], crumb: ['收款与应收'] },
    { seg: ['approvals'], view: 'approvals', roles: ['boss', 'sales', 'doc', 'fin'], crumb: ['审核与异常处理'] },
    { seg: ['stats'], view: 'stats', roles: ['boss'], crumb: ['统计分析'] },
    { seg: ['system', 'users'], view: 'sysUsers', roles: ['admin'], crumb: ['系统管理', '用户管理'] },
    { seg: ['system', 'roles'], view: 'sysRoles', roles: ['admin'], crumb: ['系统管理', '角色权限'] },
    { seg: ['system', 'dicts'], view: 'sysDicts', roles: ['admin'], crumb: ['系统管理', '基础字典'] }
  ];

  function parseHash() {
    var raw = location.hash || '#/dashboard';
    var noHash = raw.replace(/^#/, '');
    var qIdx = noHash.indexOf('?');
    var path = qIdx >= 0 ? noHash.slice(0, qIdx) : noHash;
    var query = {};
    if (qIdx >= 0) {
      noHash.slice(qIdx + 1).split('&').forEach(function (kv) {
        var p = kv.split('=');
        if (p[0]) query[decodeURIComponent(p[0])] = decodeURIComponent(p[1] || '');
      });
    }
    var segs = path.split('/').filter(function (s) { return s !== ''; });
    return { segs: segs, query: query };
  }

  function matchRoute(segs) {
    for (var i = 0; i < ROUTES.length; i++) {
      var r = ROUTES[i];
      if (r.seg.length !== segs.length) continue;
      var params = [], ok = true;
      for (var j = 0; j < r.seg.length; j++) {
        if (r.seg[j].charAt(0) === ':') params.push(segs[j]);
        else if (r.seg[j] !== segs[j]) { ok = false; break; }
      }
      if (ok) return { route: r, params: params };
    }
    return null;
  }

  /* ---------------- 框架渲染 ---------------- */
  function renderSidebar(role, segs) {
    var html = '';
    MENUS.forEach(function (m) {
      if (m.roles.indexOf(role) < 0) return;
      if (m.children) html += '<div class="nav-group-label">' + esc(m.label) + '</div>';
      (m.children || [m]).forEach(function (item) {
        var active = matchActive(item.match, segs);
        var icons = { customers: 'users', products: 'box', inquiries: 'briefcase', quotes: 'file', orders: 'file', users: 'users', roles: 'shield', dicts: 'settings' };
        var key = item.match[item.match.length - 1];
        html += '<a class="nav-item ' + (active ? 'active' : '') + '" href="' + item.hash + '" title="' + esc(item.label) + '"' + (active ? ' aria-current="page"' : '') + '>' +
          '<span class="ico">' + U.icon(icons[key] || m.icon) + '</span><span class="nav-label">' + esc(item.label) + '</span></a>';
      });
    });
    return html;
  }
  function matchActive(match, segs) {
    if (!segs.length) return false;
    for (var i = 0; i < match.length; i++) {
      if (segs[i] !== match[i]) return false;
    }
    return true;
  }
  Actions['sidebar-toggle'] = function () {
    var main = document.querySelector('.main'), before = main.getBoundingClientRect();
    window.AppUI.sidebarCollapsed = !window.AppUI.sidebarCollapsed;
    var layout = document.querySelector('.layout');
    layout.classList.toggle('sidebar-collapsed', !!window.AppUI.sidebarCollapsed);
    var button = document.querySelector('[data-action="sidebar-toggle"]');
    button.setAttribute('aria-expanded', !window.AppUI.sidebarCollapsed);
    button.setAttribute('aria-label', window.AppUI.sidebarCollapsed ? '展开导航' : '收起导航');
    if (main.animate && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      var after = main.getBoundingClientRect();
      main.animate([{transform:'translateX(' + (before.left-after.left) + 'px)'},{transform:'none'}],{duration:220,easing:'cubic-bezier(.16,1,.3,1)'});
    }
  };

  function renderTopbar(user, crumb) {
    // 按用户 ID 读取展示资料，兼容尚未包含账号/缩写的已有演示会话。
    var profile = M.users.find(function (u) { return u.id === user.id; });
    var account = profile && profile.account || '账号未配置';
    var identityLabel = '当前用户：' + (profile ? profile.name : user.name) + '，账号：' + account;
    var todos = U.todosFor(user.role, user.name);
    var crumbHtml = crumb.map(function (c, i) {
      return (i > 0 ? '<span class="sep">/</span>' : '') +
        '<span class="' + (i === crumb.length - 1 ? 'current' : '') + '">' + esc(c) + '</span>';
    }).join('');
    var ddItems = todos.length ? todos.map(function (t) {
      return '<button class="dd-item" data-action="bell-goto" data-link="' + t.link + '">' + U.tag(t.kind) +
        '<span><span>' + esc(t.text) + '</span><span class="muted small dd-sub">' + esc(t.sub) + '</span></span></button>';
    }).join('') : '<div class="dd-empty">暂无待办提醒</div>';
    return '<button class="icon-btn" data-action="sidebar-toggle" aria-label="' + (window.AppUI.sidebarCollapsed ? '展开导航' : '收起导航') + '" aria-expanded="' + !window.AppUI.sidebarCollapsed + '">' + U.icon('panel') + '</button>' +
      '<a class="workspace-brand" href="#/dashboard">贸易协同</a>' +
      '<div class="breadcrumb">' + crumbHtml + '</div>' +
      '<div class="topbar-right">' +
        '<button class="search-trigger" data-action="search-open" aria-label="搜索页面、订单或单证">' + U.icon('search') + '<span>搜索页面、订单、单证</span><kbd>Ctrl K</kbd></button>' +
        '<span class="current-role" aria-label="当前角色：' + esc(M.roles[user.role]) + '">' + esc(M.roles[user.role]) + '</span>' +
        '<div class="bell" id="bell"><button class="icon-btn" id="bell-toggle" aria-label="待办提醒，' + todos.length + ' 项" aria-expanded="false"><span class="bell-ico">' + U.icon('bell') + '</span></button>' + (todos.length ? '<span class="badge">' + todos.length + '</span>' : '') +
          '<div class="bell-dropdown" id="bell-dd"><div class="dd-head">待办提醒<span class="muted small">' + todos.length + ' 项</span></div>' + ddItems + '</div>' +
        '</div>' +
        '<div class="user-chip" role="group" aria-label="' + esc(identityLabel) + '" title="' + esc(identityLabel) + '"><span class="avatar" aria-hidden="true">' + esc(profile && profile.initials || '—') + '</span>' +
        '<span class="user-account">' + esc(account) + '</span></div>' +
        '<button class="logout-btn" data-action="logout">退出登录</button>' +
      '</div>';
  }
  function renderFlowbar(role, segs) {
    var flows = {
      sales: [['客户', '#/customers', 'customers'], ['询盘', '#/inquiries', 'inquiries'], ['报价确认', '#/quotes', 'quotes'], ['订单执行', '#/orders', 'orders']],
      doc: [['订单数据', '#/orders', 'orders'], ['单证制作与送审', '#/documents', 'documents'], ['异常申请', '#/approvals', 'approvals']],
      fin: [['订单应收', '#/orders', 'orders'], ['收款登记', '#/payments', 'payments'], ['异常申请', '#/approvals', 'approvals']],
      boss: [['待审事项', '#/approvals', 'approvals'], ['订单跟踪', '#/orders', 'orders'], ['单证审核', '#/documents', 'documents'], ['业务分析', '#/stats', 'stats']],
      admin: [['用户', '#/system/users', 'users'], ['角色权限', '#/system/roles', 'roles'], ['基础字典', '#/system/dicts', 'dicts']]
    };
    var note = role === 'sales' ? '客户确认报价后生成订单' : role === 'doc' ? '交易数据只读 · 版本修订留痕' : role === 'fin' ? '按订单币种登记收款' : role === 'boss' ? '审核与申请人分离' : '演示环境 · 配置仅本次会话生效';
    return '<nav class="flowbar" aria-label="业务路径"><span class="flowbar-label">业务路径</span><div class="flowbar-links">' + flows[role].map(function (item, i) {
      var active = segs[0] === (role === 'admin' ? 'system' : item[2]) && (role !== 'admin' || segs[1] === item[2]);
      return '<a class="flow-step' + (active ? ' active' : '') + '" href="' + item[1] + '"' + (active ? ' aria-current="page"' : '') + '><span class="flow-index">' + (i + 1) + '</span>' + item[0] + '</a>';
    }).join('') + '</div><span class="flow-note">' + note + '</span></nav>';
  }
  Actions['bell-goto'] = function (el) { location.hash = el.dataset.link; };

  /* 仅索引当前角色可访问的本地样例，不发起接口请求。 */
  function searchEntries() {
    var role = window.App.user.role, entries = [];
    MENUS.forEach(function (m) {
      if (m.roles.indexOf(role) < 0) return;
      (m.children || [m]).forEach(function (item) { entries.push({ title: item.label, sub: '工作区页面', link: item.hash, icon: m.icon }); });
    });
    if (role !== 'admin') M.orders.forEach(function (o) {
      entries.push({ title: o.id, sub: U.customerName(o.customerId) + ' · ' + o.status, link: '#/orders/' + o.id, icon: 'briefcase' });
    });
    if (role !== 'admin') M.documents.forEach(function (d) {
      entries.push({ title: d.id, sub: d.orderId + ' · ' + d.type + ' · ' + d.status, link: '#/documents/' + d.id, icon: 'file' });
    });
    if (role === 'sales') M.customers.forEach(function (c) {
      entries.push({ title: c.nameCn, sub: c.nameEn + ' · ' + c.id, link: '#/customers/' + c.id, icon: 'users' });
    });
    return entries;
  }
  function renderSearch(value) {
    var term = value.trim().toLowerCase();
    var results = searchEntries().filter(function (item) { return !term || (item.title + item.sub).toLowerCase().indexOf(term) >= 0; }).slice(0, 9);
    window.AppUI.searchIndex = 0;
    document.getElementById('search-results').innerHTML = results.length ? results.map(function (item, i) {
      return '<button type="button" class="search-result' + (i === 0 ? ' selected' : '') + '" id="search-result-' + i + '" role="option" aria-selected="' + (i === 0) + '" data-action="search-goto" data-link="' + esc(item.link) + '">' + U.icon(item.icon) + '<span><b>' + esc(item.title) + '</b><small>' + esc(item.sub) + '</small></span>' + U.icon('arrow') + '</button>';
    }).join('') : '<div class="search-empty">没有找到相关结果<small>试试订单编号、客户名称或页面名称</small></div>';
    var input = document.getElementById('workspace-search');
    if (results.length) input.setAttribute('aria-activedescendant', 'search-result-0');
    else input.removeAttribute('aria-activedescendant');
    document.getElementById('search-status').textContent = results.length ? '显示 ' + results.length + ' 项当前角色可访问的结果' : '没有匹配的结果';
  }
  Actions['search-open'] = function () {
    if (!window.App.user) return;
    U.openModal({ title: '搜索工作区', large: true, body: '<div class="search-field">' + U.icon('search') + '<input class="input" id="workspace-search" role="combobox" aria-label="搜索页面、订单、单证或客户" aria-controls="search-results" aria-expanded="true" aria-autocomplete="list" placeholder="搜索页面、订单编号、单证或客户…" autocomplete="off"></div><div class="search-results" id="search-results" role="listbox" aria-label="搜索结果"></div><div class="search-status" id="search-status" role="status"></div>', footer: '<span class="search-help">方向键选择 · Enter 打开 · Esc 关闭</span>' });
    document.querySelector('.modal').classList.add('search-dialog');
    renderSearch('');
  };
  Actions['search-goto'] = function (el) { U.closeModal(); location.hash = el.dataset.link; };
  Actions['logout'] = function () {
    U.confirm({
      title: '退出登录',
      message: '退出后需重新登录才能进入工作台或使用其他账号。未保存的页面输入将清除；演示期间已提交的内存数据保留到页面刷新前。',
      okText: '退出登录',
      onOk: function () {
        U.closeModal();
        U.clearUser();
        window.App.user = null;
        // 保留布局偏好，清除上一身份的编辑、筛选、搜索及登录选择等临时状态。
        Object.keys(window.AppUI).forEach(function (key) {
          if (key !== 'sidebarCollapsed') delete window.AppUI[key];
        });
        location.hash = '#/login';
        render();
      }
    });
  };

  /* ---------------- 主渲染 ---------------- */
  var lastRoute = '', lastUser = '';
  function render() {
    var parsed = parseHash();
    var segs = parsed.segs;
    var app = document.getElementById('app');
    var user = U.currentUser();

    if (!segs.length) { location.hash = user ? '#/dashboard' : '#/login'; return; }
    var matched = matchRoute(segs);
    if (!matched) {
      location.hash = user ? '#/dashboard' : '#/login';
      return;
    }
    var route = matched.route;
    document.title = route.crumb[route.crumb.length - 1] + ' · 贸易协同';

    if (route.bare) {
      if (user) { location.hash = '#/dashboard'; return; }
      window.App.user = null;
      app.innerHTML = Views.login();
      lastRoute = '#/login'; lastUser = '';
      return;
    }
    if (!user) { window.App.user = null; location.hash = '#/login'; return; }
    window.App.user = user;
    if (window.AppUI.sidebarCollapsed === undefined) window.AppUI.sidebarCollapsed = true;

    var ctx = { params: matched.params, query: parsed.query, user: user };
    var body;
    if (route.roles && route.roles.indexOf(user.role) < 0) {
      body = Views.forbidden('当前角色「' + M.roles[user.role] + '」无权访问该模块。如需使用其他账号，请先退出登录，再重新登录。');
    } else {
      body = Views[route.view](ctx);
    }

    var routeChanged = lastRoute !== location.hash || lastUser !== user.id;
    var previousScroll = window.scrollY;
    var activeId = document.activeElement && document.activeElement.id;
    var layoutHtml =
      '<div class="layout ' + (window.AppUI.sidebarCollapsed ? 'sidebar-collapsed' : '') + '">' +
        '<aside class="sidebar">' +
          '<a class="logo" href="#/dashboard" aria-label="贸易协同工作台"><span class="badge-logo">' + U.icon('briefcase') + '</span><span class="logo-text">贸易协同<small>订单与单证管理</small></span></a>' +
          '<nav class="nav" aria-label="主导航">' + renderSidebar(user.role, segs) + '</nav>' +
          '<div class="sidebar-note"><span class="workspace-dot"></span><span class="nav-label">演示工作区<small>刷新后恢复样例数据</small></span></div>' +
        '</aside>' +
        '<div class="main">' +
          '<header class="topbar">' + renderTopbar(user, route.crumb) + '</header>' +
          renderFlowbar(user.role, segs) +
          '<main class="workspace route-' + esc(segs[0]) + '">' + body + '</main>' +
        '</div>' +
      '</div>';
    if (lastUser === user.id && document.querySelector('.workspace')) {
      document.querySelector('.nav').innerHTML = renderSidebar(user.role, segs);
      document.querySelector('.topbar').innerHTML = renderTopbar(user, route.crumb);
      document.querySelector('.flowbar').outerHTML = renderFlowbar(user.role, segs);
      var workspace = document.querySelector('.workspace');
      workspace.className = 'workspace route-' + esc(segs[0]);
      workspace.innerHTML = body;
    } else { app.innerHTML = layoutHtml; }
    document.querySelectorAll('.nav-item.active').forEach(function (item) { item.setAttribute('aria-current', 'page'); });
    document.querySelectorAll('.form-item').forEach(function (item) {
      var label = item.querySelector('label'), field = item.querySelector('input[id],select[id],textarea[id]');
      if (label && field) { label.setAttribute('for', field.id); if (label.classList.contains('required')) field.setAttribute('aria-required', 'true'); }
    });
    if (routeChanged) {
      window.scrollTo(0, 0);
      var content = document.querySelector('.workspace');
      content.classList.add('route-enter');
      if (content.animate && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        content.animate([{ opacity: .3, transform: 'translateY(7px)' }, { opacity: 1, transform: 'none' }], { duration: 240, easing: 'cubic-bezier(.16,1,.3,1)' });
      }
    } else {
      window.scrollTo(0, previousScroll);
      var restore = activeId && document.getElementById(activeId);
      if (restore) restore.focus({ preventScroll: true });
    }
    lastRoute = location.hash; lastUser = user.id;
  }

  window.App = {
    user: null,
    rerender: render
  };

  /* ---------------- 全局事件 ---------------- */
  /* data-action 点击委托 */
  document.addEventListener('click', function (e) {
    var el = e.target.closest('[data-action]');
    if (el) {
      var fn = Actions[el.dataset.action];
      if (fn) { fn(el, e); return; }
    }
    /* 铃铛展开/收起 */
    var bell = document.getElementById('bell');
    var dd = document.getElementById('bell-dd');
    if (bell && dd) {
      if (bell.contains(e.target)) {
        dd.classList.toggle('show');
      } else {
        dd.classList.remove('show');
      }
      document.getElementById('bell-toggle').setAttribute('aria-expanded', dd.classList.contains('show'));
    }
  });
  /* 仅登录页允许选择演示身份；已登录工作区不提供直接角色切换。 */
  document.addEventListener('change', function (e) {
    if (e.target.dataset.action === 'login-pick-role') {
      Actions['login-pick-role'](e.target, e);
      return;
    }
  });
  document.addEventListener('input', function (e) {
    if (e.target.id === 'workspace-search') renderSearch(e.target.value);
  });
  /* 键盘操作和对话框焦点限定均在全局委托，不绑在视图上。 */
  document.addEventListener('keydown', function (e) {
    if (e.isComposing || e.keyCode === 229) return;
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k' && window.App.user) {
      e.preventDefault();
      if (!document.querySelector('.modal')) Actions['search-open']();
      return;
    }
    if (e.key === 'Escape') {
      U.closeModal();
      var dropdown = document.getElementById('bell-dd');
      if (dropdown) { dropdown.classList.remove('show'); document.getElementById('bell-toggle').setAttribute('aria-expanded', 'false'); }
      return;
    }
    var modal = document.querySelector('.modal');
    if (modal && e.key === 'Tab') {
      var focusable = Array.prototype.filter.call(modal.querySelectorAll('button:not(:disabled),a[href],input:not(:disabled),select:not(:disabled),textarea:not(:disabled),[tabindex="0"]'), function (item) { return item.getClientRects().length; });
      var first = focusable[0], last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
    if (e.target.id === 'workspace-search') {
      var results = document.querySelectorAll('.search-result');
      if (!results.length) return;
      var index = window.AppUI.searchIndex || 0;
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        index = (index + (e.key === 'ArrowDown' ? 1 : -1) + results.length) % results.length;
        window.AppUI.searchIndex = index;
        results.forEach(function (item, i) { item.classList.toggle('selected', i === index); item.setAttribute('aria-selected', i === index); });
        e.target.setAttribute('aria-activedescendant', results[index].id);
        results[index].scrollIntoView({ block: 'nearest' });
      } else if (e.key === 'Enter') { e.preventDefault(); Actions['search-goto'](results[index]); }
    }
    if (e.key === 'Enter' && e.target.matches('#login-account,#login-password')) {
      e.preventDefault(); Actions['login-submit'](document.querySelector('[data-action="login-submit"]'));
    }
  });

  window.addEventListener('hashchange', render);
  render();
})();
