# 历史归档门禁与当前回归分离

2026-10-19。作者实施基线 `50328f7dacf31a7d96187e0091ca364df07f31dd`。仅改四个指定验证器、新增共用 `scripts/history-gate.cjs` 与自测 `scripts/verify-history-gates.cjs`；没有修改业务运行代码、Mock、旧归档或安装依赖。主控负责 HANDOFF、全套回归及独立复审，本记录不是生产验收。

## 最终行为与选择

四个验证器的原调用不变，默认运行当前源码的实际 Views/Actions、角色、金额／模型只读及控制修订等断言，完全不调用 Git。成功输出 `PASS CURRENT` 和 `ARCHIVE NOT_REQUESTED`，并给出独立历史门禁命令。未请求归档不称归档通过。

显式追加 `--archive` 时，先后执行当前场景和全部既有归档断言，最终才输出 `PASS ARCHIVE`。保留原 `--probe-original`／`--red` 分支及其预期失败语义；这些旧探针不是完整归档入口，不与 `--archive` 混用。

采用显式参数，没有引入归档源码 fixture。原 Git 对象仍是权威历史，避免把多份旧 JS、相应依赖和校验清单变成新的维护对象。代价是源码包和浅克隆可以运行当前回归，但独立归档门禁必须有列出的本地对象；缺失时明确阻塞，调用者自行恢复历史，本实现不会自动 fetch。以后若需要脱离 Git 的归档交付，需另外确定可信校验来源、依赖闭包及更新规则，本轮没有降低为未经验证的 fixture。

| 情况 | 输出与退出码 |
|---|---|
| 当前门禁通过，未请求归档 | `PASS CURRENT` + `ARCHIVE NOT_REQUESTED`；0 |
| 请求归档且全部断言通过 | 当前结果 + `PASS ARCHIVE`；0 |
| Git 不可用／中断、非 Git 副本或必需对象缺失 | `BLOCKED MISSING_HISTORY`；2；不输出归档 PASS |
| 当前或历史断言失败 | `ASSERTION_FAIL`；1；不输出相应通过 |

Git 子进程设 30 秒超时、8MiB 输出上限。错误信息只给对象标识和环境原因，不打印 Git 内容或认证信息；不同环境故障均为归档无法判定，不被解释为产品失败。

## 保留的历史强断言

| 验证器 | `--archive` 保留内容 | 必需历史 |
|---|---|---|
| approval-context | H22 Actions 后段与付款／金额前段逐字相等，换行归一；新增两个切片 marker 各恰好出现一次以防 `slice(-1)` 假相等 | d9b1748 views-fin；f8643db views-fin |
| document-dashboard | 原四岗位整页 HTML 精确比较，仅允许已批准财务月份标签的一个槽位 | 77deae8 utils/views-core；f8643db mock-data/utils/views-core |
| document-status-guidance | 逐场景除横幅／精确 H25 槽位外的全文、原退回事实前缀、通过／待审／未知分支原 HTML；R13 仅两横幅分支、H25 反演后全文精确比较 | 58a6582/ac8d5a9/f8643db views-docs |
| document-action-guidance | H25 三个 HTML 槽位、helper／五面文案的精确反演全文、追加写逻辑及受控新状态变异防吞断言 | ac8d5a9/f8643db views-docs |

历史对象的完整 SHA 仍写在相应检查器及自测清单中。既有 normalize 函数、白名单防吞测试和归档全文等式未被泛化或删除。status 默认回归中的退回前缀与通过／待审／未知分支改为按独立完整事实构造期望；`--archive` 额外保留原历史 HTML 相等检查。当前回归计数为 66 / 18 / 34 / 26；归档计数不混入 `PASS CURRENT` 数量。

## 作者限定验证

已实际运行以下四个默认命令及各自追加 `--archive`，全部退出 0：

```sh
node scripts/verify-approval-context.cjs
node scripts/verify-document-dashboard.cjs
node scripts/verify-document-status-guidance.cjs
node scripts/verify-document-action-guidance.cjs
```

门禁自测入口：

```sh
node scripts/verify-history-gates.cjs
node scripts/verify-history-gates.cjs --archive
```

默认自测 12 场景；`--archive` 共 20 场景，均已通过。自测复制六个检查器／依赖和本地 JS 到独立系统临时目录，实际确认它不在任何 Git checkout 内；结束时仅清理本次创建的唯一临时目录。所有破坏只在子进程读取代理中进行，不写正式源码或历史对象：

- 4 个真实无 `.git` 副本默认执行：均有当前 JS 读取、零 Git 调用、实际断言成功。
- 4 个真实无 `.git` 副本请求归档：实际 Git 读取失败，均退出 2 且有 `BLOCKED MISSING_HISTORY`，无归档 PASS。
- 4 个无 Git 副本当前源码变异：分别改关联订单文案、工作台操作、只读指导、CI 实际字段文案，均退出 1 且有 `ASSERTION_FAIL`；强制证明变异已触达且零 Git 调用。
- 4 个完整归档运行：均退出 0，追踪并精确匹配每个验证器原有全部 Git 依赖对象集合。
- 4 个归档篡改：对发布历史源码追加变化，工作台改实际归档 HTML，其余触发源全文比较，均退出 1 且无归档 PASS。

六份修改／新增 JS 的 `node --check`、限定差异空白检查通过。原业务 JS、入口引用和金额实现未修改，未执行浏览器、未跑全套 42 脚本、未创建真正浅克隆；浅克隆对象缺失走与其他对象缺失相同的门禁分支，但不冒称本轮实建浅克隆验收。全套回归与非作者审查交主控收口。

作者原始命令、退出码、stdout 与最终六文件 SHA-256 在 [evidence/history-author-results.json](evidence/history-author-results.json)。自测初期曾因 macOS 临时目录符号路径和 `require(entry)` 未触发 `require.main` 入口而被反空跑断言拒绝；现分别通过 realpath 和真实 main Module 执行修正，保留非零读取、变异触达及非成功退出断言。两次属于验证执行器方法错误，没有改产品来适配测试，过程错误与最终结果在证据中分列。
