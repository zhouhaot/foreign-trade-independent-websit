# 第14轮H25五视角UI首评

2026-10-07。基线ac8d5a9cb684964e59d6131ea1719cd6de4cbd6e。由中枢在代码任务结束后另派独立UI子任务；本reviewer未写本轮源码/测试/CSS，只拥有本文与round-14/design-review.md。不改既有code-review结论，不操作CUA/Git或覆盖其他作者。H25仅五个当前动作面字段词，原paper/H19/历史/控件/提交/dirty/冻结说明/H24保；CI实际marks/remark，PL另五packing字段。

## 实际图像方法和边界

本reviewer逐view_image打开8张新first1440和6张旧baseline1440，共14张JPEG，全部实际读取，没有拿代码APPROVE替代图评。只读browser-process.json：14images全部process、DOM1440×1000、opacity1/transformnone；旧/新PLeditor scroll28、新PLconfirm scroll8，其余scroll0。interactions/layouts均空，failures[]不能称行为/布局全测PASS。

另以System.Drawing.Image.FromFile只读实际文件像素并及时Dispose，不编辑/缩放图像：11张非modal图1432×994；3张modal图1440×1000，分别旧CIconfirm、新CIconfirm、新PLconfirm。DOM尺寸与JPEG像素分别记录，不能把全部14图写成同一像素。截图会有正常纵滚，纸张备注/部分footer和审核章未全在首屏，不冒全纸或全部控件同时可见。

## 六旧基线保为修前证据

| 旧图（省略-baseline-1440.jpg） | 实际旧指引及对照价值 |
|---|---|
| doc-ci-current-label | CI4当前按钮仍“编辑包装与备注”，但H24横幅已仅唛头备注，动作与当前真实范围冲突 |
| doc-ci-editor-label | CI4编辑工具栏仍泛称唛头/包装/备注，实际唛头textarea可见、交易表格只读；不能因截图下部外没有备注而说仅一个字段 |
| doc-ci-revise-label | CI3V2修订按钮包装与备注·V3，原通过意见/name/date、导出演示与受控继承说明保 |
| doc-ci-revise-confirm | 原V2→V3草稿/沿用V2快照/原版保/新审核完整，但字段词误含包装 |
| doc-pl-current-label | PL4按钮省略唛头而写包装与备注，原退回事实/送审/待处理重制资格已正确分层 |
| doc-pl-editor-label | 原PL工具栏三字段族与五包装input相符，scroll28，作为原正确完整范围/输入对照 |

旧图的冻结时间与新图的冻结时间由各自加载演示基线生成，不用跨加载截图宣称整页像素或完整模型相等。原数据/历史/控件精保是代码对照与专项证据，不是图像方法的能力。

## 八新首图逐张结论

| 新图（省略-first-1440.jpg） | 实际所见/前后 | 首评 |
|---|---|---|
| doc-ci-current-label | CI4当前按钮“编辑唛头与备注”，横幅原CI范围一致；原送审/导出禁用说明、交易只读、目录状态保 | 字段指令准确，无新卡片/缩字需要 |
| doc-ci-editor-label | 工具栏“编辑唛头与备注”，唛头textarea可见，原保存/送审/放弃按钮与交易表格保 | 去掉不存在的包装；备注在截图下方，其存在由实际字段/代码证据另核 |
| doc-ci-revise-label | CI3V2按钮“修订唛头与备注·V3”，目标尾部完整，原原版保留/再审说明可见 | 当前操作语义与类型/目标版本一致 |
| doc-ci-revise-confirm | CI2026003 V2通过，生成V3草稿，仅唛头备注、沿用V2快照、原版保和再审全文保；取消/生成V3清楚，关闭焦点轮廓可见 | 修订字段准确且风险后果不缩水；不是正式签署或实际生成证明 |
| doc-pl-current-label | PL4按钮补全“编辑唛头、包装与备注”；原46A意见/name/date、允许送审/待处理重制原因保 | 完整字段族且按钮一行完整，无裁切 |
| doc-pl-editor-label | 工具栏原三字段族保持；唛头和5包装输入在scroll28图可见，原保存/送审/放弃层级保 | PL包装范围不被CI文案修改误删；备注仍下部外，不虚写7控件全同屏 |
| doc-pl-revise-label | PL3V1按钮完整三字段族·V2、尾部V2可见，继承原快照/原版保/再审说明保 | 长按钮在1440未见文字溢出，无必须微修 |
| doc-pl-revise-confirm | PL2026003 V1通过，生成V2草稿，仅唛头包装备注、沿用V1快照、原版保和再审全文保，scroll8 | 类型/源版本/目标版本一致；本批没有同PL修订旧图，不称该对照逐像素复原 |

