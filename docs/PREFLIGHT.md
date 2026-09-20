# P0 接入与环境预检

日期：2026-09-20。执行人：Claude Code 会话（fable 槽位）。
状态：**已检查，存在硬阻塞项**。本文档只记录实测结果，不代表任何后续阶段已完成。

## 1. 本地工具链

| 工具 | 要求 | 实测 | 结论 |
|---|---|---|---|
| Claude Code | — | 2.1.278 | 可用 |
| git | — | 2.50.1 (Apple Git-155) | 可用 |
| gh CLI | 推送/CI 操作 | 已登录 `zhouhaot`，scope = `gist, read:org, repo, workflow` | 可用 |
| Node.js | ≥18 | v22.23.1 | 可用 |
| npm | — | 10.9.8 | 可用 |
| Docker | 集成测试 / MySQL | 29.7.2 | 可用 |
| **JDK** | **21（首版候选）** | **未安装**（`Unable to locate a Java Runtime`） | **阻塞 P3 起全部后端工作** |
| **Maven** | 构建 | **未安装**（`command not found`） | **阻塞后端构建** |
| **MySQL** | 首版候选数据库 | 客户端未安装；可由 Docker 提供 | 可用 Docker 绕过，但需确认 |

### 阻塞项与处置建议

JDK 21 与 Maven 缺失是 P3 工程骨架之后的**硬阻塞**。三种处置路径：

1. 本机安装 JDK 21（Temurin/Adoptium）+ Maven，走原生构建。最贴近答辩演示环境。
2. 全程用 Docker 构建运行（`maven:3.9-eclipse-temurin-21` 镜像 + MySQL 容器）。本机零安装，但首次拉镜像较慢，且 CI 与本地行为需对齐。
3. 后端改用 Gradle Wrapper（仓库自带 wrapper，无需本机安装 Gradle），但仍需 JDK。

无论选哪种，**Java 运行时都必须存在**。此项需在进入 P3 前由用户决定，并记入 SET-001 任务卡。

> 远程仓库原有的 TradePlus 项目使用 JDK 17 + Maven Wrapper + SQLite。新项目首版候选是 JDK 21 + Maven + MySQL，二者不一致；依赖版本须在 P2 设计阶段锁定，不沿用旧项目配置。

## 2. 模型路由实测

### 2.1 接入结构

- `ANTHROPIC_BASE_URL` = `http://127.0.0.1:15721`（本机网关，仅记录主机部分）
- `ANTHROPIC_AUTH_TOKEN` = **已设置**（值未打印、未记录、不入库）
- `ANTHROPIC_API_KEY`、`ANTHROPIC_MODEL`、`CLAUDE_CODE_SUBAGENT_MODEL`、`ANTHROPIC_SMALL_FAST_MODEL` = 未设置

所有模型经由同一个本机网关路由，符合 `MODEL_ROUTING.md` 的"优先复用已使用的中转接口"。

### 2.2 全局 settings.json 模型槽位映射

| Claude Code 槽位 | 真实请求 model | 显示名（`*_MODEL_NAME`） | 项目岗位 |
|---|---|---|---|
| `fable` | `claude-fable-5[1M]` | `qwen3.8-max` | 前端实现 / 材料整理 |
| `haiku` | `claude-haiku-4-5` | `kimi-k3` | 总控 / 需求 |
| `opus` | `claude-opus-5[1M]` | `glm-5.3` | 后端实现 |
| `sonnet` | `claude-sonnet-5[1M]` | `deepseek-v4-pro-0813` | 架构 / 数据库 / 独立审查 |

### 2.3 身份声明的边界（重要）

按 `MODEL_ROUTING.md` 第 34 条规则：模型的自我介绍不能证明底层身份，网关返回的 `model` 字段也只是服务商声明。因此本文档只断言上表中**可核验的配置事实**（槽位名、配置的 model 字符串、显示名字符串），不断言任何模型权重的真实身份。

**当前会话偏差**：本预检由 `fable` 槽位会话执行（显示名 `qwen3.8-max`），而 `START_HERE.txt` 假定总控由 `kimi-k3`（`haiku` 槽位）担任。这是配置事实与文档假设的不一致，已如实记录，不做掩饰。后续若要严格按岗位分离上下文，需为各岗位生成独立的子代理定义（见 §3）。

