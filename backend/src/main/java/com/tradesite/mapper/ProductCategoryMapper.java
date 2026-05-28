package com.tradesite.mapper;

import com.tradesite.entity.ProductCategory;
import org.apache.ibatis.annotations.*;
import java.util.List;

@Mapper
public interface ProductCategoryMapper {

    @Select("SELECT * FROM product_category ORDER BY sort_order ASC")
    List<ProductCategory> findAll();

    @Select("SELECT * FROM product_category WHERE id = #{id}")
    ProductCategory findById(@Param("id") Integer id);

    @Insert("INSERT INTO product_category (name_cn, name_en, sort_order) VALUES (#{nameCn}, #{nameEn}, #{sortOrder})")
    @Options(useGeneratedKeys = true, keyProperty = "id")
    int insert(ProductCategory category);

    @Update("UPDATE product_category SET name_cn = #{nameCn}, name_en = #{nameEn}, sort_order = #{sortOrder} WHERE id = #{id}")
    int update(ProductCategory category);

    @Delete("DELETE FROM product_category WHERE id = #{id}")
    int deleteById(@Param("id") Integer id);
}
