# 第12轮独立 JavaScript / 安全复审

日期：2026-10-07。最终有限代码结论：**APPROVE**，没有新增待处理的 CRITICAL/HIGH/MEDIUM/LOW finding。本文保留首阶段与晚增补审的实际过程；最终指纹确认和结论见文末，不认领原生 UI 或 Git 交付。

## 范围与方法

基线 `77deae8ae937c0c1d005d4b3b019d5d150e623b8`。按本地git diff检查utils有限documentWorkSummary/todosFor doc分支、app实际user传参与doc铃铛0项提示、core仅doc工作台/参考呈现及两个新增脚本。读取AGENTS/HANDOFF、本轮规划/core材料、原documentPolicy、实际当前会话helper、App/router和原单证/审批动作。CSS待中枢首图后独占处理，最终差异另补审。

无构建普通JS静态项目没有package.json/tsconfig/ESLint配置，TypeScript检查不适用、未执行ESLint。三个运行JS及两个新脚本node --check实际通过，git diff --check exit0；LF/CRLF提示不是失败。本次是本地差异review，没有宣称核验PR CI/merge readiness。

只读源码/测试并在stdin运行隔离Node，唯一写入本文。不改源码、Mock、脚本、其他材料、治理、CUA或Git，不回退他人；中枢统一HANDOFF。本文不认证原生输入、正式身份、读屏、像素或远端同步。

## 首阶段代码判断

- documentWorkSummary明确接收实际user，仅完整doc身份进入原documentPolicy.canEdit；core用ctx.user，topbar传其当前user，没有roleUser/姓名猜身份。todosFor legacy两参只读U.currentUser；显式第三参undefined/null不fallback。没有新增maker本人分派权限或正式后台身份规则。
- 仅草稿/制作中/已退回候选参加摘要；canEdit还须目标唯一、CI/PL具名no/正safe版本、父订单唯一及原ID可按当前router到达。原policy保最新/冲突/取消等资格，不通过改历史status使列表看似可办。
- 不能办理的原版本保references，保原policy.reasons.edit；定位异常再附台账核查诊断，不用generic文案替掉缺订单或逐来源原因。重复ID的两个原对象可能有不同原policy原因，不能强行归为第一条原因。
- 可定位参考仍按精确原ID查看，非自动最新；不可定位link=null，由core提供固定#/documents核对入口。encodeURIComponent(raw)===raw沿现router未decode能力，孤代理项被catch，不制定企业编号规则。安全标点仍可路由。
- core新text/reason/sub/documentId/link动态正文和属性经过U.esc，kind标签由U.tag内部转义；原HTML/长文保原文，不截掉历史。app新增doc铃铛data-link直接来自可办理且已验证的固定站内路径；允许的原ID字符不含双引号/尖括号，不能脱离现双引号属性。其余四角色原link逻辑未扩改。
- 工作台和铃铛主数是当前可Edit的单证，不把历史或暂停算作当前待办；0项明确可查参考，不说业务全部完成。doc状态卡仍统计全版本记录，已通过不一律称可导出；原具体canExport不改。
- 纯读helper返回新数组/新展示项，core只渲染；取消退回/通过、新版本修改仅由原Actions执行。原Mock、sales/docs/fin整源码，以及utils待办前的policy/金额/包装/modal和会话后缀，经精确基线CRLF归一对照实测保持；新展示不自动批准、清纸张或登记收款。
- 其他四role的todos和工作台整HTML均与准确基线fixture独立对照相同。原其他角色“我的待办”等含义保留，H23不借新增doc区域扩大规则。

## 本代理独立33场景 PASS

经stdin执行，未保存/改项目脚本。加载真实utils/core/sales/docs/fin/app和原Mock；保留真实App.rerender和最小DOM history模型，实际U.setUser/currentUser会话路径。没有替换router/summary/policy/动作作人为成功。

