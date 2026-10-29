# ADR-0001：Next.js Route Handlers 作为唯一业务边界

- 状态：Accepted
- 日期：2026-10-29

## 背景

生产工程使用 Next.js App Router。首切片 OpenAPI 已固定 25 个同源 `/api/v1` 操作；必须避免页面、Server Actions 和 Route Handlers 各自形成不同的校验、授权或写入路径。

## 决策

所有业务数据读取和写入均通过 `/api/v1` 的 Next.js Route Handlers。每个处理器对应 OpenAPI 中唯一 `operationId`，负责 HTTP 方法/路径匹配、Zod 输入校验、安全上下文接入、统一响应与 `Cache-Control: no-store`。业务授权、归属、计算和事务在服务端业务层完成，数据库访问不得放进 React 组件。

浏览器和服务器渲染页面需要业务数据时也遵循同一 API 契约，不建立绕开 `/api/v1` 的私有业务查询协议。业务写不使用 Server Actions；Server Actions 不得成为隐藏的第二条写边界。静态页面内容和 `/api/health` 进程存活检查不属于业务数据，也不替代业务 API 或就绪检查。

请求 DTO 默认严格拒绝未知字段。服务端生成身份、归属、状态、金额和审计字段；前端菜单与按钮只呈现能力，不构成授权。

## 后果

25 个操作具有可追踪的单一 HTTP 实现入口，契约测试可对每个 `operationId` 定位处理器。共享输入、错误和鉴权适配应保持精简，但不能为了复用而跳过各操作自己的权限与事务要求。

## 历史候选

旧 Spring Controller/Spring Security 示例是历史技术候选，不是现行边界；不得与 Next.js Route Handlers 并行实现同一业务写入。
