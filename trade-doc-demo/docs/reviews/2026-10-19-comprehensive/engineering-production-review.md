# 工程、测试可信度、生产契约与文档独立审查

日期：2026-10-19。审查基线：`4c674496667fd31078194ca81c0d0a4f081eda21`。正式目录：`/Users/airuquan/foreign-trade-independent-websit/trade-doc-demo`。

本专题未发现可据现有证据新增定级的原型P0/P1。基线确认两项工程测试覆盖缺口（P2）和两项现行文档漂移（P3）；覆盖缺口不表示当前产品已经存在被变异出的错误。中枢独立复现后授权限定修复，现已修复并通过专题检查，完整回归由中枢执行。首切片生产模型/API/权限边界及49项PLANNED的数量和状态相符，但没有真实后端、数据库或上线验收证据，不能上线。

初审按只读范围完成并保留原负例输出，随后中枢明确授权仅修改两个检查器与README/PRODUCT现行说明；未改模型/API、运行JS/CSS或业务规则。本报告发现的源码行号对应4c67449基线，修复另见文末。中枢另行执行40脚本基线与最终回归；本作者不重复全套，不将中枢尚未交付的结果预标通过。

## 范围与本次实际执行

- 已读现行AGENTS、HANDOFF当前状态及最新交接、全面审查方案、40个验证器的入口/断言/错误退出/依赖关系，以及生产说明、数据模型、OpenAPI、权限事务、验收矩阵和历史复核说明。
- 对README、PRODUCT与现行实施基线作交叉核对；历史轮次与交付ZIP仅按既有历史标签解释。
- 实际运行一次`node scripts/verify-production-contract.cjs`：PASS，1835检查、355内部引用、25操作、47 Schema、16表、35变异反例、21个Schema子集样本；49项仍PLANNED，真实集成执行数0。未带`--report`，没有覆盖旧回执。
- 新增并运行只读[独立反例脚本](evidence/engineering-negative-probes.cjs)：两种入口装配破坏与三种存储金额类型破坏，全部仅在内存替换。纠正一次探针自身的预期后，5项均复现测试漏检。
- 未启动浏览器、安装依赖、连接数据库、操作服务器、写外部系统或核查现行外部技术标准。file协议、缓存升级及浏览器布局/键盘的当前结果由中枢专题给出，本作者没有继承历史PASS。

## ENG-T01 — 入口资源验证能漏过破坏启动的装配修改

类型：工程验证覆盖缺口。建议P2。已确认，独立复核待中枢。适用：静态Demo测试可信度；不是当前index.html已有故障。

规则：AGENTS第3节要求普通script按依赖顺序加载，第5节列明3CSS/9JS，第7节要求入口引用不缺失。

位置：`scripts/verify-demo.cjs:8`、`:11`、`:16`、`:19`；当前入口`index.html:18`起。该验证器只计12个src/href、检查文件存在并分别编译JS，实际执行Mock/utils时使用另一份写死的正确顺序。没有断言资源身份唯一性或按index顺序执行。

最短复现：在项目目录运行`node docs/reviews/2026-10-19-comprehensive/evidence/engineering-negative-probes.cjs`。脚本截获验证器对index的读取，仅在内存做下列替换，然后按被替换HTML的实际script次序执行源码：

| 内存变异 | 原verify-demo结果 | 按声明顺序执行结果 |
|---|---|---|
| utils放到mock-data之前 | PASS | utils抛`Cannot read properties of undefined (reading 'payments')`，App未定义 |
| app引用替换为第二份utils引用 | PASS | 第二次utils抛`Cannot redefine property: snapshot`，App未定义 |

影响：现行源码正确也不能消除此门禁盲区。若以后错误重排/漏装核心资源，仅靠该验证器会得到假绿灯；其余多数验证器直接按各自文件清单读取源码，也不验证发布入口装配。尚未声称把这两种变异对全40脚本执行过。

建议：核对确切的CSS/JS清单、数量、唯一性与顺序；增加按真实入口顺序的启动冒烟，保留上述两个失败反例。浏览器HTTP/file及缓存混载另作验收；单文件语法通过不能替代启动。动态地图资源`assets/maps/world-land.svg`不在入口12项内，后续资源核查还应覆盖实际嵌套引用。

## ENG-T02 — 生产契约检查器漏检存储金额类型退化

类型：工程验证覆盖缺口。建议P2。已确认，独立复核待中枢。适用：生产设计检查器；没有执行DDL，未发现当前逻辑模型真的使用浮点。

规则：`docs/production/DATA_MODEL.md:50`及`:52`要求精确十进制与整分计算；`slice-01.data-model.json:20`将候选存储明确为DECIMAL(20,2)。

