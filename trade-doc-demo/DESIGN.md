---
name: 外贸订单与单证管理系统（前端 Demo）
description: 五角色共享的桌面贸易协同工作区，统一导航、业务台账、纸张审核与操作反馈
colors:
  primary: "#2f6fed"
  primary-dark: "#2459c4"
  nav-bg: "#142b50"
  nav-bg-deep: "#102442"
  bg: "#f3f5f9"
  card: "#ffffff"
  border: "#e5e8ef"
  border-control: "#cbd3df"
  text: "#192d4b"
  text-sub: "#5e6d83"
  green: "#187b45"
  green-bg: "#e6f7ee"
  orange: "#a75a12"
  orange-bg: "#fdf1e2"
  red: "#c0353f"
  red-bg: "#fceaea"
  blue-bg: "#e9f0fe"
  gray-bg: "#eef0f5"
  purple: "#6850bd"
  purple-bg: "#f0ecfe"
typography:
  headline:
    fontFamily: '"PingFang SC","Microsoft YaHei","Helvetica Neue",Arial,sans-serif'
    fontSize: "26px"
    fontWeight: 650
    lineHeight: 1.4
    letterSpacing: "-.025em"
  title:
    fontFamily: '"PingFang SC","Microsoft YaHei","Helvetica Neue",Arial,sans-serif'
    fontSize: "15px"
    fontWeight: 600
    lineHeight: 1.5
  body:
    fontFamily: '"PingFang SC","Microsoft YaHei","Helvetica Neue",Arial,sans-serif'
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.5
  control:
    fontFamily: '"PingFang SC","Microsoft YaHei","Helvetica Neue",Arial,sans-serif'
    fontSize: "13px"
    fontWeight: 500
  label:
    fontFamily: '"PingFang SC","Microsoft YaHei","Helvetica Neue",Arial,sans-serif'
    fontSize: "12px"
    fontWeight: 400
  metric:
    fontFamily: '"PingFang SC","Microsoft YaHei","Helvetica Neue",Arial,sans-serif'
    fontSize: "32px"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "-.02em"
  login-display:
    fontFamily: '"PingFang SC","Microsoft YaHei","Helvetica Neue",Arial,sans-serif'
    fontSize: "clamp(36px,3.3vw,52px)"
    fontWeight: 550
    lineHeight: 1.45
    letterSpacing: "-.03em"
  login-title:
    fontFamily: '"PingFang SC","Microsoft YaHei","Helvetica Neue",Arial,sans-serif'
    fontSize: "32px"
    fontWeight: 650
    lineHeight: 1.5
    letterSpacing: "-.02em"
rounded:
  tag: "6px"
  compact-control: "5px"
  control: "8px"
  tab: "7px"
  banner: "8px"
  modal: "16px"
  panel: "12px"
spacing:
  xs: "6px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "20px"
  panel: "22px"
  section: "24px"
  workspace: "32px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.card}"
    typography: "{typography.control}"
    rounded: "{rounded.control}"
    padding: "0 15px"
    height: "38px"
  button-primary-hover:
    backgroundColor: "{colors.primary-dark}"
    textColor: "{colors.card}"
  button-secondary:
    backgroundColor: "{colors.card}"
    textColor: "{colors.text}"
    typography: "{typography.control}"
    rounded: "{rounded.control}"
    padding: "0 15px"
    height: "38px"
  button-danger:
    backgroundColor: "{colors.card}"
    textColor: "{colors.red}"
    rounded: "{rounded.control}"
    padding: "0 15px"
    height: "38px"
  button-success:
    backgroundColor: "{colors.green}"
    textColor: "{colors.card}"
    rounded: "{rounded.control}"
    padding: "0 15px"
    height: "38px"
  button-text:
    backgroundColor: "transparent"
    textColor: "{colors.primary}"
    padding: "0 5px"
  input:
    backgroundColor: "{colors.card}"
    textColor: "{colors.text}"
    rounded: "{rounded.control}"
    padding: "0 10px"
    height: "38px"
  navigation-active:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.card}"
    rounded: "{rounded.control}"
    padding: "12px 14px"
  tag:
    backgroundColor: "{colors.blue-bg}"
    textColor: "{colors.primary}"
    typography: "{typography.label}"
    rounded: "{rounded.tag}"
    padding: "0 9px"
    height: "25px"
  card:
    backgroundColor: "{colors.card}"
    textColor: "{colors.text}"
    rounded: "{rounded.panel}"
    padding: "20px 22px"
  order-progress:
    backgroundColor: "{colors.card}"
    textColor: "{colors.text}"
    padding: "24px 0 0"
  login-role-select:
    backgroundColor: "#fbfcfe"
    textColor: "{colors.text}"
    typography: "{typography.body}"
    rounded: "{rounded.control}"
    padding: "0 44px 0 14px"
    height: "46px"
    width: "100%"
