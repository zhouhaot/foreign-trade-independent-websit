package com.tradesite.mapper;

import com.tradesite.entity.Inquiry;
import org.apache.ibatis.annotations.*;
import java.util.List;

@Mapper
public interface InquiryMapper {

    @Results(id = "InquiryResult", value = {
        @Result(column = "id", property = "id"),
        @Result(column = "product_id", property = "productId"),
        @Result(column = "company_name", property = "companyName"),
        @Result(column = "contact_name", property = "contactName"),
        @Result(column = "email", property = "email"),
        @Result(column = "phone", property = "phone"),
        @Result(column = "message", property = "message"),
        @Result(column = "is_read", property = "isRead"),
        @Result(column = "create_time", property = "createTime"),
        @Result(column = "product_name", property = "productName")
    })

    @Select("SELECT i.*, COALESCE(p.name_cn, 'N/A') as product_name FROM inquiry i LEFT JOIN product p ON i.product_id = p.id ORDER BY i.create_time DESC")
    List<Inquiry> findAll();

    @Select("SELECT i.*, COALESCE(p.name_cn, 'N/A') as product_name FROM inquiry i LEFT JOIN product p ON i.product_id = p.id WHERE i.id = #{id}")
    Inquiry findById(@Param("id") Integer id);

    @Select("SELECT COUNT(*) FROM inquiry")
    int count();

    @Select("SELECT COUNT(*) FROM inquiry WHERE is_read = 0")
    int countUnread();

    @Insert("INSERT INTO inquiry (product_id, company_name, contact_name, email, phone, message) VALUES (#{productId}, #{companyName}, #{contactName}, #{email}, #{phone}, #{message})")
    @Options(useGeneratedKeys = true, keyProperty = "id")
    int insert(Inquiry inquiry);

    @Update("UPDATE inquiry SET is_read = 1 WHERE id = #{id}")
    int markAsRead(@Param("id") Integer id);

    @Delete("DELETE FROM inquiry WHERE id = #{id}")
    int deleteById(@Param("id") Integer id);
}
