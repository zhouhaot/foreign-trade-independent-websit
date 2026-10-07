# 第9轮：业务弹窗填写连续性

2026-10-07，基线 `d03c9a055ec10c1bf0171669ce0d15a90d820e01`。客户确认、订单变更、主管处理意见三个弹窗，误点X／取消／Esc时可选择继续填写或明确放弃；原输入、错误、焦点与滚动保留。处理中等待结果，成功按源窗口关闭；旧回调不串写／误关后来作业。A方案保留，仅加入同源440px选择和必要字段名称，不扩持久化、后台或任意页面导航保护。

## 现实规划与H20

规划用真实Actions／U.openModal／app键盘隔离DOM复现3作业×X/取消/Esc共9例直接丢输入；另证明oc/ap在源已detach后排队回调仍写业务并关新窗、oc已commit后的480ms关闭timer关新窗。qc本已有overlay连接守卫，是安全对照，不虚构新增修复。共享脚本缺API红灯不是这些旧业务红灯的替代。

H20显式限定qc-form客户确认、oc-form订单变更、ap-opinion主管处理。按原节点/raw值进入基线比较，恢复原值清洁；清洁直关、脏时主“继续填写”、次“放弃填写并关闭”。同overlay原.modal与alertdialog共存，不用U.confirm洗源；选择中源inert/aria-hidden、Esc继续/Tab选选择层，普通重复关闭幂等，旧choice绑定本次guard。原节点/value/error/选区/最后字段focus/body滚动保，提交同步busy、失败解锁、实际commit后仅modal-clean与source-close；无参force close保legacy并非全局自动保存。姓名/账号内容/raw payload漂移拒绝，不新增业务人员归属、日期或财务精度制度。

程序成功仅直接调用Modal clean，原App.rerender照常更新业务页；不能由此保证任意背景表单节点保留或跨页恢复。明确放弃丢未提交输入，不能撤回已经提交的业务；OC实测busy Esc在已commit的closing delay，不宣称可中止事务。

## 分工和每项说明

中枢单写utils/app/CSS／共享脚本／浏览器／交接与Git；sales worker单写views-sales及专用脚本、finance worker单写views-fin及专用脚本；现实agent、code-reviewer、typescript-reviewer和UI agent独立分阶段评测。旧相关脚本桩/预期逐文件授权单写，没人回退他人。源代码/业务规则未靠脚本桩宽松fallback实现。

| 材料 | 改进范围 | 逐项编号／证据 |
|---|---|---|
| round-09-shared.md | 基线注册、三关闭途径、同源选择、焦点/选区/滚动、Tab/Esc、busy、源关闭、重复/陈旧选择、视觉 | R09-S01～S10共10项；共享45；自发现旧choice红绿 |
| round-09-sales.md | qc/oc原控件、raw/actor内容与源票据、busy/失败/成功、旧timer、快速重试及旧预期适配 | worker11项前后；sales40/quote103/change25/context194+15 |
| round-09-finance.md | 原意见/错误/ARIA、source/busy/raw上下文、失效零写、源成功关闭、旧桩/互斥适配 | worker9项前后；finance21/原金额和历史相邻 |
| R09-O01 原弹窗不透明修正 | 首图整体opacity.24透入后页叠字→保opaque白卡，仅header/body/footer内容.24 | UI实读12初图→2层CSS→17终图+3extra复审；DOM/inert不变 |
| R09-O02 原生恢复及提交区分 | 单凭Node焦点不足→实际Tab/ShiftTab/Esc/选区/主体与textarea滚动、失败键盘重试、成功源关闭 | 14组PASS，桌面两宽＋extra720；不冒销售精确race或读屏 |
| R09-O03 每轮完整证据 | 开始/初审/红绿/旧预期更改/方法恢复→材料与阶段记录、源码指纹、终图和独立远端回执 | 26脚本/36语法、145角色路由/290布局、两代码APPROVE/UI SHIP |

共33项说明，含有限修正与证据条目，不能当作33个新增业务模块。规划与UI两轮计划分别见round-09-planning-review.md／round-09-ui-review-plan.md；所有前后行为、文件、假设与限制在相应材料，不只列提交标题。

## 实际验证和边界

