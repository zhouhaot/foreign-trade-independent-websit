# 第13轮独立 JavaScript / 安全复审

日期：2026-10-07。当前冻结源码的有限代码结论：**APPROVE**，没有新增待处理的 CRITICAL/HIGH/MEDIUM/LOW finding。仅批准下述指纹对应的两处状态指导差异及实际Node证据；原生/UI终审、完整统测和Git回执归中枢，不在本文认证。

## 范围与方法

基线 `58a65822e400fcd75398b642456648bd558a8e24`。开工读取AGENTS/HANDOFF、本轮规划与实际round-13-docs实施材料；以本地git diff建立范围，views-docs只改草稿/制作中与已退回两个banner行，另新verify-document-status-guidance。读取原documentPolicy、docDetail上下文与原doc-edit等动作，不改任何其他文件。

无构建普通JS项目没有TypeScript配置或canonical typecheck，TS检查不适用；没有ESLint配置/项目lint命令，未执行ESLint。运行JS与新脚本node --check实际通过，git diff --check exit0；这是本地review，没有宣称PR CI/merge readiness已核验。没有为两行差异泛重复31项全套。

本代理唯一写入本文；只读代码/测试并stdin执行隔离VM，未改源码、脚本、Mock、治理、其他材料、CUA或Git，不回退他人编辑。主代理统一HANDOFF。误先查round-13-documents文件名后已按清单读真实round-13-docs，不把缺文件读取当产品finding。

## 代码判断

- banner使用docDetail已按实际ctx.user得到的原policy，制作中/草稿仅canEdit真才提示编辑。CI指导唛头/备注，PL包括包装，与原表单对应；无权/旧版/暂停/冲突/缺关联只显示完整原reasons.edit，不放宽权限。
- 已退回原opinion/approver/approvedAt及标点事实前缀继续原U.esc表达；canEdit&&canSubmit真才指导修订重送，canReform真才邀请申请重制。原PL4有待处理重制时仅保原完整reasons.reform，不能因可Edit而邀请重复申请。
- 当前指导与历史意见是两段不同内容。即使原意见本身写有“修订后重新提交/申请重新制单”，仍须保原完整事实；不能为“只读不得指导”测试删历史文字。本代理独立场景按旧prefix与新增tail检查，证明这个边界。
- 新插入所有原reason均U.esc，无新增动态href、属性、HTML执行或异步；退回事实的esc原样，完整恶意quote/HTML文本保为内容，不生成脚本/图片。未知状态、已通过、待审核三横幅精确保留，不顺手扩指导范围。
- 两行以外的Views/helper/Actions源码归一CRLF后完全相等；同一fixture新旧Views去掉各自banner后整页HTML逐字相等，纸面H19、rightPanel、toolbar、版本目录、来源与历史无改。actual ctx与App.user不同时仅新banner契约取ctx，不改原右栏身份实现。
- View和拒绝/进入原doc-edit的Action均完整MOCK零写；没有修改status、审批字段、snapshot、金额、收款或历史。取消/恢复与送审能力继续原policy/原Actions，不从岗位名称猜授权、不加入maker归属政策。

## 本代理实际验证

### 固定原基线RED探针

实际执行 `node scripts/verify-document-status-guidance.cjs --probe-original`，终端明确exit1。真实基线Views与实际policy/原doc-edit同时证明：sales/fin/boss看CI4制作中、doc看历史CI3V1，均canEdit=false、没有编辑按钮、编辑Action拒绝、完整模型不写，却仍有旧编辑/重送指导。四条RED输出与4!==0被实际观察，未用缺API或假成功函数替代业务红灯。

当前默认脚本实际33 PASS/exit0；--probe-original仍是固定旧基线故意失败，不计为当前修复失败或当前GREEN。

### 独立20个聚焦场景 PASS

经stdin执行，分别读取准确Git基线和当前source，加载同一真实Mock/utils/Views/Actions；只包裹documentPolicy记录参数后调用原函数，不改工作资格返回值。每场景比较完整模型、新旧整页除banner HTML，并调用原doc-edit确认结果仍等于原canEdit。

| 独立组 | 数量 | 实际证明 |
|---|---:|---|
| CI制作中五身份 | 5 | 首个policy实际参数严格等于ctx.user对象；故意App.user不同也不借权。doc只提示唛头/备注，其他四role保原只读原因；原编辑Action资格不变 |
| 历史意见同句与HTML | 1 | 原历史CI3V1意见含两句修订重送/申请重制和恶意script/引号/换行，姓名/日期也含HTML；原prefix逐字保留，新增tail精确只有原当前只读原因；全部原文escaped、无新增script/img |
| 原PL4 pending与可Reform候选 | 2 | 原待处理重制仍显示完整旧阻断reason、不邀请；仅隔离删除pending后原policy真可Reform才指导申请，未改审批算法 |
| 缺关联/版本冲突 | 2 | 实际policy拒绝，原原因完整escaped、没有可编辑新指导，原Action拒绝 |
| 取消申请中/已取消×CI/PL | 4 | 两类原单证均取当前原policy原因，无编辑/申请重制新邀请；模型纯读，未造退款/新权限 |
| 原三相邻分支 | 3 | 已通过、待审核、未知HTML状态的banner与基线逐字相同，非banner全页也精确保留 |
| CI/PL草稿 | 2 | 原可Edit时字段指导分别匹配实际类型，未改可编辑表单 |
| 无有效ctx身份 | 1 | 直接传缺id/name对象给真实View/policy，首参数仍同一对象，原理由/Action拒绝，无roleUser猜身份 |

