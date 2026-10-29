# 外贸订单与单证管理生产工程

独立的 Next.js 应用，首个业务切片覆盖真实登录、公司共用商品、本人客户、询盘、报价、客户确认和唯一成单。静态 `trade-doc-demo/` 仅作历史参考，不得接入本应用或生产数据。

当前代码已实现契约中的 25 个 `/api/v1` 操作和 16 张业务表，并有 130 项单元测试。实现数量和单测通过只说明代码级检查，不等同于真实 PostgreSQL 集成、浏览器端到端或生产验收通过。业务权威输入见 `docs/contracts/`，执行与取证规则见[验收说明](docs/acceptance/README.md)。

## 本机合成验收证据（2026-10-29）

真实统一验收 `runId=b195c4f168cc` 已完成，49/49 项场景为 `PASS`，逐项证据见 [`docs/acceptance/results/2026-10-29-slice-01.json`](docs/acceptance/results/2026-10-29-slice-01.json)。配套执行为 31 项真实 PostgreSQL 数据库集成测试和 1 个真实 Chromium 浏览器主流程，均已通过；`RESTART-01` 已实际重启应用和 PostgreSQL，并验证重新登录、业务回读与同键幂等重放。

同一来源的本机合成备份已于 `2026-10-29T08:11:23Z` 恢复到新建空库 `trade_doc_restore_b195_v2`，结果为 `PASS`。`pg_restore --exit-on-error` 耗时 106.826 ms，迁移耗时 690.239 ms；`pg_isready` 正常，独立 Next 3102 端口的 `/api/health` 与 `/api/ready` 均为 HTTP 200。16 张业务表均可查询，关键唯一键/外键反例按预期拒绝且已验证回滚；恢复后回读为 14 orders、14 versions、28 lines、231 idempotency、229 audits，金额、归属和快照不一致数均为 0。备份 SHA256 和逐项脱敏证据见 [`docs/acceptance/results/2026-10-29-restore.json`](docs/acceptance/results/2026-10-29-restore.json)。本次 Next 已停止，隔离库和源备份保留。

`TX-01` 仅覆盖五个业务事务在成功幂等记录或成功审计写入前发生故障时的回滚与同键重试，不声称覆盖所有中间 SQL 步骤或进程崩溃窗口。契约中的 49 项场景及总状态仍保留 `PLANNED` / `PLANNED-NOT-EXECUTED` 基线，实际结果以证据文件为准。49/49 本机合成验收和本机合成隔离恢复均已通过，但不构成生产部署或生产验收；正式生产部署、生产备份和生产恢复仍未执行。

## 技术基线

- Node.js 22.12 或更高版本，pnpm 11.24.0
- Next.js App Router、React、TypeScript
- PostgreSQL 17、Drizzle ORM、postgres.js
- Vitest、Playwright、ESLint
- Docker Compose、Next standalone 运行时、Nginx 反向代理

依赖版本以 `package.json` 和 `pnpm-lock.yaml` 为准。

## 本地开发启动

先准备一个仅绑定回环地址的 PostgreSQL。下面的随机密码只存在当前 shell，不写入仓库；也可以由本地密码管理工具生成。

```sh
export POSTGRES_PASSWORD="$(openssl rand -hex 24)"
export DATABASE_URL="postgresql://trade_doc:${POSTGRES_PASSWORD}@127.0.0.1:5432/trade_doc"
docker compose up -d postgres
```

安装依赖、执行迁移并启动开发服务器：

```sh
pnpm install --frozen-lockfile
pnpm exec drizzle-kit migrate
pnpm dev
```

开发入口为 `http://localhost:3000`。`DATABASE_URL` 在实际数据库访问、迁移、真实集成和 E2E 运行时必须指向目标库；数据库连接按需创建，执行 `pnpm build` 不要求提供真实或占位的 `DATABASE_URL`。

### 合成账号

