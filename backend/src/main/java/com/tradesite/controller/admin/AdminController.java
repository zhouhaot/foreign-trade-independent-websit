package com.tradesite.controller.admin;

import com.tradesite.entity.Article;
import com.tradesite.entity.Banner;
import com.tradesite.entity.Inquiry;
import com.tradesite.entity.Product;
import com.tradesite.entity.ProductCategory;
import com.tradesite.service.ArticleService;
import com.tradesite.service.BannerService;
import com.tradesite.service.InquiryService;
import com.tradesite.service.ProductCategoryService;
import com.tradesite.service.ProductService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.servlet.mvc.support.RedirectAttributes;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Set;
import java.util.UUID;

@Controller
@RequestMapping("/admin")
public class AdminController {

    @Autowired
    private ProductService productService;

    @Autowired
    private ProductCategoryService categoryService;

    @Autowired
    private InquiryService inquiryService;

    @Autowired
    private ArticleService articleService;

    @Autowired
    private BannerService bannerService;

    @Value("${app.upload-dir:./uploads}")
    private String uploadDirPath;

    private static final Set<String> ALLOWED_EXTENSIONS = Set.of(
        ".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg", ".pdf"
    );
    private static final Set<String> ALLOWED_MIME_TYPES = Set.of(
        "image/jpeg", "image/png", "image/gif", "image/webp",
        "image/svg+xml", "application/pdf"
    );

    private void uploadImage(MultipartFile file, java.util.function.Consumer<String> setter) throws IOException {
        if (file == null || file.isEmpty()) return;

        String originalName = file.getOriginalFilename();
        if (originalName == null || originalName.isEmpty()) return;
        if (originalName.contains("..") || originalName.contains("/") || originalName.contains("\\")) return;

        String ext = "";
        int dotIdx = originalName.lastIndexOf('.');
        if (dotIdx >= 0) {
            ext = originalName.substring(dotIdx).toLowerCase();
        }
        if (!ALLOWED_EXTENSIONS.contains(ext)) return;

        String contentType = file.getContentType();
        if (contentType == null || !ALLOWED_MIME_TYPES.contains(contentType)) return;

        Path uploadDir = Paths.get(uploadDirPath);
        Files.createDirectories(uploadDir);
        String filename = UUID.randomUUID() + ext;
        Files.copy(file.getInputStream(), uploadDir.resolve(filename));
        setter.accept("/uploads/" + filename);
    }

    // ===== Login =====

    @GetMapping("/login")
    public String loginPage() {
        return "admin/login";
    }

    // ===== Dashboard =====

    @GetMapping("/dashboard")
    public String dashboard(Model model) {
        model.addAttribute("productCount", productService.count());
        model.addAttribute("inquiryCount", inquiryService.count());
        model.addAttribute("unreadCount", inquiryService.countUnread());
        model.addAttribute("categoryCount", categoryService.findAll().size());
        model.addAttribute("articleCount", articleService.count());
        return "admin/dashboard";
    }

    // ===== Categories =====

    @GetMapping("/categories")
    public String categories(Model model) {
        model.addAttribute("categories", categoryService.findAll());
        return "admin/categories";
    }

    @GetMapping("/categories/add")
    public String addCategoryForm(Model model) {
        model.addAttribute("category", new ProductCategory());
        return "admin/category-form";
    }

    @GetMapping("/categories/edit/{id}")
    public String editCategoryForm(@PathVariable Integer id, Model model) {
        model.addAttribute("category", categoryService.findById(id));
        return "admin/category-form";
    }

    @PostMapping("/categories/save")
    public String saveCategory(ProductCategory category, RedirectAttributes redirectAttributes) {
        categoryService.save(category);
        redirectAttributes.addFlashAttribute("success", "Category saved successfully");
        return "redirect:/admin/categories";
    }

    @PostMapping("/categories/delete/{id}")
    public String deleteCategory(@PathVariable Integer id, RedirectAttributes redirectAttributes) {
        categoryService.deleteById(id);
        redirectAttributes.addFlashAttribute("success", "Category deleted successfully");
        return "redirect:/admin/categories";
    }

    // ===== Products =====

    @GetMapping("/products")
    public String products(Model model) {
        model.addAttribute("products", productService.findAll());
        return "admin/products";
    }

    @GetMapping("/products/add")
    public String addProductForm(Model model) {
        model.addAttribute("product", new Product());
        model.addAttribute("categories", categoryService.findAll());
        return "admin/product-form";
    }

