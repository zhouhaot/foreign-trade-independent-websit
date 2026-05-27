package com.tradesite.mapper;

import com.tradesite.entity.Product;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import java.util.List;

@Mapper
public interface ProductMapper {
    List<Product> findAll();
    List<Product> findByCategoryId(@Param("categoryId") Integer categoryId);
    List<Product> findFeatured(@Param("limit") int limit);
    Product findById(@Param("id") Integer id);
    int count();
    int insert(Product product);
    int update(Product product);
    int deleteById(@Param("id") Integer id);
}
