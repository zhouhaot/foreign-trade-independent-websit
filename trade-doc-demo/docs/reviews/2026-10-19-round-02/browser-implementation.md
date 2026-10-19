# 第 2 轮统一浏览器回归入口：实现与作者验证

2026-10-19。仅修改开发／验收脚本；9 份产品 JS、3 份 CSS、index、Mock 与设计规范未改。本报告是作者实现说明，真实 Ego 运行、全量产品回归及最终独立结论由主控回读后写入总报告，不能把下方 Node 契约结果当作真实浏览器 PASS。

## 入口与调用契约

- `scripts/verify-browser.mjs`：matrix／business／quality 默认全部运行，可用 `TRADE_QA_PHASES` 选择其中一项或逗号分隔的无重复子集。报告预建所请求阶段为 `NOT_RUN`，实际开始后才标 `RUNNING`，结束为 `PASS`／`FAIL`／`BLOCKED`。未请求阶段另列 `notRequested`。
- 调用者明确传入既有 TaskSpace ID、`TRADE_QA_PAGE=p1`、`TRADE_QA_DISPOSABLE=1`、本任务授权的回环 HTTP `index.html` 与绝对新 JSON 路径。拒绝远程地址、https、file、IP 简写／数字／hex 别名、凭据、hash、缺端口、非法空间 ID／阶段与相对报告路径。
- preflight 在任何浏览器调用之前执行，并用 `wx` 预留新报告，拒绝覆盖旧证据。其他参数缺失但 REPORT 为有效新路径时，向该路径写 BLOCKED；REPORT 缺失、非法、已存在或不可写时返回／打印内存 BLOCKED 和 `refusedReportPath`，不自选替代文件。
- 仅 `listTaskSpaces()` 核对调用者指定 ID，再 `taskSpace(id).page('p1')`。本轮主控实际验证 CLI 返回的条目使用 `id`／`ownership:'agent'`，task handle 使用 `spaceId`／`ownership:'agent'`。不打印其他空间，不创建、claim、接管、finish 或关闭调用者空间。

Ego CLI 的 shell 前缀环境变量在主控首次前检中未传入 nodejs 进程，不能把环境变量示例当可用命令。使用 `-e` 内显式 globalThis 注入；其中空间、端口和全新报告路径必须由本轮调用者选定：

```sh
ego-browser nodejs -e 'Object.assign(globalThis, {
  TRADE_QA_SPACE: 18,
  TRADE_QA_PAGE: "p1",
  TRADE_QA_DISPOSABLE: "1",
  TRADE_QA_BASE: "http://127.0.0.1:8015/index.html",
  TRADE_QA_REPORT: "/Users/airuquan/foreign-trade-independent-websit/trade-doc-demo/docs/reviews/2026-10-19-round-02/evidence/browser-round02-final.json"
}); await import("file:///Users/airuquan/foreign-trade-independent-websit/trade-doc-demo/scripts/verify-browser.mjs");'
```

分段时在对象中加 `TRADE_QA_PHASES: "business"` 等，并为每次运行选择全新 REPORT。普通 Node import 仅导出 `preflight`、`runBrowserQa`、错误分类及独立金额换算函数，不自动操作浏览器。

## 原覆盖去向与方法纠正

| 旧覆盖／已审查行为 | 新入口去向 |
|---|---|
| 五岗 × 20 路由，既有权限矩阵与未授权直接访问 | matrix：100 访问，1280×800／1366×768／1440×900 共 300 桌面观察；表单具名观察另记，不冒充读屏认证 |
| 询盘 INQ6 → 报价 → 客户确认 → 成单 | business：从未关联报价的原始询盘开始，新报价当前有效期、交期控件及双向关联读回；不拿过期旧报价当新成单 fixture |
| 取消成单不得写入、确认后金额勾稽 | business 第一组：原生取消／重开确认，独立 BigInt 明细核算 54500 分；不用产品金额 helper 互相比 |
| 超收拒绝 → 先收 100 → 首制双单 → 空 PL 拒绝／补包装送审 | business 第 2～4 组：超收／空 PL 整个 Mock 零写，包装纯数字重量／体积沿当前单位规则，所有业务集合 ID 唯一 |
| 主管双单审核但尚欠 445 → 尾款结清 → CI 导出演示 → V2 保 V1 | business 第 5～8 组：同一订单全链不中途 reload；已收与余额由独立付款分值核算；导出只认演示历史、不称生成真实 PDF |
| 搜索岗位过滤、IME Enter、方向键和焦点恢复 | quality 搜索组：读取实际选中的允许链接后 Enter；相关 CI 也可为合法结果，不再只等订单路由 |
| 订单筛选、密度、视图／侧栏输入保留及六页签／三进度 | quality 订单组完整保留；hash 导航走原生 goto，不调用 App.rerender 掩盖路由问题 |
| 文档 focus 保留编辑，切岗移除编辑资格 | quality 文档组：用当前合法 CI4 编辑 fixture，填 marks 后 focus，再确认受保护切岗；不用待重制的 PL4 绕规则 |
| 已通过单证取消修订、新 V2 保持旧 V1 | quality 修订组保留取消与确定两个分支，独立整对象序列化核对 V1 |
| 收款字段校验及原有订单已收勾稽 | quality 收款组：原生提交，独立付款记录分值前后差 10000；不依赖 U.orderReceived 作预期 |
| 1360/1361 目录临界点、地图键盘、reduce／normal 动效 | quality 三组：保原三栏规则和当前地图样例；媒体与视口诊断在独立场景前恢复 |
| Toast 真实拦点击缺陷的回归 | quality Toast 组：pointer-events、status／alert 保留，再原生提交触发表单错误 |
| 禁用岗位最后启用账号使整个登录页失败 | quality 账号组：隐藏 checkbox 用原生 focus＋Space，退出后验证 doc option disabled、管理员旧 DOM 清除，并在不 reload 的同一 fixture 重登启用管理员 |
| 30 次同步小样本渲染和资源边界 | quality 最后一组：原本机诊断保留，资源按本次 BASE origin 核对；不声称容量或泄漏认证 |