    @GetMapping("/products/edit/{id}")
    public String editProductForm(@PathVariable Integer id, Model model) {
        model.addAttribute("product", productService.findById(id));
        model.addAttribute("categories", categoryService.findAll());
        return "admin/product-form";
    }

    @PostMapping("/products/save")
    public String saveProduct(Product product,
                              @RequestParam(value = "imageFile", required = false) MultipartFile imageFile,
                              RedirectAttributes redirectAttributes) throws IOException {
        uploadImage(imageFile, product::setMainImage);
        productService.save(product);
        redirectAttributes.addFlashAttribute("success", "Product saved successfully");
        return "redirect:/admin/products";
    }

    @PostMapping("/products/delete/{id}")
    public String deleteProduct(@PathVariable Integer id, RedirectAttributes redirectAttributes) {
        productService.deleteById(id);
        redirectAttributes.addFlashAttribute("success", "Product deleted successfully");
        return "redirect:/admin/products";
    }

    // ===== Inquiries =====

    @GetMapping("/inquiries")
    public String inquiries(Model model) {
        model.addAttribute("inquiries", inquiryService.findAll());
        return "admin/inquiries";
    }

    @GetMapping("/inquiries/{id}")
    public String viewInquiry(@PathVariable Integer id, Model model) {
        model.addAttribute("inquiry", inquiryService.findById(id));
        inquiryService.markAsRead(id);
        return "admin/inquiry-detail";
    }

    @PostMapping("/inquiries/delete/{id}")
    public String deleteInquiry(@PathVariable Integer id, RedirectAttributes redirectAttributes) {
        inquiryService.deleteById(id);
        redirectAttributes.addFlashAttribute("success", "Inquiry deleted successfully");
        return "redirect:/admin/inquiries";
    }

    // ===== Articles =====

    @GetMapping("/articles")
    public String articles(Model model) {
        model.addAttribute("articles", articleService.findAll());
        return "admin/articles";
    }

    @GetMapping("/articles/add")
    public String addArticleForm(Model model) {
        model.addAttribute("article", new Article());
        return "admin/article-form";
    }

    @GetMapping("/articles/edit/{id}")
    public String editArticleForm(@PathVariable Integer id, Model model) {
        model.addAttribute("article", articleService.findById(id));
        return "admin/article-form";
    }

    @PostMapping("/articles/save")
    public String saveArticle(Article article,
                              @RequestParam(value = "imageFile", required = false) MultipartFile imageFile,
                              RedirectAttributes redirectAttributes) throws IOException {
        uploadImage(imageFile, article::setCoverImage);
        articleService.save(article);
        redirectAttributes.addFlashAttribute("success", "Article saved successfully");
        return "redirect:/admin/articles";
    }

    @PostMapping("/articles/delete/{id}")
    public String deleteArticle(@PathVariable Integer id, RedirectAttributes redirectAttributes) {
        articleService.deleteById(id);
        redirectAttributes.addFlashAttribute("success", "Article deleted successfully");
        return "redirect:/admin/articles";
    }

    // ===== Banners =====

    @GetMapping("/banners")
    public String banners(Model model) {
        model.addAttribute("banners", bannerService.findAll());
        return "admin/banners";
    }

    @GetMapping("/banners/add")
    public String addBannerForm(Model model) {
        model.addAttribute("banner", new Banner());
        return "admin/banner-form";
    }

    @GetMapping("/banners/edit/{id}")
    public String editBannerForm(@PathVariable Integer id, Model model) {
        model.addAttribute("banner", bannerService.findById(id));
        return "admin/banner-form";
    }

    @PostMapping("/banners/save")
    public String saveBanner(Banner banner,
                             @RequestParam(value = "imageFile", required = false) MultipartFile imageFile,
                             RedirectAttributes redirectAttributes) throws IOException {
        uploadImage(imageFile, banner::setImage);
        bannerService.save(banner);
        redirectAttributes.addFlashAttribute("success", "Banner saved successfully");
        return "redirect:/admin/banners";
    }

    @PostMapping("/banners/delete/{id}")
    public String deleteBanner(@PathVariable Integer id, RedirectAttributes redirectAttributes) {
        bannerService.deleteById(id);
        redirectAttributes.addFlashAttribute("success", "Banner deleted successfully");
        return "redirect:/admin/banners";
    }
}
