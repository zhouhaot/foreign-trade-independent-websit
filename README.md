# TradePlus — 外贸独立站系统

TradePlus 是一款面向中小型外贸企业的独立站系统，用于展示点钞机、验钞机等金融设备产品，接收客户询盘，管理网站内容。支持中英双语，采用现代化 B2B 外贸企业风设计。

## 技术栈

| 层级 | 技术 |
|------|------|
| **后端** | Spring Boot 3.2 / MyBatis (注解) / SQLite / Spring Security / JWT / JavaMail |
| **前台** | Vue 3 / Vite / Vue Router / Vue I18n / Axios / DOMPurify |
| **后台** | Vue 3 + Element Plus (SPA) / Pinia / JWT 认证 / 若依式布局 |
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

### 1. 首次配置

```bash
# 设置管理员初始密码（仅首次启动时需要，用于创建 admin 用户）
# Windows PowerShell:
$env:ADMIN_INITIAL_PASSWORD = "your-strong-password"

# macOS / Linux:
export ADMIN_INITIAL_PASSWORD=your-strong-password
```

> 不设置此环境变量则不会自动创建 admin 用户。对于已有数据库，此变量无需设置。

### 2. 启动后端 (IntelliJ IDEA)

1. IDEA → Open → 选择 `backend/` → OK
2. 等待 Maven 依赖下载完成（首次约 2-3 分钟）
3. 在 IDEA 的 Run Configuration 中设置环境变量 `ADMIN_INITIAL_PASSWORD`
4. 打开 `TradeSiteApplication.java`，点击绿色 ▶ 运行

看到 `Started TradeSiteApplication in x seconds` 即启动成功。

> ⚠️ 务必从 IDEA 启动后端 — SQLite 数据库文件 (`tradeplus.db`) 的创建位置取决于工作目录。

### 3. 启动前台

```bash
cd frontend
npm install    # 首次
npm run dev    # http://localhost:5173
```

### 4. 启动管理后台

```bash
cd frontend-admin
npm install    # 首次
npm run dev    # http://localhost:5174
```

### 5. 访问

| 入口 | 地址 | 说明 |
|------|------|------|
| 前台首页 | http://localhost:5173 | 客户看到的页面，支持中/英切换 |
| 管理后台 | http://localhost:5174 | Vue SPA，使用 ADMIN_INITIAL_PASSWORD 创建的账号登录 |
| 旧版后台 | http://localhost:8080/admin/login | Thymeleaf 后台（保留兼容） |

---

## 构建（生产环境）

```bash
# 后端（需要 JDK 17）
cd backend
./mvnw clean package -DskipTests
# 输出: target/tradeplus-backend-1.0.0.jar

# 前台
cd frontend
npm install
npm run build
# 输出: dist/

# 管理后台
cd frontend-admin
npm install
npm run build
# 输出: dist/
```

---

## 前台页面 (7 页)

| 路由 | 页面 | 说明 |
|------|------|------|
| `/` | 首页 | 轮播图 + 精选产品 + 服务流程 + 合作伙伴 + 团队介绍 |
| `/products` | 产品中心 | 分类筛选 + 搜索 + 横版产品卡片（含规格摘要） |
| `/products/:id` | 产品详情 | 规格参数表 + 询盘 CTA 横幅 |
| `/news` | 新闻资讯 | 9 篇文章，支持中英文内容 |
| `/news/:id` | 新闻详情 | Markdown 渲染 + DOMPurify XSS 防护 |
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

### 前台公开 API

| 端点 | 说明 |
|------|------|
| `GET /api/products` | 产品列表（支持 `?categoryId=&keyword=`） |
| `GET /api/products/featured` | 精选产品（`?limit=8`） |
| `GET /api/products/:id` | 产品详情（仅返回已发布） |
| `GET /api/categories` | 分类列表 |
| `GET /api/articles` | 文章列表（`?limit=10`） |
| `GET /api/articles/:id` | 文章详情（仅返回已发布） |
| `GET /api/banners` | 轮播图列表 |
| `POST /api/inquiries` | 提交询盘 |

