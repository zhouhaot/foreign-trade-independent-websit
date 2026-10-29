# ADR-0002：PostgreSQL 与 Drizzle 持久化

- 状态：Accepted
- 日期：2026-10-29

## 背景

首切片需要真实唯一约束、复合外键、行级并发控制、事务和重启持久化。内存 Mock 或仅应用层校验不能证明这些性质。

## 决策

生产数据使用 PostgreSQL，TypeScript 数据访问使用 Drizzle ORM 与工程已选 postgres.js 驱动。Drizzle Schema 和可审阅迁移必须等价实现权威数据模型的 16 张表、主键、唯一键、复合外键、非空和检查约束；不得用另一套简化表结构替代。

逻辑类型映射为：`uuid` → PostgreSQL `uuid`，`decimal20_2` → `numeric(20,2)`，`date` → `date`，`utcInstant` → `timestamptz`，`snapshot` → `jsonb`。审计时间按 UTC 解释，业务日期不带时区。十进制在驱动和应用层保持字符串或精确十进制表示，禁止转为 JavaScript `Number` 结算。

多步业务写使用同一 Drizzle 数据库事务。依赖唯一约束和原子版本条件/行锁解决竞争；冲突回读、隔离级别和重试必须由真实 PostgreSQL 测试验证。迁移尚未执行，静态 JSON 不是 DDL 成功证据。

## 后果

复合外键要求目标列具有完全匹配的唯一键，迁移顺序和字段顺序必须保持一致。`numeric` 的字符串往返会增加显式映射工作，但可避免浮点金额误差。依赖版本由工程锁文件固定，本 ADR 不指定未经验证的版本号。

## 历史候选

MySQL/MyBatis、Spring Data 和其他旧持久化示例仅作历史候选，不是现行决策；不以 MySQL 的锁或隔离语义推断 PostgreSQL 行为。
