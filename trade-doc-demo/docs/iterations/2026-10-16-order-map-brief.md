# 工作台全球订单地图

用户已确认：借鉴 https://huzzjl3yvzkig.ok.kimi.link 的全球交易点阵地图、光点和流动线；放在工作台、沿用紫色、保留原订单列表。属于既有页面局部扩展，code-led；不做新视觉世界或整站重排。

## Direction contract

THESIS：以全球分布识别客户国家，再查看对应订单；不是物流追踪屏，也不取代待办与近期订单。

OWN-WORLD：继承 A 珍珠白/鸢尾紫/系统中文字体与白面板。浅紫点阵地形、紫色具名节点、窄分布详情栏，不引外部依赖。

STORY：先读7笔/5国和分币种金额，点国家或文字按钮筛选，回全部或打开有权订单。缺客户、未知国家归地点待补；不猜城市或出货地。金额异常明确待核对。

FIRST VIEWPORT：角色指标下方一块全宽地图，左侧地图约四分之三、右侧分币种汇总；地图下方国家文字按钮及筛选订单，原待办/近期订单完整保留。1280–1440桌面无页面横溢。

FORM：用户锁定参考页的局部地图形式，无概念抽签/seed key（窄范围延伸例外）。具名原生国家按钮、aria-pressed、独立短播报；一次光迹可重播，减少动效停用动画，连线只作视觉示意。

FINISH：unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## 边界与验证

地图仅对启用订单详情模块的业务角色显示并在操作重验，不给管理员新增业务入口。沿用当前Demo全量样例可见范围，不将生产权限设计当已实现。不改Mock、三进度、交易/收款/单证写动作。地形用Natural Earth 110m公共领域land生成本地SVG，无国家边界、无运行时请求；国家锚点是人工配置的近似中心，不是客户实际地址。默认纳入所有状态的现有订单，取消订单也保留记录及原状态。
