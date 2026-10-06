# 第9轮独立代码复审

日期：2026-10-07。复审基线：`d03c9a055ec10c1bf0171669ce0d15a90d820e01`。本代理只读源码/测试并运行独立 Node 验证，唯一写入为本文；未改业务、测试、Mock、治理或 Git，也未运行 CUA。

本文保留初审历史；最新结论以文末“最终独立复验”与最后一份 Review Summary 为准。

## 当前复审状态

共享保护初版和普通重复关闭修正版已经独立审阅并实跑。销售/主管接入正在整合；下述 MEDIUM 尚待修复与独立重验，本文当前不是整体 APPROVE 或 UI 验收。

## [MEDIUM] 销售失败后的快速重试会永久锁住原弹窗

位置：`js/views-sales.js:381`（客户确认），`js/views-sales.js:979`（订单变更）；相关旧 helper 为 `js/utils.js:478`。

两个销售 handler 在调用 `U.withLoading` 前先设置 modal busy、禁用原字段。首次失败时 `finally` 立即释放 busy/恢复字段，但 `U.withLoading` 仍在 450ms loading 展示期。期间再次激活按钮，会先重新获得 busy，再被 helper 的 `if (btn.classList.contains('is-loading')) return;` 跳过实际回调，于是没有任何后续释放，字段保持 disabled，X/取消/Esc 永远报告正在处理。按钮只靠 CSS `pointer-events:none` 拦鼠标，未设 disabled，键盘激活不受这个 CSS 约束。主管 handler 已在设置 busy 前检查 loading，不存在同一缺口。

独立实际反例：使用原 `fixture(['views-sales','app'])`，现有 SO2026005 与其原待处理改价申请，不增删 Mock；原 `U.withLoading` 保持不变，VM 的 `setTimeout` 改为 Node 原生时钟以观察实际 450ms。输入申请原因，点击提交，等待两个 Promise 微任务后看到“已有待处理”拒绝、字段恢复、按钮仍 loading；再次触发该 enabled 按钮的 click；等待 520ms 后按钮 loading 已消失，但原因字段仍 disabled，`requestModalClose(source)` 仍提示正在处理，原 overlay 保留，全 MOCK 与操作前相同。实际输出 `RED CONFIRMED`。最初一次探测因 fixture 初始 disabled 为 undefined 而断言失败，已改为布尔判断后复现；不是业务反例失败。

建议：两个销售 handler 在设置 busy/禁用字段之前拒绝 `btn.classList.contains('is-loading')`；补失败后 loading 间隙的快速重试与后续可编辑/可关闭证明。独立 Node 事件能证明代码时序；未将它表述为原生键盘已验证。

## 已实际运行的证据

- 共享初版 `verify-modal-drafts.cjs`：40 PASS；普通重复关闭改为幂等、Esc 显式 `continueDraft` 后重新运行：43 PASS。
- 独立内联反例：27 PASS，覆盖无绑定/重复/readonly 注册拒绝、重复 busy、原始空格 dirty、label 转义、alertdialog 与原 modal sibling/inert/aria-hidden、guard Tab 首尾优先、旧 guard/旧关闭按钮不影响新源，以及旧 U.confirm 回调内部打开新弹窗不被后续关闭。
- `verify-document-workspace.cjs` PASS，`verify-navigation-drafts.cjs` 33 PASS，`verify-draft-adapters.cjs` 17 PASS。
- 当前接入 `verify-approval-modal-drafts.cjs` 20 PASS，`verify-sales-modal-drafts.cjs` 19 PASS，旧 cancellation/repricing 两脚本 PASS。旧金额/取消桩的 current/busy/clean 模型只作为旧业务回归；原 DOM 保护由新专项及独立用例提供。
- `verify-context-navigation.cjs` 实际 FAIL：第124行客户确认成功仍期待 page `clean` 后 rerender，实际只有 rerender。新契约只清原 modal，不洗 page 草稿；已反馈主代理需有限更新旧期待。该运行未记为通过。

## 审查边界

源验证只认 modal-root 当前第一 overlay；关闭选择保原表单 DOM，并临时 inert/aria-hidden，独立 guard 具名。busy 在异步启动前同步设置；成功 clean/close 绑定实际源，oc 已 commit 的 480ms UI 收尾不关闭后来的弹窗。保留既有权限/对象/内容/生命周期/金额/自审约束，不把 H20 扩成页面导航或持久化。旧无参数 `closeModal()` 仍是显式程序强关兼容入口，用户关闭由 request 接管。

Node 最小 DOM 不模拟完整原生事件、CSS 布局、输入法、浏览器历史或读屏，也不是后端事务/并发验证。原生 UI/截图复审由主代理与 UI 代理执行。

## Review Summary

| Severity | Count | Status |
|----------|-------|--------|
| CRITICAL | 0 | pass |
| HIGH | 0 | pass |
| MEDIUM | 1 | pending fix and independent recheck |
| LOW | 0 | pass |

