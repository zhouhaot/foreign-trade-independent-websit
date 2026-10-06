/* ============================================================
 * views-fin.js — 收款与应收 / 审核与异常处理
 * ============================================================ */
(function () {
  'use strict';
  var M = window.MOCK, U = window.U;
  var Views = window.Views, Actions = window.Actions;
  var ui = window.__ui, esc = U.esc, tag = U.tag;

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
    if (!a) return;
    var targetInfo = a.targetType === 'order'
      ? '关联订单：<a href="#/orders/' + a.targetId + '">' + a.targetId + '</a>'
      : '关联单证：' + a.targetId;
    var dangerNote = a.type === '取消申请'
      ? '<div class="danger-box mt8">通过取消申请后，订单将标记为「已取消」，已收款需另行协商退还，关联单证作废。</div>'
      : a.type === '改价申请'
      ? '<div class="warn-box mt8">通过后系统将按申请金额等比调整订单明细单价，并写入操作日志。</div>'
      : '<div class="warn-box mt8">通过后将基于退回意见生成该单证的新版本（草稿），由制单人继续修订。</div>';
    var body =
      '<div class="desc-grid" style="grid-template-columns:1fr 1fr">' +
      window.__descItem('申请类型', a.type) + window.__descItem('申请人', a.applicant) +
      window.__descItem('申请时间', a.applyTime) +
      '<div class="di"><div class="dt">关联对象</div><div class="dd">' + targetInfo + '</div></div>' +
      '</div>' +
      '<div class="card mt8" style="background:#f7f8fb;margin-bottom:0"><b>申请理由：</b>' + esc(a.reason || '—') + '</div>' +
      dangerNote +
      '<div class="form-item mt8"><label>处理意见（退回时必填）</label><textarea class="textarea" id="ap-opinion"></textarea><div class="field-error"></div></div>';
    var footer = '<button class="btn" data-close="1">取消</button>' +
      '<button class="btn btn-danger" data-act="reject">退 回</button>' +
      '<button class="btn btn-success" data-act="approve">通 过</button>';
    var overlay = U.openModal({ title: '处理申请 · ' + a.id, body: body, footer: footer, large: true, persistent: true });

    overlay.querySelectorAll('[data-act]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var pass = btn.dataset.act === 'approve';
        var opinionEl = overlay.querySelector('#ap-opinion');
        var opinion = opinionEl.value.trim();
        if (!pass && !opinion) {
          opinionEl.classList.add('is-error');
          overlay.querySelector('.field-error').textContent = '退回时必须填写具体处理意见';
          opinionEl.focus();
          return;
        }
        U.withLoading(btn, function () {
          a.status = pass ? '已通过' : '已退回';
          a.handler = window.App.user.name;
          a.handleTime = U.now();
          a.opinion = opinion || (pass ? '同意' : '');
          applyApprovalEffect(a, pass);
        });
        setTimeout(function () {
          U.closeModal();
          U.toast(pass ? '已通过：' + a.title : '已退回：' + a.title);
          window.App.rerender();
        }, 500);
      });
    });
  };

  function applyApprovalEffect(a, pass) {
    var order = a.targetType === 'order' ? U.order(a.targetId) : null;
    if (a.type === '改价申请' && pass && order && a.targetAmount) {
      var cur = U.orderTotal(order);
      if (cur > 0) {
        var factor = a.targetAmount / cur;
        order.items.forEach(function (it) { it.price = Math.round(it.price * factor * 100) / 100; });
      }
      pushLog(order.id, '改价申请 ' + a.id + ' 审核通过，订单金额调整为 ' + U.fmt(U.orderTotal(order)) + ' ' + order.currency + (a.opinion ? '（' + a.opinion + '）' : ''));
    }
    if (a.type === '取消申请' && order) {
      if (pass) {
        order.status = '已取消';
        pushLog(order.id, '取消申请 ' + a.id + ' 审核通过，订单已取消；已收款 ' + U.fmt(U.orderReceived(order.id)) + ' ' + order.currency + ' 待与客户协商退还');
      } else if (order.status === '取消申请中') {
        order.status = '执行中';
        pushLog(order.id, '取消申请 ' + a.id + ' 被退回，订单恢复执行：' + (a.opinion || ''));
      }
    }
    if (a.type === '重新制单申请' && pass) {
      var d = U.doc(a.targetId);
      if (d) {
        var nd = JSON.parse(JSON.stringify(d));
        nd.id = 'D-' + d.no + '-V' + (d.version + 1);
        nd.version = d.version + 1;
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