位置：`scripts/verify-production-contract.cjs:119`至`:132`严格核对API的15个金额字段，但`:134`起的模型检查只检查键/外键等，`:167`至`:170`的API/存储映射只检查字段存在与文本长度，没有检查存储金额类型或所有类型是否属于模型声明类型。

最短复现：运行上述独立反例脚本，其调用检查器导出的`validate`，分别仅把下列逻辑列的type由`decimal20_2`改成`binaryFloat`：

| 逻辑列 | 检查器结果 |
|---|---|
| quote_line.unit_price | errors=[]；1835检查 |
| quote.total_amount | errors=[]；1835检查 |
| order_line.line_amount | errors=[]；1835检查 |

实际原模型三列均为`decimal20_2`；该结论只说明检查器不保证存储精确性，不能据此报告当前系统金额错误。原35个变异反例验证API金额及关键关系，没有覆盖这三类存储退化。

影响：未来模型改动可能绕过被视作金额契约门禁的检查。`docs/production/README.md:28`的“金额字段精确类型、API/存储字段映射”应按实际检查范围解读，不能扩张为DB类型已验证。

建议：对所有数量、单价、行金额与合计存储列断言精确类型、nullable约束和类型字典；加入存储退化变异。选定数据库后的迁移测试仍必须检查真实列精度、边界拒绝、整分计算及回滚，不能以此静态补强替代。

## ENG-D01 — README验证清单遗漏两项当前地图回归

类型：现行文档漂移。P3。已确认。

位置：`README.md:7`、`:91`至`:131`列37个原型命令，并明确生产检查另算；实际有39个原型验证器+1个生产检查器。遗漏`verify-order-map.cjs`和`verify-order-map-origin.cjs`。HANDOFF当前状态已有40个脚本的较新回执，README仍是地图加入前的清单。

影响：按README照跑不能覆盖新增地图/逐单起点。旧37项历史结果并未因此失效，但不能作为当前完整回归计数。

建议：后续文档修复时补齐两项并明确39+1的分母；本审查未修改README。

## ENG-D02 — 现行概述仍把NAS保留为部署目标

类型：现行文档漂移。P3。已确认。

位置：`README.md:74`与`PRODUCT.md:19`仍写公司内网服务器或NAS；已确认基线`docs/production/IMPLEMENTATION_PLAN.md:8`明确服务器、不采用NAS作为当前目标。AGENTS第2节较新的生产准备段也已引导到该实施基线。

影响：接手者只读README/PRODUCT可能重启已收敛的部署选型讨论。该问题不改变静态Demo约束或授权任何服务器操作。

建议：修改现行概述并指向已确认基线；历史交接与旧草案保留原文并维持历史标签。

## 40个验证器的可信度边界

以下是源码审查分组，不是40项本作者重跑结果，也不是独立业务用例数。组内脚本名均省略`verify-`与`.cjs`。

| 组 | 数量 | 文件 | 能支持的结论与主要限制 |
|---|---:|---|---|
| 资源/视图/订单工作区 | 3 | demo；views；order-workspace | 文件、语法、样例及HTML/动作回调；views的100组是直接调用View的角色组合，不是路由权限100组或浏览器布局 |
| 登录/会话 | 2 | login；session | VM内账号选择、退出/存储清理与路由处理；不是真实密码或服务端会话 |
| 数字/改价/报价/收款 | 6 | decimal-contract；repricing；quotation-contract；payments-contract；change-request-amount；review-finance | 固定数值、拒绝/零写和延迟漂移覆盖；不是真实DB并发或任意十进制输入的完整证明 |
| 客户/询盘/销售 | 3 | customer-contract；inquiry-contract；review-sales | 实际View/Action与内存业务对象、545USD固定样例等；销售真实归属隔离并未由Demo全量Mock证明 |
| 单证/包装/进度 | 13 | document-action-guidance；document-approval-display；document-dashboard；document-lifecycle；document-snapshots；document-status-guidance；document-work-bell；document-work-summary；document-workspace；progress-stages；packaging-actions；packaging-contract；review-documents | 历史快照、唯一版本、资格、实际动作和零写；部分流程使用确认/DOM桩，不能等同纸张渲染/焦点/导出文件 |
| 变更/审批/取消 | 3 | change-request；cancellation；approval-context | 对象/状态/身份变化与历史保留；无生产审批身份、锁或审计实现 |
| 草稿/导航/框架 | 7 | approval-modal-drafts；context-navigation；draft-adapters；modal-drafts；navigation-drafts；sales-modal-drafts；review-shared | 最小DOM/模拟history/实际处理器；无原生布局、浏览器历史栈完整认证或真实辅助技术验收 |
| 地图 | 2 | order-map；order-map-origin | 角色、筛选、起点、金额与独立几何/合成输入；不是世界地形已实际加载、真实运输路线或物流准确性 |
| 生产契约 | 1 | production-contract | JSON内部一致性与指定变异；没有服务/DB/浏览器集成 |
| 合计 | 40 | 39个原型+1个生产静态检查 | 不用脚本数替代用例、断言或浏览器场景数 |

