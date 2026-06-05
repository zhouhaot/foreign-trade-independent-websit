package com.tradesite.controller.api;

import com.tradesite.common.Result;
import com.tradesite.entity.Article;
import com.tradesite.entity.Banner;
import com.tradesite.entity.Inquiry;
import com.tradesite.entity.Product;
import com.tradesite.entity.ProductCategory;
import com.tradesite.service.ArticleService;
import com.tradesite.service.BannerService;
import com.tradesite.service.EmailService;
import com.tradesite.service.InquiryService;
import com.tradesite.service.ProductCategoryService;
import com.tradesite.service.ProductService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api")
public class ApiController {

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

    @Autowired
    private EmailService emailService;

    // ===== Banners =====

    @GetMapping("/banners")
    public Result<List<Banner>> getBanners() {
        return Result.success(bannerService.findActive());
    }

    // ===== Categories =====

    @GetMapping("/categories")
    public Result<List<ProductCategory>> getCategories() {
        return Result.success(categoryService.findAll());
    }

    // ===== Products =====

    @GetMapping("/products")
    public Result<List<Product>> getProducts(
            @RequestParam(required = false) Integer categoryId,
            @RequestParam(required = false) String keyword) {
        return Result.success(productService.search(categoryId, keyword));
    }

    @GetMapping("/products/featured")
    public Result<List<Product>> getFeaturedProducts(@RequestParam(defaultValue = "8") int limit) {
        return Result.success(productService.findFeatured(limit));
    }

    @GetMapping("/products/{id}")
    public Result<Product> getProduct(@PathVariable Integer id) {
        Product product = productService.findById(id);
        if (product == null || product.getStatus() == null || product.getStatus() != 1) {
            return Result.error(404, "Product not found");
        }
        return Result.success(product);
    }

    // ===== Articles =====

    @GetMapping("/articles")
    public Result<List<Article>> getArticles(@RequestParam(defaultValue = "10") int limit) {
        return Result.success(articleService.findPublished(limit));
    }

    @GetMapping("/articles/{id}")
    public Result<Article> getArticle(@PathVariable Integer id) {
        Article article = articleService.findById(id);
        if (article == null || article.getStatus() == null || article.getStatus() != 1) {
            return Result.error(404, "Article not found");
        }
        return Result.success(article);
    }

    // ===== Inquiries =====

    @PostMapping("/inquiries")
    public Result<?> submitInquiry(@RequestBody Inquiry inquiry) {
        if (inquiry.getContactName() == null || inquiry.getContactName().isEmpty()) {
            return Result.error("Contact name is required");
        }
        if (inquiry.getEmail() == null || inquiry.getEmail().isEmpty()) {
            return Result.error("Email is required");
        }
        inquiryService.save(inquiry);
        emailService.sendInquiryNotification(inquiry);
        return Result.success("Inquiry submitted successfully", null);
    }
}
