# 第5轮 UI 首轮评审

2026-10-07；基线`6ffd844c097c82b6e9a4f8655dd7d1cd48aff31a`。首轮只读规划、当前app/core/sales/docs/fin/shared CSS差异及两份worker说明，未操作root浏览器身份/tab，未执行应用JS或运行测试。只新增本报告与round-05-ui-review-plan.md，未改实现/规范/Git/HANDOFF；首轮尚无实图，后续实图见下方，当前仍未给第5轮SHIP。

## 任务与五视角

主任务为当前作业填写/审核并提交，离开时有可理解选择；岗位来源与商品返回是次任务，历史/搜索/通知为参考。业务员关注报价保存与来源一致，财务关注登记form保留与局部历史页，单证员关注包装/意见/no/Vn与只读转换，主管关注意见和已允许查询可达，键盘/认知及真实性视角关注单次对话框/焦点/历史依据与未测边界。完整task/state/IA/disclosure及两轮验收见 `../../../docs/iterations/round-05-ui-review-plan.md`。

## 首轮静态发现

| 项目 | 证据与建议 | 状态 |
|---|---|---|
| 状态插入位置 | app无page-description时将status直接作为page-head第三flex项；报价h2/actions可能被拆成三段。应并入左侧标题组，右返回保持最右，不另加说明卡 | **Resolved**，修正实图见下 |
| 单证放弃修改对象 | doc-cancel-edit自定义标题“放弃单证修改？”覆盖具体对象默认标题；应带类型/no/Vn并保留回只读含义、继续填写/放弃修改 | **Resolved**，最终单证图显示真实对象及回只读含义 |
| 保护范围材料 | H14规划把客户资料列后续，实际draftControls已含#cust-form；须统一明确范围，不代替通用弹窗/全站恢复 | **Resolved**，planner现已明确纳入客户资料；其实际HTTP仍待补证 |
| 取消焦点材料 | confirmDiscard实际优先draftFocus最近输入，规划写原触发控件；建议选定最近输入→原触发兜底或原触发统一策略，再实际验源节点/scroll | **Resolved**材料一致，已明确当前/最近字段→无可用才触发控件；分角色实际测评另记 |
| 主管导航密度 | 本轮只补已允许询盘/报价/财务入口，主管有8叶子；1000高应核查末尾/页脚和展开后可达，不缩字截入口 | **Resolved**，最终主管图8入口及页脚可见，真实DOM末入口bottom≤708.38 |

已有正向结构：短状态只在clean/dirty文字变化更新，非每键重播；普通应用锚点先requestNavigation且保留Ctrl/Meta/Shift正常行为；财务分页只换历史容器且不clean；业务成功后才markDraftClean；无权客户/报价/询盘改可读文字，商品返回通过唯一包含该商品的order显式来源校验。以上仅代码/worker材料回读，不认领实际HTTP、浏览器历史或读屏已通过。

## 尚需真实证据

报价/收款正常1280/1440及dirty短状态；主管审核/单证包装具体对象确认；商品来源有效/失效与角色返回；boss新增主导航和只读入口。对取消需检查同源DOM/原文/错误/对象/hash/scroll/focus；放弃只丢未提交输入、不写业务；已知Back/Forward双向连续取消与未知历史兜底分别记录，原生beforeunload是否真正出现不能由监听器存在推断。

保持A、现有字号和主动作点击区。错误态继续完整原因/自然纵滚，不把保护提示堆成卡片；正常首屏动作受新增状态影响需实际测量。真实后台/持久草稿、跨页面恢复、真实读屏/跨浏览器、file及刷新关闭系统提示未测范围分别写明。当前 verdict：**待首图与独立材料，无预先SHIP**。

## 第二轮首批真实图（4张过程图）

四张均逐一view_image回读，没有操作站点或修改身份；首图/离开过程图与正常scroll0修正图分别记录，中枢DOM数值不改称本代理测量。