| 组 | 数量 | 实际断言 |
|---|---:|---|
| 身份与共享来源 | 8 | 原doc2项；legacy忽略假姓名只认当前doc会话；显式undefined/null/空对象/sales不fallback；core确用ctx.user而不是不同App.user；实际App渲染topbar/dashboard同一真实actor，禁用roleUser猜身份仍通过 |
| 原可办/原历史精确路由 | 3 | CI4/PL4“去处理”、CI3V1“查看记录”各实际点击委托→history/router→原docDetail，ctx参数/目标对象引用、完整目标workspaceHTML与指定原renderer输出相等、aria-current选中原ID；旧参考没有doc-edit |
| 可路由安全标点 | 2 | SAFE!、SAFE'实际doc待办详情路径精确可达，不添加字母数字编号制度 |
| 不可路由ID与安全属性 | 8 | 空格/中文/slash/%/query/hash/孤代理项/属性HTML原ID，不进入todos，reference保原documentId、link=null，core data-document-id精确保原文、固定台账href、不生成img/script |
| 原原因/冲突诊断 | 3 | 缺父订单、重复ID、同最高版本冲突；无可办，对每个原source分别包含其真实policy.reasons.edit，不错误套第一来源原因 |
| 长HTML正文 | 1 | 当前no和历史组no含HTML、引号/换行/重复长文，真实dashboard完整正文可取、无img/script、全MOCK零写 |
| 四role基线精确保留 | 4 | 同时加载准确基线utils/core/app，sales/fin/boss/admin整dashboardHTML与显式actor todo返回逐字一致，全MOCK纯读 |
| 真实取消生命周期 | 2 | 原sales取消SO5后doc0todos/3references且真实App模板bell0；boss实际退回恢复原执行中与doc2，实际通过仍doc0；原单证和收款逐字保持 |
| 真实受控V3修订 | 2 | 原CI3V2真实doc-revise生成V3，旧V2整record不洗，新V3进todo而旧V1/V2不进；新V3再实际路由精确对象/完整body/选中版本 |

共6次真实可达doc链接的强路由检查（原3、安全标点2、新V3一条），不是仅notFound/未拒权字符串；33并非全为导航。读summary/dashboard/详情前后完整MOCK JSON相等；业务动作自己的合法写入与之后纯读比较分别计，不把测试施加的隔离异常当源码业务写。

方法纠正：最初测试沿fixture默认行为，App.rerender被计数桩替换；取消退回后对相同hash再次触发导航，原navigationChanged本来直接return，因此读取旧bell0产生0!==2。确认申请已退回/订单已执行中/summary2后，仅在VM保存并恢复原App.rerender，用实际刷新重跑33全部通过。没有修改产品导航或业务；这是fixture方法纠正，未计产品finding/RED，也不伪称首探通过。

以上history/属性/焦点是最小DOM证明，不冒作真实浏览器刷新/Back、键盘或XSS外部服务认证。新renderer的逃逸检查不等全站旧页面安全审计。

## 实际脚本与源保全

两新脚本实际执行shared32/core18 PASS。最初任务消息提core16，当前文件追加同源/四role检查后实际输出18，以本代理终端为准；没有把16→18当新产品finding。保root初始旧3期望2、API缺失、generic覆盖原原因以及core递归DOM文字断言的方法阶段，未认领这些为本代理发现。

下列11相邻脚本实际执行均exit0：

| 脚本 | 结果 |
|---|---|
| verify-views | 100角色/视图及原核心动作 PASS |
| verify-context-navigation | 194来源/岗位链接+15集成 PASS |
| verify-document-lifecycle | 90异步与正常生命周期/快照 PASS |
| verify-document-approval-display | 137 PASS |
| verify-navigation-drafts | 33 PASS |
| verify-draft-adapters | 17 PASS |
| verify-approval-modal-drafts | 21 PASS |
| verify-cancellation | PASS |
| verify-payments-contract | 71 PASS |
| verify-session | PASS |
| verify-login | PASS |

独立只读源对照同时确认：Mock、views-sales、views-docs、views-fin整文件与77deae8相同；utils待办marker之前全部与会话marker之后全部相同，仅归一CRLF/LF。原policy/Actions/金额/包装/H19/modal没有因新待办被洗改。33独立场景不与脚本粒度合并，尚未收到冻结通知前不重复扩大测试。

## 首阶段实际指纹

