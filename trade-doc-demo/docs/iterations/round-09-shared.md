# 第9轮共享弹窗关闭保护

2026-10-07，基线 `d03c9a055ec10c1bf0171669ce0d15a90d820e01`。中枢单写utils/app、局部CSS与verify-modal-drafts；两个worker接qc/oc/ap三个作业，其他弹窗不自动加入填写保护。H20只保护本会话未提交输入，不持久化、不扩全站导航/刷新恢复，也不撤回已经提交的业务。

## 每项前后说明

| ID | 之前→本轮 | 文件与证据 |
|---|---|---|
| R09-S01 | persistent仅阻止遮罩关闭→三明确作业按原可编辑节点/原始值建立进入基线 | utils bindModalDraft，空/readonly/重复/非源绑定拒绝；不trim脏比较 |
| R09-S02 | X/取消/Esc直接删除→清洁直关，脏输入明确继续/放弃 | requestModalClose、app Escape；45共享及三adapter实际回归 |
| R09-S03 | 新确认会替换源表单→同overlay原.modal与alertdialog共存 | 原DOM未重建，source暂inert/aria-hidden；根共享Node严格节点相等 |
| R09-S04 | 返回作业上下文不保证→继续恢复原attrs/字段焦点/选区/body滚动 | 最后作业字段独立跟踪，原值/错误不清；native QC选区/错误复验 |
| R09-S05 | 选择焦点可串底层→主继续获焦点、Tab选guard优先、Esc继续 | app焦点循环；原生Tab/ShiftTab/Esc实际PASS，非读屏认证 |
| R09-S06 | 处理中误关易变不确定→同步busy拒绝离开等待结果，失败解锁 | setModalBusy(bool)、成功只Modal clean，不洗page draft |
| R09-S07 | 程序close无来源会误关新窗→显式close(expectedOverlay)只关原窗 | 无参legacy force保兼容；旧source不能clean/busy/关新作业 |
| R09-S08 | 普通重复close隐式继续→保持同一选择，只有Esc/继续恢复 | fin集成反馈后3实际接口RED→40到43，普通repeat幂等 |
| R09-S09 | 旧choice回调可伤同源新作业→绑定本次guard节点及连接 | 继续后旧discard误关与旧continue恢复新guard实际RED→45 |
| R09-S10 | 界面仅丢失或关闭→A配色440px独立选择、主继续次放弃、对象编号与提交含义 | pages CSS；源24%淡化但不替换，初12图多视角复审待进行 |

## 实际API与限制

`U.bindModalDraft(overlay,{label,controls})`只注册当前源一次、要求可编辑原控件；`U.isModalCurrent`表示当前root源且无离开选择；`U.setModalBusy(true)`对无绑定/已有busy/guard拒绝排队，false释放；成功写入后`U.markModalDraftClean(overlay)`仅该弹窗基线。`U.closeModal(overlay)`程序关闭绑定源，普通关闭按钮使用`U.requestModalClose(overlay)`；app Esc传`continueDraft:true`，已有选择才继续，首Esc依旧按脏/清洁处理。已有guard时底层提交被拒绝。

按原对象/rawvalue比较，不猜自动保存；正常字段禁用由adapter管理，失败恢复原disabled，成功后的源timer不会关后来作业。共享无参close及程序open仍保原用途，它们不是全局草稿保证；新业务应显式注册和带源关闭，未来弹窗/跨页需另定范围。选择中只隐藏原作业可访问性/交互，结束恢复原inert与aria-hidden值，不把父App提前解除锁定。

## 红绿与集成复盘

共享脚本最初RED为缺API，不冒作原业务缺陷；规划与worker另有实际旧3类关闭及异步红灯。共享37基本场景→加guard期间底层提交拒绝40；fin提示普通repeatclose语义含混，新增3原反例先RED再43；中枢自复现同源旧choice两个反例再45。独立综合已另重放这两个并注明root发现来源，不重复算其首次独立发现。

独立review发现qc/oc首次失败450ms loading仍在，快速再次键盘激活会setbusy但withLoading提前return导致永久锁；sales在任何清错/锁前查loading、原计时器RED→GREEN。OC原同引用actor姓名/id变化署名漂移也先红后有限绑定，不引真实账号制度。旧相关脚本桩/时序期待已逐文件授权适配，详见sales/finance材料，不能宣称旧断言全未改。

CSS最初用了未定义surface变量，在首次真实UI前查现有变量改card，没有声称错误CSS已验收。原生首阶段QC Tab循环/ShiftTab/Esc返回remark并保选区、日期错误继续与明确放弃；OC取消类型/原因/隐藏金额、AP raw空格必填错误/ARIA与焦点保留均PASS。Cua DOM wrapper未返inert属性值，后来读真实inert HTML属性为空串、aria-hidden=true；调试snapshot仍列无名source，不能凭此声称读屏只有一个dialog。原生相同id/value不证明严格节点身份，后者由真实代码与Node引用检查。

当前共享45、sales40、finance21，root26脚本/36语法全部通过；综合与JS最终APPROVE已保修复阶段与冻结指纹。12过程图/5原生组是首阶段，不提前认整轮UI SHIP、最终布局或推送。首12图UI独立逐读指出源modal整体opacity.24让后页文字透入白卡造成叠字；根仅改parent opacity1保白底不透明、其header/body/footer子内容.24，440选择/原DOM/inert不变。修后原生重载与终图待实验，不把初图当最终设计。正常/失败/成功、两宽及最终不同视角验收由总材料补记；长作业body滚动、真实快速键盘重试与不同行为仍待实际验证。file://、跨浏览器、全读屏/Tab、关闭刷新、后端事务、正式制度/签发/PDF/NAS均不由当前测试补为通过。
