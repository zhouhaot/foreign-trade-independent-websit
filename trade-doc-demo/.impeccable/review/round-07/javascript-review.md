# 第7轮独立 JavaScript 与包装度量专项审查

日期：2026-10-07。基线：`cff1a0e2445d5bd219947d925cea73aa9949c96d`。开工已读 AGENTS/HANDOFF 与本轮 H18 现实规划，检查 staged/工作区差异；staged 为空，首先审查 root 的 U.packagingCandidate，随后复审最终 PL/CI 动作集成与有限财务警示。源文件只读，不覆盖其他作者；只拥有本报告，交接/Git 由中枢统一处理。普通 JavaScript，无 TS/npm/lint 配置，不虚构该类检查通过。

## 最终结论：APPROVE（静态前端 JavaScript 与包装度量专项）

本专项原一项 MEDIUM 已 Resolved，最终范围没有未解决 CRITICAL/HIGH/MEDIUM。综合审查另外发现的缺控件回退旧值根因由其报告保留，本专项实际回读其修复并独立核对结果，不重复计为自己的新 finding。批准不代表 UI SHIP、真实物流度量或生产事务认证。

### helper finding 修复与阶段记录

原纯隐形包装方式 MEDIUM 已 **Resolved**。回读修正：仅为判断是否至少有一个非 White_Space/Default_Ignorable 字符而构造检查副本，没有清洗保存文本，没有全面禁用多语言连接字符、自动截断或引入长度政策。

实际独立修复复验：原 package=U+200B，以及 ZWNJ/ZWJ/WORD JOINER/combining grapheme joiner/variation selector/空白混合，草稿和完整送审均返回 ok=false/packing=null、具名可见文字错误，原输入不变；具有实际字符的 Indic/CJK 与 emoji joining 文本原样通过。此前152组近整数极值 BigInt/部分完整度 oracle 再次 PASS。helper专用 **644** 候选与 utils语法再次 PASS。

初次动作集成只读复核时实际运行 `verify-packaging-actions.cjs` 为77场景 PASS，views-docs语法 PASS；当时 worker 仍整理兼容桩，未提前批准。最终完整控件/旧 overlay 等修正后按下方证据再作批准，不删除中间阶段。

### 最终动作与有限 UI 相邻复核

编辑入口现在要求 CI 唛头/备注、PL 唛头/备注及五项包装控件完整且连接，value 为文本，缺项在写入前拒绝，不使用存储包装补缺。源 hash、编辑状态、节点身份/连接和原值绑定；合法 A→合法 B 也拒绝静默提交。actor 既比较 id/name/role 又比较对象引用，同值新会话不能使用原票据。实际提交阶段重验资格、对象/状态/审批内容与候选，成功后才 clean；非法漂移保原输入并给具名原因。

只读 PL 送审只校验存储包装，不读取页面残余编辑控件；CI 保存/送审不套 PL 完整度、不写隐藏 packing。送审确认显示本次五项候选，并绑定 actual overlay 的连接和 modal-root 当前 child，关闭或替换后旧回调拒绝。互斥和 completed 保持一次提交。原受控修订继承包装但不洗来源，财务重制只补“继承包装仍需制单人按当前交易核对”说明，未更改审批资格、旧版本或快照捕获规则。

有限 UI 相邻差异：保存与送审失败 Toast 分别说明“未保存”/“未送审”，完整字段说明仍就近保留；毛净共同原因在两输入处均保留，对操作区摘要去重。使用 textContent/esc，没有 HTML 注入或字段重建。helper本轮后续未扩展三位/单位/可见文字范围。

最终实际独立验证：

- `verify-packaging-actions.cjs`：**97** 场景 PASS，包含编辑入口逐字段缺失、同值 actor 替换、源节点/route、合法/非法漂移、只读存储、旧 overlay/取消、重复、CI 隐藏包装及原修订隔离。
- `verify-packaging-contract.cjs`：**644** 候选再次 PASS；此前独立152组 BigInt 极值/空 mask oracle及隐形文字反例已按上方证据复验。
- `verify-document-lifecycle.cjs`：**90** 异步角色/状态/取消/竞争与正常转换场景 PASS。
- 额外7组聚焦实际动作：保存/送审前缺毛重输入均全 MOCK 逐字不变；排队保存后同值 actor 替换、合法件数变化、非法件数变化均零写；只读 PL 忽略额外同 ID 的无关毛重输入且保原 packing；取消后手持旧确认按钮回调仍零写。全部是 Node DOM/Promise 模型。
- utils/views-docs/views-fin 的 node语法检查通过（utils此前检查后实现已冻结，docs/fin最终重新检查），最终 `git diff --check` PASS，仅有常规换行提示。

本代理没有操作浏览器、像素或生产环境；本报告仅认证实际 Node/静态差异范围。

### 97场景批准后的有限相邻修正复验

