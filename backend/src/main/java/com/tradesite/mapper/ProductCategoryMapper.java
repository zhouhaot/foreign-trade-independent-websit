package com.tradesite.mapper;

import com.tradesite.entity.ProductCategory;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import java.util.List;

@Mapper
public interface ProductCategoryMapper {
    List<ProductCategory> findAll();
    ProductCategory findById(@Param("id") Integer id);
    int insert(ProductCategory category);
    int update(ProductCategory category);
    int deleteById(@Param("id") Integer id);
}
