# 外贸订单与单证管理系统

## 当前进度与接续入口（2026-10-06）

最新可运行的静态前端位于 [`trade-doc-demo/`](trade-doc-demo/README.md)。2026-10-07 已落地 A（珍珠白 / 鸢尾紫 / 薄荷青）：浅色窄导航、订单列表与详情并排核对、完整表格切换。没有后端、真实鉴权、数据库或生产部署。每轮改进与复盘见 `trade-doc-demo/docs/iterations/`。

另一台电脑执行：

```sh
git clone https://github.com/zhouhaot/foreign-trade-independent-websit.git
cd foreign-trade-independent-websit/trade-doc-demo
```

双击 `index.html` 即可运行；或按子目录 README 启动本地静态服务器。用编辑器或 Codex 打开 `trade-doc-demo`，先完整阅读 [`AGENTS.md`](trade-doc-demo/AGENTS.md)、[`HANDOFF.md`](trade-doc-demo/HANDOFF.md)、[`PRODUCT.md`](trade-doc-demo/PRODUCT.md)。最新 A 选择、已完成的登录/退出流程、验证覆盖和未解决的业务风险均已记录；不能从历史 C 候选继续实施。

根目录 `docs/`、`tasks/`、`prompts/`、`templates/` 和 `manifest.json` 保留 2026-09-20 的规划包，仅作为历史规划。其候选技术栈、阶段状态和岗位分配不自动覆盖子目录当前规则，也不构成启动后端的授权。当前 Demo 的唯一交接渠道为 `trade-doc-demo/HANDOFF.md`。

本次仅同步源码、说明及设计/验收资产，不启用 GitHub Pages、不部署；旧本机备份、旧 ZIP 与工具临时状态不在仓库中。

---

## 历史启动包（2026-09-20，保留原文）

日期：2026-09-20。状态：P0 预检已执行（JDK/Maven 缺失为硬阻塞）、P1 需求草案已产出待确认；尚未开发业务代码；已推送本仓库（原 TradePlus 项目保留于 tag `archive/tradeplus-baseline`）。

本包服务于毕业设计《基于 Spring Boot 的外贸订单与单证管理系统的设计与实现》。它包含需求边界、岗位分工、完整阶段流程、任务清单、验收规则和 Claude Code 启动提示词，不包含业务源代码，也不包含已验证可运行的原生 Workflow 脚本。

## 使用顺序

先阅读 `docs/PROJECT_BRIEF.md` 与 `docs/MODEL_ROUTING.md`，再阅读 `docs/WORKFLOW.md`。将本包作为新项目的初始文档；已有仓库应先比较差异，不覆盖原有规则。把 `prompts/START_HERE.txt` 交给项目目录中的 Claude Code。

`CLAUDE.md` 是协作规则。`templates/TASK_TEMPLATE.yaml` 是任务数据模板，不是 Claude Code 自动执行的配置。需要在本地确认 Claude Code 版本、原生 Workflow 能力和中转接口后，才生成 `.claude/agents/` 与 `.claude/workflows/` 中的实际配置。

## 尚待确认

学校任务书和材料格式、最终业务范围、实际模型 ID 和接口权限、允许的模型调用预算、GitHub 仓库地址/归属/可见性、目标演示环境。缺失信息只阻塞相关步骤，不应阻塞文档梳理。

## 首轮交付

首轮只完成环境与接口配置检查、需求规格草案、权限矩阵、状态转换草案、疑问清单和下一阶段任务。不跳过需求确认直接生成整套业务代码。
