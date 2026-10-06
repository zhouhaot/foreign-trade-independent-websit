# 第 9 轮：主管处理意见弹窗连续性

状态：先 RED 后实现，财务接入与专项/相邻隔离回归已 GREEN；等待中枢浏览器、多视角 UI 与独立代码复审封版。本说明区分早期证据、当前实现与未测事项。

## 原行为与已复现 RED

`ap-handle` 的处理意见未绑定草稿基线，X/取消/Escape 走共享强制关闭。异步回调只核申请/操作者/业务内容，没有核源弹窗是否仍是当前作业；成功无参 `U.closeModal()` 会关闭当前新作业。

新增 `verify-approval-modal-drafts.cjs` 在修改业务源码前使用实际 U 弹窗、App 委托、主管处理动作和真实 Promise 复现：填写「尚未提交的主管意见」后点 X，源 overlay 被卸载；合法 14,075.00 USD 改价处理排队后强制卸载源并打开新作业，旧回调仍改业务并关闭新作业。`--red` 输出 `RED CONFIRMED`，默认要求保源 DOM 的 GREEN 断言得到 `false !== true`。数据只存在隔离 fixture，不是对用户业务写入。

## 有限接入蓝图

- H20 只保护 `ap-opinion` 未提交内容：关闭尝试先保留原节点、值、错误、焦点与滚动；继续填写为主，明确放弃为次。
- 排队处理中设置源弹窗 busy，关闭等待实际处理结果；成功实际 commit 后 clean，再以源 overlay 参数程序关闭，不再提示放弃。
- 点击与异步回调都核当前源弹窗。已关闭/替换源不写业务，也不关新作业；源还在时失败原因仍留原窗，未提交意见不清空。
- 保留现有改价整数分/候选精度、权限、自审、申请内容、生命周期、一次申请互斥、源快照、H18 包装与 H19 纸张表达，不引入未确认的财务制度。
- 处理意见 label/错误 ID/ARIA 可以具名；交易信息卡不在本轮重排。

## 旧测试兼容与授权记录

旧 `verify-repricing.cjs` 和 `verify-cancellation.cjs` 的 `U.openModal` 返回普通对象桩，不具备真实 DOM 当前弹窗、busy 或草稿节点接口。中枢已明确授权最小适配这两桩，显式建模 current/clean/busy；业务原断言保持，真实 UI 保护由新 DOM 脚本证明，生产 API 不因旧桩放松资格。

旧改价 parallel 场景先打开 first，再打开 second，点击已被替换的 first.approve，原期待 first 改价通过。该期待与新 H20「旧源不得写」实际冲突，中枢已批准改为：旧 first 点击全 MOCK 不变，当前 second.reject 正常生效，并继续保留同申请重复/相反决定互斥证明。材料将明确记录变化，不能说原断言完全未改。

另外，`verify-document-snapshots.cjs` 也返回无 DOM 的旧 modal 桩，接入后实际错误为第 154 行 `c.modalControls.approve is not a function`：新 bind 拒绝旧桩，使按钮回调没有登记。中枢追加授权只适配该桩的 current/bind/busy/clean、原 opinion 连接属性与按钮 classList；全部快照/历史/失败原断言保留，没有以放宽生产资格处理测试缺口。

## 当前逐项实现

