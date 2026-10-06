# 第 7 轮独立综合代码审查

日期：2026-10-07。基线：`cff1a0e2445d5bd219947d925cea73aa9949c96d`。第一轮、三个具体反例有限补修及冻结后的相邻复审完成；本代理只写本报告，不修改源码/脚本/CSS/Mock/交接/Git，不认领整轮 UI 或生产业务认证。

最终代码结论：APPROVE。综合审查三项历史 MEDIUM 均已 Resolved；JavaScript 专项的纯不可见文本 MEDIUM 单独交叉引用，不合并抹除其原证据或重复计数。当前静态前端差异无未解决高置信发现。

## 范围与约定

已读 AGENTS、HANDOFF、H18 现实规划、共享包装材料和 JavaScript/度量专项初审；检查 staged/unstaged 差异及 helper、PL/CI 视图、保存/送审、文书动作资格和异步调用上下文。H18 仅用于 PL 包装候选：草稿可空待补，已填非法必须拒绝，送审须五项完整；件数正安全整数，重量 KG/KGS、体积 CBM，规范千分逗号和最多三位普通十进制，毛重不得小于净重。H12 交易精度和订单/审批/导出资格不扩大。

旧单证快照/交易和原合法单位文本保持；修订继承原包装，重制捕获当前交易但原包装仍需人工核对，不以复制证明符合当前货物。CI 不读写隐藏包装，不套 PL 完整门槛。审查重点为完整编辑候选、失败全模型零写、原始输入/错误 ARIA 与焦点、actor 引用/源 hash/DOM 和值漂移、异步互斥及旧版本隔离。

## 发现与处理

### [MEDIUM · Resolved] 编辑入口缺包装控件时回退旧存储值，候选并非完整展示输入

初轮位置：`js/views-docs.js:375` bindDocInputs、`:381` readEditValues 与 `:419` packagingValues（整合过程行号可能小幅移动）。绑定函数只收存在的节点，读取函数只给存在的字段赋候选值；随后将缺失字段从 d.packing 合并补齐。异步验证只能核对已捕获的节点，不能发现入口时已缺的输入。

独立加载真实 doc/app 事件、U.withLoading/confirm 和 Promise 到隔离 Node DOM fixture：最新合法 PL 设草稿、订单执行中，进入编辑；件数填写 17、毛重填写 `1,800 KGS`，调用保存/送审前移除 `df-pk-gw`。两条动作均成功写入件数 17 并沿用旧 `1,680 KGS` 毛重；送审变“待审核”并新增审批，完整 MOCK 对照 noWrite=false。其余包装合法，故 helper 无法识别毛重来自隐藏旧值；DOM/value guard 因未捕获此节点也不能拒绝。

已向中枢和单证 owner 报告：编辑状态要求唛头/备注和 PL 五项编辑控件完整存在、连接当前页并捕获；缺控件不是用户明确留空，必须在写入/日志/审批/clean 前拒绝并提示重新核对。只读送审读取存储完整包装，不能误要求编辑输入；CI 只要求自身可编辑字段，不读隐藏 packing。建议两动作逐字段入口缺失回归，全模型零写并保留其它字段。当前不将该 Node 缺字段模拟称作真实浏览器复现。

有限修正已回读并独立 GREEN：bindDocInputs 在编辑模式要求 marks/remark 和 PL 五项均存在、未断开且 value 为 string；缺任何控件立即具名拒绝，不读取 stored 补缺；只读送审捕获源 hash/编辑状态但不读取残余他页编辑控件。独立重放原 GW 删除的 save/submit，两次完整 MOCK 逐字不变，反馈指明毛重控件缺失且不能使用旧包装值。动作脚本新增 14 个逐控件缺失断言和只读隔离，目前 97 例独立 PASS。

### [MEDIUM · Resolved] 已离开源单证的失败回调会清新页错误并移动焦点

