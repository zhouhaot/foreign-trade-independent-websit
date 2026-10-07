# 第11轮独立 JavaScript / 安全复审

日期：2026-10-07。最终有限代码结论：**APPROVE**。没有新增待处理的 CRITICAL/HIGH/MEDIUM/LOW finding。结论对应下面实际重读的冻结 JS、新脚本及相关 CSS；不认领原生 UI、像素布局、读屏、正式权限或 Git 同步。

## 范围与方法

实施基线 `d9b1748c27102c2631dd6aed9df9e4e3af486d9f`。按本地 git diff 检查 `js/views-fin.js` 的 Views.approvals 与三个邻近纯读 helper、新 verify-approval-context；关联读取固定 router、真实 orderDetail/docDetail、U.esc/tag 与原数据源；有限读 CSS14行的层级/折行选择器。

阅读 AGENTS/HANDOFF、本轮 planning/finance/context-reality 材料和最终实际 diff。普通 JS 静态项目没有 package.json/tsconfig/ESLint 配置，当前命令环境也未找到 eslint；TypeScript 检查不适用，ESLint 未执行。fin和新增脚本 node --check 实际通过，git diff --check exit0；未找到配置的 rg/Get-Command 状态不计为产品失败。本次是本地工作区复审，没有声称核验 PR CI/merge readiness。

本代理只读源码/测试并经 stdin 运行独立隔离 Node。唯一写入本文，不改源码、脚本、Mock、其他材料、治理、CUA 或 Git；不撤销其他代理改动，HANDOFF由中枢统一更新。

## 安全与正确性判断

- 新增所有动态申请编号、标题、理由、意见、关联描述/label、人员和时间均通过 U.esc，data-approval-id与待处理按钮data-id也转义；类型/状态标签由原 U.tag 内部转义。固定路径只选 `#/orders/` 或 `#/documents/`，不从title/外部href猜地址。
- approvalTarget核实际数组中的唯一匹配。单证须真实CI/PL、具名no、正safe integer版本和唯一父订单；按申请targetId进入精确原对象，不自动最新、不根据重制理由中的V2替换原V1。缺失/重复/未知目标或版本 metadata 仅保文待核，不造查看/单证审核处理死链。
- 现app路径段不解码，因此仅encode不足以保证到达原ID。局部 approvalRoutableId以encodeURIComponent(raw)===raw匹配现路由能力，捕获孤代理项URIError；不可路由编号不被改写，保原文而不发链接。此为路由技术能力，未新增企业编号制度。安全标点仍可路由，独立真实路径证明见下。
- 父订单只需原raw orderId真实唯一；目标单证本身可路由即可查阅，不擅自增加父订单编号必须符合某个业务格式的条件。其当前资格仍由原documentPolicy决定。
- 主管全部、其他业务岗原本人name过滤，pending原顺序、done时间逆序、counts/空态与6/8列保持；admin实际审批路由仍拒权。主管自身单证申请先展示不能自审、仍可次级查看，原Actions权限再次约束未改。
- Views只映射/过滤/排序新的结果数组，不写旧申请/目标/理由/意见/金额/历史。纯查阅链接不调用审批或收款动作。Actions整后缀与支付/数值整前缀按指定基线仅归一CRLF后精确保留，专用脚本实际断言通过；本轮Mock/utils/app/sales/docs/index差异为空。
- 最终关联描述仅前缀，唯一具名link与其同一个parent，移除首版重复编号/版本。原理由/完整意见仍保留，CSS pre-wrap/anywhere不从源码截文；同parent不是任意宽度必定一条物理行的证明。CSS事项14px/600、编号13px/4px间距与link最小28px仅局部显示，无JS/算法变化；实际布局归中枢。

## 本代理独立44场景：实际路由与对象、纸面强对照

自行编写、经stdin执行，未保存或修改项目脚本。fixture加载真实sales/docs/fin/app/utils与原Mock；只把U.currentUser seam返回现演示actor，使实际app路由可运行。history:true使用最小DOM历史模型，没有替换router、Views或Actions为成功桩。

**34条可达链接均实际点击审批行 `.approval-link`，经过真实App点击委托→requestNavigation→history模型→render→原目标Views**。包裹原Views捕获ctx.params[0]和U.order/U.doc所取对象引用，同时仍调用原renderer；不仅断言没有拒权/没有notFound。实际目标workspace完整HTML必须与指定对象的原renderer输出逐字一致，覆盖整张纸面；单证额外核aria-current的选中data-id为原target.id、标题原no与paper节点。前后完整MOCK JSON不变。

