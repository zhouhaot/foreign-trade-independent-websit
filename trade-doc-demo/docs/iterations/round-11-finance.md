# 第11轮：审批台账关联上下文实施说明

日期：2026-10-07。实施基线：`d9b1748c27102c2631dd6aed9df9e4e3af486d9f`。本文仅记录 fin worker 的局部交付；本轮原生 UI 两轮评审、共享 CSS、整轮 Git 与 HANDOFF 由中枢另行记录，不提前宣称通过或推送。

## 范围与现实假设

本次仅修改 `js/views-fin.js` 的 `Views.approvals` 与邻近纯读展示 helper，新增 `scripts/verify-approval-context.cjs` 和本文。没有修改 Mock、审批 Actions、支付/改价计算、router、shared helper、CSS、原回归脚本或业务资格。

H22 是可撤销的原型查阅假设：员工阅读申请结果时，可按真实唯一关联对象查看订单或申请对应的单证版本。这不新增审批制度、金额政策、身份认证、权限或后端；旧批准结果不承诺当前仍能办理或导出。单证旧版本不会自动切最新，旧 AP20260801 缺少 targetAmount 不补值。撤销此展示方案也不删除申请、理由、意见或快照。

## 每项改进的原因与前后行为

| 项目 | 原行为与原因 | 本次行为及边界 |
|---|---|---|
| 1. 可识别申请 | 标题可能重复，原正文未显示 AP 编号 | 每行显示原申请编号，`data-approval-id` 转义绑定同一申请，方便具体查阅，不造新编号 |
| 2. 真实订单上下文 | 结果区只有标题，销售需手动找订单 | 依据 targetType/targetId 唯一订单对象，显示实际订单编号和次级“查看关联订单 SO...” |
| 3. 确切单证上下文 | 已处理结果没有入口，可能误查新版 | 唯一目标单证须真实 CI/PL 类型、具名 no、正 safe integer version，显示原 no/V，次级“查看申请对应单证 CI/PL... V...”，不解析 title |
| 4. 关联异常可观察 | 缺失或冲突对象仍易被标题误导 | 缺对象、重复对象、未知目标类型、单证类型/编号/版本异常、关联订单缺失/重复均显示“待核对 · 不可定位”；保目标编号、不猜名称、不造查看链接或单证审核处理链接 |
| 5. 历史原理由 | done 表未展示原 reason | 原生 details/summary“原申请理由 · AP...”按条具名展开，完整转义原文；空值明确“未记录”，不造新理由 |
| 6. 完整参考与意见 | 长文本需要在两表内可读 | pending 原理由完整可见，done 原 opinion 完整列保留。局部 `approval-reference/reason/opinion` hooks 供中枢 CSS 折行；源码不裁剪/省略文本，不以历史状态替代当前资格 |
| 7. 主处理和角色边界 | 主管有主处理，其他人仅本人 name 范围 | 原过滤、done 时间逆序、待办顺序、count、空态与 6/8 列不动；查看是次级。主管自己的单证申请也先显示“不能自审”，避免 UI 错给主处理入口；原 Actions 资格与业务判断未改 |
| 8. 安全且当前可达的链接 | 直接拼接 ID 不安全；仅 encode 还会在当前不解码路径的 router 产生死链 | 固定 `#/orders/` 或 `#/documents/` 前缀，编码与 HTML 转义。局部 `approvalRoutableId` 要求 encodeURIComponent(raw)===raw，并捕获孤代理项 URIError；当前不可路由的原始编号保文待核、不提供链接。此为现路由能力约束，非正式编号制度，也不改全局 router |

纯读 helper 位于原审批台账区域，`approvalTarget` 只扫描真实数组，不使用返回首个匹配的 U.order/U.doc 代替唯一性核查。单证关联订单以其原 raw orderId 唯一查找，不要求父订单编号可以作为路由路径，因为单证详情内部本来按原字段查找；申请目标自身路径必须可达。

## 实际先 RED 后 GREEN

新脚本先在未修改 Views 上运行 `--red`：sales AP20260801/AP20260102、doc AP20260101 三条真实历史结果各缺“可读编号 / 原理由 / 精确目标链接”，共九处；全 Mock 保持。默认专项随后因实际行集合 `[]` 与应有四条 sales 行不一致真实失败。`--red` 是保留的旧缺陷探针，修复后正常验收运行默认命令，不把旧缺陷继续存在当成通过。

首版 51 场景 GREEN 后，中枢指出 app 的路径片段未 decodeURIComponent：安全编码后的特殊 ID 仍找不到原对象，且孤代理项会造成 URIError。新增实际反例默认测试先失败 `1 !== 0`（不应发出链接却仍有一条）；临时隔离探针复现 order/doc URIError。最初探针错误地查“未找到”，所以缺记录布尔输出为 false，这不是成功路由证据；已实读真实 notFound 标题“记录不存在”纠正，并用隔离 pre-helper 源码再次证明两类编码链接实际进入“记录不存在”。没有因此修改 router。