- 26组Node脚本全部exit0；9运行JS＋26cjs＋1mjs共36语法文件exit0。新增共享45、sales40、finance21，报价103、变更25、上下文194+15、导航33、适配17、收款71、包装644/111、纸张审核137、视图100等原契约保。全回归在JS冻结后、随后只opaque CSS，独立CSS补审及真实终图，不重复无变化业务脚本。
- 综合最终APPROVE，保初快速retry MEDIUM独立红绿：第一次异步失败450ms button loading仍在，重复键盘激活setbusy后withLoading直接return可永久锁；两handler任何清错/禁输入前检查is-loading，真实原timer再次验证520ms后可填写/关闭。root自发现同源已继续后旧discard误关与旧continue影响新guard也保2红绿；综合额外44、JS专项独立39均仅Node、不加进root45/40/21。
- 独立JS最终APPROVE，复验原Promise、raw仅空格、同id同value换原节点、actor同对象id/name、失效旧回调/choices、legacy confirm/force与正常取消历史。OC同actor内容漂移新补先RED→35，再5节点场景→40；有意程序禁用输入期间仍重查原节点/raw值，不以禁字段当安全边界。
- 旧脚本确实有限改变，不能说原断言全没改：quotation的排队后关闭/捕获A期待改为busy等结果／漂移拒绝，再合法重提保原金额/生成订单/快照；change-request的脏取消需explicit discard／漂移拒绝；context-navigation不再期待直接page-clean而核Modal clean参数；repricing/cancellation/snapshots补plain modal API模型，repricing旧first已替换窗不得写、current second处理/重复互斥仍测。完整guard由新真实DOM脚本覆盖，原权限/金额/历史断言保留。
- Mock源文件相对基线零差异，未新增样例/依赖/运行资源。原订单、单证交易快照、H12/H18/H19与角色资格保留；失效动作全Mock零写和严格节点引用由Node证明。程序强制open/无参close、任意页面导航/刷新、未注册弹窗仍不属于H20保证。
- 实际HTTP8001 no-store同IAB tab6，14原生交互PASS：qc guard Tab/ShiftTab/Esc保说明选区、日期error继续、explicit discard不登记、清洁直关、合法确认只出现生成入口未点击；oc取消type/原因/隐藏金额继续、已commit收尾busy Esc等待、成功取消申请中仅源关、清洁直关；ap raw空格必填error/ARIA/近focus、720长意见双域滚动、loading原生Enter失败重试不锁死、真实退回成功/订单款项独立。AP原20.50差额拒绝是原精度规则正常结果，不是H20新缺陷。
- extra1280×720实际主体scroll165、textarea内部362、selection start/end0、长值494前后相同；页scroll157独立，不能混为body坐标。只该长意见场景，非720全站/移动端认证。Native AP Enter实读is-loading，不冒QC/OC精确450ms反例的浏览器复现；那些由独立原timer Node覆盖。Native同id/value/连接存在不等严格节点identity，后者由源码/Node引用；Cua wrapper.inert未返，读实际inert HTML属性空串及aria-hidden=true，调试snapshot无名source不能当读屏证明。
- 5角色×29已知路径，145独立组合／1280与1440×1000共290实际布局PASS，拒绝/横溢核对，console回读空。1280完成116后主管登录wait超时、实际仍财务PL2；fresh native logout观察退出标题→可见login后补主管29，1440逐次先观察logout标题/截图再确认完成145。记录恢复、不猜原因或称连续无恢复；刷新还原native业务变动再跑默认样例矩阵。
- 32PNG＝15过程＋17终版，包含3个720过程；UI实读12首图后发现透页叠字，有限CSS修后逐读17终图＋3extra，最终SHIP无新必要缺陷。普通截图像素不等DOM视口；QC/OC常态page0，AP正常page22/guard13/body0，不统一称页首0。低角落登录/旧确认/失败Toast不盖任务，未要求重拍、不夸全参考无遮挡。
- 未执行file://受控浏览器、Ego旧脚本、其它浏览器、全Tab/真实读屏、运行期减少动效、原生关闭刷新保护、生产身份/并发事务/正式日期/退款制度、PDF/签发/NAS/部署。无依赖/构建工具，仍假登录/内存写/刷新复位；Actor内容绑定是原型上下文，不是服务端认证。

证据目录 `.impeccable/review/round-09/`：26日志及summary、syntax、browser/过程、两代码审查、设计审查、PNG、audit/基线记录。最终4设计材料已同步，schema2/原10组件examples逐对象实际比较保留；结构审计8PASS/1WARN/0FAIL，WARN为有意系统字体/白卡/业务CTA。Git同步实际完成后补。

## 多轮复盘和后续

现实先分清未提交输入与已提交事实，共享关闭契约先红绿再两worker接入。集成发现普通repeat语义含混、同源旧choice仍能执行，有限guard节点绑定补足；两个独立代码视角再发现/复验真实loading重试锁死、actor内容和原节点漂移。首UI12图未SHIP，透明源卡虽结构保DOM却叠字，改内容淡化/opaque白底后17终图复核；native720与Enter把Node之外的恢复结果分开证实，恢复与未验透明记录。

现实agent已有限复核H20来源/成功/强制失效旧callback与timer安全，原用户14native数字归中枢、不冒其独立原生。下一轮只读候选发现oc改价首次输入仍接受指数/hex/Infinity/超2位／精度丢失，污染待处理申请而非已批准交易；规划独立7反例和原合法/拒绝对照，后续审批现仍能拒无限/超精度，不虚构审批漏洞。下一轮推送后再选H21有限普通正数/到分申请契约，复用已有helper、不全局改validate、不洗既存target/历史、不扩退款或正式精度制度。当前不启动后台或部署，用户持续多agent开发／每轮推送授权仍有效，直到手动停止。

## GitHub同步

此材料尚未提前称已推送。实际实现提交、正常push/独立远端完整SHA与工作区状态成功后追加回执。

### 第9轮GitHub同步回执（2026-10-07）

实现提交 `72ad56e4e9de0627aeb961325ae70b1060f72aa5`，标题 `Preserve unfinished business modal input on close requests`，93文件包含33项说明／规划／两代码和UI两轮复审／设计规范、26日志／36语法、14实际交互／290布局与32PNG（15过程／17终版）。共享45／sales40／finance21，代码/JS/CSS补审APPROVE、UI SHIP、审计8/1/0；schema2/原10组件examples保留，Mock源码无差异。

fetch前0/0，正常快进push后独立ls-remote完整SHA与本地HEAD相等。当前工作区只有第10轮只读规划文件未跟踪，明确排除本轮暂存，不能说整个工作区干净。本成功后回执将独立正常提交/推送再回读；未强推、部署、修改凭据配置。第10轮只读7非法初值金额候选仍是规划，待中枢选H21后小步实施，用户持续授权有效。
