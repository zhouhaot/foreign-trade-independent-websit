# 贸易协同 · 外贸订单与单证管理

现代化桌面前端 Demo，2026-10-07 已完成 A 方案及第5轮当前作业输入保护、岗位上下文与导航打磨；每轮改进、验证、复盘见 `docs/iterations/`。

## 在另一台电脑继续

对应仓库：[zhouhaot/foreign-trade-independent-websit](https://github.com/zhouhaot/foreign-trade-independent-websit)，分支 `main`。本 Demo 位于仓库的 `trade-doc-demo/` 子目录；根目录的早期需求与架构草案原样保留，不代表已批准实施。

```sh
git clone https://github.com/zhouhaot/foreign-trade-independent-websit.git
cd foreign-trade-independent-websit/trade-doc-demo
```

用编辑器或 Codex 打开这个 `trade-doc-demo` 目录，先读 `AGENTS.md` → `HANDOFF.md` → `PRODUCT.md`，再继续开发。已有克隆且工作区干净时可在仓库内执行 `git pull --ff-only`；有未提交修改时先审查并保留，不直接覆盖。

- 当前是 A 浅色现代 UI；顶栏角色只读，切换身份需退出后重新登录。
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

浏览器访问 `http://127.0.0.1:8000/index.html#/login`。演示账号、密码已填好，选择角色后点击“进入工作台”。桌面设计主要支持 1280px 及以上宽度。

## 本版体验

- 双栏登录与角色下拉选择（角色 · 姓名），清晰呈现报价、订单、单证和收款的业务关系。
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
| 单证员 | 单证列表 → 编辑制作中 CI / 退回 PL → 送审；已通过版本 → 受控修订 |
| 业务主管 | 待审单证 → 审核意见 → 通过 / 退回；统计分析按币种查看 |
| 财务人员 | 收款与应收 → 选择订单 → 登记收款 → 查看已收、未收更新 |
| 系统管理员 | 用户管理、角色权限、基础字典；无业务审批权 |

顶栏角色只读。体验其他账号时，先点“退出登录”并确认，再在登录页选择演示角色后重新登录。取消退出会保留当前会话；确认退出清除会话和未保存的页面状态，但已提交的演示数据仍保留到刷新前。订单只能由已确认报价生成；已审核单证修订生成新版本，保留原版本。

## 演示边界

这是完整可运行的**静态前端演示项目**，不是已接入生产数据的业务系统：

- 登录不校验真实账号；角色权限用于展示流程，不构成服务端安全边界。
- 业务修改仅发生在内存，刷新后还原样例；登录身份有本地会话记忆。
- 单证“导出”是演示反馈，不生成真实 PDF 文件。
- 新建客户、部分系统维护等原有占位入口会明确提示未开放。
- 尚未接入 Spring Boot、数据库、真实审批通知或组织账号；不适合录入真实敏感业务数据。
- 不包含新增单证种类、未确认的数据范围规则或移动端正式适配。

后续按真实落地标准规划，已确认面向本公司内部约 15 人、公司内网服务器或 NAS。架构与数据存储尚在讨论；本目录当前仍是前端 Demo，以上重新登录流程不等同于后端身份验证。

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
```

前四个脚本检查资源/样例金额、100组角色视图与关键回调、登录/退出。其余检查订单工作区、改价/快照/单证与取消、输入/历史保护、岗位上下文、申请防重复与初始金额、数字/报价/收款/客户维护/询盘/包装/纸张审核及三业务弹窗关闭契约。共27组，不代替浏览器；各轮实际覆盖见迭代报告。

第6轮体验：业务员在客户详情维护资料，错误保留输入；询盘 INQ2026006 是明确合成需求，可核对参考545USD并生成一次报价草稿，再编辑实际价格与条款。原询盘已有报价只接续查看；草稿没有登记客户确认或直接生成订单。改进与验证边界见 [第6轮材料](docs/iterations/round-06.md)。

第7轮体验：单证员进入退回PL2026004编辑包装。普通正整数箱数、明确KG/KGS重量和CBM体积可保存；空毛重等资料显示待补，送审须五项完整且毛重不小于净重。度量最多3位为H18原型假设，合法原文保留；确认窗口核对全部候选，修订继承包装仍需核对实际货物。CI仅编辑唛头与备注，不受隐藏包装门槛。改进与验证边界见 [第7轮材料](docs/iterations/round-07.md)。

第8轮体验：CI/PL纸张审核栏按当前查看版本区分未送审、等待本次审核、退回未通过；该版本已通过才显示其批准人。原退回记录、旧通过姓名/章和交易快照保留，当前导出资格独立；缺姓名/日期只提示待核对，模板签字线不代表实际签署。改进与验证边界见 [第8轮材料](docs/iterations/round-08.md)。

第9轮体验：客户确认、订单变更或主管处理弹窗填写后误关，可选择继续填写或明确放弃；清洁直接关闭。继续保原内容、错误、焦点和滚动，处理中等待结果，成功仅关闭源窗口。H20不代表自动保存或撤回已提交业务，其它弹窗／页面导航／刷新不在此保证内。改进与实际边界见 [第9轮材料](docs/iterations/round-09.md)。

第10轮体验：订单变更的改价金额只接受至少0.01、最多2位小数的普通十进制，并满足现有安全分值和无损保存能力。非法输入保留金额、原因及就近错误，修正后可提交；取消忽略隐藏金额。H21只约束新申请，不清洗旧记录，输入合法仍须通过原主管金额勾稽审核。改进与验证边界见 [第10轮材料](docs/iterations/round-10.md)。

`scripts/verify-browser.mjs` 是 Ego Browser 环境下的浏览器回归脚本，需由操作者提供当前授权的 TaskSpace ID，不会自行创建/接管浏览器空间。验证覆盖与已知边界见 `HANDOFF.md` 的 2026-10-04 交接记录。
