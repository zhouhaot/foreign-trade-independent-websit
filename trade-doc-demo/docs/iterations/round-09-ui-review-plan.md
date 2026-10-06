# 第9轮三类业务弹窗填写连续性：UI评测预案

2026-10-07；基线 `d03c9a055ec10c1bf0171669ce0d15a90d820e01`，中枢已正常推送回读/clean后开工。已读AGENTS/HANDOFF、round-09-planning-review、round-09-finance与共享关闭选择语义/CSS。本代理只拥有本文与`.impeccable/review/round-09/design-review.md`，不改实现/CSS/Mock/规范/HANDOFF/Git，不操作root CUA，不回退其它作者。当前暂无真实图，未SHIP；共享45/fin21/sales21为中枢与worker阶段Node证据，不是本代理重跑或原生验收。

## Task / 范围与信息层级

主任务是业务员登记客户确认qc-form、申请订单变更oc-form、主管处理申请ap-opinion；关闭选择只在尚未提交原始值有变化且误关闭时出现。次任务是继续修改或明确放弃本次填写；对象编号、原交易/申请上下文帮助判断，旧历史/来源是参考。不扩订单生成确认、其它弹窗、页面导航草稿、跨页恢复或刷新持久化。

守卫必须让用户理解“放弃填写”只是尚未提交输入，不是取消订单、退回申请、撤回已提交决定或退款。原作业留在同overlay但暂时inert/aria-hidden并淡化；保背景上下文可辨，守卫440宽用A原变量、主继续填写/次放弃填写并关闭。无需重排业务表单或堆说明卡。

## State / 同一作业生命周期

| 状态 | 可见/操作表达 | 可核实边界 |
|---|---|---|
| 未改动/原始值恢复 | X/取消/Esc直接关闭 | raw日期/选择器/空格等全部恢复才clean，错误节点变化不算填写 |
| 未提交值不同 | alertdialog具名“保留当前填写？”、实际对象编号与未提交范围 | 原form仍在，无业务写；不是新拼表单恢复值 |
| 选择中 | 继续为主、放弃为次；普通重复close幂等，无叠层 | 原作业临时不可操作/不可读，guard是当前交互层，Esc选择继续 |
| 继续填写 | 回原近字段焦点/选区，值与错误/提示不丢 | 保原body/textarea滚动；无可用原字段才合理回落，不总跳首项 |
| 明确放弃 | 只关原源作业，未提交不写业务 | 不关闭新作业，不假说已经取消订单或退回申请 |
| 排队/处理中 | 等待结果，保护源窗，不允许放弃 | 同tick busy覆盖Promise前窗；点击关闭不是撤销提交 |
| 业务校验/上下文失败 | 释放处理锁，保当前输入和具体原因可改 | 修正后可重试，失败后仍未提交，不永久busy或静默clean |
| 实际成功 | 完成原业务后源Modal clean，源关闭免草稿提示 | 不洗页面draft状态，不自动生成订单，不承诺持久化 |
| 原源失效/替换 | 旧回调、旧guard按钮、旧关闭timer不能作用新作业 | Node源引用/内容/actor验证与普通原生路径分开，不造生产并发认证 |

oc切类型须保原原因/隐藏金额raw值；切回全部原值才clean。ap只意见，qc只日期与说明；业务字符串trim和草稿raw比较分开。当前H12金额/H13取消收款暂停/H18包装/H19纸张与角色制度不修改。

## IA / 文案和视觉约束

原弹窗标题/交易对象→本任务字段/hint/完整error→提交/取消是主体；关闭选择单独标题→具体对象与“尚未提交内容”→继续/放弃。守卫短句应自然折行，两个动作不靠颜色区别，标题无需变为报警事故口吻。选择中原.modal虽然仍在DOM，不能因为querySelector('.modal')存在便认其为当前可读/可操作窗口。

继续主按钮默认焦点，放弃次按钮明确全名，两者≥24×24CSSpx/符合间距例外，保持现字号和按钮区；不把放弃做第一主按钮或用“确定/取消”模糊业务影响。440px/两宽须看背景原作业上下文、对比、文本折行/按钮换行与无遮挡，避免只凭CSS值认真实像素。缺页面变量不得造新颜色；使用既有card/primary/text/border。

