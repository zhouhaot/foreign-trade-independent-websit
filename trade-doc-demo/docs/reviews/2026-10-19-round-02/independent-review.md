# 第二轮工程改进独立复核

2026-10-19。复核人未参与实现，仅可写本报告与 `evidence/reviewer-*`。正式项目为 `/Users/airuquan/foreign-trade-independent-websit/trade-doc-demo`。

结论：APPROVE，限下列冻结工程脚本的源码与 Node 契约复核；本次独立发现的三类阻断均已按原反例关闭。没有运行浏览器、全套产品回归、真实接口、数据库或生产验收。主控负责真实 Ego 与完整回归收口，本报告不批准真实浏览器全场景或生产放行。

## 历史门禁分离

已逐段比较四脚本改动与原断言：审批上下文当前角色/目标/转义/纯读断言保留；工作台四岗位当前指标与权限断言留在历史条件块外；文案与横幅的当前 Views/Actions、取消/恢复/修订与快照检查保留。横幅不再依赖旧 Git 生成当前预期，改为按原事实字段拼出精确预期；历史模式继续保留原 HTML/源码精确相等、有限槽位归一和反破坏断言。

`--archive` 显式开启历史门禁；默认输出 `ARCHIVE NOT_REQUESTED`。缺 Git 或对象非零退出 2，标 `BLOCKED MISSING_HISTORY`；实际断言失败退出 1。无自动 fetch，无历史源码 fixture 新资产。approval 原源码切片新增 marker 恰好一次断言，避免 `indexOf=-1` 造成误判；Git 操作有 30 秒上限。当前 case 输出已扣除历史专属计数。

本次实际执行：

- 修前新 `verify-history-gates.cjs` 默认及 `--archive` 都退出 1。前三脚本边界通过，action 脚本零当前源码读取。原因是通过 `require(entry)` 加载带 `require.main===module` 保护的入口，未真正执行其场景；已发主控并由作者修正。
- 修后 `node scripts/verify-history-gates.cjs --archive`：20 场景通过，退出 0。覆盖真实无 Git 临时副本、四脚本当前源码读取、四当前变异拒绝、四缺历史退出 2、全部历史依赖及四历史变异拒绝。该命令包含默认 12 场景，不将两组数字相加。
- 独立 [reviewer-history-probes.cjs](evidence/reviewer-history-probes.cjs)：22 场景通过。用真实 `node -r preload entry` CLI 执行，未替换 fixture。四当前模式零 Git 调用且实际读取当前 JS；独立变异关联对象标签、财务当前事实、待审横幅事实、修订草稿状态均退出 1；四缺历史退出 2；四历史来源污染及四成功但空的 Git 输出均退出 1；approval marker 缺失/重复均退出 1。

`historySource` 本身对 status=0 空字符串未单独拒绝；本次已对四实际门禁注入空内容，全部由精确断言拒绝，未形成现行假绿灯。缺对象的 action 模式会在载入当前 JS 前阻断，属于真实控制流，不要求阻断场景完成 current 执行。

过程纠正：独立探针初版使用 `Module._load` 模拟 main，随后改用真实 CLI preload 以减少模拟；初版又错误要求缺历史时仍先读取当前源码，action 的归档源先求值使该预期失败，现仅缺历史场景免除此要求。原运行结果未用作产品缺陷；最终 22 场景成功后不再重复无变更检查。

## 浏览器入口

已完整阅读旧入口、改后入口、上轮 matrix/business/quality 场景与本轮新契约。入口显式要求 caller-owned 空间、p1、可丢弃授权、loopback HTTP 基址及全新绝对 JSON 路径；无创建/接管/finish 空间或全局清存储/缓存操作。无配置、失效空间及旧报告不可静默继续，旧证据拒绝覆写；无有效输出目的地只返回内存 BLOCKED 回执，不另造 fallback 路径。阶段预建 NOT_RUN；fixture 显式 reload 隔离，连续同单链内不 reload。

矩阵源码保留五岗 100 路由 / 300 三尺寸观察；业务源码含 545 USD 新询盘→报价→成单、超收拒绝、先收 100、首制双单/缺包装拒绝/送审、主管审核欠 445、结清、导出演示、V2 保 V1 八组；质量源码保留并扩为十一组。金额预期由浏览器外独立 BigInt 十进制解析、数量×单价整数分和收款求和产生，没有把产品金额 helper 同时用作预期。以上是源码覆盖检查，不能代替主控真实执行。

按 ego-browser Skill 及其 API 参考核对用户接管、inactive、policy 和安全超时规则。独立 [reviewer-browser-probes.cjs](evidence/reviewer-browser-probes.cjs) 读取并冻结被测源码、记录 SHA，以模拟 Page/TaskSpace 只检查生命周期，始终为 contract-double，不能产生真实 Ego PASS。

独立发现及关闭过程：

1. 初版仅在错误 message 中搜索 executionStopped，结构字段的 false 值也未识别；策略拒绝虽标 BLOCKED，仍继续操作。对 `executionStopped:false/pageResponsive:true/mayHaveLateEffects:true`、三个字段全 false、URL denied 三反例，旧稿继续后两阶段、诊断与清理。修后保留元数据、原检查/阶段 BLOCKED、后两阶段 NOT_RUN、安全停止后零 Page 动作，cleanup 全部 SKIPPED 说明待主控判断恢复；不通过清理绕过停止。
2. override 先应用但响应丢失时，旧稿成功回执后才记 flag，导致 viewport 没清除。修后分别记录 attempted/applied/restored：普通工具错误保持 FAIL，attempted=true/applied=false 仍定向恢复，最终 restored=true；安全未知状态跳过恢复并如实记录。
3. 首修稿在产品断言失败后的诊断捕获安全超时时，把原 product 分类覆成 blocked，最终掩盖原 FAIL。额外第五反例再次 RED；修后原 product failure 与检查/阶段 FAIL 保留，安全捕获独立列 blocked 元数据，stage.stopped=true、后续 NOT_RUN、零后续 Page 动作，整体仍 FAIL。

