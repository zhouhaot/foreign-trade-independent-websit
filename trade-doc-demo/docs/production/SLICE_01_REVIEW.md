# 首切片独立契约复核

日期：2026-10-14。范围：`slice-01.data-model.json`、`slice-01.openapi.json`、`DATA_MODEL.md`、`SECURITY_AND_TRANSACTIONS.md`。本报告为独立只读设计审查；仅本报告由审查代理新增，不修改产品、数据库、环境、账号或交接文件。

## 初次结论：REQUEST_CHANGES

主流程、真实身份、本人数据范围/主管全量只读、同来源唯一成单、事务及确认快照方向合理。当前模型与API存在可触发实现失败的不一致，修正前不能作为已定稿实现契约。以下编号便于修订后逐项回读。

| 编号 | 必须修正 | 触发与影响 | 可执行修正/验收 |
|---|---|---|---|
| R1 | 商品存储缺少`ref_price`、`currency`、`enabled` | API创建/读取要求参考价和币种，修改要求enabled，询盘创建还需判断商品是否停用；按模型迁移后无对应事实可存取 | 补齐列、币种外键、精度及创建启用默认，或统一删减API能力；用商品创建→停用→询盘拒绝的契约映射核验 |
| R2 | 询盘存储缺少`inquiry_date`；message长度4000/API5000 | 合法InquiryCreate日期无法持久化；4500字message可过API却超逻辑模型上限，报价日期下限也失去依据 | 加询盘业务日期并统一长度；增加字段覆盖与长度差异检测 |
| R3 | 报价`valid_until`默认非空但草稿API允许null | createQuote明确初始validUntil=null；照模型建表会使首份报价草稿落库失败 | 明确列nullable，并保证仅DRAFT可空、submit必须真实有效日期；用初始草稿测试 |
| R4 | 卖方和币种显示资料缺来源映射 | CompanySnapshot要求legalName/contact/email/phone，但company_profile只有name_cn/name_en/address；Currency必返displayName但catalog无该列 | 明确持久化来源或确定性投影，并对合法配置到响应/快照做字段映射校验；不得临时填Demo资料 |
| R5 | 结构schemaVersion与业务snapshotVersion混用/遗漏 | 逻辑模型要求所有snapshot含schemaVersion，尤其product_snapshot；API拒绝未知属性且ProductSnapshot无该字段，TradeSnapshot只有业务snapshotVersion | 区分结构版本与业务冻结版本，统一各类型/DTO/检查器；确认与成单逐值复制同一冻结结构 |
| R6 | 幂等“原结果”无法从现有记录重建 | K1创建商品→K2修改商品→重放K1；模型只留resource_id/status，不能还原原字段结果 | 明确重放返回同资源当前授权表示，而非承诺原字段/原字节；或保存可恢复的受控版本结果。增加可变资源两次修改后重放用例 |
| R7 | 行匹配及零散互斥规范不一致 | quote_line要求完整lineId集合但API仅接收lineNo；Cookie Path正文为`/`而API为`/api/v1`；成单交期冲突code正文与API不同 | 统一稳定行标识（当前DTO可用原lineNo集合）、Cookie作用域与清理、错误code；检查器须能捕获这些漂移 |

另请统一customer.phone、trade_term、payment_term等模型/DTO最大长度及hs_code的null/空字符串表示，或写明投影规则；更宽数据库列不一定立刻导致写失败，但未定义的既有行回读可能违反响应契约。

## 应保留的门禁

- 商品公司共用只意味着目录共享，不会使客户/询盘/报价/订单跨业务员可读；任何读取/写入关联仍校验岗位和对象范围。
- 数量和单价各最多两位正数，不意味着乘积自然到分；`0.01×0.01`应明确422，不能先round再提交。
- 附件可选，但首切片不含上传能力，非空attachmentIds明确拒绝，不能称附件上传已交付。
- 提交报价时按用户已审阅客户/公司版本冻结；确认与成单复制冻结快照，不从后来修改的主数据重建。
- 首切片不提供直接订单新增、通用订单修改、修订、订单推进、单证或收款写接口。
- 已确认报价过期后的首次成单、确认/询盘/交期日期区间仍是未决保守门禁；不能冒称用户批准的正式业务政策。
- 同键重放及不同键命中唯一来源订单前仍需重新鉴权；来源唯一、幂等记录和业务原子提交必须在真实数据库中另验。