---

# Design System: 外贸订单与单证管理系统（前端 Demo）

## Overview

**Creative North Star: "外贸业务操作工作区"**

沿用用户已选定的 Ant Design Pro / Tabler / Metronic 企业后台融合方向：Tabler 的布局与留白、Ant Design Pro 的筛选与业务表格、Metronic 的信息分组共同形成一套本地组件。深蓝导航、操作蓝、灰底与白色面板继续承载五角色工作区；不引入模板代码、品牌资产或依赖。

工作台以角色概览、近期订单与待办帮助用户接续工作，详情分别展示订单、单证、收款进度，审核页面并置文书与操作。界面使用简体中文，单证字段保留外贸英文惯例；动效表达进入、切换、选择与反馈，不延迟业务操作。

**Key Characteristics:**

- 深蓝可收起导航、白色顶栏与角色业务路径构成稳定工作区。
- 白色平面面板、细边框和适度留白承载高频业务信息。
- 筛选、表格、工具栏与本地快速检索形成连续的查询工作流。
- 三类订单进度独立展示，单证纸张与权限相关操作同时可见。
- 状态用文字与颜色共同表达，金额携带币种并右对齐。
- 键盘焦点、字段反馈与减少动效设置贯穿共享交互。

2026-10-04 按 `css/base.css`、`css/layout.css`、`css/pages.css` 的最终覆盖规则，以及 `js/app.js`、`js/utils.js`、各 `views-*.js` 刷新本文。范围为登录、共享框架和现有全部模块；本文描述实现与设计约束，浏览器和业务验收结果以 `HANDOFF.md` 对应记录为准，不由文档更新推定。

## Colors

主蓝承担行动与当前定位，深蓝构成导航背景，灰与白组织阅读面；状态色承担业务含义。精确值以上方 frontmatter 为准。

### Primary

- 操作蓝（primary）：主按钮、链接、当前页签、选中导航与进度当前节点。
- 深操作蓝（primary-dark）：主按钮 hover。
- 浅操作蓝（blue-bg）：蓝色状态标签、选中控制和单证目录选中项。
- 导航深蓝（nav-bg / nav-bg-deep）：侧栏、登录流程背景及工作台首项指标的默认/悬停状态。

### Neutral

- 工作区灰（bg）与面板白（card）：背景、面板和控件形成清晰分层。
- 轻分隔线（border）与控件描边（border-control）：面板边界、表格分隔、输入与次按钮边界。
- 正文深灰（text）与辅助灰（text-sub）：主要内容、字段标签、时间和补充说明。
- 中性状态底（gray-bg）：未开始、草稿等中性标签。

### Semantic Status

- 成功绿与浅绿底（green / green-bg）：通过、完成与结清。
- 待处理橙与浅橙底（orange / orange-bg）：待处理与部分收款。
- 异常红与浅红底（red / red-bg）：异常、退回、危险操作和字段错误。
- 提示紫与浅紫底（purple / purple-bg）：改价申请等类别标签，不扩展为第二套操作主色。

**The 状态双标识 Rule.** 每个状态必须有可读文字；颜色和圆点只能辅助识别。

## Typography

**Body Font:** 系统中文字体栈；所有应用界面使用 frontmatter 中的同一字体来源，无外部字体资源。

页面标题、分区标题、业务字段与辅助信息分级；数字使用等宽数字特性方便比较。登录流程说明使用较大的同源字体，文书保留独立的紧凑排版，不把登录大标题带入业务表格。

### Hierarchy

- Headline：常规页面标题；工作台标题字距为（-.02em），订单抬头为（25px / 600）。
- Title：普通面板标题；工作台主列标题为（16px / 600），侧列与表格工具栏标题为（14px / 600），弹窗标题为（18px / 600）。
- Body：应用基准正文；表格、控件与多数业务字段采用（13px）。
- Control：按钮文本；输入文本沿用同字号而保持常规字重。
- Label：辅助标签、状态文字、日期与月份图标签。
- Metric：工作台数字卡；统计概览普通数值为（30px），分币种金额为（18px），订单金额摘要为（22px），较窄桌面为（20px）。
- Login Display / Login Title：分别用于登录左侧流程说明与右侧表单标题；业务页面不使用该层级。
- 单证纸张：正文（12.5px / 1.55），主标题（19px / 700），表格明细（12px）；所有内容保持真实表格和可选择文字。

