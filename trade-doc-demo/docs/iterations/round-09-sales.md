# 第 9 轮：客户确认与订单变更弹窗的填写连续性

日期：2026-10-07。开工基线为中枢已正常推送并核验的 `d03c9a055ec10c1bf0171669ce0d15a90d820e01`。销售 worker 负责 `js/views-sales.js`、专用 `verify-sales-modal-drafts.cjs` 与本说明；经中枢逐文件授权，另有限调整 `verify-change-request.cjs`、`verify-quotation-contract.cjs`、`verify-context-navigation.cjs` 的 H20 预期。共享工具、App、CSS、Mock、交接、浏览器验证及 GitHub 回执由中枢统筹，本说明不宣称整轮封版或 UI 已验收。

## 原问题与实际红灯

在真实销售动作、原 `U.openModal`、原事件委托与原 Promise/loading 中执行最小 DOM fixture，修改客户确认说明后点 X，原窗直接被移除；订单变更合法提交已经写入后，另开新窗，原 480ms 成功回调无来源地 `U.closeModal()` 会关掉新窗。专用脚本实现前的 `--probe-old` 实际记录这两项 RED，退出码 1。该参数现在运行当前源码，不能当作仍加载旧基线；没有把客户确认原有业务内容/context 防漂移逻辑当作新修复。

独立综合审查发现处理中失败后的快速重试锁死：第一回调拒绝并释放 modal busy、恢复输入，但原按钮仍有 450ms `is-loading`；第二次激活又锁住原控件，`U.withLoading` 因按钮 loading 直接返回，未运行 `finally`，关闭永远显示处理中。专用 `--probe-retry` 使用未替换的真实 `U.withLoading`，仅将 VM timer 接回 Node 原 timer，待两个微任务后再激活、520ms 后检查，实际 RED 为 `oc: loading期间快速重试不得永久禁用输入`。两 handler 首行防 loading 后 QC/OC 均 GREEN。这里是程序化激活与真实 timer 证据，不是原生键盘结论。

补查发现 OC 原 guard 只核 actor 引用/角色，不核同对象的姓名变化。同 actor 在提交后的 Promise 前改名，原逻辑仍新增申请和留痕。新增全 MOCK 对照先 RED（`oc/actor-fields`），开窗捕获 actor 内容、副本重查后 GREEN。QC 原 `quoteContext` 已有同等保护，保留原实现。

## H20 范围与假设

仅客户确认 `qc-form` 和订单变更 `oc-form` 接入本轮 modal 草稿 API。输入相对本窗初始值未变化，用户关闭正常执行；有变化则在同一 overlay 内显示继续/放弃选择，源 form 和原节点不重建。明确放弃才关闭，继续返回源窗。处理中拒绝普通关闭，成功业务 commit 后只清本次 modal 草稿，再关本次来源窗；不清无关页面草稿。

点击到异步写入之间，原来源窗、原字段节点和原 raw 值必须一致；有效 A 变有效 B 也不能静默提交 A。旧窗被新窗替换后，旧候选拒绝提交，旧错误/成功反馈不串写新窗。已经合法 commit 的申请不会因后来开新窗撤回，480ms 回调只对原当前窗关闭和反馈。

这是当前内存 Demo 的可撤销交互契约，无本地持久化、后端并发锁、跨会话恢复或正式身份认证。没扩展到生成订单确认、其它编辑窗或全站强制关闭；共享无参数 `U.closeModal()` 的 legacy 行为未由 worker 改写。

## 每项改进的前后与验证

