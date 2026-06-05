package com.tradesite.controller.admin;

import com.tradesite.common.Result;
import com.tradesite.config.JwtTokenProvider;
import com.tradesite.entity.*;
import com.tradesite.service.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.*;

@RestController
@RequestMapping("/admin/api")
public class AdminApiController {

    @Autowired private ProductService productService;
    @Autowired private ProductCategoryService categoryService;
    @Autowired private ArticleService articleService;
    @Autowired private BannerService bannerService;
    @Autowired private InquiryService inquiryService;
    @Autowired private SysUserService userService;
    @Autowired private PasswordEncoder passwordEncoder;
    @Autowired private JwtTokenProvider jwtTokenProvider;

    @Value("${app.upload-dir:./uploads}")
    private String uploadDirPath;

    private static final Set<String> ALLOWED_EXTENSIONS = Set.of(
        ".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg", ".pdf"
    );
    private static final Set<String> ALLOWED_MIME_TYPES = Set.of(
        "image/jpeg", "image/png", "image/gif", "image/webp",
        "image/svg+xml", "application/pdf"
    );

    // ===== Auth =====

    @PostMapping("/auth/login")
    public Result<Map<String, Object>> login(@RequestBody Map<String, String> body) {
        String username = body.get("username");
        String password = body.get("password");
        try {
            SysUser user = userService.findByUsername(username);
            if (user == null || !passwordEncoder.matches(password, user.getPassword())) {
                return Result.error(401, "用户名或密码错误");
            }
            String token = jwtTokenProvider.generateToken(username);
            Map<String, Object> data = new HashMap<>();
            data.put("token", token);
            data.put("username", username);
            return Result.success(data);
        } catch (Exception e) {
            return Result.error(500, "登录失败: " + e.getMessage());
        }
    }

    // ===== Dashboard =====

    @GetMapping("/dashboard/stats")
    public Result<Map<String, Object>> dashboardStats() {
        Map<String, Object> stats = new LinkedHashMap<>();
        stats.put("productCount", productService.count());
        stats.put("categoryCount", categoryService.findAll().size());
        stats.put("articleCount", articleService.count());
        stats.put("inquiryCount", inquiryService.count());
        stats.put("unreadCount", inquiryService.countUnread());
        return Result.success(stats);
    }

    // ===== Products =====

    @GetMapping("/products")
    public Result<List<Product>> listProducts(
            @RequestParam(required = false) Integer categoryId,
            @RequestParam(required = false) String keyword) {
        if (categoryId != null || (keyword != null && !keyword.isEmpty())) {
            return Result.success(productService.search(categoryId, keyword));
        }
        return Result.success(productService.findAll());
    }

    @GetMapping("/products/{id}")
    public Result<Product> getProduct(@PathVariable Integer id) {
        Product p = productService.findById(id);
        if (p == null) return Result.error(404, "产品不存在");
        return Result.success(p);
    }

    @PostMapping("/products")
    public Result<?> createProduct(@RequestBody Product product) {
        productService.save(product);
        return Result.success("创建成功", null);
    }

    @PutMapping("/products/{id}")
    public Result<?> updateProduct(@PathVariable Integer id, @RequestBody Product product) {
        product.setId(id);
        productService.save(product);
        return Result.success("更新成功", null);
    }

    @DeleteMapping("/products/{id}")
    public Result<?> deleteProduct(@PathVariable Integer id) {
        productService.deleteById(id);
        return Result.success("删除成功", null);
    }

    // ===== Categories =====

    @GetMapping("/categories")
    public Result<List<ProductCategory>> listCategories() {
        return Result.success(categoryService.findAll());
    }

    @GetMapping("/categories/{id}")
    public Result<ProductCategory> getCategory(@PathVariable Integer id) {
        ProductCategory c = categoryService.findById(id);
        if (c == null) return Result.error(404, "分类不存在");
        return Result.success(c);
    }

    @PostMapping("/categories")
    public Result<?> createCategory(@RequestBody ProductCategory category) {
        categoryService.save(category);
        return Result.success("创建成功", null);
    }

    @PutMapping("/categories/{id}")
    public Result<?> updateCategory(@PathVariable Integer id, @RequestBody ProductCategory category) {
        category.setId(id);
        categoryService.save(category);
        return Result.success("更新成功", null);
    }

    @DeleteMapping("/categories/{id}")
    public Result<?> deleteCategory(@PathVariable Integer id) {
        categoryService.deleteById(id);
        return Result.success("删除成功", null);
    }

