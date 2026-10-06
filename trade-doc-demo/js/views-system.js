/* ============================================================
 * views-system.js — 系统管理（管理员）：用户 / 角色权限 / 基础字典
 * ============================================================ */
(function () {
  'use strict';
  var M = window.MOCK, U = window.U;
  var Views = window.Views, Actions = window.Actions;
  var esc = U.esc, tag = U.tag;

  function adminOnly(ctx) {
    return ctx.user.role === 'admin' ? null : Views.forbidden('「系统管理」仅对系统管理员开放');
  }

  /* ==================== 用户管理 ==================== */
  Views.sysUsers = function (ctx) {
    var deny = adminOnly(ctx); if (deny) return deny;
    var rows = M.users.map(function (u) {
      return '<tr><td>' + u.id + '</td><td>' + esc(u.account) + '</td><td><b>' + esc(u.name) + '</b></td>' +
        '<td>' + esc(M.roles[u.role]) + '</td><td>' + esc(u.dept) + '</td>' +
        '<td class="center"><label class="switch"><input type="checkbox" data-action="sys-toggle-user" data-id="' + u.id + '" ' + (u.enabled ? 'checked' : '') + '><span class="slider"></span></label> ' + tag(u.enabled ? '启用' : '禁用') + '</td>' +
        '<td>' + esc(u.lastLogin) + '</td>' +
        '<td><button class="btn btn-sm" data-action="sys-reset-pwd" data-id="' + u.id + '">重置密码</button></td></tr>';
    }).join('');
    return '<div class="page-head"><h2>用户管理</h2><div class="actions"><button class="btn btn-primary" data-action="sys-new-user">新建用户</button></div></div>' +
      '<div class="card table-card"><div class="table-wrap"><table class="table"><thead><tr>' +
      '<th>用户ID</th><th>账号</th><th>姓名</th><th>角色</th><th>部门</th><th class="center">状态</th><th>最近登录</th><th>操作</th>' +
      '</tr></thead><tbody>' + rows + '</tbody></table></div></div>' +
      '<div class="readonly-hint">禁用后该账号无法登录；重置密码将生成随机初始密码并通过站内信通知（演示环境仅提示）。</div>';
  };
  /* 开关使用 change 事件（checkbox） */
  document.addEventListener('change', function (e) {
    if (!e.target.dataset || e.target.dataset.action !== 'sys-toggle-user') return;
    var u = M.users.find(function (x) { return x.id === e.target.dataset.id; });
    if (!u) return;
    if (u.id === 'U001' && !e.target.checked) {
      e.target.checked = true;
      U.toast('内置管理员账号不允许禁用', 'error');
      return;
    }
    u.enabled = e.target.checked;
    U.toast('用户 ' + u.name + ' 已' + (u.enabled ? '启用' : '禁用') + '（演示数据仅本次会话生效）');
    window.App.rerender();
  });
  Actions['sys-reset-pwd'] = function (el) {
    var u = M.users.find(function (x) { return x.id === el.dataset.id; });
    U.confirm({
      title: '重置密码',
      danger: true,
      message: '确认重置用户 <b>' + esc(u.name) + '（' + esc(u.account) + '）</b> 的登录密码？重置后原密码立即失效，系统将生成随机初始密码并通知用户首次登录后修改。',
      okText: '确认重置',
      onOk: function () {
        U.toast('已重置 ' + u.name + ' 的密码，初始密码已通过站内信发送（演示）');
      }
    });
  };
  Actions['sys-new-user'] = function () {
    U.toast('演示提示：新建用户需对接企业账号体系，原型中暂未开放', 'warning');
  };

  /* ==================== 角色权限矩阵 ==================== */
  Views.sysRoles = function (ctx) {
    var deny = adminOnly(ctx); if (deny) return deny;
    var head = '<tr><th>角色 \\ 模块</th>' + M.permModules.map(function (m) { return '<th>' + esc(m) + '</th>'; }).join('') + '</tr>';
    var rows = Object.keys(M.roles).map(function (r) {
      var cells = M.permModules.map(function (m) {
        var has = (M.permMatrix[r] || []).indexOf(m) >= 0;
        return '<td><input type="checkbox" data-action="sys-perm" data-role="' + r + '" data-module="' + esc(m) + '" ' + (has ? 'checked' : '') + '></td>';
      }).join('');
      var count = (M.permMatrix[r] || []).length;
      return '<tr><td><b>' + esc(M.roles[r]) + '</b><div class="muted small">' + count + ' 个模块</div></td>' + cells + '</tr>';
    }).join('');
    return '<div class="page-head"><h2>角色权限</h2><span class="muted small">角色 × 模块 权限矩阵（演示模式，勾选仅本次会话生效）</span></div>' +
      '<div class="card table-card"><div class="table-wrap"><table class="table perm-matrix"><thead>' + head + '</thead><tbody>' + rows + '</tbody></table></div></div>' +
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
    var list = M.permMatrix[role] || (M.permMatrix[role] = []);
    var idx = list.indexOf(mod);
    if (e.target.checked && idx < 0) list.push(mod);
    if (!e.target.checked && idx >= 0) list.splice(idx, 1);
    U.toast('已更新「' + M.roles[role] + '」对「' + mod + '」的权限（演示，仅本次会话生效）');
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
    return '<div class="page-head"><h2>基础字典</h2><div class="actions"><button class="btn btn-primary" data-action="sys-new-dict">新增字典项</button></div></div>' +
      '<div class="filter-bar">' +
      '<div class="form-item"><label>字典分组</label><select class="select" id="f-group"><option value="">全部</option>' +
      groups.map(function (g) { return '<option ' + (f.group === g ? 'selected' : '') + '>' + esc(g) + '</option>'; }).join('') + '</select></div>' +
      '<div class="filter-actions"><button class="btn btn-primary" data-action="dict-filter">查 询</button><button class="btn" data-action="dict-reset">重 置</button></div></div>' +
      '<div class="table-wrap"><table class="table"><thead><tr><th class="center">#</th><th>分组</th><th>编码</th><th>显示名</th><th class="center">状态</th></tr></thead>' +
      '<tbody>' + rows + '</tbody></table></div>';
  };
  Actions['dict-filter'] = function () { window.__ui('sysDicts').filters = { group: window.__val('f-group') }; window.App.rerender(); };
  Actions['dict-reset'] = function () { window.AppUI.sysDicts = { page: 1, filters: {} }; window.App.rerender(); };
  Actions['sys-new-dict'] = function () { U.toast('演示提示：字典维护界面从略，原型仅展示只读列表', 'warning'); };
})();
