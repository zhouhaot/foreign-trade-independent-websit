package com.tradesite.mapper;

import com.tradesite.entity.Article;
import org.apache.ibatis.annotations.*;
import java.util.List;

@Mapper
public interface ArticleMapper {

    @Select("SELECT * FROM article ORDER BY create_time DESC")
    List<Article> findAll();

    @Select("SELECT * FROM article WHERE status = 1 ORDER BY create_time DESC LIMIT #{limit}")
    List<Article> findPublished(@Param("limit") int limit);

    @Select("SELECT * FROM article WHERE id = #{id}")
    Article findById(@Param("id") Integer id);

    @Select("SELECT COUNT(*) FROM article")
    int count();

    @Insert("INSERT INTO article (title_cn, title_en, content_cn, content_en, cover_image, status) VALUES (#{titleCn}, #{titleEn}, #{contentCn}, #{contentEn}, #{coverImage}, #{status})")
    @Options(useGeneratedKeys = true, keyProperty = "id")
    int insert(Article article);

    @Update("UPDATE article SET title_cn = #{titleCn}, title_en = #{titleEn}, content_cn = #{contentCn}, content_en = #{contentEn}, cover_image = #{coverImage}, status = #{status} WHERE id = #{id}")
    int update(Article article);

    @Delete("DELETE FROM article WHERE id = #{id}")
    int deleteById(@Param("id") Integer id);
}