## 语义规格与预期可访问树

下列是已有方案的评测规格，不由本代理写运行代码；对象文字通过实际绑定转义输出。

```html
<div class="modal-draft-dialog" role="alertdialog" aria-modal="true"
     aria-labelledby="modal-draft-title" aria-describedby="modal-draft-description">
  <h3 id="modal-draft-title">保留当前填写？</h3>
  <p id="modal-draft-description">客户确认 Q2026004 有尚未提交的填写内容。可以继续填写，或放弃填写并关闭。</p>
  <div class="modal-draft-actions">
    <button type="button" class="btn btn-primary">继续填写</button>
    <button type="button" class="btn">放弃填写并关闭</button>
  </div>
</div>
```

预期树在选择中仅当前alertdialog/标题/范围句/两个按钮；原表单与背景页面不得同时成为可操作弹窗。继续后去除guard，恢复原form原inert/aria-hidden属性，具名字段/原hint/error回来。订单变更oc-type/amount/reason与主管ap-opinion手写label就地for，qc原formItem绑定保留；error追加描述不丢hint。多窗源内容不得混名，ID重复与active层关系需结构检查。

SC1.3.1/4.1.2：label、alertdialog名称/描述/源隐藏关系；2.1.1/2.4.3：Tab/ShiftTab仅当前guard循环，Esc继续，近字段返回顺序；2.4.7/2.4.11：焦点可见且不被新层完全遮挡；2.5.8：目标尺寸与间距；3.3.1/2/3：完整原因/明确选择范围；4.1.3：处理中等待和失败反馈合适播报，不让原窗隐藏时全表反复live。实际读屏/完整WCAG2.2AA未测，结构标签不代替AT验证。

## 两轮五视角真实评测矩阵

| 视角 | 首图与首交互重点 | 修正后终审 |
|---|---|---|
| 业务员 | qc日期/说明、oc类型/金额/原因明确；误X/取消/Esc后继续不丢原文，放弃不误解为取消订单 | 继续修正→合法登记客户确认/申请，qc不自动订单；oc隐藏金额切换保留、成功只目标业务 |
| 主管 | ap具体申请/意见、退回必填error具名且完整；守卫不替代审核确认或造成丢意见 | error→填写→误关→继续保error/hint/原文→处理，失败/成功不同，原自审/资格不扩 |
| 两宽视觉 | 原modal+guard440层级、背景保上下文/淡化，文本/两按钮/错误可读，不大重排 | 实际1280/1440×1000与opacity稳定，guard/原作业内容可读、无按钮遮挡；有纵滚不缩字截cause |
| 键盘认知 | guard初焦点继续；Tab/ShiftTab循环、Esc继续、返回最近字段/选区；页面/底层不可达 | 实际按键与只读DOM结果逐项记，sourcebody/textarea scroll分别验，不以Node属性认原生按键 |
| 现实成功/未提交 | 放弃尚未提交不写业务；处理中等结果不撤销；成功不洗页面作业 | 旧source回调/timer/guard竞态归Node，原生正常链另证；假登录/内存写不冒后端事务或持久草稿 |

代表首图：三任务各1280/1440原作业与dirty关闭选择；再保继续后的原输入/错误一张代表。业务员Q4确认说明并真实日历日期（不编过期制度）；SO1合法变更金额/原因和取消类型切换；主管原AP20260903退回空意见产生错误再填写，guard/继续核错误关联。截图覆盖task/state而非追数量，修正仅重读变图，最终逐图实读不凭文件名SHIP。

实际键盘至少一条完整guard Tab/ShiftTab/Esc回近字段，X/取消与Esc源入口分别有普通交互证据。实际selectionStart/end、textarea.scrollTop、modal-body.scrollTop、page.scrollY各自记录：同id和值只是值证据，不证明原nodeidentity；源码/Node有直接引用比较才认同节点。CUA定位可能先滚动页面或blur字段，应以关闭handler真实捕获位置与继续后对照，不虚构工具定位前完全保持。

