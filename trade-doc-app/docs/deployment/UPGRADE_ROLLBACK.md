# 升级与回滚

本文是待执行手册，不表示已有升级或回滚记录。首切片采用单机 Compose，没有多副本滚动升级、自动数据库回退或零停机承诺。

## 升级前门禁

1. 固定源码版本、迁移文件和不可变 `APP_VERSION`，确认 CI 的质量门、真实 PostgreSQL 集成与 E2E 结果。
2. 阅读本次迁移，确认是否向后兼容、是否需要维护窗口以及旧应用能否读写新结构。
3. 按 [备份手册](BACKUP_RESTORE.md) 创建并验证备份，且近期隔离恢复成功。
4. 记录当前应用镜像标签、数据库迁移状态和待确认 RPO/RTO；不要在日志中输出连接秘密。
5. 获得数据库迁移和应用变更授权。没有兼容回退路径时不得按普通应用升级处理。

## 升级步骤

```sh
set -euo pipefail
export APP_VERSION="REPLACE_WITH_APPROVED_VERSION"
docker compose build --pull app migrate
docker compose up -d postgres
docker compose run --rm migrate
docker compose up -d
docker compose ps
```

`docker compose up -d` 的应用依赖也会确保迁移服务成功；独立迁移命令用于把数据库变更换成显式、可审计步骤。Drizzle 迁移是前向操作，重复执行由迁移记录控制，不代表所有迁移都可重入或都可逆。

升级后至少验证：

- 应用、数据库、Nginx 健康状态及预期镜像版本；
- 迁移无失败、数据库无缺失结构；
- 合成账号登录、权限拒绝和核心只读回链；
- 已批准的业务/数据库验收场景；
- 日志无连接秘密、会话令牌、密码或敏感客户内容。

`/api/health` 成功不能代替上述检查。

## 应用回滚

只有当旧应用与当前数据库结构兼容，且新版本没有必须保留的破坏性数据变化时，才可单独回滚应用：

```sh
set -euo pipefail
export APP_VERSION="REPLACE_WITH_VERIFIED_PREVIOUS_VERSION"
docker compose up -d --no-deps app nginx
docker compose ps
```

旧镜像必须仍在受控镜像仓库或本机且经过校验。不要用 `latest` 推断版本。应用回滚后仍需执行业务和权限验证。

## 数据库回退与数据损失

当前没有自动 down migration。以下情况不能把重启旧镜像当作完整回滚：

- 已删除或重命名列、表、约束；
- 新数据格式或快照结构不被旧应用理解；
- 新版本写入不能被旧版本安全处理；
- 迁移部分失败或数据库状态不明。

需要恢复到升级前备份时，必须停止业务写入，获得明确恢复授权，并确认接受“备份之后的新写入丢失”。优先按隔离恢复手册重建独立环境并完成校验，再制定切换步骤；不要直接覆盖唯一生产卷，不要在未确认备份可用前停止最后可用服务。

如果批准了 WAL/PITR 或前滚修复，应按另行验证的方案执行；当前仓库未提供这些能力，不能假定存在。

## 回滚后记录

记录实际版本、恢复点、影响范围、数据丢失窗口、恢复耗时、验证证据和未解决问题。只有达到已批准的 RPO/RTO 和业务验收条件后，才能宣布恢复完成。