首图没有可见Toast，本阶段不冒看见“仅CI两字段”的原生反馈；Toast正确性来源实际代码专项29及后续中枢代表原生记录。所有首图顶部实际身份为单证员；只读业务员/财务/主管和管理员不是本批实际UI图，资格保来源代码34/90与57对照，原生各岗位待终评阶段。

## 五视角评测

| 视角 | 首评实际判断 | 终评待核 |
|---|---|---|
| 制单人/字段指令 | CI入口→toolbar→修订确认准确两字段，PL三字段族完整，不误许交易核心编辑；原实际控件没被文案替换 | 两类反馈Toast及原进入编辑字段、取消保存路径按中枢原生证据分层记录 |
| 岗位/资格 | 单证员当前动作/原通过受控修订与原状态一致；H24历史/暂停的制度词未扩散 | 未看只读岗位图不称全角色UI已过，不把字段helper当资格来源 |
| 历史/风险事实 | 原退回意见name/date与审批通过事实保；确认精确source/target版本、草稿/继承快照/原版保/再审全可读 | 正常业务创建才会写模型，截图不认证历史字节/正式签发；原源guard由回归证据 |
| 键盘名称/认知 | 可见修订字段与JSON实际reviseLabel ARIA同词，ARIA另完整“生成新版本Vn”；确认主按钮生成Vn与后果一致，关闭轮廓可见 | 没亲做Tab/Enter或读屏，不称焦点trap/整个键盘链/对比度或WCAG认证 |
| 布局/一致性 | 八新1440字体/三栏/A配色保，长PL按钮与确认文本完整自然折行，目标版本没被省略 | 1280未验；中枢按钮DOM量测与本图所见分清，首图不由failures空推布局矩阵 |

中枢给出PL当前button client/scroll188/188，PLrevise196/196；含border bounding198在ablock198内，panelScroll/client230/230。本reviewer没有独立操作DOM量测，作为中枢提供的具体补充与图像无溢出相符，不将它称本reviewer原生验证。它只是当前1440宽度，不推1280。

## 原生采图方法纠正，不当产品修复

browser-process记录两条measurementCorrections：首次PL3V1修订按钮Enter selector deadline，fresh状态仍无modal/active BODY；改语义locator click仍无modal，只读hit-center为main而非button。中枢reload只复位内存，源码/布局没有修改，随后hit-center为doc-revise，实际Enter打开确认才捕获本首图。根因未确定，本reviewer只读记录，没有独立重现；不计首次Enter/click通过，不把reload称产品修复，也不把截图已开窗当整个原生键盘链已验。

## 首评结果和下一轮复盘要求

无必须的局部文案/CSS微修。新长PL字段词在1440按钮/确认清楚，CI去包装同时保版本与风险解释；不因想压缩字数删唛头/快照/再审事实，不新增颜色卡或换字号以制造改进。首评改进项R14-UI-01：五面名称对应真实字段；R14-UI-02：可见与ARIA版本/确认后果一致。本批可见代表成立，Toast与只读角色/1280仍需要中枢终图及行为证据。

源码冻结0C04CAFAA61B7B83A287F8FA7BFC136101BB411B0173AECB8E1F147659853987，本UI任务没有改源码/CSS/Mock/代码报告。29/34/57/137/90/workspace是已经发生的独立代码证据，不说本UI任务重跑。旧dirtyguard/冻结一般“包装”词与历史旧留痕保留，H25不扩全站禁词；真实权限/并发持久化/PDF、file/跨浏览器、读屏/400%320px均未认证。