Verdict: REVIEW IN PROGRESS — MEDIUM 待独立复验，整合尚未冻结。

## 最终独立复验

**独立代码结论：APPROVE。原 1 MEDIUM 已 Resolved；未发现仍需修改的 CRITICAL/HIGH/MEDIUM/LOW。** 此为下面源文件指纹对应的代码与 Node 行为结论，不是原生 UI/读屏/后端验收或 Git 推送回执。

### MEDIUM 修复与独立重放

销售 worker 在两个销售 handler 首行加入 `e.currentTarget.classList.contains('is-loading')` 检查，位置为 `views-sales.js:369`、`:967`，先拒绝旧 loading 中激活，再触及草稿 busy/字段。保持上述最初 RED 记录，不以现 GREEN 重写历史。

我独立重放原 SO5 反例：原待处理改价导致首次拒绝，450ms 中再次激活；520ms 后字段仍可编辑，全 MOCK 不变，X 可打开同源填写选择，继续仍保原原因。另用 QC 原字段在 Promise 前 A→B 漂移触发失败（隔离脚本程序改变 disabled 字段，不声称普通用户可改）；450ms 中重试被忽略而未重新锁窗，520ms 后可继续，新的合法登记成功关闭原窗。使用真实原 helper/Promise 与 Node 原生时钟，两个独立回归均 PASS。

### root 自发现的旧选择票据：独立复核

root 自核发现，同 overlay “继续填写”后旧 discard callback 可误关仍在原源；再次出现新 guard 时旧 continue 可解除新选择。root 先完成 2 RED，再把两个选择按钮闭包绑定 `state.guard === guard && guard.isConnected !== false`。这项不是本代理原始发现。

我独立保存 g1 的旧 continue/discard，继续 g1 后触发旧 discard，原源与原文保留；再打开 g2，触发 g1 两个旧回调，g2 节点身份与原源仍保留，g2 当前 continue 才恢复。两个同源旧选择独立回归 PASS。阶段 shared 40→43→45 分别为初实现、重复关闭幂等、选择票据防重放；这些数字来自各阶段实际运行，不表示原生 inert 可被用户绕过。

### 最终实际回归

最终重新读取全部5个修改源码 diff 与相关 helper/callers，检查6个旧测试文件适配（cancellation、repricing、change-request、snapshots、context-navigation、quotation-contract）。原金额、角色、重复处理、快照断言仍留；H20 与旧 page-clean/排队取消/输入漂移期待冲突的部分被明确改为源 modal 契约，不降低生产身份条件。

以下12个脚本逐项实际运行，均 exit 0：

| 脚本 | 最终结果 |
|---|---|
| verify-modal-drafts | 45 PASS |
| verify-sales-modal-drafts | 21 PASS |
| verify-approval-modal-drafts | 21 PASS |
| verify-context-navigation | 194 links/source + 15 integration PASS |
| verify-quotation-contract | 103 PASS |
| verify-change-request | 25 PASS |
| verify-navigation-drafts | 33 PASS |
| verify-draft-adapters | 17 PASS |
| verify-document-workspace | PASS |
| verify-cancellation | PASS |
| verify-repricing | PASS |
| verify-document-snapshots | PASS |

独立内联用例为早期27、修正版重复关闭/oc隐藏金额4、最终销售loading2与root旧选择2，累计35实际检查/场景，粒度不与专用脚本数量合并。utils/app/sales/fin 四文件 `node --check` 全部实际通过。一次误写不存在的 `verify-quotation-workflow.cjs` 得到 MODULE_NOT_FOUND 后已定位真实 `verify-quotation-contract.cjs`，真实脚本最初旧时序 FAIL 与最终103 PASS均保留为不同阶段，不把不存在脚本列为验收。

最终复验源码 SHA-256（文件名依次对应独立读取的真实输出）：

| 文件 | SHA-256 |
|---|---|
| js/utils.js | 29BBDB784CD8B0011D3DF0A060B52759241E79757BED0CECCD9A89511CE9D6DF |
| js/app.js | 04BF6665B37D40DE2B4DE639DB2617B37FF3545C5EA66C737499EEB4EE80F3FF |
| js/views-sales.js | 6304B7FE53AD25D50FF3D15287A2FDDA42B4B2F22EA1822871F24F44BECCAC84 |
| js/views-fin.js | E4D0E9A329CD4BEC81506E19F7614657F5E2B9B6BB50D4B29052F8AF06AD97A6 |
| css/pages.css | 67BDC8B6B98639D8F7052975B08DDD87A6C32D0B78E74343066CCCAA02C8995D |

后续若 UI 修正再修改这些源码，应以实际差异补审；本文不预判尚未执行的原生浏览器结果。

## Review Summary

