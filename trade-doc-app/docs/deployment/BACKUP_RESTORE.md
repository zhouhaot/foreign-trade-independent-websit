# 备份、隔离恢复与 RPO/RTO

本文定义待演练流程，不表示已有备份、异地副本或成功恢复记录。备份包含客户、交易和认证哈希等敏感数据，必须加密、限制访问并纳入保留与销毁政策。

## 备份原则

- 使用 PostgreSQL `pg_dump` 的一致性逻辑备份，不把直接复制运行中数据卷当作已验证备份。
- 备份写入临时文件，完成非空及目录检查后再改为正式文件。
- 正式备份应复制到独立故障域并加密；仅保存在同一 Docker 主机不构成灾难恢复能力。
- 定期做隔离恢复，记录恢复点、耗时、校验结果和范围；不能只检查文件存在。

## 创建逻辑备份

在项目根目录、目标 Compose 项目环境中执行。命令不会显示数据库密码：

```sh
set -euo pipefail
umask 077
mkdir -p backups
backup="backups/trade-doc-$(date -u +%Y%m%dT%H%M%SZ).dump"
docker compose exec -T postgres sh -c \
  'pg_dump --format=custom --no-owner --no-privileges --username "$POSTGRES_USER" --dbname "$POSTGRES_DB"' \
  > "${backup}.partial"
test -s "${backup}.partial"
docker compose exec -T postgres pg_restore --list \
  < "${backup}.partial" > /dev/null
mv "${backup}.partial" "$backup"
```

`pg_restore --list` 只检查备份目录可读，不证明数据能完整恢复。恢复演练仍是必需门禁。正式备份的异地复制、加密和保留周期尚未配置，不能使用未验证的脚本输出代替这些控制。

## 隔离恢复演练

恢复使用新的 Compose 项目名，因此会创建独立容器和独立 `postgres_data` 卷，并使用不同宿主机端口。不要对生产项目直接执行下列步骤，不要挂载生产数据卷。

先确认备份路径，然后执行：

```sh
set -euo pipefail
umask 077
export COMPOSE_PROJECT_NAME=trade-doc-restore
export POSTGRES_HOST_PORT=55432
export HTTP_PORT=18080
export APP_VERSION=local-restore
export POSTGRES_PASSWORD="$(openssl rand -hex 24)"
backup="backups/REPLACE_WITH_VERIFIED_BACKUP.dump"
test -s "$backup"

docker compose up -d postgres
docker compose exec -T postgres pg_restore \
  --exit-on-error --no-owner --no-privileges \
  --username trade_doc --dbname trade_doc < "$backup"
docker compose build app migrate
docker compose up -d
```

如果备份使用非默认数据库名或用户名，必须显式调整恢复目标；不能猜测。恢复到非空数据库前必须停止并重新评估，因为此流程只针对新建空库。

### 恢复校验

至少保留以下证据：

1. `pg_restore --exit-on-error` 成功，且恢复目标确认为隔离项目。
2. 迁移服务成功，应用和数据库容器健康。
3. 16 张表可查询，关键唯一键/外键检查无错误。
4. 使用合成或经授权的验收数据核对订单、报价、确认、明细、金额和快照，不输出真实敏感记录。
5. 记录实际恢复点与恢复耗时，和已批准 RPO/RTO 比较。

可先执行不返回业务行的基本查询：

```sh
docker compose exec -T postgres psql --username trade_doc --dbname trade_doc \
  --command 'select count(*) as users from app_user;'
docker compose exec -T postgres psql --username trade_doc --dbname trade_doc \
  --command 'select count(*) as orders from sales_order;'
curl --fail --silent http://127.0.0.1:18080/api/health
```

这些命令只是初步检查，不能代替完整业务、权限和事务验收。`/api/health` 也不证明恢复数据正确。

隔离环境保留期间必须限制访问。销毁隔离环境属于删除操作，应单独授权；不要在演练脚本中自动执行 `down -v`。

## 生产恢复边界

生产恢复需要维护窗口、明确授权和已验证备份。恢复旧备份会丢失恢复点之后的新写入；切换前必须停止写入或提出可验证的日志前滚方案。当前没有 WAL 归档、时间点恢复或自动切换配置，不能承诺零数据丢失。

## RPO/RTO 待确认

| 项目 | 当前状态 | 必须确认的内容 |
|---|---|---|
| RPO（可接受数据丢失窗口） | **待业务与运维批准** | 最大可丢失时间、备份频率、是否需要 WAL/PITR |
| RTO（可接受恢复时间） | **待业务与运维批准** | 从故障宣告到只读/完整写入恢复的目标时间 |
| 备份频率与保留 | 待确认 | 日/周/月保留、法律要求、销毁流程 |
| 异地与加密 | 待实施并验收 | 独立故障域、密钥管理、访问审计 |
| 恢复演练频率 | 待确认 | 演练范围、责任人、证据保存和失败处置 |
| 监控与告警 | 待实施 | 备份失败、容量、复制延迟及恢复超时告警 |

在这些项目批准并通过演练前，不得对外给出具体 RPO/RTO 数值或声称具备灾难恢复能力。