终端实际输出20 PASS/exit0。历史同句场景没有对整banner套禁词：用原HTML facts prefix和固定br后的新指导tail分离，避免把原审核者的话误读为本轮新邀请。ctx参数proxy只是观测，原policy函数实际运行；没有fake canEdit/canSubmit/canReform或人工批准。

此外独立按全文移除仅两行owned branch比较准确基线/current，归一CRLF后全部相等。git diff --numstat实际确认utils/app/core/sales/fin/Mock/CSS本轮无差异。

### 有限相邻回归

| 实际执行 | 结果 |
|---|---|
| verify-document-status-guidance默认 | 33 PASS |
| verify-document-approval-display | 137 PASS，原纸张姓名/状态/历史/导出资格矩阵 |
| verify-document-lifecycle | 90异步及正常生命周期/快照/取消/资格 PASS |
| node --check views-docs与新增脚本 | 两项 PASS |
| git diff --check | exit0 |

没有认领worker另跑的packaging111/roles100为本代理结果，也未重复完整31套。独立20与专用33的粒度分开，不合并为全场景认证。

## 新脚本审阅与覆盖边界

33脚本确实加载原/current实际Views，旧函数在同一真实快照/模型中保留作为oracle；实际拒绝原edit Action、正常取消申请→主管退回恢复/通过的Promise路径及完整模型纯读，不是工作函数mock。源码归一后仅移除两个branch行的完整保全断言能够抓到其它helper/Action误改。

初版33的只读禁词断言匹配整banner，当前固定原fixture通过；它不能当作任意历史意见中从来不得出现同句的证明。独立20已补保原同句事实与只检查新增tail的反例。中枢将让worker仅补脚本prefix/tail与同句案例，不改生产source；新脚本指纹届时另有限复核。本阶段33结果对应下面5CE指纹，不提前重标未来脚本通过。

## 当前实际冻结指纹

| 文件 | SHA-256 |
|---|---|
| js/views-docs.js | FB23CA00D0059C8B958F470FDB76BC42732ACADF3E5F7E41CB3681EBE96C1043 |
| scripts/verify-document-status-guidance.cjs | 5CE213DFF6FD0E4E33FECAD5517D40D701B283C372778EA50E67CC582FAB71FC |

收到中枢worker冻结通知后已实际复读，两个指纹与本代理20/33执行时一致，当前无未审生产差异。如UI改文案/源码，按真实diff再有限补审。

此有限JavaScript/安全结论不替代原生身份/键盘/读屏、两宽像素/长横幅折行、跨浏览器、file://、后端事务/权限、正式审批/签署/PDF、NAS或Git回执。原四图/新首图及UI审阅均归中枢；不拿HTML相等代视觉认证。

## Review Summary

| Severity | Count | Status |
|---|---:|---|
| CRITICAL | 0 | pass |
| HIGH | 0 | pass |
| MEDIUM | 0 | pass |
| LOW | 0 | pass |

Verdict: **APPROVE** — 当前冻结生产source的两处H24指导与实际资格/完整历史事实一致，独立聚焦证据通过；未来仅脚本补强另查，不认领原生/UI/Git。到此停止本轮owned写入。

## 晚期脚本补强有限复核

按中枢通知实际重读新脚本的check逻辑及追加同句案例：原33个场景保留，仅新增历史CI3V1的opinion同时含修订重送/申请重制句与恶意HTML、姓名/日期HTML一例。已退回先逐字核旧facts prefix，再把guidance限制为该prefix之后的尾部；只读禁词与完整escaped edit reason在新尾部自身检查。可Edit/可Reform原判断、三相邻分支、非banner整页、全MOCK纯读、原Actions/生命周期与仅两owned source行保全断言没有弱化。

新增反例另严格断言原opinion/name/date全文escaped，尾部精确等于 `<br>当前只读：` 加原escaped edit reason再闭合div；原事实含同句不等于本轮邀请新操作。worker先出现的整banner禁词方法RED是测试方法反例，不是生产缺陷或权限漏洞；本代理没有倒写原四业务RED为这种方法问题。

本代理实际执行新脚本node --check通过、默认**34 PASS/exit0**。另单独实际重跑 `--probe-original`，仍从固定58a65822基线加载真实Views/Action，输出同四条role/历史误指导RED、4!==0，明确exit1；原业务红灯没有被洗掉。没有重复137/90，也没有将原20/33结果重标为新脚本阶段的重跑。

最终实际指纹：生产 `js/views-docs.js` 仍为 `FB23CA00D0059C8B958F470FDB76BC42732ACADF3E5F7E41CB3681EBE96C1043`；新脚本为 `1D7ACE304B8DAEB20648AFF3EA750C102FF7CFF96B68F2AEA2AD41905AF7255B`。前表5CE与33保留为初版测试阶段，最终脚本以此1D7/34为准；生产源码无晚改。

有限补审结论继续 **APPROVE**，无新增待处理finding。仅追加本文，未改其他文件、源码、测试或Git；原生/UI与整轮交付仍归中枢。到此结束本轮owned写入。
