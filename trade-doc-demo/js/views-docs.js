/* ============================================================
 * views-docs.js — 单证管理：列表 + 三栏（单证列表 / 文档预览 / 业务操作）
 * 仅实现商业发票（CI）与装箱单（PL）两类，预览为 HTML 排版（非图片占位）
 * ============================================================ */
(function () {
  'use strict';
  var M = window.MOCK, U = window.U;
  var Views = window.Views, Actions = window.Actions;
  var ui = window.__ui, esc = U.esc, tag = U.tag, val = window.__val;

  function sortedDocs() {
    return M.documents.slice().sort(function (a, b) { return b.updatedAt.localeCompare(a.updatedAt) || b.version - a.version; });
  }
  function canEditDoc(d, user) {
    return !!(d && user && user.role === 'doc' && ['草稿', '制作中', '已退回'].indexOf(d.status) >= 0);
  }
  function nextDocVersion(d) {
    return Math.max.apply(null, M.documents.filter(function (x) {
      return x.no === d.no && x.orderId === d.orderId && x.type === d.type;
    }).map(function (x) { return x.version; })) + 1;
  }
  /* 根据订单最新版本单证状态回写订单单证状态 */
  function syncOrderDocStatus(orderId) {
    var order = U.order(orderId);
    if (!order) return;
    var latest = {};
    M.documents.filter(function (d) { return d.orderId === orderId; }).forEach(function (d) {
      if (!latest[d.type] || d.version > latest[d.type].version) latest[d.type] = d;
    });
    var arr = Object.keys(latest).map(function (k) { return latest[k]; });
    if (!arr.length) order.docStatus = '未开始';
    else if (arr.length >= 2 && arr.every(function (d) { return d.status === '已通过'; })) order.docStatus = '已通过';
    else if (arr.some(function (d) { return d.status === '待审核'; })) order.docStatus = '待审核';
    else order.docStatus = '制作中';
  }
  window.__syncOrderDocStatus = syncOrderDocStatus;

  /* ==================== 单证列表 ==================== */
  Views.documents = function () {
    var s = ui('documents'), f = s.filters;
    var list = sortedDocs().filter(function (d) {
      if (f.kw && (d.no + d.orderId).toLowerCase().indexOf(f.kw.toLowerCase()) < 0) return false;
      if (f.type && d.type !== f.type) return false;
      if (f.status && d.status !== f.status) return false;
      return true;
    });
    var pg = U.page(list, s.page);
    var rows = pg.rows.map(function (d) {
      var customer = U.documentSnapshot(d).customer;
      return '<tr><td class="center">' + tag(U.docTypeName(d.type)) + '</td>' +
        '<td><a href="#/documents/' + d.id + '"><b>' + d.no + '</b></a></td>' +
        '<td class="center">V' + d.version + '</td>' +
        '<td><a href="#/orders/' + d.orderId + '">' + d.orderId + '</a></td>' +
        '<td>' + esc(customer.nameCn + '（' + customer.nameEn + '）') + '</td>' +
        '<td class="center">' + tag(d.status) + '</td>' +
        '<td>' + esc(d.maker) + '</td><td>' + esc(d.updatedAt) + '</td>' +
        '<td><a class="btn btn-sm" href="#/documents/' + d.id + '">' + (window.App.user.role === 'boss' && d.status === '待审核' ? '去审核' : '预览') + '</a></td></tr>';
    }).join('');
    var hasFilter = f.kw || f.type || f.status;
    if (!rows) rows = U.emptyRow(9, hasFilter ? '没有符合筛选条件的结果' : '暂无单证记录');
    function sel(id, cur, opts, labels) {
      return '<select class="select" id="' + id + '"><option value="">全部</option>' +
        opts.map(function (v, i) { return '<option value="' + v + '" ' + (cur === v ? 'selected' : '') + '>' + (labels ? labels[i] : v) + '</option>'; }).join('') + '</select>';
    }
    return '<div class="page-head"><h2>单证管理</h2><div class="actions">' +
      '<span class="muted small">支持商业发票与装箱单；审核通过后方可导出</span></div></div>' +
      '<div class="filter-bar">' +
      window.__filterInput('单证编号/订单号', 'f-kw', f.kw, '输入关键字') +
      '<div class="form-item"><label>单证类型</label>' + sel('f-type', f.type, ['CI', 'PL'], ['商业发票', '装箱单']) + '</div>' +
      '<div class="form-item"><label>状态</label>' + sel('f-status', f.status, ['草稿', '制作中', '待审核', '已通过', '已退回']) + '</div>' +
      '<div class="filter-actions"><button class="btn btn-primary" data-action="doc-filter">查 询</button><button class="btn" data-action="doc-reset">重 置</button></div></div>' +
      '<div class="table-toolbar"><h3>单证台账<span class="record-count">' + list.length + ' 个版本</span></h3><span class="muted small">同一单证的修订版本分别留存</span></div>' +
      '<div class="table-wrap"><table class="table"><thead><tr>' +
      '<th class="center">类型</th><th>单证编号</th><th class="center">版本</th><th>关联订单</th><th>客户</th><th class="center">状态</th><th>制单人</th><th>更新时间</th><th>操作</th>' +
      '</tr></thead><tbody>' + rows + '</tbody></table></div>' +
      U.pagination(pg, 'doc-page');
  };
  Actions['doc-filter'] = function () { var s = ui('documents'); s.filters = { kw: val('f-kw'), type: val('f-type'), status: val('f-status') }; s.page = 1; window.App.rerender(); };
  Actions['doc-reset'] = function () { window.AppUI.documents = { page: 1, filters: {} }; window.App.rerender(); };
  Actions['doc-page'] = function (el) { ui('documents').page = +el.dataset.page; window.App.rerender(); };

  /* ==================== 单证预览与审核（三栏） ==================== */
  Views.docDetail = function (ctx) {
    var d = U.doc(ctx.params[0]);
    if (!d) return Views.notFound('单证不存在：' + ctx.params[0]);
    var snapshot = U.documentSnapshot(d), order = snapshot.order;
    var role = ctx.user.role;
    var editing = canEditDoc(d, ctx.user) && window.AppUI.docEditing === d.id;

    /* 左：单证选择列表 */
    var leftItems = sortedDocs().map(function (x) {
      return '<button class="doc-item ' + (x.id === d.id ? 'active' : '') + '" data-action="doc-goto" data-id="' + x.id + '" aria-pressed="' + (x.id === d.id) + '">' +
        '<div class="d-no"><span>' + x.no + ' <span class="muted">V' + x.version + '</span></span>' + tag(x.status) + '</div>' +
        '<div class="d-sub"><span>' + U.docTypeName(x.type) + '</span><span>' + x.orderId + '</span></div></button>';
    }).join('');

    /* 中：状态横幅 + 纸张预览 */
    var banner = '';
    if (d.status === '已退回') banner = '<div class="doc-status-banner reject"><b>已退回：</b>' + esc(d.opinion || '') + '（' + esc(d.approver || '') + ' · ' + esc(d.approvedAt || '') + '）' + (role === 'doc' ? '<br>请按意见修订后重新提交审核，或申请重新制单生成新版本。' : '') + '</div>';
    else if (d.status === '已通过') banner = '<div class="doc-status-banner approve"><b>审核通过：</b>' + esc(d.opinion || '同意') + '（' + esc(d.approver || '') + ' · ' + esc(d.approvedAt || '') + '），本版本可导出。</div>';
    else if (d.status === '待审核') banner = '<div class="doc-status-banner review"><b>待审核：</b>制单人 ' + esc(d.maker) + ' 已于 ' + esc(d.submittedAt) + ' 提交审核，等待业务主管处理。</div>';
    else banner = '<div class="doc-status-banner draft"><b>' + (d.status === '草稿' ? '草稿' : '制作中') + '：</b>单证尚未送审。订单带入的客户、商品、金额等交易数据只读；唛头、包装与备注字段可编辑。</div>';

    var paper = d.type === 'CI' ? renderCI(d, order, editing) : renderPL(d, order, editing);

    /* 审核留痕 */
    var history = d.history.slice().sort(function (a, b) { return b.time.localeCompare(a.time); }).map(function (h) {
      return '<div class="tl-item"><div class="tl-meta"><span>' + esc(h.time) + '</span><span>' + esc(h.person) + '</span></div>' +
        '<div class="tl-content">' + esc(h.action) + '</div>' +
        (h.opinion ? '<div class="tl-opinion">' + esc(h.opinion) + '</div>' : '') + '</div>';
    }).join('');

    /* 右：业务操作区（角色差异） */
    var right = rightPanel(d, order, role, editing);

    return '<div class="page-head"><div><h2>' + U.docTypeName(d.type) + ' · ' + d.no + ' <span class="doc-version">V' + d.version + '</span> ' + tag(d.status) + '</h2>' +
      '<p class="page-description">关联订单 ' + d.orderId + ' · 制单人 ' + esc(d.maker) + ' · 本版本交易数据已冻结</p></div>' +
      '<div class="actions"><button class="btn" data-action="doc-focus" aria-pressed="' + !!window.AppUI.docFocus + '">' + U.icon('expand') + '<span>' + (window.AppUI.docFocus ? '显示单证目录' : '专注预览') + '</span></button><a class="btn" href="#/documents">返回列表</a></div></div>' +
      '<div class="doc-layout ' + (window.AppUI.docFocus ? 'is-focused' : '') + '">' +
        '<div class="doc-list-panel"><div class="panel-head">单证选择<span class="muted small">' + M.documents.length + ' 份</span></div>' + leftItems + '</div>' +
        '<div class="doc-center">' + banner +
          '<div class="preview-toolbar"><b>单证预览</b><span>' + (editing ? '编辑唛头、包装与备注' : '交易字段只读') + '</span></div>' +
          '<div class="doc-preview-wrap"><div class="paper-wrap">' + paper + (d.status === '已通过' ? '<div class="p-stamp">审核通过<br>APPROVED</div>' : '') + '</div></div>' +
          '<div class="card mt16"><div class="card-title">审核与操作留痕</div><div class="timeline">' + history + '</div></div>' +
        '</div>' +
        '<div class="doc-action-panel"><div class="panel-head">业务操作</div><div class="panel-body">' + right + '</div></div>' +
      '</div>';
  };
  Actions['doc-goto'] = function (el) { location.hash = '#/documents/' + el.dataset.id; };
  Actions['doc-focus'] = function (el) {
    window.AppUI.docFocus = !window.AppUI.docFocus;
    document.querySelector('.doc-layout').classList.toggle('is-focused', window.AppUI.docFocus);
    el.setAttribute('aria-pressed', window.AppUI.docFocus);
    el.querySelector('span').textContent = window.AppUI.docFocus ? '显示单证目录' : '专注预览';
  };

  function rightPanel(d, order, role, editing) {
    var html = '';
    var snapshot = U.documentSnapshot(d);
    html += '<div class="ablock"><div class="ab-title">单据信息</div>' +
      '<div class="small">类型：' + U.docTypeName(d.type) + '<br>编号：' + d.no + ' V' + d.version + '<br>关联订单：<a href="#/orders/' + d.orderId + '">' + d.orderId + '</a><br>制单人：' + esc(d.maker) + '<br>更新：' + esc(d.updatedAt) + '</div></div>';
    html += '<div class="ablock"><div class="ab-title">交易数据来源</div><div class="small">' +
      (snapshot.basis === 'demo-baseline' ? '样例基线·非历史签发记录' : '创建时交易快照') +
      '<br>冻结时间：<span title="' + esc(snapshot.capturedAt) + '">' + esc(new Date(snapshot.capturedAt).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai', hour12: false })) + '（北京时间）</span></div>' +
      '<details class="snapshot-rules"><summary>查看冻结规则</summary><div class="readonly-hint">' +
      (snapshot.basis === 'demo-baseline' ? '本次页面加载时冻结当前样例交易基线，无法还原历史签发数据。' : '快照保存创建此交易快照时的订单与主数据。') +
      '<br>包装与备注修订沿用原版交易快照和冻结时间；订单或客户、商品、卖方信息更新不会改变本版本。旧版本保留，新版本重新审核。重新制单采用创建新快照时的当前交易信息。</div></details></div>';

    if (role === 'doc') {
      if (d.status === '已通过') {
        html += '<div class="ablock"><div class="ab-title">受控修订</div>' +
          '<button class="btn" data-action="doc-revise" data-id="' + d.id + '" aria-label="修订包装与备注，生成新版本 V' + nextDocVersion(d) + '">修订包装与备注 · V' + nextDocVersion(d) + '</button>' +
          '<div class="readonly-hint">本操作仅修订唛头、包装与备注，沿用此版本交易快照，原版本保留，新版本重新审核。</div></div>';
      } else if (d.status === '制作中' || d.status === '草稿' || d.status === '已退回') {
        if (editing) {
          html += '<div class="ablock"><div class="ab-title">编辑中</div>' +
            '<button class="btn" data-action="doc-save-draft" data-id="' + d.id + '">保存草稿</button>' +
            '<button class="btn btn-primary" data-action="doc-submit" data-id="' + d.id + '">提交审核</button>' +
            '<button class="btn" data-action="doc-cancel-edit">放弃修改</button></div>';
        } else {
          html += '<div class="ablock"><div class="ab-title">制单操作</div>' +
            '<button class="btn" data-action="doc-edit" data-id="' + d.id + '">编辑</button>' +
            '<button class="btn btn-primary" data-action="doc-submit" data-id="' + d.id + '">提交审核</button></div>';
        }
        if (d.status === '已退回') {
          html += '<div class="ablock"><div class="ab-title">退回意见</div><div class="small" style="line-height:1.7">' + esc(d.opinion || '') + '</div>' +
            '<button class="btn mt8" data-action="doc-reform" data-id="' + d.id + '">申请重新制单</button></div>';
        }
      }
    } else if (role === 'boss') {
      if (d.status === '待审核') {
        if (d.maker === window.App.user.name) {
          html += '<div class="ablock"><div class="ab-title">审核操作</div><div class="readonly-hint">制度要求「不能自制自审」，本单证由您本人制作，请转交其他主管审核。</div></div>';
        } else {
          html += '<div class="ablock"><div class="ab-title">审核意见</div>' +
            '<textarea class="textarea" id="audit-opinion" placeholder="通过可不填；退回必须填写具体修改意见"></textarea></div>' +
            '<div class="ablock"><button class="btn btn-success" data-action="doc-approve" data-id="' + d.id + '">审核通过</button>' +
            '<button class="btn btn-danger" data-action="doc-reject" data-id="' + d.id + '">退回修改</button></div>';
        }
      } else {
        html += '<div class="ablock"><div class="ab-title">审核操作</div><div class="readonly-hint">当前状态为「' + d.status + '」，无需审核。</div></div>';
      }
    } else {
      html += '<div class="ablock"><div class="ab-title">操作</div><div class="readonly-hint">当前角色对单证为只读查看。</div></div>';
    }

    /* 导出：仅审核通过可用 */
    var canExport = d.status === '已通过';
    html += '<div class="ablock"><div class="ab-title">导出</div>' +
      '<button class="btn ' + (canExport ? 'btn-primary' : '') + '" data-action="doc-export" data-id="' + d.id + '" ' + (canExport ? '' : 'disabled') + '>导出 PDF' + (canExport ? '' : '（需审核通过）') + '</button></div>';
    return html;
  }

  /* ---------- 预览排版：商业发票 ---------- */
  function renderCI(d, order, editing) {
    var snapshot = U.documentSnapshot(d), S = snapshot.seller, cust = snapshot.customer;
    var total = U.orderTotal(order);
    var rows = order.items.map(function (it, i) {
      var p = it.product;
      return '<tr><td class="c">' + (i + 1) + '</td>' +
        '<td>' + esc(p.nameEn) + '<br><span style="color:#5a6378">' + esc(p.nameCn) + ' · ' + esc(p.spec) + '</span></td>' +
        '<td class="c">' + it.qty + ' ' + esc(p.unit) + '</td>' +
        '<td class="r">' + U.fmt(it.price) + '</td>' +
        '<td class="r">' + U.fmt(it.qty * it.price) + '</td></tr>';
    }).join('');
    var marksHtml = editing
      ? '<textarea class="edit-area" id="df-marks">' + esc(d.marks) + '</textarea>'
      : esc(d.marks);
    var remarkHtml = editing
      ? '<textarea class="edit-area" id="df-remark">' + esc(d.remark) + '</textarea>'
      : esc(d.remark || '—');
    return '<div class="paper">' +
      '<div class="p-title">商 业 发 票</div><div class="p-title-en">COMMERCIAL INVOICE</div>' +
      '<div class="p-two-col">' +
        '<div class="p-box"><div class="pb-label">卖方 Seller</div><div class="pb-name">' + esc(S.nameEn) + '</div>' +
          '<div class="pb-line">' + esc(S.nameCn) + '</div><div class="pb-line">' + esc(S.addrEn) + '</div><div class="pb-line">TEL: ' + esc(S.tel) + '</div></div>' +
        '<div class="p-box"><div class="pb-label">买方 Buyer</div><div class="pb-name">' + esc(cust.nameEn) + '</div>' +
          '<div class="pb-line">' + esc(cust.nameCn) + '</div><div class="pb-line">' + esc(cust.addr) + '</div><div class="pb-line">ATTN: ' + esc(cust.contact) + '</div></div>' +
      '</div>' +
      '<table class="p-meta"><tr>' +
        '<td><div class="k">发票号 Invoice No.</div>' + d.no + '</td>' +
        '<td><div class="k">发票日期 Date</div>' + esc(d.updatedAt) + '</td>' +
        '<td><div class="k">订单号 Order No.</div>' + order.id + '</td>' +
        '<td><div class="k">贸易术语 Terms</div>' + esc(order.tradeTerm) + '</td>' +
        '<td><div class="k">币种 Currency</div>' + order.currency + '</td>' +
      '</tr></table>' +
      '<div class="pb-label">唛头 Shipping Marks</div><div class="p-marks">' + marksHtml + '</div>' +
      '<table class="p-items"><thead><tr><th style="width:36px">NO.</th><th>品名描述 DESCRIPTION</th><th style="width:90px">数量 QTY</th><th style="width:100px">单价 UNIT PRICE<br>(' + order.currency + ')</th><th style="width:110px">金额 AMOUNT<br>(' + order.currency + ')</th></tr></thead>' +
      '<tbody>' + rows +
      '<tr><td colspan="4" class="r"><b>TOTAL</b></td><td class="r"><b>' + U.fmt(total) + '</b></td></tr></tbody></table>' +
      '<div class="p-total-words">SAY TOTAL ' + order.currency + ' ' + U.fmt(total) + ' ONLY.</div>' +
      '<div class="pb-label">备注 Remark</div><div class="p-remark">' + remarkHtml + '</div>' +
      '<div class="p-sign"><div><div>制单 Prepared by：' + esc(d.maker) + '</div><div class="s-line">' + esc(S.nameEn) + '</div></div>' +
      '<div><div>审核 Approved by：' + esc(d.approver || '（待审核）') + '</div><div class="s-line">授权签字 Authorized Signature</div></div></div>' +
      '</div>';
  }

  /* ---------- 预览排版：装箱单 ---------- */
  function renderPL(d, order, editing) {
    var snapshot = U.documentSnapshot(d), S = snapshot.seller, cust = snapshot.customer;
    var rows = order.items.map(function (it, i) {
      var p = it.product;
      return '<tr><td class="c">' + (i + 1) + '</td>' +
        '<td>' + esc(p.nameEn) + '<br><span style="color:#5a6378">' + esc(p.nameCn) + ' · ' + esc(p.spec) + '</span></td>' +
        '<td class="c">' + it.qty + ' ' + esc(p.unit) + '</td></tr>';
    }).join('');
    var pk = d.packing;
    function pf(key, val) {
      return editing ? '<input class="edit-field" id="df-pk-' + key + '" value="' + esc(val) + '">' : esc(val);
    }
    var marksHtml = editing
      ? '<textarea class="edit-area" id="df-marks">' + esc(d.marks) + '</textarea>'
      : esc(d.marks);
    var remarkHtml = editing
      ? '<textarea class="edit-area" id="df-remark">' + esc(d.remark) + '</textarea>'
      : esc(d.remark || '—');
    return '<div class="paper">' +
      '<div class="p-title">装 箱 单</div><div class="p-title-en">PACKING LIST</div>' +
      '<div class="p-two-col">' +
        '<div class="p-box"><div class="pb-label">发货人 Shipper</div><div class="pb-name">' + esc(S.nameEn) + '</div>' +
          '<div class="pb-line">' + esc(S.addrEn) + '</div></div>' +
        '<div class="p-box"><div class="pb-label">收货人 Consignee</div><div class="pb-name">' + esc(cust.nameEn) + '</div>' +
          '<div class="pb-line">' + esc(cust.addr) + '</div></div>' +
      '</div>' +
      '<table class="p-meta"><tr>' +
        '<td><div class="k">装箱单号 P/L No.</div>' + d.no + '</td>' +
        '<td><div class="k">日期 Date</div>' + esc(d.updatedAt) + '</td>' +
        '<td><div class="k">订单号 Order No.</div>' + order.id + '</td>' +
        '<td><div class="k">发票号 Invoice No.</div>' + d.no.replace('PL', 'CI') + '</td>' +
      '</tr></table>' +
      '<div class="pb-label">唛头 Shipping Marks</div><div class="p-marks">' + marksHtml + '</div>' +
      '<table class="p-items"><thead><tr><th style="width:36px">NO.</th><th>品名描述 DESCRIPTION</th><th style="width:110px">数量 QTY</th></tr></thead>' +
      '<tbody>' + rows + '</tbody></table>' +
      '<table class="p-items"><thead><tr><th>包装件数 PACKAGES</th><th>包装方式 PACKAGE</th><th>毛重 G.W.</th><th>净重 N.W.</th><th>尺码 MEAS.</th></tr></thead>' +
      '<tbody><tr><td class="c">' + pf('cartons', pk.cartons) + '</td><td class="c">' + pf('package', pk.package) + '</td>' +
      '<td class="c">' + pf('gw', pk.gw) + '</td><td class="c">' + pf('nw', pk.nw) + '</td><td class="c">' + pf('meas', pk.meas) + '</td></tr></tbody></table>' +
      '<div class="pb-label">备注 Remark</div><div class="p-remark">' + remarkHtml + '</div>' +
      '<div class="p-sign"><div><div>制单 Prepared by：' + esc(d.maker) + '</div><div class="s-line">' + esc(S.nameEn) + '</div></div>' +
      '<div><div>审核 Approved by：' + esc(d.approver || '（待审核）') + '</div><div class="s-line">授权签字 Authorized Signature</div></div></div>' +
      '</div>';
  }

  /* ---------- 读取编辑字段并写回 ---------- */
  function collectEditValues(d) {
    var marks = document.getElementById('df-marks');
    var remark = document.getElementById('df-remark');
    if (marks) d.marks = marks.value.trim();
    if (remark) d.remark = remark.value.trim();
    ['cartons', 'package', 'gw', 'nw', 'meas'].forEach(function (k) {
      var el = document.getElementById('df-pk-' + k);
      if (el) d.packing[k] = k === 'cartons' ? (Number(el.value) || el.value) : el.value.trim();
    });
    d.updatedAt = U.today();
  }

  Actions['doc-edit'] = function (el) {
    var d = U.doc(el.dataset.id);
    if (!canEditDoc(d, window.App.user)) {
      U.toast('仅单证员可编辑草稿、制作中或已退回的单证', 'warning');
      return;
    }
    window.AppUI.docEditing = el.dataset.id;
    window.App.rerender();
    U.toast('已进入编辑模式：仅唛头、包装与备注字段可修改，订单带入数据只读', 'info');
  };
  Actions['doc-cancel-edit'] = function () {
    window.AppUI.docEditing = null;
    window.App.rerender();
  };
  Actions['doc-save-draft'] = function (el) {
    var d = U.doc(el.dataset.id);
    if (!canEditDoc(d, window.App.user) || window.AppUI.docEditing !== d.id) {
      U.toast('无法保存：请由单证员进入可编辑版本的编辑模式', 'warning');
      return;
    }
    var btn = el;
    var saved = false;
    U.withLoading(btn, function () {
      if (!canEditDoc(d, window.App.user) || window.AppUI.docEditing !== d.id) return;
      collectEditValues(d);
      d.history.push({ time: U.now(), person: window.App.user.name, action: '保存草稿（修订唛头/包装/备注）', opinion: '' });
      window.AppUI.docEditing = null;
      saved = true;
    });
    setTimeout(function () { if (saved) { U.toast('草稿已保存'); window.App.rerender(); } }, 480);
  };
  Actions['doc-submit'] = function (el) {
    var d = U.doc(el.dataset.id);
    var doSubmit = function () {
      if (window.AppUI.docEditing === d.id) collectEditValues(d);
      d.status = '待审核';
      d.submittedAt = U.today();
      d.history.push({ time: U.now(), person: window.App.user.name, action: '提交审核', opinion: '' });
      M.approvals.unshift({
        id: 'AP' + U.today().replace(/-/g, '') + String(M.approvals.length + 1),
        type: '单证审核', targetType: 'doc', targetId: d.id,
        title: U.docTypeName(d.type) + ' ' + d.no + ' V' + d.version + '（订单 ' + d.orderId + '）审核',
        applicant: window.App.user.name, applyTime: U.now(), reason: '',
        status: '待处理', handler: null, handleTime: null, opinion: null
      });
      syncOrderDocStatus(d.orderId);
      window.AppUI.docEditing = null;
    };
    U.confirm({
      title: '提交审核',
      message: '确认将 <b>' + U.docTypeName(d.type) + ' ' + d.no + ' V' + d.version + '</b> 提交业务主管审核？提交后在审核完成前不可再编辑。',
      okText: '提交审核',
      onOk: function () {
        doSubmit();
        U.toast('已提交审核，等待业务主管处理');
        setTimeout(window.App.rerender, 50);
      }
    });
  };
  /* 已审核单证修改 → 受控修订，生成新版本 */
  Actions['doc-revise'] = function (el) {
    var d = U.doc(el.dataset.id);
    if (!d || d.status !== '已通过' || !window.App.user || window.App.user.role !== 'doc') {
      U.toast('仅单证员可对审核通过的单证发起受控修订', 'warning');
      return;
    }
    var version = nextDocVersion(d), completed = false, actor = window.App.user;
    U.confirm({
      title: '受控修订确认',
      message: '单证 <b>' + d.no + ' V' + d.version + '</b> 已审核通过。<br>确认将<b>生成新版本 V' + version + '</b>（草稿），仅修订唛头、包装与备注，<b>沿用 V' + d.version + ' 交易快照</b>。原版本保留，新版本需重新审核。',
      okText: '生成 V' + version,
      onOk: function () {
        if (completed || d.status !== '已通过' || window.App.user !== actor || actor.role !== 'doc') return false;
        if (nextDocVersion(d) !== version) {
          U.toast('单证版本已变化，请关闭后重新发起修订', 'warning');
          return false;
        }
        var nd = JSON.parse(JSON.stringify(d));
        nd.id = 'D-' + d.no + '-V' + version;
        nd.version = version;
        nd.status = '草稿';
        nd.createdAt = U.today(); nd.updatedAt = U.today();
        nd.submittedAt = null; nd.approver = null; nd.approvedAt = null; nd.opinion = null;
        nd.history = [{ time: U.now(), person: window.App.user.name, action: '创建单证 V' + nd.version + '（受控修订，基于 V' + d.version + '）', opinion: '' }];
        nd.remark = (nd.remark ? nd.remark + '；' : '') + 'V' + nd.version + '：受控修订';
        U.inheritDocumentSnapshot(nd, d);
        M.documents.push(nd);
        completed = true;
        syncOrderDocStatus(d.orderId);
        U.toast('已生成新版本 ' + d.no + ' V' + nd.version + '（草稿）');
        location.hash = '#/documents/' + nd.id;
      }
    });
  };
  /* 退回后申请重新制单 */
  Actions['doc-reform'] = function (el) {
    var d = U.doc(el.dataset.id);
    U.confirm({
      title: '申请重新制单',
      message: '将针对 <b>' + d.no + ' V' + d.version + '</b> 提交「重新制单申请」，由业务主管审批后生成新版本。退回意见：' + esc(d.opinion || ''),
      okText: '提交申请',
      onOk: function () {
        M.approvals.unshift({
          id: 'AP' + U.today().replace(/-/g, '') + String(M.approvals.length + 1),
          type: '重新制单申请', targetType: 'doc', targetId: d.id,
          title: U.docTypeName(d.type) + ' ' + d.no + ' 申请重新制单',
          applicant: window.App.user.name, applyTime: U.now(),
          reason: '因审核退回申请重新制单：' + (d.opinion || ''),
          status: '待处理', handler: null, handleTime: null, opinion: null
        });
        U.toast('重新制单申请已提交');
      }
    });
  };
  /* 主管审核：通过 / 退回 */
  function doAudit(el, pass) {
    var d = U.doc(el.dataset.id);
    var opinionEl = document.getElementById('audit-opinion');
    var opinion = opinionEl ? opinionEl.value.trim() : '';
    if (!pass && !opinion) {
      if (opinionEl) { opinionEl.classList.add('is-error'); opinionEl.focus(); }
      U.toast('退回修改必须填写具体审核意见', 'error');
      return;
    }
    U.confirm({
      title: pass ? '审核通过确认' : '退回修改确认',
      danger: !pass,
      message: pass
        ? '确认通过 <b>' + U.docTypeName(d.type) + ' ' + d.no + ' V' + d.version + '</b>？通过后该版本可导出，后续修改须走受控修订。'
        : '确认退回 <b>' + U.docTypeName(d.type) + ' ' + d.no + ' V' + d.version + '</b>？退回后制单人需按意见修订并重新送审。<br><br>意见：' + esc(opinion),
      okText: pass ? '审核通过' : '退回修改',
      onOk: function () {
        d.status = pass ? '已通过' : '已退回';
        d.approver = window.App.user.name;
        d.approvedAt = U.today();
        d.opinion = opinion || (pass ? '同意' : null);
        d.history.push({ time: U.now(), person: window.App.user.name, action: pass ? '审核通过' : '退回修改', opinion: opinion || (pass ? '同意' : '') });
        var ap = M.approvals.find(function (a) { return a.targetType === 'doc' && a.targetId === d.id && a.status === '待处理'; });
        if (ap) {
          ap.status = pass ? '已通过' : '已退回';
          ap.handler = window.App.user.name; ap.handleTime = U.now(); ap.opinion = opinion || (pass ? '同意' : '');
        }
        syncOrderDocStatus(d.orderId);
        var order = U.order(d.orderId);
        if (order) {
          M.orderLogs[order.id] = (M.orderLogs[order.id] || []).concat([{ time: U.now(), person: window.App.user.name, content: (pass ? '单证 ' + d.no + ' V' + d.version + ' 审核通过' : '单证 ' + d.no + ' V' + d.version + ' 退回修改') + (opinion ? '：' + opinion : '') }]);
        }
        U.toast(pass ? '审核已通过，该单证现在可以导出' : '已退回制单人修改');
        setTimeout(window.App.rerender, 50);
      }
    });
  }
  Actions['doc-approve'] = function (el) { doAudit(el, true); };
  Actions['doc-reject'] = function (el) { doAudit(el, false); };
  Actions['doc-export'] = function (el) {
    var d = U.doc(el.dataset.id);
    if (d.status !== '已通过') {
      U.toast('导出失败：仅「审核通过」状态的单证可导出', 'error');
      return;
    }
    U.withLoading(el, function () {
      d.history.push({ time: U.now(), person: window.App.user.name, action: '导出 PDF（演示）', opinion: '' });
    }, 700);
    setTimeout(function () { U.toast(d.no + ' V' + d.version + ' 已导出 PDF（演示环境，未生成真实文件）'); }, 720);
  };
})();
