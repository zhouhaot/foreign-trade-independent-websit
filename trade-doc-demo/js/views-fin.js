/* ============================================================
 * views-fin.js — 收款与应收 / 审核与异常处理
 * ============================================================ */
(function () {
  'use strict';
  var M = window.MOCK, U = window.U;
  var Views = window.Views, Actions = window.Actions;
  var ui = window.__ui, esc = U.esc, tag = U.tag;
  var processingApprovals = Object.create(null);

  // 金额使用安全整数分校验；不靠展示舍入隐藏目标与明细之间的差额。
  function amountCents(value) {
    if (typeof value !== 'number' && typeof value !== 'string') return null;
    var text = String(value).trim();
    if (!/^\d+(?:\.\d{1,2})?$/.test(text)) return null;
    var parts = text.split('.');
    var cents = Number(parts[0] + ((parts[1] || '') + '00').slice(0, 2));
    return Number.isSafeInteger(cents) && cents > 0 ? cents : null;
  }

  function approvalPermissionError(a, actor) {
    var user = window.App.user;
    if (!user || user.role !== 'boss') return '仅业务主管可以处理申请，请重新登录主管账号。';
    if (actor && (actor.id !== user.id || actor.name !== user.name)) return '当前账号已改变，请关闭弹窗后重新处理申请。';
    if (!a || a.status !== '待处理') return '该申请已处理或不存在，请刷新后查看处理结果。';
    if (a.applicant === user.name) return '申请人不能自审，请由其他有审批权限的主管处理。';
    if (a.type === '单证审核') return '单证审核请在关联单证详情页处理。';
    if (['改价申请', '取消申请', '重新制单申请'].indexOf(a.type) < 0) return '该申请类型不支持在此处理。';
    return '';
  }

  function lifecycleApprovalError(a) {
    if (a.type === '取消申请') {
      var order = a.targetType === 'order' ? U.order(a.targetId) : null;
      if (!order) return '关联订单不存在，不能处理取消申请。';
      if (order.status !== '取消申请中') return '订单当前不是取消申请中，请核对订单状态，不能处理此取消申请。';
    }
    if (a.type === '重新制单申请') {
      var source = a.targetType === 'doc' ? U.doc(a.targetId) : null;
      if (!source) return '关联单证不存在，不能处理重新制单申请。';
      var policy = U.documentPolicy(source, window.App.user);
      if (policy.blockedReason) return policy.blockedReason;
      if (source.status !== '已退回') return '关联单证已不处于退回状态，请重新核对申请。';
    }
    return '';
  }

  // 审批必须针对打开弹窗时展示的申请，不能悄悄批准被改写后的新目标。
  function approvalContext(a) {
    var fields = ['id', 'type', 'targetType', 'targetId', 'targetAmount', 'currency', 'targetCurrency', 'applicant', 'title', 'reason', 'applyTime', 'priorOrderStatus'];
    var values = fields.map(function (field) { return a[field]; });
    var doc = a.targetType === 'doc' ? U.doc(a.targetId) : null;
    var order = U.order(a.targetType === 'order' ? a.targetId : doc && doc.orderId);
    values.push(order, order && order.currency, order && order.status, doc, doc && doc.status, doc && doc.version);
    if (doc) {
      var policy = U.documentPolicy(doc, window.App.user);
      values.push(policy.latest, policy.blockedReason);
      // 重新制单复制包装并捕获当前交易；弹窗之后变化的内容必须重新核对。
      values.push(JSON.stringify(doc), JSON.stringify(order), JSON.stringify(M.seller),
        JSON.stringify(order && U.customer(order.customerId)),
        JSON.stringify(order && order.items.map(function (item) { return U.product(item.productId); })));
    }
    return values;
  }

  function approvalContextChanged(a, openedContext) {
    var current = approvalContext(a);
    return current.some(function (value, index) { return !Object.is(value, openedContext[index]); });
  }

  function prepareRepricing(a) {
    var order = a.targetType === 'order' ? U.order(a.targetId) : null;
    if (!order) return { error: '关联订单不存在，不能批准改价。' };
    if (order.status === '已取消') return { error: '关联订单已取消，不能批准改价。' };
    if (!order.currency || (a.currency && a.currency !== order.currency) || (a.targetCurrency && a.targetCurrency !== order.currency)) {
      return { error: '申请币种与订单币种不一致，不能批准改价。' };
    }
    var target = amountCents(a.targetAmount);
    if (target === null) return { error: '目标金额必须为大于 0、最多两位小数且在安全计算范围内的有限金额。' };
    if (!Array.isArray(order.items) || !order.items.length) return { error: '订单没有明细，不能计算改价。' };
    var current = 0, prices = [], error = '';
    order.items.forEach(function (it, index) {
      var price = amountCents(it.price);
      if (!Number.isSafeInteger(it.qty) || it.qty <= 0) error = '第 ' + (index + 1) + ' 行数量必须为正整数；当前数量精度尚不支持改价。';
      else if (price === null) error = '第 ' + (index + 1) + ' 行单价必须为大于 0、最多两位小数的有限金额。';
      else if (!Number.isSafeInteger(it.qty * price) || !Number.isSafeInteger(current + it.qty * price)) error = '订单明细金额超出安全计算范围。';
      else { current += it.qty * price; prices.push(price); }
    });
    if (error) return { error: error };
    var received = 0;
    M.payments.filter(function (p) { return p.orderId === order.id; }).forEach(function (p) {
      var cents = amountCents(p.amount);
      if (p.currency !== order.currency) error = '关联收款存在不同币种，不能合并金额或批准改价，请先核对收款币种。';
      else if (cents === null || !Number.isSafeInteger(received + cents)) error = '关联收款金额或精度无效，请先核对收款记录。';
      else received += cents;
    });
    if (error) return { error: error };
    if (target < received) return { error: '目标金额 ' + U.fmt(target / 100) + ' ' + order.currency + ' 低于已收 ' + U.fmt(received / 100) + ' ' + order.currency + '，退款规则未确认，不能批准改价。' };
    var total = 0;
    var items = order.items.map(function (it, index) {
      var cents = Math.round(prices[index] * (target / current));
      if (!Number.isSafeInteger(cents) || cents <= 0 || !Number.isSafeInteger(cents * it.qty) || !Number.isSafeInteger(total + cents * it.qty)) {
        error = '第 ' + (index + 1) + ' 行改价后单价或金额超出支持范围，不能批准。';
      }
      total += cents * it.qty;
      var candidate = Object.assign({}, it);
      candidate.price = cents / 100;
      if (amountCents(candidate.price) !== cents) error = '第 ' + (index + 1) + ' 行改价后单价无法以当前数值精度保存，不能批准。';
      return candidate;
    });
    if (error) return { error: error };
    var result = { order: order, items: items, total: total / 100, target: target / 100 };
    if (total !== target) {
      result.error = '数量保持不变、单价保留两位小数并等比舍入后，候选金额为 ' + U.fmt(total / 100) + ' ' + order.currency +
        '，与目标 ' + U.fmt(target / 100) + ' ' + order.currency + ' 相差 ' + U.fmt(Math.abs(total - target) / 100) + ' ' + order.currency +
        '。当前精度与分摊规则不能达到该目标，请重新协商可实现的目标；本次未批准，订单、收款、单证和日志保持不变。';
    }
    return result;
  }

  /* ==================== 收款与应收 ==================== */
  Views.payments = function (ctx) {
    var role = ctx.user.role;
    if (role !== 'fin' && role !== 'boss') return Views.forbidden('「收款与应收」仅对财务人员与业务主管开放');

    /* 收款登记表单（仅财务） */
    var formHtml = '';
    if (role === 'fin') {
      var payableOrders = M.orders.filter(function (o) {
        return U.orderFin(o).outstanding > 0.005 && o.status !== '已取消';
      });
      var preOrder = ctx.query.order || '';
      var opts = payableOrders.map(function (o) {
        var fin = U.orderFin(o);
        return '<option value="' + o.id + '" data-cur="' + o.currency + '" data-out="' + fin.outstanding.toFixed(2) + '" ' + (preOrder === o.id ? 'selected' : '') + '>' +
          o.id + ' · ' + esc(U.customerName(o.customerId).split('（')[0]) + ' · 未收 ' + U.fmt(fin.outstanding) + ' ' + o.currency + '</option>';
      }).join('');
      var first = payableOrders.find(function (o) { return o.id === preOrder; }) || payableOrders[0];
      formHtml = '<div class="card"><div class="card-title">收款登记<span class="sub">登记后实时更新订单已收/未收金额；不同币种独立登记、不合并折算</span></div>' +
        (payableOrders.length ?
        '<form id="pay-form"><div class="form-grid">' +
          '<div class="form-item"><label class="required">选择订单</label><select class="select" id="p-order">' + opts + '</select><div class="field-error"></div></div>' +
          U.formItem('收款金额', '<input class="input" id="p-amount" placeholder="不超过未收金额"><div class="readonly-hint" id="p-out-hint">' + (first ? '该订单未收 ' + U.fmt(U.orderFin(first).outstanding) + ' ' + first.currency : '') + '</div>', { required: true }) +
          U.formItem('币种', '<input class="input" id="p-currency" value="' + (first ? first.currency : '') + '" readonly><div class="readonly-hint">币种随订单带入，不可修改</div>') +
          '<div class="form-item"><label class="required">收款方式</label><select class="select" id="p-method">' +
            ['电汇 T/T', '信用证 L/C', '付款交单 D/P', '其他'].map(function (m) { return '<option>' + m + '</option>'; }).join('') +
          '</select><div class="field-error"></div></div>' +
          U.formItem('收款日期', '<input class="input" type="date" id="p-date" value="' + U.today() + '">', { required: true }) +
          U.formItem('备注', '<input class="input" id="p-remark" placeholder="如：预付款 / 尾款">') +
        '</div>' +
        '<div class="form-actions"><button type="submit" class="btn btn-primary">登记收款</button></div></form>'
        : '<div class="empty-state">当前没有待收款订单</div>') + '</div>';
    } else {
      formHtml = '<div class="card"><div class="card-title">收款登记</div><div class="readonly-hint">业务主管视角为只读：收款登记由财务人员操作。</div></div>';
    }

    /* 收款记录 */
    var s = ui('payRecords');
    var records = M.payments.slice().sort(function (a, b) { return b.date.localeCompare(a.date); });
    var pg = U.page(records, s.page, 6);
    var recRows = pg.rows.map(function (p) {
      return '<tr><td>' + p.id + '</td><td><a href="#/orders/' + p.orderId + '?tab=pay">' + p.orderId + '</a></td>' +
        '<td>' + esc(U.customerName(U.order(p.orderId).customerId)) + '</td>' +
        '<td class="num">' + U.fmt(p.amount) + ' ' + p.currency + '</td>' +
        '<td>' + esc(p.method) + '</td><td class="cell-date">' + p.date + '</td><td>' + esc(p.remark || '—') + '</td><td class="cell-person">' + esc(p.operator) + '</td></tr>';
    }).join('') || U.emptyRow(8, '暂无收款记录');

    /* 订单应收汇总 */
    var sumRows = M.orders.filter(function (o) { return o.status !== '已取消'; }).map(function (o) {
      var fin = U.orderFin(o);
      var pct = fin.total > 0 ? Math.min(100, Math.round(fin.received / fin.total * 100)) : 0;
      return '<tr><td><a href="#/orders/' + o.id + '?tab=pay">' + o.id + '</a></td>' +
        '<td>' + esc(U.customerName(o.customerId).split('（')[0]) + '</td>' +
        '<td class="center">' + o.currency + '</td>' +
        '<td class="num">' + U.fmt(fin.total) + '</td>' +
        '<td class="num">' + U.fmt(fin.received) + '</td>' +
        '<td class="num">' + U.fmt(fin.outstanding) + '</td>' +
        '<td class="pay-progress-cell"><div class="progress"><div class="bar ' + (pct >= 100 ? 'green' : pct > 0 ? 'orange' : '') + '" style="width:' + pct + '%"></div></div>' +
        '<div class="progress-info"><span>' + pct + '%</span><span>' + tag(U.payStatus(o)) + '</span></div></td></tr>';
    }).join('');

    /* 客户未收款视图：按客户 × 币种 分别汇总，不合并 */
    var byCust = {};
    M.orders.filter(function (o) { return o.status !== '已取消'; }).forEach(function (o) {
      var fin = U.orderFin(o);
      if (fin.outstanding <= 0.005) return;
      var key = o.customerId + '|' + o.currency;
      if (!byCust[key]) byCust[key] = { cust: o.customerId, cur: o.currency, orders: 0, outstanding: 0, oldest: o.createdAt };
      byCust[key].orders++;
      byCust[key].outstanding += fin.outstanding;
      if (o.createdAt < byCust[key].oldest) byCust[key].oldest = o.createdAt;
    });
    var custRows = Object.keys(byCust).map(function (k) {
      var b = byCust[k];
      return '<tr><td>' + esc(U.customerName(b.cust)) + '</td><td class="center">' + b.cur + '</td>' +
        '<td class="center">' + b.orders + '</td><td class="num"><b>' + U.fmt(b.outstanding) + ' ' + b.cur + '</b></td>' +
        '<td class="cell-date">' + b.oldest + '</td>' +
        '<td class="center">' + (b.outstanding > 20000 ? tag('高风险', 'red') : b.outstanding > 5000 ? tag('关注', 'orange') : tag('正常', 'green')) + '</td></tr>';
    }).join('') || U.emptyRow(6, '当前没有未收款项');

    return '<div class="page-head"><h2>收款与应收</h2></div>' +
      formHtml +
      '<div class="card"><div class="card-title">收款记录</div>' +
      '<div class="table-wrap"><table class="table"><thead><tr><th>收款编号</th><th>订单</th><th>客户</th><th class="num">金额</th><th>方式</th><th>日期</th><th>备注</th><th>登记人</th></tr></thead>' +
      '<tbody>' + recRows + '</tbody></table></div>' + U.pagination(pg, 'pay-page') + '</div>' +
      '<div class="card"><div class="card-title">订单应收汇总<span class="sub">应收 / 已收 / 未收按订单币种独立统计</span></div>' +
      '<div class="table-wrap"><table class="table"><thead><tr><th>订单编号</th><th>客户</th><th class="center">币种</th><th class="num">应收</th><th class="num">已收</th><th class="num">未收</th><th>收款进度</th></tr></thead>' +
      '<tbody>' + sumRows + '</tbody></table></div></div>' +
      '<div class="card"><div class="card-title">客户未收款视图<span class="sub">按客户 × 币种汇总，不同币种不合并</span></div>' +
      '<div class="table-wrap"><table class="table"><thead><tr><th>客户</th><th class="center">币种</th><th class="center">未收订单数</th><th class="num">未收合计</th><th>最早订单日期</th><th class="center">账龄风险</th></tr></thead>' +
      '<tbody>' + custRows + '</tbody></table></div></div>';
  };
  Actions['pay-page'] = function (el) { ui('payRecords').page = +el.dataset.page; window.App.rerender(); };

  /* 订单切换时联动币种与未收金额提示 */
  document.addEventListener('change', function (e) {
    if (e.target.id !== 'p-order') return;
    var opt = e.target.options[e.target.selectedIndex];
    document.getElementById('p-currency').value = opt.dataset.cur;
    document.getElementById('p-out-hint').textContent = '该订单未收 ' + U.fmt(Number(opt.dataset.out)) + ' ' + opt.dataset.cur;
  });

  /* 收款登记提交 */
  document.addEventListener('submit', function (e) {
    if (e.target.id !== 'pay-form') return;
    e.preventDefault();
    var form = e.target;
    U.clearErrors(form);
    var orderSel = form.querySelector('#p-order');
    var opt = orderSel.options[orderSel.selectedIndex];
    var outstanding = opt ? Number(opt.dataset.out) : 0;
    if (!U.validate([
      { el: orderSel, label: '订单', required: true },
      { el: form.querySelector('#p-amount'), label: '收款金额', required: true, number: true, min: 0.01, max: outstanding },
      { el: form.querySelector('#p-date'), label: '收款日期', required: true }
    ])) {
      U.toast('请按提示修正表单中的错误字段', 'error');
      return;
    }
    var btn = form.querySelector('button[type="submit"]');
    U.withLoading(btn, function () {
      var order = U.order(orderSel.value);
      var rec = {
        id: 'PAY' + U.today().replace(/-/g, '') + String(M.payments.length + 1),
        orderId: order.id,
        amount: Number(form.querySelector('#p-amount').value),
        currency: order.currency,
        method: form.querySelector('#p-method').value,
        date: form.querySelector('#p-date').value,
        remark: form.querySelector('#p-remark').value.trim(),
        operator: window.App.user.name
      };
      M.payments.push(rec);
      M.orderLogs[order.id] = (M.orderLogs[order.id] || []).concat([{ time: U.now(), person: window.App.user.name, content: '登记收款 ' + U.fmt(rec.amount) + ' ' + rec.currency + '（' + rec.method + (rec.remark ? '，' + rec.remark : '') + '）' }]);
    });
    setTimeout(function () {
      U.toast('收款已登记，订单已收/未收金额已更新');
      window.App.rerender();
    }, 480);
  });

  /* ==================== 审核与异常处理 ==================== */
  Views.approvals = function (ctx) {
    var role = ctx.user.role;
    var name = ctx.user.name;
    var isBoss = role === 'boss';

    var pending, done, title;
    if (isBoss) {
      pending = M.approvals.filter(function (a) { return a.status === '待处理'; });
      done = M.approvals.filter(function (a) { return a.status !== '待处理'; }).sort(function (a, b) { return (b.handleTime || '').localeCompare(a.handleTime || ''); });
      title = '待处理事项';
    } else {
      pending = M.approvals.filter(function (a) { return a.applicant === name && a.status === '待处理'; });
      done = M.approvals.filter(function (a) { return a.applicant === name && a.status !== '待处理'; }).sort(function (a, b) { return (b.handleTime || '').localeCompare(a.handleTime || ''); });
      title = '我提交的申请（审批中）';
    }

    var pRows = pending.map(function (a) {
      var action;
      if (isBoss) {
        if (a.type === '单证审核') {
          action = '<a class="btn btn-sm btn-primary" href="#/documents/' + a.targetId + '">处理</a>';
        } else if (a.applicant === name) {
          action = '<span class="readonly-hint">不能自审</span>';
        } else {
          action = '<button class="btn btn-sm btn-primary" data-action="ap-handle" data-id="' + a.id + '">处理</button>';
        }
      } else {
        action = '<span class="readonly-hint">等待主管处理</span>';
      }
      return '<tr><td class="center">' + tag(a.type) + '</td><td>' + esc(a.title) +
        (a.reason ? '<div class="muted small mt8">' + esc(a.reason) + '</div>' : '') + '</td>' +
        '<td class="cell-person">' + esc(a.applicant) + '</td><td class="cell-date">' + esc(a.applyTime) + '</td><td class="center">' + tag(a.status) + '</td><td>' + action + '</td></tr>';
    }).join('') || U.emptyRow(6, isBoss ? '当前没有待处理事项' : '您没有审批中的申请');

    var dRows = done.map(function (a) {
      return '<tr><td class="center">' + tag(a.type) + '</td><td>' + esc(a.title) + '</td>' +
        '<td class="cell-person">' + esc(a.applicant) + '</td><td class="cell-date">' + esc(a.applyTime) + '</td><td class="center">' + tag(a.status) + '</td>' +
        '<td class="cell-person">' + esc(a.handler || '—') + '</td><td class="cell-date">' + esc(a.handleTime || '—') + '</td><td>' + esc(a.opinion || '—') + '</td></tr>';
    }).join('') || U.emptyRow(8, '暂无已处理记录');

    return '<div class="page-head"><h2>审核与异常处理</h2>' +
      '<span class="muted small">' + (isBoss ? '业务主管视角：单证审核在单证详情页完成；改价 / 取消 / 重新制单在此处理；不能自制自审' : '您可以看到自己提交的申请及处理结果') + '</span></div>' +
      '<div class="card"><div class="card-title">' + title + '<span class="sub">共 ' + pending.length + ' 项</span></div>' +
      '<div class="table-wrap"><table class="table"><thead><tr><th class="center">类型</th><th>事项</th><th>申请人</th><th>申请时间</th><th class="center">状态</th><th>处理</th></tr></thead>' +
      '<tbody>' + pRows + '</tbody></table></div></div>' +
      '<div class="card"><div class="card-title">已处理记录</div>' +
      '<div class="table-wrap"><table class="table"><thead><tr><th class="center">类型</th><th>事项</th><th>申请人</th><th>申请时间</th><th class="center">结果</th><th>处理人</th><th>处理时间</th><th>处理意见</th></tr></thead>' +
      '<tbody>' + dRows + '</tbody></table></div></div>';
  };

  /* 主管处理 改价 / 取消 / 重新制单 */
  Actions['ap-handle'] = function (el) {
    var a = M.approvals.find(function (x) { return x.id === el.dataset.id; });
    var permissionError = approvalPermissionError(a);
    if (!permissionError) permissionError = lifecycleApprovalError(a);
    if (permissionError) { U.toast(permissionError, 'error'); return; }
    if (processingApprovals[a.id]) { U.toast('该申请正在处理中，请勿重复提交。', 'error'); return; }
    var actor = { id: window.App.user.id, name: window.App.user.name };
    var openedContext = approvalContext(a);
    var approvalId = a.id;
    var targetInfo = a.targetType === 'order'
      ? '关联订单：<a href="#/orders/' + a.targetId + '">' + a.targetId + '</a>'
      : '关联单证：' + a.targetId;
    var dangerNote = a.type === '取消申请'
      ? '<div class="danger-box mt8">通过后订单标记为「已取消」，单证业务操作与导出暂停；原版本、审核结果及交易快照保留。已收款需另行协商退还，本操作不会登记退款。</div>'
      : a.type === '改价申请'
      ? '<div class="warn-box mt8">数量保持不变，单价保留两位小数并按目标等比调整。候选明细合计必须等于目标且不低于已收款，校验通过后才批准并写入日志。</div>'
      : '<div class="warn-box mt8">通过后采用当前订单、客户、商品与卖方交易信息生成新版本草稿；原版本内容保留，由制单人核对包装及退回意见后继续修订。</div>';
    var repricing = a.type === '改价申请' ? prepareRepricing(a) : null;
    var amountSummary = repricing && repricing.order
      ? '<div class="desc-grid mt8" style="grid-template-columns:1fr 1fr">' +
        window.__descItem('申请目标金额', U.fmt(repricing.target) + ' ' + repricing.order.currency) +
        window.__descItem('两位单价候选合计', U.fmt(repricing.total) + ' ' + repricing.order.currency) + '</div>' : '';
    var body =
      '<div class="desc-grid" style="grid-template-columns:1fr 1fr">' +
      window.__descItem('申请类型', a.type) + window.__descItem('申请人', a.applicant) +
      window.__descItem('申请时间', a.applyTime) +
      '<div class="di"><div class="dt">关联对象</div><div class="dd">' + targetInfo + '</div></div>' +
      '</div>' +
      '<div class="card mt8" style="background:#f7f8fb;margin-bottom:0"><b>申请理由：</b>' + esc(a.reason || '—') + '</div>' +
      dangerNote + amountSummary + '<div class="field-error mt8" id="ap-effect-error" role="alert">' + esc(repricing && repricing.error || '') + '</div>' +
      '<div class="form-item mt8"><label>处理意见（退回时必填）</label><textarea class="textarea" id="ap-opinion"></textarea><div class="field-error"></div></div>';
    var footer = '<button class="btn" data-close="1">取消</button>' +
      '<button class="btn btn-danger" data-act="reject">退 回</button>' +
      '<button class="btn btn-success" data-act="approve">通 过</button>';
    var overlay = U.openModal({ title: '处理申请 · ' + a.id, body: body, footer: footer, large: true, persistent: true });

    overlay.querySelectorAll('[data-act]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        if (processingApprovals[approvalId] || a.status !== '待处理') return;
        var pass = btn.dataset.act === 'approve';
        var opinionEl = overlay.querySelector('#ap-opinion');
        var opinion = opinionEl.value.trim();
        if (!pass && !opinion) {
          opinionEl.classList.add('is-error');
          overlay.querySelector('#ap-opinion').parentElement.querySelector('.field-error').textContent = '退回时必须填写具体处理意见';
          opinionEl.focus();
          return;
        }
        processingApprovals[approvalId] = true;
        U.withLoading(btn, function () {
          var error = approvalPermissionError(a, actor);
          if (!error && (M.approvals.find(function (current) { return current.id === approvalId; }) !== a || approvalContextChanged(a, openedContext))) {
            error = '申请金额、关联对象、订单状态、版本、币种或申请内容已变化，请关闭弹窗并重新打开，核对最新内容后再处理。';
          }
          if (!error) error = lifecycleApprovalError(a);
          var plan = !error && pass && a.type === '改价申请' ? prepareRepricing(a) : null;
          if (plan && plan.error) error = plan.error;
          var document = null;
          if (!error && a.type === '取消申请' && (a.targetType !== 'order' || !U.order(a.targetId))) error = '关联订单不存在，不能处理取消申请。';
          if (!error && pass && a.type === '重新制单申请') {
            var source = a.targetType === 'doc' ? U.doc(a.targetId) : null;
            if (!source) error = '关联单证不存在，不能重新制单。';
            else {
              document = JSON.parse(JSON.stringify(source));
              document.version = M.documents.filter(function (d) { return d.no === source.no; }).reduce(function (max, d) { return Math.max(max, d.version); }, 0) + 1;
              document.id = 'D-' + source.no + '-V' + document.version;
              try { U.captureDocumentSnapshot(document); }
              catch (snapshotError) { error = '无法生成新版本交易快照：' + snapshotError.message; }
            }
          }
          if (error) {
            delete processingApprovals[approvalId];
            overlay.querySelector('#ap-effect-error').textContent = error;
            U.toast('审批未生效，请查看弹窗中的处理说明。', 'error');
            return;
          }
          a.status = pass ? '已通过' : '已退回';
          a.handler = window.App.user.name;
          a.handleTime = U.now();
          a.opinion = opinion || (pass ? '同意' : '');
          applyApprovalEffect(a, pass, plan, document);
          delete processingApprovals[approvalId];
          U.closeModal();
          U.toast(pass ? '已通过：' + a.title : '已退回：' + a.title);
          window.App.rerender();
        });
      });
    });
  };

  function applyApprovalEffect(a, pass, plan, preparedDocument) {
    var order = a.targetType === 'order' ? U.order(a.targetId) : null;
    if (a.type === '改价申请' && pass && plan) {
      order.items = plan.items;
      pushLog(order.id, '改价申请 ' + a.id + ' 审核通过，订单金额调整为 ' + U.fmt(U.orderTotal(order)) + ' ' + order.currency + (a.opinion ? '（' + a.opinion + '）' : ''));
    }
    if (a.type === '取消申请' && order) {
      if (pass) {
        order.status = '已取消';
        pushLog(order.id, '取消申请 ' + a.id + ' 审核通过，订单已取消；单证操作与导出暂停，历史版本保留；已收款 ' + U.fmt(U.orderReceived(order.id)) + ' ' + order.currency + ' 待与客户协商退还（未登记退款）');
      } else if (order.status === '取消申请中') {
        var recorded = ['待执行', '执行中'].indexOf(a.priorOrderStatus) >= 0;
        order.status = recorded ? a.priorOrderStatus : '执行中';
        pushLog(order.id, '取消申请 ' + a.id + ' 被退回，订单恢复「' + order.status + '」' + (recorded ? '' : '（旧样例未记录取消前状态，按原型默认恢复执行中）') + '：' + (a.opinion || ''));
      }
    }
    if (a.type === '重新制单申请' && pass) {
      var d = U.doc(a.targetId);
      if (d) {
        var nd = preparedDocument;
        nd.status = '草稿';
        nd.createdAt = U.today(); nd.updatedAt = U.today();
        nd.submittedAt = null; nd.approver = null; nd.approvedAt = null; nd.opinion = null;
        nd.history = [{ time: U.now(), person: window.App.user.name, action: '创建单证 V' + nd.version + '（重新制单申请 ' + a.id + ' 批准）', opinion: a.opinion || '' }];
        M.documents.push(nd);
        window.__syncOrderDocStatus(d.orderId);
      }
    }
    if (a.type === '重新制单申请' && !pass) { /* 仅留痕 */ }
    if (order && !pass && a.type === '改价申请') {
      pushLog(order.id, '改价申请 ' + a.id + ' 被退回：' + (a.opinion || ''));
    }
  }
  function pushLog(orderId, content) {
    M.orderLogs[orderId] = (M.orderLogs[orderId] || []).concat([{ time: U.now(), person: window.App.user.name, content: content }]);
  }
})();
