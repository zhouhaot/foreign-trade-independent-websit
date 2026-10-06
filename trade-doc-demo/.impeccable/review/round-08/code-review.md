# 第 8 轮独立综合代码审查

日期：2026-10-07。基线：`7d5bbae486e7509044e4e1d1158b3fa9d03ec3aa`。首轮源码/专用回归、具体反例有限补修及最终独立输出对照完成。本代理只写本报告，不修改实现/脚本/CSS/Mock/交接/Git，不操作 CUA 或认领真实浏览器。

最终代码结论：APPROVE。历史一项 MEDIUM 已 Resolved，原四个反例与修后直接复验保留；当前局部静态前端差异无未解决高置信问题。本结论不等于 UI SHIP 或正式审核/签署认证。

## 范围与 H19

读取 AGENTS、HANDOFF、第8轮规划与 documents 材料，查看 staged/unstaged diff 和纸张、状态横幅、章、导出资格及动作调用上下文。当前只读 renderer 供 CI/PL 复用：未通过不把历史处理人填作 Approved by，草稿/制作中、待本次审核、退回、通过、未知分别表达；已通过缺记录仍保持通过事实并提示待核对，缺日期保原姓名。

只依据当前查看版本状态，不借其它版本/文书补姓名或日期；旧通过/取消两态的姓名与章保留，当前 canExport 独立。H19 不引入正式签署、日期格式/有效性制度或姓名身份认证，也不洗历史意见/快照/审核决定。

## [MEDIUM · Resolved] 只含控制字符的姓名/日期被当成有可见内容

首轮位置：`js/views-docs.js:239` visibleName、`:243` missingDate。检查副本只移除 Unicode White_Space/Default_Ignorable，没有排除非打印 Control/Cc。

独立实际 Views 反例：CI/PL 已通过，approver 为 `U+0001 U+0007`，纸张输出 Approved by 后只有这两个控制码，没有“审核记录待核对”；正常姓名且 approvedAt 为同样两个控制码，又没有“审核日期待核对”。共四个输出反例，完整 MOCK 前后逐字一致。该判断把非打印控制码当记录内容，违反 H19 无可见姓名/日期应待核对的显示契约。

已即时向中枢报告；建议仅可见性检查副本排除 Control/Cc，不清洗原记录或正常多语言/连接 emoji，不增加正式姓名/日期格式规则。这是隔离 Node renderer 字符串证据，没有把异常注入正式样例或称原生浏览器像素复现。

有限修正回读：局部 hasVisibleReviewText 对检查副本移除 White_Space、Default_Ignorable、Cc，供姓名/日期共同使用；原 approver/approvedAt 原文不写回，正常可见姓名仍 esc 输出。worker 追加四个纯 Cc 反例先 RED，再补两份可见姓名夹 Cc 原文保留断言，131→137 GREEN；没有借此增加姓名长度/身份、日期语法或实际有效性门槛。

本代理独立重放原 CI/PL×姓名/日期四反例 GREEN：缺姓名不填 Approved by，仍表达本版本通过和记录待核对；正常姓名/控制码日期保原姓名并提示日期待核对；原章保持，四次完整 MOCK 前后逐字一致。首次 Open 是已记录的首审阶段，现已 Resolved，没有把未修阶段倒写成初次通过。

## 当前独立验证

- `verify-document-approval-display.cjs` 首交付 **131** 组独立 PASS：四业务角色/两纸张状态矩阵、缺名/缺日期/未知、旧版本和取消资格、长姓名/多语言/转义、真实退回→重送→通过。首脚本尚未覆盖上述只含控制码的反例。
- snapshots、lifecycle **90**、packaging actions **111**、workspace、draft adapters **17**、cancellation、views **100** 独立 PASS。当前未修改旧测试断言；脚本 PASS 不代表原生历史/浏览器布局/正式签发。
- 独立与基线比较“动作资格”注释以下全部源码：只正规化 CRLF 与末尾换行后完全相同，动作/权限/状态写入逻辑无改变。初次原始字节断言仅因末尾一个换行不同失败，检查后按明确正规化重验，不称原始字节完全相同。
- 另以基线/当前各自加载真实 Views，原 6 份已通过文书×4角色，共 **24** 份完整 paper 段（含原章/包裹结尾）字符串逐字一致，远超只核姓名片段。此为原合法样例兼容，不涵盖所有异常记录。
- views-docs 与新增脚本语法、git diff-check PASS（只有 Git 换行提示）。正常姓名经 esc，缺记录只生成固定文字；未知状态横幅也用 esc 并不再默认制作中。共享工具/Mock/路由/业务动作未改。
- 补修后的最终独立执行：专用 **137**、lifecycle **90**、snapshots、views **100**、packaging actions **111** 全部 PASS；语法/diff-check 通过。另重做 **24** 份原已通过整 paper 段与基线逐字相等及动作源码正规化后精确相同，原正常片段/交易/章没有被可见性修正改写。

## 最终 CSS 相邻补审

首次代码 APPROVE 后中枢仅追加两条 pages.css：纸张内 paper-review-status 宽 220px/max-width:100%，paper-review-note max-width:220px，均 line-height:1.6、white-space:normal、overflow-wrap:anywhere。回读现有签字线 220px 与两列上下文，新的状态/缺日期说明可折行，不作用于正常 Approved by 原片段、不修改交易/章/业务动作，也不隐藏文本；当前差异无新增高置信发现，diff-check PASS。JS 无新变化，故不重复全套脚本。

中枢报告首四张实图反馈右状态 390px 与原签字线/左列 220px 不对称，补修后实际 1440px 两列宽与 scrollWidth 均 220px、右双语两行完整；这些实际布局由中枢/UI 验证，本代理只做代码/选择器复审，不认领其原生测量、截图或视觉 SHIP。

## 证据边界

尚未作本代理真实 UI、读屏、跨浏览器、打印/PDF、正式签署、实际历史签发、企业日期/姓名制度或后台认证。Approved by 是原型审核记录呈现，Authorized Signature 仍是原模板文字。当前可见性缺口修正不能推导出真实记录有效。中枢后续浏览器/布局/截图证据如引用，将单独说明其执行者与覆盖范围。

## Review Summary

| Severity | Count | Status |
|----------|-------|--------|
| CRITICAL | 0 | pass |
| HIGH | 0 | pass |
| MEDIUM | 0 | pass（历史一项 Resolved） |
| LOW | 0 | pass |

Verdict: APPROVE — 唯一历史 MEDIUM 已有限修正并独立复验，当前纸张 renderer/未知状态横幅及两条最终 CSS 差异无未解决发现；不扩称真实浏览器、UI SHIP、正式签署或企业姓名/日期制度认证。
