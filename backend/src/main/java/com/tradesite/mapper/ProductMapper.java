package com.tradesite.mapper;

import com.tradesite.entity.Product;
import org.apache.ibatis.annotations.*;
import java.util.List;

@Mapper
public interface ProductMapper {

    @Results(id = "ProductResult", value = {
        @Result(column = "id", property = "id"),
        @Result(column = "category_id", property = "categoryId"),
        @Result(column = "name_cn", property = "nameCn"),
        @Result(column = "name_en", property = "nameEn"),
        @Result(column = "description_cn", property = "descriptionCn"),
        @Result(column = "description_en", property = "descriptionEn"),
        @Result(column = "main_image", property = "mainImage"),
        @Result(column = "images", property = "images"),
        @Result(column = "price", property = "price"),
        @Result(column = "specifications", property = "specifications"),
        @Result(column = "status", property = "status"),
        @Result(column = "sort_order", property = "sortOrder"),
        @Result(column = "create_time", property = "createTime"),
        @Result(column = "category_name", property = "categoryName")
    })

    @Select("SELECT p.*, COALESCE(pc.name_cn, '') as category_name FROM product p LEFT JOIN product_category pc ON p.category_id = pc.id ORDER BY p.sort_order ASC, p.create_time DESC")
    List<Product> findAll();

    @Select("SELECT p.*, COALESCE(pc.name_cn, '') as category_name FROM product p LEFT JOIN product_category pc ON p.category_id = pc.id WHERE p.category_id = #{categoryId} AND p.status = 1 ORDER BY p.sort_order ASC")
    List<Product> findByCategoryId(@Param("categoryId") Integer categoryId);

    @Select("<script>" +
            "SELECT p.*, COALESCE(pc.name_cn, '') as category_name FROM product p LEFT JOIN product_category pc ON p.category_id = pc.id WHERE p.status = 1 " +
            "AND (p.name_cn LIKE '%' || #{keyword} || '%' OR p.name_en LIKE '%' || #{keyword} || '%' OR p.description_cn LIKE '%' || #{keyword} || '%' OR p.description_en LIKE '%' || #{keyword} || '%') " +
            "ORDER BY p.sort_order ASC" +
            "</script>")
    List<Product> findByKeyword(@Param("keyword") String keyword);

    @Select("<script>" +
            "SELECT p.*, COALESCE(pc.name_cn, '') as category_name FROM product p LEFT JOIN product_category pc ON p.category_id = pc.id WHERE p.status = 1 " +
            "AND p.category_id = #{categoryId} " +
            "AND (p.name_cn LIKE '%' || #{keyword} || '%' OR p.name_en LIKE '%' || #{keyword} || '%' OR p.description_cn LIKE '%' || #{keyword} || '%' OR p.description_en LIKE '%' || #{keyword} || '%') " +
            "ORDER BY p.sort_order ASC" +
            "</script>")
    List<Product> findByCategoryAndKeyword(@Param("categoryId") Integer categoryId, @Param("keyword") String keyword);

    @Select("SELECT p.*, COALESCE(pc.name_cn, '') as category_name FROM product p LEFT JOIN product_category pc ON p.category_id = pc.id WHERE p.status = 1 ORDER BY p.sort_order ASC LIMIT #{limit}")
    List<Product> findFeatured(@Param("limit") int limit);

    @Select("SELECT p.*, COALESCE(pc.name_cn, '') as category_name FROM product p LEFT JOIN product_category pc ON p.category_id = pc.id WHERE p.id = #{id}")
    Product findById(@Param("id") Integer id);

    @Select("SELECT COUNT(*) FROM product")
    int count();

    @Insert("INSERT INTO product (category_id, name_cn, name_en, description_cn, description_en, main_image, images, price, specifications, status, sort_order) VALUES (#{categoryId}, #{nameCn}, #{nameEn}, #{descriptionCn}, #{descriptionEn}, #{mainImage}, #{images}, #{price}, #{specifications}, #{status}, #{sortOrder})")
    @Options(useGeneratedKeys = true, keyProperty = "id")
    int insert(Product product);

    @Update("UPDATE product SET category_id = #{categoryId}, name_cn = #{nameCn}, name_en = #{nameEn}, description_cn = #{descriptionCn}, description_en = #{descriptionEn}, main_image = #{mainImage}, images = #{images}, price = #{price}, specifications = #{specifications}, status = #{status}, sort_order = #{sortOrder} WHERE id = #{id}")
    int update(Product product);

    @Delete("DELETE FROM product WHERE id = #{id}")
    int deleteById(@Param("id") Integer id);
}