默认路径没有发现“catch后仍报PASS”的实现：异步脚本一般设置`process.exitCode=1`，地图逐例累积失败后也设置非零状态，生产脚本用assert直接失败。40个脚本都有断言入口。脚本的显式`--probe-*`/`--red`等历史选项需要按各自语义解释，不能与正常回归混跑后单看退出码。

不是全部自证：`verify-decimal-contract.cjs:15`有写死的独立分值期望，`:19`覆盖非整分拒绝；`verify-order-map.cjs:150`起独立检查USD30分/EUR40分；`verify-order-map-origin.cjs:22`起另算投影和曲线点。相反，`verify-views.cjs:68`等用两个产品helper互比，仅证明该场景的内部联系，不能单独用作金额真值；其他固定期望与独立核算仍不可省略。

共享fixture不等于真实浏览器：`verify-document-workspace.cjs:29`起是手写HTML解析器，`:56`起是有限选择器，`:76`压缩延时且默认减少动态效果，`:115`用35ms等待。对真实DOM布局、CSS、事件传播、原生键盘、图片加载、缓存与长时性能须保留独立浏览器证据。

### 默认Git历史依赖：环境风险，非产品失败

4个默认脚本需完整仓库历史与固定对象：

| 文件 | 默认历史调用位置 | 固定对象 |
|---|---|---|
| approval-context | scripts/verify-approval-context.cjs:141、:146 | d9b1748、f8643db |
| document-dashboard | scripts/verify-document-dashboard.cjs:8、:129 | 77deae8、f8643db |
| document-status-guidance | scripts/verify-document-status-guidance.cjs:12、:135 | 58a6582及导入的ac8d5a9/f8643db |
| document-action-guidance | scripts/verify-document-action-guidance.cjs:11、:182 | ac8d5a9、f8643db |

这些历史比较已明确说明是归档证明，当前业务断言仍读取当前代码；没有把归档全文相等冒充本次源码未变。缺历史时`git show`/status断言会失败，不会被吞掉。但浅克隆或无`.git`源码包无法原样执行全部默认验证，应把历史保持检查与当前回归门禁分开，或提供具有校验值的必要归档fixture。其他脚本中的旧源读取主要在显式probe选项，不计入这4项默认依赖。没有实际创建浅克隆测试，因此本处是源码证据支持的环境依赖判断。

## 生产设计交叉核对

| 主题 | 本次核对结果 | 不能据此宣称 |
|---|---|---|
| 首切片数量与状态 | 16表/25操作/47 Schema；49项全PLANNED、覆盖25个operationId；真实执行0 | 49项已经验收或后端已经存在 |
| 身份与五岗 | 会话服务器识别；sales本人写/读、boss全量只读；admin/doc/fin仅认证接口，本切片销售业务拒绝 | Demo角色切换是鉴权，或单证/财务职责永久取消 |
| 共用商品与交易归属 | 商品company-catalog，客户/询盘/报价/订单owner-or-boss；关键复合关系显式列出 | 共用商品意味着交易全员可见 |
| 成单唯一性与事务 | 无通用POST/orders；确认关联、来源唯一、V1/行/审计/幂等共同提交；重放先重新鉴权 | 已运行数据库唯一约束、并发或故障回滚 |
| 版本与冻结 | 提交时冻结客户/商品/卖方；确认/成单沿原快照，结构版本与业务版本分开 | 已具备完整单证修订/生效/历史导出规则 |
| 精确金额 | API DecimalString，数量/单价两位、逐行整分，模型当前decimal20_2 | 已经实现服务端BigDecimal/整数运算或正确DDL |
| 日期及附件 | 附件可选；首切片非空attachmentIds明确拒绝；报价+15日默认一致，过期及区间规则标候选 | 已批准所有日期政策或已实现文件上传下载 |
| 错误/会话 | 401/403/404/409/422等有范围；CSRF/撤销/权限重查/no-store有文字与API要求 | 真实Cookie/CSRF/权限撤销/错误脱敏已经运行通过 |

在以上已确认边界内没有复现新的模型/API/权限实质冲突。`SLICE_01_REVIEW.md`的APPROVE已限定为设计，静态检查也明确不是完整OpenAPI/Schema标准验证器，不应改写为生产安全认证。检查器不能证明全部文字语义一致，例如`CONFIRM-03`将“已确认重复确认”和“已送出修改交易”合为一行；实施时应拆开初态/动作/期望，避免误读为禁止AWAITING_CUSTOMER首次登记确认。本处列为用例精化建议，不将这句组合描述直接定为现有产品缺陷。

