# 第 6 轮独立代码审查

日期：2026-10-07。基线：`d396990f01f044a313bdb60575ef205b4756f8c5`。第一轮审查、源地址补修复验及最终文案/CSS 相邻复审完成。审查代理只写本报告，不改实现、脚本、HANDOFF、治理文件或 Git。

最终结论：APPROVE。本轮静态前端差异没有未解决高置信发现；历史一项 MEDIUM 已 Resolved，保留初次证据和独立复验。

## 范围与依据

读取 AGENTS、HANDOFF、现实规划与客户/询盘子任务说明；检查 staged/unstaged diff 和 core、sales、共享确认/加载、实际 app 导航及专用 fixture 的调用上下文。重点为客户原表单/源对象/会话绑定、完整候选一次保存，以及询盘双向唯一关联、参考币种和 H12 精度、延迟确认、取消/旧窗口、重复提交和成功后的 clean/导航。

H16 是同一启用参考币种生成待核对草稿，不自动换汇；H17 是追加明确合成 INQ2026006，不能改原交易事实。保持 sales-only 保存/发起，主管查阅，不扩大 ROUTES 或后台权限。生成报价仍待客户确认，不预造订单、单证、付款或确认。

## 发现与处理记录

### [MEDIUM · Resolved] 询盘确认未绑定源地址，跨页旧票据仍会提交

初轮位置：`js/views-sales.js:144`～`150` 捕获 context/contextError，以及 `:162`～`178` 提交。票据核对 actor、询盘对象和内容，核对关联，并检查 overlay.isConnected，但没有捕获或核对 location.hash，入口也没有确认当前为同一询盘详情。

独立复现加载真实 sales、U.confirm/U.withLoading 与 Promise 到隔离 Node DOM fixture：先令源地址为 `#/inquiries/INQ2026006` 并打开确认；分别在确认点击前、点击后 Promise 执行前，把地址改为 `#/customers/C001`，保留 connected 的原 overlay。两种顺序均产生 `Q2026101`，inq.quoteId/status 被写入并发成功提示，最终地址被改成报价编辑页；完整 MOCK 的 noWrite 比较为 false。共享 confirm/withLoading 没有源地址检查，因此未替代业务票据绑定。这是可验证的异步事件模型，未声称原生浏览器复现。

已向中枢报告：入口确认当前询盘详情并捕获完整源 hash；onOk 在写入/clean 之前重查 exact hash，失败保留窗口和具体原因，完整 MOCK 零写。建议补开窗错页、两个漂移时序与合法 query 的对照。现有 95 例没有 route 漂移断言，不能据其 PASS 判定此条件已满足。

有限补修已回读：`inquirySourceMatches` 限规范编码询盘详情路径，允许 query；opening preflight 拒绝错页，context 捕获完整 sourceHash，contextError 在写入前比对 exact hash/path。发现来源变化后保存 invalidated 原因，后续返回同一源地址也拒绝旧票据。原窗口保留，原因写入就近 rolealert，失败不 clean、不导航、不写任何模型。主按钮/确认标题统一为“生成报价草稿”，新报价列表补独立合成标签，详情/编辑仍保留标签；只改变可见说明，没有改变金额或订单/权限契约。

独立 GREEN：重跑新增来源断言的询盘 114 例；另加载真实 app.js 委托 click 与 hash/history handlers，使用原本的真实登录 helper U.setUser，分别在无 history API 的存储降级路径和 history API 模型路径执行确认前漂移、点击后 Promise 前漂移，共 4 个顺序。每个顺序整个 MOCK 不变、iq.quoteId 仍为空、原 overlay connected、原因可读且没有成功提示；再从客户页回原询盘并点击同一个旧确认，仍零写。另 2 个开窗错页（客户页/另一询盘页）不打开弹窗，完整模型不变。初次 harness 因未调用 U.setUser 没挂载合法主按钮，已纠正设置后重新完整执行；不是实现缺陷或通过证据。上述是独立 Node 事件模型，不声称原生浏览器复现。

## 独立验证

