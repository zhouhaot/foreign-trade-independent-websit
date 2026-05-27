package com.tradesite.controller.api;

import com.tradesite.common.Result;
import com.tradesite.entity.Inquiry;
import com.tradesite.entity.Product;
import com.tradesite.entity.ProductCategory;
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

    // ===== Categories =====

    @GetMapping("/categories")
    public Result<List<ProductCategory>> getCategories() {
        return Result.success(categoryService.findAll());
    }

    // ===== Products =====

    @GetMapping("/products")
    public Result<List<Product>> getProducts(@RequestParam(required = false) Integer categoryId) {
        if (categoryId != null) {
            return Result.success(productService.findByCategoryId(categoryId));
        }
        return Result.success(productService.findAll());
    }

    @GetMapping("/products/featured")
    public Result<List<Product>> getFeaturedProducts(@RequestParam(defaultValue = "8") int limit) {
        return Result.success(productService.findFeatured(limit));
    }

    @GetMapping("/products/{id}")
    public Result<Product> getProduct(@PathVariable Integer id) {
        Product product = productService.findById(id);
        if (product == null) {
            return Result.error(404, "Product not found");
        }
        return Result.success(product);
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
        return Result.success("Inquiry submitted successfully", null);
    }
}