## 上线缺口与待决事项（不按Demo P0计）

| 类别 | 当前状态 | 下一步必要证据 |
|---|---|---|
| 独立生产工程/数据库/依赖 | 未创建/未选定 | 登记目录规则与架构决策，锁定构建及迁移方案 |
| 真实身份/账号生命周期 | 未实现；初始化/重置/超时/限流待定 | 隔离合成账号、登录/撤销/停用/撤权实测；匿名CSRF会话的建立与Cookie发放也须端到端验证 |
| 服务端归属与字段授权 | 仅设计 | sales A/B、boss及三拒绝岗位的列表/详情/错误/写入矩阵，查询本身按owner过滤 |
| 真数据库精度/外键/并发/幂等 | 仅逻辑设计 | 选定引擎上的迁移、边界、并发来源唯一、同键异请求、故障注入与零半成功回读 |
| 持久化与重启 | 未执行 | 重启服务/DB后回读同一快照、订单、归属、确认及幂等结果 |
| 全首版CI/PL、收款、变更、统计、系统维护 | 不在首切片API | 后续岗位与数据范围契约，版本生效、不可自审、错误收款冲销/退款及订单取消规则 |
| 文件与真实单证导出 | 未实现；模板未批准 | 文件授权/隔离/保存/一致备份，业务确认模板样本与原文件回读；导出演示不计产物 |
| 起运地与地图真实数据维护 | 只有Demo显式合成数据 | 明确逐单来源及维护权限；新成单缺值不套用Demo记录 |
| 业务决策 | 过期补录/首次成单、日期范围、兼岗、编号、单证生效/失效、冲销退款未定 | 按阶段形成已确认规则，规则未定的动作继续拒绝，不能沿旧草案默认批准 |
| 服务器/容量/运维/恢复 | 信息缺失，未部署 | 系统/架构/规格、目标数据与并发、TLS/网络、监控责任、RPO/RTO、数据库+文件一致备份与隔离恢复演练 |

以上49项只覆盖首切片，不覆盖完整首版的单证/财务、文件、备份恢复与目标服务器容量。缺条件的真实测试状态为NOT_RUN/待环境，不用静态PASS、15名员工或历史浏览器回执替代。

## 复验与审查产物

重放命令：`node docs/reviews/2026-10-19-comprehensive/evidence/engineering-negative-probes.cjs`。该脚本不写产品文件。

过程纠正：首次探针假设第二次加载utils不会即时抛错，实际发现不可重复定义冻结snapshot，导致探针自身assert失败；现已将预期修正为实际TypeError并重跑通过。首次失败属于探针方法错误，未改正式源码、未把它列为当前产品回归失败。第一次日志及修正后的精确输出摘要见[evidence/engineering-run-evidence.json](evidence/engineering-run-evidence.json)。

## 中枢授权后的限定修复与复验

中枢已独立运行原反例，确认ENG-T01/T02，并明确授权本作者修复两检查器及两处现行说明。已执行：

- `scripts/verify-demo.cjs`精确检查12资源的身份、唯一性和依赖顺序，保留缓存query剥离，并拒绝协议URL/绝对路径；原资源、样例金额检查继续执行。
- `scripts/verify-production-contract.cjs`对当前模型10个参考价/数量/单价/金额列逐字段要求`decimal20_2`，并新增10个对应退化反例。未改变类型选择、精度或业务规则。
- README加入两地图命令，现行计数为39原型+1生产契约；README/PRODUCT按已确认服务器方案表述，硬件与并发仍待补。历史交接/旧轮次未改。
- 独立探针默认从Git的4c67449读取原检查器、入口、相关JS及设计JSON，在内存重放原5项漏检；`--current`针对当前文件要求同5项全部被拒绝。基线结果未被修复后的结果覆盖。

实际复验：两个改动检查器与证据脚本共3份`node --check`通过；`verify-demo`通过（12资源、9报价、11版本、7笔订单/收款原样勾稽）；生产检查通过（1845检查、355引用、45变异反例、21子集样本、25操作/47 Schema/16表/49PLANNED、真实集成0）；探针baseline与current模式分别通过。中枢当时另有views-core修改，因此当前检查回执中的源指纹可能与初审基线不同；该运行文件未由本作者修改。

当前ENG-T01/T02与ENG-D01/D02为已修复、待中枢最终回归收口。生产实现仍按既有分阶段门槛推进，不能从本报告推导部署或真实系统变更授权。
