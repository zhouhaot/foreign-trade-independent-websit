# 第5轮：保留当前作业输入，抵达有权访问的下一步

2026-10-07；开工基线`6ffd844c097c82b6e9a4f8655dd7d1cd48aff31a`。维持A珍珠白/鸢尾紫/薄荷青，无后端、构建或运行时外部依赖。用户持续多agent、逐轮文字/复盘/GitHub授权有效。

现实规划只读发现：全局hash重绘会清报价/收款/单证输入，收款历史分页也重建登记form；多个岗位得到无权客户/报价/询盘或商品列表链接，主管已允许的三个查询入口却不在主导航。中枢实现共享导航/基线，sales/core与docs/fin分文件worker协作；独立综合代码、JavaScript专项和UI多视角评测。

## 逐项改进

| ID | 原因与前后行为 | 文件/材料 | 验证 |
|---|---|---|---|
| R05-01 | 页面输入没有明确基线；有限实际作业区按DOM/当前值比较，恢复原值不误拦 | app.js、round-05-navigation.md NAV01/H14 | navigation初25→31→最终33；报价/财务/客户/审核实际取消场景 |
| R05-02 | 状态不明；短句说明未改/未提交，初图页头第3项挤操作→最终左标题组、右操作不移 | pages/app、DESIGN及UI报告 | 两宽报价保存969/971；16终图逐图审 |
| R05-03 | 侧栏/路径/品牌绕过局部保护；同页内部锚点共用一次放弃选择，组合键另开保持浏览器默认 | app委托/requestNavigation | 三类入口真实取消留输入；当前route不拦、Ctrl-doc data-action例外收尾修正/原生台账newtab和源hash/marks/dirty保持 |
| R05-04 | 搜索/待办直接改hash；结果转统一guard | app search-goto/bell-goto | 实际搜索Enter/待办取消仍原Q4编辑，不多套确认 |
| R05-05 | 局部单证与全局两套机制；转统一guard，放弃修改具体no/V且仅回本版本只读 | docs、round-05-draft-adapters.md | actualglobal取消/同页取消/无变化不弹、17adapter |
| R05-06 | 放弃提示泛化；报价/订单/客户编号名/单证版本明确，继续填写与放弃区分 | app draftContext/U.confirm cancelText | Q4、实际SO3、C001、CI4V1与审核CI1终图 |
| R05-07 | 重建同值表单会失效引用；取消保原DOM/错误/ARIA/输入 | app基线、旧workspace fixture补真实render基线 | Node原引用、quote token不变、finance错误desc保留 |
| R05-08 | 返回只记最后输入/关闭后滚动可能失位；focusin记实际当前字段，关闭RAF按源generation/hash恢复 | utils/app、NAV06 | nativeBack46→46/audit122→122、独立旧帧不拉新页模型 |
| R05-09 | Back/Forward或累计索引无法正确取消；已知会话标epoch/相邻index/hash先恢复源位置 | app历史两阶段/manual scroll | native重复Back/Forward取消/确认、Node分支/同hash不同index |
| R05-10 | 恢复中可裁掉目标并永久pending；入口与既有modal OK两处等待锁、三维匹配 | app、code-review.md | 1 MEDIUM两种延迟顺序红→绿，历史保留Resolved；不称原生已复现该压力 |
| R05-11 | 直接改地址会丢输入；未知条目保源DOM/恢复地址，不猜方向 | app unknown fallback/H15 | 实际financial直接hash取消字段/hash/error一致；不承诺历史完整 |
| R05-12 | 成功写入仍可能误拦；真实commit后才clean→统一导航或同页刷新，失败不清 | sales/core/docs/fin、两个worker材料 | context194+15、adapter17、原报价103/收款71保留；实际成功链 |
| R05-13 | 退出可能与草稿守卫叠确认；沿用原一次退出、确认清身份与未提交状态 | app/logout | dirty取消一modal/留输入，session五角色回归 |
| R05-14 | 刷新/关闭没有提示条件；beforeunload请求标准提示，非保存 | app/H14说明 | Node事件有变/无变条件通过，原生提示NOT_RUN |
| R05-15 | finance历史翻页重绘整workspace；只更新记录表格/分页，保业务form/错误/焦点/当前对象 | views-fin、adapter材料 | 真实1.005/备注/订单/币种/描述保留，Node提交排队翻页不失效 |
| R05-16 | 真实末页短导致页面高度夹scroll；局部区域保已访问height | fin minHeight、root追加adapter几何桩 | 实际430.84375→165.14红灯，修后末页仍430.84375；17th断言，非固定全页留白 |
| R05-17 | boss待确认列表给编辑、非sales上下文链接无权；按既有ROUTES改为可读信息或合法去向 | sales/core、round-05-context.md | 194岗位/来源组合每href核ROUTES；真实fin无无权来源/boss0edit |
| R05-18 | 商品固定返无权products；调用带明确order，确认含本商品才返该单items，否则合法列表/解释 | sales产品link/core detail | 实际fin P001?order=SO1→SO1 items；不猜历史，不扩商品列表权限 |
| R05-19 | 主管允许但不可达的查询缺菜单；补询盘/报价/收款只读叶子 | app MENUS，仅按已有route | 实际8叶子≤708.38/1000，boss报价0edit、收款无form |
| R05-20 | 弹窗锁滚动条背景宽变化；stable gutter/开关焦点preventScroll，取消位置据真实触发基线 | base/utils/app | DOMbody1272保持；工具定位偏移单独纠正、不假称操作前原scroll不变 |
| R05-21 | 单次理论或截图不足；任务/披露先计划，首图→修正→16终图，代码压力/实际原生历史分开 | planning/UI计划与review/browser/Node材料 | 18脚本、200实际布局、27交互、26图计数一致，多视角复盘留存 |
| R05-22 | 非法query编码在新guard确认路径中先clean再让旧decode抛错；现在先验可解析目标、坏hash保源/dirty并废旧票据，初始安全兜底 | app safeparse/preflight/notice、javascript-review.md | 新独立MEDIUM Resolved/31脚本6补例/4真实补验/完整rolealert终图 |

