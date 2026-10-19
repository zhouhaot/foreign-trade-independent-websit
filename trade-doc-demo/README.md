# 贸易协同 · 外贸订单与单证管理

现代化桌面贸易协同工作区。当前仍是未接后端的静态前端；界面已采用业务中性文案，不将改名当作生产能力。2026-10-07 已实现 A 方案及第14轮 CI/PL 操作字段文案一致性；每轮改进、验证、复盘见 `docs/iterations/`。

2026-10-19 已完成界面去冗余标签、未实现文件／密码操作的准确表述及专项验收，见[本轮批复与证据](docs/reviews/2026-10-19-copy-transition/README.md)。原 Mock、历史与当前 A 配色保持不变。

2026-10-14 已完成五岗位评审改进：补齐新订单首制 CI/PL、改价实时预演、交期/有效期、财务快捷登记与即时指标、动态权限及演示角色快捷切换；调整工作台、通栏筛选、详情页签与单证编辑动线。新单同订单链路已实际走通，详见[本轮实施与验收](docs/iterations/2026-10-14-review.md)。此前[接续验收](docs/iterations/2026-10-14-resume-acceptance.md)记录的是修复前缺口。Mac 正式工作目录为仓库克隆内的 `trade-doc-demo/`，原旧目录保留。

后续已进入[生产化契约设计](docs/production/README.md)：服务器、本人数据隔离与新业务等输入已确认，16张逻辑表、25个API操作及权限事务设计已整理。当前仍未运行后端或执行数据库迁移；不改变本版的运行方式。设计检查单独运行`node scripts/verify-production-contract.cjs`，不计入下方42组原型产品回归。

## 在另一台电脑继续

