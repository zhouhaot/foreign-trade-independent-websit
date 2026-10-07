# 第13轮独立综合代码审查

日期2026-10-07。基线 `58a65822e400fcd75398b642456648bd558a8e24`。只拥有本报告；实现、Mock、旧脚本、其它材料/HANDOFF与Git只读。已读AGENTS、交接与H24现实规划/UI预案，实际 staged/unstaged diff 与原View/policy/rightPanel周边。本 reviewer 未操作CUA、不认领本轮原生图或UI/Git结论。

## 当前差异与结论

生产仅 `views-docs.js:107` 已退回与`:110` 草稿/制作中两个横幅表达改变，diff为2行新增/2行删除；不改原权限、数据或新功能入口。

- 继续使用View既有 `U.documentPolicy(d, ctx.user)`，不从App.user/maker/roleUser猜actor。草稿/制作中只canEdit时说明原可编辑字段，CI唛头/备注、PL含包装；否则完整esc原edit原因。交易数据仍冻结只读。
- 退回保原opinion/approver/approvedAt事实前缀逐字与转义。当前指导仅原canEdit和canSubmit同时真才邀修订送审；原policy对本轮三候选的edit/submit条件相同，未用显示逻辑改变资格。canReform独立核，原PL4已有待处理重制不能重复邀请，但原编辑/送审仍可办。
- 历史、取消两态、缺关联/版本冲突/身份异常继续原完整阻断原因；不补恢复期限/新分派或自动最新。原意见自己包含重送/重制文字属于事实，不能因当前只读删除它。
- 已通过/待审核/未知三个banner、纸张H19、目录、工具栏、rightPanel、history/来源披露及Actions全保；新reason经过现有esc，无新输入/事件/外部link/依赖。

当前新增高置信finding为0。首阶段实际读取生产SHA256 `FB23CA00D0059C8B958F470FDB76BC42732ACADF3E5F7E41CB3681EBE96C1043`；专项脚本 `5CE213DFF6FD0E4E33FECAD5517D40D701B283C372778EA50E67CC582FAB71FC`。此指纹是实际捕获，不替后续必要UI小修背书。

## 本 reviewer 实际执行

| 检查 | 实际结果 |
| --- | --- |
| 新verify-document-status-guidance | 33 PASS：实际View/policy/原Actions、5role、草稿/当前/历史/重制受阻、缺关联/冲突/身份、安全文字、取消申请→主管退回恢复/通过取消；整Mock读取前后相等、基线outside-banner与其它源行精保 |
| 独立临时真实View对照 | 70 PASS，详下；加载指定基线与当前源码在同一VM/同一冻结交易对象逐项比较，无模拟policy |
| verify-document-approval-display | 原137 PASS；批准事实与当前资格、历史纸张/转义等相邻断言 |
| verify-document-lifecycle | 原90 PASS及正常状态/延迟guard/不可变snapshot/财务隔离/原版本策略 |
| verify-views | 原100 role/view与原报价/订单/单证保存取消、金额与延迟角色回归PASS |
| 语法/差异 | views-docs与新脚本两node --check、git diff --check PASS |

独立70项包括原11文书×5实际演示role的55个整页对照；9个历史意见含“请按意见修订后重新提交审核”“也可申请重新制单生成新版本”“重新送审”分别在历史doc、当前sales只读与当前doc可编三场景完整保留。每条先读原事实prefix，再独立截新增guidance核资格，不能对整banner禁指导字句而洗掉旧意见。另2个ctx/App相反actor引用，明确横幅按ctx的政策（不把原右栏未改上下文扩大为新契约）；2个PL4有待处理重制false/隔离移除待处理后原policy可重制true；2个原CI4/PL4编辑态。

每条70对照完整Mock JSON前后相同，删除唯一banner片段后整页HTML与同模型原View逐字相同，包含纸张、目录、编辑控件、右栏、来源与留痕；删两owned源行后全views-docs归一CRLF/LF与基线相同。原三个未改banner在33专项及源对照保留。它们是字符串/数据证据，不认证像素、实际读屏、正式签章或生产事务。

两正常reform分支的独立模型说明：原PL4保持原AP20260905时canEdit/canSubmit=true但canReform=false，显示完整原重制原因；仅隔离VM去掉该待处理关联后canReform=true，正常邀请出现，不在原Mock源码或真实UI造新申请/删除历史。

## 测试范围及后续边界

当前33脚本只读场景对整banner禁完整当前指导句，恰好含同句的历史opinion可能造成测试假红；本 reviewer 已独立9例用事实prefix/新guidance分开证明当前生产保原，并把方法边界报告中枢和owner。此为测试扩展时必须分层读取的注意，不是发现历史数据被删或新生产finding；若owner补同句fixture与方法，需按新冻结脚本有限复验，不修改原事实去让禁词通过。

正常生命周期写来自专项原Actions，之后读取再做零写比较，不把成功取消/审批业务写说成全流程零写；独立70里异常意见/重制对照仅隔离模型，不冒原生样例。既有静态假登录、内存刷新复位、导出演示与原router/资格仍沿原边界。本 reviewer未看新首图/终图，不预写SHIP/native/Git，也不认证后台权限/正式作业制度/NAS/file/跨浏览器。

## 专项方法有限补审（首阶段之后）

中枢另派本子任务，范围仅新专项脚本的历史事实/当前指导分层；不覆盖上述33/70首阶段证据或已结束的独立UI首评。实际重新读取views-docs全R13 diff及新专项：生产仍仅两个横幅源行，没有新增源码/CSS/Actions变化。实际SHA256仍 `FB23CA00D0059C8B958F470FDB76BC42732ACADF3E5F7E41CB3681EBE96C1043`；专项脚本现为 `1D7ACE304B8DAEB20648AFF3EA750C102FF7CFF96B68F2AEA2AD41905AF7255B`，取代首阶段脚本指纹而不抹掉当时记录。

专项现在先从同模型baseline banner取原退回事实prefix，逐字核新banner的完整escaped prefix，然后只对新guidance尾部拒绝操作承诺、核完整原edit/reform原因及真实资格。新增历史CI3V1原opinion精确含两邀请句，另夹恶意HTML/name/date的隔离case：逐个原值完整转义保留、无真实img/script标签；tail精确等于当前只读+原完整edit原因，不用禁词删除原事实。原横幅外整页/完整Mock/其它源行精保和原33场景均留，新增一项为34。

本reviewer实际运行新34 PASS、views-docs与专项两项node --check均exit0、git diff --check exit0。源码hash未变，因此按授权不重复70或邻137/90；它们保留首阶段实证。本reviewer没有直接运行owner旧方法RED，RED来源为worker通知，独立首阶段9个同句事实case已实际证明生产原本正确，本阶段实跑新方法GREEN。此为测试误判方法的补强，不记生产缺陷或新修权限漏洞，也不认领UI/Git。

有限补审没有新增finding；生产APPROVE保持，新专项补核APPROVE。本文此阶段写入结束，UI终图另行任务/材料，不混入该代码判断。

## Review Summary

| Severity | Count | Status |
|----------|-------|--------|
| CRITICAL | 0 | pass |
| HIGH | 0 | pass |
| MEDIUM | 0 | pass |
| LOW | 0 | pass |

Verdict: APPROVE — 当前两处H24横幅代码及专项34的方法补强通过；首阶段33/70/137/90/100证据保留。后续实际新差异有限补审，不预写UI或Git。
