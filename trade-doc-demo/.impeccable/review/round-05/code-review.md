# 第 5 轮独立代码审查

日期：2026-10-07。基线：`6ffd844c097c82b6e9a4f8655dd7d1cd48aff31a`。首轮差异、历史压力两顺序修正、最终 UI 相邻差异与追加非法编码补审完成。审查代理只写本报告，不修改实现、HANDOFF、测试或 Git。

## 范围与契约

读取 AGENTS、HANDOFF、本轮现实规划、岗位链接和单证/财务适配材料；查看 staged/unstaged 差异及 app、工具、模块调用上下文。保护依据进入 DOM 或实际业务成功后的字段基线；恢复全部原值变干净，取消离开保留源 DOM，确认放弃才导航。历史索引代表本会话已知条目的实际位置，Back 后新导航截断 Forward 分支；未知条目只作地址/输入兜底，不声称完整恢复历史栈。

审查了共享导航/普通链接、搜索/铃铛、退出/刷新提示，模块成功 clean 时机、失败保留输入，财务历史局部翻页与权限/显式来源链接。ROUTES 没有扩大，业务金额、取消状态、快照和版本契约沿用前轮。客户表单也实际纳入 guard；这不能扩称全站通用弹窗或跨页草稿恢复。

## 发现与修正记录

### [MEDIUM · Resolved] 延迟历史恢复与新导航之间缺少完整互斥

初轮位置：`js/app.js` 新增 `requestNavigation`、`navigationChanged` 的恢复/获准分支，以及 `confirmDiscard` 的 `onOk`（首次封版 `js/app.js:311`，后续安全解析补审使行号移动）。独立事件模型加载真实 app handlers，把 `history.go` 的遍历任务留在队列，明确控制事件到达；没有修改正式 Mock，也没有声称原生浏览器复现。

具体顺序：从报价列表进入报价编辑，修改备注；Back 已到列表，但回原编辑条目的 `go(1)` 尚未完成。初轮仍可打开并确认新的内部导航，`pushState` 会截掉原恢复条目。原等待条件永远收不到目标，后续 Back 只移动 URL，DOM 仍停旧页。

中枢第一修正在 pending restore/approved 时阻止新的 `requestNavigation`，恢复/获准需匹配 epoch、index 和目的 hash。独立原顺序已通过：未新增 modal/条目，短提示等待；正确恢复后才离开确认。另测重复 URL 的不同历史位置：edit2 不会冒充 edit4 完成恢复，quotes1 不会冒充 quotes3 完成获准，正确事件才继续，分支截断和全 MOCK 不变。

第一修正后的相邻顺序仍可在同一延迟模型复现：先通过普通内部链接打开离开确认，再 Back 启动恢复，恢复尚未到达时确认已经打开的窗口。其捕获 callback 绕过入口锁；generation/sourceHash 仍相同，提前 clean 并 push，破坏恢复目标。已把复现交中枢，建议在 onOk 的 clean/callback 之前再次检查 pending 历史状态，拒绝且保留原窗口/输入，恢复完成后再确认。

第二修正已回读：onOk 在 markClean 之前重查 restoringHistory/approvedHistory，有 pending 就 return false。独立原相邻场景 GREEN：pending 时没有 clean 或 push，原确认窗口与字段节点、dirty 保留；正确恢复完成后再次确认到原目标，随后正常导航没有永久锁，全 MOCK 不变。导航回归新增 manualHistory 的两个顺序，独立 25 场景 PASS。初次缺陷与两次修正过程均保留，当前 Resolved。

这是可控延迟状态机中的正确性问题；实际浏览器能否产生同样调度、频率和可见后果尚未由本审查代理验证。评级 MEDIUM，保留压力模型与原生证据的边界。

## 独立验证

