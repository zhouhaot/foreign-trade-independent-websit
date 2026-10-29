# 首个业务切片数据模型

本切片覆盖认证、共享商品、本人客户与询盘、报价确认及首次成单。机器可读权威来源为 [slice-01.data-model.json](slice-01.data-model.json)。PostgreSQL 已由 ADR 选定，但当前没有执行 DDL 或通过数据库事务测试。

## 决策与未决项

需求方已确认服务器部署、业务员本人数据/主管全量只读、只录新业务、公司商品共用、确认附件可选，以及数量/单价各最多两位且行金额精确到分。客户确认方式、日期和说明必须记录。

UUID 主键、`numeric(20,2)`、同源 Cookie 数据库会话、首切片单一有效岗位、PostgreSQL/Drizzle 和单机部署属于现行工程决策。`Asia/Shanghai` 业务时区、流水编号、报价过期例外、报价修订、兼岗和订单后续状态仍未最终批准；旧草案的默认答案不能替代确认。

## 表与关系

| 表 | 用途与关键关系 |
|---|---|
| `app_user` | 稳定人员 ID、登录名、密码编码、岗位、启用状态和权限版本；不导入 Demo 用户 |
| `user_session` | 匿名/登录数据库会话、过期/撤销、认证版本及 CSRF 哈希；不返回敏感字段 |
| `currency_catalog` | 公司批准的启用币种及金额精度；目录可保存不同非负精度，首切片交易只接受两位金额币种，无自动换汇 |
| `company_profile` | 真实本公司抬头与版本；未配置不能提交报价，不默认使用演示出口方 |
| `product` | 公司共用商品，SKU 唯一；引用后不提供删除接口 |
| `customer` | `owner_user_id` 由真实登录身份生成；客户资料变更不改历史交易 |
| `inquiry` | 客户与业务员一致的复合外键；创建时检查客户端审阅的客户版本 |
| `inquiry_line` | 关联共用商品，捕获 SKU/描述/规格/单位/版本与询价数量 |
| `quote` | 每询盘首份报价唯一、同归属客户、币种、条款、有效期和提交快照 |
| `quote_line` | 必须对应同询盘原行；草稿按完整稳定 `lineNo` 集合修改数量/价格 |
| `quote_confirmation` | 每报价一份确认，记录业务日期/方式/说明及服务端登记人/时间 |
| `sales_order` | 来源报价唯一且必须有关联确认；归属从报价继承，禁止客户端改 owner |
| `order_version` | 首次 V1，复制确认快照与币种/总额，另采集交货日期；本切片无修订接口 |
| `order_line` | 绑定同一来源报价和订单版本的原明细，版本内行号唯一 |
| `idempotency_record` | 同操作人+幂等键唯一，与业务事务共同提交，不保存敏感完整响应 |
| `audit_event` | 成功业务事件只追加，记录服务端身份/时间/版本，不开放任意改写 |

字段默认非空，只有 JSON 明确 `nullable` 的字段允许空。带 `common` 的表落库时展开 `created_at`、`created_by`、`updated_at`、`row_version`；`created_by` 外键不可遗漏。不可物理删除仍有引用的用户、客户或商品；停用和交接另定，不能用删除历史行代替。

`user_session.user_id` 与 `auth_version` 仅在匿名态共同允许 `NULL`，登录后二者均必填。匿名态用于登录前 CSRF，不是已认证身份，也不能访问受保护业务数据。

## 归属与引用完整性

`customer` 具有唯一键 `(id, owner_user_id)`。`inquiry` 使用 `(customer_id, owner_user_id)` 复合外键，`quote` 使用 `(inquiry_id, owner_user_id, customer_id)` 复合外键，不能仅凭客户端拼入另一客户 ID 生成越权交易。数据库外键不代替服务层岗位、权限和归属检查。

`quote_line` 同时约束其 quote 和 inquiry line 来自同一个 inquiry。`sales_order.source_quote_id` 全局唯一，并引用对应确认，不能给未确认来源成单。`order_line` 同时约束 order version 和 quote line 来自同一报价。这些键必须在 Drizzle Schema 和 PostgreSQL 迁移中等价落实并验收。

## 快照捕获时点

1. 创建询盘时核对 `productVersion`，捕获商品描述快照；之后修改共用目录不自动更新该询盘。
2. 从询盘创建报价，复制商品快照与数量；报价日期由服务器生成，有效期默认 +15 个日历日。成交价由业务员填写，未填价只能保留草稿；草稿可暂清空有效期，提交前须补齐。
3. 草稿读取展示当前有权访问的客户/本公司资料预览及 `sourceVersions`。提交时核对 `expectedVersion`、`expectedCustomerVersion`、`expectedCompanyProfileVersion`；来源变化返回 409。
4. 提交待确认时一次冻结卖方、客户、商品、数量、价格、币种、条款和有效期；确认逐值复制此版本，不从新主数据补写。用户 `confirmedOn` 与服务端 `recordedAt` 分开。
5. 成单复制确认快照。客户端只能给报价期望版本与必填交货日期，不能重传客户、明细或总额覆盖已确认内容。

## PostgreSQL 映射、金额与日期

UUID 使用原生 `uuid`；金额使用 `numeric(20,2)`；业务日期使用 `date`；审计时间使用 `timestamptz` 并以 UTC 解释；版本化快照使用 `jsonb`。Drizzle 与 PostgreSQL 驱动之间保持十进制字符串，不在 API、应用服务或数据库转换前转为 JavaScript `Number`。`currency_catalog.amount_scale` 使用非负整数，允许目录保存非两位精度；服务层仍只向本切片交易提供启用的两位精度币种。

API 数量和单价均为正数、最多两位，存储上限为 18 位整数+2 位小数。令数量和单价分别转为整数百分单位 Q、P，仅当 Q×P 能被 100 整除时，行金额“分”为 `(Q×P)/100`；余数非零即 422 并指出行，不用 `round(2)` 掩盖差额。例如 `0.01×0.01` 拒绝，`0.01×1.00` 得到 `0.01`。合计同币种逐行相加并再次检查上界。

业务日期使用真实日历日期；创建日与过期判定取服务器配置的业务时区，审计时间存 UTC。暂按 `quoteDate≤confirmedOn≤validUntil` 且 `confirmedOn≤业务今天`，并拒绝有效期已过的确认/成单；这些日期保护属于保守候选门禁，过期补录或转单规则仍需业务确认。报价有效期只是字段与校验，不推导自动定时任务。

## 本切片不包含

不发布通用订单新增/修改、报价修订、订单开始/完成/取消、单证、收款或业务日志全量查询接口。订单首次创建返回待执行、单证未开始、未收款三条独立进度。附件可选已确认，但上传能力待后续文件安全设计，不能声称已交付。