系统不创建默认生产账号，也不提供身份切换接口。本地和 CI 只使用合成账号。创建账号前先执行迁移，再通过交互输入设置临时密码，避免把密码写进命令或仓库：

```sh
read -rsp "Synthetic user password: " TRADE_CREATE_USER_PASSWORD; echo
export TRADE_CREATE_USER_PASSWORD
TRADE_CREATE_USER_USERNAME=synthetic-sales-a \
TRADE_CREATE_USER_DISPLAY_NAME="Synthetic Sales A" \
TRADE_CREATE_USER_ROLE=sales \
node scripts/create-user.mjs
unset TRADE_CREATE_USER_PASSWORD
```

可用岗位为 `sales`、`boss`、`admin`、`doc`、`fin`。完整测试矩阵使用 `sales-A`、`sales-B`、`boss`、`admin`、`doc`、`fin` 等合成身份；首切片只有 `sales` 可写销售业务，`boss` 全量只读，其他岗位默认拒绝销售业务。

完整容器环境也可用迁移镜像创建合成账号：

```sh
read -rsp "Synthetic user password: " TRADE_CREATE_USER_PASSWORD; echo
export TRADE_CREATE_USER_PASSWORD
docker compose run --rm \
  -e TRADE_CREATE_USER_USERNAME=synthetic-sales-a \
  -e TRADE_CREATE_USER_PASSWORD \
  -e TRADE_CREATE_USER_DISPLAY_NAME="Synthetic Sales A" \
  -e TRADE_CREATE_USER_ROLE=sales \
  migrate node scripts/create-user.mjs
unset TRADE_CREATE_USER_PASSWORD
```

这些命令只用于一次性、受控初始化，不是账号管理 API。`.gitignore` 已覆盖 `.env*`，仅放行 `.env.example`、`.env.sample` 和 `.env.template`；仍应优先使用 shell 环境或外部秘密管理，不在命令、日志、文档或示例模板中写入真实秘密。

## 迁移与数据重置边界

独立迁移命令：

```sh
# 宿主机开发环境，使用宿主机 DATABASE_URL
pnpm exec drizzle-kit migrate

# 容器环境，使用 Compose 内部 DATABASE_URL
docker compose run --rm migrate
```

`docker compose up -d` 还会在应用启动前等待 PostgreSQL 健康且 `migrate` 服务成功结束。迁移不会自动填充公司资料、币种或账号。Compose 容器内的连接主机名是服务名 `postgres`，不是 `localhost`；只有宿主机连接才使用映射到 `127.0.0.1` 的端口。

数据库集成测试会清空 16 张业务表。它只能通过 `TRADE_DOC_ALLOW_TEST_RESET=true` 在名为 `trade_doc` 或 `trade_doc_test` 的合成数据库运行，绝不能指向生产或其他含真实数据的数据库。

## 静态检查与单元测试

```sh
pnpm lint
pnpm typecheck
pnpm test
node scripts/verify-contract.mjs
pnpm build
```

`pnpm test` 当前的 130 项只是单元测试，使用 mock、内存数据或纯函数检查，不证明真实数据库约束、事务、并发、浏览器或重启持久化。契约检查同样不连接 PostgreSQL；构建成功也不代表业务验收通过。

## 真实 PostgreSQL 集成测试

仅在主控准备好的合成数据库上显式开启。以下测试会清空数据，执行前必须核对 `DATABASE_URL`，不得用于生产库：

```sh
export DATABASE_URL="<synthetic-database-url>"
export TRADE_DOC_RUN_DB_TESTS=true
export TRADE_DOC_ALLOW_TEST_RESET=true
pnpm exec drizzle-kit migrate
pnpm test:integration
unset TRADE_DOC_RUN_DB_TESTS TRADE_DOC_ALLOW_TEST_RESET
```

未设置 `TRADE_DOC_RUN_DB_TESTS=true` 时，真实数据库用例不会作为已执行通过的证据。集成命令成功也只覆盖其实际包含的场景，不能据此批量更新 49 项状态。