最终相邻位置：`js/views-docs.js:355`～`362` validateDocAction 的 error 分支。只有构造 current 包装诊断的内部条件核对 sourceHash/actor/原 inputs，但之后无条件 showPackingErrors。该函数按全局 df-pk-ID 清所有错误/aria-invalid、写当前页 alert 并聚焦；因此源票据失败也会操作新页 DOM。

独立真实 doc/confirm/Promise fixture：PL A 编辑页打开送审确认，再挂载另一 PL B 的编辑页（原 overlay 仍 connected），给 B 毛重输入 bad 并用真实 U.fieldError 标记“本页毛重格式错误”，然后点击旧 A 确认。完整 MOCK 保持不变，但 B 毛重 aria-invalid 由 true 变 null，原字段原因被清空，焦点移到 B 的 doc-packing-feedback，写入旧 A 的页面/输入变化原因。拒绝业务写入没有同时保护新页的校验状态。

已报中枢：跨 hash/身份/原输入节点失效时仅 Toast，不调用清理或聚焦源字段的 helper。只有仍处原源页且字段属于原节点时，才显示当前候选漂移的具名诊断。此为本轮新增错误展示分支的上下文回归，不声称真实原生浏览器复现。

root 有限修正后独立原顺序 GREEN：bindDocInputs 另捕获 feedback 节点；失败只有 hash、原 actor、编辑状态、全部原输入节点及连接和原 feedback 节点仍归源页时显示/聚焦字段原因，跨页仅提示。B 毛重 aria-invalid 保持 true，原“本页毛重格式错误”原因不清、焦点仍在 B 输入，完整 MOCK 不变。动作脚本新增保存/送审×另一页/同址重建，共 4 场景，当前 101 例独立 PASS；同页非法值漂移仍给具体原因，不因修正漏提示。中枢首个新增 fixture 选择只读待审核目标导致无 input 已纠正，未将该构造错误计为实现红灯或通过证据。

### [MEDIUM · Resolved] 只读送审入口捕获错源 hash，未确认路径对应单证

中枢提出该疑点后独立取证。位置：`js/views-docs.js:378` bindDocInputs 捕获 location.hash，`:381` 只读路径直接 return true；doc-submit 调用此函数前仅检查文书资格，没有将地址匹配 ticket.doc.id。

具体反例：把 `D-PL2026001-V1` 设合法草稿、订单执行中并挂载其只读详情，保留真实 DOM 提交按钮；仅将 hash 改为 `#/documents/D-PL2026004-V1`，不刷新 DOM（模拟地址已变、hash 事件处理之前）。点击仍 connected 的 A 提交按钮并确认：A 变待审核、新增审批，完整 MOCK noWrite=false，地址仍为 PL4，有成功提示。sourceHash 把错误当前地址当源，readonly 的 inputs=[] 也不能确认页面对象；后续 exact hash 比较仍通过。

已向中枢给出实际证据，建议限本轮 save/submit 绑定入口检查规范 encoded doc ID 详情路径并允许 query，在捕获 sourceHash 之前拒绝错页，不扩大未改的审核/导出资格。该复现为真实源码/Node 事件模型，不是原生浏览器复现；此前未取证时仅是疑点，未提前列作问题。

修正回读：bindDocInputs 在 sourceHash 捕获前要求 `#/documents/` + encodeURIComponent(ticket.doc.id) 的规范详情路径，query 允许，错误入口直接拒绝。调用范围仍只有保存/送审，没有把规则扩到其它文书动作。独立原 connected A 按钮/hash B/DOM 未更新反例 GREEN：不打开确认、不变任何模型、有来源地址具体原因；独立带 `?view=paper` 的合法只读路径正常送审。专用新增 9 错源与 1 合法 query，101→111 场景全部 PASS。

旧 lifecycle 的正常 doc() 与 views 编辑桩显式提供该版本规范来源地址（此前为空），只补合法入口上下文，没有删除或弱化 90/100 的原角色、状态、版本、延迟和业务断言；不把修正 fixture 当真实业务故障。

### 专项交叉证据：纯不可见包装方式（MEDIUM · Resolved）

