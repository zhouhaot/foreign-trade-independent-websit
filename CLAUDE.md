# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Run

```bash
# Backend (Spring Boot 3.2, JDK 17)
cd backend
./mvnw.cmd compile              # Windows
./mvnw spring-boot:run          # or run `TradeSiteApplication` in IntelliJ IDEA
# Starts on http://localhost:8080

# Frontend (Vue 3 + Vite)
cd frontend
npm install                     # first time only
npm run dev                     # Starts on http://localhost:5173

# Admin panel (Vue 3 + Element Plus)
cd frontend-admin
npm install                     # first time only
npm run dev                     # Starts on http://localhost:5174
```

**Always run the backend from IDEA**, not CLI — the working directory determines where the SQLite database file is created (`tradeplus.db` relative to CWD).

**Maven wrapper**: On Windows use `mvnw.cmd`, on Linux/macOS use `mvnw`. The `.mvn/wrapper/maven-wrapper.properties` file is required for the wrapper to work.

## Architecture Overview

```
frontend/  (Vue 3 SPA, port 5173)         backend/  (Spring Boot, port 8080)
├── src/views/   ← page components        ├── controller/api/   ← REST API (/api/*)
├── src/api/      ← axios client           ├── controller/admin/ ← Thymeleaf admin panel (/admin/*)
├── src/router/   ← vue-router             ├── service/          ← business logic
├── src/i18n/     ← vue-i18n (zh + en)     ├── mapper/           ← MyBatis (annotation-based)
├── vite.config.js → proxies /api, /uploads to :8080
│                                           ├── entity/           ← Lombok @Data POJOs
│                                           ├── config/           ← SecurityConfig, WebConfig, DataInitConfig
│                                           ├── common/Result.java ← {code, message, data} wrapper
│                                           └── db/               ← schema.sql + data.sql
```

**Two frontends coexist:**
- **Customer-facing SPA**: Vue 3 at `:5173`, bilingual (zh/en via `vue-i18n`), routes: `/`, `/products`, `/news`, `/about`, `/contact`
- **Admin panel**: Server-rendered Thymeleaf at `:8080/admin/*`, protected by Spring Security form login

## Key Patterns & Gotchas

### MyBatis Configuration (CRITICAL)

`mybatis` must be a **top-level** key in `application.yml`, NOT nested under `spring:`:
```yaml
mybatis:
  configuration:
    map-underscore-to-camel-case: true   # ← top level, NOT spring.mybatis
```

- **Mappers with `@Results`** (ProductMapper): explicit column → property mapping. Works regardless of config.
- **Mappers without `@Results`** (ArticleMapper, BannerMapper, ProductCategoryMapper, InquiryMapper): rely entirely on `map-underscore-to-camel-case`. If this setting doesn't load, ALL fields except `id` return `null`.
- **All mappers use annotations** (`@Select`, `@Insert`, `@Update`, `@Delete`). No XML mapper files — deleted to fix classpath resource loading issues in IDEA.
- Dynamic SQL uses `<script>` tags in `@Select` annotations.
- SQLite uses `||` for string concatenation (not `CONCAT()`).

### Database Initialization

`sql.init.mode` is set to `never` — data persists across restarts.

On first startup (empty database):
1. `schema.sql` runs → `CREATE TABLE IF NOT EXISTS` (idempotent)
2. `data.sql` runs → `INSERT OR IGNORE` seed data (15 products, 9 articles, 3 banners, 5 categories)
3. `DataInitConfig` (CommandLineRunner) checks `ADMIN_INITIAL_PASSWORD` env var — if set, creates admin user with BCrypt-encoded password

**To reset the database**: delete `tradeplus.db` and restart. The file is created at the working directory (usually `E:/TradeSite/tradeplus.db` when run from IDEA).

### Admin Login

- URL: `http://localhost:8080/admin/login`
- Credentials: Set `ADMIN_INITIAL_PASSWORD` env var before first startup
- Password is BCrypt-encoded by `DataInitConfig` at startup (not stored in data.sql)
- CSRF is disabled in `SecurityConfig`
- `/api/**`, `/uploads/**`, `/admin/login` are `permitAll`; `/admin/**` requires authentication

### Static Files & Uploads

- Images served via `classpath:/uploads/` + `file:${app.upload-dir}/` by `WebConfig.addResourceHandlers`
- All seed images are SVGs in `backend/src/main/resources/uploads/`
- Runtime uploads go to `app.upload-dir` (default `./uploads`, set to absolute path in production)
- Frontend uses `@error="e => e.target.src='/uploads/placeholder.svg'"` fallback on all `<img>` tags
- Vite proxies `/uploads` to `localhost:8080`
- Upload enforces file extension and MIME type whitelist (images + PDF only)

### API Response Format

All `/api/*` endpoints return `Result<T>`:
```json
{"code": 200, "message": "success", "data": [...]}
```
Frontend accesses data as `res.data.data` (axios unwraps HTTP body → `.data`, then Result wrapper → `.data`).

### Frontend i18n

Default locale is `zh`. Language-aware display pattern used everywhere:
```vue
{{ locale === 'zh' ? item.nameCn : item.nameEn }}
```

## Project File Map

| Concern | Location |
|---------|----------|
| API routes | `backend/.../controller/api/ApiController.java` |
| Admin routes | `backend/.../controller/admin/AdminController.java` |
| Auth config | `backend/.../config/SecurityConfig.java` |
| Admin seeding | `backend/.../config/DataInitConfig.java` |
| Static resources | `backend/.../config/WebConfig.java` |
| DB schema | `backend/src/main/resources/db/schema.sql` |
| Seed data | `backend/src/main/resources/db/data.sql` |
| App config | `backend/src/main/resources/application.yml` |
| Vite proxy | `frontend/vite.config.js` |
| i18n strings | `frontend/src/i18n/index.js` |
| API client | `frontend/src/api/index.js` |
| SVG images | `backend/src/main/resources/uploads/` |