此前97场景阶段 APPROVE记录保持。综合审查随后发现旧确认失败对新页错误DOM的干扰，以及只读入口地址已变但旧按钮尚在时的来源缺口；它们不是本专项新根因，原复现/严重度归综合报告。本专项在修正后再次回读最终源码：失败展示须原 hash、actor引用、编辑态、全部原字段节点/连接与原 feedback 容器仍属于源页，才可清理/标记/聚焦源输入；跨页或新节点只反馈 Toast。同页非法输入漂移的完整上下文和具体字段原因均保留。bindDocInputs 开始要求规范 encoded doc 详情来源（可带 query），在任何候选读取/窗口/写入前拒绝错误来源。CI/PL 唛头和备注新增 aria-label 只补名称，不改变值或权限。

最后实际独立执行包装动作 **111**（77→97→101→111新增覆盖分别记录）、views-docs语法与diff-check：PASS。额外3组独立相邻模型：旧PL A确认在新PL B页触发后，完整 MOCK零写，B原毛重错误/aria-invalid/aria-describedby/feedback原文字/字段焦点逐项保留；只读PL的源hash已变为订单但原按钮仍在时，开窗前拒绝且完整模型不变；规范源详情带query合法送审。helper644实现未变化，不重复扩大旧oracle或像素矩阵。最终专项 **APPROVE保持**，原阶段批准与后续相邻复验分别呈现，没有认领浏览器或整轮UI结论。

## 首次 helper 结论（历史）：WARNING

### MEDIUM [Resolved]：纯隐形包装方式被判为完整可送审文本

位置：`js/utils.js` 的 U.packagingCandidate，package 分支。trim 与 C0/DEL/2028/2029 检查后，任意非空字符串直接接受。

实际隔离 Node 反例：packing={cartons:1, package:"\u200b", gw:"1 KG", nw:"1 KG", meas:"1 CBM"}，requireComplete=true 返回 ok=true/complete=true；包装方式肉眼空白却满足本轮 H18“非空实际文字/可读单行文本”的完整度要求。没有修改源码或正式样例，已即时交 root。

首次建议只拒绝没有任何可见文字的包装方式（空白和 Unicode 格式控制组合），并在假设材料解释该输入范围，不未经业务依据禁止所有合法多语言 ZWJ/ZWNJ 用法或增加任意长度上限。此 finding 是字符串完整度，不是声称所有 Unicode 隐形字符都危险，也不是 XSS；显示路径仍应转义。root按有限策略修复，已独立复验通过。本代理未修改实现或正式样例。

## 已实际执行的独立检查

- `node scripts/verify-packaging-contract.cjs`：633 候选 PASS（原有5个 PL 文本、正安全件数、明确单位/三位小数、部分草稿/完整送审、毛净关系、无原模型写入与 H12 两位约束）。首次脚本未覆盖纯隐形 package。
- `node --check js/utils.js`：PASS。
- 额外 **152** 个独立 oracle：120 对接近 MAX_SAFE_INTEGER 的缩放毛/净重，用宿主 BigInt 原始整数构造文本并比较，不共享运行解析器；32 种字段空值 mask 核对草稿可空/送审完整度。全部 PASS。
- oracle 同时检查原输入 JSON 逐字不变、成功结果 JSON 往返相同、度量原文保留、失败 packing=null；不支持的 packing 或 raw bigint 类型明确拒绝。字符串候选不静默截断或改写商品/物流原文。

## 可确认的 API 和数值边界

只识别 H18 支持的箱数普通正安全整数、GW/NW 的 KG/KGS、MEAS 的 CBM；点最多三位，逗号仅标准千分分组，拒绝指数/hex/双单位/未知单位。度量直接从字符串构造 scale1000 的 BigInt，再检查有界范围、比较 GW≥NW；没有先转 Number 丢小数、公斤转磅/吨或误用 H12 交易两位规则。成功保留度量文本（仅首尾 trim）；箱数保持既有模型 Number 类型，未知草稿用空，不伪装成0。

helper 只返回独立候选、具名 errors/完整 error 和 complete；任何已填错误返回 packing=null，不能误用部分候选。既有样例字符串通过不代表包装与货物真实匹配，范围检查不代表超大物流数合理。不会洗历史、修改交易快照或撤销旧审核事实。

## 动作交付复核阶段说明

首次 helper 阶段，worker 保存/编辑送审/非编辑送审与身份/DOM/异步集成尚未交付，所以未以 helper PASS 推断动作通过。最终按上方97/90及额外7组证据复审；两创建路径的已有资格/快照规则保持，有限重制警示不等于包装与当前货物已真实匹配。

## 证据边界

本报告实际运行 helper、动作、生命周期与独立 oracle 的 Node/源码检查。没有操作浏览器、像素、读屏、跨浏览器、真实装运计量/审核/签发、后端或生产事务，不认领 UI SHIP。
