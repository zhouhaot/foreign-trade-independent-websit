/* ============================================================
 * utils.js — 通用工具与基础组件（无外部依赖）
 * ============================================================ */
(function () {
  'use strict';
  var M = window.MOCK;
  var U = {};

  /* ---------- 转义与格式化 ---------- */
  U.esc = function (s) {
    if (s === null || s === undefined) return '';
    return String(s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  };
  U.fmt = function (n) {
    if (n === null || n === undefined || isNaN(n)) return '-';
    return Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };
  U.money = function (n, currency) {
    return '<span class="num">' + U.fmt(n) + '</span> <span class="muted small">' + U.esc(currency || '') + '</span>';
  };
  U.v = function (s) { return (s === null || s === undefined || s === '') ? '<span class="muted">—</span>' : U.esc(s); };

  /* ---------- 查找 ---------- */
  U.customer = function (id) { return M.customers.find(function (c) { return c.id === id; }) || null; };
  U.product  = function (id) { return M.products.find(function (p) { return p.id === id; }) || null; };
  U.order    = function (id) { return M.orders.find(function (o) { return o.id === id; }) || null; };
  U.quote    = function (id) { return M.quotes.find(function (q) { return q.id === id; }) || null; };
  U.inquiry  = function (id) { return M.inquiries.find(function (i) { return i.id === id; }) || null; };
  U.doc      = function (id) { return M.documents.find(function (d) { return d.id === id; }) || null; };
  U.user     = function (name) { return M.users.find(function (u) { return u.name === name; }) || null; };

  U.customerName = function (id) {
    var c = U.customer(id);
    return c ? c.nameCn + '（' + c.nameEn + '）' : id;
  };

  /* ---------- 单证版本交易快照（仅当前页面内存） ---------- */
  function copySnapshot(value) { return JSON.parse(JSON.stringify(value)); }
  function freezeSnapshot(value) {
    if (value && typeof value === 'object') {
      Object.keys(value).forEach(function (key) { freezeSnapshot(value[key]); });
      Object.freeze(value);
    }
    return value;
  }
  function attachSnapshot(doc, snapshot) {
    // 新版本 JSON 克隆来的普通属性可替换；已冻结版本禁止重新捕获/覆盖。
    Object.defineProperty(doc, 'snapshot', {
      value: freezeSnapshot(copySnapshot(snapshot)), enumerable: true, writable: false, configurable: false
    });
    return doc.snapshot;
  }
  U.captureDocumentSnapshot = function (doc, basis) {
    var order = U.order(doc.orderId);
    if (!order) throw new Error('无法冻结单证：关联订单不存在 ' + doc.orderId);
    var customer = U.customer(order.customerId);
    if (!customer) throw new Error('无法冻结单证：订单客户不存在 ' + order.customerId);
    var transaction = copySnapshot(order);
    transaction.items = order.items.map(function (item) {
      var product = U.product(item.productId);
      if (!product) throw new Error('无法冻结单证：商品不存在 ' + item.productId);
      var line = copySnapshot(item);
      line.product = copySnapshot(product);
      return line;
    });
    return attachSnapshot(doc, {
      schemaVersion: 1,
      basis: basis === 'demo-baseline' ? 'demo-baseline' : 'creation',
      capturedAt: new Date().toISOString(),
      seller: M.seller, customer: customer, order: transaction
    });
  };
  U.documentSnapshot = function (doc) {
    if (!doc.snapshot) throw new Error('单证缺少交易快照 ' + doc.id);
    // 支持内存中复制演示版本时重新锁定其已有快照，绝不回读当前主数据。
    var descriptor = Object.getOwnPropertyDescriptor(doc, 'snapshot');
    return descriptor && !descriptor.configurable && !descriptor.writable
      ? doc.snapshot : attachSnapshot(doc, doc.snapshot);
  };
  U.inheritDocumentSnapshot = function (target, source) {
    return attachSnapshot(target, U.documentSnapshot(source));
  };
  // 现有演示历史版本没有当时交易数据：加载时只冻结当前样例基线，不声称恢复历史。
  M.documents.forEach(function (doc) { U.captureDocumentSnapshot(doc, 'demo-baseline'); });

  /* 单证动作资格必须读 live 订单；历史 snapshot.order 不代表当前是否可作业。 */
  U.documentPolicy = function (doc, user) {
    var order = doc ? U.order(doc.orderId) : null;
    var group = doc ? M.documents.filter(function (d) { return d.orderId === doc.orderId && d.type === doc.type; }) : [];
    var max = group.reduce(function (n, d) { return Math.max(n, d.version); }, 0);
    var highest = group.filter(function (d) { return d.version === max; });
    var versionConflict = highest.length > 1 || group.some(function (d) { return !Number.isInteger(d.version) || d.version < 1 || (doc && d.no !== doc.no); });
    var latest = !versionConflict && highest.length === 1 ? highest[0] : null;
    var isLatest = !!doc && latest === doc;
    var orderBlocked = !!order && ['取消申请中', '已取消'].indexOf(order.status) >= 0;
    var blockedReason = !doc || U.doc(doc.id) !== doc ? '单证不存在或对象已变化，请刷新后重新操作。'
      : !order ? '关联订单不存在，单证仅可查阅历史内容。'
      : orderBlocked ? '订单' + order.status + '，单证业务操作与导出演示暂停；历史审核事实保留。'
      : versionConflict ? '同订单及单证类型存在多编号或最高版本重复冲突，请先核对版本，不能继续操作。'
      : !isLatest ? '当前为历史旧版，仅可查阅；请前往最新版本 V' + latest.version + ' 操作。' : '';
    var reasons = {};
    ['edit', 'submit', 'revise', 'reform', 'audit', 'export'].forEach(function (action) {
      var error = blockedReason;
      if (!error && (!user || !user.id || !user.name)) error = '请先登录有效的演示身份。';
      if (!error && action === 'export' && ['sales', 'doc', 'fin', 'boss'].indexOf(user.role) < 0) error = '当前角色无单证导出演示权限。';
      if (!error && action !== 'export' && user.role !== (action === 'audit' ? 'boss' : 'doc')) error = action === 'audit' ? '仅业务主管可审核单证。' : '仅单证员可执行该制单操作。';
      if (!error && ['edit', 'submit'].indexOf(action) >= 0 && ['草稿', '制作中', '已退回'].indexOf(doc.status) < 0) error = '当前单证为' + doc.status + '，仅草稿、制作中或已退回版本可编辑或送审。';
      if (!error && ['revise', 'export'].indexOf(action) >= 0 && doc.status !== '已通过') error = '当前单证为' + doc.status + '，仅最新审核通过版本可修订或导出演示。';
      if (!error && action === 'reform' && doc.status !== '已退回') error = '仅已退回的最新单证可申请重新制单。';
      if (!error && action === 'reform' && M.approvals.some(function (a) { return a.type === '重新制单申请' && a.targetId === doc.id && a.status === '待处理'; })) error = '该单证已有待处理的重新制单申请，请勿重复提交。';
      if (!error && action === 'audit' && doc.status !== '待审核') error = '当前单证为' + doc.status + '，仅最新待审核版本可审核。';
      if (!error && action === 'audit' && doc.maker === user.name) error = '不能自制自审，请由其他业务主管审核。';
      reasons[action] = error;
    });
    return { order: order, latest: latest, isLatest: isLatest, orderBlocked: orderBlocked,
      versionConflict: versionConflict, blockedReason: blockedReason, reasons: reasons,
      canEdit: !reasons.edit, canSubmit: !reasons.submit, canRevise: !reasons.revise,
      canReform: !reasons.reform, canAudit: !reasons.audit, canExport: !reasons.export };
  };

  /* H18：仅PL包装候选；度量三位精度与H12交易数量/金额分开，合法单位原文保留。 */
  U.packagingCandidate = function (packing, options) {
    var required = !!(options && options.requireComplete), errors = [], result = {}, scaled = {};
    var keys = ['cartons', 'package', 'gw', 'nw', 'meas'];
    var labels = { cartons: '箱数', package: '包装方式', gw: '毛重', nw: '净重', meas: '体积' };
    function issue(field, reason) { errors.push({ field: field, error: labels[field] + reason }); }
    if (!packing || typeof packing !== 'object' || Array.isArray(packing)) {
      issue('package', '资料无效，请重新核对装箱单包装字段。');
    } else keys.forEach(function (key) {
      var raw = packing[key], text = raw == null ? '' : typeof raw === 'string' || key === 'cartons' && typeof raw === 'number' ? String(raw) : null;
      if (text === null) { issue(key, '须填写可读单行文本；箱数为普通正整数。'); return; }
      if (/[\x00-\x1f\x7f\u2028\u2029]/.test(text)) { issue(key, '须为单行可读文本，不接受换行或隐藏控制字符。'); return; }
      text = text.trim(); result[key] = text;
      if (!text) { if (required) issue(key, '未填写，请补齐后提交审核。'); return; }
      if (key === 'package') {
        // 只检查有可见文字，不清洗合法多语言文字中的连接/格式字符。
        if (!text.replace(/[\p{White_Space}\p{Default_Ignorable_Code_Point}]/gu, '')) issue(key, '须填写至少一个可见文字字符，不能只用空白或零宽格式字符。');
        return;
      }
      if (key === 'cartons') {
        if (!/^\d+$/.test(text)) { issue(key, '须为普通正整数，不接受小数、指数、逗号或十六进制。'); return; }
        var cartons = BigInt(text);
        if (cartons <= 0n) issue(key, '必须大于 0；未知箱数请先留空保存草稿。');
        else if (cartons > BigInt(Number.MAX_SAFE_INTEGER)) issue(key, '超出安全整数范围，请减少数值。');
        else result[key] = Number(cartons);
        return;
      }
      var match = /^((?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d{1,3})?)\s*(kg|kgs|cbm)$/i.exec(text);
      var unit = key === 'meas' ? 'CBM' : 'KGS';
      if (!match || (key === 'meas' ? match[2].toLowerCase() !== 'cbm' : !/^kgs?$/i.test(match[2]))) {
        issue(key, '格式须为普通正数与明确单位 ' + unit + '，最多 3 位小数，逗号仅作标准千分分组。'); return;
      }
      var parts = match[1].replace(/,/g, '').split('.');
      var value = BigInt(parts[0]) * 1000n + BigInt(((parts[1] || '') + '000').slice(0, 3));
      if (value <= 0n) issue(key, '必须大于 0；未知值请先留空保存草稿。');
      else if (value > BigInt(Number.MAX_SAFE_INTEGER)) issue(key, '超出三位度量的安全计算范围，请减少数值。');
      else scaled[key] = value;
    });
    if (scaled.gw !== undefined && scaled.nw !== undefined && scaled.gw < scaled.nw) {
      issue('gw', '不能小于同票净重，请核对两项重量。');
      issue('nw', '不能大于同票毛重，请核对两项重量。');
    }
    var complete = errors.length === 0 && keys.every(function (key) { return result[key] !== undefined && result[key] !== ''; });
    return { ok: errors.length === 0, packing: errors.length ? null : result, errors: errors,
      error: errors.map(function (entry) { return entry.error; }).join('；'), complete: complete };
  };

  /* 新报价/收款的两位十进制契约：不改变通用 U.validate 或历史快照。 */
  U.decimalInput = function (value, label, allowZero) {
    label = label || '数值';
    function invalid(reason) { return { ok: false, units: null, value: null, error: label + reason }; }
    if (typeof value !== 'string' && typeof value !== 'number') return invalid('必须为普通十进制数字，最多两位小数。');
    var text = String(value).trim();
    if (!/^\d+(?:\.\d{1,2})?$/.test(text)) return invalid('必须为普通十进制数字，最多两位小数；不接受指数、十六进制或非有限值。');
    function unitsOf(input) {
      var parts = input.split('.');
      return Number(parts[0] + ((parts[1] || '') + '00').slice(0, 2));
    }
    var units = unitsOf(text);
    if (!Number.isSafeInteger(units)) return invalid('超出安全计算范围，请减少数值。');
    if (units < (allowZero ? 0 : 1)) return invalid(allowZero ? '不能为负数。' : '至少为 0.01。');
    var normalized = units / 100, normalizedText = String(normalized);
    if (!/^\d+(?:\.\d{1,2})?$/.test(normalizedText) || unitsOf(normalizedText) !== units) return invalid('超出可无损保存的数值范围，请减少数值。');
    return { ok: true, units: units, value: normalized, error: '' };
  };
  U.transactionAmounts = function (items) {
    function invalid(error, rowIndex, field) {
      return { ok: false, error: error, rowIndex: rowIndex, field: field, items: [], totalCents: null, total: NaN };
    }
    if (!Array.isArray(items) || !items.length) return invalid('至少需要一行商品明细。', -1, 'items');
    var result = [], total = 0n, limit = BigInt(Number.MAX_SAFE_INTEGER);
    for (var i = 0; i < items.length; i++) {
      var item = items[i];
      if (!item || typeof item !== 'object') return invalid('第 ' + (i + 1) + ' 行明细无效。', i, 'items');
      var qty = U.decimalInput(item.qty, '数量'), price = U.decimalInput(item.price, '单价');
      if (!qty.ok || !price.ok) return invalid('第 ' + (i + 1) + ' 行' + (!qty.ok ? qty.error : price.error), i, !qty.ok ? 'qty' : 'price');
      var scaled = BigInt(qty.units) * BigInt(price.units);
      if (scaled % 100n !== 0n) return invalid('第 ' + (i + 1) + ' 行金额必须精确到分，请调整数量或单价；当前不支持静默四舍五入。', i, 'amount');
      var cents = scaled / 100n;
      if (cents > limit || total + cents > limit) return invalid('第 ' + (i + 1) + ' 行或合计超出安全计算范围。', i, 'amount');
      var displayLine = U.decimalInput(Number(cents) / 100, '行金额');
      if (!displayLine.ok || displayLine.units !== Number(cents)) return invalid('第 ' + (i + 1) + ' 行金额超出可无损显示的数值范围。', i, 'amount');
      total += cents;
      result.push(Object.assign({}, item, { qty: qty.value, price: price.value, lineCents: Number(cents) }));
    }
    var numberTotal = Number(total) / 100, parsedTotal = U.decimalInput(numberTotal, '合计');
    if (!parsedTotal.ok || parsedTotal.units !== Number(total)) return invalid('明细合计超出可无损显示的数值范围。', -1, 'amount');
    return { ok: true, error: '', rowIndex: -1, field: '', items: result, totalCents: Number(total), total: numberTotal };
  };
  U.currencyEnabled = function (code) {
    return M.dicts.some(function (entry) { return entry.group === '币种' && entry.code === code && entry.enabled; });
  };
  U.validCalendarDate = function (value) {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    var parts = value.split('-').map(Number), year = parts[0], month = parts[1], day = parts[2];
    if (year < 1 || month < 1 || month > 12 || day < 1) return false;
    var leap = year % 400 === 0 || year % 4 === 0 && year % 100 !== 0;
    return day <= [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1];
  };
  U.financialBalance = function (order) {
    var result = { ok: false, error: '', totalCents: null, receivedCents: null, balanceCents: null, outstandingCents: null,
      overpaidCents: null, total: NaN, received: NaN, outstanding: NaN, balance: NaN, overpaid: NaN };
    if (!order) { result.error = '关联订单不存在，请核对收款对象。'; return result; }
    if (!M.dicts.some(function (entry) { return entry.group === '币种' && entry.code === order.currency; })) {
      result.error = '订单币种无效，无法计算同币种余额。'; return result;
    }
    var amounts = U.transactionAmounts(order.items);
    if (!amounts.ok) { result.error = '订单明细金额待核对：' + amounts.error; return result; }
    result.totalCents = amounts.totalCents; result.total = amounts.total;
    var records = M.payments.filter(function (p) { return p.orderId === order.id; }), received = 0;
    for (var i = 0; i < records.length; i++) {
      var p = records[i], parsed = U.decimalInput(p.amount, '收款 ' + p.id + ' 金额');
      if (p.currency !== order.currency) { result.error = '收款 ' + p.id + ' 币种与订单不一致，不能合并计算，请先核对。'; return result; }
      if (!parsed.ok) { result.error = parsed.error; return result; }
      if (!Number.isSafeInteger(received + parsed.units)) { result.error = '收款合计超出安全计算范围。'; return result; }
      received += parsed.units;
    }
    var parsedReceived = U.decimalInput(received / 100, '收款合计', true);
    if (!parsedReceived.ok || parsedReceived.units !== received) { result.error = '收款合计超出可无损显示的数值范围。'; return result; }
    result.receivedCents = received; result.received = received / 100;
    result.balanceCents = result.totalCents - received;
    result.overpaidCents = Math.max(0, -result.balanceCents);
    result.outstandingCents = Math.max(0, result.balanceCents);
    var delta = U.decimalInput(Math.abs(result.balanceCents) / 100, '余额', true);
    if (!delta.ok || delta.units !== Math.abs(result.balanceCents)) { result.error = '订单余额或超收金额超出可无损显示的数值范围，请先核对，不能继续登记收款。'; return result; }
    result.balance = result.balanceCents < 0 ? -delta.value : delta.value;
    result.outstanding = result.balanceCents < 0 ? 0 : delta.value;
    result.overpaid = result.balanceCents < 0 ? delta.value : 0;
    if (result.overpaidCents) { result.error = '订单存在超收 ' + U.fmt(result.overpaid) + ' ' + order.currency + '，请先核对，不能继续登记收款。'; return result; }
    result.ok = true; return result;
  };

  /* ---------- 金额勾稽 ---------- */
  U.orderTotal = function (order) {
    return order.items.reduce(function (s, it) { return s + it.qty * it.price; }, 0);
  };
  U.quoteTotal = function (quote) {
    return quote.items.reduce(function (s, it) { return s + it.qty * it.price; }, 0);
  };
  U.orderReceived = function (orderId) {
    return U.financialBalance(U.order(orderId)).received;
  };
  /* 收款状态：已结清 / 部分收款 / 未收款 */
  U.payStatus = function (order) {
    var balance = U.financialBalance(order);
    if (!balance.ok) return balance.overpaidCents > 0 ? '收款异常' : '金额待核对';
    if (balance.receivedCents === 0) return '未收款';
    if (balance.balanceCents === 0) return '已结清';
    return '部分收款';
  };
  U.orderFin = function (order) {
    var balance = U.financialBalance(order);
    return { total: balance.total, received: balance.received, outstanding: balance.outstanding,
      balance: balance.balance, overpaid: balance.overpaid, error: balance.error };
  };

  /* ---------- 状态标签 ---------- */
  var TAG_MAP = {
    '待执行': 'blue', '执行中': 'blue', '已完成': 'green', '取消申请中': 'red', '已取消': 'gray',
    '未开始': 'gray', '制作中': 'orange', '待审核': 'orange', '已通过': 'green', '已退回': 'red',
    '草稿': 'gray', '待客户确认': 'orange', '已确认': 'green', '已报价': 'green', '跟进中': 'orange', '待处理': 'orange',
    '未收款': 'red', '部分收款': 'orange', '已结清': 'green',
    '金额待核对': 'red', '收款异常': 'red',
    '单证审核': 'blue', '改价申请': 'purple', '取消申请': 'red', '重新制单申请': 'orange',
    '商业发票': 'blue', '装箱单': 'purple',
    '启用': 'green', '禁用': 'gray', 'A': 'green', 'B': 'blue', 'C': 'gray'
  };
  U.tag = function (text, color) {
    var c = color || TAG_MAP[text] || 'gray';
    return '<span class="tag tag-' + c + '">' + U.esc(text) + '</span>';
  };
  U.docTypeName = function (t) { return t === 'CI' ? '商业发票' : '装箱单'; };

  /* 本地 SVG 图标：统一 24px 画布、1.7px 描边，无外部图标依赖。 */
  U.icon = function (name) {
    var paths = {
      home: '<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1Z"/>',
      users: '<circle cx="9" cy="8" r="3"/><path d="M3 21v-3a6 6 0 0 1 12 0v3M16 5a3 3 0 0 1 0 6m2 4a5 5 0 0 1 3 5"/>',
      box: '<path d="m12 3 9 5v9l-9 5-9-5V8Zm-9 5 9 5 9-5M12 13v9M7.5 5.5l9 5"/>',
      briefcase: '<rect x="3" y="7" width="18" height="14" rx="2"/><path d="M8 7V4h8v3M3 12a20 20 0 0 0 18 0M10 12h4v3h-4z"/>',
      file: '<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9Zm0 0v6h6M8 13h8M8 17h6"/>',
      edit: '<path d="m15 5 4 4M4 20l4-1L20 7a2.8 2.8 0 0 0-4-4L4 15Z"/>',
      wallet: '<rect x="3" y="5" width="18" height="15" rx="2"/><path d="M17 10h4v6h-4a3 3 0 0 1 0-6Z"/><circle cx="17" cy="13" r=".7"/>',
      check: '<path d="m5 12 4 4L19 6"/>',
      shield: '<path d="M12 3 3 7v6c0 5 9 9 9 9s9-4 9-9V7Z"/><path d="m8 12 3 3 5-6"/>',
      chart: '<path d="M3 3v18h18M7 16v-5M12 16V7M17 16v-9"/>',
      settings: '<path d="M4 7h16M4 17h16"/><circle cx="9" cy="7" r="3" fill="currentColor" stroke="none"/><circle cx="15" cy="17" r="3" fill="currentColor" stroke="none"/>',
      bell: '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/>',
      chevron: '<path d="m9 5 7 7-7 7"/>',
      panel: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M9 4v16m5-11-3 3 3 3"/>',
      arrow: '<path d="M5 12h14m-5-5 5 5-5 5"/>',
      expand: '<path d="M8 3H3v5M16 3h5v5M3 16v5h5m13-5v5h-5"/>',
      rows: '<path d="M4 5h16M4 12h16M4 19h16"/>',
      search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',
      info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-10v.1"/>',
      x: '<path d="m6 6 12 12M18 6 6 18"/>'
    };
    return '<svg class="ui-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (paths[name] || paths.file) + '</svg>';
  };

  /* ---------- Toast ---------- */
  var TOAST_ICON = { success: 'check', error: 'x', warning: 'info', info: 'info' };
  U.toast = function (msg, type) {
    type = type || 'success';
    var root = document.getElementById('toast-root');
    var el = document.createElement('div');
    el.className = 'toast ' + type;
    el.setAttribute('role', type === 'error' ? 'alert' : 'status');
    el.innerHTML = '<span class="t-icon">' + U.icon(TOAST_ICON[type]) + '</span><span>' + msg + '</span>';
    root.appendChild(el);
    setTimeout(function () {
      el.classList.add('is-leaving');
      setTimeout(function () { el.remove(); }, 150);
    }, 2800);
  };

  /* ---------- 弹窗 ---------- */
  U.openModal = function (opts) {
    var root = document.getElementById('modal-root');
    var previousFocus = U.modalReturnFocus || document.activeElement;
    root.innerHTML = '';
    U.modalReturnFocus = previousFocus;
    U.modalOnClose = opts.onClose || null;
    var overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML =
      '<div class="modal ' + (opts.large ? 'modal-lg' : '') + '" role="dialog" aria-modal="true" aria-labelledby="modal-title" tabindex="-1">' +
        '<div class="modal-head"><h3 id="modal-title">' + U.esc(opts.title) + '</h3>' +
        '<button class="modal-close" data-close="1" aria-label="关闭弹窗">' + U.icon('x') + '</button></div>' +
        '<div class="modal-body">' + opts.body + '</div>' +
        (opts.footer ? '<div class="modal-foot">' + opts.footer + '</div>' : '') +
      '</div>';
    root.appendChild(overlay);
    document.getElementById('app').inert = true;
    document.body.style.overflow = 'hidden';
    var focusTarget = overlay.querySelector('input:not([type="hidden"]),textarea,select') || overlay.querySelector('[data-close]');
    if (focusTarget) focusTarget.focus({ preventScroll: true });
    overlay.addEventListener('mousedown', function (e) {
      if (e.target === overlay && !opts.persistent) U.closeModal();
    });
    overlay.querySelectorAll('[data-close]').forEach(function (b) {
      b.addEventListener('click', function () { U.closeModal(); });
    });
    return overlay;
  };
  U.closeModal = function () {
    var root = document.getElementById('modal-root');
    if (!root.firstElementChild) return;
    root.innerHTML = '';
    document.getElementById('app').inert = false;
    document.body.style.overflow = '';
    if (U.modalReturnFocus && U.modalReturnFocus.isConnected) U.modalReturnFocus.focus({ preventScroll: true });
    U.modalReturnFocus = null;
    var onClose = U.modalOnClose; U.modalOnClose = null;
    if (onClose) onClose();
  };
  /* 确认框，onOk 返回 false 可阻止关闭；返回 Promise 时进入 loading */
  U.confirm = function (opts) {
    var boxClass = opts.danger ? 'danger-box' : 'warn-box';
    var body = '<div class="' + boxClass + '">' + opts.message + '</div>' + (opts.extra || '');
    var footer =
      '<button class="btn" data-close="1">' + U.esc(opts.cancelText || '取消') + '</button>' +
      '<button class="btn ' + (opts.danger ? 'btn-danger' : 'btn-primary') + '" data-ok="1">' + U.esc(opts.okText || '确 定') + '</button>';
    var overlay = U.openModal({ title: opts.title || '操作确认', body: body, footer: footer, persistent: true, onClose: opts.onClose });
    overlay.querySelector('[data-ok]').addEventListener('click', function (e) {
      var btn = e.currentTarget;
      if (!opts.onOk) { U.closeModal(); return; }
      U.withLoading(btn, function () {
        return Promise.resolve(opts.onOk()).then(function (r) {
          if (r !== false && overlay.isConnected) U.closeModal();
        });
      });
    });
  };
  /* 按钮 loading 包装（防重复点击） */
  U.withLoading = function (btn, fn, delay) {
    if (btn.classList.contains('is-loading')) return;
    var old = btn.innerHTML;
    btn.classList.add('is-loading');
    btn.innerHTML = old;
    Promise.resolve()
      .then(fn)
      .then(function () {
        return new Promise(function (r) { setTimeout(r, delay === undefined ? 450 : delay); });
      })
      .then(function () {
        btn.classList.remove('is-loading');
        btn.innerHTML = old;
      });
  };

  /* ---------- 表单校验 ---------- */
  U.clearErrors = function (scope) {
    scope.querySelectorAll('.is-error').forEach(function (el) {
      el.classList.remove('is-error'); el.removeAttribute('aria-invalid');
      var errorRef = el.getAttribute ? el.getAttribute('data-field-error-ref') : null;
      if (errorRef) {
        var descriptions = (el.getAttribute('aria-describedby') || '').split(/\s+/).filter(function (id) { return id && id !== errorRef; });
        if (descriptions.length) el.setAttribute('aria-describedby', descriptions.join(' '));
        else el.removeAttribute('aria-describedby');
      }
      el.removeAttribute('data-field-error-ref');
    });
    scope.querySelectorAll('.field-error').forEach(function (el) { el.textContent = ''; });
  };
  U.fieldError = function (input, msg, sharedErrorId) {
    input.classList.add('is-error');
    input.setAttribute('aria-invalid', 'true');
    var item = input.closest('.form-item');
    var errorId = sharedErrorId || '';
    if (item && !sharedErrorId) {
      var err = item.querySelector('.field-error');
      if (err) { err.textContent = msg; if (input.id) { err.id = input.id + '-error'; errorId = err.id; } }
    }
    if (errorId) {
      var oldRef = input.getAttribute ? input.getAttribute('data-field-error-ref') : null;
      var descriptions = input.getAttribute ? (input.getAttribute('aria-describedby') || '').split(/\s+/) : [];
      descriptions = descriptions.filter(function (id) { return id && id !== oldRef && id !== errorId; });
      descriptions.push(errorId);
      input.setAttribute('aria-describedby', descriptions.join(' '));
      input.setAttribute('data-field-error-ref', errorId);
    }
  };
  /* rules: [{el, label, required, number, min, max}] 返回是否全部通过 */
  U.validate = function (rules) {
    var ok = true, first = null;
    rules.forEach(function (r) {
      var val = (r.el.value || '').trim();
      if (r.required && !val) {
        U.fieldError(r.el, r.label + '为必填项'); ok = false; first = first || r.el; return;
      }
      if (val && r.number) {
        var n = Number(val);
        if (isNaN(n)) { U.fieldError(r.el, r.label + '必须为数字'); ok = false; first = first || r.el; return; }
        if (r.min !== undefined && n < r.min) { U.fieldError(r.el, r.label + '不能小于 ' + r.min); ok = false; first = first || r.el; return; }
        if (r.max !== undefined && n > r.max) { U.fieldError(r.el, r.label + '不能大于 ' + U.fmt(r.max)); ok = false; first = first || r.el; return; }
      }
    });
    if (first) first.focus();
    return ok;
  };
  U.formItem = function (label, inner, opts) {
    opts = opts || {};
    var control = inner.match(/<(?:input|select|textarea)\b[^>]*\bid="([^"]+)"/i);
    return '<div class="form-item">' +
      '<label class="' + (opts.required ? 'required' : '') + '"' + (control ? ' for="' + U.esc(control[1]) + '"' : '') + '>' + U.esc(label) + '</label>' +
      inner + '<div class="field-error"></div></div>';
  };

  /* ---------- 分页（前端假分页） ---------- */
  U.PAGE_SIZE = 6;
  U.page = function (list, page, size) {
    size = size || U.PAGE_SIZE;
    var pages = Math.max(1, Math.ceil(list.length / size));
    page = Math.min(Math.max(1, page || 1), pages);
    return { rows: list.slice((page - 1) * size, page * size), page: page, pages: pages, total: list.length };
  };
  U.pagination = function (pg, action) {
    if (pg.total === 0) return '';
    var btns = '';
    for (var i = 1; i <= pg.pages; i++) {
      btns += '<button class="page-btn ' + (i === pg.page ? 'active' : '') + '" data-page="' + i + '" data-action="' + action + '">' + i + '</button>';
    }
    return '<div class="pagination">' +
      '<span class="total">共 ' + pg.total + ' 条记录，每页 ' + U.PAGE_SIZE + ' 条，第 ' + pg.page + ' / ' + pg.pages + ' 页</span>' +
      '<button class="page-btn" data-page="' + (pg.page - 1) + '" data-action="' + action + '" ' + (pg.page <= 1 ? 'disabled' : '') + '>上一页</button>' +
      btns +
      '<button class="page-btn" data-page="' + (pg.page + 1) + '" data-action="' + action + '" ' + (pg.page >= pg.pages ? 'disabled' : '') + '>下一页</button>' +
      '</div>';
  };
  U.emptyRow = function (cols, msg) {
    return '<tr><td colspan="' + cols + '"><div class="empty-state"><div class="icon">▤</div>' + U.esc(msg || '暂无记录') + '</div></td></tr>';
  };

  /* ---------- 时间 ---------- */
  U.now = function () {
    var d = new Date();
    function p(n) { return (n < 10 ? '0' : '') + n; }
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + ' ' + p(d.getHours()) + ':' + p(d.getMinutes());
  };
  U.today = function () { return U.now().slice(0, 10); };
  U.seq = 100;
  U.newId = function (prefix) { return prefix + new Date().getFullYear() + String(++U.seq).padStart(4, '0'); };

  /* ---------- SVG 柱状图（纯手绘，无依赖） ---------- */
  U.barChart = function (data, opts) {
    opts = opts || {};
    var W = 460, H = 210, padL = 44, padB = 34, padT = 14, padR = 8;
    var cw = (W - padL - padR) / data.length;
    var max = Math.max.apply(null, data.map(function (d) { return d.value; }).concat([1]));
    var nice = U.niceCeil(max);
    var y = function (v) { return H - padB - (v / nice) * (H - padB - padT); };
    var svg = '<svg class="svg-chart" role="img" aria-label="' + U.esc(data.map(function (d) { return d.label + '：' + d.value; }).join('，')) + '" viewBox="0 0 ' + W + ' ' + H + '">';
    var tickCount = Math.min(4, nice);
    for (var g = 0; g <= tickCount; g++) {
      var gv = Math.round(nice * g / tickCount), gy = y(gv);
      svg += '<line x1="' + padL + '" y1="' + gy + '" x2="' + (W - padR) + '" y2="' + gy + '" stroke="#edf0f6"/>' +
        '<text x="' + (padL - 6) + '" y="' + (gy + 4) + '" font-size="11" fill="#62718a" text-anchor="end">' + U.tickText(gv) + '</text>';
    }
    data.forEach(function (d, i) {
      var bw = Math.min(34, cw * 0.55);
      var x = padL + i * cw + (cw - bw) / 2;
      var bh = H - padB - y(d.value);
      svg += '<rect x="' + x + '" y="' + y(d.value) + '" width="' + bw + '" height="' + Math.max(1, bh) + '" rx="3" fill="' + (opts.color || 'var(--primary)') + '"><title>' + U.esc(d.label + '：' + d.value) + '</title></rect>';
      svg += '<text x="' + (x + bw / 2) + '" y="' + (y(d.value) - 5) + '" font-size="10.5" fill="#5a6378" text-anchor="middle">' + d.value + '</text>';
      svg += '<text x="' + (x + bw / 2) + '" y="' + (H - padB + 18) + '" font-size="10.5" fill="#62718a" text-anchor="middle">' + U.esc(d.label) + '</text>';
    });
    svg += '<line x1="' + padL + '" y1="' + (H - padB) + '" x2="' + (W - padR) + '" y2="' + (H - padB) + '" stroke="#d6dbe7"/>';
    return svg + '</svg>';
  };
  U.niceCeil = function (v) {
    var pow = Math.pow(10, Math.floor(Math.log10(v)));
    var n = v / pow;
    var f = n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10;
    return f * pow;
  };
  U.tickText = function (v) {
    if (v >= 10000) return (v / 10000) + '万';
    if (v >= 1000) return (v / 1000) + 'k';
    return String(v);
  };

  /* ---------- 待办（铃铛 & 工作台共用） ---------- */
  U.todosFor = function (role, userName) {
    var todos = [];
    if (role === 'boss') {
      M.approvals.filter(function (a) { return a.status === '待处理'; }).forEach(function (a) {
        todos.push({ kind: a.type, text: a.title, sub: a.applicant + ' · ' + a.applyTime, link: '#/approvals' });
      });
    } else if (role === 'doc') {
      M.documents.filter(function (d) { return d.status === '制作中' || d.status === '草稿' || d.status === '已退回'; }).forEach(function (d) {
        todos.push({ kind: d.status === '已退回' ? '退回待修订' : '待完成制单', text: U.docTypeName(d.type) + ' ' + d.no + ' V' + d.version + '（' + d.orderId + '）', sub: d.status, link: '#/documents/' + d.id });
      });
    } else if (role === 'fin') {
      M.orders.filter(function (o) { return U.payStatus(o) !== '已结清' && o.status !== '取消申请中' && o.status !== '已取消'; }).forEach(function (o) {
        var fin = U.orderFin(o);
        todos.push({ kind: '待收款', text: o.id + ' · ' + U.customerName(o.customerId).split('（')[0], sub: '未收 ' + U.fmt(fin.outstanding) + ' ' + o.currency, link: '#/orders/' + o.id + '?tab=pay' });
      });
    } else if (role === 'sales') {
      M.quotes.filter(function (q) { return q.status === '待客户确认' && q.salesperson === userName; }).forEach(function (q) {
        todos.push({ kind: '报价待确认', text: q.id + ' · ' + U.customerName(q.customerId).split('（')[0], sub: '有效期至 ' + q.validUntil, link: '#/quotes/' + q.id });
      });
      M.inquiries.filter(function (i) { return i.status === '跟进中' && i.salesperson === userName; }).forEach(function (i) {
        todos.push({ kind: '询盘跟进', text: i.id + ' · ' + U.customerName(i.customerId).split('（')[0], sub: i.date, link: '#/inquiries/' + i.id });
      });
    } else if (role === 'admin') {
      todos.push({ kind: '系统', text: '演示环境账号巡检', sub: '每周例行', link: '#/system/users' });
    }
    return todos;
  };

  /* ---------- 会话用户 ---------- */
  var SESSION_KEY = 'trade_demo_user';
  U.currentUser = function () {
    try {
      var raw = sessionStorage.getItem(SESSION_KEY) || localStorage.getItem(SESSION_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) { /* file:// 下 storage 不可用时降级 */ }
    return window.__demoUser || null;
  };
  U.setUser = function (user) {
    window.__demoUser = user;
    try { sessionStorage.setItem(SESSION_KEY, JSON.stringify(user)); } catch (e) {}
    try { localStorage.setItem(SESSION_KEY, JSON.stringify(user)); } catch (e) {}
  };
  U.clearUser = function () {
    window.__demoUser = null;
    try { sessionStorage.removeItem(SESSION_KEY); } catch (e) {}
    try { localStorage.removeItem(SESSION_KEY); } catch (e) {}
  };
  U.roleUser = function (role) {
    return M.users.find(function (u) { return u.role === role && u.enabled; });
  };

  window.U = U;
})();
