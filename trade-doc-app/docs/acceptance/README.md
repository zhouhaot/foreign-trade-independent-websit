# 首切片真实验收说明

## 当前结论

首切片的 25 个 `/api/v1` 操作和 16 张业务表已有实现，当前 130 项测试属于单元测试。它们与 lint、类型检查、契约静态检查、构建一样，都不能替代真实 PostgreSQL、浏览器、并发、故障注入和重启验收。

### 本机合成验收结果（2026-10-29）

- 真实统一验收 `runId=672c2b789791` 已执行完成，49/49 项场景为 `PASS`；逐项结果见 [`2026-10-29-slice-01.json`](results/2026-10-29-slice-01.json)。
- 配套执行为 31 项真实 PostgreSQL 数据库集成测试和 1 个真实 Chromium 浏览器主流程，均已通过。
- `RESTART-01` 已实际重启应用和 PostgreSQL，并完成重新登录、业务回读及同键幂等重放；不是以新建连接代替重启。
- `TX-01` 已在五个业务事务的 22 个实际 INSERT/UPDATE 写步骤逐点注入 PostgreSQL 触发器故障，每点均完整回读业务行、状态/快照、关联、幂等和审计，并在移除故障后同键重试成功。

### 本机合成隔离恢复结果（2026-10-29）

- 来源为上述 `runId=b195c4f168cc` 的本机合成验收备份，于 `2026-10-29T08:11:23Z` 恢复到新建空库 `trade_doc_restore_b195_v2`，结果为 `PASS`；备份 SHA256 为 `2ce157aaecab3d1ff23ca2707c68deefb3c1937f7f7a53e5720ecd5599a77a30`。
- `pg_restore --exit-on-error` 实际成功，耗时 106.826 ms；迁移成功，耗时 690.239 ms。`pg_isready` 正常，独立 Next 3102 端口的 `/api/health` 与 `/api/ready` 均实际返回 HTTP 200 和 `{"status":"ok"}`。
- 16 张业务表均查询成功；关键唯一键和外键反例分别被 `product_sku_unique`、`inquiry_line_inquiry_id_inquiry_id_fk` 拒绝，并已验证回滚。恢复后回读为 14 orders、14 versions、28 lines、231 idempotency、229 audits，金额、归属和快照不一致数均为 0。
- 逐项脱敏证据见 [`2026-10-29-restore.json`](results/2026-10-29-restore.json)，不包含密码或连接串。本次 Next 进程已停止，隔离数据库和源备份均保留。

权威清单仍是 [`docs/contracts/slice-01.acceptance.json`](../contracts/slice-01.acceptance.json)：其 49 项场景继续全部为 `PLANNED`，文件总状态继续为 `PLANNED-NOT-EXECUTED`，本次不改写该规划基线；实际执行结果保存在上述证据文件中。49/49 本机合成验收和本机合成隔离恢复均已通过，但不构成生产部署或生产验收；正式生产部署、生产备份和生产恢复仍未执行。

## 环境与安全前提

- 由主控统一准备真实 PostgreSQL、迁移和合成数据，执行人不得把测试连接到生产或其他含真实数据的数据库。
- 只使用契约规定的合成身份、客户、商品和币种，不导入 Demo 或真实经营数据。
- 真实集成和 E2E 默认不启用，必须分别设置 `TRADE_DOC_RUN_DB_TESTS=true`、`TRADE_DOC_RUN_E2E=true`。
- 集成测试还会要求 `TRADE_DOC_ALLOW_TEST_RESET=true`，并清空 16 张业务表；只允许 `trade_doc` 或 `trade_doc_test` 合成库。
- 真实 E2E 和重启脚本只允许 `trade_doc_test`；重启脚本另需 `TRADE_DOC_E2E_RESTART=true`，会重启应用和 Compose 的 `postgres` 服务。
- 不在命令记录、截图、日志、报告或契约 JSON 中写入密码、完整 `DATABASE_URL`、Cookie、令牌或真实业务数据。证据应脱敏并限制访问。

## 标准执行入口

以下均是操作说明，不表示本次已经执行。

### 1. 静态检查与单元测试

```sh
pnpm lint
pnpm typecheck
pnpm test
node scripts/verify-contract.mjs
pnpm build
```

`DATABASE_URL` 只在实际数据库访问、迁移和真实测试运行时需要；`pnpm build` 不需要真实或占位连接。该组命令不产生 49 项真实场景的通过证据。

### 2. 真实 PostgreSQL 集成

```sh
export DATABASE_URL="<synthetic-database-url>"
export TRADE_DOC_RUN_DB_TESTS=true
export TRADE_DOC_ALLOW_TEST_RESET=true
pnpm exec drizzle-kit migrate
pnpm test:integration
unset TRADE_DOC_RUN_DB_TESTS TRADE_DOC_ALLOW_TEST_RESET
```

必须保存实际执行摘要，并将数据库回读、约束拒绝、事务回滚或并发结果映射到具体场景。命令退出码为零但没有目标场景实际运行时，不能记为通过。

### 3. 真实浏览器 E2E

```sh
pnpm exec playwright install chromium
export DATABASE_URL="<synthetic-trade_doc_test-url>"
export TRADE_DOC_RUN_E2E=true
pnpm test:e2e
unset TRADE_DOC_RUN_E2E
```

