# 第12轮UI多视角终审：当前可办理与历史暂停参考

2026-10-07。本代理独占此报告及docs/iterations/round-12-ui-review.md；无运行代码/CSS/Mock/规范/HANDOFF/Git/CUA写入。原生交互由中枢执行，本代理实际逐view_image独立读图并回读对应证据；不替代真读屏或生产权限认证。

## 两轮发现与修正历史

第1轮实际读首3图与旧基线3图：旧首页/提醒3包含已退回历史CI3V1，点击目标已只读；首实现当前2/参考1，首次参考行逐块左堆、按钮贴原因。仅1440代表，当时未SHIP。四卡“版本记录·含历史/导出资格看单证页”已足，无需新增说明卡。

| 编号 | 原发现/归因 | 修正及实际证据 | 最终状态 |
|---|---|---|---|
| R12-UI-01 | 参考行tag/title/status/reason/button竖堆，CTA紧贴原因，次级层次不清 | doc scoped grid 78/minmax(0,1fr)/auto，正文与原因自然折行、次级CTA分离；恢复1440/取消1280/修订1280终图真实可见 | Resolved |
| R12-UI-02 | 两条去处理及查看记录仅动作同名，链接单独读取不易辨对象 | 静态views-core逐读doc-only aria-label由esc真实type/no/V/order summary具名，保可见动作词/原路由/fallback台账；截图不认证实际读屏 | Resolved |
| R12-INT-01 | 中枢原生发现零入口同dashboard hash提前return，展开未关/参考未定位 | 同页关闭并focus真实标题，跨页固定query沿原guard；两最终定位图标题焦点可见、8组报告含相应原生Enter | Resolved |

原未SHIP阶段/失败观察保存在预案与browser-process，不倒改为当时通过。#workspace误选择器的16测量empty workspace是方法错误，过程另存后纠正main.workspace；不重命名成产品bug。首动画未稳捕获拒写并稳定重拍，不把未写图片列已评。

## 16张终图逐读记录

全部为真实JPEG且已逐view_image读取，终图metadata实际DOM1280/1440×1000、opacity1/transformnone；Pillow只读核得1280组1272×994、1440组1432×994。文件像素与CSS视口分别记。

| 终图(.jpg) | DOM宽/scrollY | 实际终评 |
|---|---|---|
| doc-dashboard-restored-final-1440 | 1440/0 | 原取消被退回后当前2/参考1，原独立状态脚注可读 |
| doc-reference-restored-final-1440 | 1440/445 | 原CI4/PL4可办，CI3V1参考1；新分栏和次级查看清楚 |
| doc-bell-restored-final-1440 | 1440/0 | badge/列表2，CI4/PL4对象与版本可辨，bell焦点可见 |
| doc-todo-target-final-1440 | 1440/0 | 精确PL4V1原退回目标可编辑/送审，导出仍disabled |
| doc-cancelled-zero-final-1280 | 1280/0 | SO5已取消当前0，status制作/退回/通过记录保留 |
| doc-bell-zero-final-1280 | 1280/0 | 0项说明与查看参考入口仍见，无全业务完成暗示 |
| doc-reference-cancelled-final-1280 | 1280/661 | 参考3，原V1历史+CI4/PL4暂停完整原因，标题焦点可见 |
| doc-bell-zero-final-1440 | 1440/0 | 取消申请中0项，首页与铃铛数一致 |
| doc-reference-zero-final-1440 | 1440/671 | 同页零入口定位标题，参考3保原版本/暂停理由 |
| doc-reference-cross-final-1440 | 1440/671 | 跨页固定query目标，标题focus/提醒closed，完整参考可见 |
| doc-revision-dashboard-final-1280 | 1280/0 | 原恢复执行且新V3草稿后当前3，制作记录2，不混成取消阶段 |
| doc-revision-reference-final-1280 | 1280/510 | 新CI3V3当前可办；旧CI3V1仍参考并提示最新V3，查看焦点可见 |
| doc-revision-bell-final-1280 | 1280/48 | 当前3具名含CI3V3，不含旧V1；实际滚态不称首屏0 |
| doc-dashboard-baseline-final-1280 | 1280/0 | 最终原基线2/1，卡脚注清楚，A桌面密度保持 |
| doc-reference-baseline-final-1280 | 1280/435 | 当前两条与历史一条主次可辨、按钮未贴原因 |
| doc-history-target-final-1280 | 1280/0 | 确切CI3V1历史退回只读、导出disabled，最新V2为另一个明确入口 |

滚态参考不是全部首屏同时可见；0/2/3及取消/恢复/V3分别来自不同真实会话阶段，不能拼成一个业务时点。历史目标旧退回banner仍为原事实，不将图片证明扩大为完整纸张/全Mock逐字相等。

## 五视角结论与证据分界

- 制单员：主指标/当前列表/铃铛只可办，精确当前版本可辨；原历史退回不再假称去处理，0保可查参考。
- 主管暂停：真实取消申请/通过取消0、原退回取消恢复2有图与原生路径，原status保留，不暗示历史通过全可导出。
- 历史现实：查看记录保原V1，新V3留当前任务、旧版本参考未洗；严格数据/历史相等只引用隔离Node，不称原生全纸认证。
- 键盘认知：代表Enter当前项/零态同页与跨页定位/历史精确链接及Back/V3提醒Escape回bell有原生报告；截图焦点清晰，源码对象名称静态可辨。未实测读屏、Tab全集/所有未提交作业恢复，不从同id认精确节点identity。
- 桌面视觉：1280与1440原布局A保持，参考自然换行/CTA分离、文字不靠颜色独传状态；不为数量压缩字或把全部参考塞首屏。长异常反例、400%/320px、其他浏览器未验。

## 有限验收与最终verdict

回读browser-process最终24JPEG=8过程+16终版，8组真实交互PASS，40独立角色路由组合/80实际两宽布局、failures[]；5role×8相邻route而非全站矩阵。中枢报告console[]。额外新V3路径刷新会复位，不以基线布局替其全部状态认证；原生Back只证返回2/1，不承诺滚动恢复。

已回读两专项最终APPROVE；其bell4/summary32/core18/nav33/独立14等为隔离源码/行为证据，不是本代理执行或原生计数，也不替UI像素。SC1.3.1/4.1.2对象与结构、2.4.4动作目标、2.1.1/2.4.3/2.4.7/2.4.11代表键盘与可见焦点相关要求得到有限设计支持；不宣称完整WCAG2.2AA，SC2.4.13属于AAA。正式身份/个人分派/SLA/后台、持久化并发/签发、未知全部状态、file/跨浏览器、真读屏/语音/开关/运行减少动效与完整模型相等均未验。

**SHIP（限定H23本轮UI与代表原生路径）**。两轮必要布局/动作具名及零态入口问题均Resolved，16终图未见新增必要实现缺陷。停止本轮owned写入，不替中枢Git推送回执。
