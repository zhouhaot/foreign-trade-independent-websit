# ADR-0003：数据库会话与会话绑定 CSRF

- 状态：Accepted
- 日期：2026-10-29

## 背景

首切片要求匿名登录也具备 CSRF 防护，登录后轮换会话，退出/停用/撤权后旧会话失效。客户端角色、localStorage 令牌或只删 Cookie 不能满足这些要求。

## 决策

使用 `user_session` 表保存匿名和登录会话。Cookie `TRADE_SESSION` 携带高熵 opaque 随机会话标识，数据库只保存其哈希；Cookie 在生产设置 `Secure`、`HttpOnly`、`SameSite=Lax`、`Path=/api/v1`，不设置宽泛 `Domain`。

匿名会话的 `user_id` 和 `auth_version` 均为 `NULL`，只能用于 CSRF 和登录，不能访问受保护业务。登录会话二者均非空。`csrf_token_hash` 保存当前会话 CSRF 令牌哈希，原始令牌只经 `GET /auth/csrf` 响应体交给同源客户端；登录、退出及所有业务写必须校验 `X-CSRF-TOKEN`。

登录成功生成新的随机会话标识与 CSRF 令牌，并在同一数据库会话上绑定真实用户和当前 `auth_version`。每次受保护请求重查会话过期/撤销、用户启用和 `auth_version`。退出设置 `revoked_at` 并按相同 Path 清除 Cookie。停用、凭据或权限变化提升 `auth_version` 并撤销受影响会话。

原始 Cookie、CSRF、密码及其完整认证头不得写入日志、审计、幂等指纹或响应。密码使用另行选型的自适应单向哈希；登录失败统一提示并限流。

## 后果

匿名与登录态仍只占 16 表中的 `user_session` 一表，但其状态检查必须保证 `user_id` 与 `auth_version` 同时为空或同时非空。会话清理、空闲/绝对超时和限流参数尚未决定；未决定前不得宣称相应运维能力已交付。

数据库会话使服务重启后仍能验证持久会话，但验收场景不要求旧登录会话跨重启存活。真实 Cookie 属性、HTTPS 代理和 CSRF 流程必须由浏览器集成测试验证。

## 历史候选

旧 Spring Security 会话文档仅作历史参考，不能替代本工程在 Next.js/PostgreSQL 上的实现和测试。
