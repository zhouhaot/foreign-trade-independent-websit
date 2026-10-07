# 第 10 轮：新改价申请的初始金额契约

日期：2026-10-07。实施基线 `4e71de03c980fdd15b25bfdce699512ee8111fc5` 为中枢已正常推送并回读的第 9 轮回执。销售 worker 仅修改 `js/views-sales.js` 的 `order-apply-change` 邻近金额输入、候选与反馈，新增 `scripts/verify-change-request-amount.cjs` 和本说明。没有改共享工具、App、财务、Mock、旧测试、CSS、Git 或 HANDOFF；实际 UI、独立复审、总材料和推送由中枢记录。

## 实际 RED：首次非法填写仍进入审批队列

修复前用当前真实 `Actions['order-apply-change']`、原共享 modal/loading/Promise 和 app 委托运行 `node scripts/verify-change-request-amount.cjs --probe-initial`。每例只重新加载原样 Mock、选择业务员及 SO2026001，首次填金额与原因，点击后不改输入。没有删除既有审批、改变订单状态或伪造价格让申请成功。实际退出码 1，七例都新增一笔待处理改价申请并关闭原窗：

| 初值原文 | 实际写入 targetAmount | 实际标题中的金额 | 新增/关窗 |
| --- | --- | --- | --- |
| `1e3` | `1000` | `1,000.00 USD` | 1 笔 / true |
| `2.4e4` | `24000` | `24,000.00 USD` | 1 笔 / true |
| `0x10` | `16` | `16.00 USD` | 1 笔 / true |
| `Infinity` | `Infinity` | `∞ USD` | 1 笔 / true |
| `1e309` | `Infinity` | `∞ USD` | 1 笔 / true |
| `24000.001` | `24000.001` | `24,000.00 USD` | 1 笔 / true |
| `9007199254740991.99` | `9007199254740992` | `9,007,199,254,740,992.00 USD` | 1 笔 / true |

根因是原入口用通用 `U.validate` 的 `number/min` 与 `Number(raw)`；这只能挡非数字和过小值，不能守普通十进制、有限值、两位、安全分和无损保存。H20 检查点击后的输入是否漂移，没有判断首次输入是否合法；两种问题的测试不能互相替代。

修复后同一 `--probe-initial` 输出 `PASS: 7 initial illegal change-request writes refused (actual current Actions)`、exit 0；完整专项 58 场景也 PASS。该参数读取当前源码，不保留/假装仍执行旧实现，前述表是本轮实际修复前输出。

## H21：沿现有能力明确新申请输入

中枢选定规划文件的可撤销 H21：新改价目标直接复用既有 `U.decimalInput(raw, '变更后订单金额')`，只接受普通正十进制、至少 0.01、最多两位小数，分值为安全整数，保存为 Number 后能无损往返。外侧空格与前导零沿 helper 既有行为；不自动识别逗号、指数、十六进制、加号或地区小数分隔符。合法候选的 `value` 存入原 number 类型 `targetAmount`，不是用格式化/舍入挽救不合法原文。

H21 只约束新改价申请。取消隐藏金额不解析，`targetAmount` 仍 null；旧申请/标题/历史不迁移或清洗，主管审批算法、已收下限和原金额勾稽不改。0.01 是合法输入而非保证能获批，审批可行性仍按原财务流程决定。企业正式金额口径仍待确认；若后续撤销假设，调整后续入口与测试，不回写历史申请、单证或快照。

## 逐项前后说明