**The 金额可比较 Rule.** 金额右对齐并携带币种，使用 `font-variant-numeric: tabular-nums`；不同币种不能合成一个总数。

## Layout

面向（1280px+）桌面。展开侧栏（232px），收起侧栏（80px），顶栏高（76px），侧栏品牌区高（96px）；侧栏和顶栏保持 sticky。工作区内边距为（30px 32px 48px），顶栏下是最小高（53px）的角色业务路径。

顶栏身份区采用（34px）浅蓝缩写头像与账号单行组合，如 `ZJG` 头像旁显示 `zhoujg`。个人缩写为姓名拼音首字母，系统管理员使用 `ADM`；资料按用户 ID 从本地样例读取，不从登录输入推导账号。完整姓名保留在悬停提示和无障碍标签中。当前角色以只读文字独立显示，不提供直接角色切换；“退出登录”为唯一账号退出入口。身份区不再重复展示姓名、角色与部门。

使用其他账号时必须先退出再重新登录。确认退出说明未保存输入将清除、已提交演示数据保留到刷新前；取消不改变会话，确认后关闭弹窗、清除本地演示会话及页面临时状态，仅保留导航收起偏好，立即回到登录页。后退或直达受限路由仍需登录；已有会话直接访问登录路由则回工作台。该交互符合账号切换路径，但仍是假登录，不是服务端安全边界。

主要节奏使用 frontmatter 的间距级别；常规卡片内边距（20px 22px）、下间隔（16px），标题与内容间隔（24px）。工作台主列间距（24px）、侧列（20px）、指标间距（18px）。用边框、对齐和留白分区。

工作台由欢迎区、四项指标和“弹性主列 +（300px）侧列”组成。首项指标以深蓝强调，各项数值/入口随角色变化。主列先展示近期订单，再展示待办；管理员将近期订单替换为演示账号。侧列包含业务入口、按完整年月标注的样例订单横条与最近动态，管理员不显示业务动态。

| 角色 | 业务路径 | 工作台关注点 |
|---|---|---|
| 外贸业务员 | 客户 → 询盘 → 报价确认 → 订单执行 | 跟进、报价确认、本人执行中订单 |
| 单证员 | 订单数据 → 单证制作与送审 → 异常申请 | 制作、退回修订、已通过版本 |
| 财务人员 | 订单应收 → 收款登记 → 异常申请 | 待收款、登记笔数、结清订单 |
| 业务主管 | 待审事项 → 订单跟踪 → 单证审核 → 业务分析 | 审核、异常、独立业务进展 |
| 系统管理员 | 用户 → 角色权限 → 基础字典 | 演示账号、角色与配置，无业务审批权 |

登录页采用深蓝流程说明与白色表单双列：左列说明确认报价生成订单以及单证/收款并行关系，右列表单最大宽（430px）。五角色使用与账号、密码同宽的原生下拉框；选项显示角色与演示姓名，下方显示所选演示部门。

订单列表按“标题与操作 → 筛选 → 工具栏与表格 → 分页”组织。基本筛选三列，操作置于右侧；更多筛选展开四列。当前筛选条件以可读摘要展示。表格保留内容最小宽度（1040px），必要时在表格容器内横向滚动。

订单详情头部先展示编号、客户与操作，再展示金额摘要和三类独立进度，下方用六个页签分组。单证审核采用（184px）目录 + 弹性纸张区域 +（232px）操作区，列间距（16px）；专注预览可隐藏目录。纸张保留最小可读宽度（640px）与基准宽度（760px），窄列在预览容器内滚动。

在（1360px）以下侧栏缩至（208px），工作区改为（28px 24px 40px），工作台侧列为（250px）。单证页在（1001–1360px）将目录移至上方可横向滚动的一整行，每项宽（184px），下方使用“弹性纸张 +（210px）操作区”两列，为（1280px）窗口保留纸张阅读空间，不缩小正文；较宽桌面继续三栏。

（1180px）以下通用表单折为两列；（1150px）以下侧栏（190px）且顶栏搜索收为图标；（1000px）以下工作台主侧列堆叠、单证操作区下移；（900px）以下侧栏收为（80px）且登录改单列。这些是窄窗口保底，不构成移动端交付承诺。

## Elevation & Depth

业务面板平面静置，靠白底、细边框和留白分区，不为普通卡片增加阴影。纸张在灰色预览台上形成可识别文档实体；弹窗、通知和下拉菜单使用现有阴影表达浮层。不要把这些浮层阴影迁移到所有业务卡片。

