# 贸易协同 · 外贸订单与单证管理

现代化桌面前端 Demo，2026-10-07 已完成 A 方案及第3轮单证作业区/最新版本与取消资格；每轮改进、验证、复盘见 `docs/iterations/`。

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
```

前四个脚本检查资源/样例金额、100组角色视图与关键回调、登录/退出。其余检查订单工作区、改价原子性、交易快照与阶段、单证异步资格/取消/局部输入保护/申请防重复。共12组，不代替浏览器；各轮实际覆盖见迭代报告。

`scripts/verify-browser.mjs` 是 Ego Browser 环境下的浏览器回归脚本，需由操作者提供当前授权的 TaskSpace ID，不会自行创建/接管浏览器空间。验证覆盖与已知边界见 `HANDOFF.md` 的 2026-10-04 交接记录。