### 管理后台 API (`/admin/api/*`)

需 JWT 认证（`Authorization: Bearer <token>`），登录接口除外。

| 端点 | 说明 |
|------|------|
| `POST /admin/api/auth/login` | 登录，返回 JWT token |
| `GET /admin/api/dashboard/stats` | 5 项统计数据 |
| `GET/POST /admin/api/products` | 产品列表 / 新增 |
| `GET/PUT/DELETE /admin/api/products/:id` | 产品详情 / 修改 / 删除 |
| `GET/POST /admin/api/categories` | 分类列表 / 新增 |
| `GET/PUT/DELETE /admin/api/categories/:id` | 分类详情 / 修改 / 删除 |
| `GET/POST /admin/api/articles` | 文章列表 / 新增 |
| `GET/PUT/DELETE /admin/api/articles/:id` | 文章详情 / 修改 / 删除 |
| `GET/POST /admin/api/banners` | 轮播图列表 / 新增 |
| `GET/PUT/DELETE /admin/api/banners/:id` | 轮播图详情 / 修改 / 删除 |
| `GET /admin/api/inquiries` | 询盘列表 |
| `PUT /admin/api/inquiries/:id/read` | 标记已读 |
| `DELETE /admin/api/inquiries/:id` | 删除询盘 |
| `POST /admin/api/upload` | 图片上传 |

---

## 项目结构

```
TradeSite/
├── backend/
│   ├── pom.xml
│   ├── mvnw.cmd                        # Maven wrapper (Windows)
│   └── src/main/
│       ├── java/com/tradesite/
│       │   ├── config/                 # SecurityConfig, WebConfig, DataInitConfig, JwtTokenProvider
│       │   ├── controller/api/         # ApiController — 前台 REST API
│       │   ├── controller/admin/       # AdminController (Thymeleaf) + AdminApiController (REST)
│       │   ├── entity/                 # Lombok @Data 实体
│       │   ├── mapper/                 # MyBatis 注解式 Mapper
│       │   ├── service/                # 业务逻辑层
│       │   └── common/                 # Result 响应包装
│       └── resources/
│           ├── application.yml
│           ├── db/schema.sql           # 建表 DDL
│           ├── db/data.sql             # 种子数据（首次初始化）
│           ├── templates/admin/        # Thymeleaf 模板
│           └── uploads/                # 种子图片 SVG
│
├── frontend/
│   ├── vite.config.js                  # Vite + API 代理
│   └── src/
│       ├── api/index.js                # Axios 封装
│       ├── assets/main.css             # 设计令牌 + 全局样式
│       ├── components/                 # AppHeader, AppFooter
│       ├── i18n/index.js               # 中英双语 (zh/en)
│       ├── router/index.js             # Vue Router 路由
│       └── views/                      # 7 个页面组件
│
├── frontend-admin/
│   ├── vite.config.js                  # Vite + API 代理
│   └── src/
│       ├── api/index.js                # Axios + JWT 拦截器
│       ├── stores/auth.js              # Pinia 认证状态
│       ├── router/index.js             # Vue Router (Hash 模式)
│       ├── layout/Layout.vue           # 若依式侧边栏布局
│       └── views/                      # 登录、Dashboard、CRUD 页面
│
├── tradeplus.db                        # SQLite 数据库文件
├── CLAUDE.md                           # AI 辅助开发文档
└── README.md
```

---

## 环境变量

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `ADMIN_INITIAL_PASSWORD` | 首次启动时创建的 admin 用户密码 | 无（不设置则不创建） |
| `JAVA_HOME` | JDK 安装路径 | — |

`application.yml` 中可通过 Spring profile 或环境变量覆盖的配置项：

