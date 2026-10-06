# 第4轮独立 JavaScript 数值与兼容审查

基线：`2414905939c4c3dd275912c95d9af11f8f729952`。审查日期：2026-10-07。范围为当前未提交 `js/utils.js` 数值契约及销售/财务对这些 API 的必要调用。业务权限、并发、完整流程由另一独立审查负责；本报告不重复该范围。先检查 staged/工作区 diff，staged 为空，使用基线对应工作区改动。项目是普通 JavaScript，无 package.json、TypeScript 配置或 ESLint 配置；不虚构 TypeScript/lint 结果，也不安装新依赖。

## 最终结论：APPROVE（数值与兼容专项）

2026-10-07 修复后独立复审：此前 HIGH 已 **Resolved**。当前审查范围无未解决 CRITICAL/HIGH 问题。此结论仅适用于本轮数值契约及必要兼容调用，不代替另一审查的权限/并发结论或中枢的浏览器/UI 验收。

逐行金额在 BigInt 乘积整除与安全范围检查后，再检查行金额 Number 可无损回到原分值；不能以总额可显示来接受不可显示的单行。financialBalance 对余额绝对值进行往返校验，失败保留 exact cents 并维持金额显示 NaN、ok=false；正常差额再分别形成已检查的 balance/outstanding/overpaid。orderFin 直接取已检查字段，没有重新除100。客户×币种汇总对累计分值单独往返校验，异常显示“汇总待核对”和无损显示范围原因。

修复后实际独立复验：

- 原 `90071992547409.00 − 0.01` 场景返回 ok=false，balanceCents 保留 `9007199254740899`，outstanding/balance/overpaid 显示字段为 NaN、payStatus 为“金额待核对”；查询前后整个测试 MOCK 逐字相同。
- 反向超收 `0.01 − 90071992547409.00` 保留负分值，orderFin.overpaid 为 NaN，payStatus 为“收款异常”，未输出丢分金额。
- 单行 `3 × 30023997515769.03` 加下一行 `0.01` 的合计虽可显示，API 仍在 rowIndex=0/field=amount 原子拒绝，items=[]、total=NaN。
- 客户同币种两个合法余额 `90071992547408.00` 和 `0.99`：实际运行 payments 验收脚本确认渲染“汇总待核对”/范围原因，不再出现错误的 `90,071,992,547,408.98`。
- 重新运行 1000 组独立 BigInt 乘积/模100 oracle：PASS。
- 实际重新运行 `verify-decimal-contract.cjs`、`verify-payments-contract.cjs`（69 场景）、`verify-document-snapshots.cjs`、`verify-demo.cjs`：全部 PASS；utils 和 views-fin 的 `node --check`：PASS。收款脚本作为数值调用兼容证据运行，不从其结果重复认领完整权限/并发审查。

未执行浏览器或生产验证；首次审查记录保留在下方。

## 首次结论（历史）：BLOCK，修复后已复审通过

### HIGH [Resolved]：整数分安全不等于派生余额和客户汇总可无损转回 Number 金额

位置：`js/utils.js` 的 `U.financialBalance` 派生余额/超收计算，`U.orderFin` 的 balance/overpaid 显示转换；`js/views-fin.js` 客户×币种汇总的 `b.cents / 100`。

`decimalInput`、`transactionAmounts` 已对输入、合计进行无损往返检查，但 total 和 received 各自可无损，不保证其差额可无损；同样，每笔未收可无损，不保证累计金额可无损。`Number.isSafeInteger(cents)` 只能保护整数分计算，不能替代金额 Number 的再次校验。

实际 Node 只读 VM 复现：新增测试订单 qty=`1`、price=`90071992547409`，同币种收款 `0.01`。返回 totalCents=`9007199254740900`、receivedCents=`1`、balanceCents/outstandingCents=`9007199254740899`，但 `ok:true`、outstanding=`90071992547408.98`，应为 `.99`。将 outstanding 再交给 decimalInput 得 units=`9007199254740898`，少一分。第二个复现用两个无收款测试订单：应收 `90071992547408.00` 与 `0.99`，两个 financialBalance 各自成功，汇总整数分仍安全，但客户未收显示同样少一分。

首次建议在所有新增派生金额转换处检查 cents→金额 Number→units 与原 cents 一致；不能无损显示时明确金额待核对并阻止新增登记，或使用整数分的精确格式化。覆盖余额、超收与客户币种汇总，不把异常金额四舍五入后继续标成功。已向中枢即时报告；中枢/实现 agent 修复后按上方证据独立复审通过。本审查 agent 没有修改实现。

## 已通过的实际检查

- `node --check js/utils.js` 与 `node --check scripts/verify-decimal-contract.cjs`：PASS。
- `node scripts/verify-decimal-contract.cjs`：首次 PASS，首次脚本尚未覆盖上述派生金额边界；修复后新增余额、超收和逐行边界并再次 PASS。
- `node scripts/verify-document-snapshots.cjs`：PASS，11 个样例版本在主数据变更/删除后仍保留冻结交易内容，继承/重新制单规则与纯内存刷新边界未回退。
- `node scripts/verify-demo.cjs`：PASS，12 个入口资源、9 个报价、11 个单证、7 个订单的既有总额/已收/未收正常。
- 一次性 Node VM 额外边界检查：1000 组确定性数量×单价与独立 BigInt 整数乘积/模100 oracle 一致；Unicode 数字、零宽字符、符号、指数/hex 被拒绝；1900/2100 非闰年、2000/2400 闰年与年份 0001/9999 有效日期符合 Gregorian 日历。

## 当前可确认的契约与边界

普通正十进制最多两位小数；数量 `0.01` 保留。每行乘积必须精确到分，`0.01×0.01` 拒绝、`0.01×1.00` 和 `0.25×0.04` 成功。乘积使用 BigInt，中间结果不进入业务模型；成功 API 返回 Number 字段及新副本，原 items 未被写入。异常币种不合并成订单币种已收；超收保留负余额并显示异常，不假结清。已知但禁用币种可读取历史余额，新增业务另检查启用状态。历史快照捕获和纸张金额函数未改动，相关回归通过。

本报告只实际运行 Node/源码检查。尚未执行浏览器、真实读屏、跨浏览器/旧浏览器 BigInt、打印、服务器事务或生产验证；这些不得从本报告推断为通过。