### Shadow Vocabulary

- 纸张：`0 4px 18px rgba(20,28,48,.12)`。
- 弹窗：`0 24px 80px rgba(13,30,56,.2)`；遮罩为 `rgba(12,28,52,.42)`。
- Toast：`0 8px 32px rgba(13,30,56,.16)`，位于右下角（24px）边距。
- 通知下拉：`0 16px 48px rgba(20,42,70,.2)`。
- 输入聚焦：`0 0 0 2px rgba(47,111,237,.12)`，属于操作反馈，不是面板层级。

**The 平面面板 Rule.** 普通业务面板以边框和留白划分；阴影用于纸张与实际浮层。

## Shapes

面板、标准控件、状态标签与弹窗分别采用 frontmatter 的圆角级别。标准按钮、输入和选择器高（38px）；小按钮（30px），图标按钮（36px），分页按钮（32px）。登录输入与角色下拉框均为（46px），提交按钮为（48px）。

纸张保持矩形，商品明细使用真实表格边线。可编辑的单证字段采用蓝色虚线边界提示允许编辑范围；只读字段保持文本或浅底输入，不增加装饰性立体效果。

## Components

### Buttons

主操作清楚，辅助操作克制。主按钮使用操作蓝；次按钮白底与控件描边；危险按钮采用红色描边，hover 为红底；审核通过按钮使用成功绿。文字按钮用于低层级辅助动作。

标准按钮横向内边距（15px），图标与文字间距（6px），颜色与按压过渡（140ms）；按下时下移（1px）。主按钮 hover 转为深操作蓝，次按钮转为操作蓝描边与文字。全局 `focus-visible` 使用（2px）主蓝轮廓与（3px）偏移；禁用态降低透明度并阻止操作，提交中防止重复触发。

### Inputs / Fields

白底、控件描边、标准控件圆角与高度；横向内边距（10px）。聚焦时使用主蓝边框与浅蓝 focus ring。必填项有红星，错误提示指出具体字段和原因；错误描边用异常红。订单带入的交易字段遵循角色只读限制。

字段标签关联输入；验证失败设置 `aria-invalid` 和错误描述关联，并聚焦首个错误。只读字段使用文本或浅底，不混同可编辑控件。

### Navigation

深蓝侧栏上的浅色文字与本地 SVG 线性图标；选中项用主蓝和白字，hover 使用深蓝亮阶。菜单行内边距（12px 14px），字号（13px），子菜单为（10px 12px）。当前项使用 `aria-current`，展开控件使用 `aria-expanded`；折叠保留角色过滤与可辨认名称。业务路径只是导航，不能把单证与收款的并行流程改成串行门禁。

### Tags

统一使用现有状态组件：浅语义色底、对应文字色、左侧（5px）同色圆点，高度（25px），横向内边距（9px）。状态、类别与版本保持文字表达；不要以单独彩点替代状态名称。

### Cards / Containers

白底、轻边框、Panel 圆角。工作台数字卡 hover 改变底色与边框，首卡沿用深蓝变化，不增加升降位移。表格工具栏、表格、分页构成连续面板，不逐段增加阴影。

系统管理中的用户表和角色权限矩阵使用专用表格卡片：外层内边距为（0），内部表格容器外边距为（0），取消内部重复边框和圆角，由外层保留边界与裁切。普通内容卡片保持原有内边距。

### Filters / Tables / Tabs

订单列表提供基本筛选、更多筛选、重置和查询；高级区展开有分隔线。工具栏显示记录数量和紧凑行距状态。表头浅灰底、内边距（14px 16px），默认单元格（16px）；订单表横向（12px），紧凑行纵向（9px）。辅助字段降低颜色层级。页签为浅灰蓝连体底座上的白色选中段，以文字和背景共同表示当前页。

财务与审核表格的日期、时间和人员列保持单行，日期同时使用等宽数字。表格中的普通次级小按钮使用透明底、轻描边，悬停使用浅蓝底；此规则排除主操作、成功与危险按钮，保留其各自语义色。

### 登录角色下拉框 / 快速检索

“演示角色”标签关联原生 `select#login-role`，包含五个“角色 · 姓名”选项；姓名与角色相同的管理员选项去重显示。下方 `aria-live` 更新“演示部门”，并通过 `aria-describedby` 与选择器关联。选择遵循浏览器原生键盘行为，切换保留账号和密码输入；提交中禁用下拉框，账号或密码输入内 Enter 登录保持不变。

