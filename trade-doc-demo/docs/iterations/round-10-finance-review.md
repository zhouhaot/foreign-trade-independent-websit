# 第 10 轮：独立财务数值只读复核

日期：2026-10-07。复核对象为中枢已选 H21 后的当前 OC worker 实现。第 10 轮规划记载实施基线为 `4e71de03c980fdd15b25bfdce699512ee8111fc5`；本文记录当前源码/隔离运行，不代替后续冻码、浏览器、UI、综合审查或 Git 回执。

权限范围：本 agent 只读 `views-sales`、`views-fin`、共享数值工具、Mock 与现有/新测试；仅拥有本文。未修改业务源码、Mock、旧脚本或进行中的 worker 新脚本，未安装依赖/执行 Git 写操作。

## 复核结论

当前 H21 实现沿用 `U.decimalInput(raw, '变更后订单金额')` 的普通正十进制、至少 0.01、最多两位、安全整数分与 Number 无损往返口径。通过后的 `value` 同时用于新 `targetAmount` 与申请标题；没有另造解析/舍入方案，也没有把标题两位显示当作原输入合法依据。

仅新改价分支校验。取消分支初始 `requestedAmount = null`，隐藏金额不解析；原 `priorOrderStatus`、取消申请中暂停与后续主管处理/历史保留照旧。财务 `prepareRepricing`、utils 与 Mock 在本次复核时点的 Git 差异为空；已收下限、分币、整数数量与等比两位单价候选仍是原主管规则。

**未发现本次 H21 财务范围内的阻断问题。数值合法的申请仍可能被原主管审核拒绝。** 此结论限定当前数值入口及相邻审批/取消行为，不代表第 10 轮全部通过。

## 独立实际证据

独立运行终端临时 Node 隔离程序，加载实际 views-sales/views-fin/utils/app、现有最小 DOM fixture、真实动作、原 Promise/短定时器，没有覆盖原加载/审批函数为人为成功。共 **18 场景 PASS**，并非 worker 专用脚本计数。

| 场景 | 实际观察与断言 |
| --- | --- |
| 9 个旧非法目标：`Infinity`、`NaN`、字符串 `1e3`、`0x10`、数值 `27305.501`、字符串 `24000.001`、`9007199254740991.99`、0、-1 | 既有 AP20260903 的目标在 fixture 中设置后，实际点击主管通过，全部拒绝且仍待处理。完整 MOCK、原目标实际值/类型、原 title、订单日志/单证 history/快照/收款不变；错误为原「目标金额」原因。非有限数用显式序列化标识并 `Object.is` 核对，避免把 JSON 的 Infinity→null 当作原值 |
| 已收下限 | 14,075 USD 目标、fixture 同币种已收 15,000 USD，原审批拒绝，完整 MOCK 不变 |
| 分币 | fixture 为 SO5 添加一条 EUR 收款，USD 改价不得合并；原不同币种错误、完整 MOCK 不变 |
| 整数数量 | fixture SO5 第一行数量 0.5，原改价算法要求正整数，未因 H21 输入口径改变；完整 MOCK 不变 |
| 等比两位单价候选 | 原 AP20260903 目标 27,305.50 USD、候选差 20.50 USD，仍拒绝且不偷偷调整订单/申请 |
| 新合法申请 0.01 USD | 实际 OC 保存为 0.01、待处理，旧申请数组逐字保留；主管原已收下限拒绝，title/目标/全业务不变 |
| 新合法申请 24,000.00 USD | OC 保存为 24,000、title 来自同一候选，旧申请数组保留；主管原两位候选不能命中该目标，仍拒绝，不能说合法输入即可批准 |
| 新合法申请 12,050.00 USD | OC 仅新增待处理申请；主管按原勾稽成功，SO1 总额为 12,050 USD，原收款 12,000 USD 与全部历史单证/快照不改，title 保留。是既有可实现候选，不是新批准算法 |
| 2 个取消隐藏值：`Infinity`、`24000.001` | 实际切取消并提交合法原因，targetAmount=null、priorOrderStatus=执行中、订单变取消申请中；旧申请、历史单证/快照与收款逐字保留，没有登记退款 |

临时程序终端结果：`PASS independent finance: 18 real action/Promise DOM cases; old invalid targets/title/history unchanged; original floor/FX/integer/rounding rules; legal request not automatic approval; hidden cancellation amount ignored (Node only)`。

隔离非法目标与收款/数量变动只用于 fixture 反例，不改 Mock 源码或用户会话。已有被旧入口转换成规范 Number 的值无法凭当前数值还原原先指数/十六进制原文；本轮没有对其做历史猜测/清洗，也不把这种信息丢失说成主管能恢复。

## 相邻独立运行

- `verify-repricing.cjs` PASS：原有限/精度/金额勾稽、分币/已收下限、角色/自审、重复、状态和延迟绑定。
- `verify-cancellation.cjs` PASS：取消与重制原业务/历史/快照、延迟与重复决定。
- `verify-payments-contract.cjs` **71 场景 PASS**：既有收款契约不变。
- 当前 `verify-change-request-amount.cjs` 独立运行 **58 场景 PASS**，语法检查通过；读取并运行完整当前版本，没有覆盖 worker 进行中的文件。其初值/无损与 H20 范围为 worker 证明，与以上临时 18 场景分别记录，不重复计数。
- `git diff --numstat -- js/views-fin.js js/utils.js js/mock-data.js` 无输出，核对这些财务/工具/数据源文件本轮当前无差异。这是本次只读时点证据，不预写未来不变。

## 边界与后续

H21 没有在申请阶段新增退款、汇率、低于已收禁止提交或企业数值上限制度；主管既有能力另行核对。取消隐藏金额忽略不等于取消资料/历史；真实成功只是原流程允许的状态变化。

本 agent 未执行原生 UI/键盘/读屏、跨浏览器、file://、银行/财务服务器事务、正式身份、签署/PDF、NAS 或持久化。当前源码与 Node 结果不能替代中枢两轮 UI/独立综合复审、整轮验证与 GitHub 同步；这些尚待实际完成后另记。复核完成后退出，释放协作 slot。