## 假设、任务层级与真实范围

H14保护报价编辑、收款登记、客户资料、单证包装/备注、主管审核意见，按进入或成功提交基线比较；其它表单/通用业务弹窗和跨页恢复未做。H15可识别本会话历史条目才恢复原位置；未知条目replace当前地址，仅保输入与URL，不承诺原历史栈。H12小数数量/精确到分、H13取消两态暂停新增收款及旧快照/角色规则继续有效。

主任务是完成当前资料/报价/收款/包装/意见；短状态与对象常显，右侧保主要动作；来源、合法返回为次任务；搜索/待办/规则为参考。继续填写回当前/最近作业字段，无可用字段才原触发；不以保存同值重建冒充保节点。成功提交才清状态，不是自动保存、数据库、服务器身份或事务认证。

## 打磨、独立审查与方法纠正

首图中报价状态孤立最右、返回居中，改左标题组后正常主动作仍969/971；客户范围与焦点策略材料统一；单证放弃title具体type/no/V，按钮仍放弃修改，回只读不误称离开。16终图由独立UI agent逐view_image，业务员/财务/单证员/主管/键盘与认知视角复审。

综合代码1 MEDIUM：历史恢复排队时，新内部导航或旧modal OK可push裁掉恢复条目并留下pending。入口锁＋onOk重查，两种延迟顺序独立红→绿；epoch/index/hash同时匹配，同hash其它条目不能提前完成。原生Back/Forward取消/确认另实测通过，压力复现只属于可控事件模型。JavaScript专项另1 MEDIUM：旧parser非法编码通过新先clean路径造成状态失配，来源与新交互归因分别保留。safeparse/入guard前校验/坏hash废票据但不clean、初始安全fallback已独立复验，无unhandledRejection；页头下持续完整rolealert原因只插notice、不重建字段，正常页不变。两报告最终APPROVE，各自初审/Resolved历史保留，不合并抹掉评级。

真实finance末页减少记录使已显示区域430.84缩165.14；保局部已访问高度后两页同430.84，form/值/错误/描述保留、分页焦点回当前页。实际初始7条末页1条，Node受控fixture8条末页2条，不能互相当真实数据计数。

方法纠正保原观测：CUA点击侧栏前会主动定位滚动，例如46→60；guard真正捕获click-time60，取消也60，不是弹窗移位。focusin已修正返回校验当前字段。首轮普通图scroll46/save923只作过程图；报价/单证最终常态明确scroll0。审核成功纸张不是全HTML逐字相同：仅Approved by从待审核变周建国，按该预期替换后其它交易HTMLexact相同；取消审核离开则全纸exact相同。

