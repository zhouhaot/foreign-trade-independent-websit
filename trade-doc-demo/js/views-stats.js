/* ============================================================
 * views-stats.js — 统计分析（业务主管）
 * 图表为纯 SVG / CSS 手绘，无外部依赖
 * ============================================================ */
(function () {
  'use strict';
  var M = window.MOCK, U = window.U;
  var Views = window.Views;
  var esc = U.esc, tag = U.tag;

  Views.stats = function (ctx) {
    if (ctx.user.role !== 'boss') return Views.forbidden('「统计分析」仅对业务主管开放');

    var validOrders = M.orders.filter(function (o) { return o.status !== '已取消'; });

    /* ---- 汇总卡片（币种分列，不合并） ---- */
    var byCur = {};
    validOrders.forEach(function (o) {
      var fin = U.orderFin(o);
      if (!byCur[o.currency]) byCur[o.currency] = { total: 0, received: 0, count: 0 };
      byCur[o.currency].total += fin.total;
      byCur[o.currency].received += fin.received;
      byCur[o.currency].count++;
    });
    function curText(fn) {
      return Object.keys(byCur).sort().map(function (c) { return '<span class="currency-metric"><small>' + c + '</small><b>' + fn(byCur[c]) + '</b></span>'; }).join('');
    }
    var rateText = Object.keys(byCur).sort().map(function (c) {
      var b = byCur[c];
      return '<span class="currency-metric"><small>' + c + '</small><b>' + (b.total > 0 ? Math.round(b.received / b.total * 100) : 0) + '%</b></span>';
    }).join('');

    /* ---- 订单统计：按月订单数 + 状态分布 ---- */
    var monthMap = {};
    validOrders.forEach(function (o) { var m = o.createdAt.slice(0, 7); monthMap[m] = (monthMap[m] || 0) + 1; });
    var monthData = Object.keys(monthMap).sort().map(function (m) { return { label: m, value: monthMap[m] }; });
    var statusMap = {};
    validOrders.forEach(function (o) { statusMap[o.status] = (statusMap[o.status] || 0) + 1; });
    var statusRows = ['待执行', '执行中', '已完成', '取消申请中'].filter(function (s) { return statusMap[s]; }).map(function (s) {
      return { label: s, value: statusMap[s] };
    });

    /* ---- 客户统计：订单金额 TOP（分币种两张条形图） ---- */
    function topCustomers(cur) {
      var map = {};
      validOrders.filter(function (o) { return o.currency === cur; }).forEach(function (o) {
        map[o.customerId] = (map[o.customerId] || 0) + U.orderTotal(o);
      });
      return Object.keys(map).map(function (k) { return { id: k, val: map[k] }; })
        .sort(function (a, b) { return b.val - a.val; }).slice(0, 5);
    }
    function hbarHtml(list, cur) {
      if (!list.length) return '<div class="empty-state">暂无数据</div>';
      var max = list[0].val;
      return list.map(function (it) {
        var c = U.customer(it.id);
        var pct = Math.max(4, Math.round(it.val / max * 100));
        return '<div class="hbar-row"><span class="hb-label" title="' + esc(U.customerName(it.id)) + '">' + esc(c ? c.nameCn : it.id) + '</span>' +
          '<span class="hb-track"><span class="hb-fill" style="width:' + pct + '%"></span></span>' +
          '<span class="hb-val">' + U.fmt(it.val) + ' ' + cur + '</span></div>';
      }).join('');
    }

    /* ---- 收款统计：按订单收款率简表 + 收款方式分布 ---- */
    var methodMap = {};
    M.payments.forEach(function (p) { var k = p.method + '|' + p.currency; methodMap[k] = (methodMap[k] || 0) + p.amount; });
    var methodRows = Object.keys(methodMap).sort().map(function (k) {
      var parts = k.split('|');
      return '<tr><td>' + esc(parts[0]) + '</td><td class="center">' + parts[1] + '</td><td class="num">' + U.fmt(methodMap[k]) + '</td></tr>';
    }).join('');
    var payRows = validOrders.map(function (o) {
      var fin = U.orderFin(o);
      var pct = fin.total > 0 ? Math.min(100, Math.round(fin.received / fin.total * 100)) : 0;
      return '<tr><td><a href="#/orders/' + o.id + '?tab=pay">' + o.id + '</a></td>' +
        '<td>' + esc(U.customerName(o.customerId).split('（')[0]) + '</td>' +
        '<td class="num">' + U.fmt(fin.total) + ' ' + o.currency + '</td>' +
        '<td class="num">' + U.fmt(fin.received) + '</td>' +
        '<td class="pay-progress-cell"><div class="progress"><div class="bar ' + (pct >= 100 ? 'green' : pct > 0 ? 'orange' : '') + '" style="width:' + pct + '%"></div></div>' +
        '<div class="progress-info"><span>' + pct + '%</span><span>' + tag(U.payStatus(o)) + '</span></div></td></tr>';
    }).join('');

    return '<div class="page-head"><h2>统计分析</h2><span class="muted small">多币种口径：不同币种分别统计，不合并折算</span></div>' +
      '<div class="stat-cards">' +
        '<div class="stat-card accent-blue"><span class="sc-label">订单总数</span><span class="sc-value">' + validOrders.length + '</span><span class="sc-foot">不含已取消订单</span></div>' +
        '<div class="stat-card accent-blue"><span class="sc-label">订单总金额</span><span class="sc-value num" style="font-size:17px">' + curText(function (b) { return U.fmt(b.total); }) + '</span><span class="sc-foot">按币种分列</span></div>' +
        '<div class="stat-card accent-green"><span class="sc-label">累计已收款</span><span class="sc-value num" style="font-size:17px">' + curText(function (b) { return U.fmt(b.received); }) + '</span><span class="sc-foot">收款记录勾稽合计</span></div>' +
        '<div class="stat-card accent-orange"><span class="sc-label">整体收款率</span><span class="sc-value" style="font-size:22px">' + rateText + '</span><span class="sc-foot">已收 / 应收（分币种）</span></div>' +
      '</div>' +
      '<div class="chart-grid">' +
        '<div class="chart-box"><h4>订单统计 · 月度新增订单（笔）</h4>' + U.barChart(monthData, { color: 'var(--primary)' }) + '</div>' +
        '<div class="chart-box"><h4>订单统计 · 状态分布（笔）</h4>' + U.barChart(statusRows, { color: '#e8871a' }) + '</div>' +
        '<div class="chart-box"><h4>客户统计 · USD 订单金额 TOP5</h4>' + hbarHtml(topCustomers('USD'), 'USD') + '</div>' +
        '<div class="chart-box"><h4>客户统计 · EUR 订单金额 TOP5</h4>' + hbarHtml(topCustomers('EUR'), 'EUR') + '</div>' +
      '</div>' +
      '<div class="chart-grid mt16">' +
        '<div class="chart-box"><h4>收款统计 · 收款方式分布</h4>' +
          '<div class="table-wrap"><table class="table"><thead><tr><th>收款方式</th><th class="center">币种</th><th class="num">累计金额</th></tr></thead>' +
          '<tbody>' + methodRows + '</tbody></table></div></div>' +
        '<div class="chart-box"><h4>收款统计 · 订单收款进度</h4>' +
          '<div class="table-wrap"><table class="table"><thead><tr><th>订单</th><th>客户</th><th class="num">应收</th><th class="num">已收</th><th>进度</th></tr></thead>' +
          '<tbody>' + payRows + '</tbody></table></div></div>' +
      '</div>';
  };
})();
