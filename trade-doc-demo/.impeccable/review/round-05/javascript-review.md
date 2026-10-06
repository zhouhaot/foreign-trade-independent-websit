# 第5轮独立 JavaScript 导航与 DOM 专项审查

日期：2026-10-07。基线：`6ffd844c097c82b6e9a4f8655dd7d1cd48aff31a`。审查先查看 staged/unstaged 差异；staged 为空，范围为当前未提交工作区差异。重点共享 draft 基线、导航票据与历史状态、DOM/Promise 例外及模块必要调用，不重复另一 code-reviewer 的全流程或 UI 测评。源文件只读，仅拥有本报告。

项目是普通 JavaScript；未发现 package.json、tsconfig 或 ESLint 配置，不虚构 TypeScript/lint 通过，不安装检查依赖。首次实际运行 app/utils 语法检查、导航25、adapter17及 session 回归，均 PASS；修复后的最终独立回归为导航31、adapter17与 session，均 PASS。

## 最终结论：APPROVE（静态前端 JavaScript 专项）

本报告的一项 MEDIUM 已 **Resolved**，当前本轮专项范围无未解决 CRITICAL/HIGH/MEDIUM 问题。结论不代表生产认证；另一代码审查的历史压力顺序和中枢原生浏览器证据分别归其报告。

修复后回读 `parseHash(hash)` 的可选目标输入与明确编码错误返回：只在解码边界捕获错误，不将无法解析的 query 用部分数据继续渲染。requestNavigation 在确认和 clean 之前拒绝坏目标。navigationChanged 的坏编码分支清 pending 票据、改变 generation/epoch，恢复 acceptedHash，关闭失效离开窗口，保留当前 DOM 与基线 dirty；初始化坏地址安全回登录或工作台。没有把 U.withLoading 的任意业务错误统一吞掉，没有扩大未知历史栈恢复承诺。

最终实际独立复验：

- 原 directHash `#/orders?tab=%`，及非法 UTF8 value/key 共三种：恢复源编辑 hash、字段节点和值不变、dirty=true、没有 modal/loading、完整 MOCK 逐字不变，提示编码无效。
- 相邻延迟路径：先打开有效离开确认并点击确认，使其 onOk 等待 Promise 微任务，再立即触发坏 hash。旧确认票据因 generation 更新失效，原草稿仍 dirty、旧窗口关闭；随后新的有效导航可正常确认到订单列表。宿主记录 unhandledRejection，原场景及该相邻场景合计为 **0**。
- `verify-navigation-drafts.cjs`：31 场景 PASS（初始坏地址、干净坏地址、坏 key/value、失效旧窗与后续导航都包含）。
- `verify-draft-adapters.cjs`：17 场景 PASS；`verify-session.cjs`：PASS。
- app/utils 的 `node --check` 与 `git diff --check`：PASS。Git LF/CRLF 常规提示不是检查失败。

以上均为加载实际 handlers 的 Node DOM/history/Promise 证据，本专项代理没有操作真实浏览器；首次归因和失败记录保留如下。

### 最终 UI 相邻 helper 复核

回读新增 `showNavigationError`：保留短 Toast，并在当前 workspace 插入/更新唯一 `navigation-error`，使用 textContent 和 role=alert；页头确为 workspace 直属节点时插其后，其他情况插 workspace 第一个节点前，空 workspace 的 null reference 合法追加。没有 workspace 时直接返回，不访问不存在的页头；有作业字段才声明输入保留，没有字段则声明页面可继续用。它仅插入通知，不重建表单；正常成功 render 替换 workspace 时自然移除旧通知。

轻量独立 Node 复验：无 workspace 的坏目标请求安全返回；人工置空 workspace 后坏目标通知正确追加、role=alert/无字段文字准确；第二次错误复用同一 notice，不重复插入。fixture 的 `insertBefore(child,null)` 追加语义与原生 DOM 这一本轮调用边界一致，不把 fixture 当完整 DOM 标准实现。导航31（包含完整原因文字断言）与 app 语法再次 PASS。没有重新运行无关大矩阵，也没有执行真实浏览器。未新增 finding，APPROVE 保持。

### 最后组合键/目标相邻分支复核

回读真实 click 委托：先从实际 anchor 获取 href/target，对内部 `#/` 链接的 Ctrl/meta/shift/alt、非左键、非 `_self` 目标或 download 分支直接返回，保留浏览器默认行为；该分支同样覆盖单证 data-action anchor，不再落入 doc-leave 将另开动作转换成当前页导航。普通同页点击仍进入原 requestNavigation/业务委托，未增加数据写入或改变 guard 成功/失败契约。openElsewhere 使用布尔条件的真值判断，DOM 属性读取仅在 anchor 存在时进行。

