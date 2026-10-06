# 第4轮共享数字契约（实施与验证记录）

基线`2414905939c4c3dd275912c95d9af11f8f729952`，2026-10-07。中枢拥有utils.js、verify-decimal-contract.cjs及本说明；销售/财务agent分别接入业务流程。H12为当前缺真实精度规则时的原型假设：数量/单价最多两位小数、最低0.01，每行乘积必须精确到分；没有汇率、调整行、隐式四舍五入。数量继续允许小数。

## 每项改进

| 改进 | 原因与前后行为 | 实现/验证 |
|---|---|---|
| 严格十进制输入 | 通用Number可接受Infinity/指数/hex；新入口只接受普通正十进制≤2dp，拒绝无法无损保存Number的范围 | U.decimalInput返回整数单位/规范值/完整错误；通用U.validate未重写 |
| 每行精确到分 | 0.01×0.01会显示0.00掩盖小于分；新计算拒绝该组合，0.01×1.00合法 | U.transactionAmounts：qty×100与price分用原生BigInt中间乘积、检查模100；返回Number字段，不向业务存BigInt |
| 安全计算与规范副本 | 乘积超安全范围不能以浮点继续，新计算全部候选先验证、原items不变 | 行/合计范围及规范Number可往返校验；大中间乘积但最终安全整数分也有合法案例 |
| 日历和字典 | 日期只查非空可接受不存在的日期；币种新输入需按启用字典 | U.validCalendarDate检查格式/月/日/闰年；不禁止未来或已过期日期。U.currencyEnabled读现有数组字典 |
| 同币种实时余额 | 旧received合并异币种，负余额clamp0被标正常结清 | U.financialBalance严查每笔币种/金额，异币种不输出假USD已收；超收保留负balance及overpaid并ok=false |
| 原有调用兼容与异常诚实 | 只改新表单，旧订单仍可能显示假结清 | orderReceived/Fin/payStatus接同一计算；正常金额字段保留，Fin新增error/balance/overpaid；异常tag为金额待核对/收款异常。未修改历史纸张交易快照 |

## API与失败表现

- `U.decimalInput(value,label,allowZero=false)` → `{ok,units,value,error}`，单位是数值×100的安全整数；仅显式allowZero允许0。
- `U.transactionAmounts(items)` → `{ok,error,rowIndex,field,items,totalCents,total}`，rowIndex从0，field区分qty/price/amount/items。成功items为规范副本并带lineCents，业务模块可仅保存原业务字段。失败不返回可被误提交的部分items/合计。
- `U.financialBalance(order)` → `{ok,error,totalCents,receivedCents,balanceCents,outstandingCents,overpaidCents,total,received,outstanding}`。超收保留实际金额与负balance；币种/金额无效时无法可靠计算的字段null/NaN，格式化为“-”，不能代替真实合计。后续界面需显示完整error并阻止新增登记。
- 已知但禁用币种允许阅读历史余额；新增业务操作另检启用状态，不因字典停用抹除历史事实。未改变退款/汇率/外部文件或单证并行规则。

## 验证

规划agent先只读真实旧规则复现Infinity、1e309、0x10、1e3、1.001通过；异币种增加已收；超收-12001被0未收和已结清掩盖。新验收脚本先因缺新API红灯，实施后通过。它检查非法/过精度/无损范围、0.01/1.25等小数量、0.25×0.04和3×0.29精确金额、安全大中间乘积、溢出、空明细、真实闰日/不可能日期、禁用币种、查询全MOCK无变化、异币种NaN/待核对、超收负余额/异常标签。

`verify-decimal-contract.cjs`、utils语法与verify-demo（12入口资源/7订单既有金额）已通过。业务接入、独立审查、浏览器多视角/两宽验证仍在进行，以本轮总报告为准；不把纯计算检查当成报价/收款提交或生产验收。原生BigInt是当前现代桌面浏览器能力，未加外部依赖、构建工具或存储，仍为普通脚本。

## 首轮独立审查与修正

两位独立reviewer发现同一派生金额显示根因（专项HIGH/综合MEDIUM，各保留历史评级）：安全整数分不自动保证除以100的Number金额仍能无损表示。原有效大订单减0.01、反向超收、坏行但总额可显示，以及同客户两订单合计可能少一分。已给每行、余额/超收、客户聚合全部加单位往返检查；不支持时拒绝候选或显示待核对，保留exact cents，不能输出错误金额。Fin.balance/overpaid直接使用已验证结果，不再自行除100。

新增原复现回归均通过。专项独立重跑1000组BigInt oracle与decimal/payment69/snapshot/demo后APPROVE、HIGH Resolved；综合review独立原场景回读与相关回归后APPROVE、MEDIUM Resolved。另一个综合MEDIUM财务同账号新会话绑定由中枢修复并补零写/保留输入案例，payments从67补为69场景，详见财务材料及两份报告。

表单公共组件会将已有input/select/textarea id与label关联；报价币种/订单选择/收款方式这些原手写label也补for。原角色渲染/登录回归通过，实际键盘/label字段操作由本轮浏览器验证补证；没有新建输入id或更改身份权限。