    // ===== Articles =====

    @GetMapping("/articles")
    public Result<List<Article>> listArticles() {
        return Result.success(articleService.findAll());
    }

    @GetMapping("/articles/{id}")
    public Result<Article> getArticle(@PathVariable Integer id) {
        Article a = articleService.findById(id);
        if (a == null) return Result.error(404, "文章不存在");
        return Result.success(a);
    }

    @PostMapping("/articles")
    public Result<?> createArticle(@RequestBody Article article) {
        articleService.save(article);
        return Result.success("创建成功", null);
    }

    @PutMapping("/articles/{id}")
    public Result<?> updateArticle(@PathVariable Integer id, @RequestBody Article article) {
        article.setId(id);
        articleService.save(article);
        return Result.success("更新成功", null);
    }

    @DeleteMapping("/articles/{id}")
    public Result<?> deleteArticle(@PathVariable Integer id) {
        articleService.deleteById(id);
        return Result.success("删除成功", null);
    }

    // ===== Banners =====

    @GetMapping("/banners")
    public Result<List<Banner>> listBanners() {
        return Result.success(bannerService.findAll());
    }

    @GetMapping("/banners/{id}")
    public Result<Banner> getBanner(@PathVariable Integer id) {
        Banner b = bannerService.findById(id);
        if (b == null) return Result.error(404, "轮播图不存在");
        return Result.success(b);
    }

    @PostMapping("/banners")
    public Result<?> createBanner(@RequestBody Banner banner) {
        bannerService.save(banner);
        return Result.success("创建成功", null);
    }

    @PutMapping("/banners/{id}")
    public Result<?> updateBanner(@PathVariable Integer id, @RequestBody Banner banner) {
        banner.setId(id);
        bannerService.save(banner);
        return Result.success("更新成功", null);
    }

    @DeleteMapping("/banners/{id}")
    public Result<?> deleteBanner(@PathVariable Integer id) {
        bannerService.deleteById(id);
        return Result.success("删除成功", null);
    }

    // ===== Inquiries =====

    @GetMapping("/inquiries")
    public Result<List<Inquiry>> listInquiries() {
        return Result.success(inquiryService.findAll());
    }

    @GetMapping("/inquiries/{id}")
    public Result<Inquiry> getInquiry(@PathVariable Integer id) {
        Inquiry i = inquiryService.findById(id);
        if (i == null) return Result.error(404, "询盘不存在");
        return Result.success(i);
    }

    @PutMapping("/inquiries/{id}/read")
    public Result<?> markInquiryRead(@PathVariable Integer id) {
        inquiryService.markAsRead(id);
        return Result.success("标记已读", null);
    }

    @DeleteMapping("/inquiries/{id}")
    public Result<?> deleteInquiry(@PathVariable Integer id) {
        inquiryService.deleteById(id);
        return Result.success("删除成功", null);
    }

    // ===== File Upload =====

    @PostMapping("/upload")
    public Result<String> upload(@RequestParam("file") MultipartFile file) throws IOException {
        if (file == null || file.isEmpty()) {
            return Result.error(400, "请选择文件");
        }

        // Validate file type by extension
        String originalName = file.getOriginalFilename();
        if (originalName == null || originalName.isEmpty()) {
            return Result.error(400, "文件名不能为空");
        }
        // Reject path traversal attempts
        if (originalName.contains("..") || originalName.contains("/") || originalName.contains("\\")) {
            return Result.error(400, "文件名包含非法字符");
        }
        String ext = "";
        int dotIdx = originalName.lastIndexOf('.');
        if (dotIdx >= 0) {
            ext = originalName.substring(dotIdx).toLowerCase();
        }
        if (!ALLOWED_EXTENSIONS.contains(ext)) {
            return Result.error(400, "不支持的文件类型: " + ext + "，仅允许: " + String.join(", ", ALLOWED_EXTENSIONS));
        }

        // Validate MIME type
        String contentType = file.getContentType();
        if (contentType == null || !ALLOWED_MIME_TYPES.contains(contentType)) {
            return Result.error(400, "不支持的文件格式: " + contentType);
        }

        // Write to configured upload directory
        Path uploadDir = Paths.get(uploadDirPath);
        Files.createDirectories(uploadDir);
        String filename = UUID.randomUUID() + ext;
        Files.copy(file.getInputStream(), uploadDir.resolve(filename));
        return Result.success("/uploads/" + filename);
    }
}
