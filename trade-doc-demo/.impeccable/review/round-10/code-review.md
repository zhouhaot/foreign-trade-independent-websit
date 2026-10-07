# 第 10 轮独立综合代码审查

日期：2026-10-07。基线：`4e71de03c980fdd15b25bfdce699512ee8111fc5`。读取 AGENTS、HANDOFF、H21 规划与 sales 逐项说明，检查 staged/unstaged 差异和 OC handler、共享 decimalInput、字段反馈、H20 modal/Promise 上下文及新增专项测试。本代理只写本报告，不修改源码/旧脚本/Mock/交接/其它材料/Git，不操作浏览器。

代码结论：APPROVE。当前局部差异没有未解决高置信问题；不为结论制造 stylistic 或未变模块问题。真实 UI、布局与推送仍由中枢分别验证。

## 范围与行为

运行差异只在 views-sales 的订单变更弹窗金额附近：新增 inputmode/描述 hint，切取消清金额容器错误，改价初值先直接传原文给 U.decimalInput，成功使用 candidate.value，金额不再经通用 Number/raw 兜底。失败 fieldError+焦点返回位于 setModalBusy/disable/loading 前，不能先新增申请/日志或 clean/关窗。

普通正十进制、至少0.01、最多两位、安全整数分与 Number 无损往返沿现有 helper；金额标题和 targetAmount 来自同一候选。正常外侧空格/前导零兼容，不猜逗号、指数、hex、正号或区域表示。完整原始金额/原因和错误原节点保留，修正再提交会清错误而保 oc-amount-help 描述。

取消隐藏金额没有 parse，targetAmount 仍 null；切取消只 clearErrors 金额 wrap，不改 raw，切回改价重新校验保留的原文。原申请、主管数值检查/已收下限/改价等比候选、订单/收款/单证/旧历史不洗写。H21 是申请输入口径，合法 0.01 不能被误称必定获批；本轮没有增加申请阶段已收下限或企业正式金额制度。

原 H20 源 modal/current、原控件/raw、actor 引用/内容、订单对象/状态/币种、同类待处理与重复提交、450ms loading 首守卫、失败解锁、480ms 原窗关闭检查和源 modal clean 保留。差异没有修改 QC、utils、app、finance、权限/审批算法或 Mock。

## 独立实际验证

- 新 `verify-change-request-amount.cjs` **58** 例 PASS：31 非法初值全 MOCK 零写/无 busy/loading/未禁用、原节点/金额/原因/ARIA/焦点保留；8 合法值的独立整数分和标题对照；修正/原因必填、7 隐藏非法取消、切回、8 H20 漂移与旧480ms回调不关新窗。
- 实际只读加载基线 sales 到隔离 fixture，重放规划原七例（指数两例、hex、Infinity/溢出、超两位、不安全精度）：**7/7 基线确实新增申请**；再加载当前 sales 同样七例，**7/7 完整 MOCK 不变并保原金额/字段错误**。没有修改正式 Mock、删除旧申请或把 Infinity 的 JSON null 当实际存值；基线加载只为独立红→绿取证。
- 另做 **66 个近安全分边界** 实际 OC 提交对照：从 MAX_SAFE_INTEGER 分附近用宿主 BigInt 构造原十进制文字，独立检查安全范围与 Number 最短十进制回算分，不以生产 helper 自己作为 oracle。**39 个可无损候选** 实际 targetAmount/独立分值/标题一致，只新增一笔申请与一条日志；**27 个不可无损或不安全候选** 完整 MOCK 零写。额外标尺不替代正式业务金额范围。
- 原相邻 `verify-sales-modal-drafts.cjs` **40**、change-request **25**、modal-drafts **45**、quotation-contract **103**、decimal-contract、repricing、cancellation 全部独立 PASS。原快速重试、busy/error/来源与历史断言未删除或更改。
- 修改 JS 与新增专项脚本语法、git diff-check PASS（仅 Git 换行提示）。源文件差异与说明一致，没有共享 parser/旧脚本/财务/数据改动。文本反馈沿既有安全渲染，新增 helper 不生成 HTML、远程请求或依赖。

## 证据边界

以上为真实源码/动作/Promise 的隔离 Node DOM 模型与字符串/整数对照，没有认领原生键盘、读屏、浏览器两宽布局或正式后端事务。Node 定时器 fixture 的压缩执行不是480ms实际浏览器认证；原 H20 专用脚本实际覆盖其既有 timer 策略，保留各方法边界。

本轮不证明真实员工身份、正式金额/退款/FX/批准制度，也不扩称所有历史申请均合法；旧申请未洗写、主管原审批边界另有相邻回归。file://、跨浏览器、打印/PDF/签署/NAS、真实测量和持久化均不从本报告 PASS 推断。UI 最晚文案相邻变更若到达，将仅按实际变化补审，不倒写为本次已审版本。

## 最晚提示文案有限补审

首次 APPROVE 后中枢仅将常态长格式说明缩为“填写至少0.01的金额，最多2位小数，例如24000.00。”，保留当前订单金额/币种前行、help ID 和描述引用、原 helper 详细错误。已实际回读最终文件 SHA-256：`29FB5C3A64232DED67AFC6D4C4EB7FD93DFD35F2258278FEF3781D359DB0E9B7`，与中枢指定一致。

最终 git diff 的其它候选/清错算法与首审相同；额外正规化换行并仅把新 hint 恢复为首审旧 hint 后计算 Git blob，精确匹配首审 diff 的 `bd548ce` blob 前缀，证明未夹带算法变化。最终文件专用 **58**、sales 语法与 diff-check 又由本代理独立执行 PASS。原首审独立 **40/25** 仍对应相同算法，中枢另报告最终58/40/25重验0；不把后两份中枢重验认领为本次额外独立执行。

提示仍说明下限、两位和示例，详细拒绝原因继续就近展示，没有改变隐藏取消金额/审批/历史/来源守卫。有限文案补审继续 APPROVE，不认领首五图或 UI SHIP/Git 同步。本代理至此结束本轮审查，没有修改其它文件。

## Review Summary

| Severity | Count | Status |
|----------|-------|--------|
| CRITICAL | 0 | pass |
| HIGH | 0 | pass |
| MEDIUM | 0 | pass |
| LOW | 0 | pass |

Verdict: APPROVE — 局部 H21 初值契约与保留的 H20/取消/旧审批边界实复验通过，当前无未解决发现；不认领 UI SHIP、Git 已同步或生产业务认证。