每个 matrix 角色开始和每个 quality 独立组开始均明确 goto＋reload，确认原 7 单／11 版本、INQ6 未起草、仅 U007 禁用。已提交同单业务链只有起点复位，切岗保留其内存结果；避免上轮 hash-only goto 继承禁用 doc fixture 的方法错误。

## 失败留证与停止边界

报告在每个检查／阶段结束和 finally 清理后持久化。原产品断言、普通工具错误、方法错误和阻塞分别记录 `product`／`tool`／`method`／`blocked`；普通断言失败可保留独立其他场景覆盖，业务连续链任一环失败则停止该链。字段错误／Toast／hash／role 作为失败时的局部证据，不读取全局存储或输出完整 DOM。

阶段结果直接读取已有检查及该阶段失败来源，不为“已有检查失败”再造一个产品断言。matrix 同时报告期望／实际访问和布局数；已有检查失败导致观察不完整时保留原失败类别，不叠加伪产品结论。ready 普通异常仅额外读取一次 bootState，记录 readyState、App／Mock／U 是否存在、app 子节点、样式规则数、各 script 的资源时序是否出现，并区分 `errorListenerPresent:false/errors:null` 和已存在监听数组但 `errors:[]`。不改 goto／reload 顺序、不自动重试、补加载或 rerender；bootState 读回本身若遇安全停止，原 tool 来源保留，捕获阻塞另记。

按 Ego Skill 与 API 的安全超时契约，错误只要包含 `executionStopped`／`pageResponsive`／`mayHaveLateEffects` 任一结构字段（即使值全为 false），或明确失控、inactive、策略／URL 拒绝，即停止后续普通场景、阶段、诊断捕获与 Page 清理，保留元数据，剩余阶段 `NOT_RUN`，由主控评估恢复。不会换空间、claim、接管、改 URL 或换工具重试拒绝。普通 timeout 没有这些停止信号时仍是工具错误，不能直接判产品缺陷。

诊断项分别记录 `attempted`／`applied`／`restored`。在请求发出前标 attempted，成功回执才标 applied；普通协议响应丢失仍尝试恢复该媒体／视口／目标页 cache override。失败证据的捕获若再遇安全超时，原产品 FAIL 不降级成 BLOCKED，捕获阻塞单独入 failures，阶段保 FAIL 并标 stopped。finally 尽量逐项恢复并保留每个清理失败；若 runtime listener 注册无返回 identifier，明确报告不能证明移除，不猜 ID。

清理只处理本轮尝试的目标页诊断项，最后 reload 还原内存合成状态；不删除 Cookie、全局缓存、localStorage、sessionStorage 或调用者空间。安全／策略停止时明确记录清理未执行，不能据 finally 存在声称已恢复。

## 作者 Node 验证与限制

`node scripts/verify-browser-contract.cjs` 当前 42 组通过，最新作者摘要：[browser-author-contract-1792378197650-39029-summary.json](evidence/browser-author-contract-1792378197650-39029-summary.json)。覆盖缺参／非法 URL／非法阶段、默认和子集、独立分核算、新报告保留／拒覆、有效 REPORT 的 BLOCKED 落盘、空间不存在／非 agent 拒绝、部分报告与原失败保留、清理失败继续、结构安全元数据／策略阻塞／失控停止、普通 override 回执丢失的恢复以及 capture 超时不遮原产品失败；另有来源分类不被阶段汇总污染、bootState 监听器缺失／空数组区别、ready 安全停止禁捕获、boot 捕获安全停止保原 tool 四组。模拟 Page 的 report 明确 `engine:contract-double`，成功为 `CONTRACT_PASS`，不能成为真实 Ego PASS。

主控真实 run01 的 business 8 组通过；matrix 只完成前三岗 60／180，quality 9 组通过、2 组在 fresh ready 普通工具超时，原始报告保留：[browser-run-01.json](evidence/browser-run-01.json)。失败页保留原 HTML 标题，缺 role／App 渲染证据，不能定为产品缺陷；早版质量汇总额外标 product 是报告方法错误，本补修已移除，原报告不改。主控十次原顺序／加 load 等待对照未复现，未据此改变导航策略。旧 8014 日志存在积压，环境管道／资源启动是未确证推断；本次后续由主控显式选新的安静 8015 预览并核对同一源码，真实结果另记。

已执行两脚本 `node --check` 及限定文件 `git diff --check`。契约生成的 duplicate 文件故意写入原始 sentinel，用于证实既有内容未被覆盖；中间输出保留为方法演进证据。作者未启动浏览器、创建空间、执行 42 项产品全回归或改共享交接文档；真实执行以主控和独立评审实际回读为准。
