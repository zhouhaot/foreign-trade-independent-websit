# TradePlus - 外贸独立站系统

TradePlus 是一款面向中小型外贸企业的独立站系统，帮助您展示产品、接收客户询盘、管理网站内容。

## 技术栈

**后端：** Spring Boot 3.2 / MyBatis / SQLite / Thymeleaf / Spring Security
**前端：** Vue 3 / Vite / Vue Router / Vue I18n / Axios

---

## 环境准备

在运行本项目前，请确保已安装以下工具：

| 工具 | 最低版本 | 下载地址 |
|------|----------|----------|
| **JDK** | 17 | https://adoptium.net/ |
| **Node.js** | 18 LTS | https://nodejs.org/ |
| **IntelliJ IDEA** | Community 即可 | https://www.jetbrains.com/idea/ |

> 数据库使用 SQLite，无需额外安装。

---

## 快速启动

### 第一步：启动后端（IntelliJ IDEA）

1. 打开 IntelliJ IDEA
2. 选择 **Open** → 找到 `E:\TradeSite\backend` 文件夹 → 点击 **OK**
3. IDEA 会自动检测 `pom.xml`，弹出提示框 → 点击 **Load Maven Project**（或右下角的 Maven 图标确认导入）
4. 等待 IDEA 下载所有依赖（右下角进度条，首次约 2-3 分钟）
5. 打开 `src/main/java/com/tradesite/TradeSiteApplication.java`
6. 点击类名旁边的绿色 ▶ 按钮，选择 **Run 'TradeSiteApplication'**

看到 `Started TradeSiteApplication in x seconds` 表示后端启动成功。

> 访问 http://localhost:8080/admin/login 可进入后台登录页

### 第二步：启动前端（命令行）

打开一个新的终端/PowerShell 窗口：

```bash
cd E:\TradeSite\frontend
npm install
npm run dev
```

看到 `Local: http://localhost:5173/` 表示前端启动成功。

> 如果 npm 速度慢，可先设置国内镜像：
> `npm config set registry https://registry.npmmirror.com`

### 第三步：访问网站

- **前台**：http://localhost:5173 （产品展示，客户看到的页面）
- **后台**：http://localhost:8080/admin/login
  - 用户名：`admin`
  - 密码：`admin123`

---

## 后台管理功能

| 功能 | 说明 |
|------|------|
| Dashboard | 产品数、询盘数等统计概览 |
| Products | 产品增删改查，支持图片上传 |
| Categories | 产品分类管理（中英文） |
| Inquiries | 查看客户询盘，标记已读 |

---

## 前台页面

| 路径 | 说明 |
|------|------|
| `/` | 首页：精选产品 + 品牌介绍 |
| `/products` | 产品列表：分类筛选 |
| `/products/:id` | 产品详情：规格参数 + 询盘入口 |
| `/about` | 关于我们：企业介绍 |
| `/contact` | 联系我们：询盘表单 |

前台支持 **中/英文切换**（点击导航栏右上角的「中/EN」按钮）。

---

## 项目结构

```
TradeSite/
├── backend/                        # Spring Boot 后端
│   ├── pom.xml                     # Maven 依赖配置
│   └── src/main/
│       ├── java/com/tradesite/
│       │   ├── config/             # 安全、跨域配置
│       │   ├── controller/admin/   # 后台页面控制器
│       │   ├── controller/api/     # 前台 API 控制器
│       │   ├── entity/             # 数据实体
│       │   ├── mapper/             # MyBatis 接口
│       │   └── service/            # 业务逻辑
│       └── resources/
│           ├── application.yml     # 应用配置
│           ├── db/                 # 建表 + 示例数据
│           ├── mapper/             # MyBatis XML
│           ├── templates/admin/    # 后台 Thymeleaf 模板
│           └── uploads/            # 产品图片
│
├── frontend/                       # Vue 3 前端
│   ├── package.json
│   ├── vite.config.js              # Vite 配置 + API 代理
│   └── src/
│       ├── api/                    # API 封装
│       ├── assets/                 # 全局样式
│       ├── components/             # 导航栏、页脚
│       ├── i18n/                   # 中英双语翻译
│       ├── router/                 # 页面路由
│       └── views/                  # 5 个页面组件
│
└── README.md
```

---

## 常见问题

**Q: IDEA 打开后没有自动导入 Maven？**
→ 右键点击 `pom.xml` → **Add as Maven Project**，或点击右侧 Maven 面板的刷新按钮。

**Q: 后端启动报错 `Port 8080 already in use`？**
→ 端口被占用。关闭占用 8080 的程序，或修改 `application.yml` 中的 `server.port`。

**Q: 前台页面空白，控制台报错？**
→ 确保后端已在 8080 端口启动。前端通过 Vite 代理请求到后端。

**Q: 如何切换到 MySQL 数据库？**
→ 修改 `application.yml` 数据源配置，`pom.xml` 换成 MySQL 依赖，SQL 语法基本兼容。

---

## V2 计划

- 新闻/博客模块
- 轮播图后台管理
- SEO 优化（sitemap、meta 标签）
- 邮件通知（收到询盘自动提醒）
- 在线客服集成
- 多语言扩展（西班牙语、法语等）
- 部署到云服务器