处理中窗口很短时未拍到不能造截图/宣称可见忙碌全过程；实际同步DOM或普通按键证据与Node真实timers分别列。快速失败后450ms loading键盘retry的MEDIUM需独立修复/复验报告，不能凭普通成功图认为竞态全绿。旧callback的新窗隔离只能按实际证据称范围，不在真实站点evaluate改状态或强造另一作业。

## 当前证据与交接边界

规划9例误关闭丢输入与oc/ap旧回调、480ms误关新窗是隔离真实源码红灯；qc原已有source安全，不重复列本轮新修复。共享45、fin21/sales21及其失败timer修正、旧桩/旧parallel期待有限授权适配都保历史：Node不代原生。原已替换first再提交的旧期待改为零写，不能称全部旧断言未改；保原金额/角色/历史/快照证明。

本轮新增关闭选择不能扩未知页面导航草稿、跨页/刷新恢复或其它弹窗，无参legacy force保原范围。计划及初稿暂无实图，未最终APPROVE/SHIP；DESIGN/JSON终审授权后才同步。file协议、跨/旧浏览器、读屏/400%或320px、运行减少动效、原生refreshclose、后端身份/事务/银行/NAS/持久草稿、正式签名/PDF未验分别保留。中枢统一总材料/HANDOFF/Git，用户持续授权有效但不替代真实回执。

## 首12图后的打磨与验收调整

12图已逐view_image读取；QC/OC/APguard对象、主继续/次明确放弃全文清楚，继续后原错误/输入仍在。必要局部CSS：原modal整体opacity24%使页面字段透入源白卡，QC客户/规格、OC已收/未收、AP台账叠到源表单，削弱上下文。保持源白卡opaque/parentopacity1，仅淡化直接header/body/footer内容或局部遮色层，保DOM/inert/aria-hidden与guard440、不重排；修正图再验，首图过程不抹。

本批5PASS不夸矩阵（layouts空）；QC原生Tab/ShiftTab/Esc与选区0–1/日期错误继续、明确放弃仍待确认；OCtype取消/隐藏金额/原因继续；APraw单空格error/hint/ARIA/focus保留。APpage17/body0分开，非零modalbody/textarea滚动仍待真实路径。inertwrapper未返而实际attribute空串/aria-hiddentrue属于结构；调试树含无名source，未读屏只一dialog认证。精准source节点身份不是同id/value可证明。QC首图较早，终图统一最新actorContent源码；金额20.50正常拒绝不是H20错误。当前仍未SHIP，待透页修正图、成功/busy/角色终材料。


## 终图闭环（保首次回读阶段与最终追加）

已逐view_image全部17终图+3额外720process，UI SHIP限H20；初12透明叠字历史保，源modal opaque白底与直接内容24%淡化实际消除透页。两宽guard对象/主继续次放弃、原error/输入/近字段完整，720body165/textarea362/raw494选区0/0恢复真实保。AP正常page22/guard13/body0、额外page157均不同域不称全page0；低角Toast不盖当前任务但不认全参考无遮挡。

当前14nativePASS/32PNG15过程17final，矩阵layouts0尚在跑，不预写145/290；45shared/40sales/21ap、26脚本36syntax与综合loadingMEDIUMResolved/JSAPPROVE、CSS补审为代码证据。AP原生fastretry不是sales450反例，OCnativeEsc实际已commit后的480关闭延时不冒事务可撤；QC确认仅生成入口未click；旧源identity/actor/node/timer异常归Node。正式未验与有限字段边界保留，矩阵完成后仅同步真实counts再封版，不无理由重拍/重测。


最终计数现已实际回读：14nativePASS/0FAIL、145distinct/290实际1280/1440×1000layouts/0fail、console[]，32PNG15process/17final不变，extra720三图只process不计主矩阵。1280在admin/sales/doc/fin116后bossloginwait超时仍finPL2，原生注销明确观察退出登录确认→login再boss补29；1440观察logouttitle/截图再confirm完成145。不称连续无恢复/不猜原因。未变17+3图与代码不重读/重复测试；layoutStatus实际通过，全部有限范围与未验保留，四材料完毕停止本轮写入，由中枢后续实际推送回执。
