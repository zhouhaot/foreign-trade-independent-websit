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
    return U.documentPolicy(d, user).canEdit;
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
    var policy = U.documentPolicy(d, ctx.user);
    var role = ctx.user.role;
    var editing = canEditDoc(d, ctx.user) && window.AppUI.docEditing === d.id;
    var canReadLedger = ['doc', 'boss'].indexOf(role) >= 0;
    var returnDestination = canReadLedger ? '#/documents' : '#/orders/' + d.orderId;

    /* 左：单证选择列表 */
    var siblings = sortedDocs().filter(function (x) { return x.orderId === d.orderId; }).sort(function (a, b) {
      return (a.type === d.type ? 0 : 1) - (b.type === d.type ? 0 : 1) || a.type.localeCompare(b.type) || b.version - a.version;
    });
    var leftItems = siblings.map(function (x) {
      var itemPolicy = U.documentPolicy(x, ctx.user);
      return '<button class="doc-item ' + (x.id === d.id ? 'active' : '') + '" data-action="doc-goto" data-id="' + x.id + '" aria-pressed="' + (x.id === d.id) + '"' + (x.id === d.id ? ' aria-current="true"' : '') + '>' +
        '<div class="d-no"><span>' + x.no + ' <span class="muted">V' + x.version + '</span></span>' + tag(x.status) + '</div>' +
        '<div class="d-sub"><span>' + U.docTypeName(x.type) + '</span><span>' + (itemPolicy.latest ? itemPolicy.isLatest ? '最新版本' : '历史版本' : '版本冲突') + '</span></div>' +
        (x.id === d.id ? '<span class="doc-current-label">当前查看</span>' : '') + '</button>';
    }).join('');

    /* 中：状态横幅 + 纸张预览 */
    var banner = '';
    if (d.status === '已退回') banner = '<div class="doc-status-banner reject"><b>已退回：</b>' + esc(d.opinion || '') + '（' + esc(d.approver || '') + ' · ' + esc(d.approvedAt || '') + '）' + (role === 'doc' ? '<br>请按意见修订后重新提交审核，或申请重新制单生成新版本。' : '') + '</div>';
    else if (d.status === '已通过') banner = '<div class="doc-status-banner approve"><b>该版本曾审核通过：</b>' + esc(d.opinion || '同意') + '（' + esc(d.approver || '') + ' · ' + esc(d.approvedAt || '') + '）。' + (policy.canExport ? '当前满足导出演示条件。' : '历史审核结果保留，当前导出资格见操作区。') + '</div>';
    else if (d.status === '待审核') banner = '<div class="doc-status-banner review"><b>待审核：</b>制单人 ' + esc(d.maker) + ' 已于 ' + esc(d.submittedAt) + ' 提交审核，等待业务主管处理。</div>';
    else if (d.status === '草稿' || d.status === '制作中') banner = '<div class="doc-status-banner draft"><b>' + (d.status === '草稿' ? '草稿' : '制作中') + '：</b>单证尚未送审。订单带入的客户、商品、金额等交易数据只读；唛头、包装与备注字段可编辑。</div>';
    else banner = '<div class="doc-status-banner draft"><b>状态待核对：</b>当前版本状态为「' + esc(d.status) + '」，不能据此推断审核决定。</div>';

    var paper = d.type === 'CI' ? renderCI(d, order, editing) : renderPL(d, order, editing);

    /* 审核留痕 */
    var history = d.history.slice().reverse().sort(function (a, b) { return b.time.localeCompare(a.time); }).map(function (h) {
      return '<div class="tl-item"><div class="tl-meta"><span>' + esc(h.time) + '</span><span>' + esc(h.person) + '</span></div>' +
        '<div class="tl-content">' + esc(h.action) + '</div>' +
        (h.opinion ? '<div class="tl-opinion">' + esc(h.opinion) + '</div>' : '') + '</div>';
    }).join('');

    /* 右：业务操作区（角色差异） */
    var right = rightPanel(d, order, role, editing);

    return '<div class="page-head"><div><h2>' + U.docTypeName(d.type) + ' · ' + d.no + ' <span class="doc-version">V' + d.version + '</span> ' + tag(d.status) + '</h2>' +
      '<p class="page-description">关联订单 ' + d.orderId + ' · 制单人 ' + esc(d.maker) + ' · 本版本交易数据已冻结</p></div>' +
      '<div class="actions"><button class="btn" data-action="doc-focus" aria-pressed="' + !!window.AppUI.docFocus + '">' + U.icon('expand') + '<span>' + (window.AppUI.docFocus ? '显示单证目录' : '专注预览') + '</span></button><a class="btn" href="' + returnDestination + '" data-action="doc-leave" data-destination="' + returnDestination + '">' + (canReadLedger ? '全部单证台账' : '返回订单') + '</a></div></div>' +
      '<div class="doc-layout ' + (window.AppUI.docFocus ? 'is-focused' : '') + '">' +
        '<nav class="doc-list-panel" aria-label="本订单单证版本"><div class="panel-head">本订单单证<span class="muted small">' + d.orderId + ' · ' + siblings.length + ' 份</span></div>' + leftItems + '</nav>' +
        '<div class="doc-center">' + banner +
          '<div class="preview-toolbar"><b>单证预览</b><span>' + (editing ? '编辑唛头、包装与备注' : '交易字段只读') + '</span></div>' +
          '<div class="doc-preview-wrap"><div class="paper-wrap">' + paper + (d.status === '已通过' ? '<div class="p-stamp">审核通过<br>APPROVED</div>' : '') + '</div></div>' +
          '<div class="card mt16"><div class="card-title">审核与操作留痕</div><div class="timeline">' + history + '</div></div>' +
        '</div>' +
        '<aside class="doc-action-panel" aria-label="单证业务操作"><div class="panel-head">当前版本操作<span class="muted small">V' + d.version + '</span></div><div class="panel-body">' + right + '</div></aside>' +
      '</div>';
  };
  function leaveDocument(destination) {
    // 真实应用统一使用路由草稿保护；旧隔离 fixture 没有该 API 时保留原局部契约。
    if (window.App.requestNavigation) { window.App.requestNavigation(destination); return; }
    if (location.hash === destination) return;
    var d = U.doc(window.AppUI.docEditing), opinion = document.getElementById('audit-opinion');
    var dirty = !!(opinion && opinion.value.trim());
    if (d) {
      var fields = { 'df-marks': d.marks, 'df-remark': d.remark };
      ['cartons', 'package', 'gw', 'nw', 'meas'].forEach(function (key) { fields['df-pk-' + key] = d.packing[key]; });
      dirty = dirty || Object.keys(fields).some(function (id) {
        var input = document.getElementById(id);
        return input && input.value.trim() !== String(fields[id] == null ? '' : fields[id]).trim();
      });
    }
    function navigate() { window.AppUI.docEditing = null; location.hash = destination; }
    if (!dirty) { navigate(); return; }
    U.confirm({ title: '离开当前单证？', message: '当前包装、备注或审核意见有未提交内容。离开会丢失这些输入；取消可继续在原版本处理。', okText: '放弃输入并离开', danger: true, onOk: navigate });
  }
  Actions['doc-goto'] = function (el) { leaveDocument('#/documents/' + el.dataset.id); };
  Actions['doc-leave'] = function (el, event) { if (event) event.preventDefault(); leaveDocument(el.dataset.destination); };
  Actions['doc-focus'] = function (el) {
    window.AppUI.docFocus = !window.AppUI.docFocus;
    document.querySelector('.doc-layout').classList.toggle('is-focused', window.AppUI.docFocus);
    el.setAttribute('aria-pressed', window.AppUI.docFocus);
    el.querySelector('span').textContent = window.AppUI.docFocus ? '显示单证目录' : '专注预览';
  };

  function rightPanel(d, order, role, editing) {
    var policy = U.documentPolicy(d, window.App.user);
    var html = '<div class="doc-operation-context"><span>' + (policy.isLatest ? '最新版本' : policy.latest ? '历史版本' : '版本需核对') + '</span>' +
      (policy.order ? tag(policy.order.status) : '<span>订单缺失</span>') + '</div>';
    var snapshot = U.documentSnapshot(d);
    html += '<div class="doc-source-hint">交易来源：' + (snapshot.basis === 'demo-baseline' ? '样例基线·非历史签发记录' : '创建时交易快照') + '</div>';
    var reference = '<div class="ablock doc-reference"><div class="ab-title">版本信息</div>' +
      '<div class="small">关联订单：<a href="#/orders/' + d.orderId + '" data-action="doc-leave" data-destination="#/orders/' + d.orderId + '">' + d.orderId + '</a><br>制单人：' + esc(d.maker) + '<br>更新：' + esc(d.updatedAt) + '</div></div>';
    reference += '<div class="ablock doc-reference"><div class="ab-title">交易数据来源</div><div class="small">' +
      (snapshot.basis === 'demo-baseline' ? '样例基线·非历史签发记录' : '创建时交易快照') +
      '<br>冻结时间：<span title="' + esc(snapshot.capturedAt) + '">' + esc(new Date(snapshot.capturedAt).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai', hour12: false })) + '（北京时间）</span></div>' +
      '<details class="snapshot-rules"><summary>查看冻结规则</summary><div class="readonly-hint">' +
      (snapshot.basis === 'demo-baseline' ? '本次页面加载时冻结当前样例交易基线，无法还原历史签发数据。' : '快照保存创建此交易快照时的订单与主数据。') +
      '<br>包装与备注修订沿用原版交易快照和冻结时间；订单或客户、商品、卖方信息更新不会改变本版本。旧版本保留，新版本重新审核。重新制单采用创建新快照时的当前交易信息。</div></details></div>';

    if (policy.blockedReason) {
      html += '<div class="ablock doc-operation-blocked"><div class="ab-title">当前只读</div><p>' + esc(policy.blockedReason) + '</p>' +
        (policy.latest && !policy.isLatest ? '<button class="btn btn-primary" data-action="doc-goto" data-id="' + policy.latest.id + '">查看最新 V' + policy.latest.version + '</button>' : '') +
        '<div class="readonly-hint">历史版本、审核结果和交易快照仍保留。</div></div>';
    } else if (role === 'doc') {
      if (d.type === 'PL') {
        var packaging = U.packagingCandidate(d.packing, { requireComplete: true });
        html += '<div class="packing-readiness small">' + (packaging.ok ? '已保存包装字段已齐；' + (editing ? '当前编辑仍需核对。' : '仍需核对实际货物和测量记录。') : '已保存包装待核对：' + esc(packaging.errors.map(function (item) { return { cartons: '箱数', package: '包装方式', gw: '毛重', nw: '净重', meas: '体积' }[item.field] || '包装'; }).filter(function (label, i, list) { return list.indexOf(label) === i; }).join('、')) + (d.status === '已通过' ? '。请通过受控修订生成草稿，再核对实际货物。' : '。请先编辑包装；草稿可待补，送审须完整。')) + '</div>';
      }
      if (d.status === '已通过') {
        html += '<div class="ablock"><div class="ab-title">受控修订</div>' +
          '<button class="btn" data-action="doc-revise" data-id="' + d.id + '" aria-label="修订包装与备注，生成新版本 V' + nextDocVersion(d) + '">修订包装与备注 · V' + nextDocVersion(d) + '</button>' +
          '<div class="readonly-hint">沿用原交易快照，原版本保留；新版本重新审核。</div></div>';
      } else if (d.status === '制作中' || d.status === '草稿' || d.status === '已退回') {
        if (editing) {
          html += '<div class="ablock"><div class="ab-title">编辑中</div>' +
            '<button class="btn" data-action="doc-save-draft" data-id="' + d.id + '">保存草稿</button>' +
            '<button class="btn btn-primary" data-action="doc-submit" data-id="' + d.id + '">提交审核</button>' +
            '<button class="btn" data-action="doc-cancel-edit">放弃修改</button></div>';
        } else {
          html += '<div class="ablock"><div class="ab-title">制单操作</div>' +
            '<button class="btn" data-action="doc-edit" data-id="' + d.id + '">编辑包装与备注</button>' +
            '<button class="btn btn-primary" data-action="doc-submit" data-id="' + d.id + '">提交审核</button></div>';
        }
        if (d.status === '已退回') {
          html += '<div class="ablock"><div class="ab-title">退回意见</div><div class="small" style="line-height:1.7">' + esc(d.opinion || '') + '</div>' +
            '<button class="btn mt8" data-action="doc-reform" data-id="' + d.id + '"' + (policy.canReform ? '' : ' disabled') + '>申请重新制单</button>' +
            (!policy.canReform ? '<div class="readonly-hint">' + esc(policy.reasons.reform) + '</div>' : '') + '</div>';
        }
      }
    } else if (role === 'boss') {
      if (d.status === '待审核') {
        if (d.maker === window.App.user.name) {
          html += '<div class="ablock"><div class="ab-title">审核操作</div><div class="readonly-hint">制度要求「不能自制自审」，本单证由您本人制作，请转交其他主管审核。</div></div>';
        } else {
          html += '<div class="ablock form-item"><label class="ab-title" for="audit-opinion">审核意见</label>' +
            '<textarea class="textarea" id="audit-opinion" placeholder="通过可不填；退回请说明具体问题"></textarea><div id="audit-feedback" class="field-error" role="alert"></div></div>' +
            '<div class="ablock"><button class="btn btn-success" data-action="doc-approve" data-id="' + d.id + '">审核通过</button>' +
            '<button class="btn btn-danger" data-action="doc-reject" data-id="' + d.id + '">退回修改</button></div>';
        }
      } else {
        html += '<div class="ablock"><div class="ab-title">审核操作</div><div class="readonly-hint">当前状态为「' + d.status + '」，无需审核。</div></div>';
      }
    } else {
      html += '<div class="ablock"><div class="ab-title">操作</div><div class="readonly-hint">当前角色对单证为只读查看。</div></div>';
    }
    if (d.type === 'PL' && role === 'doc') html += '<div id="doc-packing-feedback" class="field-error packing-feedback" role="alert" tabindex="-1"></div>';

    /* 审核历史与实时订单/版本资格分开判断；导出仍为内存演示。 */
    var canExport = policy.canExport;
    html += '<div class="ablock"><div class="ab-title">导出</div>' +
      '<button class="btn ' + (canExport ? 'btn-primary' : '') + '" data-action="doc-export" data-id="' + d.id + '" ' + (canExport ? '' : 'disabled') + '>导出 PDF（演示）</button>' +
      '<div class="readonly-hint">' + (canExport ? '满足当前资格；演示仅留痕，不生成文件。' : esc(policy.reasons.export)) + '</div></div>';
    return html + reference;
  }

  /* 仅解释当前查看版本的审核状态；旧决定保留在历史，不作为本次批准人。 */
  function hasVisibleReviewText(value) {
    // 只处理可见性判断副本，不清洗原字段或合法多语言文本。
    return typeof value === 'string' && !!value.replace(/[\p{White_Space}\p{Default_Ignorable_Code_Point}\p{Cc}]/gu, '');
  }
  function renderDocumentReview(d) {
    var name = typeof d.approver === 'string' ? d.approver : '';
    var signature = '<div class="s-line">授权签字 Authorized Signature</div>';
    if (d.status === '已通过') {
      if (hasVisibleReviewText(name)) {
        var missingDate = !hasVisibleReviewText(d.approvedAt);
        return '<div><div>审核 Approved by：' + esc(name) + '</div>' +
          (missingDate ? '<div class="paper-review-note">审核日期待核对</div>' : '') + signature + '</div>';
      }
      return '<div><div class="paper-review-status">审核状态 Review status：本版本已通过 · 审核记录待核对</div>' + signature + '</div>';
    }
    var label = d.status === '草稿' || d.status === '制作中' ? '未送审 / Not submitted'
      : d.status === '待审核' ? '等待本次审核 / Pending review'
      : d.status === '已退回' ? '已退回、未通过 / Returned, not approved'
      : '状态待核对 / Status needs checking';
    return '<div><div class="paper-review-status">审核状态 Review status：' + label + '</div>' + signature + '</div>';
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
      ? '<textarea class="edit-area" id="df-marks" aria-label="唛头">' + esc(d.marks) + '</textarea>'
      : esc(d.marks);
    var remarkHtml = editing
      ? '<textarea class="edit-area" id="df-remark" aria-label="备注">' + esc(d.remark) + '</textarea>'
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
      renderDocumentReview(d) + '</div>' +
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
    var pk = d.packing || {};
    function pf(key, val) {
      var labels = { cartons: '包装件数', package: '包装方式', gw: '毛重', nw: '净重', meas: '体积' };
      var hints = { cartons: '普通正整数，如 140', package: '包装方式，如纸箱', gw: 'KG/KGS，最多 3 位小数，如 1,680 KGS', nw: 'KG/KGS，最多 3 位小数，不能大于毛重', meas: 'CBM，最多 3 位小数，如 8.6 CBM' };
      return editing ? '<div class="form-item packing-field"><label class="sr-only" for="df-pk-' + key + '">' + labels[key] + '</label>' +
        '<input class="edit-field" type="text" id="df-pk-' + key + '"' + (key === 'cartons' ? ' inputmode="numeric"' : '') + ' aria-describedby="df-pk-' + key + '-hint df-pk-' + key + '-error" value="' + esc(val) + '">' +
        '<span class="packing-hint" id="df-pk-' + key + '-hint">' + hints[key] + '</span><div class="field-error" id="df-pk-' + key + '-error"></div></div>' : val == null || String(val).trim() === '' ? '<span class="packing-pending">待补</span>' : esc(val);
    }
    var marksHtml = editing
      ? '<textarea class="edit-area" id="df-marks" aria-label="唛头">' + esc(d.marks) + '</textarea>'
      : esc(d.marks);
    var remarkHtml = editing
      ? '<textarea class="edit-area" id="df-remark" aria-label="备注">' + esc(d.remark) + '</textarea>'
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
      '<table class="p-items"><thead><tr><th>包装件数 PACKAGES</th><th>包装方式 PACKAGE</th><th>毛重 G.W. (KG/KGS)</th><th>净重 N.W. (KG/KGS)</th><th>体积 MEAS. (CBM)</th></tr></thead>' +
      '<tbody><tr><td class="c">' + pf('cartons', pk.cartons) + '</td><td class="c">' + pf('package', pk.package) + '</td>' +
      '<td class="c">' + pf('gw', pk.gw) + '</td><td class="c">' + pf('nw', pk.nw) + '</td><td class="c">' + pf('meas', pk.meas) + '</td></tr></tbody></table>' +
      '<div class="pb-label">备注 Remark</div><div class="p-remark">' + remarkHtml + '</div>' +
      '<div class="p-sign"><div><div>制单 Prepared by：' + esc(d.maker) + '</div><div class="s-line">' + esc(S.nameEn) + '</div></div>' +
      renderDocumentReview(d) + '</div>' +
      '</div>';
  }

  /* ---------- 动作资格、确认内容绑定与跨按钮互斥 ---------- */
  var documentInFlight = Object.create(null);
  function docApprovalState(d) {
    return JSON.stringify(M.approvals.filter(function (a) { return a.targetType === 'doc' && a.targetId === d.id; }));
  }
  function captureDocAction(el, action, requireEditing) {
    var d = U.doc(el.dataset.id), user = window.App.user;
    var policy = U.documentPolicy(d, user);
    var error = policy.reasons[action];
    if (!error && el.classList && el.classList.contains('is-loading')) error = '该操作正在处理中，请勿重复提交。';
    if (!error && documentInFlight[d.id]) error = '该单证正在处理中，请勿重复提交。';
    if (!error && requireEditing && window.AppUI.docEditing !== d.id) error = '请先由单证员进入当前版本编辑模式。';
    if (error) { U.toast(error, 'warning'); return null; }
    return { doc: d, action: action, actor: { id: user.id, name: user.name, role: user.role },
      actorRef: user,
      order: policy.order, orderStatus: policy.order.status, documentState: JSON.stringify(d),
      approvals: docApprovalState(d), requireEditing: requireEditing, completed: false };
  }
  function validateDocAction(ticket) {
    var d = ticket.doc, user = window.App.user;
    var policy = U.documentPolicy(d, user);
    var error = policy.reasons[ticket.action];
    if (!error && (!user || user !== ticket.actorRef || user.id !== ticket.actor.id || user.name !== ticket.actor.name || user.role !== ticket.actor.role)) error = '操作者已变化，请重新发起操作。';
    if (!error && (policy.order !== ticket.order || policy.order.status !== ticket.orderStatus || JSON.stringify(d) !== ticket.documentState || docApprovalState(d) !== ticket.approvals)) error = '单证、关联订单或审核信息已变化，请刷新核对后重新操作。';
    if (!error && ticket.requireEditing && window.AppUI.docEditing !== d.id) error = '编辑模式已变化，请重新发起保存。';
    if (!error && ticket.inputs && (location.hash !== ticket.sourceHash || window.AppUI.docEditing !== ticket.editingId || ticket.inputs.some(function (input) {
      return document.getElementById(input.id) !== input.node || input.node.isConnected === false || String(input.node.value) !== input.value;
    }))) error = '当前页面或输入已变化，请核对最新内容后重新保存或送审。';
    if (error) {
      var ownsSourceInputs = ticket.inputs && location.hash === ticket.sourceHash && user === ticket.actorRef &&
        window.AppUI.docEditing === ticket.editingId && document.getElementById('doc-packing-feedback') === ticket.feedbackNode &&
        ticket.inputs.every(function (input) { return document.getElementById(input.id) === input.node && input.node.isConnected !== false; });
      if (ownsSourceInputs && d.type === 'PL') {
        var current = null;
        if (ticket.editorControls && location.hash === ticket.sourceHash && user === ticket.actorRef && ticket.inputs.every(function (input) { return document.getElementById(input.id) === input.node; })) {
          current = U.packagingCandidate(Object.assign({}, d.packing, readEditValues(d).packing), { requireComplete: ticket.action === 'submit' });
        }
        showPackingErrors({ error: error, contextError: error, errors: current && !current.ok ? current.errors : [] });
      }
      U.toast(error, 'warning'); return false;
    }
    return true;
  }
  function commitDocAction(ticket, effect) {
    if (ticket.completed || documentInFlight[ticket.doc.id]) return false;
    if (!validateDocAction(ticket)) return false;
    documentInFlight[ticket.doc.id] = true;
    try { effect(ticket.doc); ticket.completed = true; return true; }
    finally { delete documentInFlight[ticket.doc.id]; }
  }
  function bindDocInputs(ticket) {
    if (typeof location.hash !== 'string' || location.hash.split('?')[0] !== '#/documents/' + encodeURIComponent(ticket.doc.id)) {
      U.toast('单证来源地址与当前版本不一致，本次未保存或送审；请重新打开该版本核对。', 'warning');
      return false;
    }
    ticket.sourceHash = location.hash; ticket.editingId = window.AppUI.docEditing; ticket.inputs = [];
    ticket.feedbackNode = document.getElementById('doc-packing-feedback');
    ticket.editorControls = ticket.requireEditing || ticket.editingId === ticket.doc.id;
    if (!ticket.editorControls) return true; // 只读送审只取 stored packing，不读取页面上其它控件。
    var ids = ['df-marks', 'df-remark'];
    if (ticket.doc.type === 'PL') ['cartons', 'package', 'gw', 'nw', 'meas'].forEach(function (key) { ids.push('df-pk-' + key); });
    var missing = [];
    ids.forEach(function (id) {
      var node = document.getElementById(id);
      if (!node || node.isConnected === false || typeof node.value !== 'string') missing.push(id);
      else ticket.inputs.push({ id: id, node: node, value: node.value });
    });
    if (missing.length) {
      var labels = { 'df-marks': '唛头', 'df-remark': '备注', 'df-pk-cartons': '箱数', 'df-pk-package': '包装方式', 'df-pk-gw': '毛重', 'df-pk-nw': '净重', 'df-pk-meas': '体积' };
      var error = '编辑控件缺失或不可用：' + missing.map(function (id) { return labels[id]; }).join('、') + '。请重新进入本版本编辑后核对，不能使用旧包装值补缺。';
      if (ticket.doc.type === 'PL') showPackingErrors({ error: error, errors: [] });
      U.toast(error, 'warning'); return false;
    }
    return true;
  }
  function readEditValues(d) {
    var values = { packing: {} };
    ['marks', 'remark'].forEach(function (key) {
      var el = document.getElementById('df-' + key);
      if (el) values[key] = el.value.trim();
    });
    if (d.type === 'PL') ['cartons', 'package', 'gw', 'nw', 'meas'].forEach(function (key) {
      var el = document.getElementById('df-pk-' + key);
      if (el) values.packing[key] = String(el.value);
    });
    return values;
  }
  function applyEditValues(d, values) {
    ['marks', 'remark'].forEach(function (key) { if (values[key] !== undefined) d[key] = values[key]; });
    if (d.type === 'PL') Object.keys(values.packing).forEach(function (key) { d.packing[key] = values.packing[key]; });
    d.updatedAt = U.today();
  }
  function showPackingErrors(candidate) {
    var first = null;
    var relation = (candidate.errors || []).some(function (item) { return item.field === 'gw' && item.error.indexOf('不能小于') >= 0; }) &&
      (candidate.errors || []).some(function (item) { return item.field === 'nw' && item.error.indexOf('不能大于') >= 0; });
    ['cartons', 'package', 'gw', 'nw', 'meas'].forEach(function (key) {
      var input = document.getElementById('df-pk-' + key), error = document.getElementById('df-pk-' + key + '-error');
      if (input) { input.classList.remove('is-error'); input.removeAttribute('aria-invalid'); }
      if (error) error.textContent = '';
    });
    (candidate.errors || []).forEach(function (item) {
      var input = document.getElementById('df-pk-' + item.field);
      if (input) {
        U.fieldError(input, relation && (item.field === 'gw' || item.field === 'nw') ? '毛重不能小于净重，请核对两项重量。' : item.error);
        input.setAttribute('aria-describedby', 'df-pk-' + item.field + '-hint df-pk-' + item.field + '-error');
        first = first || input;
      }
    });
    var feedback = document.getElementById('doc-packing-feedback');
    var messages = (candidate.errors || []).map(function (item) {
      return relation && (item.field === 'gw' || item.field === 'nw') ? '毛重不能小于净重，请核对两项重量。' : item.error;
    }).filter(function (message, index, list) { return list.indexOf(message) === index; });
    if (feedback) feedback.textContent = messages.length ? (candidate.contextError ? candidate.contextError + ' ' : '') + messages.join('；') : candidate.error || '';
    if (first) first.focus(); else if (feedback && candidate.error) feedback.focus();
  }
  function packagingValues(d, values, requireComplete) {
    if (d.type !== 'PL') return { ok: true, values: values, complete: true };
    var raw = d.packing;
    if (raw && typeof raw === 'object' && !Array.isArray(raw)) raw = Object.assign({}, raw, values ? values.packing : {});
    var candidate = U.packagingCandidate(raw, { requireComplete: requireComplete });
    showPackingErrors(candidate);
    if (!candidate.ok) { U.toast(requireComplete ? '本次未送审，请查看包装说明。' : '包装未保存，请查看字段和操作区说明。', 'error'); return candidate; }
    var result = values || { packing: {} };
    result.packing = candidate.packing;
    return { ok: true, values: result, complete: candidate.complete };
  }
  Actions['doc-edit'] = function (el) {
    var ticket = captureDocAction(el, 'edit', false);
    if (!ticket) return;
    window.AppUI.docEditing = ticket.doc.id;
    window.App.rerender();
    U.toast('已进入编辑模式：仅唛头、包装与备注字段可修改，订单带入数据只读', 'info');
  };
  Actions['doc-cancel-edit'] = function () {
    function discard() { window.AppUI.docEditing = null; window.App.rerender(); }
    if (window.App.confirmDiscard) {
      var d = U.doc(window.AppUI.docEditing);
      window.App.confirmDiscard(discard, { title: '放弃' + (d ? U.docTypeName(d.type) + ' ' + d.no + ' V' + d.version : '当前单证') + '的修改？', message: '当前唛头、包装或备注有未保存内容。放弃后回到本版本只读预览；继续填写可保留修改。', okText: '放弃修改' });
    } else discard();
  };
  Actions['doc-save-draft'] = function (el) {
    var ticket = captureDocAction(el, 'edit', true);
    if (!ticket) return;
    if (!bindDocInputs(ticket)) return;
    var candidate = packagingValues(ticket.doc, readEditValues(ticket.doc), false);
    if (!candidate.ok) return;
    var values = candidate.values;
    // 锁住排队期间，不能通过另一颗按钮同时保存/导出/送审。
    documentInFlight[ticket.doc.id] = true;
    U.withLoading(el, function () {
      delete documentInFlight[ticket.doc.id];
      if (!validateDocAction(ticket)) return;
      candidate = packagingValues(ticket.doc, readEditValues(ticket.doc), false);
      if (!candidate.ok) return;
      values = candidate.values;
      if (commitDocAction(ticket, function (d) {
        applyEditValues(d, values);
        d.history.push({ time: U.now(), person: ticket.actor.name, action: '保存草稿（修订唛头/包装/备注）', opinion: '' });
        window.AppUI.docEditing = null;
      })) { if (window.App.markDraftClean) window.App.markDraftClean(); U.toast(candidate.complete ? '草稿已保存' : '草稿已保存，包装资料待补齐，完整后才能送审'); window.App.rerender(); }
    });
  };
  Actions['doc-submit'] = function (el) {
    var ticket = captureDocAction(el, 'submit', false);
    if (!ticket) return;
    var d = ticket.doc, editing = window.AppUI.docEditing === d.id;
    if (!bindDocInputs(ticket)) return;
    var candidate = packagingValues(d, editing ? readEditValues(d) : null, true);
    if (!candidate.ok) return;
    var values = candidate.values;
    var packingReview = '';
    if (d.type === 'PL') {
      var packingLabels = { cartons: '包装件数', package: '包装方式', gw: '毛重（KG/KGS）', nw: '净重（KG/KGS）', meas: '体积（CBM）' };
      packingReview = '<div class="packing-confirmation small"><p><b>本次送审包装候选</b> · ' + (editing ? '正在编辑的输入' : '已保存版本') + '</p>' +
        ['cartons', 'package', 'gw', 'nw', 'meas'].map(function (key) { return '<p><b>' + packingLabels[key] + '：</b>' + esc(values.packing[key]) + '</p>'; }).join('') + '</div>';
    }
    U.confirm({ title: '提交审核',
      message: '确认将 <b>' + esc(U.docTypeName(d.type) + ' ' + d.no + ' V' + d.version) + '</b> 提交业务主管审核？提交后在审核完成前不可再编辑。',
      extra: packingReview,
      okText: '提交审核',
      onOk: function () {
        var modalRoot = document.getElementById('modal-root');
        if (ticket.confirmOverlay && (!ticket.confirmOverlay.isConnected || !modalRoot || modalRoot.firstElementChild !== ticket.confirmOverlay)) {
          U.toast('确认窗口已关闭或变化，请重新发起送审。', 'warning'); return false;
        }
        if (!validateDocAction(ticket)) return false;
        candidate = packagingValues(d, editing ? readEditValues(d) : null, true);
        if (!candidate.ok) return false;
        values = candidate.values;
        return commitDocAction(ticket, function (doc) {
          if (values) applyEditValues(doc, values);
          doc.status = '待审核'; doc.submittedAt = U.today();
          doc.history.push({ time: U.now(), person: ticket.actor.name, action: '提交审核', opinion: '' });
          M.approvals.unshift({ id: U.newId('AP'), type: '单证审核', targetType: 'doc', targetId: doc.id,
            title: U.docTypeName(doc.type) + ' ' + doc.no + ' V' + doc.version + '（订单 ' + doc.orderId + '）审核',
            applicant: ticket.actor.name, applyTime: U.now(), reason: '', status: '待处理', handler: null, handleTime: null, opinion: null });
          syncOrderDocStatus(doc.orderId); window.AppUI.docEditing = null;
          if (window.App.markDraftClean) window.App.markDraftClean();
          U.toast('已提交审核，等待业务主管处理'); window.App.rerender();
        });
      }
    });
    var modalRoot = document.getElementById('modal-root');
    ticket.confirmOverlay = modalRoot ? modalRoot.firstElementChild : null;
  };
  Actions['doc-revise'] = function (el) {
    var ticket = captureDocAction(el, 'revise', false);
    if (!ticket) return;
    var d = ticket.doc, version = nextDocVersion(d);
    U.confirm({ title: '受控修订确认',
      message: '单证 <b>' + esc(d.no + ' V' + d.version) + '</b> 已审核通过。<br>确认将<b>生成新版本 V' + version + '</b>（草稿），仅修订唛头、包装与备注，<b>沿用 V' + d.version + ' 交易快照</b>。原版本保留，新版本需重新审核。',
      okText: '生成 V' + version,
      onOk: function () {
        return commitDocAction(ticket, function (doc) {
          var nd = JSON.parse(JSON.stringify(doc));
          nd.id = 'D-' + doc.no + '-V' + version; nd.version = version; nd.status = '草稿';
          nd.createdAt = U.today(); nd.updatedAt = U.today();
          nd.submittedAt = null; nd.approver = null; nd.approvedAt = null; nd.opinion = null;
          nd.history = [{ time: U.now(), person: ticket.actor.name, action: '创建单证 V' + version + '（受控修订，基于 V' + doc.version + '）', opinion: '' }];
          nd.remark = (nd.remark ? nd.remark + '；' : '') + 'V' + version + '：受控修订';
          U.inheritDocumentSnapshot(nd, doc); M.documents.push(nd); syncOrderDocStatus(doc.orderId);
          if (window.App.markDraftClean) window.App.markDraftClean();
          U.toast('已生成新版本 ' + doc.no + ' V' + version + '（草稿）');
          if (window.App.requestNavigation) window.App.requestNavigation('#/documents/' + nd.id);
          else location.hash = '#/documents/' + nd.id;
        });
      }
    });
  };
  Actions['doc-reform'] = function (el) {
    var ticket = captureDocAction(el, 'reform', false);
    if (!ticket) return;
    var d = ticket.doc;
    U.confirm({ title: '申请重新制单',
      message: '将针对 <b>' + esc(d.no + ' V' + d.version) + '</b> 提交「重新制单申请」，由业务主管审批后按当前交易生成新版本。退回意见：' + esc(d.opinion || ''),
      okText: '提交申请',
      onOk: function () {
        return commitDocAction(ticket, function (doc) {
          M.approvals.unshift({ id: U.newId('AP'), type: '重新制单申请', targetType: 'doc', targetId: doc.id,
            title: U.docTypeName(doc.type) + ' ' + doc.no + ' 申请重新制单', applicant: ticket.actor.name,
            applyTime: U.now(), reason: '因审核退回申请重新制单：' + (doc.opinion || ''), status: '待处理', handler: null, handleTime: null, opinion: null });
          if (window.App.markDraftClean) window.App.markDraftClean();
          U.toast('重新制单申请已提交'); window.App.rerender();
        });
      }
    });
  };
  function doAudit(el, pass) {
    var ticket = captureDocAction(el, 'audit', false);
    if (!ticket) return;
    var d = ticket.doc, opinionEl = document.getElementById('audit-opinion');
    var opinion = opinionEl ? opinionEl.value.trim() : '';
    if (!pass && !opinion) {
      if (opinionEl) { U.fieldError(opinionEl, '退回时必须填写具体审核意见'); opinionEl.focus(); }
      U.toast('退回修改必须填写具体审核意见', 'error'); return;
    }
    U.confirm({ title: pass ? '审核通过确认' : '退回修改确认', danger: !pass,
      message: pass ? '确认通过 <b>' + esc(U.docTypeName(d.type) + ' ' + d.no + ' V' + d.version) + '</b>？通过后仅最新版本具有导出演示资格，后续修改须走受控修订。'
        : '确认退回 <b>' + esc(U.docTypeName(d.type) + ' ' + d.no + ' V' + d.version) + '</b>？退回后制单人需按意见修订并重新送审。<br><br>意见：' + esc(opinion),
      okText: pass ? '审核通过' : '退回修改',
      onOk: function () {
        return commitDocAction(ticket, function (doc) {
          doc.status = pass ? '已通过' : '已退回'; doc.approver = ticket.actor.name; doc.approvedAt = U.today();
          doc.opinion = opinion || (pass ? '同意' : null);
          doc.history.push({ time: U.now(), person: ticket.actor.name, action: pass ? '审核通过' : '退回修改', opinion: opinion || (pass ? '同意' : '') });
          M.approvals.filter(function (a) { return a.type === '单证审核' && a.targetType === 'doc' && a.targetId === doc.id && a.status === '待处理'; }).forEach(function (ap) {
            ap.status = doc.status; ap.handler = ticket.actor.name; ap.handleTime = U.now(); ap.opinion = doc.opinion || '';
          });
          syncOrderDocStatus(doc.orderId);
          M.orderLogs[doc.orderId] = (M.orderLogs[doc.orderId] || []).concat([{ time: U.now(), person: ticket.actor.name,
            content: '单证 ' + doc.no + ' V' + doc.version + (pass ? ' 审核通过' : ' 退回修改') + (opinion ? '：' + opinion : '') }]);
          if (window.App.markDraftClean) window.App.markDraftClean();
          U.toast(pass ? '审核已通过，最新版本具有导出演示资格' : '已退回制单人修改'); window.App.rerender();
        });
      }
    });
  }
  Actions['doc-approve'] = function (el) { doAudit(el, true); };
  Actions['doc-reject'] = function (el) { doAudit(el, false); };
  Actions['doc-export'] = function (el) {
    var ticket = captureDocAction(el, 'export', false);
    if (!ticket) return;
    documentInFlight[ticket.doc.id] = true;
    U.withLoading(el, function () {
      return new Promise(function (resolve) {
        setTimeout(function () {
          delete documentInFlight[ticket.doc.id];
          var success = commitDocAction(ticket, function (d) {
            d.history.push({ time: U.now(), person: ticket.actor.name, action: '导出 PDF（演示）', opinion: '' });
          });
          if (success) {
            U.toast(ticket.doc.no + ' V' + ticket.doc.version + ' 导出演示已完成，未生成真实文件');
            if (location.hash.split('?')[0] === '#/documents/' + ticket.doc.id) window.App.rerender();
          }
          resolve();
        }, 700);
      });
    }, 0);
  };
})();