| 改进 | 之前 | 之后 | 文件与实际验证 |
| --- | --- | --- | --- |
| 初始改价金额契约 | 指数/hex/Infinity/超两位或不安全金额可写待处理申请 | 改价分支直接使用已有 decimalInput，不扩通用 validate、不重复造 parser | 七原反例 + 空/零/负零/格式/边界，31 初值拒绝全 MOCK 不变 |
| 候选存值与标题一致 | Number(raw) 可静默改原表示，标题两位隐藏超精度 | 保存校验返回 value，标题使用同一合法候选；旧数据原样 | 8 合法正例用独立 BigInt 分值和标题对照，旧对象身份/全部旧审批不变 |
| 就近错误与可继续修正 | 部分异常被程序关窗，无法在原字段修正 | 非法在 busy/loading 前 fieldError 并聚焦金额，原金额/原因不改，无业务写/clean/成功反馈 | aria-invalid、help/error描述、focus、立即可关闭保护；原节点继续后改正成功 |
| 可发现的金额提示 | 只有当前金额，无初始填写口径 | 原 text 字段保留，加 inputmode decimal 与 oc-amount-help；提示至少0.01/最多2位/例24000.00及不接受指数hex | 原 label-for不变；错误清除不丢help关联，UI布局另由中枢实测 |
| 切换取消后的错误清理 | 未来金额错误可能在隐藏字段留下误导状态 | 切取消仅清金额容器错误，不改raw；切回改价按仍保存的raw重新校验 | 非法隐藏金额7例仍可合法取消；切回重现错误且全 MOCK 零写 |
| 初值与异步测试分开 | H20后改值拒绝容易被误当成初值契约已守住 | 新脚本分别验证初值/候选正确与后续稳定性，原40/25/45相邻回归保留 | raw/节点/actor内容/对象/状态/币种/source延迟8例与旧480ms新窗隔离 |

原原因必填、同类待处理申请拒绝、角色与 live 订单资格、actorContent、原节点/raw绑定、同 tick busy、450ms loading首守卫、480ms来源关闭均保留。初值失败不会先禁用输入或占 busy；取消申请继续记录原 `priorOrderStatus`、暂停订单，保原单证状态/交易快照/审核记录与收款。本轮没有编辑报价确认或生成订单代码。

## 专项矩阵与实际 GREEN

58 场景由真实 sales/app/shared API 加最小 DOM 运行，分类为：31 非法初值、8 合法值、1 错误保护后修正、1 原因缺失、7 非法隐藏金额取消、1 类型切换、8 H20延迟漂移、1 已commit后旧回调遇新窗。

安全边界另做明确区分：`90071992547409.90` 的分值 9007199254740990 安全且可无损保存，合法；`.91` 的分值仍为安全整数，但 Number 不能无损往返，报“可无损保存”；`.92` 先越过安全整数分范围，报“安全计算”。没有把 Number 保存能力宣称为企业业务金额上限。合法原文的目标金额和两位标题用独立 BigInt 从分值生成对照，不以生产 helper 自己作 oracle。

失败矩阵完整 MOCK 对照以异步前测试施加的外部变化后为基线，证明动作不再额外写入；正常正例只新增一笔申请和一条日志，再移除这两个新增项与原全 MOCK 比较，订单/单证/收款与旧申请全保持。每个非法初值还核无loading、输入未禁用、busy未占用、原字段/原因/焦点/描述和无clean/假成功。新脚本不修改 Mock 源码，测试数据只在隔离 VM 内。

实际执行均 exit 0：

| 检查 | 当前结果 |
| --- | --- |
| `verify-change-request-amount.cjs` | 58 PASS |
| `verify-sales-modal-drafts.cjs` | 40 PASS，含原450ms真实timer快速重试 |
| `verify-change-request.cjs` | 25 PASS，旧脚本未修改 |
| `verify-modal-drafts.cjs` | 45 PASS，旧脚本未修改 |
| `verify-decimal-contract.cjs` | 两位输入/精确行/溢出/日期/币种/余额 PASS |
| `verify-repricing.cjs` | 原子改价、已收下限、角色、自审、防重与延迟重查 PASS |
| `verify-cancellation.cjs` | 取消/重制、历史保留与延迟guard PASS |
| `verify-quotation-contract.cjs` | 103 PASS，旧脚本未修改 |
| `node --check js/views-sales.js` 与新增脚本 | PASS |

这些是 Node 动作、整数对照与语法证据，不能冒作原生键盘、读屏、浏览器布局或真实后端事务验收。中枢随后验证两宽/字段错误/焦点/Esc保留/合法提交及独立代码复审；没有以本材料宣称 UI Ship、GitHub已推送、正式权限或审批制度成立。
