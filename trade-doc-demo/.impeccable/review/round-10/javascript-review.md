# 第10轮独立 JavaScript 专项复审

日期：2026-10-07。当前代码结论：**APPROVE**，没有新增待处理的 CRITICAL/HIGH/MEDIUM/LOW finding。结论对应本文实际读取的源码指纹与有限 Node 行为，后续 hint 文案如有调整，另按真实 diff 补审；不宣称整轮 UI、原生输入、读屏、后端或 Git 已完成。

## 范围与检查方法

实施基线 `4e71de03c980fdd15b25bfdce699512ee8111fc5`。以本地 git diff 建立范围：仅 `js/views-sales.js` 的 OC 金额输入提示、取消类型清理金额错误、初始金额候选；新增 `scripts/verify-change-request-amount.cjs`。阅读 AGENTS、HANDOFF、第10轮规划/销售/财务复核材料、现成 decimalInput、fieldError/clearErrors、H20 源/节点/raw/actor/锁与延迟关闭代码，以及原主管 prepareRepricing。

这是无构建普通 JS 静态前端，没有 package.json/tsconfig/ESLint 配置，当前命令环境也未发现 eslint；TypeScript 检查不适用，ESLint 未执行。修改的运行 JS 与新增脚本实际 node --check 全部通过。最初读取不存在的 round-10-finance.md 后已按文件清单改读实际 round-10-finance-review.md；没有把该读取错误或 Get-Command 未找到 eslint 的状态计成产品检查失败。

只读复核/隔离 Node 实际动作，唯一写入本文；不改源码、测试、Mock、其他材料或 Git，不撤销他人改动。中枢统一 HANDOFF 与本轮交付。本次是本地差异 review，没有宣称核验 PR CI/merge readiness。

## 独立代码判断

- 新改价申请金额直接使用现成 `U.decimalInput(amount.value, label)`，不是先 Number 再看标题。helper 先约束普通十进制与两位，再检查安全整数分、最小正分和 Number 可无损保存；候选 value 同时用于 targetAmount 和标题。
- 非法初值立即 fieldError/聚焦原金额，发生在 reason 校验、busy、控件禁用、withLoading 和业务写入前；保 raw 与原因，无草稿 clean 或假成功。修改合法后 clearErrors 只移除错误描述，保 oc-amount-help。
- 取消分支保 targetAmount=null，不解析隐藏金额。切取消仅 clearErrors 金额容器，保 raw、原控件和 hint 描述，不清原因或历史；切回改价再次检查仍保存的真实 raw。
- H20 handler 的 loading 首守卫、current 源、原五字段节点与 raw、actor 引用/内容、订单对象/状态/币种、同类待处理互斥、failure finally 和480ms源关闭继续保持。初值是否合法和点击后的内容是否稳定是两道不同检查。
- 本轮只新增申请候选约束，没有在申请阶段新增已收下限、必定可批准或企业金额上限制度。合法0.01/24000申请仍可由原主管已收下限/两位候选勾稽拒绝；原审批函数、旧 target/title/history、单证快照和收款不清洗。
- git diff --numstat 实际核对 utils/app/views-fin/mock-data/pages.css 本轮无差异，旧测试本轮没有修改。有限变更保普通脚本和既有全局命名空间，不引入依赖或持久化。

## 本代理独立证据

### 旧基线与当前行为对照

用 git show 只读取得上述准确基线的 views-sales，注入既有 fixture 的 sales source；utils/app/H20 与真实 U/Actions/Promise 保持当前未修改代码。实际独立重放7个原初值：1e3、2.4e4、0x10、Infinity、1e309、24000.001、9007199254740991.99，均新增非法待处理目标并关闭原窗。String 显式读取 Infinity/溢出，不用 JSON 的 null 掩盖实际值；订单、单证、收款均保持不变。这是7条历史 RED 的独立复现，探测 exit0表示红灯被确认，不是旧行为通过。

当前独立运行金额58专项，全部对应非法初值转为零写/原窗保留；不把旧基线和当前 GREEN 混成同一阶段。

### BigInt 独立 oracle：4883 个向量 PASS

自行经 stdin 运行，未改/保存项目脚本。oracle 从 raw 十进制直接按 BigInt 整数部分×100+补足两位小数取得精确分；限制1至9007199254740991，单独用 Number(raw) 的十进制字符串回算 BigInt 分，决定能否无损存储。没有调用生产 helper 生成期望值。

向量涵盖 MAX_SAFE 分附近±2048、2^52 分附近±128、512个确定随机金额和表示反例，去重后实际4883。每个向量对照 helper 的 ok；合法时同时比较返回 units、value 和存储字符串的精确分。全部一致，包括 .90可保存、.91分值安全但不能无损保存、.92超安全分；没有将“安全分”偷换成“任何 Number 乘100都精确”，也没有用浮点乘法作 oracle。

### 独立实际动作：16 个场景 PASS