- `verify-navigation-drafts.cjs`：初 23、补压力场景后 25 场景独立 PASS，真实 app handlers、异步/手动队列 Node DOM/history 模型。
- `verify-context-navigation.cjs`：194 权限链接/来源组合及 15 实际成功 clean/失败保留场景 PASS。
- `verify-draft-adapters.cjs`：初16、补区域高度场景后17场景独立 PASS，单证旧局部 guard 归一、成功才 clean、财务局部翻页保原表单/输入/错误/ARIA/焦点及提交引用。
- `verify-document-workspace.cjs`：PASS，包含真实 app click 委托与阻止旧 anchor 默认导航。
- 相邻报价 103、收款 71、单证生命周期 90、取消、会话、登录、views 100、订单 workspace 回归均独立 PASS。
- 6 个改动运行 JS 的 `node --check` 与 `git diff --check` PASS。
- 额外真实 app DOM 模型：确认期间第二个内部导航不替换窗口；取消保持原报价节点/dirty；退出只有一份退出确认，取消保焦点/输入/完整 MOCK，确认清会话/输入后到登录，业务 MOCK 不变。
- 额外可控历史队列：修正后的 pending restore/approved 拒绝新导航，同 hash 不同 index 不提前接受，正确条目才渲染、后续分支截断正确。上述都是 Node 事件模型，不是原生浏览器、布局、键盘或 beforeunload 系统提示认证。
- 焦点/滚动相邻修正：`focusin` 记录实际字段焦点，`U.confirm/openModal` 传可选 onClose，关闭后仅在 generation/hash 仍属于源页时恢复开窗坐标；共享 close 使用 preventScroll。独立模型模拟 price 焦点与开窗 scroll46、窗口期 scroll60，取消回 price/46 并保原节点/dirty；确认真正换页后停新页 scroll0，没有旧回调把新页拉回46。此为 DOM/坐标模型，真实滚动纠正由中枢另验。
- 中枢随后把滚动恢复延至 requestAnimationFrame，独立额外测试实际 RAF 分支：取消先排帧，帧执行才回源坐标；旧取消帧未执行前已经确认导航，最后执行旧帧仍保新页 scroll0，generation/hash 检查在帧内生效。导航25、app语法及diff-check再次 PASS。`scrollbar-gutter:stable` 仅作布局占位，没有修改路由或交易行为。
- 上述共享工具相邻变化后再次独立跑报价103、收款71、链接194/clean15、登录及会话，均 PASS；app/utils/docs 语法和 diff-check 再次 PASS。

## 最终相邻复核

最终回读 app、工具、财务、单证及两 CSS 的差异。history 支持时设 `scrollRestoration=manual`，草稿窗口记录 handler 捕获的 `data-draft-scroll-y`，客户标题绑定 ID/名称，单证放弃标题绑定 no/V。这些是呈现/历史滚动与诊断信息，没有扩展 ROUTES 或改变交易写入条件。可选 onClose 经 U.confirm 传入 U.openModal，关闭后清回调引用；RAF 内重查 generation/hash，不把旧源页坐标带到新页面。

财务 `pay-page` 只替换历史容器，先以实际当前高度和既有 minHeight 的较大者保留区域，再恢复焦点/滚动；正常进入页面和业务成功后仍按既有完整渲染重建。没有为翻页 clean 或复制登记表单，未改变金额/收款票据引用。第17个 adapter 场景以明确的几何输入桩核对430px，不把桩尺寸当原生测量。

独立最终复跑导航25、adapter17、收款71、链接194/clean15、会话、单证workspace六组，全部 PASS；app/utils/fin 语法及 diff-check PASS。额外加载真实 app 的 history 属性分支得到 manual；客户离开窗口 marker 精确记录60、标题含真实C001及名称，取消仍dirty。该额外验证同样是 Node DOM 模型。

首次封版只读核对中枢 `.impeccable/review/round-05/browser-verification.json`：22组交互均pass，100不同角色路由/200实际宽度检查，failures和console为空。原生Back重复取消/确认与Forward取消/确认记录源hash/token/value/focus，scroll46→46；主管审核Back取消scroll122→122、原纸张逐字保持。财务末页保持已访问区域实际高度、字段/错误/订单上下文，业务成功后clean。以上由中枢真实IAB/HTTP执行，本审查代理没有操作浏览器，不冒称独立原生验证。非法编码补审后的最终26交互见下文，200正常路由矩阵未因该相邻补修宣称重跑。

材料保留测量纠正：工具定位在 handler 之前把46移至60，窗口实际捕获源60、取消后60，不能把“定位前46”归因于弹窗或声称定位前位置未变化。审核成功纸张允许预期签字信息更新，交易内容保持；取消审核则逐字相同。初次与修正过程没有删掉。最坏 pending 压力仍仅有独立Node事件模型证据，没有冒称原生复现。

首次封版材料口径回读：25图元数据=10过程+15终版，与summary一致；缺精确尺寸的初图没有补猜值。后续非法编码补验新增一终图，最终26=10过程+16终图。运行时减少动效模式及原生beforeunload刷新/关闭提示明确列未执行，监听器/代码或Node通过不代替原生提示验证。

## 封版后相邻补审：JavaScript 专项非法 query 编码

单独交叉引用本轮 [JavaScript 专项报告](javascript-review.md)。该代理给 MEDIUM 并独立复现旧 parser 的 URIError 与本轮新放弃确认路径组合后“先clean、地址变坏、原DOM仍在、modal/loading残留”的状态失配；旧 parser/withLoading 本来就存在，不能全归本轮新增。本报告保留它的评级、原证据和独立归属，不并入或替换本报告上一项已Resolved的历史互斥发现。