独立实际运行导航 **33** 场景与 app 语法：PASS；新增 Ctrl 单证/Shift 报价两例确认默认未阻止、源 hash 与编辑上下文保留、没有离开窗口。本专项没有执行原生另开窗口/页签；中枢的真实 Ctrl 点击结果另由其浏览器报告负责。未发现新问题，最终 APPROVE 保持。另一审查已修复的历史恢复 MEDIUM 与本报告已修复的编码 MEDIUM 均保留各自历史，不重复计为本专项新增发现。

## 首次结论（历史）：WARNING，修复后已独立复审通过

### MEDIUM [Resolved]：非法 query 编码经过新增放弃确认路径后使地址/DOM/草稿状态失配，确认 Promise 拒绝后窗口保持 loading

位置：`js/app.js` 的新 `requestNavigation`、未知 hash 兜底 `navigationChanged`、`confirmDiscard.onOk`，以及旧 `parseHash` 的 `decodeURIComponent` 调用；`js/utils.js` 原 `U.withLoading` Promise 链未处理异常。

原 `parseHash` 和 `withLoading` 在基线已经有相同未捕获异常代码，本报告不把它们误称本轮新增缺陷。与本轮直接相关的是：新导航 API 接受所有以 `#/` 起始的字符串，未在放弃输入前确认 query 可解析；新 onOk 先 markDraftClean，再执行可能因该编码抛错的导航 callback。因此原 parser 缺陷会破坏本轮承诺的导航/输入基线一致性。

独立一次性 Node DOM/history 模型加载真实 app 与共享工具 handlers，销售进入 `#/quotes/Q2026004/edit`，修改 `qe-remark`，直接设置 `#/orders?tab=%`。未知 hash 兜底先恢复源 hash 并打开离开确认，这一步保持 dirty。随后点“放弃输入并离开”：捕获实际 `URIError: URI malformed` 的 unhandledRejection；35ms 后 hash=`#/orders?tab=%`、原报价字段节点仍在、hasDraftChanges=false，原确认窗口和 is-loading 仍在，完整 MOCK 未变化。宿主只额外记录 unhandledRejection 以观察错误后的状态，没有给应用加 catch 或改正式数据/实现。

首次建议在导航进入/批准前验证 query 编码可解析，失败保持源地址与 dirty 并明确提示；初始/直接干净坏 hash 也使用不抛异常的安全兜底，不仅捕获后消音或把原输入标 clean。该场景在真实 handlers 的 Node 事件模型复现，未操作浏览器，评级 MEDIUM，不声称原生发生频率或生产损失。已即时交中枢修复，按上方最终证据独立复验通过。

## 已读相邻契约与实际验证

- draftControls 仅覆盖本轮作业表单/单证字段，disabled/readOnly 排除；基线保留节点和值，单证文本按既有 trim 契约比较；不是通用全站草稿持久化。
- 请求导航在 pending restore/approved 时拒绝；确认 onOk 再检查 pending、generation 与 sourceHash。另一审查已记录两个历史压力顺序修正，本报告不重复计为新发现。
- known history 判定包含本会话 epoch、index 和 hash；相同 hash 的不同位置仍需精确匹配。未知条目兜底不猜完整历史方向。
- 可选 onClose 回调先清引用，RAF 内重查 generation/hash；preventScroll 和 minHeight 局部翻页保护源页位置。财务仅替换历史容器，保留收款表单引用，不复制/提前 clean。
- 模块只在成功写入后调用 clean；失败/取消保留输入。商品返回来源显式验证唯一订单及商品关联，无来源时按允许角色返回可访问列表，没有扩大 ROUTES。
- `node scripts/verify-navigation-drafts.cjs`：25 场景 PASS（实际 handlers、异步/可控历史 Node 模型）。
- `node scripts/verify-draft-adapters.cjs`：17 场景 PASS（实际委托/submit/Promise、表单节点/输入/错误/焦点保留；几何是明确的输入桩）。
- `node scripts/verify-session.cjs`：PASS，五角色只读身份、退出/取消、存储/临时状态清理及重新登录。
- `node --check js/app.js` 与 `node --check js/utils.js`：PASS。

## 验证边界

没有执行浏览器、原生 Back/Forward、beforeunload 系统提示、跨浏览器、读屏或生产验证。数值未扩展，不重复上一轮千组数值 oracle。已有金额、快照、审核权限仍沿用原契约；本报告不将静态 demo 检查等同后端身份或服务端事务认证。
