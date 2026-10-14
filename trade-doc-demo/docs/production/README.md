# 外贸系统生产化设计

当前已完成首切片的数据、API、权限及事务契约设计；没有运行后端、创建数据库或部署服务器。设计面向独立生产应用，静态Demo保持原样。

需求方已确认服务器部署、业务员本人业务/主管全部读取、只录新业务、公司共用商品、客户确认附件可选，以及数量/单价各最多两位且行金额必须精确到分。

## 本轮交付

| 文件 | 内容 |
|---|---|
| [实施基线](IMPLEMENTATION_PLAN.md) | 已确认范围、工程隔离与分阶段验收 |
| [数据模型](DATA_MODEL.md) | 16张逻辑表、复合关系与快照时点 |
| [字段与约束JSON](slice-01.data-model.json) | 引擎中立设计，不是执行过的迁移 |
| [API定义](slice-01.openapi.json) | OpenAPI 3.1.1，25个操作与47个Schema；固定描述版本，不声称最新标准 |
| [权限与事务](SECURITY_AND_TRANSACTIONS.md) | 五岗位边界、归属过滤、CSRF、幂等、版本与事务 |
| [验收矩阵](slice-01.acceptance.json) | 49个后续真实集成场景，均为PLANNED，不是已通过 |
| [独立复核](SLICE_01_REVIEW.md) | 初次发现、修正和最终静态复验边界 |

## 如何检查

在Demo目录使用现有Node运行，无需安装依赖或构建工具：

```sh
node --check scripts/verify-production-contract.cjs
node scripts/verify-production-contract.cjs
```

检查器验证内部引用、操作权限标记、DTO白名单、金额字段精确类型、业务关键复合外键、API/存储字段映射和计划验收覆盖，并运行故意破坏契约的反例及21个JSON Schema子集样本。反例数量以最新回执为准。它不是完整OpenAPI/JSON Schema标准验证器；不执行真实身份鉴权、数据库外键、事务、并发、服务重启或浏览器流程。

带`--report docs/production/verification/contract-check.json`可生成检查回执。修改契约后必须重新执行；生成文件中的PASS只指静态检查，`plannedIntegrationCasesExecuted`仍须为0，不能据此宣称正式系统已可用。

## 下一阶段门槛

先锁定独立工程目录与规则、数据库/依赖版本、构建方式及真实账号初始化；再实现登录→本人客户/询盘→报价确认→唯一成单的持久化链路。报价过期补录/成单、日期范围、兼岗、流水号和后续订单推进/单证失效/冲销规则仍须按阶段确认，不套用旧草案默认批准机制。服务器系统与规格在部署前补齐。