| 图片 | 实际观察 | 结论 |
|---|---|---|
| quotation-first-1280.png | 返回详情位于页头中段，短未改动状态孤立在最右，标题/返回/状态成为三段。该图已有scroll46，不能用保存位置认领正常首屏 | 保留初次发现历史；下张修正 |
| quotation-leave-first-1280.png | 具体“离开报价Q2026004？”、继续填写/放弃输入并离开与丢未提交/已提交记录保持的说明清楚；背景保留Infinity/行错误/待修正合计/备注。页头三段问题仍在 | 统一决定清楚；不能从静态图证明取消行为 |
| quotation-refined-1280.png | 状态紧随标题，返回详情恢复最右；完整条款/已有备注/两行与22,500USD合计、保存均可见，未新增说明卡或缩字 | **Resolved**页头位置；中枢实际scroll0、保存bottom969.14 |
| quotation-leave-refined-1280.png | 标题左组保留dirty短句，右返回仍清楚；离开框对象/两动作完整无遮挡；背景原备注“保持本页未提交说明”仍在 | 首批视觉可接受，不假称已提交/恢复草稿 |

### 五视角复审与后续

- **业务员**：标题旁短状态辅助当前填写，右返回与底部保存位置稳定；具体Q4能识别将放弃哪份输入。无新增必须修的视觉问题，不重做A。
- **财务**：统一“已提交记录保持原样”避免把放弃输入误读为撤销收款；本批仅报价图，仍待财务订单/币种、局部分页保原form/错误及登记动作图，不能据此宣布财务通过。
- **单证员**：已回读doc-cancel-edit源码标题加入真实类型/no/Vn，说明放弃回本版本只读，okText仍“放弃修改”；正确区分编辑结束和导航离开，等待单证图复核长号/版本与布局。
- **主管**：本批无主管身份或8叶子主导航，不认领查询可达/意见保护/只读已通过；统一模式符合判断目标，具体审核和导航截图待补。
- **键盘/认知与真实性**：对话框具体对象、继续填写/明确放弃两选择清楚，没有自动保存承诺；静态截图不能证明Tab限制、Esc返回、DOM身份或历史栈。planner已把客户资料纳入H14，焦点明确回当前或最近作业字段（包括错误focus），无可用才回原触发；不称全站/通用弹窗草稿管理。

中枢报告本会话nativeBack重复取消后仍面对同一目标，Forward取消/确认PASS；token/hash/备注/focus/scroll逐项相同，46→46。当前记录该真实UI材料来源，待封版browser报告回读，不声称本代理亲自操作。侧栏CUA点击为自动定位先46→60，然后守卫在handler捕获60，取消保持60；初次将其视为弹窗漂移的推断已纠正。正确保证是守卫接管时至取消后DOM/地址/输入/滚动保留，不能写成点击前工具定位阶段仍保持46。初图scroll46同样不能被用于正常首屏CTA评估。

共享close preventScroll/onClose guarded RAF与scrollbar-gutter stable由中枢整合，guard25 Node为中枢阶段报告；不把模型事件桩当作真实浏览器滚动/已知历史栈证明。尚待财务、商品上下文/无权入口、单证/主管/客户及最终两宽截图和完整材料。**当前仅首批视觉可接受，仍不SHIP、不更新最终规范。**

## 首次终版15图复审（第16张相邻补审见后）

2026-10-07。逐张view_image读取15张终版，不根据文件名/Node结果推断像素结论；另回读browser-verification.json实际width/opacity/scroll/对象、修正历史与独立代码报告。上文待图/不SHIP保留为过程历史，下文为当前最终UI结论。PNG普通图1272×994或1432×994，模态/无页面纵滚等图1280×1000或1440×1000；actual浏览器宽度以记录断言1280/1440，像素尺寸与滚动栏/截图裁切差异不混为视口设置错误。