该入口会启动本机开发服务器并写入合成数据。保留 Playwright 报告、必要截图和实际断言结果；主工作流只覆盖其包含的场景子集。`.github/e2e/playwright.config.ts` 的生产构建登录/会话检查也只是冒烟证据，不是完整验收。

### 4. 真实服务与数据库重启

```sh
export DATABASE_URL="<synthetic-trade_doc_test-url>"
export TRADE_DOC_RUN_E2E=true
export TRADE_DOC_E2E_RESTART=true
node scripts/verify-real-workflow.mjs
unset TRADE_DOC_RUN_E2E TRADE_DOC_E2E_RESTART
```

脚本使用 Compose 服务名 `postgres` 重启数据库，并重启其管理的应用。`RESTART-01` 只有在实际完成业务链、双重启、重新登录、订单/报价回读、同键重放和数据库计数复核后才能更新；脚本输出中的 `PASS` 也只对应这段已执行链路。

### 5. 统一入口

```sh
node scripts/run-acceptance.mjs
```

`scripts/run-acceptance.mjs` 已提供；执行前仍须审查其开关、数据库限制、覆盖清单、失败行为和证据输出，并由主控在受控合成环境中实际运行。不能因统一入口存在或整体返回成功就跳过逐项证据核对；本次逐项结果保存在上述证据文件中。

## 49 项契约基线清单

下表只做索引，详细 given/when/expect、HTTP 状态和层级以权威契约 JSON 为准。表内状态是保留不变的契约规划基线，不代表本次实际执行结果；实际结果以证据文件为准。

| 场景 ID | 数量 | 契约基线状态 | 必须取得的实际证据 |
|---|---:|---|---|
| `AUTH-01`—`AUTH-07` | 7 | `PLANNED` | 会话、CSRF、退出/停用/撤权及限流的服务与浏览器结果 |
| `CAT-01`—`CAT-04` | 4 | `PLANNED` | 币种目录、共用商品、唯一约束和岗位写权限结果 |
| `CUST-01`—`CUST-02` | 2 | `PLANNED` | 本人客户维护、分页搜索与主管全量只读结果 |
| `SCOPE-01`—`SCOPE-04` | 4 | `PLANNED` | 跨归属详情/列表/引用拒绝及非销售岗位默认拒绝 |
| `INQ-01`—`INQ-03` | 3 | `PLANNED` | 多行快照、版本/停用冲突、非法输入与零部分写入 |
| `QUOTE-01`—`QUOTE-04` | 4 | `PLANNED` | 报价快照、首报价并发、精确金额及严格更新语义 |
| `MONEY-01`—`MONEY-04` | 4 | `PLANNED` | 数字形态、整分乘积、规范化与数据库上界拒绝 |
| `SUBMIT-01`—`SUBMIT-03` | 3 | `PLANNED` | 三版本校核、冻结快照、并发漂移和提交前置条件 |
| `CONFIRM-01`—`CONFIRM-03` | 3 | `PLANNED` | 客户确认、附件边界、重复确认与确认后编辑拒绝 |
| `ORDER-01`—`ORDER-05` | 5 | `PLANNED` | 唯一成单、非法来源、并发/重试及重复成单结果 |
| `SNAP-01` | 1 | `PLANNED` | 主数据变更后的冻结快照逐值回读 |
| `IDEM-01`—`IDEM-04` | 4 | `PLANNED` | 重放、异命令冲突、先授权及幂等键校验 |
| `VERSION-01` | 1 | `PLANNED` | 保存/提交竞争的 CAS 与快照一致性结果 |
| `TX-01` | 1 | `PLANNED` | 每个规定事务步骤的真实故障注入与全回滚回读 |
| `DB-01` | 1 | `PLANNED` | 选定 PostgreSQL 对复合外键、唯一键和非空约束的实际拒绝 |
| `RESTART-01` | 1 | `PLANNED` | 应用和数据库真实重启后的重登、回读与幂等保持 |
| `ERROR-01` | 1 | `PLANNED` | 错误结构与日志检查，确认无堆栈、秘密或越权信息 |

其中 `QUOTE-02`、`ORDER-03`、`VERSION-01` 必须真实并发，`TX-01` 必须故障注入，`DB-01` 必须直接验证数据库约束，`RESTART-01` 必须真实重启；不能用单测 mock、代码审阅或静态契约检查替代。

## 逐项证据与状态更新规则

每个场景至少记录：

1. 场景 ID、执行时间、执行人、应用版本或提交标识及受控环境说明。
2. 实际命令和显式开关；秘密只记录为已配置，不保存其值。
3. 前置数据、实际操作、关键 HTTP 状态/响应及与契约期望的对照。
4. 按场景需要保存数据库回读、并发时序、故障注入点、浏览器截图/trace、重启记录和脱敏日志。
5. 明确结论：`PASS`、`FAIL` 或 `BLOCKED`，以及证据位置。部分执行不得写成完整通过。

只有上述实际证据经过复核，才能由授权维护者更新权威契约 JSON 中对应场景的状态；还应同步更新总状态，避免单项状态与文件总状态矛盾。以下情况均不得更新为通过：

- 只有实现、类型检查、130 项单测、契约检查或构建结果；
- 测试被 skip、未连接真实 PostgreSQL、浏览器未启动或场景未实际运行；
- 只凭聚合脚本退出码，无法对应场景期望和实际输出；
- 证据缺页、脱敏后无法核对关键断言，或存在失败/未完成子项；
- 以本次局部结果推断本地或生产全部 49 项验收通过。
