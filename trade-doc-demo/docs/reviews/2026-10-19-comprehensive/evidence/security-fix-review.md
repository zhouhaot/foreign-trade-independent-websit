# SEC-01 修复独立复核

日期：2026-10-19。复核人不是修复作者。只读审查 `js/views-core.js` 与新增 `scripts/verify-disabled-login.cjs`，执行限定回归及隔离VM反例；没有产品修改。

最终结论：APPROVE，限SEC-01及本次登录异步身份保护。原登录回归、新增11场景、独立8组身份替换反例均通过；两项首轮观察已按原触发条件关闭。下文保留首轮发现与最后复验，不将首次结果改写为全绿。未运行本轮完整浏览器／全40脚本或生产身份验收。

首轮结论：原 SEC-01 的缺失账号解引用／退出残留旧DOM问题已在受检回归中修复。新加入的异步身份保护仍有两个合成竞争反例未覆盖，已即时通知中枢；因此对“异步不会覆盖或清除新身份”的扩大声明暂不APPROVE。它们未证明普通单页UI可达，不应自动升级为新的生产越权漏洞或重开原P1。

## 首轮受检文件

- `js/views-core.js` SHA-256：`c6dab3b134a3df0625cf8cd6200c01b0b4e4f08440e33ff798f6562572b1223b`。
- `scripts/verify-disabled-login.cjs` SHA-256：`2b91d4555534f3eb65cc2d2df1fd2b6e516f94b64a9f29c4ce5990a6f92346f8`。
- 只读diff确认：无启用账号岗位明确禁用并标注；默认选中回退可用账号；所有账号不可用时不解引用并禁登录；选择／提交处理缺失账号；排队／导航时重查账号及原picker。

## 已执行检查

| 命令／检查 | 结果 |
|---|---|
| `node scripts/verify-login.cjs` | PASS，全部原登录回归通过，退出码0 |
| `node scripts/verify-disabled-login.cjs` | PASS，8场景，退出码0 |
| `node --check js/views-core.js` | PASS |
| `node --check scripts/verify-disabled-login.cjs` | PASS |
| 独立新身份在microtask之后替换为不同ID／岗位 | PASS，旧520ms回调不导航且不清新身份 |
| 独立新身份在microtask之前建立 | FAIL，旧登录写入覆盖新身份，详下 |
| 独立同ID／岗位的新身份在microtask之后建立并离开旧picker | FAIL，旧520ms回调清新身份，详下 |

新增8场景确实检查了：禁用doc／fin／boss最后一个账号、禁用全部启用sales后退出，登录节点存在、旧 `sys-enabled-U004` 不存在、剩余admin能不刷新重登；无账号状态的禁用提示；提交前／microtask前／导航前撤销目标账号。未把这8项当原生浏览器验证；未重跑全40脚本。

## FIX-OBS-01：旧microtask可覆盖提交后建立的新身份

- 定位：首轮 `js/views-core.js:85-90`。
- 隔离初态：实际登录页doc选择，使用真实 `Actions['login-submit']`，把 `setTimeout` 改为收集回调；不改产品源码或实际全局存储。
- 顺序：调用submit后、Promise首个microtask前，执行 `U.setUser` 写入合成新boss身份；排空微任务；执行原520ms回调。
- 预期（针对本轮新增保护要求）：旧登录尝试不覆盖新身份，不接管其导航。
- 实际：新boss被替换为U004/doc，旧回调导航 `#/dashboard`。
- 原因：`available()` 查控件、目标用户对象和enabled，但未查本次发起后的会话所有权变化。
- 适用边界：这是合成会话竞争。普通单页UI的520ms内可达路径尚未证明，不作为生产漏洞结论。

## FIX-OBS-02：旧cleanup会清掉同ID／岗位的新身份

- 定位：首轮 `js/views-core.js:93-95`。
- 顺序：doc submit→排空微任务让原登录写入→`U.setUser({...当前身份, dept:'SYNTHETIC_NEW_SESSION'})`模拟新的同ID／岗位身份→`App.requestNavigation('#/dashboard')`移除原登录picker→执行原520ms回调。
- 预期（针对本轮新增保护要求）：旧回调不清除后建立的新身份。
- 实际：`U.currentUser()`为null，而 `App.user.role`仍为doc、hash仍为dashboard。
- 原因：cleanup只比id／role，把新身份误认作旧尝试写入的身份；同时clearUser没有同步App.user／当前DOM。
- 对照：microtask后改成不同ID／岗位的新身份，旧回调会保留它，说明缺口是所有权识别而非整段保护完全失效。
- 适用边界：仍为合成竞争，未证明正常单页UI可达。