中枢相邻修正已回读：parseHash安全返回编码错误；requestNavigation在确认/clean/push前preflight；直接坏hash保源DOM及dirty、清pending/废旧guard并重建仅导航元数据；初始坏地址安全回登录/工作台。独立导航31、会话及链接194/clean15均PASS，app语法和diff-check PASS。另独立复跑原“已开modal→Back等待→OK”压力顺序，并补“restore pending期间直接坏hash”场景，均保原节点/dirty/完整MOCK，之后合法导航可用，没有永久锁。以上仍是Node真实handler模型。

随后已回读JS专项独立结论APPROVE及该项MEDIUM Resolved：原坏地址与“旧确认OK微任务尚未执行→坏hash”场景均保原节点/dirty，旧窗失效关闭，后续导航可用，记录的unhandledRejection为0；首次WARNING及旧问题归因仍保留。

最后相邻 `showNavigationError` 用textContent更新唯一就近role=alert，说明完整编码原因与输入保留；不会新增可编辑字段、复制/重建表单或改变基线，合法真正重绘后移除。CSS橙色细条仅命中错误态，正常页没有notice。独立导航31（完整原因断言）、会话、链接194/clean15、app语法及diff-check再次PASS，无新增finding。

已只读回读中枢4组实际补验：非法hash拒绝保源URL/token/值/dirty、旧modal中坏UTF8废旧票据且无loading残留、persistent就近完整原因/rolealert及原表单保留、地址修正后稳定known链nativeForward取消hash/token/值/focus/scroll56→56。该次JSON为26组交互pass、26图=10过程+16终图、failures/console为空。200正常路由矩阵在parser相邻补修前完成；正常角色路由和样式路径未变，但本报告不说重跑200。未稳定动画探针59→56保留initialObservations/pass=false，不计通过；后续稳定源56→56是单独的PASS。该段实际IAB证据均归中枢，本代理只读回看，未操作浏览器。

## 最后组合键契约对照

中枢契约验收发现带data-action的单证anchor与普通anchor的组合键处理不一致，新增RED场景后修正统一click分支：所有内部anchor在Ctrl/Meta/Shift/Alt、另开target、非主键或download情形先保浏览器默认；当前页普通点击（含`_self`）继续走既有guard/data-action。该项按中枢契约纠正记录，不猜测额外安全风险，不扩评级或覆盖前述两份独立MEDIUM归因。

仅相邻独立回读该分支，导航33、单证workspace、adapter17、app语法及diff-check均PASS。Node确认Ctrl单证data-action链接与Shift报价普通链接都不preventDefault、不改变源hash/editing、不另开离开modal；实际新tab行为由中枢原生Ctrl单击验证，JSON新增第27组PASS：源hash/marks/dirty保留且无modal，新tab为单证员有权单证台账，非forbidden，临时tab已关闭。

最终只读回读口径为27组真实UI交互、200此前正常路由矩阵、26PNG=10过程+16终图、console为空。此最后修正没有CSS/像素变化，中枢保留16终图，没有宣称新重拍。综合代码结论保持APPROVE，未扩到后端或生产验证。

## 现有边界

标准 beforeunload 是否出现由浏览器决定；未知/加载前条目不恢复完整栈，确认刷新仍恢复样例；写入仍只在内存，假登录不是真实身份或后台鉴权。主管新增入口只对应既有允许的只读路由。没有把原型单证导出称真实文件，也没有扩展退款、生产持久化或后端事务。

规划材料已同步实际 `cust-form` 范围和当前/最近作业字段焦点策略，原先文案差异不再列未解决项。本代理没有执行真实浏览器、file://、跨浏览器、读屏或刷新/关闭系统提示；中枢真实 UI 结果在上文注明来源，不混为独立实测。中枢18组最终统一日志由中枢另行封版，本报告不把计划重跑当自己全部独立执行。

## Review Summary

| Severity | Count | Status |
|----------|-------|--------|
| CRITICAL | 0 | pass |
| HIGH | 0 | pass |
| MEDIUM | 0 未解决 / 1 已修复 | pass |
| LOW | 0 | pass |

Verdict: APPROVE — 综合自身1项MEDIUM及交叉引用的JS专项MEDIUM均已Resolved，原始评级/证据独立保留，无未解决代码finding。批准范围限本轮静态前端差异，不代表后端、真实身份、银行或生产事务验收；UI SHIP仍由独立UI评审判定。
