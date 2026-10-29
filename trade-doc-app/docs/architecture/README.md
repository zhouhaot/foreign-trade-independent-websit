# 架构决策记录

以下 ADR 均为 2026-10-29 已接受的现行生产工程决策，只固定技术边界，不批准新的业务流程或关闭原契约中的业务未决项。

| 编号 | 决策 | 状态 |
|---|---|---|
| [0001](decisions/0001-route-handlers-business-boundary.md) | Next.js Route Handlers 是唯一业务 HTTP 边界 | Accepted |
| [0002](decisions/0002-postgresql-drizzle.md) | PostgreSQL 与 Drizzle 是持久化标准 | Accepted |
| [0003](decisions/0003-database-sessions-csrf.md) | 数据库会话与会话绑定 CSRF | Accepted |
| [0004](decisions/0004-server-ownership-transactions.md) | 服务端归属、授权与原子事务 | Accepted |
| [0005](decisions/0005-single-node-deployment.md) | 单应用实例、单 PostgreSQL 主库的单机部署 | Accepted |

旧 Spring Boot/Spring Security、MySQL/MyBatis 和 Vue 示例只作为历史候选保留，不能作为实现依据。技术变更需要新增或 supersede 对应 ADR；业务变化仍须先修改权威契约并确认影响。