最终默认专项 **67 场景 PASS**：

| 场景组 | 实际覆盖 |
|---|---|
| 原五角色与八条申请 | sales 2/2、doc 3/1、fin 0/0、boss 5/3；原管理员本人过滤视图为空，实际 app route 仍拒权。16 次原申请读行核对 + 5 角色，原顺序/编号集/理由/意见/6+8 列/待办 count 保持 |
| 异常关联 17 | 订单/单证缺失与重复、未知 targetType、空 targetId、单证未知 type/空 no、父订单缺失/重复，以及版本 0/-1/小数/字符串/Infinity/越界/null，不造主审核或查看死链 |
| 确切旧版本 4 | 待处理/已通过/已退回/未知结果，目标有新版本且订单已取消时仍引用申请原版本，不改原 canExport 判断 |
| 主管自申请 4 | 四种申请的自身主处理均不可见，合法查看仍保，Actions 不动 |
| 长文与 HTML 4 | 两 targetType × pending/done；长理由/意见、换行与恶意 HTML/属性文本完整转义，原字段/申请编号与单证 no 保原，不生成 img/script/external href |
| 特殊编号 16 | 两 targetType × 空格/中文/斜线/百分号/query/hash/恶意外链样式/孤代理项；只保文待核，无 link/URIError。其中14个可编码文本额外经过实际 app router，确认编码路径当前“记录不存在”，不误称该路径可达 |
| 源码保全 1 | 相对指定基线，原审批 Actions 全尾段、审批视图前的支付与金额函数逐字一致（只归一 CRLF/LF），不因 DOM 展示修改算法 |

每次实际 Views 与关联路由核对全 MOCK JSON 前后不变；所有原八条 AP 保留。正常链接使用真实 app 路由核对四业务角色未拒权/未缺记录。基础 DOM fixture 的 sessionStorage/localStorage 原来均为空桩，所以本脚本仅把 U.currentUser seam 返回当前演示 actor 以触发真实 router；不冒称测试了真实登录存储/正式鉴权。details 内容/语义是 DOM 检查，原生鼠标和键盘展开、两宽布局、读屏须由中枢实际浏览器评审补证。

## 相邻验证与交付状态

实际 exit 0：`verify-approval-modal-drafts.cjs` 21、`verify-payments-contract.cjs` 71、`verify-repricing.cjs`、`verify-cancellation.cjs`、`verify-document-snapshots.cjs`、`verify-views.cjs` 100 角色视图及原动作契约。两个 owned JS 各 `node --check` exit0，`git diff --check` 无空白错误；Git 仅提示现工作副本 LF 将按仓库配置转 CRLF，不是语法/契约失败。

本材料明确新增UI参考行为与原制度区别，不修改审批申请/交易/取消/收款/重制快照。当前交付可供中枢第一轮实图和两名独立代码审查；尚未收到本轮 UI 终审/独立代码结论/Git 回执，不将局部67 Node场景称整轮完成、全键盘/读屏、真实审批并发或生产部署通过。中枢统一追加 HANDOFF，本 worker 不写共享交接文件。

## 首轮 UI 反馈后的有限 markup 打磨：R11-UI-02

中枢转述首轮 UI reviewer 逐读三张主管稳态图的反馈：首版关联描述与查看链接各自占整行，重复显示相同订单编号或单证编号/版本，降低事项扫描效率。上述八项是首版实施记录；本次只改善关联信息层级，不新增对象、列或规则。R11-UI-01 的字号、间距与自然折行 CSS 由中枢独占处理，本 worker 没有修改样式文件，也不替代其真实截图证据。

R11-UI-02 的前后行为：有效关联原来是“关联订单：SO...”再下一行“查看关联订单 SO...”或两行单证 no/V；现在同一 `approval-target` 元素中为“关联订单：查看关联订单 SO...”或“关联单证：查看申请对应单证 CI/PL... V...”，其中后半仍为唯一 `.approval-link`。编号/精确版本只在具名链接显示一次，原事项标题、申请编号、六/八列与业务信息均保留；异常关联完整待核描述保持无链接。真实唯一对象、type/version 校核、固定安全路径与不可路由编号处理不变，仍不解析 title。

专用脚本在原67组中增加同一 parent 与精确“前缀＋链接”断言，首版真实 RED `context prefix and named view link share one target line`，最小 markup 修改后67 GREEN；未删除角色、异常、纯读、HTML安全或旧版断言，也不为两条新增断言虚增场景总数。处理意见保护21场景与两 owned JS 语法复跑 exit0；67专项中的 Actions/payments 与基线完整源码保全继续成立。

本次按中枢授权完成后再冻码，等中枢最终实图评审与 Git 回执。只有关联文字合并结构已验证，不能把同一个DOM父元素证明当成任意宽度下必定一条物理行或原生两轮 UI 已通过。