| 改进 | 之前 | 之后 | 实际证据 |
| --- | --- | --- | --- |
| 客户确认草稿绑定 | X/取消/Esc 可直接丢未登记日期/说明 | 绑定原 `qc-date`、`qc-remark`，脏关闭交共享同 DOM 保护 | 三入口继续/明确放弃、原节点和值/焦点不变，全 MOCK 零写 |
| 订单变更草稿绑定 | 类型/金额/理由填写不受关闭保护 | 绑定原三个可编辑节点，包括切换后隐藏的金额原值 | 三入口保护、未改值关闭、放弃全 MOCK 零写 |
| 原控件身份检查 | 点击和回调可回读已变化的控件 | 入口检查原节点存在/连接/同 id，回调检查同节点及 raw 值 | 五字段入口缺失与同 id 同值替换节点拒绝，全 MOCK 零写 |
| 客户确认输入候选一致 | 合法点击后修改说明可能提交旧捕获值 | 原日期/说明 raw 漂移拒绝，并在源窗保留当前填写 | 两字段合法 A→B，原日期验证/字段 ARIA 错误保留 |
| 订单变更输入候选一致 | 原 type/amount/reason captured A 即使后来漂移仍提交 | 三字段 raw 漂移拒绝，原完整候选只有校验后提交 | 三字段 A→B、Infinity/跨类型漂移均无写/无假成功 |
| 同 tick 与处理中保护 | 按钮 loading 与业务 busy 生命周期不一致 | 先拒 loading 激活，再取得来源 modal busy，禁用原可编辑节点 | 重复提交只一笔；处理中关闭拒绝；失败恢复原 disabled |
| 快速失败重试修复 | loading 期间重试可永锁输入/关闭 | 两 handler 任何清错/busy/禁用之前先检查 loading | 原 450ms timer，两个表单 520ms 后可继续输入与明确关闭 |
| 开窗业务上下文绑定 | OC 同 actor 改名可影响留痕 | OC 增 actorContent；保原角色/订单对象/状态/币种检查，QC 原 context 保留 | actor 引用/内容、对象替换、状态变化与旧25案例 |
| 源窗成功关闭 | OC 旧480ms回调会关闭新窗 | 持有来源 overlay，成功延时仍检查 current，只 strict close 来源窗 | 提交前替换拒绝、commit 后另开窗完整保留 |
| 成功草稿语义 | 客户确认调用页面 markDraftClean | 成功仅 `markModalDraftClean(overlay)`，页面 draft 不清 | 专用 pageClean=0；context 独立核对 source clean 参数 |
| 字段可访问关联 | OC 三个手写 label 没有 for | 给类型/金额/原因补对应 for；新增源窗 `oc-feedback` role=alert | 源窗漂移错误；原字段 error/ARIA 继续填写不丢 |

没有修改金额精度制度、生成订单业务、审批权、取消历史单证或收款规则；改价仍沿用原校验，取消仍记录 `priorOrderStatus` 并保留历史单证/快照与收款。QC 原 `U.formItem` 已生成 label-for，不重复修改。

## 旧测试预期的显式调整

这三处按中枢授权调整的是明确变化的 H20 行为，不能声称原全部断言逐字未动：

1. `verify-change-request.cjs`：有填写的取消现在先请求关闭，再显式点放弃；保全 MOCK 零写、无成功及最终 null。末段点击后改 type/amount/reason，原“提交 captured A”改为全 MOCK 不写、保源当前输入、无成功；角色/对象/币种/取消前态/双窗/同类型待处理的原核心检查保留。
2. `verify-quotation-contract.cjs`：客户确认点击前的脏关闭需要明确放弃；点击后的 busy close 拒绝，并仍只登记一次。USD/EUR 日期/说明漂移先全 MOCK 拒绝，再重新打开合法确认，继续原生成订单数量、分币金额、币种、来源快照与防重断言。生成订单 `afterClick` 取消的原 no-write 未改，未将它接入新 editable modal 契约。
3. `verify-context-navigation.cjs`：客户确认成功的页面序列由 `['clean','rerender']` 改为 `['rerender']`；独立包装真实 modal clean API，断言成功仅对本次 source overlay 清理，失败/取消零次。生成订单原页面 clean 与其余导航/角色/来源断言保留。

## 实际验证与边界

当前 worker 验证 exit 0：

| 脚本/检查 | 结果 | 方法 |
| --- | --- | --- |
| `verify-sales-modal-drafts.cjs` | 40 场景 PASS | 实际 sales/app/U 动作、最小 DOM、Promise；两例原 timer 快速重试 |
| `verify-quotation-contract.cjs` | 103 PASS | 原报价/生成订单与有限 H20 预期，真实输入/submit/modal/Promise |
| `verify-change-request.cjs` | 25 PASS | 原 pending/角色/订单/金额/取消留痕等全 MOCK 原子拒绝 |
| `verify-context-navigation.cjs` | 194 来源/岗位链接 + 15 集成 PASS | source modal clean 与独立页面 dirty/导航边界 |
| `verify-draft-adapters.cjs` | 17 PASS | 既有事件委托、表单、局部 DOM/输入/错误保留 |
| `verify-views.cjs` | 100 岗位/视图组合与既有核心动作 PASS | Node VM；包括角色、受控修订、金额、单证编辑与延迟变化 |
| `node --check js/views-sales.js` | PASS | 语法检查 |

专用脚本完整 MOCK 对照以测试施加的外部变化后、业务 Promise 写入前为比较基线；不把测试故意修改的用户/订单内容错误地算作业务零写。提交成功的正例独立检查结果与一次提交；失败/漂移拒绝无假成功。仅当真实 commit 完成，才标记来源 modal clean。

这些结果不能替代浏览器布局、原生键盘/读屏、正式审核、真实权限或内网部署验证。实际两宽、Esc/Tab、错误可读性和 UI 复审由中枢另外记录；worker 不做 Git/push，也不提前声称 UI Ship。
