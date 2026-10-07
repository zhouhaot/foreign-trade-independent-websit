# 第11轮独立综合代码审查

日期：2026-10-07。实施基线：`d9b1748c27102c2631dd6aed9df9e4e3af486d9f`。仅本报告归本 reviewer；源码、Mock、旧测试、其它材料与 Git 操作只读。已读 AGENTS、HANDOFF、H22规划、岗位现实复核和两轮 UI 预案。下文保留首阶段等待冻结的历史记录，最终有限补审与 verdict 见末节；不宣称 UI、推送或整轮完成。

## 首阶段范围与事实

- 实读 staged/unstaged 差异、fin 前后上下文、真实 app 路由匹配及订单/单证详情调用。当前业务差异仅审批台账附近只读 helper 与两表 markup；主管处理动作和收款/金额段，经 CRLF→LF 归一完整比较保持原内容。新脚本不纳入运行入口。
- `Views.approvals` 原主管全量、其他岗位按 applicant/name 的范围、待办顺序、已处理时间排序、6/8列及原计数保留；四业务岗位为 sales 2/2、doc 3/1、fin 0/0、boss 5/3。管理员的实际 app 路由仍拒权，直接调用 Views 不能视为鉴权。
- 关联只按 targetType/targetId 匹配唯一真实对象，单证 type/no/正 safe integer version 与唯一父订单存在均核查。精确旧版本保留，标题/理由不用于猜新版本；原审批 targetAmount 缺失不补。self 分支先于单证处理链接，主管本人申请仅可查阅，不显示处理。
- 所有新增编号、事项、理由、意见、时间、关联说明、href 与 data-id 通过现有 esc 输出；原理由 details 与原意见全文保留。链接是固定站内前缀，未接受外部 href。
- 原 app 不解码路径片段。中枢先发现安全编码真实特殊编号会造成死链及 lone surrogate URIError，worker已补 `approvalRoutableId`：只有 `encodeURIComponent(raw) === raw` 的非空 string 才生成链接，异常捕获后标待核对。此项来源是中枢既有发现，不制造本 reviewer 新问题或声称独立重现旧中间源码。

本阶段读取 fin SHA256：`CE570C4924013327D57550530A57773D6D8F8EA2FD13E411C5D34499F2315234`，仅标捕获阶段，不替未来冻结保证。

## 本 reviewer 实际执行

| 检查 | 实际结果与证据边界 |
| --- | --- |
| verify-approval-context | 67项 PASS；真实 Views 与 app 最小 DOM、范围/排序/次数、唯一/异常目标、姓名自审、完整转义及全 Mock零写；原 Actions/payment源码归一相等 |
| 独立临时路由模型 | 22项 PASS：4岗位原16目标；order/doc各2个安全标点编号；已新增V3情况下原CI3V2在取消申请中/已取消两态仍精确进入原版本。包裹真实 Views 捕获 ctx.params[0] 与 U.doc/U.order 对象引用相等，单证选中按钮 aria-current/data-id 相等；每条完整 Mock 前后相等 |
| verify-approval-modal-drafts | 21项 PASS；原处理意见/current/busy/失败/旧回调隔离（Node DOM） |
| verify-views | 100 role/view PASS，另原订单/单证角色/保存/延迟断言 PASS |
| verify-document-approval-display | 137项 PASS；旧通过姓名/章与当前资格分开，不代表正式签署 |
| verify-repricing / verify-cancellation | 两专用脚本 PASS；原候选原子拒绝、币种/已收、角色、自审及取消/重制/延迟等断言 |
| 语法与差异 | views-fin、新approval-context均 node --check PASS；git diff --check PASS |

独立22项不是只断言“未拒权/未notFound”：实际 router→view 参数、所取对象引用和当前单证选择都核对。两个旧通过/取消例保原 Approved by 文字且 canExport=false；读历史不冒称当前可导出。