## 真实浏览器 E2E

真实 E2E 仅允许本机 Next.js 服务和名为 `trade_doc_test` 的已迁移合成数据库。配置会启动开发服务器、写入合成账号与业务数据，必须显式开启：

```sh
pnpm exec playwright install chromium
export DATABASE_URL="<synthetic-trade_doc_test-url>"
export TRADE_DOC_RUN_E2E=true
pnpm test:e2e
unset TRADE_DOC_RUN_E2E
```

`pnpm test:e2e` 的主工作流只覆盖其断言涉及的登录、归属、岗位、报价成单、幂等和并发等部分场景。`.github/e2e/playwright.config.ts` 对应的旧 CI 登录/会话检查是另一条生产构建冒烟入口，不是 49 项完整验收。

## 真实重启验证

`scripts/verify-real-workflow.mjs` 会写入合成数据，停止并重新启动它管理的应用进程，并执行 `docker compose restart postgres`。仅在主控授权的合成环境中运行：

```sh
export DATABASE_URL="<synthetic-trade_doc_test-url>"
export TRADE_DOC_RUN_E2E=true
export TRADE_DOC_E2E_RESTART=true
node scripts/verify-real-workflow.mjs
unset TRADE_DOC_RUN_E2E TRADE_DOC_E2E_RESTART
```

该脚本限制为 `trade_doc_test`，并依赖 Compose 中名为 `postgres` 的数据库服务。只有实际完成重启、重新登录、回读和同键重放并保存输出后，才能作为 `RESTART-01` 的证据。

真实统一验收入口为：

```sh
node scripts/run-acceptance.mjs
```

执行前仍须核对其显式开关、环境隔离、实际覆盖范围和逐项证据，不能仅凭脚本存在或聚合退出码判定通过。本次 `runId=b195c4f168cc` 的结果已保存在上述证据文件中；详见[首切片验收说明](docs/acceptance/README.md)。

## 容器启动

Next.js 已配置 `output: "standalone"`，镜像构建会生成并检查 `.next/standalone/server.js`，构建阶段不需要数据库连接。

```sh
export POSTGRES_PASSWORD="$(openssl rand -hex 24)"
docker compose build --pull app migrate
docker compose up -d
```

Nginx 默认只监听 `http://127.0.0.1:8080`，PostgreSQL 只映射到 `127.0.0.1:5432`。数据保存在 Compose 命名卷 `postgres_data`。该 HTTP 入口用于本机验证；非回环生产入口必须在前置负载均衡器或反向代理终止 HTTPS，否则带 `Secure` 的会话 Cookie 不能按生产方式使用。

环境变量、健康/就绪边界和运维入口见 [`docs/deployment/README.md`](docs/deployment/README.md)。备份、隔离恢复、升级与回滚必须先演练并获得相应变更授权。

## 健康检查与业务边界

- `GET /api/health` 只证明 Next.js 进程能处理请求，不检查数据库。
- `GET /api/ready` 实际执行数据库 `select 1`：成功返回 HTTP 200、`{"status":"ok"}`；失败返回 HTTP 503、`{"status":"unavailable"}`。响应均为 `Cache-Control: no-store`，且不返回连接错误细节。它不证明 16 表迁移完成或 49 项业务场景通过。
- PostgreSQL 的 `pg_isready` 只证明数据库可接受连接。
- Nginx 的 `GET /healthz` 只证明代理进程可用。
- Compose 启动顺序组合数据库健康、迁移成功和应用 `/api/health` 存活检查；`/api/ready` 可独立探测运行时数据库连通性，但当前未接入 Compose 的应用健康门控。

首切片不包含报价修订、直接订单新增或修改、订单推进/取消、附件上传下载、单证、收款、统计导出、账号管理写 API 或历史 Demo 数据导入。报价、确认和订单快照、权限、CSRF、幂等与事务规则均以 `docs/contracts/` 为准。