**Verdict: FIRST-REVIEW PASS（8张新1440首图），NOT SHIP。** 下一阶段逐看1280/1440终图，重点PL长词、Toast、可见/ARIA/confirm版本、只读/旧版边界及代表原生；无新源码差异时以验证深化完成复盘，不造无必要CSS修改。此首评写入结束，等待中枢终图续评，不预写Git已同步。

## 终版独立复评（保留首评历史）

中枢另派终评，本reviewer继续仅追加两份UI材料，不改code-review/source/tests/CSS/Git。已实际逐view_image打开19张final，连同之前6baseline+8first共33张均实读。首阶段NOT SHIP是当时证据不足状态，完整保留；本节补齐两宽/只读岗位/新版本与中枢原生记录后作最终判断，不假称首图后做了新CSS整改。

| 终图文件（省略-final-宽度.jpg） | 宽度/记录scroll | 图上实际事实与判断 |
|---|---|---|
| doc-ci-current-label | 1280/0 | CI4入口仅唛头备注，横幅与右栏一致，原横排目录、只读交易区保 |
| doc-ci-editor-label | 1280/103 | 工具栏仅唛头备注、唛头textarea及原保存/送审/放弃可见；标题上缘被正常滚动到固定header下，不当新字段词遮挡 |
| doc-pl-revise-label | 1280/0 | 完整三字段族·V2一行可读，版本尾未截，原快照/原版/再审说明保 |
| doc-pl-revise-confirm | 1280/161 | PL3V1→V2草稿，三字段族、沿用V1快照、原版保/再审完整；背景滚态不影响中央dialog |
| doc-pl-revision-draft | 1280/0 | 新PL3V2草稿入口三字段族、未送审/导出disabled与原模型含义一致，旧V1仍独立目录 |
| doc-ci-revise-label | 1280/0 | CI3V2按钮两字段·V3、原版保/再审与原通过意见/name/date完整 |
| doc-ci-revise-confirm | 1280/103 | CI3V2→V3草稿仅唛头备注、沿用V2快照/原版保/再审完整，生成V3按钮清楚 |
| doc-ci-revision-draft | 1280/0 | 新CI3V3草稿按钮与横幅两字段一致，原V2/V1及PL版本目录精确区分，导出disabled |
| doc-ci-revision-editor | 1280/80.800003 | 工具栏两字段、marks输入及交易表格、原保存/送审/放弃可见；备注在截屏下部外 |
| doc-pl-revision-editor | 1280/138.399994 | 工具栏三字段族、唛头/5包装输入与原hint、备注标题和输入开头可见；不称备注完整内容同屏 |
| doc-ci-current-label | 1440/0 | CI4当前按钮仅两字段，三栏/原H24范围与交易只读保 |
| doc-ci-editor-label | 1440/0 | CI编辑工具栏两字段，marks原textarea、原按钮层级保；Toast没有在截图中，不用图像替其反馈记录 |
| doc-pl-current-label | 1440/0 | PL4按钮完整三字段，原46A意见/name/date及pending重制限制保，无新长词裁切 |
| doc-pl-editor-label | 1440/27.200001 | PL完整字段族与原marks/包装input、保存/送审/放弃对应，右栏正常纵滚 |
| doc-ci-revise-confirm | 1440/0、tab8 | 精确V2→V3草稿、CI两字段、继承V2/保原版/再审完整，不省风险说明 |
| doc-pl-revise-confirm | 1440/7.200000、tab8 | 精确V1→V2草稿、PL三字段族、继承V1/保原版/再审完整，长词自然折行 |
| boss-approved-readonly | 1440/0、tab8 | 主管实际身份、已通过版原事实/无需审核，无doc-edit/revise；原资格允许导出演示仍可见，不把制作只读说成所有动作禁用 |
| sales-ci-current-readonly | 1280/0、tab8 | 销售实际身份、CI制作中当前仅单证员制单原因/本页只读，返回订单，无edit/revise |
| fin-pl-current-readonly | 1280/0、tab8 | 财务实际身份、PL原完整退回意见/name/date和只读原因、返回订单，无edit/revise |

scroll为实际browser元数据，浮数表内为便于阅读约至六位；原值CIeditor80.80000305175781、PLeditor138.39999389648438、PLconfirm7.199999809265137等保在JSON。route与opacity1/transformnone稳定是捕获条件，不等所有滚动已静止或scroll0。正常焦点滚动使部分标题/纸张footer离开可见区，本reviewer不写整纸/全部备注/签署同时可见，不用这种原滚态捏造本轮新布局缺陷。