### 2.4 未验证项（标记为阻塞，不臆断成功）

以下按 `MODEL_ROUTING.md` 的"配置验收"清单要求实测，**本轮均未执行**：

- 逐模型的流式输出、工具调用参数、长输出、取消/错误处理
- 子代理是否能各自路由到不同槽位（依赖 `.claude/agents/` 尚未生成）
- 四模型在同一任务、同一基线、同一测试用例上的首次通过率与修复轮数对比
- 上下文与输出上限、用量日志、实际费用

`MODEL_ROUTING.md` 第 37 条要求"未获预算授权时只检查配置，不发起付费测试"。因此上述项在用户给出预算授权前保持 **BLOCKED**，记入 SET-002 任务卡，不得标记为通过。

## 3. Claude Code 原生能力

| 能力 | 状态 | 说明 |
|---|---|---|
| 原生 Workflow 工具 | 可用 | 本会话工具列表含 Workflow；`workflow-authoring` skill 可用 |
| 子代理（Agent 工具） | 可用 | 含 `fork`、`Explore`、`Plan`、`general-purpose` 等类型 |
| `.claude/agents/` | **不存在** | 项目级与全局级均无；四模型岗位尚未落成子代理定义 |
| `.claude/workflows/` | **不存在** | 同上 |
| `trade-spec` / `trade-design` / `trade-feature` / `trade-release-check` | **未生成** | `WORKFLOW.md` 中的建议命名，非内置命令；尚无脚本 |

按 `MODEL_ROUTING.md` 第 29 条：原生 Workflow 不可用时，用相同任务卡与审核关卡以普通子代理串行/受控并行执行，且不得声称已启用原生模式。**本轮未生成任何 workflow 脚本或子代理定义**——生成前需先确认上述四个工作流的边界与授权，避免产出假可运行脚本。

## 4. 目标仓库核查（GIT-001）

| 项 | 实测值 |
|---|---|
| 仓库 | `zhouhaot/foreign-trade-independent-websit` |
| 可见性 | **公开**（`private: false`） |
| 默认分支 | `main` |
| 覆盖前 HEAD | `21089ca25f45ae5391b6f7016ba3e96a0542af82` |
| 覆盖前内容 | TradePlus 外贸独立站系统，130 个文件，6 次提交（2026-05-27 ～ 2026-06-05） |
| SSH 连通性 | **失败**：`Connection closed by 198.18.0.12 port 22`（本机代理拦截） |
| HTTPS 连通性 | 正常，`gh` 认证可用 |

### 处置记录

- 用户授权"直接覆盖"，并选择"打 tag 保留基线后覆盖"。
- 已创建并推送带注释 tag `archive/tradeplus-baseline` → `21089ca`，TradePlus 完整内容永久可恢复（`git checkout archive/tradeplus-baseline`）。
- 覆盖以**普通提交**完成，未使用 force-push，未改写远程历史。
- 因 SSH 被拦截，远程固定使用 HTTPS。凭据由 `gh`/系统 keyring 管理，未进入对话、提示词或日志。

### 仓库可见性提示

仓库当前为**公开**。`GITHUB_PLAN.md` 第 9 条建议"优先私有"，且 `ACCEPTANCE.md` AC-20 要求提交与导出不含真实客户信息或密钥。新项目将包含毕设业务逻辑，是否改为私有需用户决定（见 `OPEN_QUESTIONS.md` Q-01）。在决定前，所有提交仅使用合成测试数据。

## 5. 放行判定

| 放行条件（WORKFLOW.md P0） | 判定 |
|---|---|
| Java/构建/数据库/前端工具链可识别 | **部分满足**：Node/Docker/git 可用；JDK 与 Maven 缺失 |
| 所需模型工具链实测或明确阻塞 | **满足"明确阻塞"分支**：路由配置已识别，逐模型工具闭环未实测，已标记 BLOCKED |

**结论**：P0 可放行至 **P1 需求梳理**（不依赖 Java 与付费模型验证）。P3 工程骨架在 JDK/Maven 处置方案确定前不得启动。SET-002 模型工具链验收在预算授权前保持 BLOCKED。
