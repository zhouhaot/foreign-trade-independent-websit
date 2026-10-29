# 单机部署与运行边界

本文是部署准备和操作说明，不表示已经执行过本地部署验收、生产部署、迁移或恢复验收。目标拓扑是单台 Docker 主机上的 Nginx、Next.js standalone 应用、一次性迁移任务和 PostgreSQL 持久卷。

## 拓扑与启动顺序

1. `postgres` 使用命名卷保存数据，并以 `pg_isready` 检查连接可用性。
2. `migrate` 使用独立镜像目标执行 `pnpm exec drizzle-kit migrate`，失败时非零退出。
3. `app` 等待数据库健康和迁移成功，再以非 root 的 `node` 用户运行 `server.js`。
4. `nginx` 等待应用 `/api/health` 存活检查通过，再开放代理端口。

应用和迁移镜像使用同一源码构建，但只有迁移镜像包含 Drizzle Kit、迁移 SQL 和账号初始化脚本。standalone 运行镜像不包含开发依赖。

## 前置条件

- Docker Engine 与 Docker Compose v2。
- Node.js 22.12+、pnpm 11.24.0（仅宿主机开发或 CI 需要）。
- 可用的备份位置、HTTPS 入口和外部秘密管理（生产）。
- `next.config.ts` 已设置 `output: "standalone"`；Dockerfile 会检查 `.next/standalone/server.js` 是否存在。

## 环境变量

| 变量 | 默认值 | 说明 |
|---|---|---|
| `POSTGRES_PASSWORD` | 无，必填 | 数据库密码；不要写入 Git 或命令日志 |
| `POSTGRES_DB` | `trade_doc` | 数据库名 |
| `POSTGRES_USER` | `trade_doc` | 数据库用户 |
| `POSTGRES_HOST_PORT` | `5432` | 仅绑定 `127.0.0.1` 的宿主机数据库端口 |
| `HTTP_PORT` | `8080` | 仅绑定 `127.0.0.1` 的 Nginx HTTP 端口 |
| `APP_VERSION` | `local` | 应用与迁移镜像标签；升级时应使用可追踪版本 |
| `BUSINESS_TIME_ZONE` | `Asia/Shanghai` | 业务日期的工程候选时区，正式政策仍需业务确认 |
| `AUTH_SESSION_TTL_SECONDS` | `28800` | 数据库会话有效期，至少 60 秒 |

Compose 从 `POSTGRES_USER`、`POSTGRES_PASSWORD` 和 `POSTGRES_DB` 构造容器内部 `DATABASE_URL`，数据库主机使用 Compose 服务名 `postgres` 和容器端口 `5432`。容器内不能用 `localhost` 指向该服务；宿主机连接才使用 `127.0.0.1:${POSTGRES_HOST_PORT}`。

当前拼接方式要求数据库用户名和密码只使用不需要 URL 编码的字符；建议用密码管理器或 `openssl rand -hex` 生成随机十六进制密码。不要把包含 `@`、`:`、`/`、`%` 等字符的密码直接用于此配置。

`TRADE_TRUST_PROXY=true` 由 Compose 固定设置，Nginx 会用直接对端地址覆盖 `X-Forwarded-For`。如果前方还有 CDN 或负载均衡器，必须另行配置可信代理链和真实客户端 IP，不能直接信任公网传入的转发头。

## 构建与启动

以下命令是操作步骤，不是已执行记录。数据库连接按需创建，镜像构建和 `pnpm build` 不要求提供真实或占位的 `DATABASE_URL`；迁移和运行时数据库访问必须由 Compose 注入有效连接：

```sh
export POSTGRES_PASSWORD="$(openssl rand -hex 24)"
export APP_VERSION="$(date -u +%Y%m%d%H%M%S)"
docker compose build --pull app migrate
docker compose up -d
docker compose ps
```

独立执行迁移：

```sh
docker compose run --rm migrate
```

查看不包含秘密的运行状态：

```sh
curl --fail --silent http://127.0.0.1:8080/healthz
curl --fail --silent http://127.0.0.1:8080/api/health
curl --fail --silent http://127.0.0.1:8080/api/ready
```

不要把 `docker compose config`、完整环境或完整日志发布到公共位置，因为展开后的配置可能包含数据库连接秘密。

## 健康与就绪的准确含义

| 检查 | 证明 | 不证明 |
|---|---|---|
| PostgreSQL `pg_isready` | 数据库可接受连接 | 16 表结构、数据或业务事务正确 |
| `migrate` 成功退出 | 当前迁移命令完成 | 所有业务集成场景通过 |
| `GET /api/health` | Next.js 进程可处理请求 | 数据库可用或业务就绪 |
| `GET /api/ready` | 应用能执行一次数据库 `select 1` | 16 表迁移、业务数据、事务或 49 项场景正确 |
| Nginx `GET /healthz` | Nginx 本地配置和进程可用 | 上游应用或数据库可用 |

`/api/ready` 成功时返回 HTTP 200 和 `{"status":"ok"}`，数据库访问失败时返回 HTTP 503 和 `{"status":"unavailable"}`；两种响应都带 `Cache-Control: no-store`，不会暴露连接字符串或底层错误。它是独立的运行时数据库连通性探测，不能替代存活检查、迁移校验或业务验收。

因此，Compose 的**启动门控**仍是数据库健康、迁移完成和应用 `/api/health` 存活的组合；当前 `app` 健康检查没有改用 `/api/ready`。如需把它接入负载均衡器或 Compose 门控，应另行评审并实际验证故障与恢复行为，不能只修改文档宣称具备该能力。

## 真实验收与重启边界

真实集成、E2E 和重启验证只可在明确授权的合成环境执行，标准入口分别为 `pnpm test:integration`、`pnpm test:e2e` 和 `node scripts/verify-real-workflow.mjs`。它们需要显式开关；集成测试会清库，E2E 会写合成数据，重启脚本会重启应用和 Compose 的 `postgres` 服务。统一入口 `scripts/run-acceptance.mjs` 尚未提供。

这些命令及其证据要求见[首切片验收说明](../acceptance/README.md)。任何单测、构建、存活或就绪检查通过，都不能据此宣称本地或生产的 49 项验收已通过。

## 网络与 TLS

默认端口只绑定回环地址，Nginx 配置本身不签发证书。生产需要由可信负载均衡器或另行配置的 Nginx server block 终止 HTTPS，并限制数据库和管理端口的网络访问。会话 Cookie 始终带 `Secure`，不能用公网明文 HTTP 作为正式登录入口。

## 持久化与运维

唯一权威业务数据在 PostgreSQL；应用容器和 Nginx 容器不保存业务状态。删除或复用 `postgres_data` 卷会影响数据恢复，禁止把 `down -v` 当作普通重启命令。

- [备份、隔离恢复与 RPO/RTO](BACKUP_RESTORE.md)
- [升级与回滚](UPGRADE_ROLLBACK.md)

生产变更、数据库恢复和切换必须获得明确授权并经过隔离演练。本目录没有自动部署、自动备份或自动回滚任务。
