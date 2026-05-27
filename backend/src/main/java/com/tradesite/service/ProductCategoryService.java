package com.tradesite.service;

import com.tradesite.entity.ProductCategory;
import com.tradesite.mapper.ProductCategoryMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class ProductCategoryService {

    @Autowired
    private ProductCategoryMapper categoryMapper;

    public List<ProductCategory> findAll() {
        return categoryMapper.findAll();
    }

    public ProductCategory findById(Integer id) {
        return categoryMapper.findById(id);
    }

    public void save(ProductCategory category) {
        if (category.getId() == null) {
            categoryMapper.insert(category);
        } else {
            categoryMapper.update(category);
        }
    }

    public void deleteById(Integer id) {
        categoryMapper.deleteById(id);
    }
}
