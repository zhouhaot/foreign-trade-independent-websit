# 第9轮独立 JavaScript 专项复审

日期：2026-10-07。结论：**APPROVE**。当前冻结源码下，没有待处理的 CRITICAL、HIGH、MEDIUM 或 LOW finding。此结论仅对应下面的源码指纹、实际 Node 验证和本轮有限 H20 契约；不替代原生 UI、读屏、后端事务或 GitHub 推送验收。

## 范围与方法

开工基线为 `d03c9a055ec10c1bf0171669ce0d15a90d820e01`。按本地 `git diff` 建立范围，复审 `js/utils.js`、`js/app.js`、`js/views-sales.js` 的客户确认/订单变更、`js/views-fin.js` 的主管处理意见及相关 `css/pages.css`。阅读了 AGENTS、HANDOFF、round-09-planning-review、round-09-finance 和销售最终11项说明，以及原 helper、上下文检查、全部6个旧测试适配 diff。

这是普通 JavaScript 静态前端，没有 package.json、tsconfig 或 ESLint 配置，当前命令环境也未发现 eslint，因此 TypeScript 检查不适用、ESLint 未执行。四个修改的运行 JS 已分别实际执行 `node --check`，全部通过。本次为本地工作区复审，不是 PR 审批；没有声称核验远端 CI/合并就绪状态。

本代理只读源码、测试和材料；运行真实原 U helper、Actions、App 事件监听、Promise 的隔离 Node fixture。唯一写入为本文，没有修改源码、脚本、Mock、治理、Git 或 CUA，也未回退其他代理。交接由中枢统一维护。

## 代码判断

- 草稿基线按原控件 raw value 比较，空格变化也 dirty，恢复原值可直接关闭；原错误节点和字段描述不是 dirty 数据。三个 adapter 只登记有限原字段，没有扩大到页面导航、刷新或持久化。
- guard 与原 `.modal` 同属一个 overlay；源 modal 暂时 inert/aria-hidden，guard 具名且为 alertdialog。继续移除本次 guard、恢复原属性和保存的原焦点/选区/body 滚动，不拼回原表单。Escape 显式继续，普通重复关闭幂等；Tab handler 优先取 guard。这里是代码/fixture 判断，不是原生焦点、像素或读屏证明。
- `isModalCurrent` 同时核 modal-root 第一 overlay、连接状态和没有 guard；原 source 被替换、关闭选择显示或旧 submit 被重放时均不能提交。guard 两个 choice 闭包绑定具体 guard 节点，已继续的旧按钮和 g1 对 g2 的操作不能误关/解除新选择；此项是 root 已发现并修复的路径，不认领为本专项新发现。
- busy 在排 Promise 前同步取得；销售 handler 在任何 busy/禁用前拒绝旧 is-loading。QC/OC 的 finally 释放失败锁并恢复原 disabled；OC 成功的 busy 保持到源 480ms 收尾，源已失效则不碰新窗。主管明确失败路径释放原申请锁和 modal busy；成功在实际写入后仅 clean 本次 modal，再关闭本次源。
- 销售原五个控件的连接、归属、同 id 同节点和 raw 值同时绑定；主管原意见控件也绑定节点与 raw 值。合法 A→B、仅 trim 后相等的变化、同 id 同值替换节点均拒绝，不静默提交 captured A。拒绝后保留当前填写而不是复原旧 A。
- QC 原 quoteContext 的 actor/报价对象/关联内容校验保留；OC 已补同 actor 内容重查并保原订单对象/状态/币种资格；AP 原身份/自审/申请对象与内容、生命周期、金额、改单快照资格保留。业务源失效时没有假成功、重绘或新窗关闭。
- 成功 QC 仅清源 modal 草稿，生成订单仍按原独立 page-clean 契约。正常取消申请仍记录原订单状态、不登记退款；改价申请不直接改订单价格；主管合法通过/退回和原意见 trim 存储保持。无参 `closeModal()` 的 legacy force 保留，用户入口走 request；有参数程序 close 只关闭期望源。

## 本代理实际验证

销售正式停止写入后，重新运行共享45、销售40、主管21专项及四运行 JS 语法，均 exit 0。最终源码 hash 与前一轮独立回归时的读取相同。

| 实际脚本 | 结果 |
|---|---|
| verify-modal-drafts | 45 PASS |
| verify-sales-modal-drafts | 40 PASS |
| verify-approval-modal-drafts | 21 PASS |
| verify-context-navigation | 194 来源/岗位链接 + 15 集成 PASS |
| verify-quotation-contract | 103 PASS |
| verify-change-request | 25 PASS |
| verify-navigation-drafts | 33 PASS |
| verify-draft-adapters | 17 PASS |
| verify-document-workspace | PASS |
| verify-cancellation | PASS |
| verify-repricing | PASS |
| verify-document-snapshots | PASS |
| verify-payments-contract | 71 PASS |
| verify-document-approval-display | 137 PASS |
| verify-views | 100 岗位/视图及原核心动作 PASS |

另外执行了自己编写、经 stdin 运行的 **39 个独立场景**，没有修改或保存项目测试脚本。场景粒度不与上表脚本数量合并：

