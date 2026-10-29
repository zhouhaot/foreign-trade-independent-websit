# 生产工程文档

本目录是 `trade-doc-app/` 的权威生产契约与架构记录。`trade-doc-demo/` 仅是静态历史参考，不是生产运行时、数据来源或现行契约入口；不得为了生产实现修改该目录。

## 入口

- [首切片契约](contracts/README.md)：16 张逻辑表、25 个 `/api/v1` 操作、49 个 `PLANNED` 集成场景。
- [实施基线](IMPLEMENTATION_PLAN.md)：首切片范围、交付顺序与验收边界。
- [架构决策](architecture/README.md)：Next.js Route Handlers、PostgreSQL/Drizzle、数据库会话与 CSRF、服务端归属与事务、单机部署。

## 权威顺序

1. `contracts/slice-01.openapi.json` 定义 HTTP 操作、DTO、状态码与安全标记。
2. `contracts/slice-01.data-model.json` 定义逻辑表、字段、唯一键、外键及快照约束。
3. `contracts/slice-01.acceptance.json` 定义必须执行的真实集成验收；`PLANNED` 不等于通过。
4. `contracts/*.md` 解释上述契约，`architecture/decisions/*.md` 固定技术实现方式，不得扩张业务范围。

迁移保持既有业务规则，不根据旧 Spring/MySQL 草案另造流程。若文档与机器可读契约冲突，先停止相关实现并消除冲突；不得自行选择较宽松的一种解释。

## 静态检查

在生产工程目录运行，无需安装第三方包：

```sh
node --check scripts/verify-contract.mjs
node scripts/verify-contract.mjs
```

检查覆盖精确操作/表/场景清单、内部引用、安全与归属标记、金额类型、关键唯一键和复合外键，并用内存反例验证检查器能够发现破坏。它不启动 Next.js、不连接 PostgreSQL，也不执行 49 个集成场景。
