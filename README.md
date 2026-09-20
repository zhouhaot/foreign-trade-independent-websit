# 外贸订单与单证管理系统：多模型协作启动包

日期：2026-09-20。状态：方案草案 / 尚未开发 / 尚未接通模型 / 尚未推送 GitHub。

本包服务于毕业设计《基于 Spring Boot 的外贸订单与单证管理系统的设计与实现》。它包含需求边界、岗位分工、完整阶段流程、任务清单、验收规则和 Claude Code 启动提示词，不包含业务源代码，也不包含已验证可运行的原生 Workflow 脚本。

## 使用顺序

先阅读 `docs/PROJECT_BRIEF.md` 与 `docs/MODEL_ROUTING.md`，再阅读 `docs/WORKFLOW.md`。将本包作为新项目的初始文档；已有仓库应先比较差异，不覆盖原有规则。把 `prompts/START_HERE.txt` 交给项目目录中的 Claude Code。

`CLAUDE.md` 是协作规则。`templates/TASK_TEMPLATE.yaml` 是任务数据模板，不是 Claude Code 自动执行的配置。需要在本地确认 Claude Code 版本、原生 Workflow 能力和中转接口后，才生成 `.claude/agents/` 与 `.claude/workflows/` 中的实际配置。

## 尚待确认

学校任务书和材料格式、最终业务范围、实际模型 ID 和接口权限、允许的模型调用预算、GitHub 仓库地址/归属/可见性、目标演示环境。缺失信息只阻塞相关步骤，不应阻塞文档梳理。

## 首轮交付

首轮只完成环境与接口配置检查、需求规格草案、权限矩阵、状态转换草案、疑问清单和下一阶段任务。不跳过需求确认直接生成整套业务代码。
