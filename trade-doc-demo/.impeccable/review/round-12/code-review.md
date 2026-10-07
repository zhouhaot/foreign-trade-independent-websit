# 第12轮独立综合代码审查

日期2026-10-07，实施基线 `77deae8ae937c0c1d005d4b3b019d5d150e623b8`。本 reviewer 仅读源码/旧测试/规划，独占本报告，不修改实现、Mock、旧脚本、其它材料、HANDOFF或Git。已读AGENTS、交接当前与本轮开工记录、H23现实规划、UI预案及core说明；其它作者仍负责共享、界面、CSS与真实验收。保留下方首阶段未冻结历史，最终补审结论在末节；不认领UI/Git。

## 实际范围与首阶段结论

实读 staged/unstaged diff 及周边原 policy、session、todos、dashboard/topbar调用、真实路由。共享仅新增 `U.documentWorkSummary(user)`、doc待办分支改同源；app仅actual user传入及doc零态；core仅doc状态卡、doc当前作业/参考、有限条件markup。原Mock、原documentPolicy、单证Actions、审批/收款及原导航/弹窗动作未改，不把原入口误导称权限绕过。

- actual actor：helper拒缺user/id/name或非doc，不使用roleUser/姓名合成身份；core明确ctx.user、topbar明确当前user。legacy两参doc待办只用当前会话，显式第三参null/undefined不回落另一个会话。它仍是原型角色/姓名身份，不是后端鉴权。
- 当前可办：只原草稿/制作中/退回候选且原policy.canEdit，同时真实type/no/正safe version、唯一doc及唯一父order、当前router可达原编号成立。原CI3V1旧退回保历史参考，CI4/PL4两项可办；不加maker个人分派规则。
- 受阻参考：保原精确版本/状态与原policy理由。不可唯一定位/不可编码地址无详情link，附核查诊断且保原原因；core只固定台账核查入口。可定位的旧版/取消参考保精确记录，未自动最新，原历史/通过事实和导出资格分开。
- 首页当前列表、指标、铃铛同源；0有历史/暂停说明，未宣称全部完成。原状态卡仍全版本计数，仅明确记录口径，不洗status或history。未知status未作为新制单待办。
- 新core的文书编号、说明、原reason、data-document-id和href均esc；新helper详情地址固定前缀并只允许encodeURIComponent(raw)===raw，lone surrogate捕获。app旧data-link直接拼接在此仅收到上述安全可达ID，不接受外部地址。没有新增非doc页面/权限/写算法。

首阶段新增高置信 finding 为0；当前CSS尚无本轮差异，最终样式与晚markup待冻结补审。

## 本 reviewer 实际独立验证

| 项目 | 实际结果与边界 |
| --- | --- |
| verify-document-work-summary | 32 PASS；实际共享/原policy，身份、缺/重复元数据与编码、版本冲突/旧版原因、整Mock纯读，原sales取消→boss退回恢复2或批准仍0 |
| verify-document-dashboard | 实际18 PASS（任务最早报16，为不同交付阶段）；真实API、doc界面与原状态counts、受控V3/旧版、取消链、invalid身份及其它四role原首页exact |
| 独立真实app临时模型 | 11 PASS，详下；无API模拟代替实现 |
| verify-navigation-drafts / verify-modal-drafts | 33 / 45 PASS，原H14/H20/延迟保护相邻回归；异步Node历史/最小DOM不等原生浏览器认证 |
| verify-document-lifecycle / verify-document-snapshots | 90与快照专用PASS，旧版本/取消/原子操作、snapshot继承与财务隔离等原断言 |
| verify-views | 100 role/view PASS及原报价/订单/单证角色、取消、金额与延迟动作断言 |
| 语法/差异 | utils/app/core与两个新专用脚本5个node --check、git diff --check PASS |

独立11例实际加载app/shared/core/views而非仅读todo数组：

