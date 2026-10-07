# 第12轮：制单员首页可办理事项与参考记录

日期2026-10-07。基线 `77deae8ae937c0c1d005d4b3b019d5d150e623b8` 为中枢已推送回读的第11轮回执。core worker 仅拥有 `js/views-core.js` 中 doc工作台分支/必要条件markup、新 `scripts/verify-document-dashboard.cjs` 和本说明；中枢负责 utils实际资格摘要、app同源铃铛调用、CSS、真实UI、总材料/交接/Git。不是单人开发，不覆盖其它owner。

## 原主链实际 RED

专用脚本 `--probe-original` 明确从该基线读取真实 `utils.js` 与 `views-core.js`，使用原Mock、原policy及当前未变的销售取消动作/modal/Promise。没有删待办、改旧文书或把原权限放宽。实际exit1，两个缺口：

```text
RED original-demo: dashboard go-process=3, shared todos=3, original policy editable=2
RED real-cancellation-request: dashboard go-process=3, shared todos=3, original policy editable=0
原工作台主链把不可办理版本当去处理
2 !== 0
```

原三候选是CI3V1退回、CI4V1制作中、PL4V1退回；旧CI3V1已被V2替代，当前只有CI4/PL4可编辑。测试通过真实sales对SO5提交取消申请后，订单为取消申请中，两条当前版本也暂停，原列表却继续3条“去处理”。dashboard与todos查询前后完整Mock相等；取消是测试执行的正常业务写，而非为图手改状态。这里是入口表达和资格不一致，原policy已正确拒绝，没有把它写成权限绕过。

实现前默认脚本另实际exit1：`typeof U.documentWorkSummary`为undefined，指出共享API未就绪；它是集成前置红灯，与上述真实业务入口RED分开，不用模拟API冒作实际集成通过。core源码在中枢APIready消息之前不写。

## H23有限前端契约

制单员当前可办理事项只取实际ctx.user的既有documentPolicy.canEdit结果；不从roleUser/姓名补身份，不按maker额外分派或筛“本人任务”。被阻断的未完成版本保历史/暂停参考，附原阻断原因及精确版本查看；不可路由/异常目标只提示核对台账。铃铛与工作台由中枢共享同一摘要口径，0不是全部业务完成。

状态卡保全部版本的原计数，说明含历史；已通过记录不等全可导出。原status、快照、姓名、history、金额/包装/支付不写；撤销H23只调整后续入口/文案，不回写业务记录。当前仍内存Demo，没有后台提醒、SLA、个人分派或持久化。

## 当前实施阶段

已完成原主链两个实际RED与API缺失前置RED；等待共享API实际就绪后，才接入doc工作台并记录GREEN、逐项前后与限制。本段是开始阶段，不预写完成、真实UI或Git结论。

## 实际 APIready 后的有限实现

中枢消息确认真实 `U.documentWorkSummary(user)` 及 app 同源调用已落地，共享32场景/3语法通过，随后 worker 才改 Views源码。工作台仅doc分支直接调用 `U.documentWorkSummary(ctx.user)`，待办来自它的todos、参考来自references，不提供fallback或用roleUser猜actor。default脚本在API写入/Views未接入时另实际RED为“真实doc首页采用当前可办理区域”，之后有限实现转GREEN。这是集成markup红灯，未冒作原业务漏洞。

单证员主区域使用 `doc-work-summary`，参考使用 `doc-work-references` / `doc-work-reference` / `doc-work-reason`；中枢据真实图另负责CSS。整体近期订单、主栏/侧栏结构和其它岗位HTML保持原样，不增sidebar、双栏、SLA或个人maker归属。参考有效链接是对应确切版本的“查看记录”；link=null时只用固定合法 `#/documents` 的“核对单证台账”，不把无效对象拼成deadlink。

## 每项改进的前后与证据

| 改进 | 之前 | 之后 | 实际证据 |
| --- | --- | --- | --- |
| doc待办使用当前资格摘要 | 按status列所有退回/制作中版本，3条都去处理 | 实际ctx.user交共享API，首页主列表只2条原policy可编辑版本 | 原主链RED与默认原样GREEN；原CI3V1只参考 |
| 暂停后的0语义 | SO5取消申请后仍3条去处理 | 当前没有可办理制单事项，同时说明历史/暂停仍可查，不暗示业务全完成 | 真实申请、主管批准均0条与3参考 |
| 真实恢复与受控新版本 | 入口未区分历史/当前或当前取消 | 每次纯读按live原资格；退回取消恢复2，新V3草稿入待办，旧通过源保留 | 原Actions/Promise走恢复与修订，不手改状态造图 |
| 历史与暂停参考 | 旧版被称退回待修订，阻断原因需进详情才懂 | 独立次区保原版本/status与完整reason，按钮只查看记录/核对台账 | 原CI3V1与暂停CI4/PL4保引用；异常无deadlink |
| 全版本状态统计口径 | 退回脚注“需按意见修订”、已通过一律“可导出” | 三原状态count不变，标签单证记录、foot含历史版本；导出资格看具体页 | 每次实际DOM读取4卡值，与当前todos/原状态计数分别比较 |
| 当前身份错误诚实表达 | status待办不核实际actor | 缺id/姓名时当前制单资格待核对，显示实际identityError，不补另一身份 | 空字段两例；另App.user为sales但ctx.user为doc，证明只传ctx原引用 |
| 其它岗位与文本安全边界 | 原其它四岗业务/页面应继续保留 | 非doc整页HTML与77deae8原core逐字相同；新text/sub/reason/id/href转义 | 四岗exact对照，原no含HTML/引号/amp保可读，缺订单/同id/空格id/孤surrogate不可定位 |

