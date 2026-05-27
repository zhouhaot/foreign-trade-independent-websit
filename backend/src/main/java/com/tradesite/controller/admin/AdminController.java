package com.tradesite.controller.admin;

import com.tradesite.entity.Inquiry;
import com.tradesite.entity.Product;
import com.tradesite.entity.ProductCategory;
import com.tradesite.service.InquiryService;
import com.tradesite.service.ProductCategoryService;
import com.tradesite.service.ProductService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.servlet.mvc.support.RedirectAttributes;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
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

    private final Path uploadDir = Paths.get("src/main/resources/uploads");

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
        if (imageFile != null && !imageFile.isEmpty()) {
            Files.createDirectories(uploadDir);
            String filename = UUID.randomUUID() + "_" + imageFile.getOriginalFilename();
            Files.copy(imageFile.getInputStream(), uploadDir.resolve(filename));
            product.setMainImage("/uploads/" + filename);
        }
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
}