1. 三种doc读态（常态、SO5取消申请中、已取消）：包裹真实summary与policy断言其actor严格等于当前session原对象；core与topbar两次摘要调用均同对象。真实工作台可办行、铃铛dd-item、badge/可访问名计数一致2或0；0保参考说明/固定工作台入口，整Mock读取前后相同。本模型手动设两个取消读态，只证明读入口；正常取消与主管决策Actions由上面32/18脚本实际执行，不将手改状态说成此11例原生业务链。
2. 一例禁止roleUser调用：实际summary及legacy当前session仍可读；第三参显式undefined返回0，清会话后legacy返回0，全Mock不变。验证没有偷偷补另一个演示用户。
3. 三条原目标（当前CI4、PL4、参考CI3V1）经真实app hash handler路由，包裹真实docDetail断ctx.params[0]精确，当前aria-current的doc-item/data-id同记录；每条完整Mock不变。不是仅未拒权/未notFound。
4. 四其它role：用基线完整utils/core/app作为对照、真实当前会话触发dashboard，当前整app header+dashboard HTML与原基线exact；避免只比较新core搭配同一新utils而漏掉共享/铃铛差异。未认领它们原生登录/像素测试。

core材料里的递归DOM正文方法用于最小fixture：parent.textContent不自动包含全部child，测试需递归读正文。该测试方法纠正不当企业故障；本reviewer自己的11例均用递归读取并另保对象/计数强断言。

阶段读取 SHA256（不替未来冻结保证）：utils `1A49E13DEB94447C474ECEBB007221071D40D15890AD56396709C49A402031E3`；app `720F3607A1E97C082A6B4F75487DC95FF98EE31F7D332786ED5EE62CD2709C76`；core `EF868911F6C477A94AFC0F7BDD929AB36FF1E1EBAA34133A3FBF66B7ADF0F971`。

## 限制与下一阶段

所有证据来自源码及隔离Node模型，未操作CUA、未读取本轮实图；不认领原生铃铛键盘/读屏、Back、file协议、像素/跨浏览器、生产身份/后台任务/持久恢复/签署/NAS。参考只原未完成状态候选，不承诺罗列全部已通过/待审核/未知历史；状态卡与具体单证台账另保原事实。缺/重复/异常ID仅隔离模型，不改原样例凑UI。待根中枢最终源码/CSS冻结后有限补审，不扩大本轮范围。

## 首阶段 Review Summary

| Severity | Count | Status |
|----------|-------|--------|
| CRITICAL | 0 | pass |
| HIGH | 0 | pass |
| MEDIUM | 0 | pass |
| LOW | 0 | pass |

Verdict: REVIEW IN PROGRESS — 首阶段无新增finding，必要独立验证通过，等待最终冻结差异。

## 晚到入口与局部样式的最终代码补审

中枢转述实际原生零态CTA首轮RED：同页hash的原requestNavigation直接return，铃铛仍展开且下方参考未定位。中枢新4项专用曾经真实App委托RED后有限改app；该问题由中枢真实观察并实现，不伪称本reviewer独立原生复现或另外新增同根finding。本 reviewer 实际读取当前完整diff、新4脚本、原requestNavigation/dirty逻辑与事件委托：

- doc零态具名anchor现固定 `#/dashboard?focus=doc-work-references`，局部Action只允许App当前doc。同页有真实参考时只关闭铃铛、设标题tabindex=-1、focus preventScroll和section滚动，不重建DOM；跨页仍调用原requestNavigation，继续原H14确认/取消语义。确认前不清业务模型；本轮没有修改其guard接口或历史恢复逻辑。
- render末尾只有精确query.focus时调用角色限定的定位helper；非doc或页面没有参考heading不定位。没有新增ROUTES、权限或从query构造任意selector/href。原dirty表单离开仍待确认，未知/非法地址及原modal保护不被这个读导航绕开。
- 原事件委托在含data-action的内部anchor之前先判断Ctrl/Meta/Alt/Shift、target非_self/download并留浏览器默认；新anchor沿此路径，不把另开目标变当前页丢草稿。以下为Node事件seam证据，未声称实际创建新tab。
- core晚改仅doc按钮aria-label含可见动作词＋真实type/no/version/order文本，包含null-link台账核查；均esc，原非doc按钮markup不变。新增script在原18组保留原断言并核实际aria名称与可见文本，未因ARIA断言虚增用例数。
- pages.css新增13行仅doc参考row 78px/minmax(0,1fr)/auto三栏、正文14px、完整reason pre-wrap/anywhere、中性空态图标及96px scroll margin。base中border/text-sub/surface-subtle均已有；body min-width=0允许折行，无删除/裁理由、无固定页面高度、无隐藏焦点。margin不是实际滚动位置证明，三栏不等任意宽度像素认证。