| Severity | Count | Status |
|----------|-------|--------|
| CRITICAL | 0 | pass |
| HIGH | 0 | pass |
| MEDIUM | 0 | pass; original 1 resolved and independently rerun |
| LOW | 0 | pass |

Verdict: APPROVE — 当前指纹对应的代码与有限 Node 回归通过；原生 UI 与本轮交付由各自实际证据确认。

## 销售源码冻结后补审：OC 操作者内容与原节点替换

在上述阶段 APPROVE 后，sales worker 补查并修复同一 actor 对象的内容漂移：`views-sales.js:935` 在打开订单变更时保存 `JSON.stringify(actor)`，`:988` 在实际写入之前与当前原 actor 内容重比，同时继续核 App.user 引用/角色、订单对象/状态/币种。此模式与既有报价/询盘上下文一致；不因引用仍相等就把后来更名的身份用于旧申请留痕。另有 OC try/finally 缩进调整，未改变执行顺序。未更改共享 API、主管业务或 CSS。

我实际读了新完整销售 diff、专用40场景及11项销售说明，并核对 context-navigation 新 sourceClean 包装保真实 API、仅成功清本次 overlay、其余取消/漂移不清。新增五字段同 id 同值替换用例在提交后微任务前用新的控件替换原节点，要求完整 Mock 不写而保替换节点；不是把相同 id/值等同源身份。

独立内联另运行9场景：同一 actor 引用的 id/name 分别在点击前/已排队后改变4例；QC日期/说明与OC类型/金额/原因，在已点击后以同 id 同 value 新节点替换原节点5例。全部 PASS，逐项比较以隔离外部变化之后为基线的完整 Mock；无业务写/无假成功，原 overlay 仍在且失败后能请求同源选择。没有用新用例抹掉早期35阶段，本阶段新增独立9（累计44）；原生用户不会通过此脚本修改 disabled 控件或卸载节点，此证据限于实际函数的来源防漂移。

本次按受影响范围最小重跑，实际 `verify-sales-modal-drafts` 40 PASS、`verify-quotation-contract` 103 PASS、`verify-change-request` 25 PASS、`verify-context-navigation` 194+15 PASS，`node --check js/views-sales.js` PASS；原先12脚本及共享45/主管21记录仍属前阶段，没有无理由重跑或套写数字。

最新冻结 SHA-256：`js/views-sales.js` = `28754BCA3B19D33103C5B61D1BB9D2D7868E448E1F746713BD3F711993B62B9A`。我再次实际读取其余4文件指纹，均与上一表相同；上一表的销售 `6304...` 仅代表补审前阶段，以本行替换其冻结指纹。

## Review Summary

| Severity | Count | Status |
|----------|-------|--------|
| CRITICAL | 0 | pass |
| HIGH | 0 | pass |
| MEDIUM | 0 | pass; original 1 remains resolved |
| LOW | 0 | pass |

Verdict: APPROVE — 销售冻结后的身份内容重查/节点替换补审通过；对应新销售指纹与原4文件指纹，原生 UI/读屏/后端边界不变。

## 原生 UI 首评后的 CSS 有限补审

问题来源为 UI agent 对首12过程图的实际阅读：原 `.modal.is-draft-obscured { opacity: .24; }` 将整个原卡片连白底一起透明化，后页文字可透过并产生叠字。这是 UI agent 发现，不是本代理截图复现；首图仍为过程，不能据此写 UI SHIP。

我独立只读复核 root 的局部修复：`pages.css:547` 将源 modal 本体 opacity 保为1，`:548–550` 仅对其直接 `.modal-head/.modal-body/.modal-foot` 子元素设 .24。base.css 的原 `.modal` 白色背景和 `--card:#ffffff` 实际存在；独立 guard 是同 overlay 的 sibling，因此不匹配这三个子选择器，不会随源表单一起变淡。`pointer-events:none`、尺寸、guard布局与原 inert/ARIA/DOM 机制未改；恢复移除源 class 后，不再匹配子变淡规则。

这次仅检查 CSS 差异及与实际 DOM/CSS 的作用关系，不重复已通过的全部 JS 回归。四 JS 指纹实际重读均与上次冻结相同。最新 `css/pages.css` SHA-256 = `3AC45130119068980E2D7070F3B48342B479CF6C0323FA3B07105E7E796E6DB3`，取代前阶段 `67BDC...`。终图是否消除叠字及两宽阅读由 root 重载实测与 UI 终审另行确认。

## Review Summary

| Severity | Count | Status |
|----------|-------|--------|
| CRITICAL | 0 | pass |
| HIGH | 0 | pass |
| MEDIUM | 0 | pass; original 1 remains resolved |
| LOW | 0 | pass |

Verdict: APPROVE — 新 CSS 局部作用范围正确，四 JS 冻结指纹未变；代码批准不替代尚在执行的原生终图验收。