`javascript-review.md` 独立发现 package 仅零宽字符可被判完整；root 有限补修以 Unicode White_Space/Default_Ignorable 检查副本判断是否存在可见字符，保存原多语言/emoji 文本，不全面禁用连接字符或猜长度政策。该问题由专项保留原复现和 152 oracle 复验；本报告引用其独立证据，不计为本报告第二个新根因，也不认领其额外 oracle。

## 当前独立执行证据

- 包装 helper **644** 候选 PASS：原 5 PL 原文、正安全件数、明确单位/三位度量、精确毛净关系、草稿空/送审完整度和不可见文本边界，无 source 写入或 H12 漂移。
- 单证包装动作当前 **81** 场景 PASS（首交付 77 后 owner 添加相邻断言）：真实视图/委托/confirm/Promise 模型；编辑和非编辑送审、保存部分合法草稿、值/节点/会话/源地址/状态/最新版本漂移、取消/重复、CI 隐藏包装与旧修订隔离。本代理上述缺字段入口反例独立于该脚本覆盖。
- 文书生命周期 **90**、历史快照、导航 **33** 场景独立执行 PASS；不把这些 Node 模型认证为原生浏览器、真实签发或服务器事务。
- utils/views-docs/views-fin 语法和 git diff-check PASS（只有 Git 换行提示）。helper 使用有界 BigInt scale1000 直接解析与比较，不先 Number 舍入度量；箱数检查范围后才转 Number。度量原文保留，失败 packing=null；无换汇、依赖、远程服务或 Mock 源改动。
- 预览值 esc 转义，具体错误 textContent；输入具名/单位提示和错误引用可读。当前 CSS 仅包装类，错误非空自然折行，没有以裁切字段隐藏错误。views-fin 当前只补重制来源警示文字，未改审批/金额逻辑。
- 最终交付后包装动作 **97**、helper **644**、100 岗位/视图、文书生命周期 **90**、历史快照再次独立执行 PASS。确认面板显示五项完整候选及编辑/已保存来源，逐值 esc；保存“包装未保存”和送审“本次未送审”文案没有更改提交逻辑。共同毛净原因仅在右栏去重，两个输入仍关联同一可读原因，原单位提示保留。旧 verify-views 桩补齐真实重量/体积输入及原生反馈能力，没有删除原业务断言。
- 最终三项修正冻结后，另独立直接重放 **5 个场景**：原缺 GW 保存/送审、旧 A 回调对新 B 错误/ARIA/焦点、旧 connected A 按钮在 hash B 的只读入口、合法 query 正常送审。三个原反例均符合完整模型零写；新页错误和焦点保留，合法路径成功。所有直接对照都加载实际源码/真实 Promise/委托 fixture，不改正式样例，也不是原生浏览器声明。
- 冻结版本独立执行：包装动作 **111**、候选 **644**、lifecycle **90**、views **100**、document workspace、draft adapters **17**、document snapshots、cancellation、navigation **33** 全部 PASS；运行 JS 语法和 diff-check PASS。CI/PL 唛头/备注编辑 textarea 新增 aria-label，输入 ID、value、事件和只读纸张分支不变，不能据此宣称完整无障碍认证。

## 当前验证边界

包装是显式可撤销原型假设，不证明物理件数/计量、包装与货物匹配、正式制度或审批事实。假登录、内存写入、刷新重置不证明后端权限/数据库事务；file://、跨浏览器、真实读屏、实际关闭提示、签发文件/NAS/测量均不能由 Node PASS 推断。本轮 UI 正在整合，尚未作完整浏览器/像素结论。

## Review Summary

| Severity | Count | Status |
|----------|-------|--------|
| CRITICAL | 0 | pass |
| HIGH | 0 | pass |
| MEDIUM | 0 | pass（本报告历史三项 Resolved） |
| LOW | 0 | pass |

Verdict: APPROVE — 三项综合 MEDIUM 已有限修正并独立复验，冻结代码及相邻差异无未解决发现；本结论限静态前端/代码证据，不认领 UI SHIP 或生产服务/计量/身份认证。