| 组 | 数量 | 实际断言 |
|---|---:|---|
| 六非法初值→原窗继续→合法修正 | 6 | 指数/Infinity/hex/三位/安全但不可往返/超安全；初值完整 MOCK零写、raw/原因/focus/ARIA保留，loading=false且busy可重新取得；H20继续保原金额节点/错误，改12050.00仅新增合法申请 |
| 合法边界与纯度 | 3 | 0.01、90071992547409.90、45035996273704.95，存储分与独立oracle相同；移除新增一笔申请与一条日志后全MOCK与基线一致，旧审批字段保持 |
| 合法申请不是自动批准 | 2 | 实际新建0.01/24000后切主管、原处理动作点击通过；原审核仍拒绝，申请待处理、完整MOCK不再写、具体旧原因在源窗 |
| 非法金额错误后切取消 | 1 | 原raw保留，error文字/aria-invalid清除但help保留，合法取消target=null/priorOrderStatus保原状态，单证与收款历史不变 |
| H20后续漂移 | 4 | 合法12050排队后改等值raw前导零、同actor id、同id同值原节点替换、源替换，全MOCK相对测试变化后不再写，新源不误关 |

这些场景使用实际 Actions/U/App 原 Promise 与最小 DOM fixture 短真实 timer。程序修改 disabled字段/替换DOM用于隔离票据反例，不声称普通用户能在原生UI如此操作；focus/ARIA断言也不替代读屏或原生焦点验收。

## 实际相邻回归

下列12脚本均由本代理实际执行 exit0，计数与上面的独立向量/动作不合并：

| 脚本 | 结果 |
|---|---|
| verify-change-request-amount | 58 PASS |
| verify-decimal-contract | PASS |
| verify-sales-modal-drafts | 40 PASS，含原450ms真实时钟快速重试 |
| verify-change-request | 25 PASS |
| verify-modal-drafts | 45 PASS |
| verify-repricing | PASS |
| verify-cancellation | PASS |
| verify-quotation-contract | 103 PASS |
| verify-approval-modal-drafts | 21 PASS |
| verify-context-navigation | 194来源/岗位链接+15集成 PASS |
| verify-payments-contract | 71 PASS |
| verify-views | 100岗位/视图及原核心动作 PASS |

旧主管和取消测试仍核金额勾稽、已收、分币、自审/角色、历史快照与延迟互斥；新金额脚本的BigInt/标题正例和31非法/8合法/修正/切换/漂移矩阵已实际阅读全文，不只读输出认PASS。git diff --check exit0。没有因已通过重复扩大全站测试。

## 当前源码指纹与边界

| 文件 | SHA-256 |
|---|---|
| js/views-sales.js | E5BF4530FE92349FAD23F8C86AFFDD110ABC48BE09E2070D39DF1041CE54C0BB |
| scripts/verify-change-request-amount.cjs | 971D5274D4460876F5F2404E77F1A6F62E39F96D3AAFEE9CFBC372957ED466AC |
| js/utils.js | 29BBDB784CD8B0011D3DF0A060B52759241E79757BED0CECCD9A89511CE9D6DF |
| js/app.js | 04BF6665B37D40DE2B4DE639DB2617B37FF3545C5EA66C737499EEB4EE80F3FF |
| js/views-fin.js | E4D0E9A329CD4BEC81506E19F7614657F5E2B9B6BB50D4B29052F8AF06AD97A6 |
| js/mock-data.js | E1CA2E493C8535A67E9939D38A4933BAB65CA82742E41C4B1B7117944B165318 |

本专项没有执行CUA、原生键盘/布局/输入法、读屏、跨浏览器、file://、后端权限/并发/财务事务、正式金额制度、退款/FX、PDF/签署、NAS或Git推送。中枢两轮UI和交付由各自实际证据决定，后续hint修改只按实际差异补审。

## Review Summary

| Severity | Count | Status |
|---|---:|---|
| CRITICAL | 0 | pass |
| HIGH | 0 | pass |
| MEDIUM | 0 | pass |
| LOW | 0 | pass |

Verdict: **APPROVE** — 上述指纹对应的有限JS金额入口/原H20行为与独立数值对照通过，没有新增待处理finding。

## 最终短提示文案有限补审

晚改仅将常态金额 hint 从较长的普通十进制/指数/十六进制说明改为“填写至少0.01的金额，最多2位小数，例如24000.00。”。本代理实际重读最终 diff 和源码，当前金额前行、oc-amount-help ID、inputmode/描述关系、helper 具体非法错误、候选算法及 H20 全部保持。

为精确确认差异，经 stdin 执行只读 SHA 对照：在内存把最终源码唯一一处短提示还原为先前长句，所得 SHA-256 逐字等于本文原审 `E5BF4530FE92349FAD23F8C86AFFDD110ABC48BE09E2070D39DF1041CE54C0BB`。实际 exit0，证明两阶段源码差异只为该一个字符串，没有仅凭通知推断算法不变。原4883个 BigInt 向量、16个独立动作及12项回归属于原审指纹的真实运行，本次没有重复执行或重标为最终新指纹下的实跑；中枢报告最终58/40/25和语法另已重验，其证据归中枢。

最终实际读取 `js/views-sales.js` SHA-256 为 `29FB5C3A64232DED67AFC6D4C4EB7FD93DFD35F2258278FEF3781D359DB0E9B7`；新增金额脚本仍为 `971D5274D4460876F5F2404E77F1A6F62E39F96D3AAFEE9CFBC372957ED466AC`。原表保留作前阶段记录，最终销售指纹以上述新值为准。

有限补审结论：**APPROVE**，没有新增待处理 finding。只追加本报告，不改源码、测试或 Git，不认领原生/整轮 UI 或远端交付；本轮写入到此结束。