| 改进 | 修改前 → 修改后 | 代码与证据 |
| --- | --- | --- |
| 有限意见草稿登记 | ap-opinion 未登记 → 打开主管处理时只把原 opinion 节点绑定 `U.bindModalDraft`，标签含原申请编号；raw 值比较由共享 API 执行 | `js/views-fin.js`；原始空值直接关、空格有变化、恢复原值直接关 |
| 同源继续/放弃 | X/取消/Esc 直接卸载 → 共享关闭选择与原 modal 为同 overlay 的 siblings；继续保原作业，放弃只关原窗不批准/退回 | 三关闭入口保同 opinion/原值/错误/hint/ARIA/选区/焦点与 textarea/body 滚动；放弃全 MOCK 不变 |
| 幂等关闭选择 | 可重复关闭误伤 → 普通重复 X/取消/request 保同一份选择；只有主继续按钮或 Escape 的 continueDraft 才恢复源 | 最初共享实现重复 request 会恢复而非保持，专项首绿遇到 `0 !== 1`，中枢改为明确幂等语义后原断言保留并通过。Node 程序触发旧 inert X 仅证明幂等，不冒称原生点击 |
| 选择中底层不可提交 | 旧按钮闭包仍可触发 → 点击先核 `U.isModalCurrent`（包括没有关闭 guard），guard 显示时拒绝底层旧 submit | 选择保持时程序点击通过不写任何业务 |
| 微任务窗口处理保护 | 只有申请互斥，仍可关闭 → 同 tick 判 `U.setModalBusy(true)` 成功后才置申请锁/排 Promise；处理时关闭等待结果，不表现为撤销提交 | 通过/退回点击后立即 X 保源，未弹放弃选择；实际 commit 以后才关闭 |
| 原填写绑定 | 延迟可读旧意见或替换节点 → 原 opinion 同一节点/仍连接且 raw 内容与点击时一致，前后变化拒绝 | A→B 不提交 A；点击前/回调前换节点零写，当前窗提供完整具体原因 |
| 失效源回调隔离 | 旧源脱离仍写且无参关新窗 → 点击与回调核源当前，失效释放原申请锁，不写、不重绘、不触碰新窗；程序成功 close 限源 | 真实 RED 同序 GREEN，新 textarea 节点/值仍保留，原业务全 MOCK 不变；重新打开申请可成功 |
| 失败保留与成功完成 | 失败/成功未区分草稿 → 当前窗失败释放 busy、原具体处理原因仍在、意见不清；成功实际 commit 后 markModalDraftClean → 释放 busy → closeModal(overlay) | 20.50 候选差额仍待处理；失败后 X 仍保护原意见；成功只一条反馈/一次重绘，收款与历史单证不变。没有 App 页面草稿 clean |
| 字段具名 | 意见 label 未关联、错误无固定 ID → label-for、初始说明 hint 与错误 ID；退回必填用原 U.fieldError 保 hint 并追加 error 描述 | 无意见退回仍拒绝，aria-invalid 与 ap-opinion-error 关联；未重排交易卡/金额区 |

当前运行代码只改 `js/views-fin.js` 的主管处理意见区域，收款表单/金额、原审批权限、自审、申请内容上下文、取消/重制生命周期、改价候选与源交易快照保持原契约。共享关闭与样式仍由中枢拥有。原处理意见业务字符串继续 trim，草稿与点击→排队绑定则比较 raw 文本，二者范围明确。

## GREEN 验证与范围

`verify-approval-modal-drafts.cjs` 默认分支：21 个实际动作/共享 U 弹窗/App click-keyboard 监听器场景 PASS，使用真实 Promise/短真实定时器和最小 DOM。`--red` 是修改前基线调查选项；修复后该旧缺陷断言应失败，不把它计作当前回归，默认分支才是修复后的验证。

独立相邻运行：`verify-repricing.cjs`、`verify-cancellation.cjs`、已最小适配的 `verify-document-snapshots.cjs` PASS；`verify-payments-contract.cjs` 71 与 `verify-views.cjs` 100 角色视图及既有业务动作 PASS。所属运行 JS、新脚本与三旧桩语法检查、所属 `git diff --check` PASS。

旧金额/取消/快照桩仅建模当前源与 API，未称其拥有真实 DOM 关闭能力。唯一改变业务期待是已明确记录并批准的旧 first 替换场景；其它金额、角色、自审、状态、历史快照、失败和互斥原证明保持。新真实 DOM 桩提供本次关闭/源回调语义证明。

尚未在本 agent 阶段执行真实浏览器、原生键盘/选区/滚动布局、跨浏览器/读屏、file://、服务器权限/财务事务/银行、退款、正式签章/PDF 或 NAS。Node 焦点、选区和滚动属性核对不替代原生验证。真实 UI 与独立审查以中枢后续实际结果为准。

## 复盘

误关闭要区分未提交填写与已在处理的业务：同源继续保护文字，busy 等待结果，成功先完成业务再结束 UI。源身份同时保护旧回调与新作业，而申请互斥继续保护一次业务决定；二者不能互相替代。全局 shared 先行暴露了幂等关闭与旧 plain 桩的明确差异，先记实际反例再按授权小修，既不删除原证据，也不把本地 H20 解释为公司撤回审批制度。