对应仓库：[zhouhaot/foreign-trade-independent-websit](https://github.com/zhouhaot/foreign-trade-independent-websit)，分支 `main`。本 Demo 位于仓库的 `trade-doc-demo/` 子目录；根目录的早期需求与架构草案原样保留，不代表已批准实施。

```sh
git clone https://github.com/zhouhaot/foreign-trade-independent-websit.git
cd foreign-trade-independent-websit/trade-doc-demo
```

用编辑器或 Codex 打开这个 `trade-doc-demo` 目录，先读 `AGENTS.md` → `HANDOFF.md` → `PRODUCT.md`，再继续开发。已有克隆且工作区干净时可在仓库内执行 `git pull --ff-only`；有未提交修改时先审查并保留，不直接覆盖。

- 当前是 A 浅色现代 UI；顶栏支持受未保存输入保护的“快速切换岗位”，也保留退出重登。
- **A 已落地**：100px 浅色窄导航、紫色主操作、薄荷青收款区，订单列表与所选订单三条进度并排。保留完整表格、筛选、分页与六页签详情。查看[实施说明](A-IMPLEMENTATION.md)、[A 概念图](.impeccable/mocks/decision/modern-multicolor/a.png)及[迭代路线](IMPLEMENTATION_ROADMAP.md)。C 为历史方案。
- 第2轮已增加单证基线快照、包装修订继承与重新制单当前捕获，防止主数据漂移；改价候选不命中目标时原子拒绝。详见[本轮说明](docs/iterations/round-02.md)。这些是静态原型能力，未知历史数据、服务端事务与真实部署仍需另行验证。
- 第3轮按本订单切换版本，主动作前置，旧版只读/取消两态暂停动作与导出演示、历史结果保留。局部版本/返回入口保护未提交输入；不代表全局草稿保护。详见[第3轮说明](docs/iterations/round-03.md)，H09-H11为可撤销原型假设。
- 第4轮严格普通两位十进制/逐行到分、报价完整候选与来源、实时同币种余额与收款提交守卫；失效选择不换单、错误保留输入/具体字段/原提示。详见[第4轮说明](docs/iterations/round-04.md)。H12/H13仍为原型假设，真实商品单位精度及日期等正式规则尚待定义。
- 第5轮对报价、收款、客户资料、单证包装与审核意见统一离开提示；取消保当前输入，成功才清状态。收款历史翻页保登记表单，岗位链接按既有权限可达，商品可返回明确来源订单；非法地址保当前输入并给完整原因。详见[第5轮说明](docs/iterations/round-05.md)。H14/H15限定当前作业区与可识别本会话历史，不是自动保存或未知历史栈完整恢复。
- GitHub 同步不包含 `.backups/`、`delivery/` 的旧包和本机工具临时状态；当前完整源码、设计资产与验证记录均在对应目录。历史记录中的本机绝对路径和临时端口仅用于追溯，不是另一台电脑的运行地址。
- 本次同步前原 Mac 源目录没有 Git 元数据，因此通过独立克隆整理上传；原目录文件保留。后续建议以新克隆的仓库作为 Git 工作区，不在原目录直接执行 `git pull`。

## 直接运行

解压项目后双击 `index.html` 即可打开，无需安装依赖、构建工具或数据库。

也可以在项目目录运行：

```sh
python3 -m http.server 8000 --bind 127.0.0.1
```

浏览器访问 `http://127.0.0.1:8000/index.html#/login`。本地占位账号／密码已填好，选择岗位后点击“进入工作台”；尚未接入认证服务，不校验真实账号密码，请勿输入真实凭据。桌面设计主要支持 1280px 及以上宽度。

## 本版体验

- 双栏登录与岗位下拉选择（只显示岗位名，不附人员姓名），清晰呈现报价、订单、单证和收款的业务关系。
- 角色专属工作台、可收起导航、业务路径、统一列表与筛选、订单六页签。
- 单证 CI / PL 纸张预览、专注模式、只读交易字段、送审与版本修订。
- 按币种分列的财务与统计视图，不混合 USD / EUR 金额。
- 顶部“搜索工作区”或 `⌘K` / `Ctrl+K`：搜索当前角色可访问的页面、订单、单证；业务员还可搜索客户。
- 搜索支持方向键、Enter、Esc；中文输入法组词确认不会触发跳转。弹窗支持焦点限定及关闭后焦点返回。
- 页面、导航、图表、弹窗、反馈与控件动效；跟随系统“减少动态效果”设置。

## 推荐体验路线

| 角色 | 体验 |
|---|---|
| 外贸业务员 | 询盘 → 报价 → 登记客户确认 → 生成订单 → 订单三条独立进度 |
| 单证员 | 未制单订单 → 制作单证 → CI/PL V1 → 补实际包装 → 送审；已通过版本 → 受控修订 |
| 业务主管 | 待审单证 → 审核意见 → 通过 / 退回；统计分析按币种查看 |
| 财务人员 | 收款与应收 → 选择订单 → 登记收款 → 查看已收、未收更新 |
| 系统管理员 | 用户管理、角色权限、基础字典；无业务审批权 |

顶栏可直接选择岗位；有未提交输入时先确认继续填写或放弃，成功切换才清理原身份临时状态。需求方于2026-10-14确认此规则替换旧退出重登限定。退出登录仍清除会话并保护受限路由；已提交的内存数据保留到刷新前。订单只能由已确认报价生成；已审核单证修订生成新版本，保留原版本。管理员权限矩阵只能收紧原岗位模块上限，不能赋予管理员业务审批权。

## 当前能力与限制

这是可运行的静态前端，尚未接入生产数据与后台服务：

- 登录不校验真实账号；岗位权限约束当前本地流程，不构成服务端安全边界。
- 业务修改仅发生在内存，刷新后还原样例；登录身份有本地会话记忆。
- 单证“登记导出记录”只追加内存操作记录，不生成PDF文件。
- “密码服务说明”仅说明未接入账号服务，不修改密码、不发送通知。
- 新建客户、新建用户与新增字典项仍是注明“暂未开放”的禁用入口。
- 尚未接入 Spring Boot、数据库、真实审批通知或组织账号；不适合录入真实敏感业务数据。
- 不包含新增单证种类、未确认的数据范围规则或移动端正式适配。

后续按真实落地标准规划，已确认面向本公司内部约 15 人并部署到服务器；服务器系统、硬件规格与并发数待补。架构与数据存储仍需收敛，详见[已确认实施基线](docs/production/IMPLEMENTATION_PLAN.md)；本目录当前仍是前端 Demo，演示登录和权限矩阵不等同于后端身份验证。

## 项目文件

`index.html` 引入 3 个 CSS 与 9 个普通 JS。无 CDN、外部字体或运行时网络依赖。

- `css/base.css`：变量、组件、表单、表格、弹窗、反馈。
- `css/layout.css`：登录、侧栏、顶栏、业务路径、搜索。
- `css/pages.css`：工作台、详情、单证、财务与图表。
- `js/mock-data.js`：唯一样例数据源；其它文件按业务模块划分。
- `DESIGN.md`：实际设计与动效规范。
- `AGENTS.md` / `HANDOFF.md`：开发约束与变更、验收记录。

## 验证

基础检查需要本机已安装 Node.js，运行项目不需要 Node.js：

```sh
node scripts/verify-demo.cjs
node scripts/verify-views.cjs
node scripts/verify-login.cjs
node scripts/verify-session.cjs
node scripts/verify-order-workspace.cjs
node scripts/verify-repricing.cjs
node scripts/verify-document-snapshots.cjs
node scripts/verify-progress-stages.cjs
node scripts/verify-document-lifecycle.cjs
node scripts/verify-cancellation.cjs
node scripts/verify-document-workspace.cjs
node scripts/verify-change-request.cjs
node scripts/verify-change-request-amount.cjs
node scripts/verify-decimal-contract.cjs
node scripts/verify-quotation-contract.cjs
node scripts/verify-payments-contract.cjs
node scripts/verify-navigation-drafts.cjs
node scripts/verify-context-navigation.cjs
node scripts/verify-draft-adapters.cjs
node scripts/verify-customer-contract.cjs
node scripts/verify-inquiry-contract.cjs
node scripts/verify-packaging-contract.cjs
node scripts/verify-packaging-actions.cjs
node scripts/verify-document-approval-display.cjs
node scripts/verify-modal-drafts.cjs
node scripts/verify-sales-modal-drafts.cjs
node scripts/verify-approval-modal-drafts.cjs
node scripts/verify-approval-context.cjs
node scripts/verify-document-work-summary.cjs
node scripts/verify-document-dashboard.cjs
node scripts/verify-document-work-bell.cjs
node scripts/verify-document-status-guidance.cjs
node scripts/verify-document-action-guidance.cjs
node scripts/verify-review-sales.cjs
node scripts/verify-review-documents.cjs
node scripts/verify-review-shared.cjs
node scripts/verify-review-finance.cjs
node scripts/verify-order-map.cjs
node scripts/verify-order-map-origin.cjs
node scripts/verify-disabled-login.cjs
node scripts/verify-review-integrity.cjs
node scripts/verify-product-copy.cjs
```

前四个脚本检查资源/样例金额、100组角色视图与关键回调、登录/退出。其余检查订单工作区、改价/快照/单证与取消、输入/历史保护、岗位上下文、申请防重复与初始金额、数字/报价/收款/客户维护/询盘/包装/纸张审核、三业务弹窗关闭、审批关联查阅、当前制单摘要/首页/铃铛接续、单证横幅资格指导及实际字段操作文案契约。四个review专项覆盖销售、首制单证、框架权限和财务改进，两地图专项覆盖国家分布与逐单起运地；末三组覆盖无启用账号登录、陈旧登录回调、编号唯一、精确金额显示及中性文案/真实能力披露。以上42个原型命令，加上单独的生产契约静态检查及下方两个工具契约共45个验证器，不代替浏览器；历史轮次说明与测试归档按当时范围保留，当前结果见最新迭代报告。

### 当前回归与历史归档

`verify-approval-context.cjs`、`verify-document-dashboard.cjs`、`verify-document-status-guidance.cjs`和`verify-document-action-guidance.cjs`默认只执行当前源码／VM回归，不要求Git历史。保留原强历史证明，显式追加运行：

```bash
node scripts/verify-approval-context.cjs --archive
node scripts/verify-document-dashboard.cjs --archive
node scripts/verify-document-status-guidance.cjs --archive
node scripts/verify-document-action-guidance.cjs --archive
node scripts/verify-history-gates.cjs
node scripts/verify-history-gates.cjs --archive
node scripts/verify-browser-contract.cjs
```

归档完整且所有断言执行后才输出`PASS ARCHIVE`。源码包／浅克隆缺少要求的Git对象时输出`BLOCKED MISSING_HISTORY`并退出2；断言失败退出1，不自动fetch。默认输出`ARCHIVE NOT_REQUESTED`并非历史通过。`verify-history-gates`默认12组检查当前无Git执行、缺历史阻塞和当前变异拒绝，`--archive`再加8组真实历史执行／变异拒绝。浏览器契约脚本是Node模拟适配器测试，不能计作真实Ego或业务界面验收。

第6轮体验：业务员在客户详情维护资料，错误保留输入；询盘 INQ2026006 是明确合成需求，可核对参考545USD并生成一次报价草稿，再编辑实际价格与条款。原询盘已有报价只接续查看；草稿没有登记客户确认或直接生成订单。改进与验证边界见 [第6轮材料](docs/iterations/round-06.md)。

第7轮体验：单证员进入退回PL2026004编辑包装。普通正整数箱数、明确KG/KGS重量和CBM体积可保存；空毛重等资料显示待补，送审须五项完整且毛重不小于净重。度量最多3位为H18原型假设，合法原文保留；确认窗口核对全部候选，修订继承包装仍需核对实际货物。CI仅编辑唛头与备注，不受隐藏包装门槛。改进与验证边界见 [第7轮材料](docs/iterations/round-07.md)。

第8轮体验：CI/PL纸张审核栏按当前查看版本区分未送审、等待本次审核、退回未通过；该版本已通过才显示其批准人。原退回记录、旧通过姓名/章和交易快照保留，当前导出资格独立；缺姓名/日期只提示待核对，模板签字线不代表实际签署。改进与验证边界见 [第8轮材料](docs/iterations/round-08.md)。

第9轮体验：客户确认、订单变更或主管处理弹窗填写后误关，可选择继续填写或明确放弃；清洁直接关闭。继续保原内容、错误、焦点和滚动，处理中等待结果，成功仅关闭源窗口。H20不代表自动保存或撤回已提交业务，其它弹窗／页面导航／刷新不在此保证内。改进与实际边界见 [第9轮材料](docs/iterations/round-09.md)。

第10轮体验：订单变更的改价金额只接受至少0.01、最多2位小数的普通十进制，并满足现有安全分值和无损保存能力。非法输入保留金额、原因及就近错误，修正后可提交；取消忽略隐藏金额。H21只约束新申请，不清洗旧记录，输入合法仍须通过原主管金额勾稽审核。改进与验证边界见 [第10轮材料](docs/iterations/round-10.md)。

第11轮体验：审批台账显示原申请编号，按真实目标查看关联订单或申请对应的确切单证版本；已处理记录可展开原理由，完整意见继续保留。主管处理是主操作，查看是次级入口；本人范围、财务空态与管理员拒权保留。关联缺失或当前路由无法定位时显示待核对，历史通过不保证当前可导出。改进与验证边界见 [第11轮材料](docs/iterations/round-11.md)。

第12轮体验：单证员工作台和铃铛只列当前有编辑资格、能唯一定位的版本；历史退回/订单暂停记录仍可在参考区查阅原版本与原因。取消申请暂停待办，原主管退回可恢复；全版本统计明确含历史，0项不代表全部业务完成。零提醒入口可键盘定位参考区，跨页仍沿原输入离开保护。H23不是个人分派或后台通知，详见[第12轮材料](docs/iterations/round-12.md)。

第13轮体验：草稿/制作中横幅仅有当前编辑资格才提示字段可编辑，CI只唛头与备注；退回横幅保原意见姓名日期，当前可办才指导重送，已有重制申请提示勿重复提交。历史/暂停/只读角色显示原阻断原因，原待审/通过/未知表达和操作区保留。H24仅作业指导，非新权限制度，详见[第13轮材料](docs/iterations/round-13.md)。

第14轮体验：CI编辑按钮、工具栏、进入反馈、受控修订按钮/ARIA与确认只描述实际唛头与备注，PL包含包装；原源版本/快照沿用/原版保留/重新审核及资格控件不变。H25只统一说明，不新增CI包装字段，详见[第14轮材料](docs/iterations/round-14.md)。

### 真实浏览器回归

`scripts/verify-browser.mjs`仅在已安装、允许使用的 Ego Browser CLI 中运行。操作者按浏览器工作流新建或继续本次目标的专用空间，并明确允许丢弃`p1`页面的内存数据；不能把用户正在编辑的页面当测试fixture。脚本只连接显式存在、agent拥有的空间，不创建、认领、接管或结束空间。普通Node导入不执行真实浏览器。

在正式克隆目录执行，替换当前空间ID与本次从未使用的绝对报告路径（例中占位符不能直接运行）：

```bash
ego-browser nodejs -e 'Object.assign(globalThis, {
  TRADE_QA_SPACE: <当前空间ID>, TRADE_QA_PAGE: "p1", TRADE_QA_DISPOSABLE: 1,
  TRADE_QA_BASE: "http://127.0.0.1:8014/index.html",
  TRADE_QA_REPORT: "<绝对路径/本次新报告.json>"
}); await import("file:///Users/airuquan/foreign-trade-independent-websit/trade-doc-demo/scripts/verify-browser.mjs");'
```

上例`import`路径也须对应本机正式克隆。当前Ego CLI不会向脚本透传调用shell的自定义环境变量，实际调用须在`-e`内显式赋予`globalThis`，不能只写shell前缀变量。基址必须是显式端口的loopback HTTP `index.html`；先确认预览服务确实服务此源码，脚本不会启动服务器。默认依次执行`matrix,business,quality`，可在上述对象加`TRADE_QA_PHASES: "quality"`等选单阶段，每次必须另用新报告。矩阵目标为五岗100访问／300桌面尺寸观察；同单连续链8组含独立545USD金额真值、双单送审审批、先收100再收445与V2保V1；质量阶段覆盖目录临界点、地图、动效、搜索／焦点、输入／页签、修订、收款、Toast、禁用岗位登录及短程诊断。分阶段刷新隔离，连续同单链不刷新；不用`App.rerender()`强制掩盖路由问题。

缺配置／空间不可用、断言失败与工具错误分别报告；已存在的报告拒绝覆盖。逐场景保存进展，未执行阶段不冒充通过，清理错误与原失败同时保留。结束时仅复原本轮设置的目标页诊断覆盖并刷新丢弃合成内存；用户接管／空间停用时停止页面操作。调用者仍须在本次目标成功后按工作流`finish()`一次；不要复用已结束的历史空间ID。

真实浏览器结果与Node工具模拟报告分开。file协议受当前工具策略限制时保持未验证，不换工具绕过；本轮不做跨引擎、读屏或容量认证。当前说明及结果见[第2轮工程验收改进](docs/reviews/2026-10-19-round-02/README.md)，旧报告按原轮次保留。