| 终图 | 逐图观察 | DOM边界与判断 |
|---|---|---|
| quotation-final-1280.png | 标题短状态/右返回稳定，全部条款备注/两行/22,500USD及保存完整 | scroll0，保存969.14；通过 |
| quotation-final-1440.png | 同一任务与完整数据，未因短状态增加整行说明卡 | scroll0，保存971.14；通过 |
| quotation-leave-final-1280.png | 具体Q4、继续填写/放弃输入并离开，未提交影响与已提交保持均清楚；背景备注仍在 | 模态动作617.80，scroll0；通过 |
| customer-leave-final-1280.png | 客户C001·环球贸易公司标题具名，原客户表单/备注与两动作可读 | 已纳H14客户表单，scroll0；通过，不扩成通用弹窗保护 |
| payments-final-1280.png | 实际SO1/USD与24,100/12,000/12,100勾稽；短状态不抢登记 | scroll0，登记775.67；通过 |
| payments-final-1440.png | 用户实际选SO3/EUR、19,500/0/19,500一致，选择改变标未提交，主动作完整 | scroll0，登记672.17；URL仍SO1是未提交选择，非错误登记/假成功 |
| payments-leave-final-1280.png | 离开提示绑可见实际SO3，币种/余额亦EUR，没拿原URL的SO1称当前对象 | scroll0，模态动作617.80；通过 |
| product-order-source-final-1280.png | 财务商品P001标题下来源SO1商品明细，明确返回来源订单SO1；历史成交仍各带USD/EUR | scroll0；通过，未给商品列表无权退路 |
| document-discard-final-1280.png | “放弃商业发票CI2026004 V1的修改？”、继续填写/放弃修改、回本版本只读含义完整，纸张仍编辑 | scroll275为焦点/工具定位后状态，保存347.38当时可见，**不是首屏0**；通过 |
| document-edit-final-1280.png | 横向本订单版本/真实制作中与退回标签、短状态、纸张和编辑动作完整 | scroll0，保存622.38；通过 |
| document-edit-final-1440.png | 左目录/足宽纸张/右岗位动作，交易只读、包装编辑含义清楚 | scroll0，保存468.98；通过 |
| boss-quotes-final-1280.png | 8导航叶子及页脚可见；待确认报价只有查看，无编辑，新入口叫询盘查询/报价查询 | scroll0；通过，权限没有由导航扩大 |
| boss-payments-final-1440.png | 主管只读说明/历史/分页完整，无登记表单 | scroll0；通过 |
| boss-audit-final-1440.png | CI1/V1/待审核与未提交意见状态分开；具名意见紫色焦点、通过/退回完整，交易仍只读 | scroll0，通过573.98；通过 |
| boss-audit-leave-final-1440.png | 具体CI1V1单一离开框，背景真实意见仍在，不暗示已审批 | scroll0，模态动作617.80；通过 |

### 五视角最终判断

业务员正常编辑主任务完整，客户/报价具体身份与放弃影响可理解；真实保存先成功clean再到详情，没有误弹离开。财务订单/币种随实际选择，未提交SO3与旧URL的差异已明确；失败输入/错误/ARIA/live hint在查历史后仍在，登记1USD后才成功写chosen URL。单证员具体no/Vn、修改→只读与导航离开分开，实际草稿保存后同版本只读且不误报dirty。主管8叶子只补已有权限，报价无编辑/财务无登记；真实审核意见取消返回当前字段，成功审核后清输入、交易不漂移。键盘/认知与真实性方面，短role=status只在clean/dirty变化更新，一次决定与具体对象清楚，当前/最近作业字段→无可用才原触发；本代理只看图/材料，未实际运行读屏。

### 打磨与方法纠正（全部必要项Resolved）

