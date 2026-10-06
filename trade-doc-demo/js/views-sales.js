/* ============================================================
 * views-sales.js — 询盘 / 报价 / 订单（含订单详情核心页）
 * ============================================================ */
(function () {
  'use strict';
  var M = window.MOCK, U = window.U;
  var Views = window.Views, Actions = window.Actions;
  var ui = window.__ui, esc = U.esc, tag = U.tag, val = window.__val, descItem = window.__descItem;

  /* ==================== 询盘列表 ==================== */
  Views.inquiries = function () {
    var s = ui('inquiries'), f = s.filters;
    var list = M.inquiries.filter(function (i) {
      if (f.kw && (i.id + U.customerName(i.customerId)).toLowerCase().indexOf(f.kw.toLowerCase()) < 0) return false;
      if (f.status && i.status !== f.status) return false;
      return true;
    }).sort(function (a, b) { return b.date.localeCompare(a.date); });
    var pg = U.page(list, s.page);
    var rows = pg.rows.map(function (i) {
      return '<tr><td><a href="#/inquiries/' + i.id + '">' + i.id + '</a></td>' +
        '<td>' + esc(U.customerName(i.customerId)) + '</td>' +
        '<td>' + esc(i.source) + '</td><td>' + esc(i.salesperson) + '</td>' +
        '<td>' + i.date + '</td><td class="center">' + tag(i.status) + '</td>' +
        '<td>' + (i.quoteId ? '<a href="#/quotes/' + i.quoteId + '">' + i.quoteId + '</a>' : '<span class="muted">—</span>') + '</td>' +
        '<td><a class="btn btn-sm" href="#/inquiries/' + i.id + '">查看</a></td></tr>';
    }).join('');
    if (!rows) rows = U.emptyRow(8, (f.kw || f.status) ? '没有符合筛选条件的结果' : '暂无询盘记录');
    return '<div class="page-head"><h2>询盘管理</h2></div>' +
      '<div class="filter-bar">' +
      window.__filterInput('询盘编号/客户', 'f-kw', f.kw, '输入关键字') +
      '<div class="form-item"><label>状态</label><select class="select" id="f-status"><option value="">全部</option>' +
      ['跟进中', '已报价'].map(function (v) { return '<option ' + (f.status === v ? 'selected' : '') + '>' + v + '</option>'; }).join('') +
      '</select></div>' +
      '<div class="filter-actions"><button class="btn btn-primary" data-action="inq-filter">查 询</button><button class="btn" data-action="inq-reset">重 置</button></div></div>' +
      '<div class="table-toolbar"><h3>询盘记录<span class="record-count">' + list.length + ' 笔</span></h3><span class="muted small">从客户需求进入报价流程</span></div>' +
      '<div class="table-wrap"><table class="table"><thead><tr>' +
      '<th>询盘编号</th><th>客户</th><th>来源</th><th>业务员</th><th>询盘日期</th><th class="center">状态</th><th>关联报价</th><th>操作</th>' +
      '</tr></thead><tbody>' + rows + '</tbody></table></div>' +
      U.pagination(pg, 'inq-page');
  };
  Actions['inq-filter'] = function () { var s = ui('inquiries'); s.filters = { kw: val('f-kw'), status: val('f-status') }; s.page = 1; window.App.rerender(); };
  Actions['inq-reset'] = function () { window.AppUI.inquiries = { page: 1, filters: {} }; window.App.rerender(); };
  Actions['inq-page'] = function (el) { ui('inquiries').page = +el.dataset.page; window.App.rerender(); };

  /* ==================== 询盘详情 ==================== */
  Views.inquiryDetail = function (ctx) {
    var iq = U.inquiry(ctx.params[0]);
    if (!iq) return Views.notFound('询盘不存在：' + ctx.params[0]);
    var itemRows = iq.items.map(function (it) {
      var p = U.product(it.productId);
      return '<tr><td><a href="#/products/' + p.id + '">' + p.id + '</a></td><td>' + esc(p.nameCn) + '（' + esc(p.nameEn) + '）</td>' +
        '<td>' + esc(p.spec) + '</td><td class="num">' + it.qty + ' ' + esc(p.unit) + '</td></tr>';
    }).join('');
    var canQuote = ctx.user.role === 'sales' && !iq.quoteId;
    return '<div class="page-head"><h2>询盘详情 · ' + iq.id + '</h2><div class="actions">' +
      (iq.quoteId
        ? '<a class="btn btn-primary" href="#/quotes/' + iq.quoteId + '">查看关联报价 ' + iq.quoteId + '</a>'
        : (canQuote ? '<button class="btn btn-primary" data-action="inq-start-quote" data-id="' + iq.id + '">发起报价</button>' : '')) +
      '<a class="btn" href="#/inquiries">返回列表</a></div></div>' +
      '<div class="card"><div class="card-title">询盘信息 ' + tag(iq.status) + '</div><div class="desc-grid">' +
      descItem('询盘编号', iq.id) +
      '<div class="di"><div class="dt">客户</div><div class="dd"><a href="#/customers/' + iq.customerId + '">' + esc(U.customerName(iq.customerId)) + '</a></div></div>' +
      descItem('来源渠道', iq.source) + descItem('业务员', iq.salesperson) +
      descItem('询盘日期', iq.date) +
      descItem('关联报价', iq.quoteId || '尚未报价') +
      '</div>' +
      '<div class="mt16 mb8"><b>客户留言</b></div>' +
      '<div class="card" style="background:#f7f8fb;margin-bottom:0">' + esc(iq.message) + '</div></div>' +
      '<div class="card"><div class="card-title">意向商品</div>' +
      '<div class="table-wrap"><table class="table"><thead><tr><th>商品编号</th><th>商品名称</th><th>规格</th><th class="num">意向数量</th></tr></thead>' +
      '<tbody>' + itemRows + '</tbody></table></div></div>';
  };
  Actions['inq-start-quote'] = function (el) {
    var iq = U.inquiry(el.dataset.id);
    U.confirm({
      title: '发起报价',
      message: '将基于询盘 <b>' + iq.id + '</b>（' + esc(U.customerName(iq.customerId)) + '）的意向商品生成报价草稿，报价单生成后可在报价编辑页调整价格与条款。<br><br>主流程：客户需求 → 询盘 → <b>报价</b> → 客户确认 → 生成订单。',
      okText: '生成报价草稿',
      onOk: function () {
        var qid = 'Q2026' + String(100 + M.quotes.length + 1);
        var newQ = {
          id: qid, inquiryId: iq.id, customerId: iq.customerId, salesperson: window.App.user.name,
          date: U.today(), validUntil: U.today(), currency: 'USD', tradeTerm: 'FOB 上海',
          paymentTerm: '30% 预付，70% 见提单副本', status: '待客户确认', orderId: null, confirmDate: null,
          items: iq.items.map(function (it) {
            var p = U.product(it.productId);
            return { productId: it.productId, qty: it.qty, price: p ? p.refPrice : 0 };
          }),
          remark: '由询盘 ' + iq.id + ' 生成（演示）'
        };
        M.quotes.push(newQ);
        iq.quoteId = qid; iq.status = '已报价';
        U.toast('报价草稿 ' + qid + ' 已生成');
        location.hash = '#/quotes/' + qid + '/edit';
      }
    });
  };

  /* ==================== 报价列表 ==================== */
  Views.quotes = function () {
    var s = ui('quotes'), f = s.filters;
    var list = M.quotes.filter(function (q) {
      if (f.kw && (q.id + U.customerName(q.customerId)).toLowerCase().indexOf(f.kw.toLowerCase()) < 0) return false;
      if (f.status && q.status !== f.status) return false;
      return true;
    }).sort(function (a, b) { return b.date.localeCompare(a.date); });
    var pg = U.page(list, s.page);
    var rows = pg.rows.map(function (q) {
      return '<tr><td><a href="#/quotes/' + q.id + '">' + q.id + '</a></td>' +
        '<td>' + esc(U.customerName(q.customerId)) + '</td>' +
        '<td>' + esc(q.salesperson) + '</td><td>' + q.date + '</td><td>' + q.validUntil + '</td>' +
        '<td class="num">' + U.fmt(U.quoteTotal(q)) + ' ' + q.currency + '</td>' +
        '<td class="center">' + tag(q.status) + '</td>' +
        '<td>' + (q.orderId ? '<a href="#/orders/' + q.orderId + '">' + q.orderId + '</a>' : '<span class="muted">—</span>') + '</td>' +
        '<td class="nowrap"><a class="btn btn-sm" href="#/quotes/' + q.id + '">查看</a> ' +
        (q.status === '待客户确认' ? '<a class="btn btn-sm" href="#/quotes/' + q.id + '/edit">编辑</a>' : '') + '</td></tr>';
    }).join('');
    if (!rows) rows = U.emptyRow(9, (f.kw || f.status) ? '没有符合筛选条件的结果' : '暂无报价记录');
    return '<div class="page-head"><h2>报价管理</h2><div class="actions">' +
      '<span class="muted small">报价由询盘发起：询盘 → 报价 → 客户确认 → 生成订单</span></div></div>' +
      '<div class="filter-bar">' +
      window.__filterInput('报价编号/客户', 'f-kw', f.kw, '输入关键字') +
      '<div class="form-item"><label>状态</label><select class="select" id="f-status"><option value="">全部</option>' +
      ['待客户确认', '已确认'].map(function (v) { return '<option ' + (f.status === v ? 'selected' : '') + '>' + v + '</option>'; }).join('') +
      '</select></div>' +
      '<div class="filter-actions"><button class="btn btn-primary" data-action="quote-filter">查 询</button><button class="btn" data-action="quote-reset">重 置</button></div></div>' +
      '<div class="table-toolbar"><h3>报价记录<span class="record-count">' + list.length + ' 笔</span></h3><span class="muted small">仅已确认报价可生成订单</span></div>' +
      '<div class="table-wrap"><table class="table"><thead><tr>' +
      '<th>报价编号</th><th>客户</th><th>业务员</th><th>报价日期</th><th>有效期至</th><th class="num">报价金额</th><th class="center">状态</th><th>关联订单</th><th>操作</th>' +
      '</tr></thead><tbody>' + rows + '</tbody></table></div>' +
      U.pagination(pg, 'quote-page');
  };
  Actions['quote-filter'] = function () { var s = ui('quotes'); s.filters = { kw: val('f-kw'), status: val('f-status') }; s.page = 1; window.App.rerender(); };
  Actions['quote-reset'] = function () { window.AppUI.quotes = { page: 1, filters: {} }; window.App.rerender(); };
  Actions['quote-page'] = function (el) { ui('quotes').page = +el.dataset.page; window.App.rerender(); };

  /* 报价动作绑定展示时的对象/主数据；候选全部通过后才写入内存。 */
  var quoteEditor = null, quoteEditorSequence = 0, quoteBusy = {};
  function quoteContent(q) {
    return JSON.stringify({ quote: q, customer: U.customer(q.customerId),
      products: (Array.isArray(q.items) ? q.items : []).map(function (it) { return it && U.product(it.productId); }),
      currencies: M.dicts.filter(function (d) { return d.group === '币种'; }) });
  }
  function quoteContext(q, actor) {
    return { id: q.id, quote: q, actor: actor, actorContent: JSON.stringify(actor), content: quoteContent(q), submitted: false };
  }
  function quoteEligibility(q, actor, status) {
    if (!actor || actor.role !== 'sales' || !actor.id || !actor.name) return '只有已登录的外贸业务员可办理报价操作。';
    if (!q || M.quotes.filter(function (other) { return other.id === q.id; }).length !== 1 || U.quote(q.id) !== q) return '报价不存在或编号冲突，请重新核对。';
    if (q.status !== status) return '当前报价状态为' + q.status + '，仅' + status + '报价可办理此操作。';
    if (q.orderId || M.orders.some(function (o) { return o.quoteId === q.id; })) return '该报价已经关联订单，请查看已有订单。';
    return '';
  }
  function quoteContextError(context, status) {
    if (window.App.user !== context.actor || JSON.stringify(context.actor) !== context.actorContent || U.quote(context.id) !== context.quote ||
        context.quote.id !== context.id || quoteContent(context.quote) !== context.content) return '账号、报价或关联资料已变化，请重新打开后核对。';
    return quoteEligibility(context.quote, context.actor, status);
  }
  function quoteCandidate(q, changes) {
    changes = changes || q;
    if (M.customers.filter(function (c) { return c.id === q.customerId; }).length !== 1) return { ok: false, error: '客户关联缺失或冲突，请先核对客户资料。', field: 'customer' };
    if (!U.validCalendarDate(q.date)) return { ok: false, error: '报价日期不是有效的日历日期，请先核对报价来源。', field: 'date' };
    if (!U.validCalendarDate(changes.validUntil)) return { ok: false, error: '有效期至必须为有效的日历日期。', field: 'validUntil' };
    if (!U.currencyEnabled(changes.currency)) return { ok: false, error: '币种必须为当前启用的字典项。', field: 'currency' };
    if (typeof changes.tradeTerm !== 'string' || !changes.tradeTerm.trim()) return { ok: false, error: '贸易术语必须为非空文本。', field: 'tradeTerm' };
    if (typeof changes.paymentTerm !== 'string' || !changes.paymentTerm.trim()) return { ok: false, error: '付款方式必须为非空文本。', field: 'paymentTerm' };
    var amounts = U.transactionAmounts(changes.items);
    if (!amounts.ok) return amounts;
    for (var i = 0; i < amounts.items.length; i++) {
      if (M.products.filter(function (p) { return p.id === amounts.items[i].productId; }).length !== 1) return { ok: false, error: '第 ' + (i + 1) + ' 行商品关联缺失或冲突，请先核对商品资料。', rowIndex: i, field: 'productId' };
    }
    return { ok: true, items: amounts.items, totalCents: amounts.totalCents, total: amounts.total,
      validUntil: changes.validUntil, currency: changes.currency, tradeTerm: changes.tradeTerm.trim(), paymentTerm: changes.paymentTerm.trim(), remark: String(changes.remark || '').trim() };
  }
  function quoteReview(q, candidate) {
    return '<div class="quote-confirm-summary"><b>' + esc(U.customerName(q.customerId)) + ' · ' + U.fmt(candidate.total) + ' ' + esc(candidate.currency) + '</b>' +
      '<p class="small">' + esc(candidate.tradeTerm) + ' · ' + esc(candidate.paymentTerm) + '<br>报价：' + esc(q.date) + ' · 有效期至：' + esc(candidate.validUntil) + '</p>' +
      '<div class="table-wrap"><table class="table"><thead><tr><th>商品</th><th class="num">数量 × 单价</th><th class="num">金额（' + esc(candidate.currency) + '）</th></tr></thead><tbody>' +
      candidate.items.map(function (it) { return '<tr><td>' + esc(U.product(it.productId).nameCn) + '</td><td class="num">' + it.qty + ' × ' + U.fmt(it.price) + '</td><td class="num">' + U.fmt(it.lineCents / 100) + '</td></tr>'; }).join('') + '</tbody></table></div></div>';
  }
  function quoteError(container, message) {
    var error = container && container.querySelector('[data-quote-error]');
    if (error) error.textContent = message;
    U.toast('报价操作未生效，请查看处理说明。', 'warning');
  }

  /* ==================== 报价详情 ==================== */
  Views.quoteDetail = function (ctx) {
    var q = U.quote(ctx.params[0]);
    if (!q) return Views.notFound('报价不存在：' + ctx.params[0]);
    var isSales = ctx.user.role === 'sales';
    var checked = quoteCandidate(q), total = checked.ok ? checked.total : null;
    var itemRows = (Array.isArray(q.items) ? q.items : []).map(function (it, idx) {
      it = it || { productId: '', qty: '', price: '' };
      var p = U.product(it.productId);
      var line = U.transactionAmounts([it]);
      return '<tr><td>' + (idx + 1) + '</td><td>' + esc(p ? p.nameCn : '商品关联待核对') + '（' + esc(p ? p.nameEn : it.productId) + '）</td>' +
        '<td>' + esc(p ? p.spec : '—') + '</td><td class="num">' + esc(it.qty) + ' ' + esc(p ? p.unit : '') + '</td>' +
        '<td class="num">' + (U.decimalInput(it.price, '单价').ok ? U.fmt(it.price) : '待修正') + '</td><td class="num">' + (line.ok ? U.fmt(line.total) : '待修正') + '</td></tr>';
    }).join('');
    var actions = '';
    if (isSales && q.status === '待客户确认') {
      actions += '<a class="btn" href="#/quotes/' + q.id + '/edit">编辑报价</a>' +
        '<button class="btn btn-primary" data-action="quote-confirm" data-id="' + q.id + '">登记客户确认</button>';
    }
    if (isSales && q.status === '已确认' && !q.orderId) {
      actions += '<button class="btn btn-success" data-action="quote-gen-order" data-id="' + q.id + '">生成订单</button>';
    }
    if (q.orderId) actions += '<a class="btn" href="#/orders/' + q.orderId + '">查看订单 ' + q.orderId + '</a>';
    return '<div class="page-head"><h2>报价详情 · ' + q.id + ' ' + tag(q.status) + '</h2><div class="actions">' + actions +
      '<a class="btn" href="#/quotes">返回列表</a></div></div>' +
      (!checked.ok ? '<div class="warn-box" role="alert">报价资料待核对：' + esc(checked.error) + '</div>' : '') +
      '<div class="card"><div class="card-title">报价信息</div><div class="desc-grid">' +
      descItem('报价编号', q.id) +
      '<div class="di"><div class="dt">客户</div><div class="dd"><a href="#/customers/' + q.customerId + '">' + esc(U.customerName(q.customerId)) + '</a></div></div>' +
      '<div class="di"><div class="dt">来源询盘</div><div class="dd">' + (q.inquiryId ? '<a href="#/inquiries/' + q.inquiryId + '">' + q.inquiryId + '</a>' : '<span class="muted">直接报价</span>') + '</div></div>' +
      descItem('业务员', q.salesperson) +
      descItem('报价日期', q.date) + descItem('有效期至', q.validUntil) +
      descItem('币种', q.currency) +
      '<div class="di"><div class="dt">报价金额</div><div class="dd num"><b>' + (checked.ok ? U.fmt(total) + ' ' + esc(q.currency) : '待修正') + '</b></div></div>' +
      descItem('贸易术语', q.tradeTerm) + descItem('付款方式', q.paymentTerm) +
      descItem('确认日期', q.confirmDate || '—') +
      descItem('备注', q.remark || '—') +
      '</div></div>' +
      '<div class="card"><div class="card-title">报价明细</div>' +
      '<div class="table-wrap"><table class="table"><thead><tr><th>#</th><th>商品名称</th><th>规格</th><th class="num">数量</th><th class="num">单价（' + q.currency + '）</th><th class="num">金额（' + q.currency + '）</th></tr></thead>' +
      '<tbody>' + itemRows +
      '<tr><td colspan="5" class="num"><b>合计</b></td><td class="num"><b>' + (checked.ok ? U.fmt(total) + ' ' + esc(q.currency) : '待修正') + '</b></td></tr>' +
      '</tbody></table></div></div>';
  };

  /* 登记客户确认 */
  Actions['quote-confirm'] = function (el) {
    var q = U.quote(el.dataset.id);
    var actor = window.App.user, eligibility = quoteEligibility(q, actor, '待客户确认');
    if (eligibility) { U.toast(eligibility, 'warning'); return; }
    var candidate = quoteCandidate(q);
    if (!candidate.ok) { U.toast('不能登记客户确认：' + candidate.error, 'warning'); return; }
    var context = quoteContext(q, actor);
    var body =
      '<div class="warn-box">登记后报价状态将变为「已确认」，可据此生成订单；确认后报价内容不可再编辑。</div>' +
      quoteReview(q, candidate) +
      '<form id="qc-form">' +
      U.formItem('客户确认日期', '<input class="input" type="date" id="qc-date" value="' + U.today() + '">', { required: true }) +
      '<div class="mt8">' + U.formItem('确认说明', '<textarea class="textarea" id="qc-remark" placeholder="如：客户邮件确认接受报价条款"></textarea>') + '</div>' +
      '<div class="field-error quote-form-error" data-quote-error="1" role="alert"></div></form>';
    var footer = '<button class="btn" data-close="1">取消</button><button class="btn btn-primary" data-ok="1">确认登记</button>';
    var overlay = U.openModal({ title: '登记客户确认 · ' + q.id, body: body, footer: footer, persistent: true });
    overlay.querySelector('[data-ok]').addEventListener('click', function (e) {
      var btn = e.currentTarget;
      var form = overlay.querySelector('#qc-form');
      U.clearErrors(form);
      var date = form.querySelector('#qc-date'), confirmDate = date.value;
      if (!U.validCalendarDate(confirmDate)) { U.fieldError(date, '客户确认日期必须为有效的日历日期。'); date.focus(); return; }
      var remark = form.querySelector('#qc-remark').value.trim();
      if (context.submitted || quoteBusy[context.id] || !overlay.isConnected) return;
      var error = quoteContextError(context, '待客户确认');
      if (error) { quoteError(form, error); return; }
      quoteBusy[context.id] = true;
      U.withLoading(btn, function () {
        try {
          if (context.submitted || !overlay.isConnected) return false;
          var delayedError = quoteContextError(context, '待客户确认');
          if (delayedError) { quoteError(form, delayedError); return false; }
          q.status = '已确认'; q.confirmDate = confirmDate;
          if (remark) q.remark = (q.remark ? q.remark + '；' : '') + remark;
          context.submitted = true;
          U.closeModal(); U.toast('已登记客户确认，报价 ' + q.id + ' 现在可以生成订单'); window.App.rerender();
        } finally { delete quoteBusy[context.id]; }
      });
    });
  };

  /* 生成订单 */
  Actions['quote-gen-order'] = function (el) {
    var q = U.quote(el.dataset.id);
    var actor = window.App.user, eligibility = quoteEligibility(q, actor, '已确认');
    if (eligibility) { U.toast(eligibility, 'warning'); return; }
    var candidate = quoteCandidate(q);
    if (!candidate.ok || !U.validCalendarDate(q.confirmDate)) { U.toast('不能生成订单：' + (!candidate.ok ? candidate.error : '客户确认日期无效，请核对确认记录。'), 'warning'); return; }
    var context = quoteContext(q, actor), overlay = null;
    U.confirm({
      title: '生成订单',
      message: '将基于已确认报价 <b>' + esc(q.id) + '</b> 生成新订单，客户、商品明细与金额将由报价带入。' + quoteReview(q, candidate) +
        '<p>订单成立后，单证与收款两条支线并行推进、互不阻塞。</p><div class="field-error quote-form-error" data-quote-error="1" role="alert"></div>',
      okText: '生成订单',
      onOk: function () {
        if (context.submitted || quoteBusy[context.id] || overlay && !overlay.isConnected) return false;
        var error = quoteContextError(context, '已确认');
        if (error) { quoteError(document.getElementById('modal-root'), error); return false; }
        var nums = M.orders.map(function (o) { return parseInt(o.id.slice(2), 10); });
        var number = nums.length ? Math.max.apply(null, nums) + 1 : 2026001;
        if (!Number.isSafeInteger(number) || M.orders.some(function (o) { return !/^SO\d+$/.test(o.id); })) {
          quoteError(document.getElementById('modal-root'), '现有订单编号无法安全生成下一编号，请先核对。'); return false;
        }
        var oid = 'SO' + number;
        if (M.orders.some(function (o) { return o.id === oid; })) { quoteError(document.getElementById('modal-root'), '订单编号冲突，请先核对。'); return false; }
        var newOrder = {
          id: oid, quoteId: q.id, customerId: q.customerId, salesperson: q.salesperson,
          currency: q.currency, tradeTerm: q.tradeTerm, paymentTerm: q.paymentTerm,
          status: '待执行', docStatus: '未开始', createdAt: U.today(), deliveryDate: '',
          items: candidate.items.map(function (it) { return { productId: it.productId, qty: it.qty, price: it.price }; }),
          remark: '由报价 ' + q.id + ' 生成（演示）'
        };
        var log = [{ time: U.now(), person: actor.name, content: '报价 ' + q.id + ' 经客户确认，生成订单 ' + oid }];
        quoteBusy[context.id] = true;
        M.orders.push(newOrder);
        q.orderId = oid;
        M.orderLogs[oid] = log;
        context.submitted = true; delete quoteBusy[context.id];
        U.toast('订单 ' + oid + ' 已生成');
        location.hash = '#/orders/' + oid;
      }
    });
    var modalRoot = document.getElementById && document.getElementById('modal-root');
    overlay = modalRoot ? modalRoot.firstElementChild : null;
  };

  /* ==================== 报价编辑 ==================== */
  Views.quoteEdit = function (ctx) {
    var q = U.quote(ctx.params[0]);
    if (!q) return Views.notFound('报价不存在：' + ctx.params[0]);
    if (ctx.user.role !== 'sales') return Views.forbidden('只有外贸业务员可以编辑报价');
    if (q.status !== '待客户确认') return Views.forbidden('报价已确认，内容不可再编辑。如需调整请走订单变更申请流程');
    var eligible = quoteEligibility(q, ctx.user, '待客户确认');
    if (eligible) return Views.forbidden(eligible);
    var editor = quoteContext(q, ctx.user);
    editor.token = String(++quoteEditorSequence); quoteEditor = editor;
    var amounts = U.transactionAmounts(q.items);
    var itemRows = (Array.isArray(q.items) ? q.items : []).map(function (it, idx) {
      it = it || { productId: '', qty: '', price: '' };
      var p = U.product(it.productId);
      var line = U.transactionAmounts([it]);
      return '<tr><td>' + (idx + 1) + '</td><td>' + esc(p ? p.nameCn : '商品关联待核对') + '（' + esc(p ? p.nameEn : it.productId) + '）</td>' +
        '<td class="num"><div class="form-item quote-number"><input class="input qe-input" inputmode="decimal" id="qe-qty-' + idx + '" aria-label="第 ' + (idx + 1) + ' 行数量" aria-describedby="qe-number-help" data-idx="' + idx + '" data-field="qty" value="' + esc(it.qty) + '"><div class="field-error"></div></div></td>' +
        '<td class="num"><div class="form-item quote-number"><input class="input qe-input" inputmode="decimal" id="qe-price-' + idx + '" aria-label="第 ' + (idx + 1) + ' 行单价" aria-describedby="qe-number-help" data-idx="' + idx + '" data-field="price" value="' + esc(it.price) + '"><div class="field-error"></div></div></td>' +
        '<td class="num" id="qe-amt-' + idx + '">' + (line.ok ? U.fmt(line.total) : '待修正') + '</td></tr>';
    }).join('');
    return '<div class="page-head"><h2>编辑报价 · ' + q.id + '</h2><div class="actions"><a class="btn" href="#/quotes/' + q.id + '">返回详情</a></div></div>' +
      '<div class="card"><div class="card-title">报价条款</div>' +
      '<form id="qe-form" data-quote-id="' + esc(q.id) + '" data-quote-token="' + editor.token + '" novalidate><div class="form-grid">' +
      U.formItem('报价编号', '<input class="input" id="qe-id" value="' + q.id + '" readonly>') +
      U.formItem('客户', '<input class="input" id="qe-customer" value="' + esc(U.customerName(q.customerId)) + '" readonly>') +
      U.formItem('业务员', '<input class="input" id="qe-sales" value="' + esc(q.salesperson) + '" readonly>') +
      U.formItem('有效期至', '<input class="input" type="date" id="qe-valid" value="' + esc(q.validUntil) + '">', { required: true }) +
      '<div class="form-item"><label class="required" for="qe-currency">币种</label><select class="select" id="qe-currency">' +
        (U.currencyEnabled(q.currency) ? '' : '<option value="' + esc(q.currency) + '" selected>当前币种待核对</option>') +
        M.dicts.filter(function (d) { return d.group === '币种' && d.enabled === true; }).map(function (d) { return '<option value="' + esc(d.code) + '" ' + (q.currency === d.code ? 'selected' : '') + '>' + esc(d.code) + '</option>'; }).join('') +
      '</select><div class="field-error"></div></div>' +
      U.formItem('贸易术语', '<input class="input" id="qe-term" value="' + esc(q.tradeTerm) + '">', { required: true }) +
      '</div>' +
      '<div class="mt8">' + U.formItem('付款方式', '<input class="input" id="qe-pay" value="' + esc(q.paymentTerm) + '">', { required: true }) + '</div>' +
      '<div class="mt8">' + U.formItem('备注', '<textarea class="textarea" id="qe-remark">' + esc(q.remark) + '</textarea>') + '</div>' +
      '<div class="card-title mt16">报价明细<span class="sub">修改数量或单价后自动核对金额</span></div>' +
      '<p class="readonly-hint" id="qe-number-help">数量、单价至少 0.01，最多 2 位小数；每行金额须精确到分，不自动舍入。小数数量保留。</p>' +
      '<div class="table-wrap"><table class="table"><thead><tr><th>#</th><th>商品名称</th><th class="num">数量</th><th class="num">单价</th><th class="num">金额</th></tr></thead>' +
      '<tbody>' + itemRows +
      '<tr><td colspan="4" class="num"><b>合计</b></td><td class="num"><b id="qe-total">' + (amounts.ok ? U.fmt(amounts.total) : '待修正') + '</b> <span class="muted" id="qe-total-currency">' + esc(q.currency) + '</span></td></tr>' +
      '</tbody></table></div>' +
      '<div class="field-error quote-form-error" id="qe-form-error" data-quote-error="1" role="alert"></div>' +
      '<div class="form-actions"><a class="btn" href="#/quotes/' + q.id + '">取 消</a>' +
      '<button type="submit" class="btn btn-primary">保存报价</button></div>' +
      '</form></div>';
  };
  function quoteFormItems(form, q) {
    return (Array.isArray(q.items) ? q.items : []).map(function (it, idx) {
      var qty = form.querySelector('.qe-input[data-idx="' + idx + '"][data-field="qty"]');
      var price = form.querySelector('.qe-input[data-idx="' + idx + '"][data-field="price"]');
      return { productId: it ? it.productId : '', qty: qty ? qty.value : '', price: price ? price.value : '' };
    });
  }
  function quotePreview(form) {
    var context = quoteEditor;
    if (!context || form.dataset.quoteToken !== context.token) return;
    var items = quoteFormItems(form, context.quote), amounts = U.transactionAmounts(items);
    items.forEach(function (it, idx) {
      var node = form.querySelector('#qe-amt-' + idx), line = U.transactionAmounts([it]);
      if (node) node.textContent = line.ok ? U.fmt(line.total) : '待修正';
    });
    form.querySelector('#qe-total').textContent = amounts.ok ? U.fmt(amounts.total) : '待修正';
    form.querySelector('#qe-total-currency').textContent = form.querySelector('#qe-currency').value;
    return amounts;
  }
  function quoteCandidateError(form, candidate) {
    var input = null;
    var hasRow = Number.isInteger(candidate.rowIndex) && candidate.rowIndex >= 0;
    if (hasRow && ['qty', 'price', 'amount'].indexOf(candidate.field) >= 0) {
      input = form.querySelector('.qe-input[data-idx="' + candidate.rowIndex + '"][data-field="' + (candidate.field === 'qty' ? 'qty' : 'price') + '"]');
    } else {
      var fields = { validUntil: '#qe-valid', currency: '#qe-currency', tradeTerm: '#qe-term', paymentTerm: '#qe-pay' };
      if (fields[candidate.field]) input = form.querySelector(fields[candidate.field]);
    }
    var message = candidate.error;
    form.querySelector('#qe-form-error').textContent = message;
    if (input) {
      U.fieldError(input, message);
      if (candidate.field === 'amount' && hasRow) {
        var qty = form.querySelector('.qe-input[data-idx="' + candidate.rowIndex + '"][data-field="qty"]');
        if (qty) U.fieldError(qty, message, input.id + '-error');
      }
      input.focus();
    }
    else form.querySelector('[type="submit"]').focus();
  }
  /* 报价编辑：纯数字候选预览，非法值不伪装成零。 */
  document.addEventListener('input', function (e) {
    if (!e.target.closest || !e.target.classList || !e.target.classList.contains('qe-input') && e.target.id !== 'qe-currency') return;
    var form = e.target.closest('#qe-form'); if (!form) return;
    U.clearErrors(form); quotePreview(form);
  });
  document.addEventListener('submit', function (e) {
    if (e.target.id !== 'qe-form') return;
    e.preventDefault();
    var form = e.target;
    U.clearErrors(form);
    var context = quoteEditor;
    if (!context || context.submitted || quoteBusy[context.id]) return;
    if (form.dataset.quoteId !== context.id || form.dataset.quoteToken !== context.token || document.getElementById('qe-form') !== form ||
        location.hash !== '#/quotes/' + context.id + '/edit') { quoteError(form, '当前表单与报价不一致，请重新打开编辑页。'); return; }
    var error = quoteContextError(context, '待客户确认');
    if (error) { quoteError(form, error); return; }
    var q = context.quote;
    if (form.querySelectorAll('.qe-input').length !== (Array.isArray(q.items) ? q.items.length : 0) * 2) { quoteError(form, '报价明细表单不完整，请重新打开编辑页。'); return; }
    var candidate = quoteCandidate(q, { items: quoteFormItems(form, q), validUntil: form.querySelector('#qe-valid').value,
      currency: form.querySelector('#qe-currency').value, tradeTerm: form.querySelector('#qe-term').value.trim(),
      paymentTerm: form.querySelector('#qe-pay').value.trim(), remark: form.querySelector('#qe-remark').value.trim() });
    quotePreview(form);
    if (!candidate.ok) { quoteCandidateError(form, candidate); return; }
    var savedItems = candidate.items.map(function (it) { return { productId: it.productId, qty: it.qty, price: it.price }; });
    var btn = form.querySelector('[type="submit"]');
    quoteBusy[context.id] = true;
    U.withLoading(btn, function () {
      try {
        if (context.submitted) return;
        var delayedError = quoteContextError(context, '待客户确认');
        if (!delayedError && (!form.isConnected || document.getElementById('qe-form') !== form || quoteEditor !== context || location.hash !== '#/quotes/' + context.id + '/edit')) delayedError = '编辑页面已变化，本次未保存，请重新核对。';
        if (delayedError) { quoteError(form, delayedError); return; }
        q.validUntil = candidate.validUntil; q.currency = candidate.currency; q.tradeTerm = candidate.tradeTerm;
        q.paymentTerm = candidate.paymentTerm; q.remark = candidate.remark; q.items = savedItems;
        context.submitted = true;
        U.toast('报价 ' + q.id + ' 已保存'); location.hash = '#/quotes/' + q.id;
      } finally { delete quoteBusy[context.id]; }
    });
  });

  /* ==================== 订单列表 ==================== */
  Views.orders = function () {
    var s = ui('orders'), f = s.filters;
    var list = M.orders.filter(function (o) {
      if (f.no && o.id.toLowerCase().indexOf(f.no.toLowerCase()) < 0) return false;
      if (f.cust && U.customerName(o.customerId).toLowerCase().indexOf(f.cust.toLowerCase()) < 0) return false;
      if (f.sales && o.salesperson !== f.sales) return false;
      if (f.status && o.status !== f.status) return false;
      if (f.pay && U.payStatus(o) !== f.pay) return false;
      if (f.from && o.createdAt < f.from) return false;
      if (f.to && o.createdAt > f.to) return false;
      return true;
    }).sort(function (a, b) { return b.createdAt.localeCompare(a.createdAt); });
    var pg = U.page(list, s.page);
    s.visibleIds = pg.rows.map(function (o) { return o.id; });
    var selected = pg.rows.find(function (o) { return o.id === s.selectedId; }) || pg.rows[0];
    s.selectedId = selected ? selected.id : null;
    var rows = pg.rows.map(function (o) {
      var fin = U.orderFin(o);
      var customer = U.customer(o.customerId);
      return '<tr><td><a href="#/orders/' + o.id + '"><b>' + o.id + '</b></a>' +
        '<span class="cell-secondary">报价 <a href="#/quotes/' + o.quoteId + '">' + o.quoteId + '</a></span></td>' +
        '<td><span>' + esc(customer ? customer.nameCn : o.customerId) + '</span><span class="cell-secondary">' + esc(customer ? customer.nameEn : '') + '</span></td>' +
        '<td>' + esc(o.salesperson) + '</td>' +
        '<td class="num">' + U.fmt(fin.total) + ' ' + o.currency + '</td>' +
        '<td class="center">' + tag(o.status) + '</td>' +
        '<td class="center">' + tag(o.docStatus) + '</td>' +
        '<td class="center">' + tag(U.payStatus(o)) + '</td>' +
        '<td>' + o.createdAt + '</td>' +
        '<td><a class="btn btn-sm" href="#/orders/' + o.id + '">查看</a></td></tr>';
    }).join('');
    var hasFilter = Object.keys(f).some(function (k) { return f[k]; });
    if (!rows) rows = U.emptyRow(9, hasFilter ? '没有符合筛选条件的结果，请调整筛选条件' : '暂无订单记录');
    var salespeople = M.orders.map(function (o) { return o.salesperson; }).filter(function (v, i, a) { return a.indexOf(v) === i; });
    function sel(id, cur, opts) {
      return '<select class="select" id="' + id + '"><option value="">全部</option>' +
        opts.map(function (v) { return '<option ' + (cur === v ? 'selected' : '') + '>' + v + '</option>'; }).join('') + '</select>';
    }
    var expanded = !!(s.advanced || f.sales || f.pay || f.from || f.to);
    var filterNames = { no: '订单编号', cust: '客户', sales: '业务员', status: '订单状态', pay: '收款状态', from: '创建日期起', to: '创建日期止' };
    var filterSummary = hasFilter ? '<div class="filter-summary"><span>当前筛选</span>' + Object.keys(f).filter(function (k) { return f[k]; }).map(function (k) {
      return '<span class="filter-chip">' + filterNames[k] + '：' + esc(f[k]) + '</span>';
    }).join('') + '<button class="btn btn-text" data-action="orders-reset">清空筛选</button></div>' : '';
    var splitRows = pg.rows.map(function (o) {
      return '<button type="button" class="order-pick' + (o.id === s.selectedId ? ' selected' : '') + '" data-action="orders-select" data-id="' + esc(o.id) + '" aria-pressed="' + (o.id === s.selectedId) + '" aria-controls="order-inspector">' +
        '<span class="order-pick-head"><strong>' + esc(o.id) + '</strong><span class="order-pick-amount">' + U.money(U.orderTotal(o), o.currency) + '</span></span>' +
        '<span class="order-pick-customer">' + esc(U.customerName(o.customerId)) + '</span>' +
        '<span class="order-pick-meta">' + esc(o.salesperson) + ' · 创建 ' + esc(o.createdAt) + ' · 交期 ' + esc(o.deliveryDate) + '</span>' +
        '<span class="order-pick-status"><span><small>订单</small>' + tag(o.status) + '</span><span><small>单证</small>' + tag(o.docStatus) + '</span><span><small>收款</small>' + tag(U.payStatus(o)) + '</span></span></button>';
    }).join('') || '<div class="empty-state">' + (hasFilter ? '没有符合筛选条件的结果，请调整筛选条件' : '暂无订单记录') + '</div>';
    return '<div class="page-head"><div><div class="workspace-eyebrow">订单协同 / ORDER WORKSPACE</div><h2>订单工作区 <span class="tag tag-gray">原型样例</span></h2><p class="page-description">选择订单，同屏核对订单、单证与收款的独立进度。</p></div><div class="actions">' +
      (window.App.user.role === 'sales' ? '<a class="btn btn-primary" href="#/quotes">新建报价</a>' : '') +
      '</div></div>' +
      '<div class="orders-stage' + (s.tableView ? ' table-mode' : '') + '" id="orders-stage">' +
      '<div class="filter-bar orders-filter"><div class="filter-primary">' +
      window.__filterInput('订单编号', 'o-no', f.no, '如 SO2026001') +
      window.__filterInput('客户名称', 'o-cust', f.cust, '中/英文名') +
      '<div class="form-item"><label>订单状态</label>' + sel('o-status', f.status, ['待执行', '执行中', '已完成', '取消申请中']) + '</div>' +
      '</div><div class="filter-actions"><button class="btn" data-action="orders-reset">重置</button><button class="btn btn-primary" data-action="orders-filter">查询</button>' +
      '<button class="btn btn-text" data-action="orders-more" aria-expanded="' + expanded + '" aria-controls="orders-advanced">' + (expanded ? '收起筛选' : '更多筛选') + '</button></div>' +
      '<div class="filter-advanced" id="orders-advanced" ' + (expanded ? '' : 'hidden') + '>' +
      '<div class="form-item"><label>业务员</label>' + sel('o-sales', f.sales, salespeople) + '</div>' +
      '<div class="form-item"><label>收款状态</label>' + sel('o-pay', f.pay, ['未收款', '部分收款', '已结清']) + '</div>' +
      '<div class="form-item"><label>创建日期起</label><input class="input" type="date" id="o-from" value="' + esc(f.from || '') + '"></div>' +
      '<div class="form-item"><label>创建日期止</label><input class="input" type="date" id="o-to" value="' + esc(f.to || '') + '"></div>' +
      '</div>' + filterSummary + '</div>' +
      '<div class="orders-view-bar"><span class="muted small">共 ' + list.length + ' 笔 · 金额按订单币种展示</span><div class="orders-view-switch" aria-label="订单展示方式"><button class="btn btn-sm" data-action="orders-view" data-view="split" aria-pressed="' + !s.tableView + '">协同视图</button><button class="btn btn-sm" data-action="orders-view" data-view="table" aria-pressed="' + !!s.tableView + '">表格视图</button></div></div>' +
      '<div class="order-workspace" id="orders-split-view"' + (s.tableView ? ' hidden' : '') + '><section class="order-selection" aria-label="订单选择"><div class="order-selection-title"><h3>订单列表</h3><span class="record-count">' + list.length + ' 笔</span><span class="order-list-hint">本页 ' + pg.rows.length + ' 笔' + (pg.rows.length > 3 ? ' · 向下滚动查看' : '') + '</span></div><div class="order-pick-list">' + splitRows + '</div>' + U.pagination(pg, 'orders-page') + '</section><section class="order-inspector" id="order-inspector" aria-label="所选订单进度">' + orderInspector(selected) + '</section><span class="sr-only" role="status" id="order-selection-status" aria-live="polite" aria-atomic="true"></span></div>' +
      '<div id="orders-table-view"' + (s.tableView ? '' : ' hidden') + '><div class="table-toolbar"><h3>订单记录<span class="record-count">' + list.length + ' 笔</span></h3><button class="btn btn-sm" data-action="orders-density" aria-pressed="' + !!s.compact + '">' + U.icon('rows') + '紧凑行距</button></div>' +
      '<div class="table-wrap"><table class="table order-table ' + (s.compact ? 'is-compact' : '') + '"><thead><tr>' +
      '<th>订单 / 来源报价</th><th>客户</th><th>业务员</th><th class="num">订单金额</th>' +
      '<th class="center">订单状态</th><th class="center">单证状态</th><th class="center">收款状态</th><th>创建时间</th><th>操作</th>' +
      '</tr></thead><tbody>' + rows + '</tbody></table></div>' +
      U.pagination(pg, 'orders-page') + '</div></div>';
  };
  function orderInspector(o) {
    if (!o) return '<div class="order-inspector-empty">' + U.icon('file') + '<h3>暂无可查看的订单</h3><p>调整或重置筛选后，在左侧选择订单。</p></div>';
    var fin = U.orderFin(o), role = window.App.user.role;
    var paySt = U.payStatus(o), pct = fin.total > 0 ? Math.min(100, Math.round(fin.received / fin.total * 100)) : 0;
    var cancelled = o.status === '已取消' || o.status === '取消申请中';
    function documentPriority(d) {
      if (role === 'boss' && d.status === '待审核') return 3;
      if (role === 'doc' && d.status === '已退回') return 3;
      if (role === 'doc' && (d.status === '草稿' || d.status === '制作中')) return 2;
      return 0;
    }
    var doc = M.documents.filter(function (d) {
      return d.orderId === o.id && !M.documents.some(function (other) { return other.no === d.no && other.version > d.version; });
    }).sort(function (a, b) { return documentPriority(b) - documentPriority(a) || b.version - a.version; })[0];
    var next = '<a class="btn" href="#/orders/' + esc(o.id) + '">查看完整订单' + U.icon('arrow') + '</a>';
    if (doc && (role === 'boss' || role === 'doc')) next += '<a class="btn btn-primary" href="#/documents/' + esc(doc.id) + '">' + (role === 'boss' && doc.status === '待审核' ? '查看待审单证' : role === 'doc' && doc.status === '已退回' ? '修订退回单证' : '查看关联单证') + '</a>';
    if (role === 'fin' && fin.outstanding > 0.005 && o.status !== '已取消') next += '<a class="btn btn-primary" href="#/payments?order=' + esc(o.id) + '">登记收款</a>';
    return '<div class="inspector-heading"><div><span>当前订单</span><h3>' + esc(o.id) + '</h3></div><div class="inspector-total"><span>订单金额</span><strong>' + U.money(fin.total, o.currency) + '</strong></div></div>' +
      '<div class="inspector-context"><span>' + esc(U.customerName(o.customerId)) + '</span><span>来源报价 ' + esc(o.quoteId) + ' · 交期 ' + esc(o.deliveryDate) + '</span></div>' +
      '<div class="inspector-tracks"><section class="inspector-track track-order"><div class="track-title"><h4>订单进度</h4>' + tag(o.status) + '</div>' + stepsHtml(['待执行', '执行中', '已完成'], cancelled ? '' : o.status, {}) + (cancelled ? '<p class="track-note">' + (o.status === '已取消' ? '订单已取消，关联业务终止。' : '取消申请审批中，订单暂缓执行。') + '</p>' : '') + '</section>' +
      '<section class="inspector-track track-doc"><div class="track-title"><h4>单证进度</h4>' + tag(o.docStatus) + '</div>' + documentStages(o) + '</section>' +
      '<section class="inspector-track track-pay"><div class="track-title"><h4>收款进度</h4>' + tag(paySt) + '</div><div class="progress" role="progressbar" aria-label="订单收款比例" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + pct + '"><div class="bar' + (paySt === '已结清' ? ' green' : '') + '" style="width:' + pct + '%"></div></div><div class="track-money"><div><span>已收</span><strong>' + U.money(fin.received, o.currency) + '</strong></div><div><span>未收</span><strong>' + U.money(fin.outstanding, o.currency) + '</strong></div></div></section></div>' +
      '<div class="inspector-actions">' + next + '</div><p class="inspector-footnote">单证与收款并行推进，互不阻塞。</p>';
  }
  Actions['orders-select'] = function (el) {
    var s = ui('orders');
    if (!window.App.user || ['sales', 'doc', 'fin', 'boss'].indexOf(window.App.user.role) < 0 || !s.visibleIds || s.visibleIds.indexOf(el.dataset.id) < 0) return;
    var o = U.order(el.dataset.id);
    if (!o) return;
    s.selectedId = o.id;
    document.querySelectorAll('.order-pick').forEach(function (row) {
      var selected = row.dataset.id === o.id;
      row.classList.toggle('selected', selected);
      row.setAttribute('aria-pressed', selected);
    });
    document.getElementById('order-inspector').innerHTML = orderInspector(o);
    document.getElementById('order-selection-status').textContent = '已选择订单 ' + o.id + '。右侧显示独立的订单、单证与收款进度。';
  };
  Actions['orders-view'] = function (el) {
    var s = ui('orders');
    if (el.dataset.view !== 'table' && el.dataset.view !== 'split') return;
    s.tableView = el.dataset.view === 'table';
    document.getElementById('orders-stage').classList.toggle('table-mode', s.tableView);
    document.getElementById('orders-split-view').hidden = s.tableView;
    document.getElementById('orders-table-view').hidden = !s.tableView;
    document.querySelectorAll('[data-action="orders-view"]').forEach(function (button) {
      button.setAttribute('aria-pressed', (button.dataset.view === 'table') === s.tableView);
    });
  };
  Actions['orders-more'] = function (el) {
    var panel = document.getElementById('orders-advanced');
    panel.hidden = !panel.hidden;
    ui('orders').advanced = !panel.hidden;
    el.setAttribute('aria-expanded', !panel.hidden);
    el.textContent = panel.hidden ? '更多筛选' : '收起筛选';
  };
  Actions['orders-density'] = function (el) {
    var s = ui('orders');
    s.compact = !s.compact;
    document.querySelector('.order-table').classList.toggle('is-compact', s.compact);
    el.setAttribute('aria-pressed', s.compact);
  };
  Actions['orders-filter'] = function () {
    var s = ui('orders');
    s.filters = { no: val('o-no'), cust: val('o-cust'), sales: val('o-sales'), status: val('o-status'), pay: val('o-pay'), from: val('o-from'), to: val('o-to') };
    s.page = 1; window.App.rerender();
  };
  Actions['orders-reset'] = function () { window.AppUI.orders = { page: 1, filters: {} }; window.App.rerender(); };
  Actions['orders-page'] = function (el) { ui('orders').page = +el.dataset.page; window.App.rerender(); };

  /* ==================== 订单详情（核心页） ==================== */
  var ORDER_TABS = [
    { key: 'overview', name: '订单概况' },
    { key: 'items', name: '商品明细' },
    { key: 'docs', name: '关联单证' },
    { key: 'pay', name: '收款情况' },
    { key: 'changes', name: '审核与变更记录' },
    { key: 'logs', name: '操作日志' }
  ];

  Views.orderDetail = function (ctx) {
    var o = U.order(ctx.params[0]);
    if (!o) return Views.notFound('订单不存在：' + ctx.params[0]);
    var role = ctx.user.role;
    var fin = U.orderFin(o);
    var paySt = U.payStatus(o);
    var tab = ctx.query.tab || 'overview';
    if (!ORDER_TABS.some(function (t) { return t.key === tab; })) tab = 'overview';

    /* 头部操作按钮：按角色 + 状态 */
    var btns = '<a class="btn" href="#/quotes/' + o.quoteId + '">查看来源报价</a>';
    if (role === 'doc' && o.docStatus !== '已通过' && o.status !== '取消申请中' && o.status !== '已取消') {
      btns += '<a class="btn btn-primary" href="#/documents">制作单证</a>';
    }
    if (role === 'fin' && fin.outstanding > 0.005 && o.status !== '已取消') {
      btns += '<a class="btn btn-primary" href="#/payments?order=' + o.id + '">登记收款</a>';
    }
    if (role === 'sales' && (o.status === '执行中' || o.status === '待执行')) {
      btns += '<button class="btn btn-danger" data-action="order-apply-change" data-id="' + o.id + '">申请变更</button>';
    }

    /* 三条独立进度 */
    var orderStepsHtml = stepsHtml(['待执行', '执行中', '已完成'], o.status, {});
    var cancelNote = '';
    if (o.status === '取消申请中') {
      orderStepsHtml = stepsHtml(['待执行', '执行中', '已完成'], '', {});
      cancelNote = '<div class="mt8">' + tag('取消申请中') + ' <span class="muted small">取消申请审批中，订单暂缓执行</span></div>';
    }
    if (o.status === '已取消') {
      orderStepsHtml = stepsHtml(['待执行', '执行中', '已完成'], '', {});
      cancelNote = '<div class="mt8">' + tag('已取消') + ' <span class="muted small">订单已取消，关联业务终止</span></div>';
    }
    var docStepsHtml = documentStages(o);
    var pct = fin.total > 0 ? Math.min(100, Math.round(fin.received / fin.total * 100)) : 0;
    var barCls = paySt === '已结清' ? 'green' : paySt === '部分收款' ? 'orange' : '';
    var payHtml =
      '<div class="progress"><div class="bar ' + barCls + '" style="width:' + pct + '%"></div></div>' +
      '<div class="progress-info"><span>已收 ' + U.fmt(fin.received) + ' / ' + U.fmt(fin.total) + ' ' + o.currency + '（' + pct + '%）</span><span>' + tag(paySt) + '</span></div>';

    var tabsHtml = ORDER_TABS.map(function (t) {
      return '<button class="tab ' + (t.key === tab ? 'active' : '') + '" data-action="order-tab" data-id="' + o.id + '" data-tab="' + t.key + '" aria-pressed="' + (t.key === tab) + '">' + t.name + '</button>';
    }).join('');

    return '<div class="order-head-card">' +
      '<div class="order-head-top">' +
        '<div><h2 class="oh-title">订单 ' + o.id + ' ' + tag(o.status) + '</h2>' +
        '<div class="oh-sub"><span>客户：<a href="#/customers/' + o.customerId + '">' + esc(U.customerName(o.customerId)) + '</a></span>' +
        '<span>业务员：' + esc(o.salesperson) + '</span><span>创建：' + o.createdAt + '</span></div></div>' +
        '<div class="order-head-actions">' + btns + '</div>' +
      '</div>' +
      '<div class="order-summary"><div><span>订单金额</span><strong>' + U.money(fin.total, o.currency) + '</strong></div>' +
        '<div><span>已收金额</span><strong>' + U.money(fin.received, o.currency) + '</strong></div><div><span>未收金额</span><strong>' + U.money(fin.outstanding, o.currency) + '</strong></div>' +
        '<div class="summary-term"><span>贸易与付款条款</span><b>' + esc(o.tradeTerm) + ' · ' + esc(o.paymentTerm) + '</b></div></div>' +
      '<div class="progress-triple">' +
        '<div class="pt-block"><div class="pt-label"><b>订单进度</b>' + tag(o.status) + '</div>' + orderStepsHtml + cancelNote + '</div>' +
        '<div class="pt-block"><div class="pt-label"><b>单证进度</b>' + tag(o.docStatus) + '</div>' + docStepsHtml + '</div>' +
        '<div class="pt-block"><div class="pt-label"><b>收款进度</b><span class="muted">未收 ' + U.fmt(fin.outstanding) + ' ' + o.currency + '</span></div>' + payHtml + '</div>' +
      '</div></div>' +
      '<div class="tabs">' + tabsHtml + '</div>' +
      '<div id="order-tab-body">' + orderTabBody(o, tab, ctx) + '</div>';
  };
  Actions['order-tab'] = function (el) {
    location.hash = '#/orders/' + el.dataset.id + '?tab=' + el.dataset.tab;
  };

  function stepsHtml(steps, current, warnMap) {
    var curIdx = steps.indexOf(current);
    return '<div class="steps">' + steps.map(function (s, i) {
      var cls = i < curIdx ? 'done' : i === curIdx ? (warnMap[current] !== undefined ? 'warn' : (current === '已通过' || current === '已完成' ? 'done' : 'current')) : '';
      return '<div class="step ' + cls + '"><div class="dot">' + (i < curIdx || cls === 'done' ? '✓' : (i + 1)) + '</div><div class="label">' + s + '</div></div>';
    }).join('') + '</div>';
  }

  /* 订单汇总只为两类最新单证共同完成的阶段画勾，不从汇总标签推断全部已送审。 */
  function documentStages(o) {
    var types = ['CI', 'PL'], latest = {};
    M.documents.filter(function (d) { return d.orderId === o.id && types.indexOf(d.type) >= 0; }).forEach(function (d) {
      if (!latest[d.type] || d.version > latest[d.type].version) latest[d.type] = d;
    });
    var docs = Object.keys(latest).map(function (type) { return latest[type]; });
    var sent = docs.filter(function (d) { return ['待审核', '已通过', '已退回'].indexOf(d.status) >= 0; }).length;
    var approved = docs.filter(function (d) { return d.status === '已通过'; }).length;
    var returned = docs.filter(function (d) { return d.status === '已退回'; }).length;
    var reviewing = docs.filter(function (d) { return d.status === '待审核'; }).length;
    var drafting = docs.some(function (d) { return ['草稿', '制作中', '已退回'].indexOf(d.status) >= 0; });
    var allSent = sent === types.length, allApproved = approved === types.length;
    var exportReady = allApproved && docs.every(function (d) { return U.documentPolicy(d, window.App.user).canExport; });
    var stages = [
      { label: '制作', state: returned ? 'warn' : allSent ? 'done' : sent ? 'partial' : drafting ? 'current' : '' },
      { label: '送审', state: returned ? 'partial' : allSent ? 'done' : sent ? 'partial' : '' },
      { label: '审核', state: allApproved ? 'done' : returned || reviewing ? 'warn' : approved ? 'partial' : '' },
      { label: '可导出', state: exportReady ? 'ready' : '' }
    ];
    var note = docs.length ? '最新单证 ' + docs.length + ' 份 · ' + (returned ? '曾送审 ' : '已送审 ') + sent + '/' + types.length + ' 类' +
      (returned ? ' · 含退回 ' + returned + ' 份，修订后重新送审' : reviewing ? ' · 待审核 ' + reviewing + ' 份' : allApproved ? ' · 已满足审核条件' : '') : '尚未制作单证';
    if (o.status === '已取消' || o.status === '取消申请中') note += ' · 订单' + o.status + '，单证操作与导出暂停';
    var active = returned ? 0 : reviewing ? 2 : drafting ? 0 : exportReady ? 3 : -1;
    return '<div class="steps document-stages" role="list" aria-label="单证阶段">' + stages.map(function (stage, i) {
      var marker = stage.state === 'done' ? '✓' : stage.state === 'ready' ? U.icon('arrow') : stage.state === 'warn' && returned ? '!' : i + 1;
      var stateText = stage.state === 'done' ? '已完成' : stage.state === 'partial' ? '部分完成' : stage.state === 'current' ? '正在制作' :
        stage.state === 'warn' ? (returned ? '有单证退回，需修订后重新送审' : '有单证待审核') : stage.state === 'ready' ? '条件已满足，可导出' : '条件尚未满足';
      return '<div class="step ' + stage.state + '" role="listitem"' + (i === active ? ' aria-current="step"' : '') + '><div class="dot" aria-hidden="true">' + marker + '</div><div class="label">' + stage.label + '<span class="sr-only">，' + stateText + '</span></div></div>';
    }).join('') + '</div><p class="document-stage-note">' + note + '</p>';
  }

  function orderTabBody(o, tab, ctx) {
    var fin = U.orderFin(o);
    if (tab === 'overview') {
      var q = U.quote(o.quoteId);
      return '<div class="card"><div class="card-title">订单概况</div><div class="desc-grid">' +
        '<div class="di"><div class="dt">客户</div><div class="dd"><a href="#/customers/' + o.customerId + '">' + esc(U.customerName(o.customerId)) + '</a></div></div>' +
        descItem('业务员', o.salesperson) +
        '<div class="di"><div class="dt">来源报价</div><div class="dd"><a href="#/quotes/' + o.quoteId + '">' + o.quoteId + '</a>' + (q && q.inquiryId ? '（询盘 <a href="#/inquiries/' + q.inquiryId + '">' + q.inquiryId + '</a>）' : '') + '</div></div>' +
        descItem('创建时间', o.createdAt) +
        descItem('要求交期', o.deliveryDate || '—') +
        descItem('币种', o.currency) +
        '<div class="di"><div class="dt">订单金额</div><div class="dd num"><b>' + U.fmt(fin.total) + ' ' + o.currency + '</b></div></div>' +
        descItem('付款方式', o.paymentTerm) +
        descItem('贸易术语', o.tradeTerm) +
        descItem('订单状态', o.status) +
        descItem('单证状态', o.docStatus) +
        descItem('备注', o.remark || '—') +
        '</div>' +
        '<div class="muted small mt8">提示：订单核心交易数据（客户、商品、金额、条款）由报价带入，单证员与财务人员均为只读；金额变更须走「申请变更」审批流程。</div></div>';
    }
    if (tab === 'items') {
      var rows = o.items.map(function (it, i) {
        var p = U.product(it.productId);
        return '<tr><td>' + (i + 1) + '</td><td><a href="#/products/' + p.id + '">' + esc(p.nameCn) + '（' + esc(p.nameEn) + '）</a></td>' +
          '<td>' + esc(p.spec) + '</td><td class="num">' + it.qty + ' ' + esc(p.unit) + '</td>' +
          '<td class="num">' + U.fmt(it.price) + '</td><td class="num">' + U.fmt(it.qty * it.price) + '</td></tr>';
      }).join('');
      return '<div class="card"><div class="card-title">商品明细</div>' +
        '<div class="table-wrap"><table class="table"><thead><tr><th>#</th><th>商品名称</th><th>规格</th><th class="num">数量</th><th class="num">成交单价（' + o.currency + '）</th><th class="num">金额（' + o.currency + '）</th></tr></thead>' +
        '<tbody>' + rows +
        '<tr><td colspan="5" class="num"><b>合计</b></td><td class="num"><b>' + U.fmt(fin.total) + ' ' + o.currency + '</b></td></tr>' +
        '</tbody></table></div></div>';
    }
    if (tab === 'docs') {
      var docs = M.documents.filter(function (d) { return d.orderId === o.id; });
      var drows = docs.map(function (d) {
        return '<tr><td class="center">' + tag(U.docTypeName(d.type)) + '</td><td><a href="#/documents/' + d.id + '">' + d.no + '</a></td>' +
          '<td class="center">V' + d.version + '</td><td class="center">' + tag(d.status) + '</td>' +
          '<td>' + esc(d.maker) + '</td><td>' + esc(d.updatedAt) + '</td>' +
          '<td><a class="btn btn-sm" href="#/documents/' + d.id + '">' + (ctx.user.role === 'boss' && d.status === '待审核' ? '去审核' : '查看') + '</a></td></tr>';
      }).join('') || U.emptyRow(7, '该订单尚未创建单证');
      return '<div class="card"><div class="card-title">关联单证<span class="sub">同一单证号的多个版本会分别列出，受控修订生成新版本</span></div>' +
        '<div class="table-wrap"><table class="table"><thead><tr><th class="center">类型</th><th>单证编号</th><th class="center">版本</th><th class="center">审核状态</th><th>制单人</th><th>更新时间</th><th>操作</th></tr></thead>' +
        '<tbody>' + drows + '</tbody></table></div></div>';
    }
    if (tab === 'pay') {
      var records = M.payments.filter(function (p) { return p.orderId === o.id; }).sort(function (a, b) { return a.date.localeCompare(b.date); });
      var rrows = records.map(function (p) {
        return '<tr><td>' + p.id + '</td><td>' + p.date + '</td><td class="num">' + U.fmt(p.amount) + ' ' + p.currency + '</td>' +
          '<td>' + esc(p.method) + '</td><td>' + esc(p.remark || '—') + '</td><td>' + esc(p.operator) + '</td></tr>';
      }).join('') || U.emptyRow(6, '暂无收款记录');
      var pct = fin.total > 0 ? Math.min(100, Math.round(fin.received / fin.total * 100)) : 0;
      return '<div class="fin-summary">' +
        '<div class="stat-card accent-blue"><span class="sc-label">应收金额</span><span class="sc-value num" style="font-size:22px">' + U.fmt(fin.total) + '</span><span class="sc-foot">' + o.currency + '</span></div>' +
        '<div class="stat-card accent-green"><span class="sc-label">已收金额（收款记录合计）</span><span class="sc-value num" style="font-size:22px">' + U.fmt(fin.received) + '</span><span class="sc-foot">' + o.currency + ' · 共 ' + records.length + ' 笔</span></div>' +
        '<div class="stat-card accent-red"><span class="sc-label">未收金额</span><span class="sc-value num" style="font-size:22px">' + U.fmt(fin.outstanding) + '</span><span class="sc-foot">' + o.currency + '</span></div>' +
        '</div>' +
        '<div class="card"><div class="card-title">收款进度 ' + tag(U.payStatus(o)) + '</div>' +
        '<div class="progress"><div class="bar ' + (pct >= 100 ? 'green' : pct > 0 ? 'orange' : '') + '" style="width:' + pct + '%"></div></div>' +
        '<div class="progress-info"><span>' + pct + '%（进度条仅辅助，以金额数字为准）</span><span>不同币种分别统计，不合并折算</span></div></div>' +
        '<div class="card"><div class="card-title">收款记录</div>' +
        '<div class="table-wrap"><table class="table"><thead><tr><th>收款编号</th><th>收款日期</th><th class="num">金额</th><th>方式</th><th>备注</th><th>登记人</th></tr></thead>' +
        '<tbody>' + rrows + '</tbody></table></div></div>';
    }
    if (tab === 'changes') {
      var related = M.approvals.filter(function (a) {
        if (a.targetType === 'order' && a.targetId === o.id) return true;
        if (a.targetType === 'doc') { var d = U.doc(a.targetId); return d && d.orderId === o.id; }
        return false;
      });
      var crows = related.map(function (a) {
        return '<tr><td class="center">' + tag(a.type) + '</td><td>' + esc(a.title) + '</td>' +
          '<td>' + esc(a.applicant) + '</td><td>' + esc(a.applyTime) + '</td><td class="center">' + tag(a.status) + '</td>' +
          '<td>' + esc(a.handler || '—') + '</td><td>' + esc(a.handleTime || '—') + '</td><td>' + esc(a.opinion || '—') + '</td></tr>';
      }).join('') || U.emptyRow(8, '暂无审核与变更记录');
      return '<div class="card"><div class="card-title">审核与变更记录</div>' +
        '<div class="table-wrap"><table class="table"><thead><tr><th class="center">类型</th><th>事项</th><th>申请人</th><th>申请时间</th><th class="center">结果</th><th>处理人</th><th>处理时间</th><th>处理意见</th></tr></thead>' +
        '<tbody>' + crows + '</tbody></table></div></div>';
    }
    /* logs */
    var logs = (M.orderLogs[o.id] || []).slice().sort(function (a, b) { return b.time.localeCompare(a.time); });
    var lhtml = logs.map(function (l) {
      return '<div class="tl-item"><div class="tl-meta"><span>' + esc(l.time) + '</span><span>' + esc(l.person) + '</span></div>' +
        '<div class="tl-content">' + esc(l.content) + '</div></div>';
    }).join('') || '<div class="empty-state">暂无操作日志</div>';
    return '<div class="card"><div class="card-title">操作日志</div><div class="timeline">' + lhtml + '</div></div>';
  }

  /* 申请变更（改价 / 取消） */
  Actions['order-apply-change'] = function (el) {
    var o = U.order(el.dataset.id);
    var actor = window.App.user;
    if (!o || !actor || actor.role !== 'sales' || ['待执行', '执行中'].indexOf(o.status) < 0) {
      U.toast('仅业务员可对待执行或执行中的订单申请变更', 'warning');
      return;
    }
    var openedStatus = o.status, openedCurrency = o.currency, submitted = false;
    var fin = U.orderFin(o);
    var body =
      '<form id="oc-form">' +
      '<div class="form-item"><label class="required">变更类型</label>' +
      '<select class="select" id="oc-type"><option value="改价申请">改价申请（调整订单金额）</option><option value="取消申请">取消申请（取消整笔订单）</option></select>' +
      '<div class="field-error"></div></div>' +
      '<div class="form-item mt8" id="oc-amount-wrap">' + '<label class="required">变更后订单金额（' + o.currency + '）</label>' +
      '<input class="input" id="oc-amount" value="' + fin.total.toFixed(2) + '">' +
      '<div class="readonly-hint">当前订单金额：' + U.fmt(fin.total) + ' ' + o.currency + '</div><div class="field-error"></div></div>' +
      '<div class="form-item mt8"><label class="required">申请原因</label>' +
      '<textarea class="textarea" id="oc-reason" placeholder="请说明变更背景、与客户的协商结果"></textarea><div class="field-error"></div></div>' +
      '<div id="oc-danger"></div>' +
      '</form>';
    var footer = '<button class="btn" data-close="1">取消</button><button class="btn btn-primary" data-ok="1">提交申请</button>';
    var overlay = U.openModal({ title: '申请变更 · 订单 ' + o.id, body: body, footer: footer, persistent: true });
    var typeSel = overlay.querySelector('#oc-type');
    function refreshType() {
      var isCancel = typeSel.value === '取消申请';
      overlay.querySelector('#oc-amount-wrap').style.display = isCancel ? 'none' : '';
      overlay.querySelector('#oc-danger').innerHTML = isCancel
        ? '<div class="danger-box mt8">提交后订单暂缓执行，单证操作与导出暂停；主管通过后订单取消。历史版本与审核记录保留。已收款 ' + U.fmt(fin.received) + ' ' + o.currency + ' 需另行协商退还，本操作不登记退款。</div>'
        : '';
      var okBtn = overlay.querySelector('[data-ok]');
      okBtn.className = 'btn ' + (isCancel ? 'btn-danger' : 'btn-primary');
    }
    typeSel.addEventListener('change', refreshType);
    refreshType();
    overlay.querySelector('[data-ok]').addEventListener('click', function (e) {
      var btn = e.currentTarget;
      var form = overlay.querySelector('#oc-form');
      U.clearErrors(form);
      var isCancel = typeSel.value === '取消申请';
      var rules = [{ el: form.querySelector('#oc-reason'), label: '申请原因', required: true }];
      if (!isCancel) rules.push({ el: form.querySelector('#oc-amount'), label: '变更后订单金额', required: true, number: true, min: 0.01 });
      if (!U.validate(rules)) return;
      var requestedType = typeSel.value;
      var requestedAmount = isCancel ? null : Number(form.querySelector('#oc-amount').value);
      var requestedReason = form.querySelector('#oc-reason').value.trim();
      U.withLoading(btn, function () {
        if (submitted) return;
        if (window.App.user !== actor || actor.role !== 'sales' || U.order(o.id) !== o || o.status !== openedStatus || o.currency !== openedCurrency) {
          U.toast('账号或订单状态已变化，请关闭弹窗后重新核对申请', 'warning');
          return;
        }
        if (M.approvals.some(function (a) { return a.type === requestedType && a.targetId === o.id && a.status === '待处理'; })) {
          U.toast('该订单已有待处理' + requestedType + '，请查看已有申请', 'warning');
          return;
        }
        var title = isCancel
          ? '订单 ' + o.id + ' 申请取消'
          : '订单 ' + o.id + ' 申请改价至 ' + U.fmt(requestedAmount) + ' ' + openedCurrency;
        M.approvals.unshift({
          id: 'AP' + U.today().replace(/-/g, '') + String(M.approvals.length + 1),
          type: isCancel ? '取消申请' : '改价申请', targetType: 'order', targetId: o.id,
          title: title, applicant: window.App.user.name, applyTime: U.now(),
          reason: requestedReason,
          status: '待处理', handler: null, handleTime: null, opinion: null,
          targetAmount: requestedAmount,
          priorOrderStatus: isCancel ? openedStatus : null
        });
        if (isCancel) o.status = '取消申请中';
        M.orderLogs[o.id] = (M.orderLogs[o.id] || []).concat([{ time: U.now(), person: window.App.user.name, content: '提交' + title }]);
        submitted = true;
        setTimeout(function () {
          U.closeModal();
          U.toast('变更申请已提交，等待业务主管审批');
          window.App.rerender();
        }, 480);
      });
    });
  };
})();