| 文件 | SHA-256 |
|---|---|
| js/utils.js | 1A49E13DEB94447C474ECEBB007221071D40D15890AD56396709C49A402031E3 |
| js/app.js | 720F3607A1E97C082A6B4F75487DC95FF98EE31F7D332786ED5EE62CD2709C76 |
| js/views-core.js | EF868911F6C477A94AFC0F7BDD929AB36FF1E1EBAA34133A3FBF66B7ADF0F971 |
| scripts/verify-document-work-summary.cjs | D1A1EB1290380DB6434754E07F0766B91C19445FC2CC8C04E071234EC45BFB6E |
| scripts/verify-document-dashboard.cjs | DD38D918241D5B82EB682A70956FFE54757974B542284D04ECEE07DDA94B9C99 |

CSS/UI必要改动及最终指纹由中枢后续提供，收到后仅按实际差异补审；不把首阶段结果重标为未执行的最终源码测试。本专项未运行CUA/原生键盘/scroll/像素/读屏/跨浏览器/file协议、后台通知/个人分派/正式身份、后端事务、PDF/签署/NAS或Git同步。

## 首阶段 Review Summary

| Severity | Count | Status |
|---|---:|---|
| CRITICAL | 0 | no new finding |
| HIGH | 0 | no new finding |
| MEDIUM | 0 | no new finding |
| LOW | 0 | no new finding |

Verdict: **REVIEW IN PROGRESS** — 首阶段实际验证通过；等待最终源码/CSS冻结补读，不提前最终APPROVE。

## 晚增参考区跳转：有限独立补审阶段

中枢原生发现0项铃铛“查看工作台参考”同hash early return、仍展开且没有定位，另补固定read-navigation action。本代理没有认领该原生RED。实际重读晚增app、core aria-label和CSS diff；首阶段App/UI指纹已不等于现在，原33与11相邻回归保其阶段，没有直接改名为新源码下的重跑。

当前实现对doc角色关闭铃铛，同dashboard只焦点原参考h3并调用section.scrollIntoView，不重建原DOM；跨页交原requestNavigation固定 `#/dashboard?focus=doc-work-references`。render末尾仅按确切query token和doc角色定位，query值不作为任意selector/HTML使用。没有挂pending全局定位变量，原requestNavigation/confirmDiscard与修饰键early return不变；element.dataset/href外部字符串不能改变固定目标。即使参考0条也能定位其真实h3，未扩大可Edit/查看权限。

core新增的具名“去处理/查看记录/核对台账”aria-label只用于doc条目，目标text仍U.esc；其他role整页结构不因这些条件属性改变。CSS参考三列、14px完整reason/pre-wrap/anywhere和中性0图标只影响doc区域，实际引用的surface-subtle/text-sub/border变量存在；scroll-margin-top96为滚动布局规则，本代理不据它宣称固定头部像素验收通过。

自行stdin再执行**14个独立晚增App场景**，exit0：

| 组 | 数量 | 实际断言 |
|---|---:|---|
| 同页参考跳转 | 1 | 点击真正0项铃铛link，原workspace/section/h3节点身份全部保留，焦点精确h3、tabindex=-1、dropdown展开状态false；调用的滚动节点为该section、参数block:start，全MOCK不写 |
| 跨页固定目标 | 1 | 原历史单证页真实0项link，经委托/history/router进入确切固定dashboard query，再定位新真实h3，全MOCK不写 |
| 直接合法query | 1 | doc dashboard确切token能定位同一参考h3，不调用业务Actions |
| 任意query文本 | 1 | HTML样式focus值既不生成节点，也不作为selector定位/滚动 |
| 其他四角色反例 | 4 | sales/fin/boss/admin实际dashboard相同query无参考/无定位，直接调用read action仍不导航或写；外部dataset.link不能改变目的地 |
| Ctrl/meta/shift/alt | 4 | 真实委托click保持defaultPrevented=false，当前DOM/hash/定位意图/模型不变，保原另开行为；未冒称实际新窗口已打开 |
| 原dirty取消/确认 | 2 | 真实PL4 inline editor的df-marks/raw/field-error/描述/焦点保留；直接调用read action走原guard，取消保原workspace与原field。随后普通dashboard确认导航没有残留参考定位；明确确认则只到固定query并聚焦h3，均MOCK零写 |

