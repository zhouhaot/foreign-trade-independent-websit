# 第11轮审批台账：两轮五视角设计复审

2026-10-07，基线d9b1748；Web纯前端Demo现有审批台账H22。只拥有本文及docs/iterations/round-11-ui-review.md，不改运行/规范/其它材料，不用CUA或Git、不撤他人编辑。

## 首轮发现与有限修正历史

逐view_image实读boss稳态基线、1280context首版和result首版三图，首评未SHIP。当前原两表6/8列完整；待办编号/事项/target/link/reason信息同字号色且target重复，导致扫读负担。已处理三意见完整、原生展开AP20260801理由全见及focus环，不因DOMSnapshot省details孩子判失败。

- R11-UI-01：只加强事项title主层，AP/原因/关联标签次层、原文足字号折行，保原紫色处理与次级查看。最终两宽实图确认层级，**Resolved**。
- R11-UI-02：关联对象重复描述与具名链合为“关联对象标签+具名查看”上下文块，真实编号/版本只链一份，不裁列或从title猜目标。最终两宽实图确认，**Resolved**。1280已处理单证栏可自然换成两物理行，同父块不等固定一行，无需为了行数再改布局。

没有新增sidebar/队列/SLA/制度卡或把意见折叠；保原申请理由与意见分开、历史结果与当前作业资格分开。

## 18终图逐张实际查看

所有下列文件逐view_image读取，并回读image-dimensions.json/browser-process实际metadata。JPEG26文件=8过程/18终版；多数场景DOM1280/1440×1000、图像实际1272×994/1432×994为整体缩图，两个例外在表中注明，不能混像素与CSS尺寸。终图opacity1/transformnone，早期动画基线只过程。

| 终图 | 实读结论 |
|---|---|
| boss-context-final-1280.jpg | 标题加重/AP与标签次层，目标号不重复，原6列/主紫处理完整；首屏仅前4笔完整，第5需正常纵滚 |
| boss-context-final-1440.jpg | 同层级及次级具名查看/原原因保，宽事项区可读；不凭图冒全部5笔首屏 |
| boss-result-final-1280.jpg | 原8列/三意见完整折行，AP20260801原理由展开/summary焦点可见；CI结果label与链自然分两行仍无重复目标 |
| boss-result-final-1440.jpg | AP20260101原理由展开、精确CI3V2具名、历史通过与原日期人员/意见保；处理决定不变成当前导出资格 |
| sales-context-final-1280.jpg | 本人两笔待办/等待主管，无主审批按钮；理由与SO5/SO6具名查看保，开始显示本人已处理区 |
| sales-context-final-1440.jpg | 原两待办、完整原因和等待主管保；14字号任务层与参考分明，不扩权限 |
| sales-result-final-1280.jpg | 本人两结果，AP20260102退回原理由完整展开/focus环、继续执行意见/SO2链明确 |
| sales-result-final-1440.jpg | AP20260801原理由展开保4.20→4.30原文，原通过事项/意见/人员日期保，不补旧targetAmount |
| doc-context-final-1280.jpg | 本人三待办/等待主管，CI1V1/PL1V1/PL4V1精确版本链；重制原因计划V2与实际targetV1分别清楚 |
| doc-context-final-1440.jpg | 同三待办/三精确版本/完整理由，原6列/本人范围保，部分已处理区需下滚 |
| doc-result-final-1280.jpg | 本人AP20260101通过结果/原意见与原因全文展开，CI3V2链明确；窄意见两行仍完整 |
| doc-result-final-1440.jpg | 同精确CI3V2原理由/意见/处理人时间，focussummary可见，未自动指最新 |
| doc-exact-historical-v2-final-1280.jpg | V3草稿为最新、V2历史通过且当前查看，既有banner“该版本曾审核通过”与右栏只读/disabled导出保，不洗原事实 |
| doc-exact-historical-v2-final-1440.jpg | 三栏下仍当前V2/最新V3，历史资格说明/查看最新V3次续作入口和disabled导出清楚；页面交易字段只读 |
| doc-target-pl4v1-final-1280.jpg | 精确PL2026004V1已退回，原意见、当前版本操作与重制已待处理/禁重复说明；没有把理由计划V2当现target |
| sales-target-so2-final-1280.jpg | SO2026002当前执行中、订单/已收均28400USD与未收0独立显示；历史取消退回不被当当前取消 |
| fin-empty-final-1280.jpg | 实际1280×1000，真实0/0双空态和原6/8表头；无伪造申请/跨人记录 |
| admin-denied-final-1440.jpg | 实际1440×1000，明确系统管理员无访问权限与返回工作台，无业务台账或审批入口 |

