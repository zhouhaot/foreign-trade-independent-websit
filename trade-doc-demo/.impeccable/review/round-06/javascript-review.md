# 第6轮独立 JavaScript 与数值专项审查

日期：2026-10-07。基线：`d396990f01f044a313bdb60575ef205b4756f8c5`。先检查 staged/工作区差异；staged 为空，本轮范围是客户完整候选、询盘参考报价与必要共享 helper 调用。审查代理只写本报告，不改源码、脚本、Git 或交接材料。项目普通 JavaScript，无 TypeScript/npm/ESLint 配置，不虚构相关检查通过。

## 最终结论：APPROVE（静态前端 JavaScript 与数值专项）

一项 MEDIUM 已 **Resolved**，当前专项范围没有未解决 CRITICAL/HIGH/MEDIUM。结论限定本轮静态 demo 差异和下述 Node 证据，不代替独立 UI/完整业务审查，也不代表生产身份、邮箱或服务端事务认证。

修复后回读 inquirySourceMatches：开窗只接受当前询盘规范 encoded ID 详情路径，允许 query 后缀；context 捕获完整 sourceHash，onOk 检查完整 hash 未漂移及规范来源仍匹配。观察到漂移后设置 invalidated 原因，旧窗口再次点确认或返回源路由也不恢复该票据。错误通过窗口就近说明与短 Toast 呈现，没有成功 clean 或导航，也没有吞掉泛化 Promise 异常。

最终实际独立复验：

- 原开窗后变到 INQ1 的复现，以及已经点确认但 onOk 尚排在 Promise 微任务时变源路由：整个 MOCK 逐字不变，显示来源变化原因；返回原 sourceHash 再点该旧按钮仍零写入。
- 原实际 app/history/storage-fallback 复现：dashboard→INQ6开窗→Back→旧确认，实际到 dashboard 后原确认拒绝，全 MOCK 不变；不依赖 actor 引用因 storage 反序列化变更才拒绝。
- 规范 INQ6 带合法 query/中文编码说明参数仍成功生成54500分候选，没有误拒；专用114场景另含规范 encoded ID、错误入口、多种 query/编码漂移及闭窗/重复。
- `verify-inquiry-contract.cjs`：**114** 场景 PASS（首次95 + 19来源绑定相邻场景）。`verify-customer-contract.cjs`：51 场景再次 PASS；views-sales/views-core 语法和 git diff-check：PASS。
- 新“生成报价草稿”主动作/确认标题与合成标识只改变呈现，保留待客户确认及不直接生成订单契约；已有 EUR 报价与当前商品参考 USD 的区别文字仍保留。本专项没有修改或重新认证像素。

首次警告与原失败证据保留如下。本专项代理没有操作真实浏览器，不提前认领中枢正在验证的 UI。

## 首次结论（历史）：WARNING，修复后已独立复审通过

### MEDIUM [Resolved]：询盘确认缺少独立的源路由绑定，旧确认可以在源页离开后生效

位置：`js/views-sales.js` 的新 `inq-start-quote` context 与 contextError。已经绑定 actor 引用/完整 JSON、询盘对象引用/内容及关联资料内容，但没有保存和重查 location.hash。

独立隔离 Node modal/Promise 复现：在 `#/inquiries/INQ2026006` 开确认，改 location.hash 到 INQ1 后点旧确认，quotes 从9变10，新增报价仍来自 INQ6。进一步加载真实 app 的异步 history handlers：dashboard→INQ6→开确认→Back，实际 route 回 dashboard、旧 modal 仍连接；点旧确认仍新增1笔 INQ6 报价。

第二个复现的 fixture 明确 storage.getItem=null，因此使用项目既有 currentUser fallback，actor 保持同一引用。真实 storage 正常读取时 render 通常返回新 actor 对象，可能间接拒绝，但不能用这一偶然行为代替本轮明确的来源路由票据契约。本报告没有原生浏览器复现，不声称正常浏览器发生频率。

首次建议 context 保存开窗路由，并在进入与 onOk 重查当前 hash 属于该询盘详情及原路由，漂移时原子拒绝、保留解释，不依靠 actor 反序列化是否换引用。已即时交中枢，源码由原 owner 修复，并按上方最终证据独立复验通过。本审查代理没有修改业务实现。

## 实际独立验证

- `verify-customer-contract.cjs`：51 场景 PASS，实际 submit 与完整候选，actor/客户引用与内容、表单/token/路由、文本/基本邮箱/等级校验、一次成功 clean 及失败零写入。
- `verify-inquiry-contract.cjs`：首次95场景 PASS，实际 modal/Promise、双向关联、actor 内容与引用、询盘对象/内容及客户商品字典内容漂移、取消/重复、参考币种与金额；首次未覆盖源 route 漂移，修复补场景后的114已实际再次 PASS。
- views-core/views-sales 的 `node --check`：PASS。
- 额外9组小范围检查（非重复千组旧金额）：`0.01×1.00`/`0.25×0.04`=1分、`3×0.29`=87分；小于分、无损行失败和乘积溢出均拒绝且全模型不变；当前年后缀 MAX_SAFE_INTEGER 无法+1时拒绝；模拟2027年只按2027最大后缀9999生成10000，不受上一年大后缀影响；已有 EUR 报价与当前 USD 商品参考价明确注明可能不同，以关联原交易为准。

## 数值、引用与文本边界

候选复用已有 U.transactionAmounts：先检数量/参考单价最多两位、最低0.01，每行 BigInt 整除精确到分、安全整数分及行/合计无损 Number 显示，再返回独立业务明细副本。BigInt 不进入报价模型。全部意向商品参考币种相同且启用才生成，不把原关联报价币种强行改成当前商品参考币种，也没有自动换汇。

ID 生成读取当前年已有数字后缀最大值，检查类型、数字格式、安全整数与新 ID 碰撞，不按数组长度覆盖旧报价；当前年异常后缀明确拒绝。报价先构造完整新对象，再同步添加报价和来源关联，一次 ticket 与相同询盘锁避免连续 Promise 重复写。关闭 overlay 后拒绝旧确认；原生浏览器行为另由中枢验证。

客户先收集全部可编辑字段为文本候选，任一字段无效不部分写入。必填、基本邮箱结构与 A/B/C 等级检查不是邮箱 RFC 全量验证、DNS/可达验证或真实客户核验。电话/国家/姓名没有杜撰格式清单或长度上限；单行控制字符拒绝，备注允许换行并拒绝其他控制字符，写入后输出转义。源客户引用和完整 JSON、actor 引用/id/name/role、实际表单连接与路由检查；不把纯内存防错当服务端授权。

H17 的新增 INQ6 明确标记合成，100×P001参考3.20+50×P003参考4.50=545.00USD。不是客户真实需求或已接受价格。原集合与五询盘保留证据由中枢另行封版，本专项没有从截断 diff 推断全集合逐字相同，也没有认领未亲自执行的旧金额全量回归。

## 证据范围

本报告实际执行 Node DOM/Promise/历史事件模型与静态源码审查。没有执行真实浏览器、像素、beforeunload、跨浏览器、读屏、DNS、银行、后端或生产事务，不能提前认领 UI SHIP。
