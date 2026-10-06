# 第5轮：当前作业区输入与导航契约

基线：`6ffd844c097c82b6e9a4f8655dd7d1cd48aff31a`。共享实现由中枢单写app.js/utils.js与CSS；sales/core、docs/fin由两个worker分文件接入，现实规划、代码和UI独立复审。未增加依赖、存储、后端或角色权限。

## 具体改进

| ID | 原行为 → 新行为 | 实现与证据 |
|---|---|---|
| NAV-01 | 普通全局导航直接重建workspace → 有限作业字段进入时捕获DOM/值基线，恢复原值即干净 | qe-form/pay-form/cust-form、df-*、audit-opinion；只读/禁用与搜索筛选不纳入；navigation初25→31→最终33 |
| NAV-02 | 没有就近输入状态 → 左标题组或既有描述附短状态，不加卡片 | 当前输入未改动/有未提交输入；正常保存969/971，UI初图右侧孤立→两宽终图修正 |
| NAV-03 | 侧栏、业务路径、品牌可绕过单证局部确认 → 同页内部锚点统一requestNavigation | Ctrl/Meta/Shift/Alt、新标签/download保默认且覆盖data-action单证链接，普通_self仍guard；收尾Ctrl-doc RED→GREEN/原生新台账tab与源输入保持，搜索/待办共用 |
| NAV-04 | 放弃窗无对象/可能双确认 → 标报价ID、所选收款订单、客户ID/name、单证no/V；继续填写/放弃明确 | docs局部转交共享guard；放弃修改回本版本只读、okText放弃修改；终图/真实同页场景 |
| NAV-05 | 取消只重绘同值会使提交票据失效 → 完全不重建原作业DOM，保错误/描述和当前字段 | focusin跟踪校验聚焦，不只记最后输入；Node原引用与真实quote token回读 |
| NAV-06 | 确认/关闭焦点或旧滚动回调可拉新页 → modal开/关preventScroll，可选onClose；guard取消在布局帧恢复click-time位置 | generation/hash防已导航或新页面被旧RAF回拉；原生Back46→46、audit122→122，独立RAF模型 |
| NAV-07 | Back后按累计次数猜历史会跳错 → 本会话epoch/相邻index/hash标记，先恢复源条目，取消仍可重复面对同目标 | known Back/Forward实际HTTP通过；Back后新导航按当前位置+1裁Forward；native scrollRestoration manual由render统一滚动 |
| NAV-08 | 恢复未完成时新导航或旧modal OK可裁掉恢复目标 → 两阶段入口及确认回调都短提示等待，不提前clean/push | 独立审查1 MEDIUM，两种延迟顺序红→绿；身份需epoch/index/hash三者，不仅同hash |
| NAV-09 | 直接地址变化立即丢输入 → 未知历史仅replace当前地址保源DOM，确认才内部导航 | 实际finance直接hash取消保URL/金额/备注/错误；明确不保证加载前历史栈，不能猜go方向 |
| NAV-10 | 成功写入仍被当未提交 → 真实commit后markDraftClean，再requestNavigation/rerender | 报价、客户、收款、单证保存/送审/审核接入；失败与取消不清；独立194+15及17adapter |
| NAV-11 | 退出可能套两确认/带旧输入跨身份 → 保留原一次退出确认，成功退出先clean再清身份/临时状态 | 实际dirty退出取消保输入/一modal，五角色session回归；已提交内存仍至刷新 |
| NAV-12 | 刷新/关闭没有未提交提示钩子 → beforeunload在有变化时请求浏览器标准提示 | Node事件条件通过；原生提示未运行，不承诺关闭后的恢复或自动保存 |
| NAV-13 | 弹窗滚动锁隐藏滚动条会改变背景宽度 → html stable gutter保持占位 | 真实DOM背景body宽1272保持；不把CUA定位前46→60误称弹窗漂移，方法修正在总报告/JSON |
| NAV-14 | 非法query编码经新guard先clean后旧decode抛错 → 安全解析与入guard前校验，直接坏hash保源DOM/dirty并废旧票据；初始坏地址安全兜底 | JS专项新增MEDIUM Resolved，navigation31含6相邻；实际坏%/UTF8、旧窗废弃与有效导航、稳定Forward56→56，页头下完整rolealert原因，不依赖短Toast |

## 只保留当前页，不能推导生产能力

H14限定上述五类作业输入；通用业务弹窗、其它页面与跨页草稿恢复未覆盖。H15只在本会话可识别条目上恢复历史位置。未知条目只恢复地址和输入，历史栈可能变化。现有前端身份和对象锁不是服务器事务/权限。beforeunload是否显示由浏览器决定，已提交的内存数据也会随刷新复位。

原生减少动效模式、真实读屏、跨浏览器、刷新/关闭原生提示与file://未运行。保持普通script及本地资源结构，不绕过浏览器策略。完整验证和逐项汇总见round-05.md。