## 最终本 reviewer 实际复验

实际当前代码运行：**bell4、summary32、dashboard18、navigation33全部PASS**，三个生产JS＋三个新CJS共**6语法PASS**，git diff --check PASS。4项中前2是实际同页/跨页委托；后2是直接注册Action触发真实dirty取消/确认，不谎称可编辑时出现零态链接。原df-marks内联控件没有虚构doc-form，确认需Promise flush；脚本纠正来源/方法与实际滚动未验边界已读。

另独立临时真实App **14项PASS**：6种Ctrl/Meta/Alt/Shift/target_blank/download，保浏览器默认、不取消事件、源hash/工作区/展开状态保持、无guard/全Mock不写；4非doc角色持focus query调用Action，无参考/无导航/模型不写；同页真实heading focus参数preventScroll与scrollIntoView block:start各一次且原workspace保持；doc非dashboard同query不定位，doc管理员路由仍拒权；原requestNavigation函数与原documentPolicy函数分别相对基线归一换行完整相等。API参数spy只证明实际调用，不证明原生视觉滚动。

自建14项首次把anchor target='_blank'错误放入模拟event.target，覆盖真实Node造成closest TypeError。纠正为设置anchor属性、事件仅传modifier，原强断言保留后14项PASS；这是测试方法错误，未改生产代码，不把它报企业故障。

首阶段11独立模型及90/100/45等相邻回归保原阶段来源，不假称全部晚到代码后重跑。当前utils与首阶段hash相同；query/action晚改的导航路径由新的4/14及当前33复验。当前捕获指纹：

| 文件 | SHA256 |
| --- | --- |
| utils | `1A49E13DEB94447C474ECEBB007221071D40D15890AD56396709C49A402031E3` |
| app | `43E47204016DE21B3DD96A6F0CD11451622DF268D6109037B2E866FF7076A864` |
| core | `F6EA1ABB77BBAE195442A43E2ED152F2CB693CB1EEC22A066A32BCF5F724048B` |
| pages.css | `FE2FB46E60737DBEFFCA97D62506CED5DBC195EB7B1AC9A9780421BF5A10DA1B` |
| dashboard脚本 | `AC8A436E5D523371FC687C7D790559227BF2DF8B8FCF5172991DEDA8038230D6` |
| bell脚本 | `DC3AF0D3DCAE46A792AA801AB40BB535C802AC7466DFAEC27D795B4C1AE0134A` |

没有新增高置信finding。当前reviewed代码可APPROVE；中枢尚在实际UI测试，如再有必要源码/CSS小修，只能对新差异另有限复审，以上指纹不替未来版本背书。本 reviewer 未操作CUA/看终图，不认领中枢原生RED/修后实测、全31Node/41语法统一日志、UI SHIP或Git完成。报告写入至此停止。

## Review Summary

| Severity | Count | Status |
|----------|-------|--------|
| CRITICAL | 0 | pass |
| HIGH | 0 | pass |
| MEDIUM | 0 | pass |
| LOW | 0 | pass |

Verdict: APPROVE — 当前H23共享/首页/铃铛与局部CSS代码通过独立补审；原生UI与推送结论由对应owner完成。
