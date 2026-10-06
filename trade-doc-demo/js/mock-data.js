/* ============================================================
 * mock-data.js
 * 样例数据仅用于原型演示，不代表真实业务数据。
 * 数据之间保持勾稽：
 *  - 订单金额 = 商品明细 Σ(数量 × 成交单价)
 *  - 订单已收 = 该订单收款记录之和（不同币种各自独立，不合并）
 *  - 单证明细由其关联订单派生
 * ============================================================ */
(function () {
  'use strict';

  /* ---------- 角色与用户 ---------- */
  var ROLES = {
    admin: '系统管理员',
    sales: '外贸业务员',
    doc:   '单证员',
    fin:   '财务人员',
    boss:  '业务主管'
  };

  var USERS = [
    { id: 'U001', account: 'admin',    name: '系统管理员', initials: 'ADM', role: 'admin', dept: '信息技术部', enabled: true,  lastLogin: '2026-09-20 18:02' },
    { id: 'U002', account: 'chenming', name: '陈明',       initials: 'CM',  role: 'sales', dept: '外贸一部',   enabled: true,  lastLogin: '2026-09-21 08:47' },
    { id: 'U003', account: 'liting',   name: '李婷',       initials: 'LT',  role: 'sales', dept: '外贸二部',   enabled: true,  lastLogin: '2026-09-21 09:10' },
    { id: 'U004', account: 'wangfang', name: '王芳',       initials: 'WF',  role: 'doc',   dept: '单证部',     enabled: true,  lastLogin: '2026-09-21 08:31' },
    { id: 'U005', account: 'zhaoqian', name: '赵倩',       initials: 'ZQ',  role: 'fin',   dept: '财务部',     enabled: true,  lastLogin: '2026-09-20 17:55' },
    { id: 'U006', account: 'zhoujg',   name: '周建国',     initials: 'ZJG', role: 'boss',  dept: '外贸事业部', enabled: true,  lastLogin: '2026-09-21 07:58' },
    { id: 'U007', account: 'sunli',    name: '孙丽',       initials: 'SL',  role: 'sales', dept: '外贸二部',   enabled: false, lastLogin: '2026-05-11 14:20' }
  ];

  /* 角色 × 模块 权限矩阵（演示用） */
  var PERM_MODULES = ['工作台', '客户与商品', '销售业务', '订单详情', '单证管理', '收款与应收', '审核与异常', '统计分析', '系统管理'];
  var PERM_MATRIX = {
    admin: ['工作台', '系统管理'],
    sales: ['工作台', '客户与商品', '销售业务', '订单详情'],
    doc:   ['工作台', '单证管理', '订单详情'],
    fin:   ['工作台', '收款与应收', '订单详情'],
    boss:  ['工作台', '订单详情', '单证管理', '审核与异常', '统计分析']
  };

  /* ---------- 出口方（本公司） ---------- */
  var SELLER = {
    nameCn: '宁波远航进出口有限公司',
    nameEn: 'NINGBO YUANHANG IMP. & EXP. CO., LTD.',
    addr: '浙江省宁波市鄞州区首南街道海运大厦 18 楼',
    addrEn: '18F, HAIYUN BUILDING, SHOUNAN STREET, YINZHOU, NINGBO, CHINA',
    tel: '+86-574-8820-6688',
    fax: '+86-574-8820-6699'
  };

  /* ---------- 客户 ---------- */
  var CUSTOMERS = [
    { id: 'C001', nameCn: '环球贸易公司',   nameEn: 'Global Trade GmbH',      country: '德国', contact: 'Hans Müller',  email: 'hans.mueller@globaltrade.de',  phone: '+49-30-5566-112',  addr: 'Hauptstrasse 88, 10115 Berlin, Germany',      level: 'A', since: '2021-03-12', remark: '欧洲主力客户，偏好 FOB 宁波' },
    { id: 'C002', nameCn: '太平洋进口公司', nameEn: 'Pacific Imports LLC',    country: '美国', contact: 'Sarah Johnson', email: 'sarah.j@pacificimports.com',   phone: '+1-310-555-0142',  addr: '2100 Harbor Blvd, Los Angeles, CA 90021, USA', level: 'A', since: '2019-06-01', remark: '长期合作，信用证结算为主' },
    { id: 'C003', nameCn: '撒哈拉经销公司', nameEn: 'Sahara Distribution SARL', country: '法国', contact: 'Pierre Dubois', email: 'p.dubois@sahara-dist.fr',    phone: '+33-1-4477-8890',  addr: '12 Rue de la Paix, 75002 Paris, France',     level: 'B', since: '2023-02-20', remark: '' },
    { id: 'C004', nameCn: '尼罗河贸易公司', nameEn: 'Nile Trading Co.',       country: '埃及', contact: 'Ahmed Hassan',  email: 'ahmed@niletrading.com',       phone: '+20-2-2390-5566',  addr: '15 Tahrir Square, Cairo, Egypt',             level: 'B', since: '2024-08-15', remark: '近期付款周期变长，注意账期风险' },
    { id: 'C005', nameCn: '安第斯零售集团', nameEn: 'Andes Retail Group',     country: '智利', contact: 'Carlos Ruiz',   email: 'carlos.ruiz@andesretail.cl',  phone: '+56-2-2345-7788',  addr: 'Av. Providencia 1208, Santiago, Chile',      level: 'C', since: '2025-11-30', remark: '新客户，首单执行中' },
    { id: 'C006', nameCn: '东方之星公司',   nameEn: 'Orient Star Ltd',        country: '英国', contact: 'Emma Wilson',   email: 'emma.w@orientstar.co.uk',     phone: '+44-20-7946-0331', addr: '45 Oxford Street, London W1D 2DZ, UK',       level: 'B', since: '2022-09-08', remark: '' }
  ];

  /* ---------- 商品 ---------- */
  var PRODUCTS = [
    { id: 'P001', nameCn: '不锈钢保温杯', nameEn: 'Stainless Steel Vacuum Bottle', spec: '500ml / 316 不锈钢 / 多色', unit: '个', refPrice: 3.20, currency: 'USD', hsCode: '96170090', remark: '支持定制 LOGO' },
    { id: 'P002', nameCn: '折叠收纳箱',   nameEn: 'Collapsible Storage Box',       spec: '60L / PP 加厚 / 带盖',      unit: '个', refPrice: 2.80, currency: 'USD', hsCode: '39231000', remark: '' },
    { id: 'P003', nameCn: 'LED 露营灯',   nameEn: 'LED Camping Lantern',           spec: 'USB 充电 / 三档调光',       unit: '个', refPrice: 4.50, currency: 'USD', hsCode: '85131090', remark: '含锂电池，注意运输鉴定' },
    { id: 'P004', nameCn: '硅胶厨具套装', nameEn: 'Silicone Kitchenware Set',      spec: '10 件套 / 食品级硅胶',      unit: '套', refPrice: 6.80, currency: 'USD', hsCode: '39241000', remark: '' },
    { id: 'P005', nameCn: '陶瓷马克杯',   nameEn: 'Ceramic Mug',                   spec: '350ml / 釉下彩',            unit: '个', refPrice: 1.50, currency: 'USD', hsCode: '69120010', remark: '易碎品，加强包装' },
    { id: 'P006', nameCn: '竹制砧板',     nameEn: 'Bamboo Cutting Board',          spec: '40×30×1.8cm / 整竹',        unit: '块', refPrice: 2.60, currency: 'USD', hsCode: '44191100', remark: '' },
    { id: 'P007', nameCn: '户外野餐垫',   nameEn: 'Outdoor Picnic Blanket',        spec: '200×200cm / 防水底',        unit: '张', refPrice: 5.20, currency: 'USD', hsCode: '63079000', remark: '' },
    { id: 'P008', nameCn: '玻璃密封罐',   nameEn: 'Glass Storage Jar',             spec: '1000ml / 竹盖密封圈',       unit: '个', refPrice: 2.10, currency: 'USD', hsCode: '70109090', remark: '' }
  ];

  /* ---------- 询盘 ---------- */
  var INQUIRIES = [
    { id: 'INQ2026001', customerId: 'C002', salesperson: '陈明', date: '2026-06-02', source: '阿里国际站', status: '已报价', quoteId: 'Q2026001',
      items: [{ productId: 'P001', qty: 5000 }, { productId: 'P003', qty: 2000 }],
      message: '请报 500ml 保温杯与露营灯 FOB 上海价，目标交期 45 天，请提供最低起订量。' },
    { id: 'INQ2026002', customerId: 'C001', salesperson: '李婷', date: '2026-06-10', source: '老客户邮件', status: '已报价', quoteId: 'Q2026002',
      items: [{ productId: 'P004', qty: 3000 }],
      message: '硅胶厨具套装请报 EXW 价，需要 LFGB 认证资料。' },
    { id: 'INQ2026003', customerId: 'C005', salesperson: '陈明', date: '2026-07-15', source: '广交会', status: '已报价', quoteId: 'Q2026003',
      items: [{ productId: 'P002', qty: 8000 }, { productId: 'P007', qty: 1500 }],
      message: '收纳箱与野餐垫请报 CIF 圣安东尼奥港价，首单试单。' },
    { id: 'INQ2026004', customerId: 'C006', salesperson: '李婷', date: '2026-08-20', source: '官网表单', status: '已报价', quoteId: 'Q2026004',
      items: [{ productId: 'P005', qty: 10000 }, { productId: 'P008', qty: 4000 }],
      message: '马克杯与密封罐请报价，询问圣诞节前交期。' },
    { id: 'INQ2026005', customerId: 'C004', salesperson: '陈明', date: '2026-09-01', source: 'WhatsApp', status: '跟进中', quoteId: 'Q2026005',
      items: [{ productId: 'P006', qty: 5000 }],
      message: '竹砧板询价，客户还在比价，预计本周内回复。' },
    /* H17：仅为第6轮合法起草报价的合成演示场景；date是加入样例日期，不是真实收到询盘时间。 */
    { id: 'INQ2026006', customerId: 'C002', salesperson: '陈明', date: '2026-10-07', source: '合成演示样例', status: '跟进中', quoteId: null, demoSynthetic: true,
      items: [{ productId: 'P001', qty: 100 }, { productId: 'P003', qty: 50 }],
      message: '【合成演示，非真实客户需求】用于体验询盘生成报价：示意100个保温杯与50个露营灯；未发生客户确认、订单或单证。' }
  ];

  /* ---------- 报价 ---------- */
  var QUOTES = [
    { id: 'Q2026001', inquiryId: 'INQ2026001', customerId: 'C002', salesperson: '陈明', date: '2026-06-05', validUntil: '2026-07-15',
      currency: 'USD', tradeTerm: 'FOB 上海', paymentTerm: '30% 预付，70% 见提单副本', status: '已确认', orderId: 'SO2026001', confirmDate: '2026-06-18',
      items: [{ productId: 'P001', qty: 5000, price: 3.10 }, { productId: 'P003', qty: 2000, price: 4.30 }],
      remark: '含中性彩盒包装' },
    { id: 'Q2026002', inquiryId: 'INQ2026002', customerId: 'C001', salesperson: '李婷', date: '2026-06-12', validUntil: '2026-07-12',
      currency: 'EUR', tradeTerm: 'EXW 宁波', paymentTerm: '50% 预付，50% 发货前', status: '已确认', orderId: 'SO2026003', confirmDate: '2026-08-26',
      items: [{ productId: 'P004', qty: 3000, price: 6.50 }],
      remark: '附 LFGB 检测报告扫描件' },
    { id: 'Q2026003', inquiryId: 'INQ2026003', customerId: 'C005', salesperson: '陈明', date: '2026-07-18', validUntil: '2026-08-18',
      currency: 'USD', tradeTerm: 'CIF 圣安东尼奥', paymentTerm: '30% 预付，70% 货到 30 天', status: '已确认', orderId: 'SO2026005', confirmDate: '2026-07-28',
      items: [{ productId: 'P002', qty: 8000, price: 2.60 }, { productId: 'P007', qty: 1500, price: 4.90 }],
      remark: '新客户首单，已含海运费预估' },
    { id: 'Q2026004', inquiryId: 'INQ2026004', customerId: 'C006', salesperson: '李婷', date: '2026-08-25', validUntil: '2026-09-30',
      currency: 'USD', tradeTerm: 'FOB 宁波', paymentTerm: '100% 发货前付清', status: '待客户确认', orderId: null, confirmDate: null,
      items: [{ productId: 'P005', qty: 10000, price: 1.45 }, { productId: 'P008', qty: 4000, price: 2.00 }],
      remark: '客户要求圣诞前到港，交期需控制在 40 天内' },
    { id: 'Q2026005', inquiryId: 'INQ2026005', customerId: 'C004', salesperson: '陈明', date: '2026-09-04', validUntil: '2026-10-04',
      currency: 'USD', tradeTerm: 'FOB 上海', paymentTerm: '30% 预付，70% 见提单副本', status: '待客户确认', orderId: null, confirmDate: null,
      items: [{ productId: 'P006', qty: 5000, price: 2.45 }],
      remark: '客户比价中，价格已让至底价' },
    /* 以下三笔为历史已确认报价，作为存量订单的来源 */
    { id: 'Q2025118', inquiryId: null, customerId: 'C002', salesperson: '陈明', date: '2025-12-20', validUntil: '2026-01-20',
      currency: 'USD', tradeTerm: 'CIF 洛杉矶', paymentTerm: '100% 不可撤销即期信用证', status: '已确认', orderId: 'SO2026002', confirmDate: '2026-01-08',
      items: [{ productId: 'P005', qty: 20000, price: 1.42 }],
      remark: '' },
    { id: 'Q2025105', inquiryId: null, customerId: 'C001', salesperson: '李婷', date: '2025-11-25', validUntil: '2025-12-25',
      currency: 'EUR', tradeTerm: 'FOB 宁波', paymentTerm: '50% 预付，50% 见提单副本', status: '已确认', orderId: 'SO2026004', confirmDate: '2025-12-05',
      items: [{ productId: 'P001', qty: 10000, price: 3.05 }],
      remark: '' },
    { id: 'Q2026006', inquiryId: null, customerId: 'C004', salesperson: '陈明', date: '2026-06-15', validUntil: '2026-07-15',
      currency: 'EUR', tradeTerm: 'FOB 上海', paymentTerm: '30% 预付，70% 见提单副本', status: '已确认', orderId: 'SO2026006', confirmDate: '2026-06-30',
      items: [{ productId: 'P006', qty: 8000, price: 2.50 }],
      remark: '' },
    { id: 'Q2026007', inquiryId: null, customerId: 'C003', salesperson: '李婷', date: '2026-07-20', validUntil: '2026-08-20',
      currency: 'USD', tradeTerm: 'CFR 勒阿弗尔', paymentTerm: '100% 不可撤销即期信用证', status: '已确认', orderId: 'SO2026007', confirmDate: '2026-08-12',
      items: [{ productId: 'P007', qty: 6000, price: 4.80 }, { productId: 'P002', qty: 5000, price: 2.55 }],
      remark: '' }
  ];

  /* ---------- 订单（金额由明细派生；收款状态由收款记录派生） ----------
   * status:    待执行 / 执行中 / 已完成 / 取消申请中
   * docStatus: 未开始 / 制作中 / 待审核 / 已通过
   */
  var ORDERS = [
    { id: 'SO2026001', quoteId: 'Q2026001', customerId: 'C002', salesperson: '陈明', currency: 'USD',
      tradeTerm: 'FOB 上海', paymentTerm: '30% 预付，70% 见提单副本',
      status: '执行中', docStatus: '待审核', createdAt: '2026-06-20', deliveryDate: '2026-10-15',
      items: [{ productId: 'P001', qty: 5000, price: 3.10 }, { productId: 'P003', qty: 2000, price: 4.30 }],
      remark: '客户要求 10 月中旬前出运，分两批' },
    { id: 'SO2026002', quoteId: 'Q2025118', customerId: 'C002', salesperson: '陈明', currency: 'USD',
      tradeTerm: 'CIF 洛杉矶', paymentTerm: '100% 不可撤销即期信用证',
      status: '执行中', docStatus: '已通过', createdAt: '2026-01-12', deliveryDate: '2026-03-28',
      items: [{ productId: 'P005', qty: 20000, price: 1.42 }],
      remark: '' },
    { id: 'SO2026003', quoteId: 'Q2026002', customerId: 'C001', salesperson: '李婷', currency: 'EUR',
      tradeTerm: 'EXW 宁波', paymentTerm: '50% 预付，50% 发货前',
      status: '待执行', docStatus: '未开始', createdAt: '2026-08-28', deliveryDate: '2026-11-20',
      items: [{ productId: 'P004', qty: 3000, price: 6.50 }],
      remark: '等客户预付款到账后排产' },
    { id: 'SO2026004', quoteId: 'Q2025105', customerId: 'C001', salesperson: '李婷', currency: 'EUR',
      tradeTerm: 'FOB 宁波', paymentTerm: '50% 预付，50% 见提单副本',
      status: '已完成', docStatus: '已通过', createdAt: '2025-12-08', deliveryDate: '2026-02-10',
      items: [{ productId: 'P001', qty: 10000, price: 3.05 }],
      remark: '' },
    { id: 'SO2026005', quoteId: 'Q2026003', customerId: 'C005', salesperson: '陈明', currency: 'USD',
      tradeTerm: 'CIF 圣安东尼奥', paymentTerm: '30% 预付，70% 货到 30 天',
      status: '执行中', docStatus: '制作中', createdAt: '2026-07-30', deliveryDate: '2026-10-30',
      items: [{ productId: 'P002', qty: 8000, price: 2.60 }, { productId: 'P007', qty: 1500, price: 4.90 }],
      remark: '首单，客户验厂已通过' },
    { id: 'SO2026006', quoteId: 'Q2026006', customerId: 'C004', salesperson: '陈明', currency: 'EUR',
      tradeTerm: 'FOB 上海', paymentTerm: '30% 预付，70% 见提单副本',
      status: '取消申请中', docStatus: '未开始', createdAt: '2026-07-02', deliveryDate: '2026-10-05',
      items: [{ productId: 'P006', qty: 8000, price: 2.50 }],
      remark: '客户资金紧张，已申请取消，待主管审批' },
    { id: 'SO2026007', quoteId: 'Q2026007', customerId: 'C003', salesperson: '李婷', currency: 'USD',
      tradeTerm: 'CFR 勒阿弗尔', paymentTerm: '100% 不可撤销即期信用证',
      status: '执行中', docStatus: '已通过', createdAt: '2026-08-15', deliveryDate: '2026-11-05',
      items: [{ productId: 'P007', qty: 6000, price: 4.80 }, { productId: 'P002', qty: 5000, price: 2.55 }],
      remark: '信用证已开立，注意效期' }
  ];

  /* ---------- 收款记录（金额与订单勾稽） ---------- */
  var PAYMENTS = [
    { id: 'PAY2026001', orderId: 'SO2026001', amount: 10000, currency: 'USD', method: '电汇 T/T', date: '2026-07-01', remark: '预付款',       operator: '赵倩' },
    { id: 'PAY2026002', orderId: 'SO2026001', amount: 2000,  currency: 'USD', method: '电汇 T/T', date: '2026-08-15', remark: '客户补付模具费', operator: '赵倩' },
    { id: 'PAY2026003', orderId: 'SO2026002', amount: 28400, currency: 'USD', method: '信用证 L/C', date: '2026-03-05', remark: '信用证议付',   operator: '赵倩' },
    { id: 'PAY2026004', orderId: 'SO2026004', amount: 15000, currency: 'EUR', method: '电汇 T/T', date: '2025-12-20', remark: '预付款',       operator: '赵倩' },
    { id: 'PAY2026005', orderId: 'SO2026004', amount: 15500, currency: 'EUR', method: '电汇 T/T', date: '2026-02-10', remark: '尾款',         operator: '赵倩' },
    { id: 'PAY2026006', orderId: 'SO2026006', amount: 6000,  currency: 'EUR', method: '电汇 T/T', date: '2026-07-20', remark: '预付款',       operator: '赵倩' },
    { id: 'PAY2026007', orderId: 'SO2026007', amount: 20000, currency: 'USD', method: '信用证 L/C', date: '2026-09-01', remark: '信用证部分议付', operator: '赵倩' }
  ];

  /* ---------- 单证 ----------
   * type: CI=商业发票(Commercial Invoice)  PL=装箱单(Packing List)
   * status: 草稿 / 制作中 / 待审核 / 已通过 / 已退回
   * 明细由订单派生；marks / packing / remark 为单证员可编辑字段
   */
  var DOCUMENTS = [
    { id: 'D-CI2026001-V1', no: 'CI2026001', type: 'CI', version: 1, orderId: 'SO2026001', status: '待审核',
      maker: '王芳', createdAt: '2026-09-10', updatedAt: '2026-09-15', submittedAt: '2026-09-15',
      approver: null, approvedAt: null, opinion: null,
      marks: 'PACIFIC\nSO2026001\nLOS ANGELES\nC/NO. 1-140',
      packing: { cartons: 140, package: '纸箱', gw: '1,680 KGS', nw: '1,540 KGS', meas: '8.6 CBM' },
      remark: '',
      history: [
        { time: '2026-09-10 10:22', person: '王芳', action: '创建单证 V1', opinion: '' },
        { time: '2026-09-15 09:40', person: '王芳', action: '提交审核', opinion: '发票与装箱单已按信用证条款核对' }
      ] },
    { id: 'D-PL2026001-V1', no: 'PL2026001', type: 'PL', version: 1, orderId: 'SO2026001', status: '待审核',
      maker: '王芳', createdAt: '2026-09-10', updatedAt: '2026-09-15', submittedAt: '2026-09-15',
      approver: null, approvedAt: null, opinion: null,
      marks: 'PACIFIC\nSO2026001\nLOS ANGELES\nC/NO. 1-140',
      packing: { cartons: 140, package: '纸箱', gw: '1,680 KGS', nw: '1,540 KGS', meas: '8.6 CBM' },
      remark: '分两批出运，本单为第一批',
      history: [
        { time: '2026-09-10 10:35', person: '王芳', action: '创建单证 V1', opinion: '' },
        { time: '2026-09-15 09:41', person: '王芳', action: '提交审核', opinion: '' }
      ] },
    { id: 'D-CI2026002-V1', no: 'CI2026002', type: 'CI', version: 1, orderId: 'SO2026002', status: '已通过',
      maker: '王芳', createdAt: '2026-02-14', updatedAt: '2026-02-20', submittedAt: '2026-02-15',
      approver: '周建国', approvedAt: '2026-02-20', opinion: '与信用证条款一致，通过',
      marks: 'PACIFIC\nSO2026002\nLOS ANGELES\nC/NO. 1-500',
      packing: { cartons: 500, package: '纸箱', gw: '4,200 KGS', nw: '3,900 KGS', meas: '22.5 CBM' },
      remark: '',
      history: [
        { time: '2026-02-14 14:02', person: '王芳', action: '创建单证 V1', opinion: '' },
        { time: '2026-02-15 09:10', person: '王芳', action: '提交审核', opinion: '' },
        { time: '2026-02-20 16:30', person: '周建国', action: '审核通过', opinion: '与信用证条款一致，通过' }
      ] },
    { id: 'D-PL2026002-V1', no: 'PL2026002', type: 'PL', version: 1, orderId: 'SO2026002', status: '已通过',
      maker: '王芳', createdAt: '2026-02-14', updatedAt: '2026-02-20', submittedAt: '2026-02-15',
      approver: '周建国', approvedAt: '2026-02-20', opinion: '通过',
      marks: 'PACIFIC\nSO2026002\nLOS ANGELES\nC/NO. 1-500',
      packing: { cartons: 500, package: '纸箱', gw: '4,200 KGS', nw: '3,900 KGS', meas: '22.5 CBM' },
      remark: '',
      history: [
        { time: '2026-02-14 14:05', person: '王芳', action: '创建单证 V1', opinion: '' },
        { time: '2026-02-15 09:11', person: '王芳', action: '提交审核', opinion: '' },
        { time: '2026-02-20 16:31', person: '周建国', action: '审核通过', opinion: '通过' }
      ] },
    { id: 'D-CI2026003-V1', no: 'CI2026003', type: 'CI', version: 1, orderId: 'SO2026004', status: '已退回',
      maker: '王芳', createdAt: '2025-12-28', updatedAt: '2026-01-06', submittedAt: '2026-01-04',
      approver: '周建国', approvedAt: '2026-01-06', opinion: '买方地址与合同不一致，请按最新合同修订后重新送审',
      marks: 'GLOBAL\nSO2026004\nHAMBURG\nC/NO. 1-250',
      packing: { cartons: 250, package: '纸箱', gw: '3,000 KGS', nw: '2,750 KGS', meas: '15.0 CBM' },
      remark: '',
      history: [
        { time: '2025-12-28 11:20', person: '王芳', action: '创建单证 V1', opinion: '' },
        { time: '2026-01-04 10:05', person: '王芳', action: '提交审核', opinion: '' },
        { time: '2026-01-06 15:44', person: '周建国', action: '退回修改', opinion: '买方地址与合同不一致，请按最新合同修订后重新送审' }
      ] },
    { id: 'D-CI2026003-V2', no: 'CI2026003', type: 'CI', version: 2, orderId: 'SO2026004', status: '已通过',
      maker: '王芳', createdAt: '2026-01-07', updatedAt: '2026-01-09', submittedAt: '2026-01-08',
      approver: '周建国', approvedAt: '2026-01-09', opinion: '地址已修正，通过',
      marks: 'GLOBAL\nSO2026004\nHAMBURG\nC/NO. 1-250',
      packing: { cartons: 250, package: '纸箱', gw: '3,000 KGS', nw: '2,750 KGS', meas: '15.0 CBM' },
      remark: 'V2：按 2026-01-06 审核意见修订买方地址',
      history: [
        { time: '2026-01-07 09:12', person: '王芳', action: '创建单证 V2（受控修订）', opinion: '依据退回意见修订' },
        { time: '2026-01-08 08:58', person: '王芳', action: '提交审核', opinion: '' },
        { time: '2026-01-09 11:20', person: '周建国', action: '审核通过', opinion: '地址已修正，通过' }
      ] },
    { id: 'D-PL2026003-V1', no: 'PL2026003', type: 'PL', version: 1, orderId: 'SO2026004', status: '已通过',
      maker: '王芳', createdAt: '2026-01-07', updatedAt: '2026-01-09', submittedAt: '2026-01-08',
      approver: '周建国', approvedAt: '2026-01-09', opinion: '通过',
      marks: 'GLOBAL\nSO2026004\nHAMBURG\nC/NO. 1-250',
      packing: { cartons: 250, package: '纸箱', gw: '3,000 KGS', nw: '2,750 KGS', meas: '15.0 CBM' },
      remark: '',
      history: [
        { time: '2026-01-07 09:20', person: '王芳', action: '创建单证 V1', opinion: '' },
        { time: '2026-01-08 08:59', person: '王芳', action: '提交审核', opinion: '' },
        { time: '2026-01-09 11:21', person: '周建国', action: '审核通过', opinion: '通过' }
      ] },
    { id: 'D-CI2026004-V1', no: 'CI2026004', type: 'CI', version: 1, orderId: 'SO2026005', status: '制作中',
      maker: '王芳', createdAt: '2026-09-12', updatedAt: '2026-09-18', submittedAt: null,
      approver: null, approvedAt: null, opinion: null,
      marks: 'ANDES\nSO2026005\nSAN ANTONIO\nC/NO. 1-220',
      packing: { cartons: 220, package: '纸箱', gw: '2,860 KGS', nw: '2,600 KGS', meas: '12.4 CBM' },
      remark: '',
      history: [
        { time: '2026-09-12 15:30', person: '王芳', action: '创建单证 V1', opinion: '' }
      ] },
    { id: 'D-PL2026004-V1', no: 'PL2026004', type: 'PL', version: 1, orderId: 'SO2026005', status: '已退回',
      maker: '王芳', createdAt: '2026-09-12', updatedAt: '2026-09-17', submittedAt: '2026-09-16',
      approver: '周建国', approvedAt: '2026-09-17', opinion: '唛头信息与信用证第 46A 条不符（港口拼写），请核对后重新送审',
      marks: 'ANDES\nSO2026005\nSAN ANTONIO\nC/NO. 1-220',
      packing: { cartons: 220, package: '纸箱', gw: '2,860 KGS', nw: '2,600 KGS', meas: '12.4 CBM' },
      remark: '',
      history: [
        { time: '2026-09-12 15:35', person: '王芳', action: '创建单证 V1', opinion: '' },
        { time: '2026-09-16 10:00', person: '王芳', action: '提交审核', opinion: '' },
        { time: '2026-09-17 14:22', person: '周建国', action: '退回修改', opinion: '唛头信息与信用证第 46A 条不符（港口拼写），请核对后重新送审' }
      ] },
    { id: 'D-CI2026005-V1', no: 'CI2026005', type: 'CI', version: 1, orderId: 'SO2026007', status: '已通过',
      maker: '王芳', createdAt: '2026-09-02', updatedAt: '2026-09-05', submittedAt: '2026-09-03',
      approver: '周建国', approvedAt: '2026-09-05', opinion: '通过',
      marks: 'SAHARA\nSO2026007\nLE HAVRE\nC/NO. 1-320',
      packing: { cartons: 320, package: '纸箱', gw: '3,840 KGS', nw: '3,520 KGS', meas: '18.2 CBM' },
      remark: '',
      history: [
        { time: '2026-09-02 13:10', person: '王芳', action: '创建单证 V1', opinion: '' },
        { time: '2026-09-03 09:25', person: '王芳', action: '提交审核', opinion: '' },
        { time: '2026-09-05 10:40', person: '周建国', action: '审核通过', opinion: '通过' }
      ] },
    { id: 'D-PL2026005-V1', no: 'PL2026005', type: 'PL', version: 1, orderId: 'SO2026007', status: '已通过',
      maker: '王芳', createdAt: '2026-09-02', updatedAt: '2026-09-05', submittedAt: '2026-09-03',
      approver: '周建国', approvedAt: '2026-09-05', opinion: '通过',
      marks: 'SAHARA\nSO2026007\nLE HAVRE\nC/NO. 1-320',
      packing: { cartons: 320, package: '纸箱', gw: '3,840 KGS', nw: '3,520 KGS', meas: '18.2 CBM' },
      remark: '',
      history: [
        { time: '2026-09-02 13:12', person: '王芳', action: '创建单证 V1', opinion: '' },
        { time: '2026-09-03 09:26', person: '王芳', action: '提交审核', opinion: '' },
        { time: '2026-09-05 10:41', person: '周建国', action: '审核通过', opinion: '通过' }
      ] }
  ];

  /* ---------- 审核与异常申请 ----------
   * type: 单证审核 / 改价申请 / 取消申请 / 重新制单申请
   * status: 待处理 / 已通过 / 已退回
   */
  var APPROVALS = [
    { id: 'AP20260901', type: '单证审核', targetType: 'doc', targetId: 'D-CI2026001-V1',
      title: '商业发票 CI2026001（订单 SO2026001）审核', applicant: '王芳', applyTime: '2026-09-15 09:40',
      reason: '发票与装箱单已按信用证条款核对，请审核', status: '待处理', handler: null, handleTime: null, opinion: null },
    { id: 'AP20260902', type: '单证审核', targetType: 'doc', targetId: 'D-PL2026001-V1',
      title: '装箱单 PL2026001（订单 SO2026001）审核', applicant: '王芳', applyTime: '2026-09-15 09:41',
      reason: '', status: '待处理', handler: null, handleTime: null, opinion: null },
    { id: 'AP20260903', type: '改价申请', targetType: 'order', targetId: 'SO2026005',
      title: '订单 SO2026005 申请整体降价 3%', applicant: '陈明', applyTime: '2026-09-16 14:05',
      reason: '客户以首单试单为由要求整体降价 3%，降价后订单金额为 27,305.50 USD，毛利仍在可接受范围', status: '待处理', handler: null, handleTime: null, opinion: null,
      targetAmount: 27305.50 },
    { id: 'AP20260904', type: '取消申请', targetType: 'order', targetId: 'SO2026006',
      title: '订单 SO2026006 申请取消', applicant: '陈明', applyTime: '2026-09-18 10:30',
      reason: '客户资金链出现问题，正式发函申请取消订单。已收预付款 6,000.00 EUR 的退还方式待与客户协商', status: '待处理', handler: null, handleTime: null, opinion: null },
    { id: 'AP20260905', type: '重新制单申请', targetType: 'doc', targetId: 'D-PL2026004-V1',
      title: '装箱单 PL2026004 申请重新制单', applicant: '王芳', applyTime: '2026-09-17 15:02',
      reason: '因唛头与信用证条款不符被退回，申请基于修订内容重新制单生成 V2', status: '待处理', handler: null, handleTime: null, opinion: null },
    { id: 'AP20260801', type: '改价申请', targetType: 'order', targetId: 'SO2026001',
      title: '订单 SO2026001 露营灯单价上调 0.10 USD', applicant: '陈明', applyTime: '2026-08-01 09:15',
      reason: '客户追加定制功能，双方确认露营灯单价由 4.20 调整为 4.30 USD', status: '已通过', handler: '周建国', handleTime: '2026-08-02 11:20', opinion: '同意按新价执行，注意同步更新合同与单证' },
    { id: 'AP20260101', type: '单证审核', targetType: 'doc', targetId: 'D-CI2026003-V2',
      title: '商业发票 CI2026003 V2（订单 SO2026004）审核', applicant: '王芳', applyTime: '2026-01-08 08:58',
      reason: '已按退回意见修订买方地址', status: '已通过', handler: '周建国', handleTime: '2026-01-09 11:20', opinion: '地址已修正，通过' },
    { id: 'AP20260102', type: '取消申请', targetType: 'order', targetId: 'SO2026002',
      title: '订单 SO2026002 曾申请取消（客户撤回）', applicant: '陈明', applyTime: '2026-01-20 16:40',
      reason: '客户临时考虑取消，次日撤回申请', status: '已退回', handler: '周建国', handleTime: '2026-01-21 09:05', opinion: '客户已撤回取消意向，订单继续执行' }
  ];

  /* ---------- 订单操作日志 ---------- */
  var ORDER_LOGS = {
    'SO2026001': [
      { time: '2026-06-20 10:05', person: '陈明', content: '报价 Q2026001 经客户确认，生成订单 SO2026001' },
      { time: '2026-07-01 15:30', person: '赵倩', content: '登记收款 10,000.00 USD（电汇 T/T，预付款）' },
      { time: '2026-08-02 11:20', person: '周建国', content: '改价申请 AP20260801 审核通过：露营灯单价调整为 4.30 USD' },
      { time: '2026-08-15 11:12', person: '赵倩', content: '登记收款 2,000.00 USD（电汇 T/T，模具费）' },
      { time: '2026-09-15 09:40', person: '王芳', content: '商业发票 CI2026001、装箱单 PL2026001 提交审核' }
    ],
    'SO2026002': [
      { time: '2026-01-12 09:00', person: '陈明', content: '报价 Q2025118 经客户确认，生成订单 SO2026002' },
      { time: '2026-01-21 09:05', person: '周建国', content: '取消申请已退回：客户撤回取消意向，订单继续执行' },
      { time: '2026-02-20 16:31', person: '周建国', content: '单证 CI2026002 / PL2026002 审核通过' },
      { time: '2026-03-05 14:18', person: '赵倩', content: '登记收款 28,400.00 USD（信用证 L/C 议付），订单结清' }
    ],
    'SO2026003': [
      { time: '2026-08-28 10:42', person: '李婷', content: '报价 Q2026002 经客户确认，生成订单 SO2026003，等待预付款后排产' }
    ],
    'SO2026004': [
      { time: '2025-12-08 11:30', person: '李婷', content: '报价 Q2025105 经客户确认，生成订单 SO2026004' },
      { time: '2025-12-20 10:00', person: '赵倩', content: '登记收款 15,000.00 EUR（预付款）' },
      { time: '2026-01-06 15:44', person: '周建国', content: 'CI2026003 V1 退回修改：买方地址与合同不一致' },
      { time: '2026-01-09 11:21', person: '周建国', content: 'CI2026003 V2 / PL2026003 审核通过' },
      { time: '2026-02-10 16:45', person: '赵倩', content: '登记收款 15,500.00 EUR（尾款），订单结清' },
      { time: '2026-02-12 09:30', person: '李婷', content: '货物签收确认，订单完成' }
    ],
    'SO2026005': [
      { time: '2026-07-30 09:26', person: '陈明', content: '报价 Q2026003 经客户确认，生成订单 SO2026005' },
      { time: '2026-09-12 15:30', person: '王芳', content: '开始制作单证（CI2026004 / PL2026004）' },
      { time: '2026-09-16 14:05', person: '陈明', content: '提交改价申请 AP20260903：整体降价 3%' },
      { time: '2026-09-17 14:22', person: '周建国', content: 'PL2026004 退回修改：唛头与信用证条款不符' }
    ],
    'SO2026006': [
      { time: '2026-07-02 10:15', person: '陈明', content: '报价 Q2026006 经客户确认，生成订单 SO2026006' },
      { time: '2026-07-20 11:40', person: '赵倩', content: '登记收款 6,000.00 EUR（预付款）' },
      { time: '2026-09-18 10:30', person: '陈明', content: '提交取消申请 AP20260904：客户资金链问题' }
    ],
    'SO2026007': [
      { time: '2026-08-15 14:22', person: '李婷', content: '报价 Q2026007 经客户确认，生成订单 SO2026007' },
      { time: '2026-09-01 10:05', person: '赵倩', content: '登记收款 20,000.00 USD（信用证部分议付）' },
      { time: '2026-09-05 10:41', person: '周建国', content: '单证 CI2026005 / PL2026005 审核通过' }
    ]
  };

  /* ---------- 基础字典 ---------- */
  var DICTS = [
    { group: '订单状态',   code: 'PENDING',    label: '待执行',   enabled: true },
    { group: '订单状态',   code: 'RUNNING',    label: '执行中',   enabled: true },
    { group: '订单状态',   code: 'DONE',       label: '已完成',   enabled: true },
    { group: '订单状态',   code: 'CANCELING',  label: '取消申请中', enabled: true },
    { group: '单证状态',   code: 'DOC_NONE',   label: '未开始',   enabled: true },
    { group: '单证状态',   code: 'DOC_MAKING', label: '制作中',   enabled: true },
    { group: '单证状态',   code: 'DOC_REVIEW', label: '待审核',   enabled: true },
    { group: '单证状态',   code: 'DOC_PASS',   label: '已通过',   enabled: true },
    { group: '单证状态',   code: 'DOC_REJECT', label: '已退回',   enabled: true },
    { group: '收款方式',   code: 'TT',         label: '电汇 T/T', enabled: true },
    { group: '收款方式',   code: 'LC',         label: '信用证 L/C', enabled: true },
    { group: '收款方式',   code: 'DP',         label: '付款交单 D/P', enabled: true },
    { group: '收款方式',   code: 'OA',         label: '赊销 O/A', enabled: false },
    { group: '币种',       code: 'USD',        label: '美元 USD', enabled: true },
    { group: '币种',       code: 'EUR',        label: '欧元 EUR', enabled: true },
    { group: '币种',       code: 'CNY',        label: '人民币 CNY', enabled: false },
    { group: '贸易术语',   code: 'FOB',        label: 'FOB 离岸价', enabled: true },
    { group: '贸易术语',   code: 'CIF',        label: 'CIF 到岸价', enabled: true },
    { group: '贸易术语',   code: 'CFR',        label: 'CFR 成本加运费', enabled: true },
    { group: '贸易术语',   code: 'EXW',        label: 'EXW 工厂交货', enabled: true }
  ];

  window.MOCK = {
    roles: ROLES,
    users: USERS,
    permModules: PERM_MODULES,
    permMatrix: PERM_MATRIX,
    seller: SELLER,
    customers: CUSTOMERS,
    products: PRODUCTS,
    inquiries: INQUIRIES,
    quotes: QUOTES,
    orders: ORDERS,
    payments: PAYMENTS,
    documents: DOCUMENTS,
    approvals: APPROVALS,
    orderLogs: ORDER_LOGS,
    dicts: DICTS
  };
})();