角色下拉框与登录输入使用相同背景、边框（#d7dfeb）、圆角和（14px）字号；左右基础内边距（14px），右侧留出（44px）容纳装饰箭头。悬停边框为（#9aaecb），聚焦为主蓝边框、白底与既有焦点环；禁用态透明度（.55）。右侧（16px）SVG chevron 旋转（90deg）朝下，仅作提示，设置 `aria-hidden` 和 `pointer-events:none`。

顶栏按钮或 `⌘/Ctrl K` 打开本地检索，最多展示（9）项当前角色可访问的页面、订单、单证及业务员客户。输入使用 `combobox`，结果使用 `listbox/option` 与活动后代关联；上下方向键循环选择，Enter 打开，Esc 关闭；无结果时保留提示和可继续输入的焦点。不发送网络请求。

### Dialog / Feedback / Motion

共享弹窗使用具名 `dialog` 和 `aria-modal`；打开后主体 `inert`、页面停止滚动，焦点进入首个字段或关闭按钮。Tab/Shift+Tab 限定在可见可用控件之间，Esc 关闭；关闭时恢复背景和仍存在的触发元素焦点。危险操作在确认框内说明影响。键盘委托遇到 `isComposing` 或键码（229）立即返回，中文输入法选词不会误触发快捷键、搜索跳转或登录提交。

| 动效 | 时长 | 当前用途 |
|---|---|---|
| 快速状态反馈 | 140ms | 按钮、输入、导航、页签、表格 hover 与 Toast 离场 |
| 轻浮层 | 180ms | 弹窗遮罩、通知下拉 |
| 导航展开 | 200ms | 子菜单淡入并上移复位；登录连接线的启动延时 |
| 侧栏收起/展开 | 220ms | 原生 Web Animations 平移补间，不反复重建当前表单 |
| 路由进入 | 240ms | 内容由（7px）下方与（.3）透明度进入；导航箭头旋转同级 |
| 弹窗/Toast 进入 | 280ms | 弹窗（16px / .985）位移与缩放；Toast（12px）上移 |
| 图表进入 | 420ms | 横条/柱形用 transform 展开，不逐帧修改业务数值 |
| 登录流程连接 | 560ms | 单证/收款支线连接线展开 |
| 提交中 | 700ms 循环 | 小尺寸旋转指示，配合禁用与 loading 状态 |

进入与布局动效使用 `cubic-bezier(.16,1,.3,1)`；原生 API 不可用时直接显示最终内容。同一路由重绘保留滚动位置和可恢复的输入焦点，不重播路由入场。`prefers-reduced-motion: reduce` 关闭 CSS 动画、过渡和滚动动画；JS 同时跳过侧栏与路由动画。动效的完成不是数据成功信号。

### 独立订单进度与纸张审核

订单、单证、收款三块等宽进度同时保留标题与状态。订单和单证使用步骤条，收款使用金额、比例和状态文字。它们是并行业务信息，不生成一个合并总进度。

单证标题包含类型、编号、版本与状态，纸张上方显示当前审核反馈和只读/编辑说明；右侧按单据信息、制单或审核、导出分组。主管不能自制自审，管理员无业务审批权；已通过单证修改生成新版本。视觉精修不能绕过这些已有约束。

只读交易数据、可编辑的唛头/包装/备注和英文文书字段保持不同视觉身份。专注预览与侧栏收起不重建当前编辑表单。收款按订单币种展示，统计金额按币种分列。

## Do's and Don'ts

### Do:

- Do 沿用深蓝导航、操作蓝、灰底、白色平面面板与系统中文字体。
- Do 用角色概览、近期订单与待办接续工作，单证页面让纸张与业务操作并置。
- Do 用角色与业务状态决定可用动作，让只读、退回、错误和禁用原因可读。
- Do 将金额右对齐并保留币种，月份标签保留年份。
- Do 保持普通 HTML/CSS/JS、file://、本地 SVG 与全局 data-action 委托。
- Do 保留可见键盘焦点、中文输入法保护和减少动效下的完整操作能力。

### Don't:

- Don't 因参考模板使用框架而引入框架、构建工具、CDN、外部字体或图片。
- Don't 合并订单、单证、收款状态，或在订单列表增加直接新建订单。
- Don't 用颜色替代状态文字，或用不明原因的灰色控件替代权限说明。
- Don't 持久化业务写入或把假登录、假分页、导出演示描述为真实后台功能；业务数据刷新后还原。
- Don't 把代码实现、设计规范或静态检查通过写成浏览器、全业务或生产验收通过。