实际最终执行：`node scripts/verify-browser-contract.cjs` 38 契约检查 PASS，退出 0；`node .../evidence/reviewer-browser-probes.cjs --expect-fixed` 五组独立生命周期反例均满足预期，退出 0。已回读最终五份 JSON，核对元数据 false 值、原 product/tool 分类、阶段 NOT_RUN、停止后跳过清理及 attempted/applied/restored。脚本语法由主控总检查，本作者另确认 `git diff --check` 和 `git diff --exit-code HEAD -- index.html js css` 均退出 0。

原始四组 RED 证据为 `evidence/reviewer-browser-1792377696600-30398-*.json`；额外第五组 RED 为 `evidence/reviewer-browser-1792377788733-31538-product-then-capture-safety.json`；最终五组为 `evidence/reviewer-browser-1792377817707-32215-*.json`。38 契约实跑摘要为 `evidence/browser-author-contract-1792377817747-32210-summary.json`。反例报告自身的 result=FAIL/BLOCKED 是预期注入结果，独立探针“通过”指该分类与停止/恢复行为符合预期，不把它们改写为产品业务 PASS。

## 受审指纹与边界

| 文件 | SHA-256 |
|---|---|
| scripts/verify-browser.mjs | d673f55dd95fbad0f52a7c32f7564e87d2d3b187b6bf50864297500fc969b760 |
| scripts/verify-browser-contract.cjs | 6f0e89a6f74396b20bc60f3e260db90d1fb4648376d26e677445ce34a63bbcc9 |
| scripts/history-gate.cjs | b0971a05f1f6988231b9c76f45cd193201acf730b04a6347446edcb28e818519 |
| scripts/verify-history-gates.cjs | d2a0a973b9830ecb7fa168287a63c9a2b887f565e9e20fba082177c4afe88f9d |
| scripts/verify-approval-context.cjs | 9e36f1cf480acac926cc51d6ab7310d2a030c98324f90fa860b348dff940e427 |
| scripts/verify-document-dashboard.cjs | 0d874c4dfb8aa05150f0e62721d95899f7e7c224cef48c6ad2dc68f7dcbea206 |
| scripts/verify-document-status-guidance.cjs | f43e824b6c35a0ad8553e28dfecdde6b1490ff6539c895fbea25c09076c635f9 |
| scripts/verify-document-action-guidance.cjs | 04fa03fd921981db4f29d6332c69927c00aceb097f93244460849030fca05474 |

以上批准只针对这些字节与已列执行。主控真实 Ego、100/300 矩阵、十一质量与八业务场景、file 策略、视觉、完整 42+ 回归须各自保留实际状态；此处未执行的项目不能从 Node 契约推为已通过。生产身份、数据库、真实导出、部署和容量全部不在本轮工程脚本批准范围。

## run01 后工具诊断增量补审

主控通知真实 run01 的同单业务八组通过，矩阵与部分质量场景出现 readiness 超时；根因尚未确定，不能据此断言产品错误，也不能把其余局部成功改成总 PASS。原 `browser-run-01.json` 保留。本次只补审作者获得批准的阶段汇总与 bootState 诊断两处工具增量，不重新解释 run01，也未执行真实浏览器。

增量判断：阶段状态现在直接由已有检查结果及该阶段 failures 归纳，普通工具超时仍为 FAIL/tool，不再额外生成“质量阶段包含失败”等伪 product 错误。矩阵完整计数门禁在没有既有失败时仍严格要求 100/300；有既有失败时保实际 coverage 与原失败，不能变 PASS。原逐项路由、布局、业务和质量断言保留。

ready 失败时仅在没有安全停止信号的条件下作一次只读 bootState 采集，记录 globals、readyState、样式规则、脚本 timing、角色控件和监听器是否存在；`errors:null` 与“监听器存在且 errors:[]”明确区分，不能把前者解释为无运行错误。原 ready 已有安全收据时不采集；采集自身触发安全停止时单列 blocked，原 tool 分类保留、后续阶段 NOT_RUN、无后续 Page 动作。没有新增自动 retry、重排 goto/reload 或调用 rerender。代码只读这些属性，没有为了诊断写页面业务状态。

实际复验：新版 `verify-browser-contract.cjs` 42 组 PASS，退出 0，摘要 `evidence/browser-author-contract-1792378217760-39677-summary.json`；原五组独立生命周期探针再次全部符合预期，退出 0，五份报告前缀为 `evidence/reviewer-browser-1792378217720-39680-`。此前 38 组与本次 42 组是版本递增复验，不相加计数。

增量结论：APPROVE，仍仅限工程脚本与 Node 模拟契约；真实最终浏览器及稳定全量检查仍由主控执行、回读并独立给出实际状态。本次补审未使用“8015 已启动”替代真实浏览器通过，也未对 run01 超时原因作未经证实的归因。

本次最终冻结指纹（仅以下两文件较上一节改变，其余六项原指纹继续适用）：

| 文件 | SHA-256 |
|---|---|
| scripts/verify-browser.mjs | 6b841748ecd3a94a3ef6f6af4e0d5ef3ef1b3fa9c3b1fb58c1848d45b05d6c95 |
| scripts/verify-browser-contract.cjs | fcf99fda50cf78ab8298ed7ca68e68f68fad4b24595cb329e5b262682d8e7070 |