使用原App.rerender/真实注册handler/原confirm的Promise；跨页guard明确await fixture.flush后检查，不以未完成Promise误判故障。滚动方法在Node DOM原型中设观察桩，只证明正确section及调用参数，不是原生scroll位置。guard场景是直接真实action测试，不假称可编辑状态中真的有0项CTA可见。

晚增源码下实际重跑bell4/shared32/core18/nav33/adapters17，三个相关JS语法、diff-check均exit0。本代理14与root专用4分开记录；root测试初探不存在doc-form/Promise过早等方法过程归root，不认领为本代理产品finding。

| 当前晚增文件 | 实际SHA-256 |
|---|---|
| js/app.js | 43E47204016DE21B3DD96A6F0CD11451622DF268D6109037B2E866FF7076A864 |
| js/views-core.js | F6EA1ABB77BBAE195442A43E2ED152F2CB693CB1EEC22A066A32BCF5F724048B |
| css/pages.css | FE2FB46E60737DBEFFCA97D62506CED5DBC195EB7B1AC9A9780421BF5A10DA1B |
| scripts/verify-document-dashboard.cjs | AC8A436E5D523371FC687C7D790559227BF2DF8B8FCF5172991DEDA8038230D6 |
| scripts/verify-document-work-bell.cjs | DC3AF0D3DCAE46A792AA801AB40BB535C802AC7466DFAEC27D795B4C1AE0134A |

utils与shared脚本的首阶段指纹不变。当前晚增未发现新增finding，仍等待中枢最后冻结/统测记录再给最终有限verdict；不预写Native/UI/Git通过，未改本文外文件。

## 最终冻结确认与有限代码结论

收到中枢最终freeze通知后，本代理实际复读三个运行JS、CSS及三个新脚本的完整SHA-256，并重读晚增action/helper及CSS定位规则。七个指纹全部与前述已审阶段相等：utils/shared与首阶段一致，App/core/CSS/dashboard-script/bell-script与晚增14场景阶段一致。没有在冻结后出现未审源码差异。

| 最终文件 | 实际SHA-256 |
|---|---|
| js/utils.js | 1A49E13DEB94447C474ECEBB007221071D40D15890AD56396709C49A402031E3 |
| js/app.js | 43E47204016DE21B3DD96A6F0CD11451622DF268D6109037B2E866FF7076A864 |
| js/views-core.js | F6EA1ABB77BBAE195442A43E2ED152F2CB693CB1EEC22A066A32BCF5F724048B |
| css/pages.css | FE2FB46E60737DBEFFCA97D62506CED5DBC195EB7B1AC9A9780421BF5A10DA1B |
| scripts/verify-document-work-summary.cjs | D1A1EB1290380DB6434754E07F0766B91C19445FC2CC8C04E071234EC45BFB6E |
| scripts/verify-document-work-bell.cjs | DC3AF0D3DCAE46A792AA801AB40BB535C802AC7466DFAEC27D795B4C1AE0134A |
| scripts/verify-document-dashboard.cjs | AC8A436E5D523371FC687C7D790559227BF2DF8B8FCF5172991DEDA8038230D6 |

首阶段33与晚增14为两段真实独立证据，分开保留；本次只确认最终指纹和既有有限差异，未无故重复原33或将其重标为新hash下全套重跑。晚增阶段已实际重跑4/32/18及nav/adapters和相关语法，读导航原guard/修饰键/四role负例也有独立实证。中枢原生Enter/scroll结果、完整31脚本/41语法统测、UI终评与Git同步归其各自产物，本报告不代替其最终回执。

最终 **APPROVE** 的范围是H23实际actor/policy一致性、精确原版本/异常参考、安全动态表达、其他四role保留，以及新增固定纯读参考跳转的角色/query/焦点/原guard兼容。它不新增个人分派/正式权限、不自动批准、不洗原纸张或业务；没有新增待处理finding。仅更新本文，到此结束本轮owned写入。

## 最终 Review Summary

| Severity | Count | Status |
|---|---:|---|
| CRITICAL | 0 | pass |
| HIGH | 0 | pass |
| MEDIUM | 0 | pass |
| LOW | 0 | pass |

Verdict: **APPROVE** — 最终七文件指纹与已独立审阅/验证的对应阶段一致；没有新增未审差异或待处理finding。
