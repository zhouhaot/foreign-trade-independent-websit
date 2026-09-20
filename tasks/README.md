# 任务卡目录

任务卡按 `templates/TASK_TEMPLATE.yaml` 数据模板填写，一卡一文件。
状态流：DRAFT → READY → RUNNING → VERIFYING → REVIEWED → DONE；可转 NEED_FIX / BLOCKED。
纪律：`actual_model_id`、`baseline_commit`、允许路径和测试命令未填实的任务不得标记 READY；实现者不能做自己改动的唯一审查人。

| 文件 | 任务 | 状态 |
|---|---|---|
| SET-001.yaml | 环境与现有目录检查 | DONE |
| SET-002.yaml | 四模型真实路由和工具链验收 | BLOCKED（等预算授权 Q-20） |
| REQ-001.yaml | 需求规格、范围和疑问 | VERIFYING（草案已出，等用户确认范围与 Q-01～Q-19） |
| REQ-002.yaml | 权限/状态/字段责任独立复核 | READY |
| GIT-001.yaml | 检查目标仓库与推送范围 | DONE |
| GIT-002.yaml | 首次文档基线推送 | DONE（远程 main = 7dbd3b6，已回读核验） |