1. 页头初始三flex段、单证缺具体对象、客户范围与焦点契约材料差异、主管导航可达：已按首轮建议修正并以最终图/代码/规划确认。
2. 财务历史末页区域430.84→165.14会令文档变短并夹滚动；中枢在局部容器保已显示minHeight，真实末页430.84保持、焦点落当前页码2、源登记字段/错误/hint不动。真实样例7条末页1行；Node夹具8条末页2行，不能混写。before scroll257、after835包括CUA到页码定位，不声称“点击之前坐标始终相同”；产品保留从操作时可实现区域与表单节点。中枢报告adapter最终17PASS，worker16是早期历史，不把它当真实像素凭据。
3. 原价错焦点返回最近input事件字段，后用focusin记录包括校验聚焦的当前字段；共享close preventScroll、guarded RAF恢复只作用于同generation/hash的源页，旧帧不把新页拉回。真实已知Back/Forward取消46→46、hash/token/原文/focus一致且重复Back仍同目标；主管audit取消122→122、意见/focus/纸张exact一致。侧栏定位先46→60，handler捕获60并取消保持60，不能把工具定位说成弹窗漂移。单证放弃过程667→582等定位坐标不被改写成取消前后完全相同，最终图275另记实际状态。
4. 初次旧origin缓存CSSOM没有当前gutter规则，HTTP文件为新规则；中枢改新loopback8001 no-store测试origin核对当前资产。不把旧缓存尝试算最终通过，不把测试server当生产部署。
5. 审核完成初次期待全纸HTML相同过宽；实际唯一预期变化为Approved by待审核→周建国，交易HTMLexact不变。取消审核离开保持整纸exact；成功审核只说交易保持/审核人更新，不称全纸不变。
6. 报价保存、收款1USD、单证草稿保存与审核成功链发生在刷新前；后面两宽矩阵/15终图已刷新恢复样例，不把原余额/待审核图当成功回退。报价/客户/财务未提交说明或SO3选择只是当前输入，不伪称持久保存。

### 材料与范围

首次终版browser JSON实际200条layout全部PASS且actualWidth==目标，100独立role-route、22交互pass=true、failures=[]、console=[]；15stage=final记录与本地PNG对应，目录25PNG=10过程+15终图。相邻补审最终已增至26交互/16终图/26PNG，见后。原initialObservations的focus变化/scroll推断及pass=false保留为修正历史，不偷偷计入成功。独立code-review初次回读时标REVIEW_IN_PROGRESS，本代理未提前认领；完成规范后再回读最终尾部已为**APPROVE**，1 MEDIUM Resolved/0未解决，批准限本轮静态前端差异，不改称生产验收，也不替中枢推定Git已推。

最后回读node-verification.json新增的18条统一日志全部exitCode0：导航25、adapter17、context194/clean15、报价103、收款71及前轮各组；仅回读没有由本代理重跑。browser元数据也已补齐25条图片记录=10过程+15终图，初图未知尺寸未补猜值。规范JSON可解析、schemaVersion2/原10个完整HTML-CSS组件examples保留，四份自有材料无尾随空白、围栏平衡。

H14当前仅qe/cust/pay表单、df-编辑、audit-opinion的离开/局部销毁保护；非全站草稿管理，不保存跨页内容。H15已知本会话索引历史与未知direct hash兜底分开；未知只保证记录的源地址/输入，不保证加载前栈完整。退出沿用一次现有确认；原生刷新关闭提示、runtime reduced-motion、file协议、跨浏览器/旧浏览器、真读屏、320px/400%重排与真实服务均未由本轮UI证据验证。服务端事务、银行/NAS/真实身份、通用业务弹窗草稿及跨页恢复不在此SHIP含义中。

**首次终版 verdict：UI SHIP（1280/1440×1000 HTTP静态原型）**。15图评测过程保留，最后相邻修正与第16图见下；本代理未改运行/Git/HANDOFF或其他材料。

## 相邻非法地址修正与第16张终图

中枢随后接收独立javascript-review的一项MEDIUM，已Resolved并最终APPROVE。它与code-review历史互斥MEDIUM是两个不同根因，不把同一票据问题重复冒认；专项指出旧parseHash/query解码异常经本轮guard先clean后callback放大为原地址/DOM/dirty失配、Promise拒绝及loading遗留，原parser在基线已存在，不写成全部由本轮新增。现在目标编码先safe parse/preflight，非法hash保源DOM/dirty并废旧票据，旧确认不再清输入；专项独立导航31/adapter17/session PASS、unhandledRejection0为Node模型证据。

