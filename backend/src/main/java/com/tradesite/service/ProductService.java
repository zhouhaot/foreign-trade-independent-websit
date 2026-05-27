package com.tradesite.service;

import com.tradesite.entity.Product;
import com.tradesite.mapper.ProductMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class ProductService {

    @Autowired
    private ProductMapper productMapper;

    public List<Product> findAll() {
        return productMapper.findAll();
    }

    public List<Product> findByCategoryId(Integer categoryId) {
        return productMapper.findByCategoryId(categoryId);
    }

    public List<Product> search(Integer categoryId, String keyword) {
        if (keyword != null && !keyword.isEmpty() && categoryId != null) {
            return productMapper.findByCategoryAndKeyword(categoryId, keyword);
        } else if (keyword != null && !keyword.isEmpty()) {
            return productMapper.findByKeyword(keyword);
        } else if (categoryId != null) {
            return productMapper.findByCategoryId(categoryId);
        }
        return productMapper.findAll();
    }

    public List<Product> findFeatured(int limit) {
        return productMapper.findFeatured(limit);
    }

    public Product findById(Integer id) {
        return productMapper.findById(id);
    }

    public int count() {
        return productMapper.count();
    }

    public void save(Product product) {
        if (product.getId() == null) {
            productMapper.insert(product);
        } else {
            productMapper.update(product);
        }
    }

    public void deleteById(Integer id) {
        productMapper.deleteById(id);
    }
}