## 可重放的独立反例

以下代码仅操作新的既有VM fixture，未运行原测试runner，不使用网络。用于重放首轮现象，后续修复后应按预期改为零覆盖／零误清，而不是继续要求复现旧错误。

```js
const assert = require('node:assert/strict');
const { fixture } = require('./scripts/verify-document-workspace.cjs');
async function probe(kind) {
  const t = fixture(['views-system', 'app'], {}, { history: true });
  t.c.U.clearUser(); t.c.App.user = null;
  t.c.App.requestNavigation('#/login');
  const timers = [];
  t.c.setTimeout = (fn, delay) => timers.push({ fn, delay });
  const select = t.document.getElementById('login-role'); select.value = 'doc';
  t.c.Actions['login-submit'](t.document.querySelector('[data-action="login-submit"]'));
  if (kind === 'before-microtask') {
    t.c.U.setUser({ id: 'SYNTHETIC_NEW_BOSS', name: 'SYNTHETIC_NAME', role: 'boss' });
  }
  for (let i = 0; i < 8; i++) await Promise.resolve();
  if (kind === 'same-id-after-microtask') {
    assert.equal(t.c.U.currentUser().role, 'doc');
    t.c.U.setUser({ ...t.c.U.currentUser(), dept: 'SYNTHETIC_NEW_SESSION' });
    t.c.App.requestNavigation('#/dashboard');
    assert.equal(t.document.getElementById('login-role'), null);
  }
  timers.find(timer => timer.delay === 520).fn();
  return {
    kind,
    currentId: t.c.U.currentUser()?.id || null,
    currentRole: t.c.U.currentUser()?.role || null,
    appRole: t.c.App.user?.role || null,
    hash: t.c.location.hash
  };
}
Promise.all(['before-microtask', 'same-id-after-microtask'].map(probe)).then(console.log);
```

建议：区分当前登录尝试与当前会话所有权；写入前检查发起时会话未被替换，清理时只清本次实际写入且仍属于本次的身份，不仅比id／role。新测试增加两类竞争和不同ID／岗位对照。中枢决定是否纳入本轮修复；原P1关闭与新增保护声明分开记录。

## 第二轮修正与独立复验

中枢接受两项观察后，保存提交时 `sourceIdentity` 引用及 `sourceSession` 签名；microtask只在原控件、目标账号和发起会话都未变化时写入。记录本次写入的 `loginIdentity` 引用，旧520ms回调仅在身份引用／签名均属于本次时导航；清理还需原picker仍在，不能仅凭相同id／role清理。新增三个replacement测试，原8项扩为11项。

复验文件指纹：

- `js/views-core.js`：`0ddbbbd64f8217d8a69a84d21eb1b3428f1a0b8c4c26f69097303bcfaa51f9c6`。
- `scripts/verify-disabled-login.cjs`：`ac9a700cff276a5e22111cb9fe9a1f62f35818051d51ff37bf68b4f0608bfb64`。

已重新执行 `node scripts/verify-login.cjs`，全部原回归PASS；`node scripts/verify-disabled-login.cjs` 输出 `{"result":"PASS","cases":11,"scope":"disabled/empty role login and delayed identity recheck; Node DOM only"}`；两个受检JS语法检查PASS。

额外独立控制原520ms回调，8个组合均PASS：

| 新身份建立时间／内容 | fixture内存fallback | Map持久存储、JSON读取 |
|---|---|---|
| submit后、microtask前的新boss | 新身份保留，不导航 | 新身份保留，不导航 |
| microtask后、520ms前的新boss | 新身份保留，不导航 | 新身份保留，不导航 |
| microtask后，同id／role但不同dept的新会话；移除旧picker | 新身份保留 | 新身份保留 |
| microtask后，同id／role且内容完全相同的新对象；移除旧picker | 新身份引用保留 | 新身份引用保留 |

每个组合同时断言 `window.__demoUser` 仍是替换后的原引用，`U.currentUser` 的id／role／dept与新身份一致；前两组hash保持login，后两组hash保持已进入的dashboard。Map存储使 `U.currentUser` 每次JSON.parse生成新对象，防止仅因fixture无存储而错误通过；没有访问或修改用户真实浏览器存储。

FIX-OBS-01与FIX-OBS-02均按原触发反例转为PASS，首轮不同ID／岗位对照也保持PASS。未发现这两个文件在本次授权修复范围内仍需处理的实质问题；APPROVE只覆盖上述测试与源码审查范围，不等于真实鉴权或全部跨标签状态保证。复验完成后停止写入，产品与HANDOFF仍由中枢维护。
