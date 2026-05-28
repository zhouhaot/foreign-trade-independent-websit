# TradePlus — 外贸独立站系统

TradePlus 是一款面向中小型外贸企业的独立站系统，用于展示点钞机、验钞机等金融设备产品，接收客户询盘，管理网站内容。支持中英双语，采用现代化 B2B 外贸企业风设计。

## 技术栈

| 层级 | 技术 |
|------|------|
| **后端** | Spring Boot 3.2 / MyBatis (注解) / SQLite / Spring Security / JavaMail |
| **前台** | Vue 3 / Vite / Vue Router / Vue I18n / Axios |
| **后台** | Thymeleaf + Bootstrap (计划迁移至 Vue 3 + Element Plus) |
| **设计** | Inter 字体 / CSS 自定义属性 / 外贸企业风 (亮色专业 B2B) |

---

## 环境准备

| 工具 | 最低版本 | 下载地址 |
|------|----------|----------|
| JDK | 17 | https://adoptium.net/ |
| Node.js | 18 LTS | https://nodejs.org/ |
| IntelliJ IDEA | Community | https://www.jetbrains.com/idea/ |

> 数据库使用 SQLite，无需额外安装。

---

## 快速启动

### 1. 启动后端 (IntelliJ IDEA)

1. IDEA → Open → 选择 `E:\TradeSite\backend` → OK
2. 等待 Maven 依赖下载完成（右下角进度条，首次约 2-3 分钟）
3. 打开 `TradeSiteApplication.java`，点击绿色 ▶ 运行

看到 `Started TradeSiteApplication in x seconds` 即启动成功。

> ⚠️ 务必从 IDEA 启动后端 — SQLite 数据库文件 (`tradeplus.db`) 的创建位置取决于工作目录。

### 2. 启动前端

```bash
cd E:\TradeSite\frontend
npm install   # 首次
npm run dev   # http://localhost:5173
```

### 3. 访问

| 入口 | 地址 | 说明 |
|------|------|------|
| 前台首页 | http://localhost:5173 | 客户看到的页面，支持中/英切换 |
| 后台登录 | http://localhost:8080/admin/login | admin / admin123 |

---

## 前台页面 (7 页)

| 路由 | 页面 | 说明 |
|------|------|------|
| `/` | 首页 | 轮播图 + 精选产品 + 服务流程 + 合作伙伴 + 团队介绍 |
| `/products` | 产品中心 | 分类筛选 + 搜索 + 横版产品卡片（含规格摘要） |
| `/products/:id` | 产品详情 | 规格参数表 + 询盘 CTA 横幅 |
| `/news` | 新闻资讯 | 9 篇文章，支持中英文内容 |
| `/news/:id` | 新闻详情 | Markdown 渲染，封面大图 |
| `/about` | 关于我们 | 企业故事 + 数据统计 + 使命愿景 |
| `/contact` | 联系我们 | 询盘表单 + 联系方式 + 信任徽章 |

前台右上角「中 / EN」按钮可切换语言。

---

## 后台管理功能

| 模块 | 功能 |
|------|------|
| Dashboard | 产品数、询盘数、文章数统计 |
| Products (15) | 产品 CRUD + 图片上传 + 规格 JSON 编辑 |
| Categories (5) | 分类管理（中英文名称）|
| Articles (9) | 新闻增删改查 + Markdown 编辑 |
| Banners (3) | 首页轮播图管理 |
| Inquiries | 客户询盘查看 + 标记已读 + 邮件通知 |

---

## API 接口

所有 `/api/*` 返回统一格式 `Result<T>`：

```json
{"code": 200, "message": "success", "data": [...]}
```

| 端点 | 说明 |
|------|------|
| `GET /api/products` | 产品列表（支持 ?categoryId=&keyword=） |
| `GET /api/products/:id` | 产品详情 |
| `GET /api/categories` | 分类列表 |
| `GET /api/articles` | 文章列表 |
| `GET /api/articles/:id` | 文章详情 |
| `GET /api/banners` | 轮播图列表 |
| `POST /api/inquiries` | 提交询盘 |

---

## 项目结构

```
TradeSite/
├── backend/
│   ├── pom.xml
│   └── src/main/
│       ├── java/com/tradesite/
│       │   ├── config/          # SecurityConfig, WebConfig, DataInitConfig
│       │   ├── controller/api/  # ApiController — 前台 REST API
│       │   ├── controller/admin/# AdminController — Thymeleaf 后台
│       │   ├── entity/          # Lombok @Data 实体
│       │   ├── mapper/          # MyBatis 注解式 Mapper
│       │   ├── service/         # 业务逻辑层
│       │   └── common/          # Result 响应包装
│       └── resources/
│           ├── application.yml
│           ├── db/schema.sql    # 建表 DDL
│           ├── db/data.sql      # 种子数据
│           ├── templates/admin/ # Thymeleaf 模板
│           └── uploads/         # 产品/文章/轮播图 SVG
│
├── frontend/
│   ├── vite.config.js           # Vite + API 代理
│   └── src/
│       ├── api/index.js         # Axios 封装
│       ├── assets/main.css      # 设计令牌 + 全局样式
│       ├── components/          # AppHeader, AppFooter
│       ├── i18n/index.js        # 中英双语 (zh/en)
│       ├── router/index.js      # Vue Router 路由
│       └── views/               # 7 个页面组件
│
├── CLAUDE.md                    # AI 辅助开发文档
└── README.md
```

---

## 已实现功能

- [x] 产品展示（分类筛选 + 关键词搜索）
- [x] 产品规格参数（JSON 存储，表格展示）
- [x] 新闻/博客模块（9 篇文章，Markdown 渲染）
- [x] 首页轮播图管理
- [x] 客户询盘表单 + 邮件通知
- [x] 中英双语切换 (vue-i18n)
- [x] SEO 优化（sitemap、meta、Open Graph）
- [x] 外贸企业风 UI（亮色专业 B2B 设计）
- [x] 响应式布局（手机/平板/桌面）

## 进行中

- [ ] 后台管理迁移至 Vue 3 SPA + Element Plus（若依式布局）
- [ ] 后台 REST API 层（JWT 认证）
- [ ] 产品真实图片替换

---

## 常见问题

**Q: IDEA 打开后未自动导入 Maven？**
右键 `pom.xml` → Add as Maven Project，或点击右侧 Maven 面板刷新。

**Q: 后端启动报错 `Port 8080 already in use`？**
关闭占用 8080 端口的程序，或修改 `application.yml` 中 `server.port`。

**Q: 前台页面空白？**
确保后端已在 8080 端口运行。前端通过 Vite 代理 `/api` 和 `/uploads` 到后端。

**Q: 如何重置数据库？**
删除 `tradeplus.db` 重启后端即可重建。种子数据在 `data.sql` 中。

**Q: 如何添加新产品图片？**
将图片放入 `backend/src/main/resources/uploads/`，在后台管理中选择对应文件。
