# 首个生产业务切片契约

本目录由 `trade-doc-demo/docs/production/` 的已复核首切片迁移而来，现作为 `trade-doc-app/` 的权威契约。Demo 中同名文件只保留历史参考价值；生产实现不得反向修改 Demo，也不得把 Demo 样例、假登录或内存状态作为正式数据与授权来源。

## 契约文件

| 文件 | 权威内容 | 当前状态 |
|---|---|---|
| [OpenAPI](slice-01.openapi.json) | OpenAPI 3.1.1、25 个操作、47 个 Schema，同源 `/api/v1` | 权威，未宣称实现 |
| [数据模型 JSON](slice-01.data-model.json) | 16 张逻辑表、PostgreSQL 目标、唯一键、复合外键与快照 | 权威，未执行 DDL |
| [数据模型说明](DATA_MODEL.md) | 字段关系、归属、快照时点、金额与日期边界 | 与 JSON 配套 |
| [权限与事务](SECURITY_AND_TRANSACTIONS.md) | 五岗位、会话/CSRF、幂等、版本与事务 | 与 OpenAPI 配套 |
| [验收矩阵](slice-01.acceptance.json) | 49 个真实服务/数据库/浏览器场景 | 全部 `PLANNED` |

业务范围仍是“真实登录 → 公司共用商品/本人客户 → 询盘 → 报价草稿 → 提交冻结 → 客户确认 → 唯一成单 → 回读”。本次迁移不增加报价修订、直接订单新增、订单推进/取消、附件上传、单证、收款、统计导出或账号管理写接口。

## 技术决策与业务未决项

Next.js App Router、TypeScript、PostgreSQL、Drizzle、Zod、数据库会话和单机部署由 [ADR](../architecture/README.md) 固定。它们不替代业务确认：报价过期后的补录/成单、日期区间、兼岗、业务流水号及后续状态推进仍按原契约保持未决，不能由实现自行放宽。

数据模型在迁移时只补充了实现所选 PostgreSQL 的存储映射，以及匿名/登录数据库会话和 CSRF 哈希所需的技术字段；16 表业务流程与授权边界不变。

## 验证边界

运行 `node scripts/verify-contract.mjs` 只能证明静态契约一致性和检查器反例有效。真实鉴权、CSRF、外键、事务、并发、重启持久化及浏览器流程必须由验收矩阵中的集成场景另行证明。所有 49 项保持 `PLANNED`，执行数仍为 0。