终图像素由本reviewer再次System.Drawing只读19文件实际测：10张1280非modal为1272×994、5张1440非modal1432×994；两张1280modal1280×1000、两张1440modal1440×1000。均DOM高1000，JPEG和DOM分列；本次没有编辑图像。首阶段11非modal/3modal只描述14过程图，不能拿旧计数代本批19。

### 五视角最终结论

- 制单人：入口/toolbar与CI两字段、PL三字段族相符，真实原Actions生成后的CI3V3/PL3V2仍按正确类型说明，不扩大交易编辑。图像与中枢实际2/7控件及Toast记录分层，Toast没有截图捕获仍不冒看见。
- 岗位：boss/sales/fin新终图补齐实际角色语义；管理员拒权与其它角色全矩阵由中枢探针记录，原资格不因字段helper改变。已通过主管可导出演示符合原资格，无编辑/修订入口。
- 历史/风险：CI V2→V3、PL V1→V2精确，草稿/原交易快照/保原版/新审核解释完整，原退回意见/name/date和历史版本保。正常创建是原业务写，不能把全原生过程叫零写；完整模型/源对象快照精保来源独立Node29/57与旧回归。
- 名称/键盘认知：实际可见词与JSON ARIA同字段、目标版本一致；中枢记录Enter打开与生成、CI Escape/Enter取消、tab8跨CI确认→PL确认后Escape返回具名按钮。reviewer未亲操作，不称整个Tab树/读屏/WCAG认证；焦点轮廓仅图上可见。
- 两宽布局：19图逐看1280/1440长PL按钮/中央confirm完整可读，字号/A配色和原横目录/三栏保持，不需缩字删字段或重排。原信息自然折行与纵滚合理，DOM探针最终buttonOverflow0与图像所见相符。

### 最终记录与方法纠正归因

实际只读聚合browser-process.json：images33=14process（6baseline+8first）+19final，8原生组均pass；layouts60=30个role/document组合×1280/1440，五role，final layoutFail0/buttonOverflowCases0、failures[]/console[]。这60项来自矩阵前reload只复位演示数据，CI3V3/PL3V2是另原Actions代表阶段，不把新增版本图冒作矩阵包含它们。另实读中枢33Node/43syntax日志，全部exit0；本UI任务没有重新执行33/43，代码阶段自己的29/34/57/137/90/workspace在其报告另记。

8组覆盖CI1280原编辑2控件及按钮/toolbar/Toast、PL1280原受控确认/生成V2、CI确认Escape恢复焦点、原生成V3及2控件、新PL2七控件、1440两类三面、tab8 CI取消转PL确认/Escape焦点、三只读岗位。是中枢亲操作，本reviewer离线图/元数据实读，不冒自己操作浏览器或所有按键覆盖。完整Model相等非截图能认证。

原两条首次PL1440 deadline/hit-main无modal的过程仍保；后来tab6 reload Enter成功与最终1280/tab8跨页实际hit-doc-revise/Enter成功不混首个失败。新增temporary-tab-expired说明原tab6列表空/失效，无失败截图落盘；随后stale-helper-binding是采图closure仍绑定6导致第二错，tab8实际存在，不当tab8再次丢失。中枢改采图/登录助手显式传当前tab，未改产品源码，根因未定的首次hit-main不因后两工具纠正被猜成已查明或已修产品。

源码/两专项实际重读指纹仍0C04CA…3987、D2EDE3…08F9、A3E9FA…5A19，与代码冻结一致，无相邻UI改源码/CSS。首评无必须微修，终轮合理工作是补两宽、当前/新草稿、三角色及代表确认路径；不制造无必要改动，R14-UI-01/02均满足H25范围。

原dirty/冻结一般词与历史留痕保留；正式身份/后端权限并发持久化、实际PDF签发、file/跨浏览器、全状态/异常、读屏/缩放等仍未认证。**Final verdict: SHIP（限第14轮H25当前单证五面字段文案UI）。** Git提交/推送由中枢另处理，本reviewer未预写Git完成，两份UI材料终评写入到此结束。