| 配置项 | 说明 | 默认值 |
|--------|------|--------|
| `app.jwt-secret` | JWT 签名密钥 | `TradePlusSecretKey2024ForAdminApiJWT` |
| `app.jwt-expiration-ms` | JWT 过期时间（毫秒） | `86400000`（24小时） |
| `app.upload-dir` | 上传文件存储目录 | `./uploads` |
| `spring.mail.*` | SMTP 邮件配置 | 占位符，需自行配置 |
| `server.port` | 后端端口 | `8080` |

> ⚠️ 生产环境务必通过环境变量覆盖 `app.jwt-secret` 和邮件配置。

---

## 安全说明

### 已实施的安全措施

- **数据库持久化**：`sql.init.mode` 设为 `never`，重启不再清空数据
- **JWT 密钥外置**：通过 `app.jwt-secret` 配置项注入，不再硬编码
- **管理员密码**：通过 `ADMIN_INITIAL_PASSWORD` 环境变量设置，不预设默认值
- **上传文件校验**：白名单扩展名 + MIME 类型校验 + 防路径穿越
- **XSS 防护**：前台文章详情使用 DOMPurify 净化 HTML
- **公开 API 过滤**：前台接口仅返回 `status=1` 的已发布内容

### 生产环境 Checklist

- [ ] 设置强随机 `app.jwt-secret`（建议 256 位以上）
- [ ] 配置真实 SMTP 邮件服务
- [ ] 将 `sql.init.mode` 保持为 `never`
- [ ] 使用绝对路径配置 `app.upload-dir`
- [ ] 前端构建后部署到 Nginx，配置 `try_files` 回退（前台 history 模式）
- [ ] 配置 HTTPS
- [ ] 管理后台登录页不预填账号密码
- [ ] 定期备份 `tradeplus.db` 和 `uploads/` 目录

---

## 常见问题

**Q: IDEA 打开后未自动导入 Maven？**
右键 `pom.xml` → Add as Maven Project，或点击右侧 Maven 面板刷新。

**Q: 后端启动报错 `Port 8080 already in use`？**
关闭占用 8080 端口的程序，或修改 `application.yml` 中 `server.port`。

**Q: 前台页面空白？**
确保后端已在 8080 端口运行。前端通过 Vite 代理 `/api` 和 `/uploads` 到后端。

**Q: 如何重置数据库？**
删除 `tradeplus.db`，重启后端即可重建表结构。种子数据仅在全新数据库时自动插入。

**Q: 忘记管理员密码怎么办？**
删除 `tradeplus.db` 中的 admin 用户记录，重启时设置 `ADMIN_INITIAL_PASSWORD` 环境变量即可重建。

**Q: 如何添加新产品图片？**
通过管理后台的图片上传功能上传，上传的文件存储在 `app.upload-dir` 配置的目录中。

**Q: 管理后台 `npm run build` 失败？**
确保先执行 `npm install`。如仍有问题，删除 `node_modules/` 后重新安装。

**Q: Maven 构建失败提示 `maven-wrapper.properties` 不存在？**
`.mvn/wrapper/` 目录需包含 `maven-wrapper.jar` 和 `maven-wrapper.properties` 两个文件。

---

## 部署架构

推荐的 Nginx 反向代理配置：

```nginx
server {
    listen 80;
    server_name your-domain.com;

    # 前台 SPA (history 模式)
    location / {
        root /opt/tradeplus/frontend-dist;
        try_files $uri $uri/ /index.html;
    }

    # 管理后台 SPA (hash 模式)
    location /admin-spa/ {
        alias /opt/tradeplus/admin-dist/;
        try_files $uri $uri/ /admin-spa/index.html;
    }

    # API 代理
    location /api/ {
        proxy_pass http://127.0.0.1:8080;
    }
    location /admin/ {
        proxy_pass http://127.0.0.1:8080;
    }

    # 上传文件（直接由 Nginx 提供）
    location /uploads/ {
        alias /opt/tradeplus/uploads/;
    }
}
```

启动后端 jar：

```bash
export ADMIN_INITIAL_PASSWORD=<strong-password>
export JWT_SECRET=<random-secret>
java -jar tradeplus-backend-1.0.0.jar
```