上述“恢复”是正常业务状态变化后重新读取首页，不是新增后台通知、自动分派或保存草稿。对取消的文书status、snapshot、history和支付仍原样，由原动作与相邻测试核验；资格没有在Views被放宽。

## 专用脚本方法纠正与实际结果

初版脚本取最小DOM子节点 `innerHTML` 判断0项说明，实际fixture只有根赋值保留HTML，子节点返回空，产生 `Input: ''` 的误红。没有为此修改生产源码，也没有删掉0项断言；改读原子节点树的递归text，继续检查同样说明/完整原因。这是测试fixture方法纠正，不能写成修复了真实用户丢文本。

当前新增脚本 **18场景PASS**，只加载实际共享API，无模拟摘要：原样/取消申请/退回恢复/批准取消/新V3各1，共5；实际ctx引用1；缺id/姓名2；HTML原文1；missing-order/duplicate-document/unroutable-id/lone-surrogate4；未知status不成待办1；其它四岗整页相同4。每次摘要/首页/todos查询与DOM读之前后完整MOCK相等。生命周期写是先执行真实动作，再以写后的模型作为纯读比较基线，不把取消/修订成功业务写说成零写。

异常/HTML只在隔离Node VM中修改，不改Mock源码或造真实截图；缺目标的reason同时保原policy原因与定位诊断，不截断。explicit身份的 `U.todosFor('doc',name,user)` 与首页摘要todos完整JSON一致；实际铃铛DOM/徽标与两宽交互由中枢另测，不以这个同源断言冒作原生铃铛。

实际执行exit0：

| 检查 | 结果 |
| --- | --- |
| `verify-document-dashboard.cjs` | 18 PASS |
| core与新增脚本 `node --check` | PASS |
| `verify-views.cjs` | 原100角色/视图组合与核心动作PASS |
| `verify-navigation-drafts.cjs` | 33实际app事件/异步Node history场景PASS |
| `verify-cancellation.cjs` | 取消/重制审批、历史与延迟guard PASS |
| `verify-document-lifecycle.cjs` | 90异步场景与正常状态/快照/finance隔离PASS |
| `verify-document-approval-display.cjs` | 137纸张姓名/状态/历史/导出独立矩阵PASS |
| `verify-change-request-amount.cjs` | 58初值金额与H20来源保护PASS |

`--probe-original`始终明确加载原core/utils，保两项旧入口RED为可复现对照，不能拿它exit1误称当前实现失败。default才运行当前集成验证。生产文件仅core/doc分支，CSS/shared/app/Mock/单证Actions/旧脚本/Git均由其它owner保持各自职责。

## 当前限制与交付

源码和专用脚本完成后交中枢真实首图、必要CSS与多视角复审，不独自称UI Ship或本轮已推送。Node DOM/history、全字符串和policy纯读不能替代原生键盘/浏览器Back/真实登录/两宽布局/后台提醒或正式权限；本轮也不赋予PDF/正式导出能力。scope和企业待确认项仍按H23与本轮规划，不因0项或全版本卡改变。

## 冻码后中枢整合：动作具名补核

中枢接管core源码后，根据首轮UI评审有限增加doc-only两处ARIA表达：主按钮 `去处理 · 精确单证文本`；参考按钮 `查看记录 · 精确单证文本`，或不可定位时 `核对单证台账 · 精确单证文本`。可见原动作词保留，动态内容沿esc，不更改资格或其它岗位。这是中枢整合阶段，不倒写为worker初版已有；参考row局部CSS也是中枢owned实现，worker不再写core/shared/app/CSS。

worker只给原专用脚本追加断言并实际重跑：每个当前动作与每个参考/固定台账入口，读真实渲染DOM的aria-label，核原动作词以及对应type/no/V/order，与原摘要text精确相等。原HTML案例保原可见转义断言，并在同一隔离样例号追加引号/伪onfocus、onmouseover文本，证明这些作为名称文本完整保留而未形成事件属性；缺订单、重复单证、不可路由id/孤surrogate的fallback名也具原对象。未删原18场景或四岗整页exact断言，没有把新增断言数冒作新增场景数。

整合后同一脚本仍 **18 PASS**，脚本语法PASS；这次结果是晚期有限ARIA补核，不把先前全套回归称为已在新ARIA后全部重跑。中枢另报告新增doc0首页参考CTA在同dashboard的真实无效果入口RED，已由其app局部action/焦点定位及独立`verify-document-work-bell`4场景修复验证；worker没有编辑或独立认证该实现，也不把它当作原policy/本core待办筛选缺陷。实际原生布局、读屏/键盘及最终两轮UI结论仍以中枢材料为准。