只view_image补读navigation-invalid-address-final-1440.png：页头下持续完整橙色原因“未前往目标页面：页面地址参数的编码无效，请核对地址后重试。 当前页面输入已保留。”；当前Q4、dirty短状态、备注“无效目标地址不会清除这段输入”与紫色字段focus、原两行/22,500USD合计仍清楚。role=alert由源码/真实DOM记录确认，未看图猜角色或真实读屏。actualWidth1440/opacity1/scroll56、保存bottom972.64属于非法地址自然滚态，只说此刻按钮可见，**不称首屏0**；正常1440图scroll0/971.14未变化，没有重复读或重拍原15图。

五视角增量判断：业务员当前报价/原输入保留且知道为什么没离开；财务/单证/主管共用导航规则从专项/统一代码边界理解，新增图仍只是业务员场景，不扩称各角色非法地址像素实测；键盘/认知视角完整原因常驻近页头、字段focus保留、没有额外批准门禁，真读屏仍未测。初期短Toast瞬逝没被截图捕获，不冒称初图曾有可见反馈；持续inline提示是实际补上的证据。

JSON新增4真实组：坏编码保原hash/token/备注/dirty；已有离开窗口遇非法UTF8关闭失效旧票据、无loading且后续合法确认可用；就近持续完整alert且原表单不被替换；稳定fresh已知Forward取消hash/token/原文/focus/handler sourceScroll56→56。初期postfix历史探针进入动画未稳59→56标pass=false并移initialObservations，不能算最终通过或把动画探针当原生历史退化。原200矩阵是parse前合法路由的实际两宽检查，角色/正常样式路径未变；相邻地址/Forward单独验证，没有无理由重复200。

当前最终summary=100独立role-route/200实际layout0fail、26真实交互pass、console=[]、26PNG元数据=10过程+16终图。导航31最终数来自javascript专项，统一18脚本阶段日志此前仍25，旧过程不被改称已重新执行31；中枢最后统一日志/总报告另同步。本代理DESIGN/JSON最终计数与非法地址规范均同步，schema2/原10examples不变。file/跨浏览器/真读屏/原生refresh-close/runtime reduced-motion/未知加载前历史完整栈及生产范围不变。

**当前最终 verdict：UI SHIP**。第16张与专项修正无剩余必要UI意见，两份独立代码报告均APPROVE；16终图包含的不同滚动/刷新场景明确保留。总报告22nd改进及最终推送由中枢维护，不以旧21项/22交互/15图当最终数。本代理未新增运行测试、未改实现或他人材料。

## 组合键导航最后契约补充

最后仅行为变更，无CSS/像素变化，不重拍或复读16终图。单证data-action锚点原先在组合键点击时仍走handler/preventDefault，与普通锚点不一致；中枢统一内部anchor在Ctrl/Meta/Shift/Alt、非主键、另开target或download时提前返回浏览器默认流程，包含data-action；target=_self的普通当前页导航仍走守卫。默认行为不等于所有组合键均被应用强制“新标签”，具体打开方式由浏览器决定。

browser新增实际nativeCtrl单证台账链接：合法新tab heading单证管理/role单证员、forbidden=false；源hash、marks、dirty保留、无离开modal，临时tab已由中枢关闭。新tab独立页面载入是静态Mock会话，不是跨页恢复源未提交包装，不能把此案例写成草稿共享/持久化。原生Ctrl真实验证之外，其余组合键/target/download分支由新Node场景与代码回读支持，不声称每项都原生实测。

最后计数为**导航33（前31+2）/27真实交互/16终图+10过程=26PNG**，100独立role-route/200实际layout与未测范围不变；统一Node日志由中枢下一次更新，本代理不把尚未更新文件说成已重新执行33。前31/26计数保留相邻历史，当前最终为本节。继续**UI SHIP**，无新必要视觉或实现意见；DESIGN/schema2 JSON计数与原生默认导航边界同步，原10examples保持。