## 实际验证边界

本次实际做了文件读取、JSON解析和字段/关系/描述静态比较，未运行后端、数据库迁移、CSRF、会话、并发、事务回滚、浏览器E2E或服务器重启测试。相关实现验收只能标PLANNED；本报告不把静态契约可解析称为生产功能通过。验收矩阵和专用检查脚本尚待主代理补充后另行复核。

## 修订回读与检查器首次复验

R1–R7已逐项回读修订：商品字段/服务端enabled默认及参考价非负、询盘日期/长度、草稿nullable有效期、卖方/币种显示字段、结构schemaVersion、可变资源幂等当前表示、lineNo/Cookie路径/错误code均已对齐；phone长度和fieldErrors数组要求也已一致。API另明确全部响应no-store、登录422和服务端只读报价日期。分页区分无筛选匹配与超末页：后者items为空但保留真实total/totalPages。同商品多行不被无依据禁止，由服务端分配稳定唯一lineNo。

独立读取新增`slice-01.acceptance.json`和239行`verify-production-contract.cjs`后，执行`node --check scripts/verify-production-contract.cjs`及`node scripts/verify-production-contract.cjs`：首版结果1813条静态检查、355引用、25操作、47 schemas、16表、49个PLANNED场景、23个mutation反例及21个schema子集样本通过；真实集成执行数为0。

额外独立负向探针发现检查器漏检，暂列R8等待补强（当前实际模型/API没有这些错误）：

- 将`QuoteItemUpdate.unitPrice`改为number/null，校验仍无错误。
- 将`InquiryItemInput.quantity`改为number，校验仍无错误。
- 删除`order_line`到`quote_line`的来源复合外键，校验仍无错误。
- 删除`quote_line`到`inquiry_line`的来源复合外键，校验仍无错误。

需要对金额字段的确切DecimalString引用以及关键业务外键的完整source/target tuple作断言并增加对应反例。只验证“现有FK的字段存在/类型相同/目标唯一”或只includes一部分归属字段，不能证明关键关系没有被移除或接错。

## 最终复核：APPROVE（仅契约设计基线）

补强后重新读取检查器的精确字段和关系断言：15个金额字段使用规定的DecimalString或DecimalString/null形态，九条关键来源/归属复合外键按完整源列、目标表和目标列匹配，不再只宽匹配字段片段。

最终实际执行：

- `node --check scripts/verify-production-contract.cjs`通过。
- `node scripts/verify-production-contract.cjs`通过：1835条静态检查、355引用、25操作、47 schemas、16逻辑表、49个PLANNED集成场景、35个负向mutation和21个schema子集样本；真实集成执行数仍为0。
- 再次独立构造六个只存在内存中的反例：原先两个number金额字段、两个删除来源行FK反例，以及把订单确认FK错误接到confirmation.id、把询盘归属FK缩为owner→customer.id。六个均被对应精确断言捕获。
- 单独核对矩阵覆盖全部25个operationId且所有49项保持PLANNED；五类分页DTO均明确空筛选与越界页区别。

R1–R8本批必须修项已闭合，当前没有额外必须修正的契约不一致。可以把这一版作为后续架构决策和首切片实现的审阅基线；此批准不是数据库、接口、安全或生产上线批准。

保留的明确限制：检查器只覆盖此契约约定的JSON Schema子集，不是完整OpenAPI/JSON Schema标准验证器；真实日历、数量正数、整分乘积、聚合总额、鉴权、CSRF、幂等、锁、事务、数据库约束和重启持久化仍需49项中的实际服务/数据库/浏览器验收。数据库/依赖版本、账号开通、服务器规格和候选日期政策等未决项仍由后续阶段按门禁收敛，不因本报告APPROVE而自动视为已批准或已实现。

### 默认有效期衔接补记

只读回核最后四处默认值说明：OpenAPI createQuote invariant、quote模型checks、DATA_MODEL步骤2及QUOTE-01计划期望，均统一为服务器报价日+15个日历日。目标断言确认逻辑列`valid_until.nullable=true`、QuoteUpdate仍接受null，且submit继续要求补齐真实有效日期，因此“创建默认有值”与“草稿允许清空/存null”不冲突，不破坏R3修复。原先“createQuote初始null”仅是本报告初审时的历史触发描述，不再代表最终默认。未扩大审查范围或重新运行全量测试；此前APPROVE（仅契约设计基线）结论保持。