最初端口8000 reload曾载旧CSS，CSSOM无新规则但独立HTTP返回新源；改用8001 loopback/no-store静态测试服务验证当前资产，非增加业务后端。搜索结果是role=option，首次按button定位失败未计PASS，最终输入Enter真实验证。Readonly evaluate不支持native history对象的一次读取未当运行错误或通过；原生Back/Forward使用受支持接口操作并以DOM结果验。

地址补验阶段一次刚进入编辑页就在动画未稳时填写/Forward，scroll59→56未达到比较条件，留initialObservations且不计PASS；新建已知历史链、workspace opacity1后重测，sourceScroll56/取消56且hash/token/值/focus完全一致。短Toast没拍到的旧图不假称有反馈；最终补完整常显原因图，异常态scroll56/保存973，只说当时可见，不当正常首屏0。

收尾对照组合键契约，普通anchor已放行但带data-action单证链接仍本地preventDefault；补统一internal anchor先判另开/组合键/download，普通_self仍当前页guard。两个Node例RED→GREEN，总导航33；实际Ctrl打开新台账tab，回读单证员/单证管理/无forbidden且源marks/hash/dirty不变、无modal，再关闭本次临时tab。其它组合键只有Node/代码覆盖，不冒称全已原生测，另页独立Mock不共享未提交草稿。无CSS/正常像素变化，不重复拍16图。

## 实际验证与证据

- 18组Node全部exit0；新增navigation初25→31→最终33、context194+15、adapter17，原报价103、收款71、单证lifecycle90及其它回归保留。全运行/验收JS语法、diff-check通过，最终日志node-verification.json。新历史桩可控延迟验证逻辑，不认证原生历史。
- 真实HTTP五角色×20页面×1280/1440×1000=200实际布局/权限，100独立role-route，0fail，采集console空。27组交互PASS，包括global入口取消、nativeBack/Forward/未知hash、finance分页/一次1USD登记、quote保存/客户保护、doc保存/审核意见取消与批准、合法商品返回、boss只读及无变化不确认；末5组为非法%/UTF8旧窗/持续原因与稳定历史、Ctrl单证另开补验。200矩阵在safeparse相邻修前完成，正常角色/布局路径没变化，新增异常/修复后历史与Ctrl另测，没有冒称重跑200。
- 成功报价备注/收款1USD/单证草稿与批准链在刷新前；矩阵与终图刷新还原样例。1440fin终图实际选SO3EUR尚未提交、URL仍原SO1查询；提示/guard按实际选择SO3，成功链才将URL绑定真实所选订单，非登记漂移。
- 26张PNG=10过程＋16终版，browser JSON images/stage/summary与磁盘一致。常态保存969/971、登记776/672、doc保存622/469均scroll0；boss审核574。doc放弃图scroll275/保存347只是当时可见，不当首屏0。16终图逐图复审，规范/sidecar保schema2/10examples。
- file://、跨浏览器/旧浏览器、真实读屏、原生刷新/关闭beforeunload提示、运行时减少动效模式、打印/PDF/银行/NAS/真实身份与后端事务均未运行或未认证。CSS减少动效规则及Node钩子存在不等于这些原生测试通过。

## 复盘、下一轮与GitHub

先让不同岗位看清当前对象与合法下一步，再保护真实作业DOM；历史索引与无权链接必须按证据修，不能扩权限填断路。短状态不抢主任务，错误全文/字段描述继续保留。

现实规划下一轮优先询盘生成报价与客户资料完整候选/来源/身份绑定，继续业务员作业区UI打磨。包装数量/单位与带KGS/CBM的既有字段另轮处理，不推翻H12小数数量。没有未提交输入损失不代表上游写操作契约已全部安全。

全部最终复核后正常快进提交/推送main，并独立ls-remote核对完整SHA；实际回执另追加，不预写成功同步。

### 第5轮GitHub推送回执

- 实现提交：`a16ed3dc1e5c0340a7aa4de1cc7b6e508a2e868e`，56文件、22项编号改进。
- GitHub：[第5轮实现与详细提交说明](https://github.com/zhouhaot/foreign-trade-independent-websit/commit/a16ed3dc1e5c0340a7aa4de1cc7b6e508a2e868e)。
- 推送前fetch/HEAD与origin-main为0/0；正常快进push main成功，独立ls-remote回读refs/heads/main完整SHA与本地一致，工作区干净。
- 包含最终18组Node（navigation33/context194+15/adapter17）、27真实交互、200实际两宽布局、16终图与独立APPROVE/SHIP/审计8-1-0。回执另作文字提交，下一轮按持续授权推进。