图片结果滚态不是fullPage或首屏0：boss1280/1440分别854/784，sales191/138，doc166/155；其它该批context/目标/历史/空态/拒权metadata0。boss1280第5top约990/bottom1149为中枢实测，正常纵滚；不删原列/理由强求全部首屏。两表overflow0是中枢DOM报告、图中字段无横裁相符，不从缩图认证字号/对比具体比率。

## 五视角终评

主管主处理与次级查阅分层，原AP编号和理由完整，没有新自审/制度入口。业务员本人结果可回SO2/SO1，历史退回/通过与当前交易独立。单证员能看申请对应V2，即使原受控修订已产生V3也不自动最新；理由计划V2与targetPL4V1不篡改。键盘具名summary/link与focus环清楚，Enter/Back代表路径有实际报告；图片、结构与sameid不等读屏/节点identity。视觉保持A与原两表，完整意见自然折行、原空态/拒权清楚，无必要新增运行UI修改。

原生9组PASS实际读browser-process：boss Enter原理由；sales退回理由→SO2；Back同本人2/2；键盘SO1；doc原理由→精确V2；原修订内存造V3后仍历史V2/disabled导出；重制理由计划V2→PL4V1；boss AP20260903 cleanCancel；boss次SO5/Back。V3只原受控操作内存fixture、刷新复位，相关矩阵将还原基线，不称持久数据/业务制度新实现。

## 证据范围与方法纠正

当前browser-process9组pass、layouts[]，不能套旧25/50或先写新45distinct/90通过。计划矩阵为5roles×9routes（approvals+8唯一真实APtarget）=45distinct、两宽90，尚未运行。中枢28Node脚本/38syntax0及综合APPROVE/JS44（34真点链接）是代码报告，不混真实浏览器计数。异常target/冲突/未知/安全ID与长超界/转义、全Mock零写/严格节点引用属Node，未画生产异常图。

方法纠正保历史：旧V2断言要求export不存在，但原按钮可见disabled正确，改查isEnabled=false/历史文字、未改资格；snapshot省details孩子不当失败，实际open空串+视觉全文；主管Back即时动画capture被稳态检查拒存不计图/路径失败，之后opacity1/transformnone再capture。原4基线未核入场只过程，不当终版淡字缺陷。

未验：真正读屏/语音/开关/完整所有按键、file/跨浏览器、400%320px、正式身份/后台权限/全部历史排列、全局details展开/滚动恢复、生产审批制度/转办撤回/SLA、后台事务/持久化/NAS/银行退款/打印PDF签发及本轮Git同步。SC1.3.1/4.1.2关系、2.4.4链接目的、2.1.1/2.4.3/7/11焦点与键盘仅对应结构/代表证据，非完整WCAG2.2AA认证；2.4.13 Focus Appearance属AAA不误称AA。

**最终UI结论：SHIP（18实际终图及已取得代表行为范围）。** 两首轮建议Resolved，无新增必要UI阻断。图评当时矩阵未运行保pending，文末现按实际browser.json同步通过事实；保时间边界，不抹过程。不改DESIGN/schema或其他所有权文件。


## 最终有限布局事实同步与写入结束

图评后中枢完成矩阵，本代理仅实际回读最终browser.json，不重复18图或业务测试：5roles×9routes（approvals+8唯一原APtarget）=45distinct、1280/1440×1000共90layouts，90项均pass=true，failures[]/console[]。业务四角色两宽approvals的两个tableOverflow均[0,0]，管理员拒权页无表、记录[]；不能把拒权页说成两表测试。9native/26JPEG（8process+18final）不因矩阵追加变成交互/截图新次数。

矩阵前refresh还原原Demo内存V3，所以90layouts是原基线状态；历史V2/V3终图是额外真实原受控修订路径，不说矩阵也保持该V3或认证全部版本。browser-process图评阶段layouts空保原历史，最终browser.json90实际通过按时间追加，无旧25/50套用或全局145route恢复声明。Back只确认返回路由与可见申请IDs，不承诺原生details展开状态恢复。

**最终SHIP保留，相关有限布局已实际通过，无新增必要UI修正。** 正式后台身份/权限、全部状态、跨浏览器/file、真读屏、全局details恢复、生产/NAS/持久化/正式签发及Git仍不由此认证。所有首轮问题Resolved，方法纠正/图片真实JPEG尺寸保；仅两owned材料写完，**本代理已停止第11轮全部owned写入**。