- 客户专用 51 例、询盘专用 95 例、报价专用 103 例均独立执行 PASS；客户错误全模型零写、原节点/字段保留、完整字段校验及成功后 clean 一次，询盘已有五个报价只接续、混币种/缺关联/精度失败不生成、上下文变化/取消/重复 Promise 拒绝与 USD/EUR 合法小数路径均有覆盖。
- 历史单证快照、导航 33 场景、订单 workspace、收款 71 场景独立执行 PASS。这些都是源码/Node DOM/VM 验证，不是浏览器布局、原生历史或服务端事务认证。
- 独立把基线及当前 mock-data.js 各加载到 VM 比较：其它 14 个集合 JSON 逐字相同；原五询盘前缀逐字相同；仅追加 1 个 INQ2026006。确认该合成来源与日期说明，以及 demoSynthetic 标签在生成报价后独立于可编辑备注。
- git diff --check PASS（只有 Git 换行提示）。客户文本先转义渲染，错误 textContent；新增参考金额复用既有精确金额契约，无另造金额或换汇实现。
- 源地址补修后询盘 114、导航 33、真实 app 委托的单证 workspace 再次独立 PASS；sales 语法及 diff 检查通过。新增“生成报价草稿”按钮/确认文案及新报价列表合成标签与已有详情/编辑一致；旧五条记录关联没有修改。
- 最终两处文案回读：询盘详情合计前加“参考合计”，客户主按钮改“保存客户资料”；不变更 input ID、data-action、提交事件、角色或金额计算。两处之后独立重跑客户 51、询盘 114、报价 103、订单 workspace，core/sales 语法与 diff-check 全部 PASS。
- CSS 最终差异限定新增 customer/inquiry 类：客户两列 minmax(0,1fr)、表单最小宽度、分组间距与提示；询盘长文本换行，明细最小 880px 放于既有 overflow-x:auto table-wrap 中。错误只在内容为空时隐藏，非空完整原因保留且可换行，没有隐藏动作、缩裁历史纸张或改公共路由样式的选择器。未新增脚本执行、远程资源或不受信任 HTML 注入。

## 中枢证据回读（非本代理原生执行）

最终回读 `.impeccable/review/round-06/node/summary.json`，20 项脚本 exitCode 均为 0；这是中枢全套记录，独立执行范围是上节明确列出的脚本。另回读 browser.json：115 个岗位/路由、230 次双宽布局检查，最新为 13 组交互、failures/console 为空，28 张图由 13 过程图与 15 最终图构成。先前审查时记录为 12 交互/26 图，随后只补实际历史纸张对照与自然 Toast 消失后截图，源码没有变化，不重复执行回归。浏览器、截图和布局均由中枢实际操作，本代理没有将其计为自己亲自验证。

新增第 13 组 `customer-save-frozen-paper`：中枢同一会话实际保存客户资料，再回读 `D-CI2026003-V2` 的整个 `.paper` 渲染文字逐字一致，原买方仍保留；这证明该纸张的呈现文字未被此次客户维护改写，不等于整个 HTML exact 或全部单证排列均已浏览器验证。首次使用不存在 `.doc-paper` 导致超时未计通过，改实际 `.paper` 后完成。生成报价编辑终图在成功 Toast 自然消失后重拍，原遮挡图保为过程；没有改变业务源码或用重拍声称额外交易验证。

浏览器保存客户场景的 exact email 因检查输出脱敏未取得，不将其中 emailCorrect:false 猜成真实字段错误，也不声称该浏览器场景证明精确邮箱值；独立客户专用回归验证了成功写入和失败保留实际值。首次 locator 的滚动变化与源点击时滚动区别保留在中枢方法说明中，不把校正前观察伪称通过。

JavaScript 专项 `javascript-review.md` 对同一询盘来源 MEDIUM 独立复现并给 Resolved/APPROVE；这是同一根因的交叉证据，当前报告不累计为第二个问题，也不抹除各报告原始方法和评级。

## 当前边界

独立审查不认领中枢真实 UI 测试。本轮新增合成数据并非恢复或更改历史数据。邮箱仅基本格式；假登录、内存更新和刷新重置不证明服务端授权、邮箱可达、审计、持久化或数据库原子性。包装件数/重量字段是规划明确留待后轮的既有边界，不作本轮新增问题。

## Review Summary

| Severity | Count | Status |
|----------|-------|--------|
| CRITICAL | 0 | pass |
| HIGH | 0 | pass |
| MEDIUM | 0 | pass（历史 1 项 Resolved） |
| LOW | 0 | pass |

Verdict: APPROVE — 本轮静态前端及最终相邻差异无未解决发现，唯一历史 MEDIUM 已修正并独立复验；不扩称后台/持久化/生产身份或亲自原生浏览器认证。