方法纠正保留：首次独立安全单引号编号模型用 `innerHTML.includes(rawId)` 匹配已转义 HTML 产生假红，改为实际 DOM 解码正文并保参数/对象/单证选择强断言后22项通过。不是企业业务缺陷。另误调用不存在的 `verify-finance-modal-drafts.cjs` 得 MODULE_NOT_FOUND，随后按真实文件清单运行 `verify-approval-modal-drafts.cjs` 21项通过；未将第一次执行当PASS。

## 首阶段发现与限制

当前新增高置信 finding 为0。未据源字符串证据认领像素、原生 Back/键盘/修饰键、读屏、file协议或正式身份验证。本人范围仍是 Demo 姓名关联，不是后端权限认证；所有写动作仍内存，未推出企业审批/签署/转办/退款制度。未来 CSS 与最终源码变化需有限补审后再作最终 verdict。

## 首阶段 Review Summary

| Severity | Count | Status |
|----------|-------|--------|
| CRITICAL | 0 | pass |
| HIGH | 0 | pass |
| MEDIUM | 0 | pass |
| LOW | 0 | pass |

Verdict: REVIEW IN PROGRESS — 已完成首阶段代码与独立实测，待中枢提供最终源码/CSS冻结差异。

## 冻结后的有限最终补审

中枢明确冻码后，本 reviewer 再次实际读取 staged/unstaged 差异、fin/schema脚本指纹、worker逐项材料和 pages.css 新增14行。实际 SHA256 与中枢给定值一致：

- `js/views-fin.js`：`11D2AB00CF4709A961E73F22E96E8A26511566D4B3B4E38BF0A88BC44C6ECDF6`。
- `scripts/verify-approval-context.cjs`：`9606A66CBA37AEEFEBB0D90CA881732052FB6514F757271D5A476ADE3ADC97E3`。

晚到 markup 仅把有效关联 description 改为“关联订单：”/“关联单证：”前缀，并将原唯一具名查看链接放在同一 `.approval-target` 内，避免对象编号/版本重复占两行。href、唯一对象匹配、版本/父订单核查、原角色过滤及自审分支不变。异常关联仍是完整待核对文字，无链接。新脚本两条同父节点与精确前缀断言在原67组中追加，未移除旧模型/纯读/安全断言或虚增用例数；同一DOM父节点不证明任意宽度下永远一条物理行。

pages.css 仅新增局部 `.approval-*` 规则：事项14px/600、编号与参考13px、间距4px、link/summary最低28px，reason/opinion完整pre-wrap与anywhere折行。已实际回读 base.css：`--text`、`--text-sub`、`--orange` 均已定义；原focus-visible存在，新增规则没有隐藏焦点、裁剪正文/意见、移除details语义、固定页面高度或影响原表格列/业务动作。新增选择器与当前markup对应。此为CSS源码边界审查，实际像素与键盘可达性由中枢/UI评测另证。

最终源码上由本 reviewer 再次实际执行：approval-context **67 PASS**、approval-modal-drafts **21 PASS**、两个owned JS语法 PASS、git diff --check PASS。67脚本再次证明整段审批Actions与视图前payment/金额函数相对基线归一换行后完整相等。首阶段独立22条精确路由模型、其它相邻回归保持原捕获阶段来源，不冒称其全部在晚markup后重跑；关联href/选择逻辑的当前差异未变。

未发现新的高置信正确性、转义、原子性或权限问题。本 reviewer 未操作 CUA，不认领中枢两张1280实图或后续完整路由/终UI测评；主管第5条需要正常纵滚也不被本报告说成全5条首屏。无UI SHIP、Git已推送、后台鉴权或正式审批认证结论。报告写入至此停止。

## Review Summary

| Severity | Count | Status |
|----------|-------|--------|
| CRITICAL | 0 | pass |
| HIGH | 0 | pass |
| MEDIUM | 0 | pass |
| LOW | 0 | pass |

Verdict: APPROVE — 冻结版本的H22只读关联展示与局部CSS通过独立代码复审及必要回归；真实UI和Git验收由对应owner完成。
