# 第 5 轮：岗位链接与显式来源上下文

2026-10-07。本轮起点 `6ffd844c097c82b6e9a4f8655dd7d1cd48aff31a`。本子任务负责 `js/views-sales.js`、`js/views-core.js`、新 `scripts/verify-context-navigation.cjs` 与本说明；中枢负责统一草稿基线/导航 API、CSS、HANDOFF、整合和 Git。没有改路由权限、金额工具、单证/财务文件或持久化方式。

## 逐项改进

| ID | 原因与前后行为 | 文件与证据 |
|---|---|---|
| R05-C01 | 主管报价列表对待确认报价展示“编辑”，点击进入 sales 专属编辑路由后被拒绝。现在只有 sales 看到该入口，主管仍能查看报价详情与已关联订单 | `views-sales.js` quotes；专用先 RED 后 GREEN，检查所有可见 href 都符合当前 `app.js` ROUTES |
| R05-C02 | 主管可看询盘/报价但无客户管理权限，详情的客户链接导向无权页。现在 sales 保留客户档案链接，主管看到原客户名称只读；报价/询盘来源不丢失 | `views-sales.js` inquiryDetail/quoteDetail；sales/boss 两种合法视角与全部样例引用目标检查 |
| R05-C03 | 单证/财务订单表格、订单头部和概况都链接报价、询盘或客户，无权后需自己找回。现在 doc/fin 的报价/询盘编号只读，boss 报价/询盘仍可访问；所有非 sales 客户名称只读。销售原流程保持 | `views-sales.js` orders/orderDetail/orderTabBody；四业务角色×七订单×六页签实际 HTML 目标检查，客户名称/来源报价编号仍存在 |
| R05-C04 | 所有角色商品详情固定“返回列表”到 sales 专属商品台账。现在来自订单商品明细的链接显式带 `?order=订单ID`；商品详情只有该订单唯一存在且确实包含本商品时，展示来源并返回该订单 `?tab=items` | `views-sales.js` 商品调用点、`views-core.js` productDetail；四角色来源订单往返目标断言 |
| R05-C05 | 直接访问或伪造来源参数可能误称来自最近订单。现在不猜历史：无来源时 sales 返回商品列表，doc/fin/boss 返回自己可访问的订单列表；缺失/与本商品无关/无效来源参数说明“来源订单无法核对”，不声称它是已确认来源 | `views-core.js` productDetail；MISSING、SO2026005（不含 P001）、含 query 的无效 ID 各四角色回退检查。参数只支持本轮明确的 order，不扩询盘/报价历史猜测 |
| R05-C06 | 中枢统一离开保护若仍拿保存前基线判断，实际保存后正常导航可能被误判未提交。现在报价保存、客户确认、生成订单及客户保存只在真实业务写成功后调用 `App.markDraftClean()`，发生在关闭/导航/重建前。报价保存/生成 clean 后优先 `App.requestNavigation(destination)`，旧桩无 API 时兼容原 hash；校验失败、上下文漂移、取消不 clean 或导航 | 两源码成功点，API 存在时调用；15 组成功/失败集成精确核对调用次序。共享 API 本身及全局离开行为由中枢独立负责与测试 |

## 权限、来源与范围

这些改进只移除当前岗位实际不能使用的链接，不扩大 ROUTES。只读不等于删除业务事实：客户名称、报价编号、询盘编号和金额仍作为原订单来源文字。产品详情深层路由原本允许四个业务角色，本轮保留这一权限，修其返回入口。

来源是明确 URL 参数，须与当前商品及唯一订单关联一致；只用于接续上下文，不是权限令牌、后端鉴权或历史审计证据。有效来源可返回原订单商品页，不把点击其它成交记录误称原来源，也不根据“最近打开过”反推来源。

`markDraftClean` 调用仅说明成功后的表单基线需要刷新；失败必须保留输入与 dirty。本子任务没有另建持久草稿、自动保存或局部注册器。中枢统一选择器基线、`requestNavigation` 和 `confirmDiscard` 是另一个任务，不把本脚本的 clean spy 当全局导航 guard 证明。

金额/报价提交契约保持第 4 轮要求；103 组专用继续通过。原客户编辑仍采用已有必填校验/内存保存流程，本步没有将其扩展为服务端身份/版本事务或放宽现有校验。无后端、依赖、部署或 Git 操作，刷新仍恢复样例。

## 独立执行的验证

- 新 `node scripts/verify-context-navigation.cjs`：**194 组岗位链接/来源组合 + 15 组成功 clean/失败保留 dirty 集成 PASS**。从当前实际 `app.js` 的 ROUTES 声明读取允许角色，以真实视图 HTML 的所有 href 检查目标可达；不是只断言模板字串改了。
- 15 组使用实际 customer/quote submit 监听、真实 U.openModal/U.confirm/U.withLoading 与 Promise/最小 DOM。成功 clean 在业务数据已变更之后、hash/rerender 之前；有 requestNavigation 时 clean→navigate 顺序正确，无 API 的旧桩保留 hash；失败两个 API 均不调用。重复保存只一次 clean，确认/生成取消或有效内容漂移没有 clean。customer 必填失败没有写入也没有 clean。
- `verify-quotation-contract.cjs` 的 103 组 PASS；`verify-views.cjs` 100 角色视图及旧报价/单证相邻检查 PASS；`verify-order-workspace.cjs` 选择/分页/筛选/角色动作/金额/数据不变 PASS。
- 两个改动源码及新增脚本 `node --check` PASS；`git diff --check` PASS，仅 Git 常规 LF/CRLF 提示。

这里都是本子 agent 的 Node/HTML 证据，无真实浏览器点击或截图。中枢另行验实际岗位往返/全局离开、键盘/两宽 UI 与独立 reviewer；未验证 file://、读屏、跨浏览器、后端/NAS 或生产身份。

## 复盘与后续

路由拒绝不能替代页面提供正确入口。允许看到交易名称/编号，也不意味着允许进入对应主数据模块；文字上下文与可点击权限应分开。返回行为同样要与岗位权限和明确来源相符，无法核对时给可访问列表，避免猜一条历史记录。

下一步由中枢审阅实际图、统一导航保护及可见入口回读，独立 reviewer 检查链接/来源与 clean 成功时机；没有提前宣称整轮完成或 GitHub 已同步。
