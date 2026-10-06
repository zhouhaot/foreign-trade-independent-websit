# 第8轮独立 JavaScript 显示专项审查

日期：2026-10-07。基线：`7d5bbae486e7509044e4e1d1158b3fa9d03ec3aa`。开工已读 AGENTS、HANDOFF、H19 现实规划；先检查 staged/工作区差异，staged为空，范围为 views-docs 局部纸张审核 renderer/未知状态 banner及专用回归。源码只读，不改脚本/Mock/Git/CUA；仅拥有本报告。项目普通 JS，不虚构不存在的 TypeScript/npm/ESLint检查结果。

## 最终结论：APPROVE（静态前端 JavaScript 显示专项）

本专项未发现独立新增根因；综合代理的 Cc-only 可见性 MEDIUM 已有限修复，本专项独立复验通过，不重复计为自己的发现。当前专项范围没有未解决 CRITICAL/HIGH/MEDIUM。批准只认证实际静态/Node范围，不认证UI、制度或真实签名。

最终回读 hasVisibleReviewText：明确 string 类型；仅检查副本排 White_Space/Default_Ignorable/Cc 后是否仍有字符，不写回 name/date、不删历史、不禁合法多语言连接文字。实际单独运行最终 `verify-document-approval-display.cjs`：**137** 场景 PASS（首次报告131时尚未含 Cc/未知 banner新增断言）；没有用前一阶段 RED 后其它 shell 命令成功替代本脚本结果。

另8组独立最终 VM检查：CI/PL 的 Cc-only姓名显示记录待核对、Cc-only日期保王芳姓名且提示日期待核对；实际多语言/emoji/ZWJ姓名原文转义保留。三组通过场景各自仍保当前已通过章和 canExport=true（有效角色/实时订单/最新版本），所有读前后全 MOCK逐字不变。CI/PL未知状态含HTML时 banner正文esc转义且全模型纯读。views-docs语法最终再次 PASS。

此前24组正常通过全paper基线相等、15组空值/type/Unicode额外边界、动作尾段逐字不变与snapshot/workspace PASS证据保持。最终diff仅局部可见性helper、纸张renderer和未知banner；未更改Actions或权限。无需把缺日期提示延伸为日期合法性/真实签名验证，也不将原授权签字模板解释为已发生签署。

## 首次阶段（历史）：等待综合 Cc 边界修正后复验

本专项暂未发现另外的新根因。综合代理独立发现仅 Cc 控制码的姓名/日期被当可见字符串，已向 owner 报 MEDIUM；本报告不重复计为自己的 finding。实际运行专用脚本时读到 owner 新补的 RED，输出“CI: 只有 Cc 控制码的姓名不是可见姓名”，此时没有宣称该脚本 PASS。后续 shell 命令成功不代表前一脚本通过；最终必须单独回读该脚本完成结果。

## 已实际执行的独立证据

- Git 基线源码与当前源码从 `var documentInFlight` 开始的完整动作尾段按归一化换行逐字相同：没有更改 Actions、审批/资格/送审或数据写入逻辑。
- **24** 组正常已通过 CI/PL×四业务角色，完整 paper 字符串与基线逐字相等，覆盖6个正常通过版本；不只比较一个批准人子串。原章、Prepared by、签字模板、交易字段保持。
- **15** 组额外 null/type/Unicode 边界：undefined/null/number/object/array/boolean及纯空白/格式字符姓名均显示该版本已通过且记录待核对，不填 Approved by；日期 undefined/null/number/object/空/不可见字符时保可见原姓名（含 ZWJ）并提示日期待核对。每次 Views 读取前后完整 MOCK 逐字相同。
- `verify-document-snapshots.cjs` 和 `verify-document-workspace.cjs`：PASS。views-docs与专用脚本的 `node --check`、git diff-check：PASS。

## 类型、安全与语义边界

renderer 只检查当前查看版本的 status、approver、approvedAt，不读取其它版本或借历史姓名填当前批准人。明确 string 才作姓名/日期显示检查，空值/非string不会经隐式转型假造姓名；检查副本不写回原字段，输出经 esc。未通过的状态显示 Review status；通过无名仍保已通过和原章，姓名与日期待核对只为数据展示提示，不新增签署或正式制度。

章仍由当前版本 status 控制，canExport仍由独立实时订单/角色/最新版本policy控制。旧通过或取消订单的通过纸张可显示原历史批准人，不因此恢复当前导出资格。未知状态 banner说明状态待核对，避免旧兜底伪称制作中/未送审；原状态文字转义，不修状态或字段。

本轮没有 Promise/DOM新增事件或动态执行；展示函数不改审批记录、opinion/history、冻结快照或运输包装。姓名字符串内实际可见多语言/emoji连接文字应保原文，不能为处理隐形-only反例全面禁用语言格式字符。

## 验证边界

本专项实际运行隔离 VM/Node 和静态差异比较，未操作真实浏览器、像素、读屏、打印/签署、跨浏览器或生产环境。缺日期的提示不是制度有效期或真实签名认证；不认领 UI SHIP或其它代理的全部回归。Cc有限修正及最终137专用场景已实际复验，上方给出的批准仍限定本专项证据范围。
