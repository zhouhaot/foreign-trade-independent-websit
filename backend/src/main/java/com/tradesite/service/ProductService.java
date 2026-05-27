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
