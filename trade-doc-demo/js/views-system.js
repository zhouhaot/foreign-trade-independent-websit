/* ============================================================
 * views-system.js — 系统管理（管理员）：用户 / 角色权限 / 基础字典
 * ============================================================ */
(function () {
  'use strict';
  var M = window.MOCK, U = window.U;
  var Views = window.Views, Actions = window.Actions;
  var esc = U.esc, tag = U.tag;

  function adminOnly(ctx) {
    return ctx.user.role === 'admin' && U.moduleEnabled('admin', '系统管理') ? null : Views.forbidden('「系统管理」仅对系统管理员开放');
  }
  function adminActor() {
    var actor = window.App.user, current = U.currentUser();
    return actor && current && actor.role === 'admin' && current.role === 'admin' && actor.id === current.id && actor.name === current.name &&
      M.users.some(function (u) { return u.id === actor.id && u.role === 'admin' && u.enabled; }) && U.moduleEnabled('admin', '系统管理') ? actor : null;
  }

  /* ==================== 用户管理 ==================== */
  Views.sysUsers = function (ctx) {
    var deny = adminOnly(ctx); if (deny) return deny;
    var rows = M.users.map(function (u) {
      return '<tr><td>' + u.id + '</td><td>' + esc(u.account) + '</td><td><b>' + esc(u.name) + '</b></td>' +
        '<td>' + esc(M.roles[u.role]) + '</td><td>' + esc(u.dept) + '</td>' +
        '<td class="center"><label class="switch"><input id="sys-enabled-' + esc(u.id) + '" aria-label="启用用户 ' + esc(u.name) + '" type="checkbox" data-action="sys-toggle-user" data-id="' + u.id + '" ' + (u.enabled ? 'checked' : '') + '><span class="slider"></span></label> ' + tag(u.enabled ? '启用' : '禁用') + '</td>' +
        '<td>' + esc(u.lastLogin) + '</td>' +
        '<td><button class="btn btn-sm" data-action="sys-reset-pwd" data-id="' + u.id + '">密码服务说明</button></td></tr>';
    }).join('');
    return '<div class="page-head"><h2>用户管理</h2><div class="actions"><button class="btn btn-unavailable" disabled title="账号服务尚未接入，不能创建企业账号">新建用户 · 未开放</button></div></div>' +
      '<div class="card table-card"><div class="table-wrap"><table class="table"><thead><tr>' +
      '<th>用户ID</th><th>账号</th><th>姓名</th><th>角色</th><th>部门</th><th class="center">状态</th><th>最近登录</th><th>操作</th>' +
      '</tr></thead><tbody>' + rows + '</tbody></table></div></div>' +
      '<div class="readonly-hint">启用与禁用仅影响本次本地会话，刷新后还原。尚未接入账号服务，不能重置密码或发送通知。</div>';
  };
  /* 开关使用 change 事件（checkbox） */
  document.addEventListener('change', function (e) {
    if (!e.target.dataset || e.target.dataset.action !== 'sys-toggle-user') return;
    if (!adminActor()) { U.toast('仅当前有效管理员可维护用户。', 'error'); window.App.rerender(); return; }
    var u = M.users.find(function (x) { return x.id === e.target.dataset.id; });
    if (!u) return;
    if (u.id === 'U001' && !e.target.checked) {
      e.target.checked = true;
      U.toast('内置管理员账号不允许禁用', 'error');
      return;
    }
    u.enabled = e.target.checked;
    U.toast('用户 ' + u.name + ' 已' + (u.enabled ? '启用' : '禁用') + '（仅本次会话生效，刷新后还原）');
    window.App.rerender();
  });
  Actions['sys-reset-pwd'] = function (el) {
    var actor = adminActor();
    if (!actor) { U.toast('仅当前有效管理员可查看密码服务说明。', 'error'); return; }
    var u = M.users.find(function (x) { return x.id === el.dataset.id; });
    if (!u) { U.toast('用户不存在，请重新核对。', 'error'); return; }
    U.confirm({
      title: '密码服务未接入',
      danger: true,
      message: '用户 <b>' + esc(u.name) + '（' + esc(u.account) + '）</b> 尚未接入账号服务。此操作不会修改密码，也不会发送通知。',
      okText: '知道了',
      onOk: function () {
        if (adminActor() !== actor || M.users.find(function (x) { return x.id === el.dataset.id; }) !== u) { U.toast('管理员会话或用户对象已变化，本次未执行。', 'error'); return; }
        U.toast('尚未接入账号服务，未修改密码，未发送通知。', 'warning');
      }
    });
  };
  Actions['sys-new-user'] = function () {
    U.toast('新建用户尚未开放，需接入企业账号服务。', 'warning');
  };

  /* ==================== 角色权限矩阵 ==================== */
  Views.sysRoles = function (ctx) {
    var deny = adminOnly(ctx); if (deny) return deny;
    var head = '<tr><th>角色 \\ 模块</th>' + M.permModules.map(function (m) { return '<th>' + esc(m) + '</th>'; }).join('') + '</tr>';
    var rows = Object.keys(M.roles).map(function (r) {
      var cells = M.permModules.map(function (m, moduleIndex) {
        var allowed = (U.moduleRoles[m] || []).indexOf(r) >= 0, locked = U.moduleLocked(r, m);
        var has = U.moduleEnabled(r, m);
        return '<td><input id="sys-perm-' + r + '-' + moduleIndex + '" type="checkbox" data-action="sys-perm" data-role="' + r + '" data-module="' + esc(m) + '" aria-label="' + esc(M.roles[r] + ' · ' + m) + '" title="' + (locked ? '核心入口不可关闭' : !allowed ? '岗位制度限制，不能授权' : '控制本次会话的导航、路由与检索') + '" ' + (has ? 'checked' : '') + (!allowed || locked ? ' disabled' : '') + '></td>';
      }).join('');
      var count = (M.permMatrix[r] || []).length;
      return '<tr><td><b>' + esc(M.roles[r]) + '</b><div class="muted small">' + count + ' 个模块</div></td>' + cells + '</tr>';
    }).join('');
    return '<div class="page-head"><h2>角色权限</h2><span class="muted small">角色 × 模块 权限矩阵（勾选仅本次会话生效）</span></div>' +
      '<div class="card table-card"><div class="table-wrap"><table class="table perm-matrix"><thead>' + head + '</thead><tbody>' + rows + '</tbody></table></div></div>' +
      '<div class="readonly-hint">勾选实时影响本次会话的导航、路由与搜索；工作台与管理员系统入口不可关闭。岗位制度禁止的模块不可勾选，原审批、制单与财务写入资格保持不变。刷新后还原默认配置。</div>' +
      '<div class="card"><div class="card-title">关键权限约束（制度要求）</div>' +
      '<div class="timeline">' +
      '<div class="tl-item"><div class="tl-content"><b>不能自制自审：</b>单证审核人与制单人不得为同一人；异常申请的审批人不得为申请人本人。</div></div>' +
      '<div class="tl-item"><div class="tl-content"><b>系统管理员无业务审批权：</b>管理员仅维护用户、角色与字典，不参与任何业务单据审批。</div></div>' +
      '<div class="tl-item"><div class="tl-content"><b>单证员只读交易数据：</b>订单带入的客户、商品、金额等核心交易字段对单证员只读，仅包装与备注类字段可编辑。</div></div>' +
      '<div class="tl-item"><div class="tl-content"><b>财务人员不修改成交数据：</b>财务仅登记收款、查看应收，不可修改订单成交信息。</div></div>' +
      '</div></div>';
  };
  document.addEventListener('change', function (e) {
    if (!e.target.dataset || e.target.dataset.action !== 'sys-perm') return;
    var role = e.target.dataset.role, mod = e.target.dataset.module;
    if (!adminActor() || !Object.prototype.hasOwnProperty.call(M.roles, role) || M.permModules.indexOf(mod) < 0 ||
      (U.moduleRoles[mod] || []).indexOf(role) < 0 || U.moduleLocked(role, mod)) {
      U.toast('当前账号或岗位制度不允许修改此权限。', 'error'); window.App.rerender(); return;
    }
    var list = M.permMatrix[role] || (M.permMatrix[role] = []);
    var idx = list.indexOf(mod);
    if (e.target.checked && idx < 0) list.push(mod);
    if (!e.target.checked && idx >= 0) list.splice(idx, 1);
    U.toast('已更新「' + M.roles[role] + '」对「' + mod + '」的权限（仅本次会话生效）');
    window.App.rerender();
  });

  /* ==================== 基础字典 ==================== */
  Views.sysDicts = function (ctx) {
    var deny = adminOnly(ctx); if (deny) return deny;
    var s = window.__ui('sysDicts'), f = s.filters;
    var groups = M.dicts.map(function (d) { return d.group; }).filter(function (v, i, a) { return a.indexOf(v) === i; });
    var list = M.dicts.filter(function (d) {
      if (f.group && d.group !== f.group) return false;
      return true;
    });
    var rows = list.map(function (d, i) {
      return '<tr><td class="center">' + (i + 1) + '</td><td>' + esc(d.group) + '</td><td>' + esc(d.code) + '</td>' +
        '<td>' + esc(d.label) + '</td><td class="center">' + tag(d.enabled ? '启用' : '禁用') + '</td></tr>';
    }).join('') || U.emptyRow(5, '没有符合筛选条件的字典项');
    return '<div class="page-head"><h2>基础字典</h2><div class="actions"><button class="btn btn-unavailable" disabled title="字典维护尚未开放，目前仅可读取列表">新增字典项 · 未开放</button></div></div>' +
      '<div class="filter-bar">' +
      '<div class="form-item"><label>字典分组</label><select class="select" id="f-group"><option value="">全部</option>' +
      groups.map(function (g) { return '<option ' + (f.group === g ? 'selected' : '') + '>' + esc(g) + '</option>'; }).join('') + '</select></div>' +
      '<div class="filter-actions"><button class="btn btn-primary" data-action="dict-filter">查 询</button><button class="btn" data-action="dict-reset">重 置</button></div></div>' +
      '<div class="table-wrap"><table class="table"><thead><tr><th class="center">#</th><th>分组</th><th>编码</th><th>显示名</th><th class="center">状态</th></tr></thead>' +
      '<tbody>' + rows + '</tbody></table></div>';
  };
  Actions['dict-filter'] = function () { window.__ui('sysDicts').filters = { group: window.__val('f-group') }; window.App.rerender(); };
  Actions['dict-reset'] = function () { window.AppUI.sysDicts = { page: 1, filters: {} }; window.App.rerender(); };
  Actions['sys-new-dict'] = function () { U.toast('字典维护尚未开放，目前仅可读取列表。', 'warning'); };
})();