| 独立组 | 场景数 | 实际观察 |
|---|---:|---|
| 三类作业各8场景 | 24 | raw 空格变化拒绝；原锁释放和合法重新提交；主文本同 id 同值换节点拒绝；旧业务 callback 不写/不关/不重绘新窗；旧 continue/discard/close 不伤新窗；同 tick request/Escape 等待已排队结果；放弃后旧 submit 零写；继续保原节点/raw/原 ARIA 错误 |
| 兼容与正常业务 | 6 | 未登记 legacy modal 正常关闭；无参 force 在 guard 中正常结束；U.confirm 返回 false 保原窗；onOk 内打开新窗不被旧后续关闭；合法 OC 取消申请保前态/null target；合法 AP 退回 trim 存储意见 |
| 三类作业 actor id/name 漂移 | 6 | 同对象 id 或 name 在 Promise 前变化，全 MOCK 相对测试施加变化后的基线不再写；原窗保留、字段可编辑 |
| 销售另外三个控件替换 | 3 | qc-date、oc-type、oc-amount 在 Promise 前换成同 id 同值新节点，完整 MOCK 不写且原窗不被关闭 |

三类 raw 拒绝→重提场景使用未替换的原 U.withLoading，VM setTimeout 指向 Node 原时钟：失败后等待510ms，再合法提交并等待520ms。实际证明按钮 loading 结束、源 busy 已释放、原字段可编辑并且新的候选成功；其它场景沿 fixture 的短真实 timer 和真实 Promise。没有把程序改变 disabled 字段、激活 inert 源按钮或最小 DOM 事件当作普通用户能执行的原生 UI 操作。

独立探测初次误把 SO2026001 状态写死为“待执行”，实际样例是“执行中”，因此在正常改价成功断言退出；已改为保存开窗状态再比较，完整30场景通过后增加9场景，最终39通过。这是本代理 fixture 期待修正，不是产品 finding，未计为 RED。

全部6个旧测试 diff 已实际阅读。repricing 的旧 first 被 second 替换后仍通过期待、quotation 的排队后客户确认取消、change 的 captured A 漂移、context 的客户确认 page-clean 期待都按明确 H20 语义有限调整；其余无 DOM 桩补 current/bind/busy/clean。原角色、金额、快照、历史、生成订单与互斥检查仍在。不能说原 assert 完全未改，也不能拿 plain object 桩当原 DOM 保留证明。

完整 MOCK 拒绝对照均以测试施加 actor/节点/raw 变化后、业务 Promise 写入前为基线。合法成功正例独立检查实际状态/意见/申请结果；未以 Toast 单独认定业务完成。`git diff --check` 实际 exit 0；LF/CRLF 提示不是失败。

## 冻结源码指纹

| 文件 | SHA-256 |
|---|---|
| js/utils.js | 29BBDB784CD8B0011D3DF0A060B52759241E79757BED0CECCD9A89511CE9D6DF |
| js/app.js | 04BF6665B37D40DE2B4DE639DB2617B37FF3545C5EA66C737499EEB4EE80F3FF |
| js/views-sales.js | 28754BCA3B19D33103C5B61D1BB9D2D7868E448E1F746713BD3F711993B62B9A |
| js/views-fin.js | E4D0E9A329CD4BEC81506E19F7614657F5E2B9B6BB50D4B29052F8AF06AD97A6 |
| css/pages.css | 67BDC8B6B98639D8F7052975B08DDD87A6C32D0B78E74343066CCCAA02C8995D |

后续源码若因 UI 再修改，应按真实 diff 补审。本专项未测浏览器原生键盘/选区/焦点与实际 scroll、CSS 两宽像素、输入法、跨浏览器、读屏、file://、PDF/正式签署、后端身份/事务、生产并发、NAS 或 Git 远端同步。

## Review Summary

| Severity | Count | Status |
|---|---:|---|
| CRITICAL | 0 | pass |
| HIGH | 0 | pass |
| MEDIUM | 0 | pass |
| LOW | 0 | pass |

Verdict: **APPROVE** — 当前指纹对应的有限 JavaScript 行为和独立 Node 回归通过，没有新增待处理 finding。

## 后续 CSS 阶段澄清与 JS 指纹复读

本专项上表 `css/pages.css` 的 `67BDC...` 指纹对应首次 JS APPROVE 时的样式阶段。其后 UI 首12图提出整张源 modal 使用 opacity .24 会使后页透出叠字；中枢仅将源 modal 本体改为 opacity 1，直接 head/body/foot 内容保留 .24。当前 CSS SHA-256 已实际读取为 `3AC45130119068980E2D7070F3B48342B479CF6C0323FA3B07105E7E796E6DB3`，前阶段指纹保留为历史，不当作最终 CSS。

这项有限 CSS 修改已由综合代码代理补审，证据在本目录 `code-review.md` 的“原生 UI 首评后的 CSS 有限补审”；中枢另报告真实 UI 重拍与终审覆盖。CSS 补审和原生 UI 结论归各自产物，本代理未认领截图、原生交互或布局验证。

我在本次澄清时独立重新读取 utils/app/views-sales/views-fin 四个 JS 的 SHA-256，均与上表最终 JS 冻结指纹逐字一致，没有新增 JS 差异，因此原 JS **APPROVE** 继续成立；没有重复已通过的全部业务测试，也没有修改源码、测试、Mock 或 Git。本文补充完成后停止本轮写入。