| 独立组 | 场景数 | 实际证据 |
|---|---:|---|
| 四业务岗位原申请目标 | 16 | sales4/doc4/fin0/boss8，按原本人/主管集合的每个链接进入精确对象，完整目标body/单证纸面强匹配，零业务写入 |
| 当前可路由安全标点 | 16 | order/doc各8个ID：SAFE-._~、SAFE!、SAFE'、SAFE(、SAFE)、SAFE*、SAFE123、..；均经过实际委托与router，param和object严格匹配，不误加“只能字母数字”的编号制度 |
| 旧V2与新V3、取消两态 | 2 | 原AP20260101目标CI3V2，隔离添加V3并分别设父订单取消申请中/已取消；实际仍进入同一原V2对象/选中按钮/完整body及纸面，原canExport=false，不洗历史 |
| 不可路由原ID | 6 | order/doc各空格、中文、孤代理项；实际审批路由视图不崩，保原编号/待核，无查看链接。专用67另有14条实际encoded路径不存在的对照，不把encoded字符串当可达 |
| 父订单缺失/重复 | 2 | 单证关联唯一性不满足时没有查看入口，实际审批View全MOCK零写 |
| 长HTML与属性原文 | 2 | pending/done中申请id/title/reason/opinion/applicant/handler/time设相同恶意HTML及重复500次的长文本，DOM不生成img/script，data-id解码精确保原值、完整正文可取，全MOCK零写 |

终端实际输出：`PASS independent JavaScript/security: 44 ...`，exit0。其中34为真正可达链接的强对照，其余10为拒绝/安全视图，未把44全部说成成功导航。

程序更名目标/添加版本/输入恶意文本只在隔离VM，比较基线在测试施加变化后；不改Mock源码或用户业务，不冒作浏览器原生history、点击/Back、实际身份登录或恶意服务输入认证。原整纸字符串对照说明当前renderer选了准确对象，不能替代正式PDF/签署或像素验收。

## 最终实际回归与阶段

首次独立读取fin即为最终helper/单parent合并版本；未把首版51或unsafe修复、两assert RED认领为本代理发现。worker材料保原51→67、root不decode/孤代理项发现、markup两assert先RED后67；本代理是在最终67和下述指纹上独立读取、验证。

收到中枢冻码通知后，重新读完整最终fin/CSS diff与实际hash。fin/script指纹和独立44场景运行时一致；以下9项脚本在该冻结版本实际执行exit0：

| 脚本 | 实际结果 |
|---|---|
| verify-approval-context | 67 PASS，五角色原集合/顺序/counts、17异常metadata、原版本、主管自审、HTML/特殊ID、全部MOCK纯读及原Actions/payment源码保全 |
| verify-approval-modal-drafts | 21 PASS |
| verify-payments-contract | 71 PASS |
| verify-repricing | PASS |
| verify-cancellation | PASS |
| verify-document-snapshots | PASS |
| verify-document-approval-display | 137 PASS |
| verify-views | 100岗位/视图及原核心动作 PASS |
| verify-context-navigation | 194来源/岗位链接+15集成 PASS |

未重复认领worker验证数字为自己的独立场景，44与上述脚本粒度不合并。未扩大已通过测试或改旧断言。本代理尚未执行原生UI；中枢1280主管第五条需要纵滚之类事实归中枢，不由零横向溢出推成全部待办都在首屏。

## 实际冻结指纹

| 文件 | SHA-256 |
|---|---|
| js/views-fin.js | 11D2AB00CF4709A961E73F22E96E8A26511566D4B3B4E38BF0A88BC44C6ECDF6 |
| scripts/verify-approval-context.cjs | 9606A66CBA37AEEFEBB0D90CA881732052FB6514F757271D5A476ADE3ADC97E3 |
| css/pages.css | 70146919E13D032E055CF87116F460BABECB8FF8EFEF2DB03853F23B55947CD8 |
| js/utils.js | 29BBDB784CD8B0011D3DF0A060B52759241E79757BED0CECCD9A89511CE9D6DF |
| js/app.js | 04BF6665B37D40DE2B4DE639DB2617B37FF3545C5EA66C737499EEB4EE80F3FF |
| js/mock-data.js | E1CA2E493C8535A67E9939D38A4933BAB65CA82742E41C4B1B7117944B165318 |

如后续源码/CSS再变，应按真实差异补审。此有限JS安全审查不认证原生键盘/Back/修饰键/屏幕尺寸/scroll、读屏、跨浏览器、file://、后端事务/行级权限、审批制度、正式签署/PDF、NAS或Git远端同步。本人范围仍是原Demo姓名关系，不是企业真实权限。

## Review Summary

| Severity | Count | Status |
|---|---:|---|
| CRITICAL | 0 | pass |
| HIGH | 0 | pass |
| MEDIUM | 0 | pass |
| LOW | 0 | pass |

Verdict: **APPROVE** — 当前冻结指纹下纯读展示、动态转义、真实唯一目标与精确版本路由通过；无新增待处理finding。
